# 多 Agent 模式 · 独立提示词模板

> 本目录是「技能使用提示词模板」下**多 Agent 协作模式**的**独立提示词集合**，与 `../单Agent模式/` 下的 `01~09` 单 agent 模板**一一对应、并存**。每个文件都是一份**可直接粘贴触发多 agent 编排**的完整提示词，无需再在单 agent 模板后手动追加「用多 agent / 团队协作模式」。
>
> 编排协议单一事实来源：`references/multi-agent-orchestration.md`；角色定义：`.agents/*.md`；状态机脚本：`scripts/*.cjs`。

## 何时用本目录（而非 `../单Agent模式/` 单 agent 模板）

| 诉求 | 用哪个 |
|------|--------|
| 想让主 agent 自己顺序执行、快速单次产出 | 上级 `01~09` 单 agent 模板 |
| 想启用多 agent 编排（编排器调度专职 agent + 状态机 Gate + 只读检查回流） | **本目录对应 `*-多Agent.md`** |
| 端到端全流程（②~⑫） | 本目录 `08-端到端全流程-多Agent.md`（**唯一默认即多 agent** 的场景） |
| TAPD 缺陷修复独立分支 | 本目录 `09-TAPD缺陷修复-多Agent.md`（可选；默认单 agent，追加触发句后启用） |

## 模板索引

| 文件 | 场景 | 编排器 spawn 的专职 agent | 触发方式 |
|------|------|---------------------------|----------|
| [01-Figma还原-多Agent.md](./01-Figma还原-多Agent.md) | Figma 还原（②） | `figma-restorer` | 可选（粘贴即用） |
| [02-Figma原型转OpenSpec-PRD-多Agent.md](./02-Figma原型转OpenSpec-PRD-多Agent.md) | Figma 原型 → OpenSpec PRD（⑤） | `prd-analyst` | 可选 |
| [03-MD原型文档转OpenSpec-PRD-多Agent.md](./03-MD原型文档转OpenSpec-PRD-多Agent.md) | .md 原型 → OpenSpec PRD（⑤） | `prd-analyst` | 可选 |
| [04-开发计划活文档-多Agent.md](./04-开发计划活文档-多Agent.md) | 原型 → 开发计划活文档（⑤ / 3.7） | `prd-analyst` | 可选 |
| [05-Swagger接口定义生成-多Agent.md](./05-Swagger接口定义生成-多Agent.md) | Swagger → 前端接口定义（⑦b⑦c） | `api-contractor` | 可选 |
| [06-业务文档接入与前端工程实现-多Agent.md](./06-业务文档接入与前端工程实现-多Agent.md) | 业务文档接入 + 工程实现（⑧a⑧⑨） | `frontend-implementer` | 可选 |
| [07-测试与用例生成-多Agent.md](./07-测试与用例生成-多Agent.md) | 测试与用例生成（可选环节 3.5） | `test-engineer`（两段式：用例文档→内嵌 Gate→代码） | 可选（粘贴即用） |
| [08-端到端全流程-多Agent.md](./08-端到端全流程-多Agent.md) | 原型 → 交付 全链路（②~⑫） | 编排器按阶段调度全部角色 | 启用（默认多 agent） |
| [09-TAPD缺陷修复-多Agent.md](./09-TAPD缺陷修复-多Agent.md) | TAPD 缺陷修复（独立分支 3.6） | `tapd-bugfixer` | 可选（默认单 agent，追加触发句后启用） |

> **10 号（活文档关联 OpenSpec）无独立多 Agent 模板**：其多 agent 执行复用 `prd-analyst` 角色说明，入口见 `../单Agent模式/10-活文档关联OpenSpec.md` 的「多 Agent 模式（可选）」块（SKILL.md 3.9 已声明此规则）。

## 每个文件的结构

1. **角色与阶段映射**：本场景下的编排器 / 执行 agent / 阶段 / 核心 reference / 检查 agent / 人工 Gate / 状态机 `--start` 起点。
2. **模板 A：完整版（多 Agent 编排）**：一段可直接粘贴的提示词，开头把主 agent 设定为 `workflow-orchestrator`，含任务、输入占位符、编排指令（初始化状态机 → spawn 专职 agent 并注入必读 reference + 横切安全硬约束 + 敏感操作询问 → qa-reviewer 只读检查 → 人工 Gate 由状态机脚本置位推进）。
3. **模板 B：精简版（一行触发）**：一行即可触发，含「用多 agent / 团队协作模式」显式句与 spawn 目标角色。
4. **占位符说明**：与 `../单Agent模式/` 下同名单 agent 模板一致。
5. **与单 agent 模板的区别**：明确本模板只是执行主体与门控方式不同，规则正文（references/*.md）完全一致。

## 使用步骤

1. 选定场景文件，替换 `{{...}}` 占位符。
2. 复制 **模板 A** 或 **模板 B** 粘贴到对话；主 agent 会自动进入编排器角色，按 `references/multi-agent-orchestration.md` 调度。
3. 各人工 Gate（④⑤a⑦⑦c⑧a⑪⑫ 或 TAPD 两处）会暂停等你确认（确认后编排器 `set-fw-gate.cjs` 置位再推进）；敏感操作（git / npm / TAPD 写操作等）会先询问。
4. 状态机脚本在 `.codebuddy/plans/<任务名>-fw-state.json` 记录进度，支持中断恢复。

> 若只要单 agent 顺序执行，请回到../单Agent模式/ 目录使用对应的 `01~09` 单 agent 模板。
