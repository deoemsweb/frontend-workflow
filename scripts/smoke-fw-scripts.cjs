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
const { spawnSync } = require('child_process')

const HERE = __dirname
const S = (name) => path.join(HERE, name)
const KEEP = process.argv.includes('--keep-temp')

let passed = 0
let failed = 0
const failures = []

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

  fs.mkdirSync(path.join(tmp, 'openspec'), { recursive: true })
  r = run('advance-fw-phase.cjs', ['demo-task', '4'], tmp)
  check('advance 3→4（业务文档目录存在）', r.code === 0, r.stderr.trim())

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

  // ─── create 参数校验 ──────────────────────────────────────────
  console.log('\n[参数校验]')
  r = run('create-fw-workflow.cjs', ['bad-doc', '--start', '0', '--biz-doc', 'bogus'], tmp)
  check('--biz-doc 枚举校验（bogus 被拒绝）', r.code === 1 && /无效/.test(r.stderr), 'code=' + r.code)
} finally {
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
