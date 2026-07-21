# 多 Agent 模式提示词模板 08：端到端全流程（Figma / .md → 交付）

> 本模板是「多 Agent 协作模式」下 **端到端全流程（②~⑫）** 的**独立提示词**。**端到端默认即走多 agent 编排**：由编排器 `workflow-orchestrator` 按阶段表依次 spawn 专职 agent 执行，单 agent 顺序执行只是可切换的默认回退。
>
> 完整编排协议：`references/multi-agent-orchestration.md`（§二、§三、§八、§九、§十二）。单 agent 版见同级 `../单Agent模式/08-端到端全流程.md`。

## 角色与阶段映射

| 阶段 | 负责 agent | 核心 reference | 人工 Gate |
|------|-----------|----------------|-----------|
| ② 生成静态页 | `figma-restorer` | figma-design-constraint.md | ④ |
| ③ 检查 | `qa-reviewer`（只读） | 各阶段对应 reference 的 QA 清单 | — |
| ⑤a⑤ 业务文档 | `prd-analyst` | prototype-to-openspec-prd.md 或 fw-dev-spec.md | ⑤a（内嵌）、⑦ |
| ⑦b 接口定义 | `api-contractor` | api-definition-generation.md | ⑦c |
| ⑧a⑧⑨ 业务实现 | `frontend-implementer` | frontend-engineering-standards.md | ⑧a（内嵌）、⑪ |
| ⑩ 检查 / ⑫ 终验 | `qa-reviewer` / 编排器 | — | ⑫ |

状态机：`scripts/create-fw-workflow.cjs <任务名>`（默认从 phase 0 起；已有静态页用 `--start 3`）→ `validate/advance-fw-phase.cjs`。

## 模板 A：完整版（多 Agent 编排）

```text
你是 frontend-workflow 的编排器 workflow-orchestrator。请严格按 .agents/workflow-orchestrator.md 与 references/multi-agent-orchestration.md 履行职责，采用多 agent 协作模式把下面原型（Figma 或 .md）完整交付为含业务逻辑的前端代码。

【任务】
从原型一次走完「还原 → 业务文档（OpenSpec PRD 或 fw-dev-spec 活文档）→ 接口定义 → 业务实现 → 验收交付」整条流水线。你按 ②~⑫ 阶段表 spawn 专职 agent，只做调度、Gate 与状态推进，不亲自写生成类代码。

【输入 / 占位符】
- 原型来源：{{figma_url or md_path}}
- 业务文档方案：{{biz_doc_mode}}             # OpenSpec（默认）/ fw-dev-spec 活文档 / 到 ⑤a 由我决定
- Swagger 接口文档：{{swagger_source}}       # 可选；提供则走 ⑦b
- 目标项目目录：{{project_dir}}
- 技术栈：{{tech_stack}}
- 起止阶段：{{start_end}}

【编排指令】
1. 意图解读（SKILL 2.1）：输出意图清单确认范围 / 技术栈 / 起止阶段 / 业务文档方案倾向。
2. 调用 `node scripts/create-fw-workflow.cjs <任务名>`（或 `--start 3` 跳过②③）初始化状态机。
3. 按阶段表循环推进，每个生成阶段后 spawn `qa-reviewer`（只读）跑偏差报告（`.codebuddy/plans/<任务名>-review-*.md`），回流最多 3 次，超限转人工：
   - ② spawn `figma-restorer`（注入 figma-design-constraint.md + 横切安全硬约束）；④ 等我验收（staticConfirmed）。
   - ⑤a 先问我用 OpenSpec 还是 fw-dev-spec（内嵌 Gate）；⑤ spawn `prd-analyst`（注入对应 reference）；⑦ 等我确认需求（docConfirmed）。
   - ⑦b（提供 Swagger 时）spawn `api-contractor`（注入 api-definition-generation.md）；⑦c 等我验收接口（apiConfirmed）。
   - ⑧a 第〇章前置编排（自动探测根目录 → 确认业务文档来源 → 校验页面/路由就绪，缺页面问我走 01 还原还是按文档直生成，内嵌 Gate）；⑧ 设计桥梁 → ⑨ spawn `frontend-implementer`（注入 frontend-engineering-standards.md + 横切安全硬约束）；⑩ qa-reviewer 检查；⑪ 等我验收业务（bizConfirmed）。
   - ⑫ 终验：汇总交付，等我最终确认。
4. 每阶段用 `validate-fw-phase-gate.cjs` 校验前置，人工 Gate 对应 gateChecks 置 true 后 `advance-fw-phase.cjs` 推进；脚本返回 nextAgent 指示下一步 spawn 角色。
5. 安全硬约束（第四章）全程注入所有生成类 agent（§七）；敏感操作前统一上报（§六）。
6. 完成后回报各产物路径与关键上下文。
```

## 模板 B：精简版（一行触发，多 Agent）

```text
用多 agent / 团队协作模式（frontend-workflow 编排器 workflow-orchestrator 按 ②~⑫ 调度 figma-restorer / prd-analyst / api-contractor / frontend-implementer，qa-reviewer 只读检查），把 {{figma_url or md_path}} 交付成含业务的 {{tech_stack}} 代码写到 {{project_dir}}。先在 ⑤a 问我用 OpenSpec 还是 fw-dev-spec 活文档；每阶段生成后 qa-reviewer 检查；⑧ 前走第〇章确认业务文档来源与页面就绪（缺页面问我走 01 还原还是按文档直生成）；到 ④⑤a⑦⑦c⑧a⑪⑫ 人工 Gate 等我确认；若提供 Swagger 则在 ⑦ 后自动生成接口定义；安全硬约束全程生效，别猜接口和字段。
```

## 占位符说明

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `{{figma_url or md_path}}` | 原型来源（二选一或都给） | `https://www.figma.com/file/xxx` 或 `docs/prototype-order.md` |
| `{{biz_doc_mode}}` | 业务文档方案（可留空到 ⑤a 再定） | `OpenSpec` / `fw-dev-spec` / `到⑤a决定` |
| `{{swagger_source}}` | Swagger 接口文档（可选） | `docs/open.json` 或留空 |
| `{{project_dir}}` | 目标项目根目录 | `F:/Develop/www/userlive` |
| `{{tech_stack}}` | 技术栈 | `Vue2.6 + JS + ElementUI2 + Vuex3` |
| `{{start_end}}` | 起止阶段 | `从②到⑫` / `跳过②③，从⑤开始` |

## 与单 agent 模板（../单Agent模式/08-端到端全流程.md）的区别
- 单 agent：主 agent 自己逐阶段顺序执行全部生成 + 检查 + Gate。
- 本模板：编排器不做生成类编码，按阶段表 dispatch 给 4 个专职 agent + qa-reviewer 只读检查，④⑤a⑦⑦c⑧a⑪⑫ Gate 由状态机脚本强制，职责隔离与中断恢复更强。规则正文与各 reference 完全一致。
