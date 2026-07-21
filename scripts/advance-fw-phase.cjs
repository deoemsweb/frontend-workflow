#!/usr/bin/env node
/**
 * advance-fw-phase.cjs — frontend-workflow 阶段推进统一入口
 *
 * 内部流程:
 *   1. 运行 validate-fw-phase-gate.cjs 门控校验
 *   2. 校验通过 → 更新状态文件（前一 phase 置 completed、目标 phase 置 running、刷新 updatedAt）
 *   3. 返回 nextAgent，提示编排器下一步应 spawn 的 .agents/ 角色
 *
 * 用法:
 *   node scripts/advance-fw-phase.cjs <任务名> <目标内部phase>
 *
 * 输出:
 *   成功 → { success:true, nextAgent, phaseName, ... } + 退出码 0
 *   失败 → { success:false, blockers:[...] } + 退出码 1
 */

const path = require('path')
const { execSync } = require('child_process')
const {
  readStateFile,
  writeStateFile,
  getPhaseKey,
  getPhaseName,
  getPhaseDisplay,
  getPhaseAgent,
  TOTAL_PHASES
} = require('./workflow-state-utils.cjs')

// ─── 参数解析 ───────────────────────────────────────────────────

const [taskName, targetArg] = process.argv.slice(2)
const targetPhase = parseInt(targetArg)

if (!taskName || isNaN(targetPhase)) {
  console.error('用法: node advance-fw-phase.cjs <任务名> <目标内部phase>')
  console.error('示例: node advance-fw-phase.cjs user-export 3')
  process.exit(1)
}
if (targetPhase < 0 || targetPhase >= TOTAL_PHASES) {
  console.error(`目标 phase 无效：${targetPhase}，范围 0~${TOTAL_PHASES - 1}`)
  process.exit(1)
}

// ─── 主逻辑 ─────────────────────────────────────────────────────

const state = readStateFile(taskName)
if (!state) {
  console.error(JSON.stringify({ success: false, blockers: [`状态文件不存在: ${taskName}`] }, null, 2))
  process.exit(1)
}
if (state._parseError) {
  console.error(JSON.stringify({ success: false, blockers: [`状态文件解析失败: ${state._parseError}`] }, null, 2))
  process.exit(1)
}

// 不允许后退
if (state.phase > targetPhase) {
  console.error(JSON.stringify({
    success: false,
    blockers: [`不能从 phase ${state.phase}（${getPhaseDisplay(state.phase)}）后退到 ${targetPhase}（${getPhaseDisplay(targetPhase)}）`]
  }, null, 2))
  process.exit(1)
}

// 门控校验
const gateScript = path.join(__dirname, 'validate-fw-phase-gate.cjs')
let gate = { pass: true, blockers: [], warnings: [] }
try {
  const out = execSync(`node "${gateScript}" ${taskName} ${targetPhase}`, {
    encoding: 'utf-8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe']
  })
  gate = JSON.parse(out)
} catch (e) {
  try { gate = JSON.parse(e.stdout || '{}') } catch { gate = { pass: false, blockers: [e.stderr || e.message], warnings: [] } }
}

if (!gate.pass) {
  console.error(JSON.stringify({
    success: false,
    taskName,
    targetPhase,
    blockers: gate.blockers || ['门控校验未通过'],
    warnings: gate.warnings || [],
    message: '❌ 门控校验失败，禁止推进。请解决 blockers 后重试。'
  }, null, 2))
  process.exit(1)
}

// 更新状态
const now = new Date().toISOString()
const updated = { ...state }

if (targetPhase > 0) {
  const prevKey = getPhaseKey(targetPhase - 1)
  updated.phases[prevKey] = { ...updated.phases[prevKey], status: 'completed', completedAt: now }
}
const targetKey = getPhaseKey(targetPhase)
updated.phases[targetKey] = { ...updated.phases[targetKey], status: 'running', startedAt: now }

updated.phase = targetPhase
updated.updatedAt = now

// 终验阶段标记完成
if (targetPhase === TOTAL_PHASES - 1) {
  updated.status = 'completed'
  updated.phases[targetKey].status = 'completed'
  updated.phases[targetKey].completedAt = now
}

try {
  writeStateFile(taskName, updated)
} catch (e) {
  console.error(JSON.stringify({ success: false, blockers: [`写入状态失败: ${e.message}`] }, null, 2))
  process.exit(1)
}

const nextAgent = getPhaseAgent(targetPhase)
console.log(JSON.stringify({
  success: true,
  taskName,
  targetPhase,
  phaseDisplay: getPhaseDisplay(targetPhase),
  phaseName: getPhaseName(targetPhase),
  nextAgent,
  warnings: gate.warnings || [],
  message: targetPhase === TOTAL_PHASES - 1
    ? `✅ 已到达终验阶段（${getPhaseDisplay(targetPhase)}），工作流完成`
    : `✅ 已推进到 phase ${targetPhase}（${getPhaseDisplay(targetPhase)} ${getPhaseName(targetPhase)}），请 spawn ${nextAgent}`
}, null, 2))
process.exit(0)
