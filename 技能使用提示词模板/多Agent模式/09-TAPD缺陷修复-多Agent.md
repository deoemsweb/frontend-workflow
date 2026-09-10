# 多 Agent 模式提示词模板 09：TAPD 缺陷修复（需求关联缺陷 / 批量修 bug）

> 本模板是「多 Agent 协作模式」下 **TAPD 缺陷修复（独立分支 3.6）** 的**独立提示词**。TAPD 是**独立生命周期分支**；**默认单 agent 顺序执行**，如需多 agent 在提示词开头追加「用多 agent / 团队协作模式」，即由专职 agent **`tapd-bugfixer`**（`.agents/tapd-bugfixer.md`）执行、编排器 `workflow-orchestrator` 仅做入口路由，不进入 ②~⑫ 主流程状态机。
>
> 完整编排协议：`references/multi-agent-orchestration.md`（§二、§十一 3.6）。单 agent 版见同级 `../单Agent模式/09-TAPD缺陷修复.md`。

## 角色与阶段映射

| 项 | 内容 |
|----|------|
| 编排器 | `workflow-orchestrator`（仅入口路由，不进主流程状态机） |
| 执行 agent | `tapd-bugfixer`（`.agents/tapd-bugfixer.md`） |
| 覆盖阶段 | 独立分支 3.6（阶段零前置验证 + 5 阶段流程） |
| 核心 reference | `tapd-bugfix-workflow.md` + `tapd-tool-params.md` + `tapd-grouping-rules.md` + `tapd-plan-template.md` |
| 检查 agent | —（活文档计划自带进度与复核） |
| 人工 Gate | 缺陷筛选确认、验证后更新状态 |
| 状态机 | 不进 ②~⑫ 主流程状态机；tapd-bugfixer 对 `.bugfix-workflow/` 活文档做断点恢复 |

## 模板 A：完整版（多 Agent 编排）

```text
你是 frontend-workflow 的编排器 workflow-orchestrator。请按 .agents/workflow-orchestrator.md 与 references/multi-agent-orchestration.md 履行职责，采用多 agent 协作模式处理下面需求的关联缺陷——本分支为独立生命周期，你仅做入口路由，由专职 agent `tapd-bugfixer` 完整执行。

【任务】
根据 TAPD 需求 ID 拉取关联缺陷、筛选前端负责的 Bug、生成活文档修复计划并执行（前端代码修复 / 发评论通知后端·产品·测试），验证通过后更新状态。由你 spawn 专职 agent `tapd-bugfixer` 执行。

【输入 / 占位符】
- 需求ID：{{story_id}}
- 前端开发人员：{{frontend_dev}}
- 后端开发人员：{{backend_dev}}              # 可选
- 产品人员：{{product}}                      # 可选
- 测试人员：{{qa}}                           # 可选

【编排指令】
1. 路由：确认启用多 agent 后，spawn `tapd-bugfixer`（.agents/tapd-bugfixer.md），dispatch 提示词注入：
   - 必读：references/tapd-bugfix-workflow.md（3.6）、tapd-tool-params.md、tapd-grouping-rules.md、tapd-plan-template.md；前端修复复用 references/frontend-engineering-standards.md（UI 类加 references/figma-design-constraint.md）；
   - 横切安全硬约束（`references/cross-cutting.md` 一）；
   - 敏感操作（git / npm / 删除文件 / 批量替换）与 TAPD 写操作（update_bug / create_comments）前**必须询问用户**（`references/cross-cutting.md` 二）；
   - 完成后回报产物路径与关键上下文。
2. tapd-bugfixer 按 3.6 流程执行：阶段零 TAPD MCP 连通性探针（不通即中止）；提取 workspace_id、拉取筛选归我负责的 Bug 经【缺陷筛选确认 Gate】等我确认；生成 .bugfix-workflow/ 活文档计划后执行修复（前端复用工程规范、UI 类加视觉约束、后端/产品/测试评论通知）；每完成一项更新活文档状态；【验证通过 Gate】等我确认缺陷已修复并验证通过，才调 update_bug 更新状态。
3. 你（编排器）持有最终询问职责；tapd-bugfixer 遇敏感操作 / TAPD 写操作先上报，由你统一向用户询问。
4. 完成后回报修复计划路径与状态更新结果。
```

## 模板 B：精简版（一行触发，多 Agent）

```text
用多 agent / 团队协作模式（frontend-workflow 编排器 workflow-orchestrator → 路由 tapd-bugfixer），按 references/tapd-bugfix-workflow.md（3.6）修复需求 {{story_id}} 的关联缺陷，前端处理人 {{frontend_dev}}。先跑 TAPD MCP 连通性探针（不通就中止），自动提取 workspace_id、拉取筛选归我负责的 Bug 等你确认（缺陷筛选 Gate）；生成 .bugfix-workflow/ 活文档计划后执行（前端修复复用工程规范，UI 类加视觉约束，后端/产品/测试评论通知），修复完等我验证通过再更新状态（update_bug 前先问我）。
```

## 占位符说明

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `{{story_id}}` | TAPD 需求 / 故事 ID（必填） | `1138260062001029247` |
| `{{frontend_dev}}` | 前端处理人真实姓名（必填） | `开发人员xxx` |
| `{{backend_dev}}` | 后端处理人姓名（可选） | `开发人员xxx` |
| `{{product}}` | 产品经理姓名（可选） | `李紫茵` |
| `{{qa}}` | 测试人员姓名（可选） | `张测试` |

## 与单 agent 模板（../单Agent模式/09-TAPD缺陷修复.md）的区别
- 单 agent：主 agent 直接执行 3.6 全流程。
- 本模板：由专职 `tapd-bugfixer` 角色执行，编排器仅入口路由与敏感操作统一询问；不进入 ②~⑫ 主流程状态机。规则正文（tapd-bugfix-workflow.md）完全一致。
