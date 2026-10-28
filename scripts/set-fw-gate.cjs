#!/usr/bin/env node
/**
 * set-fw-gate.cjs — frontend-workflow 人工 Gate 显式置位脚本
 *
 * 人工 Gate（④⑤a⑦⑦c⑧a⑪⑫ 对应的 gateChecks 四键）必须经用户确认后，
 * 由编排器调用本脚本显式置位。validate-fw-phase-gate.cjs 会强校验
 * "离开 Gate 阶段前 gateChecks 已为 true"，advance 不再自动置位，
 * 从而把"未经确认不得进入下一阶段"落到脚本强制。
 *
 * 另含内嵌 Gate（不占 phase）：testCasesConfirmed（3.5 用例审阅），
 * 置位时必须登记用例文档路径，供 validate 在进入 ⑩ 前追溯。
 *
 * 用法:
 *   node scripts/set-fw-gate.cjs <任务名> <gateKey> [--unset]
 *   node scripts/set-fw-gate.cjs <任务名> docConfirmed --biz-doc <业务文档路径>
 *   node scripts/set-fw-gate.cjs <任务名> testCasesConfirmed --test-cases <用例文档路径>
 *
 * gateKey: staticConfirmed | docConfirmed | apiConfirmed | bizConfirmed | testCasesConfirmed
 *
 * 输出:
 *   成功 → { success:true, gateKey, value, stateFile } + 退出码 0
 *   失败 → { success:false, error } + 退出码 1
 */

const {
  readStateFile,
  writeStateFile,
  getStateFilePath,
  getPhaseDisplay
} = require('./workflow-state-utils.cjs')

// gateKey → 对应内部 phase / 展示编号（null = 内嵌 Gate，不占 phase）
const GATE_PHASES = {
  staticConfirmed: 2,
  docConfirmed: 5,
  apiConfirmed: 6,
  bizConfirmed: 9,
  testCasesConfirmed: null
}

const rawArgs = process.argv.slice(2)
const unset = rawArgs.includes('--unset')

function getOpt (name) {
  const i = rawArgs.indexOf(name)
  return i >= 0 && rawArgs[i + 1] && !rawArgs[i + 1].startsWith('--') ? rawArgs[i + 1] : null
}

const bizDocArg = getOpt('--biz-doc')
const testCasesArg = getOpt('--test-cases')
const [taskName, gateKey] = rawArgs.filter((a, i) => {
  if (a.startsWith('--')) return false
  const prev = rawArgs[i - 1]
  return prev !== '--biz-doc' && prev !== '--test-cases'
})

if (!taskName || !gateKey || !(gateKey in GATE_PHASES)) {
  console.error('用法: node set-fw-gate.cjs <任务名> <gateKey> [--unset] [--biz-doc <路径>] [--test-cases <路径>]')
  console.error('gateKey 可选值: staticConfirmed | docConfirmed | apiConfirmed | bizConfirmed | testCasesConfirmed')
  process.exit(1)
}

// ─── 参数与 gateKey 匹配校验（避免误写） ──────────────────────────
if (bizDocArg && gateKey !== 'docConfirmed') {
  console.error(JSON.stringify({
    success: false,
    error: `--biz-doc 仅可用于 docConfirmed（当前 gateKey=${gateKey}）`,
    hint: `如需登记业务文档：node scripts/set-fw-gate.cjs ${taskName} docConfirmed --biz-doc <路径>`
  }, null, 2))
  process.exit(1)
}

if (testCasesArg && gateKey !== 'testCasesConfirmed') {
  console.error(JSON.stringify({
    success: false,
    error: `--test-cases 仅可用于 testCasesConfirmed（当前 gateKey=${gateKey}）`,
    hint: `如需登记用例文档：node scripts/set-fw-gate.cjs ${taskName} testCasesConfirmed --test-cases <路径>`
  }, null, 2))
  process.exit(1)
}

if (gateKey === 'testCasesConfirmed' && !unset && !testCasesArg) {
  console.error(JSON.stringify({
    success: false,
    error: 'testCasesConfirmed 置位时必须同时提供 --test-cases <用例文档路径>，否则无法追溯用例来源',
    hint: `node scripts/set-fw-gate.cjs ${taskName} testCasesConfirmed --test-cases <路径>`
  }, null, 2))
  process.exit(1)
}

const state = readStateFile(taskName)
if (!state) {
  console.error(JSON.stringify({ success: false, error: `状态文件不存在: ${getStateFilePath(taskName)}` }, null, 2))
  process.exit(1)
}
if (state._parseError) {
  console.error(JSON.stringify({ success: false, error: `状态文件解析失败: ${state._parseError}` }, null, 2))
  process.exit(1)
}

const phaseNum = GATE_PHASES[gateKey]
const now = new Date().toISOString()
const updated = { ...state }
updated.gateChecks = { ...(updated.gateChecks || {}), [gateKey]: !unset }
updated.updatedAt = now
updated[`gate_${gateKey}`] = { value: !unset, at: now } // 置位审计记录

// 关联产物路径登记（可追溯）
if (bizDocArg && !unset) {
  updated.bizDocPath = bizDocArg
  updated[`gate_${gateKey}`].bizDocPath = bizDocArg
}
if (testCasesArg && !unset) {
  updated.testCasesDoc = testCasesArg
  updated[`gate_${gateKey}`].testCasesDoc = testCasesArg
}

try {
  writeStateFile(taskName, updated)
} catch (e) {
  console.error(JSON.stringify({ success: false, error: `写入状态失败: ${e.message}` }, null, 2))
  process.exit(1)
}

const gatePhaseLabel = phaseNum === null
  ? '内嵌 Gate（不占 phase）'
  : `${phaseNum}（${getPhaseDisplay(phaseNum)}）`

console.log(JSON.stringify({
  success: true,
  taskName,
  gateKey,
  value: !unset,
  gatePhase: gatePhaseLabel,
  bizDocPath: updated.bizDocPath || null,
  testCasesDoc: updated.testCasesDoc || null,
  message: !unset
    ? `✅ 人工 Gate 已置位：gateChecks.${gateKey}=true（用户确认记录于 ${now}）`
    : `↩️ 人工 Gate 已复位：gateChecks.${gateKey}=false`,
  stateFile: getStateFilePath(taskName)
}, null, 2))
process.exit(0)
