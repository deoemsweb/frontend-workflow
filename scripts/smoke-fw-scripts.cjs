#!/usr/bin/env node
/**
 * smoke-fw-scripts.cjs — frontend-workflow 状态机与同步脚本冒烟测试
 *
 * 在系统临时目录运行完整链路，验证关键回归点：
 *   - P0-1  sync-fw-openspec.cjs check 不再抛 ReferenceError
 *   - P1-1  人工 Gate 强校验（未 set-fw-gate 不得离开 Gate；advance 不再自动置位）
 *   - P1-2  --biz-doc skip 不再被业务文档目录产物检查卡死
 *   - P3-1  skipped 语义（advance 不改标 skipped；rollback 拒绝 skipped 目标；
 *           skip-fw-phase 自动前进；finish 提前收尾）
 *
 * 用法: node scripts/smoke-fw-scripts.cjs [--keep-temp]
 * 退出码: 0 = 全部通过；1 = 存在失败项
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync, spawn } = require('child_process')

const HERE = __dirname
const S = (name) => path.join(HERE, name)
const KEEP = process.argv.includes('--keep-temp')

let passed = 0
let failed = 0
const failures = []
const spawnedChildren = []

function isAlivePid (pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return e.code === 'EPERM'
  }
}

function spawnIdle () {
  const child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore' })
  spawnedChildren.push(child)
  return child
}

function check (name, cond, detail) {
  if (cond) {
    passed++
    console.log(`  ✅ ${name}`)
  } else {
    failed++
    failures.push(name)
    console.log(`  ❌ ${name}${detail ? ' → ' + detail : ''}`)
  }
}

function run (script, args, cwd, opts = {}) {
  const r = spawnSync(process.execPath, [S(script), ...args], {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 30000
  })
  if (r.error) {
    return { code: -1, stdout: '', stderr: String(r.error && r.error.message) }
  }
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' }
}

function readJson (cwd, rel) {
  try { return JSON.parse(fs.readFileSync(path.join(cwd, rel), 'utf-8')) } catch (e) { return null }
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fw-smoke-'))
console.log('临时目录: ' + tmp)

try {
  // ─── 状态机主链路 ─────────────────────────────────────────────
  console.log('\n[状态机主链路 demo-task]')

  let r = run('create-fw-workflow.cjs', ['demo-task', '--start', '0'], tmp)
  check('create --start 0', r.code === 0, r.stderr.trim())
  const st0 = readJson(tmp, '.codebuddy/plans/demo-task-fw-state.json')
  check('create 初始化 v1.4 字段',
    st0?.bizDocPath === null &&
    st0?.testCasesDoc === null &&
    typeof st0?.allowEmptyPhases === 'object' &&
    st0?.gateChecks?.testCasesConfirmed === false,
    JSON.stringify({ bizDocPath: st0?.bizDocPath, testCasesDoc: st0?.testCasesDoc, gate: st0?.gateChecks?.testCasesConfirmed }))

  r = run('advance-fw-phase.cjs', ['demo-task', '1'], tmp)
  check('advance 0→1', r.code === 0, r.stderr.trim())

  fs.mkdirSync(path.join(tmp, '.codebuddy', 'plans'), { recursive: true })
  fs.writeFileSync(path.join(tmp, '.codebuddy', 'plans', 'demo-task-review-static.md'), 'x')

  r = run('advance-fw-phase.cjs', ['demo-task', '2'], tmp)
  check('advance 1→2（进入 Gate④，仅 warning）', r.code === 0, r.stderr.trim())

  r = run('advance-fw-phase.cjs', ['demo-task', '3'], tmp)
  check('advance 2→3 未置位被阻断（P1-1 强校验）', r.code === 1 && /staticConfirmed/.test(r.stderr), 'code=' + r.code)

  r = run('set-fw-gate.cjs', ['demo-task', 'staticConfirmed'], tmp)
  check('set-fw-gate staticConfirmed', r.code === 0, r.stderr.trim())
  check('gateChecks.staticConfirmed=true', readJson(tmp, '.codebuddy/plans/demo-task-fw-state.json')?.gateChecks?.staticConfirmed === true)

  r = run('advance-fw-phase.cjs', ['demo-task', '3'], tmp)
  check('advance 2→3（置位后放行）', r.code === 0, r.stderr.trim())

  // phase 3 现为 bizdoc 精确校验：未登记 bizDocPath 时回退「目录 + 120 分钟内有 Markdown」
  fs.mkdirSync(path.join(tmp, 'openspec', 'changes', 'demo'), { recursive: true })
  fs.writeFileSync(path.join(tmp, 'openspec', 'changes', 'demo', 'proposal.md'), '# demo\n')
  r = run('advance-fw-phase.cjs', ['demo-task', '4'], tmp)
  check('advance 3→4（业务文档回退校验命中）', r.code === 0, r.stderr.trim())
  check('回退校验输出 warning', /回退/.test(r.stdout), r.stdout.slice(0, 160))

  fs.writeFileSync(path.join(tmp, '.codebuddy', 'plans', 'demo-task-review-prd.md'), 'x')
  r = run('advance-fw-phase.cjs', ['demo-task', '5'], tmp)
  check('advance 4→5（进入 Gate⑦）', r.code === 0, r.stderr.trim())

  r = run('advance-fw-phase.cjs', ['demo-task', '6'], tmp)
  check('advance 5→6 未置位被阻断', r.code === 1 && /docConfirmed/.test(r.stderr), 'code=' + r.code)

  r = run('set-fw-gate.cjs', ['demo-task', 'docConfirmed'], tmp)
  r = run('advance-fw-phase.cjs', ['demo-task', '6'], tmp)
  check('set docConfirmed 后 advance 5→6', r.code === 0, r.stderr.trim())

  r = run('advance-fw-phase.cjs', ['demo-task', '7'], tmp)
  check('advance 6→7 未置位 apiConfirmed 被阻断', r.code === 1 && /apiConfirmed/.test(r.stderr), 'code=' + r.code)

  r = run('set-fw-gate.cjs', ['demo-task', 'apiConfirmed'], tmp)
  r = run('advance-fw-phase.cjs', ['demo-task', '7'], tmp)
  check('set apiConfirmed 后 advance 6→7', r.code === 0, r.stderr.trim())

  fs.writeFileSync(path.join(tmp, '.codebuddy', 'plans', 'demo-task-review-impl.md'), 'x')
  r = run('advance-fw-phase.cjs', ['demo-task', '8'], tmp)
  check('advance 7→8', r.code === 0, r.stderr.trim())

  r = run('advance-fw-phase.cjs', ['demo-task', '9'], tmp)
  check('advance 8→9（进入 Gate⑪）', r.code === 0, r.stderr.trim())

  r = run('advance-fw-phase.cjs', ['demo-task', '10'], tmp)
  check('advance 9→10 未置位被阻断', r.code === 1 && /bizConfirmed/.test(r.stderr), 'code=' + r.code)

  r = run('set-fw-gate.cjs', ['demo-task', 'bizConfirmed'], tmp)
  r = run('advance-fw-phase.cjs', ['demo-task', '10'], tmp)
  check('set bizConfirmed 后 advance 9→10 完成', r.code === 0, r.stderr.trim())
  check('工作流 status=completed', readJson(tmp, '.codebuddy/plans/demo-task-fw-state.json')?.status === 'completed')

  // rollback 正常场景 + 回流计数重置 + gate 复位
  r = run('rollback-fw-phase.cjs', ['demo-task', '8'], tmp)
  check('rollback 10→8', r.code === 0, r.stderr.trim())
  const st8 = readJson(tmp, '.codebuddy/plans/demo-task-fw-state.json')
  check('rollback 后 reviewLoopCount 清零', st8?.reviewLoopCount?.static === 0 && st8?.reviewLoopCount?.impl === 0)
  check('rollback 后 bizConfirmed 复位 false', st8?.gateChecks?.bizConfirmed === false)

  // ─── biz-doc=skip 分支 ────────────────────────────────────────
  console.log('\n[biz-doc=skip 分支 skip-task]')

  r = run('create-fw-workflow.cjs', ['skip-task', '--start', '3', '--biz-doc', 'skip'], tmp)
  check('create --start 3 --biz-doc skip', r.code === 0, r.stderr.trim())

  r = run('validate-fw-phase-gate.cjs', ['skip-task', '4'], tmp)
  check('validate 4 不再被业务文档目录卡死（P1-2）', r.code === 0 && /"pass": true/.test(r.stdout), r.stdout.trim())

  r = run('rollback-fw-phase.cjs', ['skip-task', '1'], tmp)
  check('rollback 到 skipped 阶段被拒绝（P3-1）', r.code === 1 && /skipped/.test(r.stderr), 'code=' + r.code)

  r = run('skip-fw-phase.cjs', ['skip-task', '3', '4', '5'], tmp)
  check('skip-fw-phase 3 4 5', r.code === 0, r.stderr.trim())
  const stS = readJson(tmp, '.codebuddy/plans/skip-task-fw-state.json')
  check('skip 后自动前进到 phase 6', stS?.phase === 6 && stS?.phases?.['6_gen_api']?.status === 'running')
  check('phase 3/4/5 均 skipped', [3, 4, 5].every(p => stS?.phases?.[`${p}_${['gen_prd', 'review_prd', 'gate_prd'][p - 3]}`]?.status === 'skipped'))

  r = run('advance-fw-phase.cjs', ['skip-task', '6'], tmp)
  check('advance 6（前置全 skipped）', r.code === 0, r.stderr.trim())
  check('advance 不改标 skipped 前驱（phase 5 仍 skipped）', readJson(tmp, '.codebuddy/plans/skip-task-fw-state.json')?.phases?.['5_gate_prd']?.status === 'skipped')

  r = run('finish-fw-workflow.cjs', ['skip-task'], tmp)
  check('finish 提前收尾', r.code === 0, r.stderr.trim())
  check('finish 后 status=completed', readJson(tmp, '.codebuddy/plans/skip-task-fw-state.json')?.status === 'completed')

  // ─── sync-fw-openspec：P0-1 崩溃回归 + 默认 openspecPath 层级 ───
  console.log('\n[sync-fw-openspec]')

  const docDir = path.join(tmp, 'fw_dev_spec', 'demo-2026-08-15', 'specs')
  fs.mkdirSync(docDir, { recursive: true })
  fs.writeFileSync(path.join(docDir, '开发计划.md'), [
    '# 开发计划活文档（demo）',
    '',
    '### 模块 ① 当前项目说明',
    'demo',
    '',
    '### 模块 ② 需求功能模块设计',
    'demo',
    '',
    '<!-- openspec-sync -->',
    'openspecSync:',
    '  enabled: true',
    '  capability: demo',
    '  changeId: demo-1',
    '  lastSyncFingerprint: x',
    '<!-- /openspec-sync -->',
    ''
  ].join('\n'))
  const specDir = path.join(tmp, 'openspec', 'specs', 'demo')
  fs.mkdirSync(specDir, { recursive: true })
  fs.writeFileSync(path.join(specDir, 'spec.md'), '> 来源：../../../../fw_dev_spec/demo-2026-08-15/specs/开发计划.md\n')

  r = run('sync-fw-openspec.cjs', ['check', path.join(docDir, '开发计划.md')], tmp)
  check('sync check 不再抛 ReferenceError（P0-1）', !/ReferenceError/.test(r.stderr + r.stdout), (r.stderr || r.stdout).split('\n').slice(0, 3).join(' | '))
  check('sync check 用默认 ../../../openspec 定位到项目根 openspec/', /openspec\/ 目录存在\s*✅/.test(r.stdout), r.stdout.split('\n').filter(l => l.includes('openspec')).join(' | '))

  // ─── v1.4.0：业务文档精确校验（bizdoc）────────────────────────
  console.log('\n[阶段产物校验 bizdoc]')

  r = run('create-fw-workflow.cjs', ['doc-task', '--start', '3', '--biz-doc', 'fw-dev-spec', '--biz-doc-path', 'fw_dev_spec/demo-2026-08-15/specs/开发计划.md'], tmp)
  check('create --biz-doc-path', r.code === 0, r.stderr.trim())

  r = run('advance-fw-phase.cjs', ['doc-task', '4'], tmp)
  check('bizDocPath 精确命中 → advance 3→4', r.code === 0, r.stderr.trim())

  r = run('create-fw-workflow.cjs', ['doc-task2', '--start', '3', '--biz-doc', 'fw-dev-spec', '--biz-doc-path', 'fw_dev_spec/nope/specs/开发计划.md'], tmp)
  r = run('advance-fw-phase.cjs', ['doc-task2', '4'], tmp)
  check('bizDocPath 不存在 → 阻断', r.code === 1 && /本次业务文档不存在/.test(r.stderr), 'code=' + r.code)

  r = run('create-fw-workflow.cjs', ['doc-task3', '--start', '3', '--biz-doc', 'fw-dev-spec'], tmp)
  r = run('advance-fw-phase.cjs', ['doc-task3', '4'], tmp)
  check('未登记 bizDocPath → 回退校验命中', r.code === 0 && /未登记 bizDocPath/.test(r.stdout), r.stdout.slice(0, 200))

  r = run('set-fw-gate.cjs', ['doc-task3', 'docConfirmed', '--biz-doc', 'fw_dev_spec/demo-2026-08-15/specs/开发计划.md'], tmp)
  check('--biz-doc 写入 bizDocPath',
    r.code === 0 && readJson(tmp, '.codebuddy/plans/doc-task3-fw-state.json')?.bizDocPath === 'fw_dev_spec/demo-2026-08-15/specs/开发计划.md',
    r.stderr.trim())

  // ─── v1.4.0：代码阶段弱校验（workspace + --allow-empty）───────
  console.log('\n[代码阶段弱校验 workspace]')
  const gitTmp = path.join(tmp, 'gitproj')
  fs.mkdirSync(gitTmp, { recursive: true })
  const git = (args) => spawnSync('git', args, { cwd: gitTmp, encoding: 'utf-8' })
  const gitOk = git(['--version']).status === 0

  if (gitOk) {
    git(['init'])
    git(['config', 'user.email', 'smoke@local'])
    git(['config', 'user.name', 'smoke'])

    r = run('create-fw-workflow.cjs', ['ws-task', '--start', '0'], gitTmp)
    check('ws-task 初始化（git 仓库）', r.code === 0, r.stderr.trim())

    r = run('advance-fw-phase.cjs', ['ws-task', '1'], gitTmp)
    check('工作区无变更 → advance 0→1 阻断', r.code === 1 && /--allow-empty/.test(r.stderr), 'code=' + r.code)

    r = run('advance-fw-phase.cjs', ['ws-task', '1', '--allow-empty'], gitTmp)
    check('--allow-empty 放行空产出', r.code === 0, r.stderr.trim())
    check('allowEmptyPhases 留痕', !!readJson(gitTmp, '.codebuddy/plans/ws-task-fw-state.json')?.allowEmptyPhases?.['0']?.at)

    r = run('create-fw-workflow.cjs', ['ws-task2', '--start', '0'], gitTmp)
    fs.mkdirSync(path.join(gitTmp, 'src'), { recursive: true })
    fs.writeFileSync(path.join(gitTmp, 'src', 'App.vue'), '<template><div /></template>\n')
    r = run('advance-fw-phase.cjs', ['ws-task2', '1'], gitTmp)
    check('存在代码变更 → 通过', r.code === 0, r.stderr.trim())

    // 先提交代码变更，制造干净工作区，再只改文档
    git(['add', '.'])
    git(['commit', '-m', 'init'])
    fs.writeFileSync(path.join(gitTmp, 'README.md'), '# doc only\n')
    r = run('create-fw-workflow.cjs', ['ws-task3', '--start', '0'], gitTmp)
    // 仅有 README.md（.md 被过滤）变更，不应算代码产出
    r = run('advance-fw-phase.cjs', ['ws-task3', '1'], gitTmp)
    check('仅文档变更不算代码产出', r.code === 1, 'code=' + r.code)
  } else {
    console.log('  ⏭ git 不可用，跳过 workspace 断言')
  }

  // ─── v1.4.0：用例审阅内嵌门控（testCasesConfirmed）────────────
  console.log('\n[用例审阅门控 testcase-task]')
  r = run('create-fw-workflow.cjs', ['tc-task', '--start', '0'], tmp)
  const tcPath = path.join(tmp, '.codebuddy', 'plans', 'tc-task-fw-state.json')
  const stTc = JSON.parse(fs.readFileSync(tcPath, 'utf-8'))
  stTc.phase = 7
  for (const k of Object.keys(stTc.phases)) {
    if (parseInt(k, 10) <= 7) stTc.phases[k] = { ...stTc.phases[k], status: 'completed' }
  }
  stTc.gateChecks = {
    staticConfirmed: true,
    docConfirmed: true,
    apiConfirmed: true,
    bizConfirmed: false,
    testCasesConfirmed: false
  }
  stTc.testCasesDoc = 'test-cases/tc.md'
  fs.writeFileSync(tcPath, JSON.stringify(stTc, null, 2))
  fs.writeFileSync(path.join(tmp, '.codebuddy', 'plans', 'tc-task-review-static.md'), 'x')
  fs.writeFileSync(path.join(tmp, '.codebuddy', 'plans', 'tc-task-review-prd.md'), 'x')

  r = run('validate-fw-phase-gate.cjs', ['tc-task', '8'], tmp)
  check('已登记用例文档但未置位 → 阻断进入 ⑩', r.code === 1 && /testCasesConfirmed/.test(r.stdout), 'code=' + r.code)

  r = run('set-fw-gate.cjs', ['tc-task', 'testCasesConfirmed'], tmp)
  check('testCasesConfirmed 缺 --test-cases 被拒绝', r.code === 1 && /--test-cases/.test(r.stderr), 'code=' + r.code)

  r = run('set-fw-gate.cjs', ['tc-task', 'testCasesConfirmed', '--test-cases', 'test-cases/tc.md'], tmp)
  check('置位并登记用例文档', r.code === 0 && readJson(tmp, '.codebuddy/plans/tc-task-fw-state.json')?.testCasesDoc === 'test-cases/tc.md', r.stderr.trim())

  r = run('validate-fw-phase-gate.cjs', ['tc-task', '8'], tmp)
  check('置位后 validate 8 通过', r.code === 0, r.stdout.slice(0, 300))

  r = run('set-fw-gate.cjs', ['tc-task', 'staticConfirmed', '--test-cases', 'x.md'], tmp)
  check('--test-cases 错配 gateKey 被拒绝', r.code === 1 && /仅可用于 testCasesConfirmed/.test(r.stderr), 'code=' + r.code)

  // ─── 进程登记与回收（P1-4）────────────────────────────────────
  console.log('\n[进程登记与回收 proc-task]')
  const idle = spawnIdle()
  r = run('fw-process.cjs', ['register', 'proc-task', '--port', '45997', '--pid', String(idle.pid), '--cmd', 'node mock-dev-server'], tmp)
  check('fw-process register 登记成功', r.code === 0 && /running/.test(r.stdout), r.stderr.trim())

  r = run('fw-process.cjs', ['check', 'proc-task'], tmp)
  check('check 检出存活进程并阻断', r.code === 1 && /PID/.test(r.stdout), 'code=' + r.code)

  r = run('fw-process.cjs', ['cleanup', 'proc-task'], tmp)
  check('cleanup 回收进程', r.code === 0 && /released/.test(r.stdout), r.stderr.trim())
  check('回收后子进程已退出', !isAlivePid(idle.pid))

  r = run('fw-process.cjs', ['check', 'proc-task'], tmp)
  check('回收后 check 通过', r.code === 0, (r.stdout || r.stderr).slice(0, 160))

  // ─── 收尾前置进程校验（finish 阻断）───────────────────────────
  console.log('\n[收尾前置进程校验 finish-task]')
  r = run('create-fw-workflow.cjs', ['finish-task', '--start', '0'], tmp)
  check('finish-task 初始化', r.code === 0, r.stderr.trim())

  const idle2 = spawnIdle()
  run('fw-process.cjs', ['register', 'finish-task', '--port', '45996', '--pid', String(idle2.pid), '--cmd', 'node dev-server'], tmp)

  r = run('finish-fw-workflow.cjs', ['finish-task'], tmp)
  check('存在残留进程时 finish 被阻断', r.code === 1 && /未回收/.test(r.stderr + r.stdout), 'code=' + r.code)

  run('fw-process.cjs', ['cleanup', 'finish-task'], tmp)
  r = run('finish-fw-workflow.cjs', ['finish-task'], tmp)
  check('回收后 finish 正常完成', r.code === 0, (r.stderr || r.stdout).slice(0, 200))

  // ─── create 参数校验 ──────────────────────────────────────────
  console.log('\n[参数校验]')
  r = run('create-fw-workflow.cjs', ['bad-doc', '--start', '0', '--biz-doc', 'bogus'], tmp)
  check('--biz-doc 枚举校验（bogus 被拒绝）', r.code === 1 && /无效/.test(r.stderr), 'code=' + r.code)

  r = run('create-fw-workflow.cjs', ['bad-doc2', '--start', '3', '--biz-doc', 'skip', '--biz-doc-path', 'x.md'], tmp)
  check('--biz-doc-path 与 skip 冲突被拒绝', r.code === 1 && /冲突/.test(r.stderr), 'code=' + r.code)
} finally {
  for (const child of spawnedChildren) {
    try { child.kill('SIGKILL') } catch (e) { /* 已退出 */ }
  }
  if (!KEEP) {
    fs.rmSync(tmp, { recursive: true, force: true })
    console.log('\n已清理临时目录: ' + tmp)
  } else {
    console.log('\n保留临时目录: ' + tmp)
  }
}

console.log(`\n════ 结果: ${passed} 通过 / ${failed} 失败 ════`)
if (failures.length > 0) {
  console.log('失败项:\n  - ' + failures.join('\n  - '))
  process.exit(1)
}
process.exit(0)
