# 多 Agent 模式提示词模板 07：测试能力（占位，待扩展）

> 本模板是「多 Agent 协作模式」下 **测试（独立分支 3.5）** 的**独立提示词**。对应角色 `test-engineer`（`.agents/test-engineer.md`）已定义，但 `testing.md` 仍为占位骨架——多 agent 模式下同样会触发「测试规范未定稿，需先补充」提示，不会自动套用通用模板。
>
> 完整编排协议：`references/multi-agent-orchestration.md`（§二、§十一 3.5）。单 agent 版见同级 `../单Agent模式/07-测试能力（待扩展）.md`。

## 角色与阶段映射

| 项 | 内容 |
|----|------|
| 编排器 | `workflow-orchestrator`（`.agents/workflow-orchestrator.md`） |
| 执行 agent | `test-engineer`（`.agents/test-engineer.md`，**占位，规范未定稿**） |
| 覆盖阶段 | 独立分支 3.5（测试） |
| 核心 reference | `testing.md`（占位骨架，规则未定稿） |
| 检查 agent | —（测试本身即质量活动） |
| 人工 Gate | 无（但须先补全 testing.md 方可生成） |
| 状态机 | 不进主流程 12 阶段状态机 |

## 模板 A：完整版（多 Agent 编排）

```text
你是 frontend-workflow 的编排器 workflow-orchestrator。请按 .agents/workflow-orchestrator.md 与 references/multi-agent-orchestration.md 履行职责，采用多 agent 协作模式触发测试分支。

【任务】
为下面目标编写 / 运行测试（单元 / 组件 / E2E / 视觉回归），由你 spawn 专职 agent `test-engineer` 执行。

【输入 / 占位符】
- 测试范围：{{test_scope}}        # 单元 / 组件 / E2E / 视觉回归
- 目标：{{target_path}}           # 待测文件 / 页面 / 模块

【编排指令】
1. 先确认 `references/testing.md` 是否已定稿。未定稿则**立即停下**，列出需要我补充的规范项（各测试类型的写法与 QA Checklist），不 spawn 任何生成类任务、不套用通用模板。
2. 仅当我已提供规范（testing.md 定稿）后，spawn `test-engineer`（.agents/test-engineer.md），dispatch 提示词注入必读 references/testing.md 与对应 QA Checklist；敏感操作（npm test / build）前先上报（§六）。
3. test-engineer 按规范编写并运行测试，E2E 用例可映射 PRD 的 Requirement/Scenario，视觉回归与 figma-design-constraint 还原验收互补。
4. 完成后回报测试产物路径与结论。
```

## 模板 B：精简版（一行触发，多 Agent）

```text
用多 agent / 团队协作模式（frontend-workflow 编排器 workflow-orchestrator → spawn test-engineer），给 {{target_path}} 写 {{test_scope}} 测试。注意 testing.md 还是占位，先读文件确认规则是否已定稿，未定稿先告诉我缺哪些规范，别直接套通用模板；定稿后再生成。
```

## 占位符说明

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `{{test_scope}}` | 测试类型 | `E2E` / `组件测试` / `单元测试` |
| `{{target_path}}` | 待测目标 | `src/views/order/list.vue` |

> ⚠️ 补全建议：正式使用前，请完善 `references/testing.md` 各测试类型的写法规范、示例代码与 QA Checklist，本模板（及单 agent 版）即可直接驱动执行。

## 与单 agent 模板（../单Agent模式/07-测试能力（待扩展）.md）的区别
- 两者都会因 testing.md 占位而提示「测试规范未定稿，需先补充」；区别仅在执行主体——本模板由 `test-engineer` 角色执行，单 agent 版由主 agent 直接执行。规则正文（testing.md）均未定稿。
