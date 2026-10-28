# Changelog

本文件记录 `frontend-workflow` skill 的版本变更历史，按时间倒序排列。

**维护约定**：
- 版本号唯一来源为 `SKILL.md` 的 YAML frontmatter `version` 字段（语义化版本 `MAJOR.MINOR.PATCH`）。
- 每次改动后：在 `SKILL.md` 递增 `version`，并在本文件顶部新增对应 `[x.y.z] - YYYY-MM-DD` 条目。
- `README.md` 顶部的版本号展示需与 `SKILL.md` 保持同步（仅展示，不另立来源）。
- **版本级摘要（目标 / 变更点 / 影响文件 / 验证 / 升级动作）记录在 `VERSION.md`**，本文件只记技术流水，两者同一版本互相指向。
- 变更类型：新增（Added）/ 修改（Changed）/ 修复（Fixed）。

## [1.4.0] - 2026-10-28

### Added
- **状态模型扩展（向后兼容）**：状态文件新增 `bizDocPath`（本次业务文档）、`testCasesDoc`（本次用例文档）、`allowEmptyPhases`（`--allow-empty` 留痕）、`gateChecks.testCasesConfirmed`。
- **phase 3 业务文档精确校验**：`PHASE_ARTIFACTS[3]` 改为 `bizdoc`——优先校验 `state.bizDocPath`（文件非空 / 目录含 `proposal.md`/`tasks.md`/`design.md`/`specs/` 或 Markdown）；未登记时回退「`openspec/changes` 与 `fw_dev_spec/*/specs` + 最近 120 分钟 Markdown」，命中给 warning 提示补登记。
- **phase 0/7 代码阶段弱校验**：`PHASE_ARTIFACTS[0]/[7]` 改为 `workspace`——`git status --porcelain --untracked-files=all` 过滤代码扩展名（排除文档/依赖/构建产物，未跟踪目录展开到文件）；无变更阻断并提示 `--allow-empty`；非 git 仓库降级 warning；git 状态按进程缓存，8s 超时。
- **`--allow-empty` 透传与留痕**：`validate-fw-phase-gate.cjs` 与 `advance-fw-phase.cjs` 支持该参数；advance 成功后写入 `allowEmptyPhases[phase] = { at, reason }`。
- **用例审阅内嵌 Gate**：`set-fw-gate.cjs` 扩展 `testCasesConfirmed`（无对应 phase，输出「内嵌 Gate（不占 phase）」）；置位必须带 `--test-cases <路径>` 并写入 `testCasesDoc`；`validate` 在 `target ≥ 8` 且 `testCasesDoc` 非空时强校验，未置位阻断。
- **`--biz-doc` 路径登记**：`set-fw-gate.cjs` 支持 `docConfirmed --biz-doc <路径>` 写入 `bizDocPath`；与 gateKey 错配时脚本报错。
- **`create-fw-workflow.cjs --biz-doc-path`**：创建时预置业务文档路径；与 `--biz-doc skip` 冲突时报错。
- **新增 `VERSION.md`**：面向使用者的版本更新记录（1.0.0~1.4.0：目标 / 变更点 / 影响文件 / 验证 / 升级动作 / 兼容性），与 CHANGELOG 互相指向。
- `smoke-fw-scripts.cjs` 新增 19 项断言（42 → 61）：bizdoc 精确/阻断/回退、`--biz-doc` 写入、workspace 阻断/`--allow-empty`/留痕/仅文档变更、用例门控阻断/参数校验/放行、`--biz-doc-path` 冲突。

