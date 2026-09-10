#!/usr/bin/env node
/**
 * sync-fw-openspec.cjs
 * frontend-workflow 3.7 活文档「可选 OpenSpec 关联模式」辅助脚本。
 *
 * 设计原则（见 references/fw-dev-spec.md 第九章）：
 *  - 仅依赖 Node 内置模块（fs / path / crypto / child_process），无第三方依赖。
 *  - 不做 OpenSpec 写作逻辑（Requirement/Scenario 的语义转换由 Agent 按 prototype-to-openspec-prd.md 第四章完成）。
 *  - 脚本只负责：环境校验、脚手架创建、双向锚点注入、同步指纹（模块②③④⑤ 哈希）管理与一致性校验。
 *  - 单向同步：活文档为唯一真相源；脚本绝不反向改写活文档。
 *  - 不静默创建 openspec/：环境缺失时引导用户确认 `openspec init`。
 *
 * 子命令：
 *   init  <live-doc> [--openspec <path>] [--capability <name>] [--change-id <id>]
 *   sync  <live-doc> [--done]
 *   check <live-doc>
 *   help
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// ---------------------------------------------------------------------------
// 通用工具
// ---------------------------------------------------------------------------

function readFileSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (e) {
    return null;
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function kebab(str) {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-\u4e00-\u9fa5]/g, '') // 保留中文，去掉其他标点
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function sha256(text) {
  return crypto.createHash('sha256').update(text || '', 'utf8').digest('hex').slice(0, 16);
}

function relPath(fromDir, toFile) {
  let r = path.relative(fromDir, toFile).split(path.sep).join('/');
  if (!r.startsWith('.')) r = './' + r;
  return r;
}

function errExit(msg, code = 1) {
  console.error('❌ ' + msg);
  process.exit(code);
}

// 提取活文档模块②③④⑤ 文本（从「模块 ②」到文末）。
function extractSyncModules(content) {
  const idx = content.indexOf('### 模块 ②');
  if (idx === -1) {
    // 退化：取「模块 ①」之后的全部内容（含 ②③④⑤）
    const idx1 = content.indexOf('### 模块 ①');
    return idx1 === -1 ? content : content.slice(idx1);
  }
  return content.slice(idx);
}

function computeFingerprint(content) {
  return sha256(extractSyncModules(content).replace(/\s+/g, ' ').trim());
}

// ---------------------------------------------------------------------------
// 同步配置块（<!-- openspec-sync --> ... <!-- /openspec-sync -->）读写
// ---------------------------------------------------------------------------

const BLOCK_RE = /<!--\s*openspec-sync\s*-->([\s\S]*?)<!--\s*\/openspec-sync\s*-->/;

// 去除 fenced 代码块（```...```），避免误把「文档中的示例块」识别为真实同步配置块。
function stripFences(content) {
  return content.replace(/```[\s\S]*?```/g, '');
}

function parseSyncBlock(content) {
  const m = stripFences(content).match(BLOCK_RE);
  if (!m) return null;
  const body = m[1];
  const pick = (key) => {
    const r = new RegExp('^\\s*' + key + ':\\s*(.+)$', 'm').exec(body);
    return r ? r[1].trim() : null;
  };
  const enabled = pick('enabled');
  return {
    enabled: enabled === 'true' || enabled === '1',
    openspecPath: pick('openspecPath'),
    capability: pick('capability'),
    changeId: pick('changeId'),
    lastSyncFingerprint: pick('lastSyncFingerprint'),
  };
}

function renderBlock(cfg) {
  return [
    '<!-- openspec-sync -->',
    'openspecSync:',
    '  enabled: ' + (cfg.enabled ? 'true' : 'false'),
    '  openspecPath: ' + (cfg.openspecPath || '../../../openspec'),
    '  capability: ' + (cfg.capability || ''),
    '  changeId: ' + (cfg.changeId || ''),
    '  lastSyncFingerprint: ' + (cfg.lastSyncFingerprint || ''),
    '<!-- /openspec-sync -->',
    '',
  ].join('\n');
}

// 在活文档中写入/更新配置块：优先放在「模块 ①」与「模块 ②」之间（即模块①末尾）。
function upsertSyncBlock(content, cfg) {
  const block = renderBlock(cfg);
  const existing = content.match(BLOCK_RE);
  if (existing) {
    return content.replace(BLOCK_RE, block.trim());
  }
  const m2 = content.indexOf('### 模块 ②');
  if (m2 !== -1) {
    return content.slice(0, m2) + block + '\n' + content.slice(m2);
  }
  return content + '\n' + block;
}

// ---------------------------------------------------------------------------
// 环境 / 路径解析
// ---------------------------------------------------------------------------

function openspecInstalled() {
  try {
    execSync('npx --no-install openspec --version', { stdio: 'pipe' });
    return true;
  } catch (e) {
    try {
      execSync('openspec --version', { stdio: 'pipe' });
      return true;
    } catch (e2) {
      return false;
    }
  }
}

function resolveConfig(argv, liveDocPath) {
  // 活文档位于 fw_dev_spec/<需求名-日期>/specs/ 下时，到项目根 openspec/ 需要向上 3 级
  let openspecPath = '../../../openspec';
  let capability = argv['--capability'];
  let changeId = argv['--change-id'];

  const content = readFileSafe(liveDocPath);
  if (content == null) errExit('找不到活文档：' + liveDocPath);

  let cfg = parseSyncBlock(content);

  // 从活文档标题推导默认 capability（若未显式给出）
  if (!capability) {
    const title = (content.match(/^#\s+(.+)$/m) || [])[1] || '';
    let base = title.replace(/开发计划.*$/, '').replace(/活文档.*$/, '').trim();
    base = base || path.basename(path.dirname(path.dirname(liveDocPath)));
    capability = kebab(base) || 'fw-dev-spec';
  }
  if (!changeId) changeId = 'init-from-fw-dev-spec';

  if (!cfg) {
    cfg = { enabled: false, openspecPath, capability, changeId, lastSyncFingerprint: '' };
  } else {
    // 已存在块时以块内值为准（除非显式覆盖）
    if (!argv['--capability'] && cfg.capability) capability = cfg.capability;
    if (!argv['--change-id'] && cfg.changeId) changeId = cfg.changeId;
    if (!argv['--openspec'] && cfg.openspecPath) openspecPath = cfg.openspecPath;
    cfg.capability = capability;
    cfg.changeId = changeId;
    cfg.openspecPath = openspecPath;
  }
  return { cfg, content };
}

function resolveOpenSpecDir(liveDocPath, cfg, argv) {
  let dir
  if (argv['--openspec']) {
    dir = path.resolve(process.cwd(), argv['--openspec'])
  } else {
    // 默认 '../../../openspec'：相对活文档所在 specs/ 目录向上 3 级到项目根
    dir = path.resolve(path.dirname(liveDocPath), cfg.openspecPath || '../../../openspec')
  }
  if (path.basename(dir) !== 'openspec') {
    console.error('⚠️ 警告：解析到的 openspec 目录为 ' + dir + '（目录名不是 openspec/）。')
    console.error('   请检查 openspecPath 相对层级：活文档位于 fw_dev_spec/<需求名-日期>/specs/ 时通常应为 ../../../openspec。')
  }
  return dir
}

// ---------------------------------------------------------------------------
// 子命令：init
// ---------------------------------------------------------------------------

function cmdInit(argv) {
  const liveDocPath = argv._[1];
  if (!liveDocPath) errExit('用法：sync-fw-openspec.cjs init <live-doc> [--openspec <path>] [--capability <name>] [--change-id <id>]');

  const { cfg, content } = resolveConfig(argv, liveDocPath);
  const openspecDir = resolveOpenSpecDir(liveDocPath, cfg, argv);
  const specFile = path.join(openspecDir, 'specs', cfg.capability, 'spec.md');
  const changesDir = path.join(openspecDir, 'changes', cfg.changeId);

  // 1) 环境校验
  if (!openspecInstalled()) {
    errExit(
      '未检测到 openspec CLI。请确认已安装 @fission-ai/openspec（参考 references/prototype-to-openspec-prd.md §3.2），' +
      '并在项目根执行 `openspec init` 后再运行本命令。\n（本脚本不会自动执行安装。）'
    );
  }
  if (!fs.existsSync(openspecDir)) {
    errExit('项目根未找到 openspec/ 目录。请先在该目录执行 `openspec init` 初始化仓库后再运行本命令。\n（本脚本不会静默创建 openspec/。）');
  }

  // 2) 脚手架：capability 规范 + change 提案骨架
  ensureDir(path.dirname(specFile));
  ensureDir(changesDir);

  const backRef = '> 来源：' + relPath(path.dirname(specFile), liveDocPath) +
    '（由 frontend-workflow 3.7 活文档单向同步生成；变更以 delta 回写，不反向改写活文档）';

  if (!fs.existsSync(specFile)) {
    fs.writeFileSync(
      specFile,
      '# ' + cfg.capability + ' Specification\n\n' + backRef + '\n\n<!-- 待首次 sync：依据活文档模块②生成 Requirement/Scenario（见 prototype-to-openspec-prd.md 第四章） -->\n'
    );
  } else {
    // 已存在则确保有来源回指锚点
    const s = readFileSafe(specFile);
    if (s && !s.includes('> 来源：')) {
      fs.writeFileSync(specFile, backRef + '\n\n' + s);
    }
  }

  const proposalFile = path.join(changesDir, 'proposal.md');
  const designFile = path.join(changesDir, 'design.md');
  const tasksFile = path.join(changesDir, 'tasks.md');
  if (!fs.existsSync(proposalFile)) {
    fs.writeFileSync(
      proposalFile,
      '# Change: ' + cfg.changeId + '\n\n' + backRef + '\n\n## Why\n\n由开发计划活文档初始化 OpenSpec 关联镜像（单向同步）。\n\n## What Changes\n\n- 依据活文档模块②生成 capability 规范\n- 后续活文档模块②③④⑤变更以 delta 同步到此 change\n'
    );
  }
  if (!fs.existsSync(designFile)) fs.writeFileSync(designFile, '# Design: ' + cfg.changeId + '\n\n<!-- 依据活文档模块③开发计划补充设计决策 -->\n');
  if (!fs.existsSync(tasksFile)) fs.writeFileSync(tasksFile, '# Tasks: ' + cfg.changeId + '\n\n- [ ] 将活文档模块②转为 Requirement / Scenario\n');

  // 3) 注入活文档侧双向锚点 + 指纹
  cfg.enabled = true;
  cfg.lastSyncFingerprint = computeFingerprint(content);
  const newContent = upsertSyncBlock(content, cfg);
  fs.writeFileSync(liveDocPath, newContent);

  console.log('✅ 已初始化 OpenSpec 关联：');
  console.log('   活文档      ：' + liveDocPath);
  console.log('   capability  ：' + cfg.capability);
  console.log('   change-id   ：' + cfg.changeId);
  console.log('   openspec/   ：' + openspecDir);
  console.log('   规范文件    ：' + specFile);
  console.log('   变更提案    ：' + changesDir);
  console.log('   同步指纹    ：' + cfg.lastSyncFingerprint);
  console.log('\n下一步：Agent 依据活文档模块②生成 Requirement/Scenario 写入 ' + specFile +
    '，然后运行 `sync --done` 刷新指纹。');
}

// ---------------------------------------------------------------------------
// 子命令：sync
// ---------------------------------------------------------------------------

function cmdSync(argv) {
  const liveDocPath = argv._[1];
  if (!liveDocPath) errExit('用法：sync-fw-openspec.cjs sync <live-doc> [--done]');

  const content = readFileSafe(liveDocPath);
  if (content == null) errExit('找不到活文档：' + liveDocPath);

  const cfg = parseSyncBlock(content);
  if (!cfg || !cfg.enabled) {
    errExit('此活文档未启用 OpenSpec 关联模式（无启用中的 <!-- openspec-sync --> 配置块）。如需开启，请运行 `init`。');
  }

  const openspecDir = resolveOpenSpecDir(liveDocPath, cfg, argv);
  const specFile = path.join(openspecDir, 'specs', cfg.capability, 'spec.md');
  const changesDir = path.join(openspecDir, 'changes', cfg.changeId);

  if (!fs.existsSync(openspecDir)) errExit('openspec/ 目录不存在：' + openspecDir + '（请先 `openspec init`）');
  if (!fs.existsSync(specFile)) errExit('capability 规范不存在：' + specFile + '（请先运行 `init`）');

  const currentFp = computeFingerprint(content);
  if (currentFp === cfg.lastSyncFingerprint) {
    console.log('✅ 已同步：活文档模块②③④⑤ 指纹一致，无需回写。');
    process.exit(0);
  }

  // 有变更：报告待回写项并给出目标路径
  console.log('⚠️ 检测到活文档模块②③④⑤ 变更，待回写 OpenSpec：');
  console.log('   规范目标    ：' + specFile + '（模块② → Requirement/Scenario，delta 增量）');
  console.log('   提案目录    ：' + changesDir + '（模块③④⑤ → design.md / tasks.md）');
  console.log('   旧指纹      ：' + cfg.lastSyncFingerprint);
  console.log('   新指纹      ：' + currentFp);
  console.log('\n请 Agent 依据 references/prototype-to-openspec-prd.md 第四章，以 `+`/`-` delta 将上述变更写入 OpenSpec，');
  console.log('完成后运行 `node scripts/sync-fw-openspec.cjs sync ' + liveDocPath + ' --done` 刷新指纹。');

  if (argv['--done']) {
    cfg.lastSyncFingerprint = currentFp;
    fs.writeFileSync(liveDocPath, upsertSyncBlock(content, cfg));
    console.log('\n✅ 已刷新同步指纹：' + currentFp + '（假定 OpenSpec 已回写完成）。');
  }
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 子命令：check
// ---------------------------------------------------------------------------

function cmdCheck(argv) {
  const liveDocPath = argv._[1];
  if (!liveDocPath) errExit('用法：sync-fw-openspec.cjs check <live-doc>');

  const content = readFileSafe(liveDocPath);
  if (content == null) errExit('找不到活文档：' + liveDocPath);

  const cfg = parseSyncBlock(content);
  if (!cfg || !cfg.enabled) {
    console.log('ℹ️ 未启用关联模式：此活文档不与 OpenSpec 关联（默认二选一）。');
    process.exit(0);
  }

  const openspecDir = resolveOpenSpecDir(liveDocPath, cfg, argv);
  const specFile = path.join(openspecDir, 'specs', cfg.capability, 'spec.md');
  const backRef = '> 来源：' + relPath(path.dirname(specFile), liveDocPath);

  const results = [];
  const pass = (k, v) => results.push((v ? '✅' : '❌') + ' ' + k);
  const warn = (k, v) => results.push((v ? '✅' : '⚠️') + ' ' + k);

  // 先查目录（目录缺失时不必探测 CLI，避免无谓的 npx 开销）
  const openspecDirExists = fs.existsSync(openspecDir)
  pass('openspec/ 目录存在', openspecDirExists);
  pass('openspec CLI 已安装', openspecDirExists ? openspecInstalled() : false);
  pass('capability 规范存在 (' + cfg.capability + ')', fs.existsSync(specFile));
  if (fs.existsSync(specFile)) {
    const s = readFileSafe(specFile) || '';
    pass('OpenSpec 侧来源回指锚点完整', s.includes('> 来源：'));
    pass('回指指向本活文档', s.includes(relPath(path.dirname(specFile), liveDocPath)));
  }
  warn('活文档侧关联字段/配置块存在', !!cfg.capability && !!cfg.changeId);

  const currentFp = computeFingerprint(content);
  pass('同步指纹最新（与模块②③④⑤ 一致）', currentFp === cfg.lastSyncFingerprint);
  if (currentFp !== cfg.lastSyncFingerprint) {
    results.push('   ↳ 待回写：旧 ' + cfg.lastSyncFingerprint + ' / 新 ' + currentFp + '（运行 sync）');
  }

  console.log('🔍 OpenSpec 关联校验：' + liveDocPath);
  results.forEach((r) => console.log('   ' + r));

  const failed = results.some((r) => r.startsWith('❌'));
  process.exit(failed ? 1 : 0);
}

// ---------------------------------------------------------------------------
// 参数解析 / 入口
// ---------------------------------------------------------------------------

function parseArgs(args) {
  const out = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a;
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

function printHelp() {
  console.log(`sync-fw-openspec.cjs —— frontend-workflow 3.7 活文档 OpenSpec 关联辅助

用法：
  node scripts/sync-fw-openspec.cjs init  <live-doc> [--openspec <path>] [--capability <name>] [--change-id <id>]
  node scripts/sync-fw-openspec.cjs sync  <live-doc> [--done]
  node scripts/sync-fw-openspec.cjs check <live-doc>

说明：
  init  检测 openspec 环境 → 脚手架 changes/specs → 注入双向锚点 → 写入同步指纹（不静默创建 openspec/）。
  sync  依据活文档配置块刷新 openspec delta；有变更时列出待回写项，--done 在 Agent 回写后刷新指纹。
  check 校验 openspec 环境、双向锚点完整性与同步指纹一致性。

注意：语义转换（活文档→OpenSpec spec.md 的 Requirement/Scenario）由 Agent 完成，脚本仅做脚手架与指纹/锚点管理。
`);
}

function main() {
  const argv = parseArgs(process.argv.slice(2));
  const cmd = argv._[0];
  switch (cmd) {
    case 'init': return cmdInit(argv);
    case 'sync': return cmdSync(argv);
    case 'check': return cmdCheck(argv);
    case 'help':
    case undefined: return printHelp();
    default:
      console.error('未知子命令：' + cmd + '\n');
      printHelp();
      process.exit(1);
  }
}

main();
