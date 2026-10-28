#!/usr/bin/env node
/**
 * fw-process.cjs — frontend-workflow 本地长驻进程登记与回收
 *
 * 解决的问题：本地自测（dev server / mock server / preview / 静态服务）被后台启动后
 * 没有被回收，导致端口占用、CPU/内存浪费，且后续自测可能连到旧进程产生「假绿」。
 *
 * 规则来源：references/cross-cutting.md「五、进程生命周期与资源回收（硬约束）」
 *   - 启动前必须登记（register）
 *   - 收尾必须回收并验证端口释放（cleanup）
 *   - Gate / finish 前必须校验无残留（check）
 *
 * 用法:
 *   node scripts/fw-process.cjs register <任务名> --port <端口> [--pid <PID>] [--cmd "<命令>"] [--note "<备注>"]
 *   node scripts/fw-process.cjs list     <任务名>
 *   node scripts/fw-process.cjs check    <任务名> [--all-tasks]
 *   node scripts/fw-process.cjs cleanup  <任务名> [--port <端口>] [--all-tasks] [--dry-run]
 *
 * 输出（stdout）: JSON
 * 退出码: 0 = 通过 / 1 = 存在残留或回收失败 / 2 = 参数或用法错误
 *
 * 登记文件: <plans 目录>/<任务名>-fw-processes.json
 *   plans 目录优先级：FW_STATE_DIR → <项目根>/.codebuddy/plans
 *
 * 设计约束：仅使用 Node 内置模块；不依赖第三方包；不主动启动任何进程。
 */

'use strict'

const fs = require('fs')
const path = require('path')
const net = require('net')
const { execSync } = require('child_process')
const { PROJECT_ROOT, PLANS_DIR } = require('./workflow-state-utils.cjs')

// ─── 常量 ───────────────────────────────────────────────────────

const IS_WIN = process.platform === 'win32'
const KILL_GRACE_MS = 5000
const PORT_PROBE_TIMEOUT_MS = 800

// ─── 参数解析 ───────────────────────────────────────────────────

const argv = process.argv.slice(2)

function getOpt (name) {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null
}

function hasFlag (name) {
  return argv.includes(name)
}

function usage (msg) {
  if (msg) console.error('错误: ' + msg)
  console.error([
    '用法:',
    '  node scripts/fw-process.cjs register <任务名> --port <端口> [--pid <PID>] [--cmd "<命令>"] [--note "<备注>"]',
    '  node scripts/fw-process.cjs list     <任务名>',
    '  node scripts/fw-process.cjs check    <任务名> [--all-tasks]',
    '  node scripts/fw-process.cjs cleanup  <任务名> [--port <端口>] [--all-tasks] [--dry-run]',
    '',
    '示例:',
    '  node scripts/fw-process.cjs register user-export --port 5173 --cmd "npm run dev"',
    '  node scripts/fw-process.cjs check user-export',
    '  node scripts/fw-process.cjs cleanup user-export'
  ].join('\n'))
  process.exit(2)
}

// ─── 登记文件读写 ───────────────────────────────────────────────

function registryPath (taskName) {
  return path.join(PLANS_DIR, `${taskName}-fw-processes.json`)
}

function readRegistry (taskName) {
  const p = registryPath(taskName)
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'))
    if (!data || !Array.isArray(data.entries)) return { task: taskName, entries: [] }
    return data
  } catch (e) {
    return { task: taskName, entries: [] }
  }
}

function writeRegistry (taskName, data) {
  fs.mkdirSync(PLANS_DIR, { recursive: true })
  const p = registryPath(taskName)
  const tmp = `${p}.tmp-${process.pid}`
  fs.writeFileSync(tmp, JSON.stringify({ ...data, task: taskName, updatedAt: new Date().toISOString() }, null, 2))
  fs.renameSync(tmp, p)
}

function listRegistryFiles () {
  try {
    return fs.readdirSync(PLANS_DIR)
      .filter(f => f.endsWith('-fw-processes.json'))
      .map(f => f.replace(/-fw-processes\.json$/, ''))
  } catch (e) {
    return []
  }
}