### Changed
- **`SKILL.md` 结构收敛**：`description` 由 500+ 字收敛到约 200 字（长尾触发词保留在「一、何时使用」）；1.1 / 3.8 / 3.9 的模板与脚本枚举改为「以 `README.md` / 模板 README 为唯一来源 + 指针」；「3.5 测试」从 2.2b 独立分支移出，单列 **2.2d 可选插槽（⑨→⑩）**；2.2c 补 `--biz-doc-path`、`--allow-empty`、内嵌 Gate 置位；2.5 新增「阶段产物校验口径」。
- **`README.md`** 作为模板/脚本清单唯一来源：补 `VERSION.md`、`--biz-doc-path` / `--allow-empty` / `set-fw-gate` 参数、smoke 61 项；流程图补 ⑨→⑩ 的 3.5 插槽；协作约定补内嵌 Gate 与 `--allow-empty` 口径。
- `references/testing.md` 2.4：删除「不调用 set-fw-gate.cjs」旧口径，改为 Gate 通过后置位并登记用例文档；QA Checklist 增门控项。
- `references/multi-agent-orchestration.md`：§三 注改为「phase 0/7 弱校验 + phase 3 精确校验 + 内嵌 Gate」；§9.4 补内嵌 Gate 与路径登记命令；§9.7 补 `--allow-empty`；§十一 3.5 与 §十二 第 2 条同步；smoke 断言数 42 → 61。
- `.agents/test-engineer.md`（段二置位 + Checkpoint + 交付物）、`.agents/workflow-orchestrator.md`（Gate 置位 / `--allow-empty` 口径 / Checkpoint 8-9）。
- 模板 07（单 / 多 Agent）：用例审阅 Gate 通过后补置位命令；修正「敏感操作 · 四」为「二」。
- `frontend-workflow-usage.md`：5.5 补门控置位与检查清单；新增 5.10「v1.4.0 升级提示」；目录树补 `VERSION.md` / `CHANGELOG.md`。

### Fixed
- 修复 phase 3 仅校验父目录存在（空目录也通过）导致的「业务文档未产出却放行」。
- 修复 phase 0/7 完全无产物校验导致的「代码未写也能推进」。
- 修复用例审阅 Gate 不进状态文件、无法追溯「用例已审阅 / 用例文档在哪」。
- 修复 `git status --porcelain` 未跟踪目录只显示 `?? src/` 导致代码变更无法识别（改用 `-uall` + 目录展开兜底）。

## [1.3.1] - 2026-10-28

### Added
- **本地进程生命周期治理（横切硬约束）**：新增 `references/cross-cutting.md` 第五章「进程生命周期与资源回收」——四步契约（`register` → 启动并确认监听 → 执行 → `cleanup` + `check`）、禁止裸后台启动、五个强制回收点（用例结束 / 阶段收尾 / Gate 前 / `finish` / 会话结束）、异常降级口径。
- **新增 `scripts/fw-process.cjs`**：本地长驻进程登记与回收（`register` / `list` / `check` / `cleanup`，支持 `--port` / `--all-tasks` / `--dry-run`）。登记文件 `.codebuddy/plans/<任务名>-fw-processes.json`；按 PID 树回收（Windows `taskkill /T /F`、POSIX 先子后父），**PID 已退出但端口仍占用时按端口兜底回收**（Windows 下 shell 被杀、node 子进程残留的典型泄漏）；`check` 同时校验 PID 存活与端口占用。
- `references/testing.md` 新增 5.5「进程回收与残留校验」；QA Checklist 与边界情况表补充回收项。
- `references/frontend-engineering-standards.md` 新增第八章「本地服务的进程生命周期（调试与自测）」。
- `references/multi-agent-orchestration.md` 新增 §9.8 收尾与资源回收、dispatch 模板「进程与资源约束」块、§五 进程登记文件命名、§十二 不变量第 5 条。
- `references/tapd-bugfix-workflow.md` 4.5 与阶段五补充进程回收前置。
- 提示词模板 07/08/09（单 Agent + 多 Agent）补充进程登记/回收要求。

### Changed
- **`scripts/testing/with_server.py` 重写生命周期**：启动前端口预检（占用则退出码 2，避免连到上次残留进程产生假绿）；Windows 用 `taskkill /T /F`、POSIX 用 `killpg` 回收整棵进程树；服务输出改重定向到日志文件（消除 `stdout=PIPE` 缓冲死锁）；`finally` 保证成功/失败/异常/Ctrl+C 均回收；回收后逐个校验端口释放，仍占用时退出码 3；新增 `--grace` / `--log-dir` / `--keep`。
- **`scripts/finish-fw-workflow.cjs` 收尾门控**：默认先执行 `fw-process check`，存在未回收进程即阻断收尾；显式 `--allow-residual-processes` 才放行。
- `SKILL.md`：version 1.3.0 → 1.3.1；2.2c 新增「收尾与进程回收」、2.3 新增收尾检查、2.5 补齐进程约束；顺带修正单 Agent 模板数量漂移（01~10 → 01~11 共 11 个）。
- `.agents/` 8 个角色 `skillVersion` → 1.3.1；`test-engineer` / `workflow-orchestrator` / `qa-reviewer` / `tapd-bugfixer` / `frontend-implementer` 补充进程回收职责与 Checkpoint。
- `frontend-workflow-usage.md` 新增 5.9 本地进程登记与回收；测试映射表与生成后检查清单同步；`README.md` 同步版本、脚本清单与能力索引。

