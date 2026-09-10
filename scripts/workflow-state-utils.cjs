#!/usr/bin/env node
/**
 * frontend-workflow 多 agent 状态机 — 公共工具模块
 *
 * 提供 fw 工作流的 Phase 定义、状态文件读写、产出物检查、待确认项检查等公共函数。
 * 被 create-fw-workflow / validate-fw-phase-gate / advance-fw-phase / rollback-fw-phase /
 * set-fw-gate / skip-fw-phase / finish-fw-workflow 等脚本复用。
 *
 * 阶段编号约定：
 *   - 状态机内部用顺序整数 phase（0~10）存储；
 *   - 展示层用 ②~⑫ 原编号（含 ⑦b⑦c/⑧a 子阶段；⑤a 由编排器在 phase 3 内先行确认）；
 *   - ⑦b（接口定义生成）与 ⑦c（接口人工验收）已合并为单一内部 phase 6；
 *   - 双向映射集中在本模块，避免散落不一致。
 *
 * @module workflow-state-utils
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// ─── 路径常量 ──────────────────────────────────────────────────

/** 项目根目录（自动解析：宿主环境变量 → git 根 → cwd） */
/**
 * 解析项目根目录：
 * 宿主环境变量（CodeBuddy/Claude）→ 可选 FW_PROJECT_DIR → git 根目录兜底 → cwd
 */
function resolveProjectRoot () {
  const env = process.env.CODDEBUDDY_PROJECT_DIR || process.env.CLAUDE_PROJECT_DIR || process.env.FW_PROJECT_DIR
  if (env) return path.resolve(env)
  const cwd = process.cwd()
  try {
    const out = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 5000 }).trim()
    if (out) return out
  } catch (e) { /* 非 git 仓库或 git 不可用时回退 cwd */ }
  return cwd
}

const PROJECT_ROOT = resolveProjectRoot()

/** plans 目录（状态文件与编排类产物所在） */
const PLANS_DIR = process.env.FW_STATE_DIR
  ? path.resolve(process.env.FW_STATE_DIR)
  : path.join(PROJECT_ROOT, '.codebuddy', 'plans')

// ─── Phase 定义 ─────────────────────────────────────────────────

/**
 * 内部 phase（0~10）→ slug
 * 对应编排协议 §三 的映射表
 * 注：⑦b（接口定义生成）与 ⑦c（接口人工验收）已合并为单一 phase 6，
 * 以 gate 型 apiConfirmed 作为校验项；⑤a（业务文档方案确认）由编排器在
 * phase 3 内先行与用户确认，不单独占 phase。
 */
const PHASE_SLUGS = [
  'gen_static',    // 0  = ② 生成静态页面
  'review_static', // 1  = ③ 检查
  'gate_static',   // 2  = ④ 人工 Gate
  'gen_prd',       // 3  = ⑤ 业务文档生成（⑤a 由编排器先行确认）
  'review_prd',    // 4  = ⑥ 检查
  'gate_prd',      // 5  = ⑦ 人工 Gate
  'gen_api',       // 6  = ⑦b⑦c 接口定义生成+人工验收（合并）
  'implement',     // 7  = ⑧a⑧⑨ 前置编排+设计桥梁+业务逻辑
  'review_impl',   // 8  = ⑩ 检查
  'gate_impl',     // 9  = ⑪ 人工 Gate
  'final'          // 10 = ⑫ 终验
]

/** 内部 phase → 展示编号 */
const PHASE_DISPLAY = [
  '②', '③', '④', '⑤', '⑥', '⑦', '⑦b⑦c', '⑧a⑧⑨', '⑩', '⑪', '⑫'
]

/** 内部 phase → 中文名称 */
const PHASE_NAMES = [
  '生成静态页面',
  '静态页面检查',
  '静态页面人工验收',
  '业务文档生成',
  '业务文档检查',
  '业务文档人工确认',
  '接口定义生成+验收',
  '业务逻辑实现',
  '业务逻辑检查',
  '业务人工验收',
  '终验交付'
]

/**
 * 内部 phase → 负责 Agent（.agents/ 文件名，不含扩展名）
 * 供 advance 返回 nextAgent
 */
const PHASE_AGENTS = [
  'figma-restorer',        // 0
  'qa-reviewer',           // 1
  'workflow-orchestrator', // 2  (人工 Gate)
  'prd-analyst',           // 3
  'qa-reviewer',           // 4
  'workflow-orchestrator', // 5  (人工 Gate)
  'api-contractor',        // 6  (生成 + 内嵌 ⑦c 人工验收)
  'frontend-implementer',  // 7
  'qa-reviewer',           // 8
  'workflow-orchestrator', // 9  (人工 Gate)
  'workflow-orchestrator'  // 10 (终验)
]

/**
 * 内部 phase → 标志产物校验规则
 * - type 'file'   : 校验 PLANS_DIR 下文件存在
 * - type 'dir'    : 校验 PROJECT_ROOT 下目录存在（OpenSpec 或 fw_dev_spec）
 * - type 'gate'   : 人工 Gate，校验 gateChecks 对应字段为 true
 * - type 'none'   : 代码类产物不强制文件校验（交 qa-reviewer + 人工 Gate）
 */
