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
 * - type 'file'      : 校验 PLANS_DIR 下文件存在
 * - type 'dir'       : 校验 PROJECT_ROOT 下目录存在（OpenSpec 或 fw_dev_spec）
 * - type 'bizdoc'    : 校验「本次需求」业务文档（state.bizDocPath 精确校验，缺失回退目录+时间窗口）
 * - type 'workspace' : 校验 git 工作区存在代码文件变更（非 git 仓库降级为 warning，可 --allow-empty 放行）
 * - type 'gate'      : 人工 Gate，校验 gateChecks 对应字段为 true
 * - type 'none'      : 不校验（交付阶段）
 */
const PHASE_ARTIFACTS = {
  0: { type: 'workspace', description: '静态页面代码变更（git 工作区）' },
  1: { type: 'file', suffix: '-review-static.md', description: '静态页面偏差报告' },
  2: { type: 'gate', gateKey: 'staticConfirmed', description: '静态页面人工验收' },
  3: { type: 'bizdoc', description: '本次需求业务文档（bizDocPath）' },
  4: { type: 'file', suffix: '-review-prd.md', description: '业务文档偏差报告' },
  5: { type: 'gate', gateKey: 'docConfirmed', description: '业务文档人工确认' },
  6: { type: 'gate', gateKey: 'apiConfirmed', description: '接口定义生成并完成人工验收（⑦b⑦c 合并）' },
  7: { type: 'workspace', description: '业务逻辑代码变更（git 工作区）' },
  8: { type: 'file', suffix: '-review-impl.md', description: '业务逻辑偏差报告' },
  9: { type: 'gate', gateKey: 'bizConfirmed', description: '业务人工验收' },
  10: { type: 'none', description: '交付' }
}

/** 业务文档回退校验的时间窗口（毫秒）：最近 120 分钟内有 Markdown 修改即视为产出 */
const BIZDOC_FALLBACK_WINDOW_MS = 120 * 60 * 1000

/** git 工作区变更中视为「代码产物」的扩展名 */
const CODE_EXTENSIONS = new Set([
  '.vue', '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx',
  '.css', '.scss', '.sass', '.less', '.html', '.htm',
  '.json', '.wxml', '.wxss', '.wxs'
])

/** 不计入代码产物的路径前缀（编排产物 / 依赖 / 构建产物 / 文档） */
const NON_CODE_PREFIXES = [
  '.codebuddy/', '.bugfix-workflow/', '.verify/', '.git/',
  'node_modules/', 'dist/', 'dist-web/', 'build/', 'coverage/',
  'openspec/', 'fw_dev_spec/', 'test-cases/'
]

/** 同进程内缓存 git 工作区状态（validate 会多次调用 checkPhaseArtifact） */
let workspaceCache = null

function parsePorcelainPath (line) {
  // 格式：`XY path` 或 `XY old -> new`（重命名）
  let p = line.slice(3).trim()
  const arrow = p.indexOf(' -> ')
  if (arrow >= 0) p = p.slice(arrow + 4)
  if (p.startsWith('"') && p.endsWith('"')) p = p.slice(1, -1)
  return p.replace(/\\/g, '/')
}

function isCodeChange (relPath) {
  const lower = relPath.toLowerCase()
  if (NON_CODE_PREFIXES.some(prefix => lower.startsWith(prefix))) return false
  const base = lower.split('/').pop()
  if (['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'npm-shrinkwrap.json'].includes(base)) return false
  const ext = base.includes('.') ? `.${base.split('.').pop()}` : ''
  return CODE_EXTENSIONS.has(ext)
}

/** 目录（如未跟踪的 `src/`）下是否存在代码文件（限定深度，跳过依赖与点目录） */
function hasCodeFile (dir, depth = 2) {
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (depth > 0 && hasCodeFile(full, depth - 1)) return true
      } else if (isCodeChange(entry.name)) {
        return true
      }
    }
  } catch (e) { /* 目录不可读 */ }
  return false
}

