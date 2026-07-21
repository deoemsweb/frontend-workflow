# 多 Agent 模式提示词模板 05：Swagger / OpenAPI → 前端接口定义自动生成

> 本模板是「多 Agent 协作模式」下 **Swagger → 前端接口定义（阶段⑦b）** 的**独立提示词**。由编排器 `workflow-orchestrator` spawn 专职 agent **`api-contractor`**（`.agents/api-contractor.md`）执行，⑦c 人工 Gate 由编排器管理。
>
> 完整编排协议：`references/multi-agent-orchestration.md`（§二、§三、§八、§九）。单 agent 版见同级 `../单Agent模式/05-Swagger接口定义生成.md`。

## 角色与阶段映射

| 项 | 内容 |
|----|------|
| 编排器 | `workflow-orchestrator`（`.agents/workflow-orchestrator.md`） |
| 执行 agent | `api-contractor`（`.agents/api-contractor.md`） |
| 覆盖阶段 | ⑦b 接口定义生成 |
| 核心 reference | `api-definition-generation.md`（Swagger 解析 / 模式探测 / 生成规则 / 增量更新 / 质量校验） |
| 检查 agent | （可选）`qa-reviewer`（只读）按工程硬约束复核类型/封装复用 |
| 人工 Gate | ⑦c 接口验收（apiConfirmed） |
| 状态机 | `scripts/create-fw-workflow.cjs <任务名> --start 6` → `validate/advance-fw-phase.cjs` |

## 模板 A：完整版（多 Agent 编排）

```text
你是 frontend-workflow 的编排器 workflow-orchestrator。请严格按 .agents/workflow-orchestrator.md 与 references/multi-agent-orchestration.md 履行职责，采用多 agent 协作模式把下面 Swagger 文档生成前端接口定义。

【任务】
根据 Swagger / open.json 生成或增量同步前端接口定义文件（函数 + 类型 + JSDoc），由你 spawn 专职 agent `api-contractor` 执行。你只做调度、Gate 与状态推进，不亲自写接口定义。

【输入 / 占位符】
- Swagger 文档：{{swagger_source}}
- 技术栈：{{tech_stack}}
- 生成范围：{{scope}}
- 项目根目录：{{project_dir}}
- 模式：{{mode}}                             # 全新生成 / 增量更新

【编排指令】
1. 意图解读：确认技术栈 / 范围 / 全量或增量，输出意图清单让我确认。
2. 调用 `node scripts/create-fw-workflow.cjs <任务名> --start 6` 初始化状态机（phase 6 = ⑦b）。
3. spawn `api-contractor`（.agents/api-contractor.md），dispatch 提示词须注入：
   - 必读：references/api-definition-generation.md；
   - 横切安全硬约束（§七，接口层注意鉴权/敏感信息）；
   - 敏感操作（git / npm / 整文件覆盖）前先上报（§六）；
   - 完成后回报产物路径与关键上下文。
4. api-contractor：解析 Swagger paths/schemas/tags/security；探测项目既有接口模式（封装层 / 命名 / 注释 / 归类 / 解包层级 / 鉴权），输出「模式画像」经 ⑦c 前置让我确认；按规则生成（复用封装层、禁止裸调 axios、完整 JSDoc、$ref 解析为类型）；增量模式只改对应函数并出 delta；严禁猜测缺省 schema / 解包层级。
5. （可选）spawn `qa-reviewer`（只读）复核类型准确性与封装复用。
6. 到达人工 Gate ⑦c 时暂停，待我确认接口后把 `gateChecks.apiConfirmed` 置 true 并 `advance-fw-phase.cjs <任务名> 7` 推进。
```

## 模板 B：精简版（一行触发，多 Agent）

```text
用多 agent / 团队协作模式（frontend-workflow 编排器 workflow-orchestrator → spawn api-contractor），按 api-definition-generation.md 把 {{swagger_source}} 生成 {{tech_stack}} 接口定义写到 {{project_dir}}。先探测项目既有 http.js 封装与 modules 模式、输出模式画像给我确认（⑦c Gate），再按探测到的命名/注释/归类生成（复用封装层、完整 JSDoc、$ref 解析为类型），增量模式只改对应函数并出 delta，完成后等我验收。
```

## 占位符说明

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `{{swagger_source}}` | Swagger 文档来源（文件路径或 URL） | `docs/open.json` / `https://api.example.com/v3/api-docs` |
| `{{tech_stack}}` | 技术栈，决定类型表达与封装复用 | `Vue2.6 + JS` / `Vue3 + TS` |
| `{{scope}}` | 生成范围 | `全量` / `用户管理模块` / `GET /api/user/*` |
| `{{project_dir}}` | 项目根目录，用于探测既有接口模式 | `f:/Develop/www/userlive` |
| `{{mode}}` | 全量生成或增量更新 | `全新生成` / `增量更新` |

## 与单 agent 模板（../单Agent模式/05-Swagger接口定义生成.md）的区别
- 单 agent：直接顺序生成接口定义 → 验收。
- 本模板：编排器调度，`api-contractor` 只写接口定义、⑦c Gate 由状态机脚本强制。规则正文（api-definition-generation.md）完全一致。
