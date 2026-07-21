# 多 Agent 模式提示词模板 06：业务文档接入与前端工程实现（业务逻辑绑定）

> 本模板是「多 Agent 协作模式」下 **业务文档接入 + 前端工程实现（阶段⑧a⑧⑨）** 的**独立提示词**。由编排器 `workflow-orchestrator` spawn 专职 agent **`frontend-implementer`**（`.agents/frontend-implementer.md`）执行，第〇章前置编排（⑧a）与 ⑪ 人工 Gate 由编排器管理。
>
> 完整编排协议：`references/multi-agent-orchestration.md`（§二、§三、§七、§八、§九）。单 agent 版见同级 `../单Agent模式/06-业务文档接入与前端工程实现.md`。

## 角色与阶段映射

| 项 | 内容 |
|----|------|
| 编排器 | `workflow-orchestrator`（`.agents/workflow-orchestrator.md`） |
| 执行 agent | `frontend-implementer`（`.agents/frontend-implementer.md`） |
| 覆盖阶段 | ⑧a（第〇章前置编排，内嵌 Gate）+ ⑧（设计桥梁）+ ⑨（业务逻辑） |
| 核心 reference | `frontend-engineering-standards.md`（第〇章 + 全文，含第四章安全硬约束） |
| 检查 agent | `qa-reviewer`（只读）→ `.codebuddy/plans/<任务名>-review-impl.md` |
| 人工 Gate | ⑧a 业务文档来源确认（内嵌）、⑪ 业务验收（bizConfirmed） |
| 状态机 | `scripts/create-fw-workflow.cjs <任务名> --start 8` → `validate/advance-fw-phase.cjs` |

## 模板 A：完整版（多 Agent 编排）

```text
你是 frontend-workflow 的编排器 workflow-orchestrator。请严格按 .agents/workflow-orchestrator.md 与 references/multi-agent-orchestration.md 履行职责，采用多 agent 协作模式实现下面业务逻辑。

【任务】
在已生成的静态页面 / 业务文档（OpenSpec 或 fw-dev-spec 活文档）基础上实现业务逻辑、集成接口、状态管理，由你 spawn 专职 agent `frontend-implementer` 执行。你只做调度、Gate 与状态推进，不亲自写业务代码。

【输入 / 占位符】
- 静态页面 / 组件（可选，缺省时进入 0.4 校验）：{{page_or_component_path}}
- 业务文档路径（可选，缺省时自动探测）：{{biz_doc_path}}
- 原型来源（无业务文档时用）：{{prototype_source}}
- 技术栈：{{tech_stack}}
- 输出目录：{{output_dir}}

【编排指令】
1. 意图解读：确认页面 / 业务文档来源 / 技术栈 / 输出目录，输出意图清单让我确认。
2. 调用 `node scripts/create-fw-workflow.cjs <任务名> --start 8` 初始化状态机（phase 8 = ⑧a⑧⑨）。
3. Gate ⑧a（第〇章前置编排，内嵌）：自动审阅项目根目录（只读）探测 openspec/、fw_dev_spec/、package.json、src/views；推荐并问我连接哪套业务文档（已有 OpenSpec / 已有 fw-dev-spec / 二者皆有二选一）；若都没有，按原型来源推荐先走 02/03/04 生成，完成后再回来；校验目标页面/路由是否就绪，缺页面且有 Figma 问我是否先走 01 还原，缺页面且无 Figma 问我是否按文档直生成。未经我确认不得继续。
4. spawn `frontend-implementer`（.agents/frontend-implementer.md），dispatch 提示词须注入：
   - 必读：references/frontend-engineering-standards.md（第〇章 + 全文，含第四章安全硬约束）；
   - 横切安全硬约束（§七，XSS / 输入校验 / 敏感信息，全程生效）；
   - 敏感操作（git / npm / 整文件覆盖）前先上报（§六）；
   - 完成后回报产物路径与关键上下文。
5. frontend-implementer：先出组件树/状态/数据流草案经我确认（设计桥梁）；再按业务文档分步实现——OpenSpec 读 tasks.md 逐任务勾选、fw-dev-spec 读模块③分步 Plan 并按 ⬜→🔄→✅ 更新模块④进度总览（中断从首个 ⬜/🔄 续）；遵守 API 三态+防竞态、状态管理、第四章安全硬约束、性能与注释规范；信息不足停下问，严禁猜测业务规则/接口契约。
6. 生成后 spawn `qa-reviewer`（只读）跑偏差报告到 `.codebuddy/plans/<任务名>-review-impl.md`，如需回流最多 3 次，超限转人工。
7. 到达人工 Gate ⑪ 时暂停，待我确认业务后把 `gateChecks.bizConfirmed` 置 true 并 `advance-fw-phase.cjs <任务名> 10` 推进。
```

## 模板 B：精简版（一行触发，多 Agent）

```text
用多 agent / 团队协作模式（frontend-workflow 编排器 workflow-orchestrator → spawn frontend-implementer），按 frontend-engineering-standards.md 给 {{page_or_component_path}} 实现业务逻辑写到 {{output_dir}}。先按第〇章自动审阅根目录、推荐并问我用哪套业务文档（没有就先走 02/03/04 生成）、缺页面问我走 01 还原还是按文档直生成（⑧a Gate）；再出组件树/状态草案确认；然后按业务文档分步实现并实时更新进度；遵守第四章安全硬约束、API 三态+防竞态；完成后过 qa-reviewer 检查、⑪ 业务 Gate 等我验收。
```

## 占位符说明

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `{{page_or_component_path}}` | 待绑定业务的页面 / 组件路径（可选） | `src/views/order/list.vue` |
| `{{biz_doc_path}}` | 业务文档路径（可选，缺省自动探测） | `openspec/changes/add-export/tasks.md` 或 `fw_dev_spec/订单管理-2026-07-21/specs/开发计划.md` |
| `{{prototype_source}}` | 原型来源（无业务文档时） | `Figma` / `md` / `无` |
| `{{tech_stack}}` | 技术栈 | `Vue2.6 + JS + ElementUI2 + Vuex3` |
| `{{output_dir}}` | 输出目录 | `src/views/order/` |

## 与单 agent 模板（../单Agent模式/06-业务文档接入与前端工程实现.md）的区别
- 单 agent：直接顺序实现业务 → 检查 → 验收。
- 本模板：编排器调度，`frontend-implementer` 只写业务代码、⑧a/⑪ Gate 由状态机脚本强制。规则正文（frontend-engineering-standards.md）完全一致。
