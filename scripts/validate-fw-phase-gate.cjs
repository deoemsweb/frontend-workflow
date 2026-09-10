#!/usr/bin/env node
/**
 * validate-fw-phase-gate.cjs — frontend-workflow 阶段门控验证
 *
 * 校验目标 phase 是否可被推进：
 *   1. 状态文件存在且可解析
 *   2. 所有前置 phase 已 completed（或 skipped）
 *   3. 目标 phase 的前置"标志产物"齐全（文件/目录/gateChecks）
 *      —— 人工 Gate（gate 类）的前置 gateChecks 必须为 true（由 set-fw-gate.cjs 置位），
 *         未经用户确认不得离开 Gate 阶段
 *   4. pendingConfirmations 全部 resolved
 *
 * 用法:
 *   node scripts/validate-fw-phase-gate.cjs <任务名> <目标内部phase>
 *
 * 输出:
 *   { pass: true,  warnings: [] }           → 退出码 0
 *   { pass: false, blockers: [...], ... }   → 退出码 1
 */

const {
  readStateFile,
  getStateFilePath,
  getPhaseKey,
  getPhaseName,
  getPhaseDisplay,
  checkPhaseArtifact,
  getUnresolvedConfirmations,
  PHASE_ARTIFACTS,
  TOTAL_PHASES
} = require('./workflow-state-utils.cjs')

// ─── 参数解析 ───────────────────────────────────────────────────

const [taskName, targetArg] = process.argv.slice(2)
const targetPhase = parseInt(targetArg)

if (!taskName || isNaN(targetPhase)) {
  console.error('用法: node validate-fw-phase-gate.cjs <任务名> <目标内部phase>')
  console.error('示例: node validate-fw-phase-gate.cjs user-export 3')
  process.exit(1)
}
if (targetPhase < 0 || targetPhase >= TOTAL_PHASES) {
  console.error(`目标 phase 无效：${targetPhase}，范围 0~${TOTAL_PHASES - 1}`)
  process.exit(1)
}

// ─── 主逻辑 ─────────────────────────────────────────────────────

const blockers = []
const warnings = []

const state = readStateFile(taskName)
if (!state) {
  blockers.push(`状态文件不存在: ${getStateFilePath(taskName)}`)
} else if (state._parseError) {
  blockers.push(`状态文件 JSON 解析失败: ${state._parseError}`)
} else {
  // 1. 前置 phase 完成度（紧邻前一 phase 允许 running，因推进时将置 completed）
  for (let p = 0; p < targetPhase; p++) {
    const status = state.phases?.[getPhaseKey(p)]?.status || 'pending'
    if (status === 'completed' || status === 'skipped') continue
    if (p === targetPhase - 1 && status === 'running') continue
    blockers.push(`前置 phase ${p}（${getPhaseDisplay(p)} ${getPhaseName(p)}）未完成（当前: ${status}）`)
  }

  // 2. 目标 phase 的前置标志产物（校验 target-1 及更早的产物，确保进入 target 前链路完整）
  //    这里校验"进入 target 之前必须已产出"的项：即检查 target 之前的产物类 phase
  for (let p = 0; p < targetPhase; p++) {
    // 跳过被显式标记为 skipped 的前置 phase（如 --start 场景下的跳过阶段），
    // 其产物/人工验收本就无需产出，不应误阻断推进
    if (state.phases?.[getPhaseKey(p)]?.status === 'skipped') continue
    // biz-doc=skip 场景：跳过业务文档目录产物校验（⑤a 已确认不产出业务文档）
    if (p === 3 && state.bizDocPlan === 'skip' && PHASE_ARTIFACTS[p]?.type === 'dir') continue
    // 人工 Gate（gate 类 phase，④⑦⑦b⑦c⑪ 等）：离开前必须已获用户确认。
    // 置位由编排器在用户确认后调用 set-fw-gate.cjs 完成，advance 不再自动置位。
    if (PHASE_ARTIFACTS[p]?.type === 'gate') {
      const gateKey = PHASE_ARTIFACTS[p].gateKey
      if (state.gateChecks?.[gateKey] !== true) {
        blockers.push(`前置人工 Gate phase ${p}（${getPhaseDisplay(p)} ${getPhaseName(p)}）未获用户确认：gateChecks.${gateKey}≠true（请先调用 node scripts/set-fw-gate.cjs <任务名> ${gateKey}）`)
      }
      continue
    }
    const r = checkPhaseArtifact(taskName, p, state)
    if (!r.pass) {
      blockers.push(`phase ${p}（${getPhaseDisplay(p)} ${getPhaseName(p)}）产物未就绪: ${r.description}` + (r.detail ? ` → ${r.detail}` : ''))
    }
  }

  // 3. 待确认项
  const unresolved = getUnresolvedConfirmations(state)
  if (unresolved.length > 0) {
    blockers.push(
      `有 ${unresolved.length} 项待确认未解决:`,
      ...unresolved.map((it, i) => `  ${i + 1}. [${it.source || '未知'}] ${it.question}`)
    )
  }

  // 4. 目标本身是人工 Gate：提示需对应用户确认并置位（由编排器调用 set-fw-gate.cjs 完成）
  const gateArt = require('./workflow-state-utils.cjs').PHASE_ARTIFACTS[targetPhase]
  if (gateArt && gateArt.type === 'gate') {
    const ok = state.gateChecks?.[gateArt.gateKey] === true
    if (!ok) {
      warnings.push(`目标 phase ${targetPhase} 是人工 Gate（${gateArt.description}），获用户确认后需调用 node scripts/set-fw-gate.cjs <任务名> ${gateArt.gateKey} 置位，再 advance 离开本 Gate`)
    }
  }
}

const result = { pass: blockers.length === 0, taskName, targetPhase, blockers, warnings }
console.log(JSON.stringify(result, null, 2))
process.exit(result.pass ? 0 : 1)