### Fixed
- 修复本地自测进程（dev server / preview / mock server）启动后未被回收导致端口与 CPU 长期占用的问题；`smoke-fw-scripts.cjs` 新增进程登记/回收/`finish` 阻断 8 项断言（34 → 42 项，全通过）。

## [1.3.0] - 2026-09-10

### Added
- **测试能力（3.5）正式定稿**：`references/testing.md` 从占位骨架重写为正式规则——测试策略与四类测试规范（单元 / 组件 / E2E / 视觉回归）、**测试用例生成两段式**（业务文档 → Markdown 用例文档 → 内嵌人工 Gate 审阅 → 可执行代码）、QA Checklist 与边界情况处理。
- **Playwright 执行层整合**（复制自 webapp-testing skill，保持「一次安装」自包含）：新增 `scripts/testing/with_server.py`（服务器生命周期编排，多 server 支持）与 `scripts/testing/examples/`（元素发现 / 静态页自动化 / console 捕获）；testing.md 第五章固化决策树、侦察后行动模式（先 `networkidle` 再探查 DOM）与脚本黑盒原则。
- **完成前验证铁律**（整合自 verification-before-completion skill）：`references/cross-cutting.md` 新增第三章「完成前验证铁律」——Iron Law / 5 步 Gate 函数 / 断言-证据对照表 / Red Flags 拦截；test-engineer、qa-reviewer、tapd-bugfixer、workflow-orchestrator 四角色共享引用（只读白名单章节顺延为第四章，相关引用已同步）。
- **test-engineer 角色转正**：`.agents/test-engineer.md` 从占位角色重写为正式角色（两段式流程 + 强制 Checkpoint）；`qa-reviewer` / `tapd-bugfixer` / `workflow-orchestrator` 增量补铁律引用与证据核验职责。
- 新增提示词模板：`单Agent模式/07-测试与用例生成.md` 与 `多Agent模式/07-测试与用例生成-多Agent.md`（替代原 07 占位模板），模板 README 索引同步。
- `frontend-workflow-usage.md` 新增 5.5 测试分支：Vue2.6 项目测试栈映射（Jest + @vue/test-utils v1）与生成后检查清单。
- README 前置依赖表新增 3.5 分支依赖（Python 3 + playwright）。
- **全局追问协议 grilling（3.10）**（整合自 grill-me/grilling skill 方法论）：新增 `references/grilling.md`——设计树 / Frontier 轮次机制 / 轮次格式规范（❓逐题编号 + ➡️每题推荐答案）/ 收敛护栏（每轮 ≤4 问、同一决策点最多追问 2 轮、超限降级「剩余假设清单」一次确认）/ 职责分离（事实 agent 自查、决策用户拍板）/ 九处工作流接入点清单（2.1 意图解读、2.3 人工 Gate、各内嵌 Gate、角色不确定上报、边界不确定处理）。
- 新增提示词模板 `单Agent模式/11-需求拷问澄清.md`（**开工前置**，可先于 01 使用；澄清产出共识清单后接对应 01~10 模板执行），模板 README 索引与占位符表同步（新增 `{{task_desc}}`）。