// ─── 端口与进程探测 ─────────────────────────────────────────────

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** 端口是否有监听（连接成功即视为被占用） */
function canConnect (port, timeout = PORT_PROBE_TIMEOUT_MS) {
  return new Promise(resolve => {
    const socket = net.connect({ port, host: '127.0.0.1' })
    const done = (result) => {
      socket.removeAllListeners()
      socket.destroy()
      resolve(result)
    }
    socket.setTimeout(timeout)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
  })
}

/** 端口是否可绑定（连接探测的兜底，避免服务只监听 0.0.0.0 以外的地址） */
function canBind (port) {
  return new Promise(resolve => {
    const server = net.createServer()
    server.once('error', err => resolve(err.code !== 'EADDRINUSE' && err.code !== 'EACCES' ? true : false))
    server.once('listening', () => server.close(() => resolve(true)))
    server.listen({ port, host: '0.0.0.0', exclusive: true })
  })
}

async function isPortBusy (port) {
  if (await canConnect(port)) return true
  return !(await canBind(port))
}

function isAlive (pid) {
  if (!pid) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return e.code === 'EPERM'
  }
}

/** 按端口反查监听进程 PID（Windows: netstat；POSIX: lsof / ss） */
function pidsByPort (port) {
  const pids = new Set()
  if (IS_WIN) {
    try {
      const out = execSync('netstat -ano -p tcp', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000 })
      for (const line of out.split(/\r?\n/)) {
        if (!/LISTENING/i.test(line)) continue
        const cols = line.trim().split(/\s+/)
        if (cols.length < 5) continue
        const local = cols[1]
        if (!local.endsWith(`:${port}`)) continue
        const pid = Number(cols[cols.length - 1])
        if (Number.isInteger(pid) && pid > 0) pids.add(pid)
      }
    } catch (e) { /* 探测失败时返回空集合，由调用方降级处理 */ }
    return [...pids]
  }

  try {
    const out = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000 })
    out.split(/\s+/).filter(Boolean).forEach(p => {
      const pid = Number(p)
      if (Number.isInteger(pid) && pid > 0) pids.add(pid)
    })
  } catch (e) {
    try {
      const out = execSync(`ss -ltnp 'sport = :${port}'`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000 })
      const re = /pid=(\d+)/g
      let m
      while ((m = re.exec(out)) !== null) pids.add(Number(m[1]))
    } catch (e2) { /* 两者都不可用 */ }
  }
  return [...pids]
}

/** POSIX 递归收集子进程（先杀子再杀父，避免孤儿被 init 收养后失联） */
function collectChildren (pid, acc = []) {
  if (!IS_WIN) {
    try {
      const out = execSync(`pgrep -P ${pid}`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 })
      for (const child of out.split(/\s+/).filter(Boolean).map(Number)) {
        if (!Number.isInteger(child) || child <= 0 || acc.includes(child)) continue
        collectChildren(child, acc)
        acc.push(child)
      }
    } catch (e) { /* 无子进程 */ }
  }
  return acc
}

/** 杀掉进程及其整棵子进程树，返回是否成功下发 */
function killTree (pid) {
  if (!pid || !isAlive(pid)) return true
  if (IS_WIN) {
    try {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore', timeout: 15000 })
      return true
    } catch (e) {
      return false
    }
  }
  const children = collectChildren(pid)
  let ok = true
  for (const child of children) {
    try { process.kill(child, 'SIGTERM') } catch (e) { /* 已退出 */ }
  }
  try { process.kill(pid, 'SIGTERM') } catch (e) { /* 已退出 */ }
  setTimeout(() => {
    for (const child of [...children, pid]) {
      try { process.kill(child, 'SIGKILL') } catch (e) { /* 已退出 */ }
    }
  }, KILL_GRACE_MS).unref()
  return ok
}

// ─── 登记条目状态计算 ───────────────────────────────────────────

async function inspectEntry (entry) {
  const pidAlive = isAlive(entry.pid)
  const portBusy = entry.port ? await isPortBusy(entry.port) : false
  let status = entry.status || 'running'
  if (status === 'running' && !pidAlive && !portBusy) status = 'released'
  return { ...entry, status, pidAlive, portBusy }
}

