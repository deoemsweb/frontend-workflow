#!/usr/bin/env node
/**
 * skip-fw-phase.cjs — frontend-workflow 阶段显式跳过脚本
 *
 * 用于运行中把某阶段标记为 skipped（如 ⑤a 选择"跳过业务文档"后，将
 * ⑤⑥⑦ 三个阶段置为 skipped），避免手改 JSON。与 create 的 --start
 * （起始之前的阶段整体 skipped）互补。
 *
 * 规则:
 *   1. 已完成（completed）的阶段不可跳过；如需返工请用 rollback-fw-phase.cjs
 *   2. 被跳过的阶段不再参与 validate 的产物/人工 Gate 校验
 *   3. 若目标 phase 是当前 phase，则自动前进到下一个未 skipped 的 phase（置 running）；
 *      若其后全部 skipped，则工作流标记完成
 *
 * 用法:
 *   node scripts/skip-fw-phase.cjs <任务名> <内部phase> [更多phase...]
 *
 * 输出:
 *   成功 → { success:true, skipped:[...], nextPhase, nextAgent, ... } + 退出码 0
 *   失败 → { success:false, blockers:[...] } + 退出码 1
 */

const {
  readStateFile,
  writeStateFile,
  getStateFilePath,
  getPhaseKey,
  getPhaseName,
  getPhaseDisplay,
  getPhaseAgent,
  PHASE_ARTIFACTS,
  TOTAL_PHASES
} = require('./workflow-state-utils.cjs')

const args = process.argv.slice(2)
const taskName = args[0]
const targets = args.slice(1).map(n => parseInt(n))

if (!taskName || targets.length === 0 || targets.some(n => isNaN(n) || n < 0 || n >= TOTAL_PHASES)) {
  console.error(`用法: node skip-fw-phase.cjs <任务名> <内部phase 0~${TOTAL_PHASES - 1}> [更多phase...]`)
  console.error('示例: node skip-fw-phase.cjs user-export 3 4 5   # 跳过 ⑤⑥⑦（biz-doc=skip 场景）')
  process.exit(1)
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

for (const p of targets) {
  const key = getPhaseKey(p)
  const status = updated.phases?.[key]?.status
  if (status === 'completed') {
    console.error(JSON.stringify({
      success: false,
      blockers: [`phase ${p}（${getPhaseDisplay(p)} ${getPhaseName(p)}）已完成，不可跳过；如需返工请用 rollback-fw-phase.cjs`]
    }, null, 2))
    process.exit(1)
  }
  updated.phases[key] = { status: 'skipped', skippedAt: now }
  // 跳过人工 Gate 阶段时同步清空其 gateChecks，避免残留误判
  const gateKey = PHASE_ARTIFACTS[p]?.gateKey
  if (gateKey) {
    updated.gateChecks = { ...(updated.gateChecks || {}), [gateKey]: false }
  }
}

// 若当前 phase 被跳过，自动前进到下一个未 skipped 的 phase
if (updated.phases[getPhaseKey(updated.phase)]?.status === 'skipped') {
  let next = -1
  for (let p = updated.phase + 1; p < TOTAL_PHASES; p++) {
    if (updated.phases[getPhaseKey(p)]?.status !== 'skipped') { next = p; break }
  }
  if (next >= 0) {
    updated.phases[getPhaseKey(next)] = { ...updated.phases[getPhaseKey(next)], status: 'running', startedAt: now }
    updated.phase = next
    updated.status = 'running'
  } else {
    // 其后全部 skipped：视为提前完成
    updated.status = 'completed'
    updated.phase = TOTAL_PHASES - 1
  }
}
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
  skipped: targets.map(p => `${p}（${getPhaseDisplay(p)} ${getPhaseName(p)}）`),
  nextPhase: updated.phase,
  nextPhaseDisplay: getPhaseDisplay(updated.phase),
  nextAgent: updated.status === 'completed' ? '(工作流已完成)' : getPhaseAgent(updated.phase),
  message: updated.status === 'completed'
    ? '✅ 已跳过指定阶段，后续无待执行阶段，工作流提前完成'
    : `✅ 已跳过 ${targets.length} 个阶段，当前 phase ${updated.phase}（${getPhaseDisplay(updated.phase)} ${getPhaseName(updated.phase)}），请 spawn ${getPhaseAgent(updated.phase)}`,
  stateFile: getStateFilePath(taskName)
}, null, 2))
process.exit(0)