/**
 * 读取 git 工作区代码变更（结果按进程缓存）
 * @returns {{ isRepo: boolean, changes: string[], error: string|null }}
 */
function getWorkspaceChanges () {
  if (workspaceCache) return workspaceCache
  workspaceCache = { isRepo: false, changes: [], error: null }
  try {
    const inside = execSync('git rev-parse --is-inside-work-tree', {
      cwd: PROJECT_ROOT, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 8000
    }).trim()
    if (inside !== 'true') return workspaceCache
    workspaceCache.isRepo = true
    // -uall：未跟踪目录展开到文件，避免只看到 `?? src/` 而误判
    const out = execSync('git status --porcelain --untracked-files=all', {
      cwd: PROJECT_ROOT, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 8000
    })
    workspaceCache.changes = out
      .split(/\r?\n/)
      .filter(Boolean)
      .map(parsePorcelainPath)
      .filter(p => {
        const lower = p.toLowerCase()
        if (NON_CODE_PREFIXES.some(prefix => lower.startsWith(prefix))) return false
        const abs = path.join(PROJECT_ROOT, p)
        let stat = null
        try { stat = fs.statSync(abs) } catch (e) { /* 已删除文件 */ }
        if (stat && stat.isDirectory()) return hasCodeFile(abs, 2)
        return isCodeChange(p)
      })
  } catch (e) {
    workspaceCache.error = e.message
  }
  return workspaceCache
}

/** 目录下是否存在 Markdown（限定深度，跳过点目录） */
function hasMarkdown (dir, depth = 2) {
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) return true
      if (entry.isDirectory() && depth > 0 && !entry.name.startsWith('.')) {
        if (hasMarkdown(path.join(dir, entry.name), depth - 1)) return true
      }
    }
  } catch (e) { /* 目录不存在或不可读 */ }
  return false
}

/** 目录下最近修改的 Markdown（限定深度与时间窗口） */
function findRecentMarkdown (dir, depth, cutoff) {
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        try {
          if (fs.statSync(full).mtimeMs >= cutoff) return full
        } catch (e) { /* 忽略 stat 失败 */ }
      }
      if (entry.isDirectory() && depth > 0 && !entry.name.startsWith('.')) {
        const hit = findRecentMarkdown(full, depth - 1, cutoff)
        if (hit) return hit
      }
    }
  } catch (e) { /* 目录不存在或不可读 */ }
  return null
}

/** 回退：扫描 openspec/changes 下的 change 目录与 fw_dev_spec 各需求 specs 目录中的近期 Markdown */
function findFallbackBizDoc () {
  const cutoff = Date.now() - BIZDOC_FALLBACK_WINDOW_MS
  const candidates = []

  const changesDir = path.join(PROJECT_ROOT, 'openspec', 'changes')
  try {
    for (const entry of fs.readdirSync(changesDir, { withFileTypes: true })) {
      if (entry.isDirectory()) candidates.push({ dir: path.join(changesDir, entry.name), depth: 2 })
    }
  } catch (e) { /* 无 openspec/changes */ }

  const fwDir = path.join(PROJECT_ROOT, 'fw_dev_spec')
  try {
    for (const entry of fs.readdirSync(fwDir, { withFileTypes: true })) {
      if (entry.isDirectory()) candidates.push({ dir: path.join(fwDir, entry.name, 'specs'), depth: 1 })
    }
  } catch (e) { /* 无 fw_dev_spec */ }

  for (const c of candidates) {
    const hit = findRecentMarkdown(c.dir, c.depth, cutoff)
    if (hit) return hit
  }
  return null
}

