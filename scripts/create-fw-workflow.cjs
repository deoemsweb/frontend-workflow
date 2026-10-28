#!/usr/bin/env node
/**
 * create-fw-workflow.cjs — 初始化 frontend-workflow 多 agent 工作流状态文件
 *
 * 用法:
 *   node scripts/create-fw-workflow.cjs <任务名> [--start <内部phase>] [--title "<标题>"] [--biz-doc <openspec|fw-dev-spec|skip>] [--biz-doc-path <路径>]
 *
 * 参数:
 *   任务名         - 任务唯一标识（kebab-case，将作为状态文件名前缀）
 *   --start        - 起始内部 phase（0~10，默认 0）。跳过②③等场景使用，如已有静态页面则 --start 3
 *   --title        - 任务标题（展示用）
 *   --biz-doc      - 业务文档方案预选（openspec / fw-dev-spec / skip），写入状态供下游读取
 *   --biz-doc-path - 本次业务文档路径（相对项目根；活文档文件或 openspec change 目录）。
 *                    文档尚未产出时可先不传，⑤ 完成后用 set-fw-gate ... --biz-doc <路径> 登记
 *
 * 输出:
 *   成功 → 打印初始状态 JSON + 退出码 0
 *   失败 → 打印错误 + 退出码 1
 */

const {
  writeStateFile,
  readStateFile,
  getStateFilePath,
  getPhaseKey,
  getPhaseSlug,
  getPhaseAgent,
  getPhaseName,
  getPhaseDisplay,
  TOTAL_PHASES
} = require('./workflow-state-utils.cjs')

// ─── 参数解析 ───────────────────────────────────────────────────

const args = process.argv.slice(2)
const taskName = args[0]

function getOpt (name) {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : null
}

if (!taskName) {
  console.error('用法: node create-fw-workflow.cjs <任务名> [--start <内部phase>] [--title "<标题>"] [--biz-doc <openspec|fw-dev-spec|skip>]')
  console.error('示例: node create-fw-workflow.cjs user-export --start 0 --title "工单导出功能"')
  process.exit(1)
}

if (!/^[a-z0-9][a-z0-9-]*$/.test(taskName)) {
  console.error(`任务名 "${taskName}" 非法：须为 kebab-case（小写字母/数字/连字符）`)
  process.exit(1)
}

const startPhase = parseInt(getOpt('--start') || '0')
if (isNaN(startPhase) || startPhase < 0 || startPhase >= TOTAL_PHASES) {
  console.error(`--start 无效：${getOpt('--start')}，范围 0~${TOTAL_PHASES - 1}`)
  process.exit(1)
}

const title = getOpt('--title') || taskName
const bizDoc = getOpt('--biz-doc') || null
const bizDocPath = getOpt('--biz-doc-path') || null

if (bizDoc && !['openspec', 'fw-dev-spec', 'skip'].includes(bizDoc)) {
  console.error(`--biz-doc 无效："${bizDoc}"，可选值：openspec | fw-dev-spec | skip`)
  process.exit(1)
}

if (bizDocPath && bizDoc === 'skip') {
  console.error('--biz-doc-path 与 --biz-doc skip 冲突：跳过业务文档时不应登记文档路径')
  process.exit(1)
}

// ─── 主逻辑 ─────────────────────────────────────────────────────

/** 已存在同任务状态文件时不覆盖，除非显式从 0 重新开始 */
const existing = readStateFile(taskName)
if (existing && !existing._parseError) {
  console.error(JSON.stringify({
    success: false,
    error: `状态文件已存在: ${getStateFilePath(taskName)}`,
    hint: '如需重新开始请先删除该文件，或更换任务名',
    currentPhase: existing.phase,
    status: existing.status
  }, null, 2))
  process.exit(1)
}

const now = new Date().toISOString()

// 初始化 phases：start 之前的标记为 skipped，start 标记为 running，其余 pending
const phases = {}
for (let p = 0; p < TOTAL_PHASES; p++) {
  const key = getPhaseKey(p)
  if (p < startPhase) {
    phases[key] = { status: 'skipped', skippedAt: now }
  } else if (p === startPhase) {
    phases[key] = { status: 'running', startedAt: now }
  } else {
    phases[key] = { status: 'pending' }
  }
}

const state = {
  version: 1,
  kind: 'frontend-workflow-multi-agent',
  taskName,
  title,
  status: 'running',
  phase: startPhase,
  startPhase,
  phases,
  gateChecks: {
    staticConfirmed: false,
    docConfirmed: false,
    apiConfirmed: false,
    bizConfirmed: false,
    testCasesConfirmed: false // 内嵌 Gate（3.5 用例审阅），不占 phase
  },
  bizDocPlan: bizDoc, // openspec | fw-dev-spec | skip | null(待⑤a确认)
  bizDocPath, // 本次业务文档（相对项目根）；null = 未登记，phase 3 回退目录+时间窗口校验
  testCasesDoc: null, // 本次测试用例文档；非 null 表示执行过 3.5，进入 ⑩ 前需置位 testCasesConfirmed
  allowEmptyPhases: {}, // --allow-empty 留痕：{ [phase]: { at, reason } }
  pendingConfirmations: [],
  reviewLoopCount: { static: 0, prd: 0, impl: 0 }, // 回流计数（③⑥⑩），上限 3
  createdAt: now,
  updatedAt: now
}

try {
  writeStateFile(taskName, state)
} catch (e) {
  console.error(JSON.stringify({ success: false, error: `写入状态文件失败: ${e.message}` }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({
  success: true,
  taskName,
  stateFile: getStateFilePath(taskName),
  startPhase,
  startPhaseDisplay: getPhaseDisplay(startPhase),
  startPhaseName: getPhaseName(startPhase),
  nextAgent: getPhaseAgent(startPhase),
  message: `✅ 工作流已初始化（从 phase ${startPhase} [${getPhaseDisplay(startPhase)} ${getPhaseName(startPhase)}] 起始），请 spawn ${getPhaseAgent(startPhase)}`,
  state
}, null, 2))
process.exit(0)
