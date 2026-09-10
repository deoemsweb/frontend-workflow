# 多 Agent 模式提示词模板 01：Figma 设计稿像素级还原

> 本模板是「多 Agent 协作模式」下 **Figma 还原（阶段②）** 的**独立提示词**。由编排器 `workflow-orchestrator`（`.agents/workflow-orchestrator.md`）spawn 专职 agent **`figma-restorer`**（`.agents/figma-restorer.md`）执行，生成后由 `qa-reviewer`（只读）跑偏差报告，④ 人工 Gate 由编排器用状态机脚本管理。
>
> 完整编排协议：`references/multi-agent-orchestration.md`（§二、§三、§八、§九）。单 agent 版见同级 `../单Agent模式/01-Figma还原.md`。

## 角色与阶段映射

| 项 | 内容 |
|----|------|
| 编排器 | `workflow-orchestrator`（`.agents/workflow-orchestrator.md`） |
| 执行 agent | `figma-restorer`（`.agents/figma-restorer.md`） |
| 覆盖阶段 | ② 生成静态页面 |
| 核心 reference | `figma-design-constraint.md` + `frontend-engineering-standards.md`（8.4 UI 库选型） |
| 检查 agent | `qa-reviewer`（`.agents/qa-reviewer.md`，只读）→ `.codebuddy/plans/<任务名>-review-static.md` |
| 人工 Gate | ④ 静态页验收（须用户确认） |
| 状态机 | `scripts/create-fw-workflow.cjs <任务名> --start 0` → `validate/advance-fw-phase.cjs` + `set-fw-gate.cjs` |

## 模板 A：完整版（多 Agent 编排）

```text
你是 frontend-workflow 的编排器 workflow-orchestrator。请严格按 .agents/workflow-orchestrator.md 与 references/multi-agent-orchestration.md 履行职责，采用多 agent 协作模式完成下列 Figma 还原任务。

【任务】
把下面 Figma 设计稿还原为静态前端页面 / 组件代码（不实现业务逻辑）。由你 spawn 专职 agent `figma-restorer` 执行，你只做调度、Gate 与状态推进，不亲自写页面代码。

【输入 / 占位符】
- Figma 链接 / 节点 key：{{figma_url_or_node}}
- 技术栈：{{tech_stack}}
- 目标范围：{{scope}}
- 输出目录：{{output_dir}}

【编排指令】
1. 意图解读（SKILL 2.1）：确认范围 / 起止阶段 / 技术栈，输出意图清单让我确认。
2. 调用 `node scripts/create-fw-workflow.cjs <任务名> --start 0` 初始化状态机（phase 0 = ② 生成静态页）。
3. spawn `figma-restorer`（.agents/figma-restorer.md），dispatch 提示词须注入：
   - 必读：references/figma-design-constraint.md（六条核心规则、Design Token、第十章 QA Checklist）、references/frontend-engineering-standards.md（8.4 组件库自主选型）；
   - 横切安全硬约束（生成类 agent 注入，见编排协议 §七）；
   - 敏感操作（git / 整文件覆盖 / npm 脚本）前先上报，不得自行执行（§六）；
   - 完成后回报产物路径与关键上下文。
4. figma-restorer 按 figma-design-constraint.md 六条核心规则还原（Figma 唯一真理来源；禁止美化 / 补缺失态 / 第三方图标替代；Design Token 全局 tokens.css；UI 库优先选型；第十章 QA Checklist 自检）。
5. 生成后 spawn `qa-reviewer`（.agents/qa-reviewer.md，只读）产出偏差报告内容，由你（编排器）落盘到 `.codebuddy/plans/<任务名>-review-static.md`；如需回流最多 3 次，超限转人工。
6. 到达人工 Gate ④ 时暂停并等我确认静态页；确认后调用 `node scripts/set-fw-gate.cjs <任务名> staticConfirmed` 置位，再 `node scripts/advance-fw-phase.cjs <任务名> 3` 离开 ④ 进入 ⑤（未置位 advance 会被门控阻断）。
7. 完成后回报产物路径与关键上下文。
```

## 模板 B：精简版（一行触发，多 Agent）

```text
用多 agent / 团队协作模式（frontend-workflow 编排器 workflow-orchestrator → spawn figma-restorer），按 figma-design-constraint.md 把 {{figma_url_or_node}} 还原成 {{tech_stack}} 静态页面写到 {{output_dir}}，范围 {{scope}}。严格六条核心规则、Design Token、UI 库优先；生成后 qa-reviewer 跑偏差报告，④ 验收 Gate 等我确认。
```

## 占位符说明

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `{{figma_url_or_node}}` | Figma 文件链接或目标 Frame/节点 key | `https://www.figma.com/file/xxx?node-id=12-34` |
| `{{tech_stack}}` | 技术栈，决定输出语法 | `Vue2.6 + JS + ElementUI2` |
| `{{scope}}` | 本次还原范围 | `订单列表页` / `UserCard 组件` |
| `{{output_dir}}` | 代码输出目录 | `src/views/order/` |

## 与单 agent 模板（../单Agent模式/01-Figma还原.md）的区别
- 单 agent：直接顺序执行「还原 → 检查 → 验收」。
- 本模板：编排器调度，`figma-restorer` 只写生成类代码、`qa-reviewer` 只读检查、④ Gate 由状态机脚本强制，职责与门控更清晰，支持中断恢复与回流。规则正文（figma-design-constraint.md）完全一致，仅执行主体与门控方式不同。