/** 校验业务文档（精确路径优先，缺失回退目录 + 时间窗口） */
function checkBizDoc (state) {
  if (state?.bizDocPlan === 'skip') {
    return { pass: true, description: '业务文档（⑤a 已确认跳过）', detail: 'bizDocPlan=skip' }
  }

  const rel = state?.bizDocPath
  if (rel) {
    const abs = path.resolve(PROJECT_ROOT, rel)
    if (!fs.existsSync(abs)) {
      return {
        pass: false,
        description: '本次业务文档不存在',
        detail: `bizDocPath=${rel}（解析为 ${abs}）；请确认 ⑤ 已产出，并用 set-fw-gate ... --biz-doc <path> 重新登记`
      }
    }
    const st = fs.statSync(abs)
    if (st.isFile()) {
      return st.size > 0
        ? { pass: true, description: '本次业务文档', detail: `${rel}（${st.size} bytes）` }
        : { pass: false, description: '本次业务文档为空', detail: rel }
    }
    const markers = ['proposal.md', 'tasks.md', 'design.md', 'specs']
    const hasMarker = markers.some(m => fs.existsSync(path.join(abs, m)))
    if (hasMarker || hasMarkdown(abs, 2)) {
      return { pass: true, description: '本次业务文档目录', detail: rel }
    }
    return {
      pass: false,
      description: '本次业务文档目录内无有效文档',
      detail: `${rel} 需包含 proposal.md / tasks.md / design.md / specs/ 或任意 Markdown`
    }
  }

  const fallback = findFallbackBizDoc()
  if (fallback) {
    return {
      pass: true,
      description: '业务文档（回退校验）',
      detail: path.relative(PROJECT_ROOT, fallback),
      warnings: ['未登记 bizDocPath，已回退「目录 + 最近 120 分钟 Markdown」校验；建议 ⑤ 完成后调用 node scripts/set-fw-gate.cjs <任务名> docConfirmed --biz-doc <路径> 精确登记']
    }
  }

  return {
    pass: false,
    description: '未找到本次业务文档',
    detail: '未登记 bizDocPath，且 openspec/changes/* 与 fw_dev_spec/*/specs 下最近 120 分钟内无 Markdown；请产出文档后登记 bizDocPath'
  }
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
 * @param {Object} [state] - 状态对象（gate / bizdoc / workspace 校验需要）
 * @param {{ allowEmpty?: boolean }} [options] - allowEmpty: 显式允许代码阶段无产出（--allow-empty）
 * @returns {{ pass: boolean, description: string, detail?: string, warnings?: string[] }}
 */
function checkPhaseArtifact (taskName, phaseNum, state, options = {}) {
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

    case 'bizdoc':
      return checkBizDoc(state)

    case 'workspace': {
      const allowedByFlag = options.allowEmpty === true
      const allowedByState = !!state?.allowEmptyPhases?.[String(phaseNum)]
      if (allowedByFlag || allowedByState) {
        return {
          pass: true,
          description: art.description,
          detail: `已显式允许空产出（${allowedByFlag ? '--allow-empty' : 'allowEmptyPhases 留痕'}）`,
          warnings: [`phase ${phaseNum}（${getPhaseDisplay(phaseNum)}）代码变更校验被 --allow-empty 放行，已记录 allowEmptyPhases`]
        }
      }

      const ws = getWorkspaceChanges()
      if (!ws.isRepo) {
        return {
          pass: true,
          description: art.description,
          detail: '非 git 仓库，跳过工作区变更校验',
          warnings: [`未检测到 git 仓库（或 git 不可用），phase ${phaseNum}（${getPhaseDisplay(phaseNum)}）代码变更校验已跳过`]
        }
      }
      if (ws.changes.length > 0) {
        return {
          pass: true,
          description: art.description,
          detail: `${ws.changes.length} 个代码文件变更（如 ${ws.changes[0]}）`
        }
      }
      return {
        pass: false,
        description: `${art.description} 未检测到`,
        detail: 'git 工作区无代码文件变更；若本次确无代码产出（如纯配置/纯文档任务），追加 --allow-empty 重试并在状态文件留痕'
      }
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
  checkBizDoc,
  getWorkspaceChanges,
  findFallbackBizDoc,
  getUnresolvedConfirmations
}
