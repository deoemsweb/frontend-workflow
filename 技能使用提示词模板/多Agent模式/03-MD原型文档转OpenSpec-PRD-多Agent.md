# 多 Agent 模式提示词模板 03：.md 原型需求文档 → OpenSpec 需求规范（PRD）

> 本模板是「多 Agent 协作模式」下 **`.md` 原型文档 → OpenSpec PRD（阶段⑤）** 的**独立提示词**。由编排器 `workflow-orchestrator` spawn 专职 agent **`prd-analyst`**（`.agents/prd-analyst.md`）执行，生成后由 `qa-reviewer` 跑偏差报告，⑤a / ⑦ 人工 Gate 由编排器管理。
>
> 完整编排协议：`references/multi-agent-orchestration.md`（§二、§三、§八、§九）。单 agent 版见同级 `../单Agent模式/03-MD原型文档转OpenSpec-PRD.md`。

## 角色与阶段映射

| 项 | 内容 |
|----|------|
| 编排器 | `workflow-orchestrator`（`.agents/workflow-orchestrator.md`） |
| 执行 agent | `prd-analyst`（`.agents/prd-analyst.md`） |
| 覆盖阶段 | ⑤a（方案确认，内嵌 Gate）+ ⑤（生成 PRD） |
| 核心 reference | `prototype-to-openspec-prd.md`（2.3 `.md` 输入源处理 / 第七章拆解 / 第八章质检 / 第十章边界） |
| 检查 agent | `qa-reviewer`（只读）→ `.codebuddy/plans/<任务名>-review-prd.md` |
| 人工 Gate | ⑤a 业务文档方案确认（内嵌）、⑦ 需求确认（docConfirmed） |
| 状态机 | `scripts/create-fw-workflow.cjs <任务名> --start 3` → `validate/advance-fw-phase.cjs` |

## 模板 A：完整版（多 Agent 编排）

```text
你是 frontend-workflow 的编排器 workflow-orchestrator。请严格按 .agents/workflow-orchestrator.md 与 references/multi-agent-orchestration.md 履行职责，采用多 agent 协作模式把下面 .md 原型文档转为 OpenSpec PRD。

【任务】
把产品 / AI 产出的 Markdown 原型需求文档，转换为结构化、可追溯的 OpenSpec 规范（specs / proposal / design / tasks），由你 spawn 专职 agent `prd-analyst` 执行。你只做调度、Gate 与状态推进，不亲自写 PRD。

【输入 / 占位符】
- 原型文档（.md）：{{md_file_path}}            # 或在此直接粘贴 Markdown 全文
- 目标项目目录：{{project_dir}}
- 技术栈（参考用）：{{tech_stack}}
- 是否同时提供 Figma：{{figma_link 或 “无”}}   # 如有，仅作视觉/交互补充，.md 文本为权威来源

【编排指令】
1. 意图解读：确认 .md 路径 / 范围 / 是否含 Figma，输出意图清单让我确认。
2. 调用 `node scripts/create-fw-workflow.cjs <任务名> --start 3` 初始化状态机（phase 3 = ⑤a⑤）。
3. 方案 Gate ⑤a：先问我用 OpenSpec（本任务）还是 fw-dev-spec 活文档，未确认不得生成。
4. spawn `prd-analyst`（.agents/prd-analyst.md），dispatch 提示词须注入：
   - 必读：references/prototype-to-openspec-prd.md（2.3 `.md` 输入源处理、第七章拆解、第八章质检、第十章边界）；
   - 敏感操作（openspec init / git / npm）前先上报（§六）；
   - 完成后回报产物路径与关键上下文。
5. prd-analyst：按 2.3 节用 Read 读取 .md，按映射表提炼（标题层级→capability、字段表→数据需求、有序列表→业务流程、引用块→边界约束）；输出结构化需求清单让我确认（2.4/2.5）；检查 OpenSpec 环境；生成 specs/proposal/design/tasks；过第八章质检；严禁猜测，未知项标 `> ⚠️ 待确认：...`。
6. 生成后 spawn `qa-reviewer`（只读）跑偏差报告到 `.codebuddy/plans/<任务名>-review-prd.md`。
7. 到达人工 Gate ⑦ 时暂停，待我确认需求后把 `gateChecks.docConfirmed` 置 true 并 `advance-fw-phase.cjs <任务名> 5` 推进。
```

## 模板 B：精简版（一行触发，多 Agent）

```text
用多 agent / 团队协作模式（frontend-workflow 编排器 workflow-orchestrator → spawn prd-analyst），按 prototype-to-openspec-prd.md 的 2.3 节把 {{md_file_path}} 这个 .md 原型需求文档转成 OpenSpec PRD 写到 {{project_dir}}/openspec。先读文档给我结构化需求清单确认，接口/字段未知标 ⚠️ 待确认别猜，环境缺失先引导安装，⑤a 问我用 OpenSpec 还是 fw-dev-spec，最后过第八章质检、⑦ 需求 Gate 等我验收。
```

## 占位符说明

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `{{md_file_path}}` | `.md` 原型文档路径，或直接粘贴内容 | `docs/prototype-order.md` |
| `{{project_dir}}` | OpenSpec 写入的目标项目根目录 | `F:/Develop/www/userlive` |
| `{{tech_stack}}` | 技术栈（仅作后续工程实现参考） | `Vue2.6 + JS + ElementUI2` |
| `{{figma_link}}` | 可选，同时提供的 Figma 链接/节点 | `https://www.figma.com/file/...` 或 `无` |

## 与单 agent 模板（../单Agent模式/03-MD原型文档转OpenSpec-PRD.md）的区别
- 单 agent：直接顺序生成 PRD → 检查 → 验收。
- 本模板：编排器调度，`prd-analyst` 只产出文档、`qa-reviewer` 只读检查、⑤a/⑦ Gate 由状态机脚本强制。规则正文（prototype-to-openspec-prd.md 2.3）完全一致。
