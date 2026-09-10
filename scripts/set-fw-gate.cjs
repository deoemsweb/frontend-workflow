#!/usr/bin/env node
/**
 * set-fw-gate.cjs — frontend-workflow 人工 Gate 显式置位脚本
 *
 * 人工 Gate（④⑤a⑦⑦c⑧a⑪⑫ 对应的 gateChecks 四键）必须经用户确认后，
 * 由编排器调用本脚本显式置位。validate-fw-phase-gate.cjs 会强校验
 * "离开 Gate 阶段前 gateChecks 已为 true"，advance 不再自动置位，
 * 从而把"未经确认不得进入下一阶段"落到脚本强制。
 *
 * 用法:
 *   node scripts/set-fw-gate.cjs <任务名> <gateKey> [--unset]
 *
 * gateKey: staticConfirmed | docConfirmed | apiConfirmed | bizConfirmed
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

// gateKey → 对应内部 phase / 展示编号（用于提示）
const GATE_PHASES = {
  staticConfirmed: 2,
  docConfirmed: 5,
  apiConfirmed: 6,
  bizConfirmed: 9
}

const [taskName, gateKey] = process.argv.slice(2)
const unset = process.argv.includes('--unset')

if (!taskName || !gateKey || !(gateKey in GATE_PHASES)) {
  console.error('用法: node set-fw-gate.cjs <任务名> <gateKey> [--unset]')
  console.error('gateKey 可选值: staticConfirmed | docConfirmed | apiConfirmed | bizConfirmed')
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

try {
  writeStateFile(taskName, updated)
} catch (e) {
  console.error(JSON.stringify({ success: false, error: `写入状态失败: ${e.message}` }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({
  success: true,
  taskName,
  gateKey,
  value: !unset,
  gatePhase: `${phaseNum}（${getPhaseDisplay(phaseNum)}）`,
  message: !unset
    ? `✅ 人工 Gate 已置位：gateChecks.${gateKey}=true（用户确认记录于 ${now}）`
    : `↩️ 人工 Gate 已复位：gateChecks.${gateKey}=false`,
  stateFile: getStateFilePath(taskName)
}, null, 2))
process.exit(0)