### Changed
- `SKILL.md`：version 1.2.0 → 1.3.0；description 去「测试能力（待扩展）」补「生成测试用例 / 自动化测试」触发词；一、2.2b、3.5 索引改为正式规则描述。
- `references/multi-agent-orchestration.md`：角色表 test-engineer 行与 §十一 3.5 段落去占位表述，明确两段式 + 内嵌用例审阅 Gate（不占状态机 phase，状态机脚本不变）。
- **grilling 全局接入**（version 保持 1.3.0，按用户指定并入本条目）：`SKILL.md` 2.1 意图解读升级为 Frontier 轮次协议引用、2.3 人工 Gate 格式新增「建议 ➡️」字段、章节索引新增 3.10、description 补「需求拷问/追问澄清/grill」触发词；`multi-agent-orchestration.md` §八 dispatch 约束块与 §9.5 待确认项 schema 扩展为 `{id, question, options, recommendation, resolved, source}`；`.agents/workflow-orchestrator.md`（意图解读 + 待确认项管理）与 `.agents/tapd-bugfixer.md`（Gate 话术）接入协议；`references/testing.md` 2.4 与 `references/fw-dev-spec.md` 第八章 Gate 提问统一引用协议格式；`frontend-workflow-usage.md` 能力表新增 3.10 行并新增 5.8 使用要点。
- 测试定位保持「主流程可选环节（⑨→⑩ 之间，test-engineer 执行）」，状态机 phase 表与 smoke 脚本未改动（grilling 属编排层行为，不新增 phase）。

---

## [1.2.0] - 2026-08-15

### Fixed
- **P0** 修复 `sync-fw-openspec.cjs` `check` 子命令调用未定义 `readFileSync` 导致的崩溃（改用 `readFileSafe`）。
- **P0** 修复「OpenSpec 关联模式」默认 `openspecPath` 相对路径少一级（`../../openspec` → `../../../openspec`），`fw-dev-spec.md` 9.4 示例与脚本默认值同步，并新增解析路径警示。
- **P1** 人工 Gate 状态机强制化：新增 `scripts/set-fw-gate.cjs` 显式置位；`validate-fw-phase-gate.cjs` 强校验「离开 Gate 前 gateChecks=true」；`advance-fw-phase.cjs` 不再自动置位。
- **P1** 修复 `--biz-doc skip` 流程死锁：`validate` 感知 `bizDocPlan`；新增 `scripts/skip-fw-phase.cjs`（阶段跳过）与 `finish-fw-workflow.cjs`（提前收尾）。
- **P1** 修复多 Agent 模板 01/02/03/06 的 `advance` 目标 phase 号 off-by-one（确认后应推进到**下一** phase），并在编排协议 §9 固化范式。
- **P1** 统一「默认单 agent / 多 agent」口径：仅端到端（08）默认多 agent；09/10 与 TAPD 改回「可选」。
- **P2** 人工 Gate 清单全库统一为 **④⑤a⑦⑦c⑧a⑪⑫**（⑦b「模式确认」标注为内嵌 Gate）；⑤a 归属统一为编排器（prd-analyst 只做 ⑤）。
- **P2** 清理旧目录名 `frontend-workflow-skills`；README 安装章节改为环境无关表述 + 宿主对照表（WorkBuddy/CodeBuddy/DeepSeek Harness）；usage 手册标题与路径修正。
- **P2/P3** 文档一致性批量修复：README 目录树/脚本清单补齐；「12 阶段」改为 11 个内部 phase 表述；references 编号统一 3.x；figma-design-constraint「〇」章前移并补索引；tapd-tool-params 阶段标签、跨天恢复检测、4.1 勾选、`{tapd_base_url}` 取值说明；qa-reviewer 报告落盘职责（编排器落盘）；api-contractor 补「生成后人工验收（⑦c）」步骤；模板 07/09 标题号、01 的 `{{figma_url}}`、占位符写法规范等（完整整改清单见 `dev/frontend-workflow-skill审查报告-2026-08-15.md`）。

### Added
- 新增脚本：`set-fw-gate.cjs`、`skip-fw-phase.cjs`、`finish-fw-workflow.cjs`、`smoke-fw-scripts.cjs`（临时目录全链路回归，34 项断言）。
- 新增 `references/cross-cutting.md`（横切共享块：安全硬约束 + 敏感操作统一清单 + 只读语义白名单），8 个角色文件改为共享引用，消除 7 处拷贝漂移。
- 新增 `技能使用提示词模板/00-模板骨架.md` 与 README 占位符速查总表。
- README 新增「前置依赖清单」（Figma/TAPD MCP、openspec CLI、Node/Python）。
- 状态机脚本增强：项目根 git 兜底探测 + `FW_STATE_DIR` 可配置；rollback 拒绝 skipped 目标并重置回流计数；`--biz-doc` 枚举校验；移除死代码。

