#!/usr/bin/env node
/**
 * frontend-workflow 多 agent 状态机 — 公共工具模块
 *
 * 提供 fw 工作流的 Phase 定义、状态文件读写、产出物检查、待确认项检查等公共函数。
 * 被 create-fw-workflow / validate-fw-phase-gate / advance-fw-phase 三个脚本复用。
 *
 * 阶段编号约定：
 *   - 状态机内部用顺序整数 phase（0~11）存储；
 *   - 展示层用 ②~⑫ 原编号（含 ⑤a/⑦b/⑦c/⑧a 子阶段）；
 *   - 双向映射集中在本模块，避免散落不一致。
 *
 * @module workflow-state-utils
 */

const fs = require('fs')
const path = require('path')

// ─── 路径常量 ──────────────────────────────────────────────────

/** 项目根目录 */
const PROJECT_ROOT = process.env.CODEBUDDY_PROJECT_DIR || process.env.CLAUDE_PROJECT_DIR || process.cwd()

/** plans 目录（状态文件与编排类产物所在） */
const PLANS_DIR = path.join(PROJECT_ROOT, '.codebuddy', 'plans')

// ─── Phase 定义 ─────────────────────────────────────────────────

/**
 * 内部 phase（0~11）→ slug
 * 对应编排协议 §三 的映射表
 */
const PHASE_SLUGS = [
  'gen_static',    // 0  = ② 生成静态页面
  'review_static', // 1  = ③ 检查
  'gate_static',   // 2  = ④ 人工 Gate
  'gen_prd',       // 3  = ⑤a⑤ 业务文档生成
  'review_prd',    // 4  = ⑥ 检查
  'gate_prd',      // 5  = ⑦ 人工 Gate
  'gen_api',       // 6  = ⑦b 接口定义生成
  'gate_api',      // 7  = ⑦c 人工 Gate
  'implement',     // 8  = ⑧a⑧⑨ 前置编排+设计桥梁+业务逻辑
  'review_impl',   // 9  = ⑩ 检查
  'gate_impl',     // 10 = ⑪ 人工 Gate
  'final'          // 11 = ⑫ 终验
]

/** 内部 phase → 展示编号 */
const PHASE_DISPLAY = [
  '②', '③', '④', '⑤a⑤', '⑥', '⑦', '⑦b', '⑦c', '⑧a⑧⑨', '⑩', '⑪', '⑫'
]

/** 内部 phase → 中文名称 */
const PHASE_NAMES = [
  '生成静态页面',
  '静态页面检查',
  '静态页面人工验收',
  '业务文档生成',
  '业务文档检查',
  '业务文档人工确认',
  '接口定义生成',
  '接口人工验收',
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
  'api-contractor',        // 6
  'workflow-orchestrator', // 7  (人工 Gate)
  'frontend-implementer',  // 8
  'qa-reviewer',           // 9
  'workflow-orchestrator', // 10 (人工 Gate)
  'workflow-orchestrator'  // 11 (终验)
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
  6: { type: 'none', description: '接口定义文件（由接口人工验收把关）' },
  7: { type: 'gate', gateKey: 'apiConfirmed', description: '接口人工验收' },
  8: { type: 'none', description: '业务逻辑代码（不强制文件校验）' },
  9: { type: 'file', suffix: '-review-impl.md', description: '业务逻辑偏差报告' },
  10: { type: 'gate', gateKey: 'bizConfirmed', description: '业务人工验收' },
  11: { type: 'none', description: '交付' }
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

// ─── stdin 读取（Windows 兼容） ─────────────────────────────────

function readStdin () {
  try {
    const buf = Buffer.alloc(65536)
    const fd = fs.openSync(process.stdin.fd, 'r')
    const bytesRead = fs.readSync(fd, buf, 0, 65536, null)
    fs.closeSync(fd)
    return bytesRead > 0 ? buf.toString('utf-8', 0, bytesRead) : ''
  } catch (e) {
    return ''
  }
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
  getUnresolvedConfirmations,
  readStdin
}
