# 多 Agent 模式提示词模板 04：开发计划活文档（Figma / .md 原型转本地活文档）

> 本模板是「多 Agent 协作模式」下 **原型 → 开发计划活文档（阶段⑤ / 3.7 独立分支）** 的**独立提示词**。由编排器 `workflow-orchestrator` spawn 专职 agent **`prd-analyst`**（`.agents/prd-analyst.md`）执行，产物供后续 ⑧⑨ 经第〇章探测接入；不写 OpenSpec。
>
> 完整编排协议：`references/multi-agent-orchestration.md`（§二、§三、§八、§九、§十一 3.7）。单 agent 版见同级 `../单Agent模式/04-开发计划活文档.md`。

## 角色与阶段映射

| 项 | 内容 |
|----|------|
| 编排器 | `workflow-orchestrator`（`.agents/workflow-orchestrator.md`） |
| 执行 agent | `prd-analyst`（`.agents/prd-analyst.md`） |
| 覆盖阶段 | ⑤（fw-dev-spec 单独触发，3.7 独立分支） |
| 核心 reference | `fw-dev-spec.md`（3.7）+ 交叉引用 `prototype-to-openspec-prd.md`（2.2/2.3/2.4/第十章） |
| 检查 agent | `qa-reviewer`（只读）→ `.codebuddy/plans/<任务名>-review-prd.md` |
| 人工 Gate | Figma→.md 原型审阅、目录新建确认、单/多文档组织形式确认 |
| 状态机 | `scripts/create-fw-workflow.cjs <任务名> --start 3` → `validate/advance-fw-phase.cjs` |

## 模板 A：完整版（多 Agent 编排）

```text
你是 frontend-workflow 的编排器 workflow-orchestrator。请严格按 .agents/workflow-orchestrator.md 与 references/multi-agent-orchestration.md 履行职责，采用多 agent 协作模式把下面原型转为本地「开发计划活文档」。

【任务】
把用户提供的 Figma 原型或 .md 原型，统一转化为本地 .md 的「开发计划活文档」，落在 `fw_dev_spec/<需求名>-<日期>/`（原型放子目录根、活文档放 specs/），由你 spawn 专职 agent `prd-analyst` 执行。你只做调度、Gate 与状态推进，不亲自写文档。

【输入 / 占位符】
- 原型来源：{{source_type}}                    # Figma 或 md
- Figma 来源（source_type=Figma 时）：{{figma_source}}
- .md 原型路径（source_type=md 时）：{{md_path}}
- 需求名称：{{requirement_name}}
- 项目类型（可选）：{{project_type}}

【编排指令】
1. 意图解读：确认原型来源 / 需求名 / 组织形式倾向，输出意图清单让我确认。
2. 调用 `node scripts/create-fw-workflow.cjs <任务名> --start 3` 初始化状态机（phase 3 = ⑤）。
3. spawn `prd-analyst`（.agents/prd-analyst.md），dispatch 提示词须注入：
   - 必读：references/fw-dev-spec.md（3.7）、references/prototype-to-openspec-prd.md（2.2/2.3/2.4/第十章）；
   - 敏感操作（mkdir / git / npm）前先上报（`references/cross-cutting.md` 二）；
   - 完成后回报产物路径与关键上下文。
4. prd-analyst 按 fw-dev-spec.md 执行：输入读取与需求分析（交叉引用 prototype-to-openspec-prd.md，严禁猜测）；Figma→.md 原型先转草稿经【原型审阅 Gate】让我确认再存；目录 `fw_dev_spec/` 不存在先问我是否新建；先建议并问我用「单文档」还是「多 spec 文档」；按五模块（项目说明 / 功能模块+原型锚点 / 分步 Plan / 进度 / 变更日志）生成到 specs/，进度用 ⬜🔄✅⏭ 实时更新。
5. 生成后 spawn `qa-reviewer`（只读）产出偏差报告内容，由你落盘到 `.codebuddy/plans/<任务名>-review-prd.md`。
6. 各人工 Gate（原型审阅、目录新建、单/多文档）由你暂停等我确认后，方推进状态机。
```

## 模板 B：精简版（一行触发，多 Agent）

```text
用多 agent / 团队协作模式（frontend-workflow 编排器 workflow-orchestrator → spawn prd-analyst），按 references/fw-dev-spec.md（3.7）把 {{source_type}} 原型（Figma 填 {{figma_source}}，md 填 {{md_path}}）转为开发计划活文档，需求名 {{requirement_name}}。Figma 先读内容转 .md 原型给我审阅确认后再存；fw_dev_spec 不存在先问我是否新建，子目录默认 需求名-日期；先建议并问我用单文档还是多 spec 文档，再按五模块生成到 specs/，进度用 ⬜🔄✅⏭ 实时更新。不写 OpenSpec。
```

## 占位符说明

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `{{source_type}}` | 原型来源类型（必填） | `Figma` 或 `md` |
| `{{figma_source}}` | Figma 来源（source_type=Figma 时填） | `figma:node-id=xxx` 或 `https://www.figma.com/...` |
| `{{md_path}}` | .md 原型文件路径（source_type=md 时填） | `f:/dev/docs/订单管理-原型.md` |
| `{{requirement_name}}` | 需求名称，用于子目录命名 | `订单管理` |
| `{{project_type}}` | 项目类型（可选，辅助模块①） | `Vue3` / `React` / `小程序` |

## 与单 agent 模板（../单Agent模式/04-开发计划活文档.md）的区别
- 单 agent：直接顺序生成活文档 → 检查 → 验收。
- 本模板：编排器调度，`prd-analyst` 只产出文档、各 Gate 由状态机脚本管理，产物与后续 ⑧⑨ 第〇章接入的衔接一致。规则正文（fw-dev-spec.md）完全一致。