### Changed
- `.agents/` 8 个角色文件 frontmatter 增加 `skillVersion` 同步标记；角色覆盖阶段与 spawn 表修正（⑦b⑦c / ⑧a⑧⑨ / 3.5 可选环节）。
- 编排协议 §8.1 只读白名单改为「语义白名单 + 宿主工具名映射表」；§9 补 9.7 阶段跳过与提前完成。
- 提示词模板内的 userlive 项目专属内容改为通用参数化示例，并指向 `frontend-workflow-usage.md`。

### Fixed
- 仅补丁修复：修正文档与措辞细节，无新增能力，向后兼容。

---

## [1.1.0] - 2026-07-27

### Added
- 开发计划活文档（`fw-dev-spec`）新增可选的「OpenSpec 关联模式」：单向同步活文档到 OpenSpec，并建立双向锚点（`fw_dev_spec ↔ OpenSpec change`）。
- 新增同步钩子脚本 `scripts/sync-fw-openspec.cjs`，支持 `init` / `sync` / `check` 子命令。
- `fw-dev-spec.md` 新增第九章「OpenSpec 关联模式」规则与关联文档说明。
- 提示词模板新增 `10-活文档关联OpenSpec.md`（单/多 Agent 模式），覆盖关联模式触发与同步流程。
- `SKILL.md` / `README.md` 路由与索引补充 OpenSpec 关联相关触发词与章节指针。

---

## [1.0.0] - 2026-07-20

初始基线版本，汇总合并后的统一前端开发工作流能力：

### Added
- **Figma 还原约束**（`references/figma-design-constraint.md`）：像素级还原、Design Token、节点映射、a11y、资源导出、QA Checklist。
- **原型（Figma / .md）→ OpenSpec PRD**（`references/prototype-to-openspec-prd.md`）：需求规范生成与拆解策略。
- **前端工程通用规范**（`references/frontend-engineering-standards.md`）：类型安全 / API 集成 / 状态管理 / 安全约束 / 性能优化 / 注释文档 / AI 不确定时处理；第〇章业务文档接入与前置编排。
- **Swagger → 接口定义生成**（`references/api-definition-generation.md`）：Swagger/open.json → 前端接口定义（函数 + 类型 + JSDoc），自动探测项目既有接口模式。
- **测试能力（占位）**（`references/testing.md`）：单元 / 组件 / E2E / 视觉回归骨架，规则待扩展。
- **TAPD 缺陷修复（独立分支）**（`references/tapd-bugfix-workflow.md` 及 `tapd-tool-params.md` / `tapd-grouping-rules.md` / `tapd-plan-template.md`）：提取 workspace_id → 读筛选缺陷 → 生成活文档计划 → 执行修复/发评论 → 验证后更新状态。
- **开发计划活文档（独立分支，3.2 替代）**（`references/fw-dev-spec.md`）：原型 → 本地分层活文档（`fw_dev_spec/<需求名-日期>/`），五模块统一规范、单/多文档询问。
- **多 agent 编排（可选模式）**（`references/multi-agent-orchestration.md` 与 `.agents/` 8 个角色）：编排器按阶段 spawn 专职 agent，状态机门控推进、人工 Gate 统一管理、敏感操作统一询问。
- 多 agent 状态机脚本：`scripts/create-fw-workflow.cjs`、`validate-fw-phase-gate.cjs`、`advance-fw-phase.cjs`、`rollback-fw-phase.cjs`、`workflow-state-utils.cjs`、`extract_workspace_id.py`。
- 用户侧入口：`技能使用提示词模板/`（单/多 Agent 模式模板）与 `frontend-workflow-usage.md` 项目适配手册。
- 单一入口路由层 `SKILL.md`（触发描述 + 意图解读 + 阶段调度 + 章节索引）。