const PHASE_ARTIFACTS = {
  0: { type: 'none', description: '静态页面代码（不强制文件校验）' },
  1: { type: 'file', suffix: '-review-static.md', description: '静态页面偏差报告' },
  2: { type: 'gate', gateKey: 'staticConfirmed', description: '静态页面人工验收' },
  3: { type: 'dir', anyOf: ['openspec', 'fw_dev_spec'], description: '业务文档目录（openspec/ 或 fw_dev_spec/）' },
  4: { type: 'file', suffix: '-review-prd.md', description: '业务文档偏差报告' },
  5: { type: 'gate', gateKey: 'docConfirmed', description: '业务文档人工确认' },
  6: { type: 'gate', gateKey: 'apiConfirmed', description: '接口定义生成并完成人工验收（⑦b⑦c 合并）' },
  7: { type: 'none', description: '业务逻辑代码（不强制文件校验）' },
  8: { type: 'file', suffix: '-review-impl.md', description: '业务逻辑偏差报告' },
  9: { type: 'gate', gateKey: 'bizConfirmed', description: '业务人工验收' },
  10: { type: 'none', description: '交付' }
}

// ─── 状态文件操作 ───────────────────────────────────────────────

/**
 * 获取状态文件路径
 * @param {string} taskName - 任务名
 * @returns {string}
 */
function getStateFilePath (taskName) {
  return path.join(PLANS_DIR, `${taskName}-fw-state.json`)
}

/**
 * 读取并解析状态文件
 * @param {string} taskName - 任务名
 * @returns {Object|null} 状态对象，不存在返回 null
 */
function readStateFile (taskName) {
  const filePath = getStateFilePath(taskName)
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch (e) {
    return { _parseError: e.message }
  }
}

/**
 * 写入状态文件
 * @param {string} taskName - 任务名
 * @param {Object} state - 状态对象
 */
function writeStateFile (taskName, state) {
  if (!fs.existsSync(PLANS_DIR)) {
    fs.mkdirSync(PLANS_DIR, { recursive: true })
  }
  fs.writeFileSync(getStateFilePath(taskName), JSON.stringify(state, null, 2), 'utf-8')
}

/**
 * 查找所有活跃的 fw 工作流（status 为 running 或 paused）
 * @returns {Array<{taskName: string, state: Object}>}
 */
function findActiveWorkflows () {
  if (!fs.existsSync(PLANS_DIR)) return []
  const files = fs.readdirSync(PLANS_DIR).filter(f => f.endsWith('-fw-state.json'))
  const workflows = []
  for (const file of files) {
    try {
      const state = JSON.parse(fs.readFileSync(path.join(PLANS_DIR, file), 'utf-8'))
      if (state.status === 'running' || state.status === 'paused') {
        workflows.push({ taskName: file.replace('-fw-state.json', ''), state })
      }
    } catch (e) { /* 忽略解析失败 */ }
  }
  return workflows
}

// ─── Phase 辅助 ─────────────────────────────────────────────────

function getPhaseSlug (n) { return PHASE_SLUGS[n] || 'unknown' }
function getPhaseName (n) { return PHASE_NAMES[n] || '未知' }
function getPhaseDisplay (n) { return PHASE_DISPLAY[n] || String(n) }
function getPhaseAgent (n) { return PHASE_AGENTS[n] || 'workflow-orchestrator' }

function getPhaseKey (n) { return `${n}_${getPhaseSlug(n)}` }

function isPhaseCompleted (state, n) {
  return state?.phases?.[getPhaseKey(n)]?.status === 'completed'
}

// ─── 产出物检查 ─────────────────────────────────────────────────

/**
 * 检查指定 phase 的标志产物
 * @param {string} taskName
 * @param {number} phaseNum
 * @param {Object} [state] - 状态对象（gate 类校验需要）
 * @returns {{ pass: boolean, description: string, detail?: string }}
 */
function checkPhaseArtifact (taskName, phaseNum, state) {
  const art = PHASE_ARTIFACTS[phaseNum]
  if (!art) return { pass: true, description: '无' }

  switch (art.type) {
    case 'none':
      return { pass: true, description: art.description }

    case 'file': {
      const p = path.join(PLANS_DIR, `${taskName}${art.suffix}`)
      return fs.existsSync(p)
        ? { pass: true, description: art.description, detail: p }
        : { pass: false, description: `${art.description} 缺失`, detail: p }
    }

    case 'dir': {
      const found = art.anyOf.find(d => fs.existsSync(path.join(PROJECT_ROOT, d)))
      return found
        ? { pass: true, description: art.description, detail: found }
        : { pass: false, description: `${art.description} 缺失`, detail: art.anyOf.join(' 或 ') }
    }

    case 'gate': {
      const ok = state?.gateChecks?.[art.gateKey] === true
      return ok
        ? { pass: true, description: art.description }
        : { pass: false, description: `${art.description} 未确认（gateChecks.${art.gateKey}≠true）` }
    }

    default:
      return { pass: true, description: art.description }
  }
}

// ─── 待确认项检查 ───────────────────────────────────────────────

/**
 * 取 pendingConfirmations 中未解决项
 * @param {Object} state
 * @returns {Array<Object>}
 */
function getUnresolvedConfirmations (state) {
  if (!state?.pendingConfirmations) return []
  return state.pendingConfirmations.filter(p => !p.resolved)
}

// ─── 导出 ───────────────────────────────────────────────────────

module.exports = {
  PROJECT_ROOT,
  PLANS_DIR,
  PHASE_SLUGS,
  PHASE_DISPLAY,
  PHASE_NAMES,
  PHASE_AGENTS,
  PHASE_ARTIFACTS,
  TOTAL_PHASES: PHASE_SLUGS.length,

  getStateFilePath,
  readStateFile,
  writeStateFile,
  findActiveWorkflows,

  getPhaseSlug,
  getPhaseName,
  getPhaseDisplay,
  getPhaseAgent,
  getPhaseKey,
  isPhaseCompleted,

  checkPhaseArtifact,
  getUnresolvedConfirmations
}
