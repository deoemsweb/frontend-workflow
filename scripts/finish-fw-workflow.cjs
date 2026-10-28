#!/usr/bin/env node
/**
 * finish-fw-workflow.cjs — frontend-workflow 提前完成脚本
 *
 * 用于"剩余阶段不需要执行"的提前收尾（如接口-only 任务走完 ⑦b⑦c 后、
 * 静态页-only 任务走完 ④ 后）：将剩余未完成阶段标记 skipped、
 * 工作流置为 completed，避免状态文件永久 running。
 *
 * 收尾前置校验（硬约束，见 references/cross-cutting.md 五）：
 *   默认先执行 fw-process.cjs check，存在未回收的本地长驻进程（dev server 等）
 *   时阻断收尾；确认需保留进程时显式传 --allow-residual-processes。
 *
 * 用法:
 *   node scripts/finish-fw-workflow.cjs <任务名> [--allow-residual-processes]
 *
 * 输出:
 *   成功 → { success:true, skipped:[...], stateFile } + 退出码 0
 *   失败 → { success:false, blockers:[...] } + 退出码 1
 */

const path = require('path')
const { spawnSync } = require('child_process')
const {
  readStateFile,
  writeStateFile,
  getStateFilePath,
  getPhaseKey,
  getPhaseName,
  getPhaseDisplay,
  PHASE_ARTIFACTS,
  TOTAL_PHASES
} = require('./workflow-state-utils.cjs')

const argv = process.argv.slice(2)
const taskName = argv[0]
const allowResidual = argv.includes('--allow-residual-processes')
if (!taskName || taskName.startsWith('--')) {
  console.error('用法: node finish-fw-workflow.cjs <任务名> [--allow-residual-processes]')
  process.exit(1)
}

// ─── 收尾前置：进程回收校验 ─────────────────────────────────────
if (!allowResidual) {
  const procScript = path.join(__dirname, 'fw-process.cjs')
  const r = spawnSync(process.execPath, [procScript, 'check', taskName], {
    cwd: process.cwd(),
    encoding: 'utf-8',
    timeout: 30000
  })
  if (r.error) {
    console.error(JSON.stringify({
      success: false,
      blockers: [`进程残留校验无法执行: ${r.error.message}`]
    }, null, 2))
    process.exit(1)
  }
  if (r.status !== 0) {
    let detail = (r.stdout || '').trim()
    try {
      const parsed = JSON.parse(detail)
      detail = (parsed.blockers || []).join('; ') || detail
    } catch (e) { /* 保留原始输出 */ }
    console.error(JSON.stringify({
      success: false,
      blockers: [
        '存在未回收的本地长驻进程，收尾被阻断（dev server / preview / mock server 等）',
        detail,
        `请执行 node scripts/fw-process.cjs cleanup ${taskName}（或 --all-tasks）后重试；确认需保留进程时传 --allow-residual-processes`
      ].filter(Boolean)
    }, null, 2))
    process.exit(1)
  }
} else {
  console.error('⚠️ 已跳过进程回收校验（--allow-residual-processes），请自行确认无端口泄漏')
}

const state = readStateFile(taskName)
if (!state) {
  console.error(JSON.stringify({ success: false, blockers: [`状态文件不存在: ${getStateFilePath(taskName)}`] }, null, 2))
  process.exit(1)
}
if (state._parseError) {
  console.error(JSON.stringify({ success: false, blockers: [`状态文件解析失败: ${state._parseError}`] }, null, 2))
  process.exit(1)
}

const now = new Date().toISOString()
const updated = { ...state }
const skipped = []

for (let p = 0; p < TOTAL_PHASES; p++) {
  const key = getPhaseKey(p)
  const status = updated.phases?.[key]?.status
  if (status === 'completed') continue
  if (status === 'skipped') { skipped.push(p); continue }
  // 未完成的非终验阶段 → skipped；未完成的人工 Gate 同步清空 gateChecks
  if (p !== TOTAL_PHASES - 1) {
    updated.phases[key] = { status: 'skipped', skippedAt: now }
    const gateKey = PHASE_ARTIFACTS[p]?.gateKey
    if (gateKey) {
      updated.gateChecks = { ...(updated.gateChecks || {}), [gateKey]: false }
    }
    skipped.push(p)
  } else {
    // 终验（⑫）本身无产物门槛，直接置 completed 完成交付
    updated.phases[key] = { status: 'completed', completedAt: now }
  }
}

updated.phase = TOTAL_PHASES - 1
updated.status = 'completed'
updated.updatedAt = now

try {
  writeStateFile(taskName, updated)
} catch (e) {
  console.error(JSON.stringify({ success: false, blockers: [`写入状态失败: ${e.message}`] }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({
  success: true,
  taskName,
  skipped: skipped.map(p => `${p}（${getPhaseDisplay(p)} ${getPhaseName(p)}）`),
  message: '✅ 工作流已提前完成：剩余阶段标记为 skipped，状态置 completed',
  stateFile: getStateFilePath(taskName)
}, null, 2))
process.exit(0)
