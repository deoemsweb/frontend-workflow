#!/usr/bin/env node
/**
 * rollback-fw-phase.cjs — frontend-workflow 阶段回退（返工）脚本
 *
 * 将工作流从当前 phase 回退到之前的某一 phase，用于"返工"场景的状态机形式化处理：
 *   1. 仅允许后向回退（目标 phase < 当前 phase），否则报错退出
 *   2. 将 [目标 phase, TOTAL_PHASES) 区间内所有 phase 重置为 pending（清除 startedAt/completedAt）
 *   3. 将目标 phase 置为 running，刷新 state.phase 与 updatedAt
 *   4. 已完成 phase 的产物文件（偏差报告 / OpenSpec 目录等）不做任何删除
 *
 * 用法:
 *   node scripts/rollback-fw-phase.cjs <任务名> <目标内部phase>
 *
 * 输出:
 *   成功 → { success:true, fromPhase, toPhase, nextAgent, ... } + 退出码 0
 *   失败 → { success:false, blockers:[...] } + 退出码 1
 */

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
  console.error('用法: node rollback-fw-phase.cjs <任务名> <目标内部phase>')
  console.error('示例: node rollback-fw-phase.cjs user-export 6')
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

// 仅允许后向回退
if (targetPhase >= state.phase) {
  console.error(JSON.stringify({
    success: false,
    blockers: [`只能回退到当前 phase ${state.phase}（${getPhaseDisplay(state.phase)}）之前的阶段，目标 ${targetPhase}（${getPhaseDisplay(targetPhase)}）无效`]
  }, null, 2))
  process.exit(1)
}

const now = new Date().toISOString()
const updated = { ...state }

// 将 [targetPhase, TOTAL_PHASES) 重置为 pending，清除时间字段
for (let p = targetPhase; p < TOTAL_PHASES; p++) {
  const key = getPhaseKey(p)
  updated.phases[key] = { status: 'pending' }
}
// 目标 phase 置 running
updated.phases[getPhaseKey(targetPhase)] = { status: 'running', startedAt: now }
updated.phase = targetPhase
updated.updatedAt = now

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
  fromPhase: state.phase,
  fromPhaseDisplay: getPhaseDisplay(state.phase),
  toPhase: targetPhase,
  toPhaseDisplay: getPhaseDisplay(targetPhase),
  toPhaseName: getPhaseName(targetPhase),
  nextAgent,
  message: `↩️ 已回退到 phase ${targetPhase}（${getPhaseDisplay(targetPhase)} ${getPhaseName(targetPhase)}），请重新 spawn ${nextAgent}（已完成阶段产物已保留）`
}, null, 2))
process.exit(0)
