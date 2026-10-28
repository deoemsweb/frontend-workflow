# 版本更新记录

> 本文件面向**使用者与维护者**，按版本记录：目标、面向使用者的变更点、影响文件、验证证据、升级动作与兼容性。
>
> 与 `CHANGELOG.md` 的分工：**CHANGELOG.md 是技术变更流水**（Added / Changed / Fixed 的逐条实现细节）；**本文件是版本级摘要**（这一版解决什么问题、使用者需要做什么）。两者互相指向，版本号唯一来源仍为 `SKILL.md` 的 `version` 字段。

## 版本索引

| 版本 | 日期 | 类型 | 主题 |
|------|------|------|------|
| [1.4.0](#140---2026-10-28) | 2026-10-28 | minor | 阶段产物精确校验 + 用例审阅可追溯 + 文档单一事实源 + 版本记录 |
| [1.3.1](#131---2026-10-28) | 2026-10-28 | patch | 本地自测进程生命周期治理（端口/资源泄漏） |
| [1.3.0](#130---2026-09-10) | 2026-09-10 | minor | 测试能力定稿 + grilling 全局追问协议 |
| [1.2.0](#120---2026-08-15) | 2026-08-15 | minor | 人工 Gate 状态机强制化 + 一致性整改 |
| [1.1.0](#110---2026-07-27) | 2026-07-27 | minor | 开发计划活文档的 OpenSpec 关联模式 |
| [1.0.0](#100---2026-07-20) | 2026-07-20 | major | 统一前端开发工作流基线 |

---

## 1.4.0 - 2026-10-28

**类型**：minor（新增状态字段与门控校验，行为增强，不破坏既有流程）

**目标**：让阶段门控真正校验「本次需求的产物」，而不是空目录或人工自觉；让用例审阅可追溯；收敛文档重复维护面。

**面向使用者的变更点**

- **phase 3 业务文档精确校验**：状态文件新增 `bizDocPath`。⑤ 完成后用 `--biz-doc-path`（create）或 `set-fw-gate ... docConfirmed --biz-doc <路径>` 登记；未登记时回退「`openspec/changes` / `fw_dev_spec` 目录 + 最近 120 分钟内有 Markdown 修改」，并输出 warning。
- **phase 0/7 代码阶段弱校验**：推进前检查 git 工作区存在代码文件变更（文档 / 依赖 / 构建产物不计，未跟踪目录展开到文件）；无变更时阻断并提示 `--allow-empty`；放行后写入 `allowEmptyPhases` 留痕。非 git 仓库降级为 warning。
- **3.5 用例审阅可追溯**：新增内嵌 Gate `testCasesConfirmed`（不占 phase）。Gate 通过后必须 `set-fw-gate ... testCasesConfirmed --test-cases <路径>`，状态文件记录 `testCasesDoc`；已登记但未置位时进入 ⑩ 被阻断。未执行 3.5 的任务不受影响。
- **说明与结构收敛**：`description` 由 500+ 字收敛到约 200 字（长尾触发词保留在「一、何时使用」）；模板清单 / 脚本清单改由 `README.md` 单一维护，`SKILL.md` 只保留语义描述与指针；「3.5 测试」从「独立分支」移出，单列为 **2.2d 可选插槽（⑨→⑩）**。
- **新增本文件 `VERSION.md`**：逐版本记录更新内容，与 `CHANGELOG.md` 互相指向。

**影响文件**

- 脚本：`scripts/workflow-state-utils.cjs`（`PHASE_ARTIFACTS` 0/3/7 类型与 `bizdoc` / `workspace` 校验）、`create-fw-workflow.cjs`（新字段 + `--biz-doc-path`）、`set-fw-gate.cjs`（`testCasesConfirmed` + `--biz-doc` / `--test-cases`）、`validate-fw-phase-gate.cjs`（`--allow-empty` + 用例门控）、`advance-fw-phase.cjs`（参数透传 + 留痕）、`smoke-fw-scripts.cjs`（61 项断言）。
- 规则：`references/testing.md` 2.4 / QA Checklist、`references/multi-agent-orchestration.md` §三 注 / §9.4 / §9.7 / §十一 3.5 / §十二。
- 角色：`test-engineer`、`workflow-orchestrator`（其余 6 个角色仅同步版本号）。
- 用户侧：`SKILL.md`、`README.md`、`frontend-workflow-usage.md`（新增 5.10 升级提示）、模板 07（单 / 多 Agent）。

**验证证据**

- `node --check` 全部改动脚本通过；`node scripts/smoke-fw-scripts.cjs` → **61 通过 / 0 失败**。
- 冒烟覆盖：bizDocPath 精确命中 / 不存在阻断 / 未登记回退；git 工作区无变更阻断 / `--allow-empty` 放行与留痕 / 有代码变更通过 / 仅文档变更不算产出；用例文档已登记未置位阻断 / 缺 `--test-cases` 拒绝 / 置位后放行 / 参数错配拒绝；旧状态字段缺失兼容。
- 全库 grep 复核：模板数量无残留漂移（历史 CHANGELOG 条目除外）。

**升级动作**

1. 已有状态文件**无需迁移**：新字段缺失时自动降级（回退校验 / 跳过用例门控 / 非 git 告警）。
2. 在 git 仓库中使用时，纯配置或纯文档任务推进 phase 0/7 需追加 `--allow-empty` 并向用户说明。
3. 执行 3.5 的任务，用例审阅 Gate 通过后补一次 `set-fw-gate ... testCasesConfirmed --test-cases <路径>`，否则进入 ⑩ 会被阻断。
4. 建议在 ⑤ 完成后登记 `bizDocPath`，避免回退校验误判。

**兼容性**：向后兼容。不新增 phase、不改变 Gate 语义；新增字段均为可选，旧脚本调用方式仍有效。

---

## 1.3.1 - 2026-10-28

**类型**：patch

**目标**：解决本地自测进程（dev server / preview / mock server）使用后未回收导致的端口与资源占用；消除 Windows 上「只杀 shell、node 子进程残留」的泄漏形态。

**面向使用者的变更点**

- 新增 `scripts/fw-process.cjs`：`register` / `list` / `check` / `cleanup`，按 PID 树回收，PID 已退出但端口仍占用时按端口兜底回收。
- `scripts/testing/with_server.py` 重写：启动前端口预检（占用即退出码 2）、进程树回收、日志重定向、`finally` 必回收、端口释放校验（泄漏退出码 3）。
- `finish-fw-workflow.cjs` 默认执行 `check`，存在残留进程即阻断收尾（`--allow-residual-processes` 才放行）。
- 跨切规则新增第五章「进程生命周期与资源回收」；测试规则新增 5.5；TAPD 验证前、编排收尾均要求回收。

**影响文件**：`scripts/fw-process.cjs`（新增）、`scripts/testing/with_server.py`、`scripts/finish-fw-workflow.cjs`、`references/cross-cutting.md`、`references/testing.md`、`references/multi-agent-orchestration.md`、`references/tapd-bugfix-workflow.md`、`.agents/*`、模板 07/08/09、`README.md`、`frontend-workflow-usage.md`。

**验证证据**：`smoke-fw-scripts.cjs` 34 → 42 项全通过；真实端口验证（启动 → 执行 → 回收 → 端口释放）；模拟「登记 PID 已死但端口仍被占用」场景，cleanup 按端口兜底回收成功。

**升级动作**：无需手动迁移；此后任何本地长驻进程启动前须 `register`，结束 `cleanup` + `check`。

**兼容性**：向后兼容；`finish` 新增默认阻断行为，确需保留进程时显式传参。

---

## 1.3.0 - 2026-09-10

**类型**：minor

**目标**：把 3.5 测试能力从占位骨架定稿为可执行规则，并统一「需求不确定时怎么问」。

**面向使用者的变更点**

- 测试两段式定稿：业务文档 → Markdown 用例文档 → 内嵌人工 Gate → 可执行测试代码；四类测试规范与 QA Checklist。
- 整合 Playwright 执行层（`scripts/testing/`：`with_server.py` + 示例）。
- 完成前验证铁律（`cross-cutting.md` 三）与全局追问协议 grilling（`references/grilling.md`，Frontier 轮次 + 推荐答案 + 收敛护栏）。
- `test-engineer` 转正；新增模板 07（单 / 多 Agent）与模板 11（需求拷问澄清，开工前置）。

**影响文件**：`references/testing.md`、`references/grilling.md`、`references/cross-cutting.md`、`scripts/testing/*`、`.agents/test-engineer.md` 等四角色、模板 07/11。

**验证证据**：文档与角色审阅；状态机脚本未改动（该版本无新增 phase）。

**升级动作**：无需迁移；新增可选环节 3.5 与前置澄清协议，按需使用。

**兼容性**：向后兼容。

---

## 1.2.0 - 2026-08-15

**类型**：minor

**目标**：把人工 Gate 从「口头约定」落到状态机强制，并批量修复文档一致性。

**面向使用者的变更点**

- 新增 `set-fw-gate.cjs` 显式置位；`validate` 强校验「离开 Gate 前 `gateChecks=true`」；`advance` 不再自动置位。
- 修复 `--biz-doc skip` 流程死锁：`validate` 感知 `bizDocPlan`，新增 `skip-fw-phase.cjs` 与 `finish-fw-workflow.cjs`。
- 修复模板 01/02/03/06 的 `advance` 目标 phase off-by-one；统一「默认单 agent / 多 agent」口径。
- 新增 `cross-cutting.md` 横切共享块（安全硬约束 / 敏感操作 / 只读白名单），8 个角色改为共享引用。
- 新增 `smoke-fw-scripts.cjs`（34 项断言）。

**影响文件**：`scripts/set-fw-gate.cjs`（新增）、`skip-fw-phase.cjs`（新增）、`finish-fw-workflow.cjs`（新增）、`smoke-fw-scripts.cjs`（新增）、`references/cross-cutting.md`（新增）、`.agents/*`、`SKILL.md`、`README.md`、模板 01/02/03/06。

**验证证据**：smoke 34 项全通过；Gate 未置位阻断 / 置位放行；skip 与 finish 链路回归。

**升级动作**：Gate 必须显式置位（流程行为变化）；旧状态文件无需迁移。

**兼容性**：流程行为变化（Gate 不再自动置位），状态文件格式兼容。

---

## 1.1.0 - 2026-07-27

**类型**：minor

**目标**：为开发计划活文档（`fw_dev_spec`）增加可选的 OpenSpec 关联能力。

**面向使用者的变更点**

- 单向同步活文档到 OpenSpec，并建立双向锚点（`fw_dev_spec ↔ OpenSpec change`）。
- 新增 `scripts/sync-fw-openspec.cjs`（`init` / `sync` / `check`）。
- `fw-dev-spec.md` 新增第九章；新增模板 10（活文档关联 OpenSpec，单 / 多 Agent）。

**影响文件**：`references/fw-dev-spec.md`、`scripts/sync-fw-openspec.cjs`（新增）、模板 10、`SKILL.md`、`README.md`。

**验证证据**：`sync check` 路径解析与指纹校验回归。

**升级动作**：默认关闭，按需在活文档中开启关联模式。

**兼容性**：向后兼容（可选能力）。

---

## 1.0.0 - 2026-07-20

**类型**：major

**目标**：把分散的前端能力合并为单一入口 skill（`frontend-workflow`）。

**面向使用者的变更点**

- 能力基线：Figma 像素级还原、原型→OpenSpec PRD、前端工程通用规范、Swagger→接口定义生成、TAPD 缺陷修复、开发计划活文档、多 agent 编排（8 角色 + 状态机脚本）。
- 分层：`SKILL.md` 路由 / `references/` 规则 / `.agents/` 角色 / `scripts/` 执行 / 模板与项目适配手册。
- 状态机：`create` / `validate` / `advance` / `rollback` 与 phase 0~10（②~⑫）。

**影响文件**：初始目录结构（见 `README.md`）。

**验证证据**：基线安装与路由可用；模板可粘贴触发。

**升级动作**：从旧合集 `frontend-workflow-skills` 迁移到 `frontend-workflow` 单目录安装。

**兼容性**：旧合集名废弃。