async function inspectAll (taskName, persist = true) {
  const reg = readRegistry(taskName)
  const entries = []
  for (const e of reg.entries) entries.push(await inspectEntry(e))
  // 自动把「pid 已退出且端口已释放」的条目落盘为 released，避免历史噪音
  // persist=false 用于纯只读探测（check / list），保证 qa-reviewer 等只读角色不产生写操作
  const changed = persist && entries.some((e, i) => e.status !== reg.entries[i].status)
  if (changed) {
    writeRegistry(taskName, { ...reg, entries: entries.map(e => ({
      id: e.id, port: e.port, pid: e.pid, cmd: e.cmd, note: e.note,
      status: e.status, registeredAt: e.registeredAt, releasedAt: e.status === 'released' ? (e.releasedAt || new Date().toISOString()) : e.releasedAt
    })) })
  }
  return { ...reg, entries }
}

function blockersOf (taskName, entries) {
  const blockers = []
  for (const e of entries) {
    if (e.status === 'released') continue
    if (e.pidAlive) blockers.push(`[${taskName}] PID ${e.pid} 仍存活（端口 ${e.port || '-'}，${e.cmd || '未记录命令'}）`)
    if (e.portBusy) blockers.push(`[${taskName}] 端口 ${e.port} 仍被占用（${e.cmd || '未记录命令'}）`)
  }
  return blockers
}

// ─── 子命令 ─────────────────────────────────────────────────────

async function cmdRegister (taskName) {
  const portRaw = getOpt('--port')
  const port = Number(portRaw)
  if (!portRaw || !Number.isInteger(port) || port <= 0 || port > 65535) {
    usage('register 需要合法 --port（1~65535）')
  }

  let pid = getOpt('--pid') ? Number(getOpt('--pid')) : null
  if (pid !== null && (!Number.isInteger(pid) || pid <= 0)) usage('--pid 必须为正整数')
  if (!pid) {
    const found = pidsByPort(port)
    pid = found.length === 1 ? found[0] : null
  }

  const reg = readRegistry(taskName)
  const now = new Date().toISOString()
  const existing = reg.entries.find(e => e.port === port)
  if (existing && existing.status !== 'released') {
    existing.pid = pid || existing.pid
    existing.cmd = getOpt('--cmd') || existing.cmd
    existing.note = getOpt('--note') || existing.note
    existing.updatedAt = now
  } else {
    reg.entries.push({
      id: `${Date.now()}-${port}`,
      port,
      pid,
      cmd: getOpt('--cmd') || '',
      note: getOpt('--note') || '',
      status: 'running',
      registeredAt: now
    })
  }
  writeRegistry(taskName, reg)

  const busy = await isPortBusy(port)
  console.log(JSON.stringify({
    success: true,
    task: taskName,
    entry: reg.entries[reg.entries.length - 1],
    warning: [
      pid ? null : '未能反查到 PID：cleanup 时将按端口兜底回收，请确保该端口由本任务启动',
      busy
        ? '端口已被占用：请确认是本任务刚启动的进程；若非本任务（或疑似上次残留）请勿直接使用，先 cleanup 或改用空闲端口'
        : '登记时端口尚未监听：若尚未启动，请在启动完成后再次 register 同一端口以补全 PID（会更新原条目）'
    ].filter(Boolean),
    registry: registryPath(taskName)
  }, null, 2))
  process.exit(0)
}

async function cmdList (taskName) {
  const reg = await inspectAll(taskName, false)
  console.log(JSON.stringify({
    success: true,
    task: taskName,
    entries: reg.entries.map(e => ({
      port: e.port, pid: e.pid, cmd: e.cmd, status: e.status,
      pidAlive: e.pidAlive, portBusy: e.portBusy, registeredAt: e.registeredAt
    })),
    registry: registryPath(taskName)
  }, null, 2))
  process.exit(0)
}

async function cmdCheck (taskName) {
  const allTasks = hasFlag('--all-tasks')
  const tasks = allTasks ? listRegistryFiles() : [taskName]
  const results = []
  const blockers = []

  for (const t of tasks) {
    const reg = await inspectAll(t, false)
    blockers.push(...blockersOf(t, reg.entries))
    results.push({ task: t, entries: reg.entries.map(e => ({ port: e.port, pid: e.pid, status: e.status, cmd: e.cmd })) })
  }

  const pass = blockers.length === 0
  console.log(JSON.stringify({
    success: pass,
    pass,
    scope: allTasks ? 'all-tasks' : taskName,
    checked: tasks,
    blockers,
    results
  }, null, 2))
  process.exit(pass ? 0 : 1)
}

async function cmdCleanup (taskName) {
  const allTasks = hasFlag('--all-tasks')
  const dryRun = hasFlag('--dry-run')
  const onlyPort = getOpt('--port') ? Number(getOpt('--port')) : null
  const tasks = allTasks ? listRegistryFiles() : [taskName]
  if (tasks.length === 0) {
    console.log(JSON.stringify({ success: true, message: '无登记文件，无需回收', released: [], failed: [] }, null, 2))
    process.exit(0)
  }

  const released = []
  const failed = []
  const skipped = []

  for (const t of tasks) {
    const reg = await inspectAll(t)
    for (const e of reg.entries) {
      if (e.status === 'released') continue
      if (onlyPort && e.port !== onlyPort) continue

      // 目标 PID：优先登记的 PID；PID 已退出但端口仍占用时按端口兜底（Windows 常见：shell 被杀、node 子进程残留）
      let targets = e.pidAlive ? [e.pid] : []
      if (targets.length === 0 && e.portBusy && e.port) targets = pidsByPort(e.port)
      if (targets.length === 0) {
        skipped.push({ task: t, port: e.port, reason: '无存活进程且端口已释放' })
        e.status = 'released'
        e.releasedAt = new Date().toISOString()
        continue
      }

      if (dryRun) {
        skipped.push({ task: t, port: e.port, reason: `dry-run：将终止 PID ${targets.join(', ')}` })
        continue
      }

      for (const pid of targets) killTree(pid)

      // 等待进程退出与端口释放（最多 KILL_GRACE_MS + 3s）
      const deadline = Date.now() + KILL_GRACE_MS + 3000
      let busy = e.port ? await isPortBusy(e.port) : false
      let alive = targets.some(isAlive)
      while ((busy || alive) && Date.now() < deadline) {
        await sleep(300)
        busy = e.port ? await isPortBusy(e.port) : false
        alive = targets.some(isAlive)
      }

      if (!busy && !alive) {
        e.status = 'released'
        e.releasedAt = new Date().toISOString()
        released.push({ task: t, port: e.port, pids: targets, cmd: e.cmd })
      } else {
        failed.push({ task: t, port: e.port, pids: targets, pidAlive: alive, portBusy: busy, cmd: e.cmd })
      }
    }

    if (!dryRun) {
      writeRegistry(t, {
        ...reg,
        entries: reg.entries.map(e => ({
          id: e.id, port: e.port, pid: e.pid, cmd: e.cmd, note: e.note,
          status: e.status, registeredAt: e.registeredAt, releasedAt: e.releasedAt
        }))
      })
    }
  }

  const success = failed.length === 0
  console.log(JSON.stringify({
    success,
    dryRun,
    released,
    failed,
    skipped,
    message: success
      ? (dryRun ? 'dry-run 完成（未实际终止进程）' : '✅ 本地进程已回收，端口已释放')
      : '❌ 仍有进程/端口未释放，请人工处理（见 failed）'
  }, null, 2))
  process.exit(success ? 0 : 1)
}

// ─── 入口 ───────────────────────────────────────────────────────

function main () {
  const cmd = argv[0]
  const taskName = argv[1]

  if (!cmd || ['help', '--help', '-h'].includes(cmd)) usage()
  if (!taskName || taskName.startsWith('--')) usage('缺少任务名')

  if (hasFlag('--all-tasks') && !['check', 'cleanup'].includes(cmd)) {
    usage('--all-tasks 仅支持 check / cleanup')
  }

  const validTask = /^[A-Za-z0-9_\u4e00-\u9fa5][A-Za-z0-9._\-\u4e00-\u9fa5]*$/
  if (!validTask.test(taskName)) usage(`任务名 "${taskName}" 非法`)

  switch (cmd) {
    case 'register': return cmdRegister(taskName)
    case 'list': return cmdList(taskName)
    case 'check': return cmdCheck(taskName)
    case 'cleanup': return cmdCleanup(taskName)
    default: usage(`未知子命令: ${cmd}`)
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(JSON.stringify({ success: false, error: err && err.message ? err.message : String(err) }, null, 2))
    process.exit(1)
  })
}

module.exports = {
  PROJECT_ROOT,
  PLANS_DIR,
  registryPath,
  readRegistry,
  isPortBusy,
  pidsByPort,
  isAlive
}
