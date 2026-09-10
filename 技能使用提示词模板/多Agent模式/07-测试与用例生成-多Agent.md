# 多 Agent 模式提示词模板 07：测试与测试用例生成

> 本模板是「多 Agent 协作模式」下 **测试（可选环节 3.5，插在 ⑨→⑩）** 的**独立提示词**。对应角色 `test-engineer`（`.agents/test-engineer.md`，正式角色）。
>
> 完整编排协议：`references/multi-agent-orchestration.md`（§二、§十一 3.5）。单 agent 版见同级 `../单Agent模式/07-测试与用例生成.md`。

## 角色与阶段映射

| 项 | 内容 |
|----|------|
| 编排器 | `workflow-orchestrator`（`.agents/workflow-orchestrator.md`） |
| 执行 agent | `test-engineer`（`.agents/test-engineer.md`，正式角色） |
| 覆盖阶段 | 可选环节 3.5（⑨→⑩ 之间，测试） |
| 核心 reference | `testing.md`（正式规则）+ `cross-cutting.md`（铁律 · 三 / 敏感操作 · 四） |
| 检查 agent | —（测试本身即质量活动；❌ 代码缺陷回流 frontend-implementer） |
| 人工 Gate | **用例审阅（内嵌 Gate）**：用例文档确认后才生成代码；不占状态机 phase |
| 状态机 | 不占独立 phase：插在 ⑨→⑩ 之间，由编排器调度 test-engineer |

## 模板 A：完整版（多 Agent 编排）

```text
你是 frontend-workflow 的编排器 workflow-orchestrator。请按 .agents/workflow-orchestrator.md 与 references/multi-agent-orchestration.md 履行职责，采用多 agent 协作模式触发测试分支（3.5）。

【任务】
为下面目标执行测试能力（生成测试用例 + 单元 / 组件 / E2E / 视觉回归），由你 spawn 专职 agent `test-engineer` 执行。

【输入 / 占位符】
- 测试范围：{{test_scope}}        # 单元 / 组件 / E2E / 视觉回归 / 全部
- 目标：{{target_path}}           # 待测文件 / 页面 / 模块
- 业务文档：{{biz_doc_path}}      # 可选：OpenSpec specs / fw_dev_spec 活文档路径

【编排指令】
1. dispatch `test-engineer`（.agents/test-engineer.md），注入必读 references/testing.md + cross-cutting.md（铁律 · 三 / 敏感操作 · 四）与上述输入。
2. test-engineer 按 testing.md 第二章生成测试用例文档后，你执行【内嵌 Gate · 用例审阅】：向我展示用例统计与覆盖矩阵，确认 [通过/调整/返工]；**确认前不得放行代码生成**。
3. Gate 通过后 test-engineer 生成可执行测试（E2E 用 scripts/testing/ 执行层）；其请求执行测试命令（npm test / playwright / npm install）时，你按 cross-cutting.md 四统一向我询问。
4. 回收执行结果：核对是否附本次命令输出证据（cross-cutting.md 三 · 完成前验证铁律）；无证据的"测试通过"断言退回补验证。
5. ❌ 用例判定为代码缺陷时，dispatch 回 frontend-implementer 修复（可触发 ⑩ 回流）；完成后回报测试产物路径、用例状态回写与覆盖缺口。
```

## 模板 B：精简版（一行触发，多 Agent）

```text
用多 agent / 团队协作模式（frontend-workflow 编排器 workflow-orchestrator → spawn test-engineer），给 {{target_path}} 做 {{test_scope}}：先出测试用例文档经我审阅（内嵌 Gate），通过后生成并执行测试；测试命令先问我，结论须附执行证据。
```

## 占位符说明

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `{{test_scope}}` | 测试类型 | `E2E` / `组件测试` / `单元测试` / `生成测试用例` |
| `{{target_path}}` | 待测目标 | `src/views/order/list.vue` |
| `{{biz_doc_path}}` | 业务文档路径（可选） | `openspec/changes/add-export/specs/` |

## 与单 agent 模板（../单Agent模式/07-测试与用例生成.md）的区别

- 规则正文（testing.md 两段式 + 铁律）一致；区别仅在执行主体——本模板由 `test-engineer` 角色执行、编排器持有用例审阅 Gate 与敏感操作询问，单 agent 版由主 agent 顺序执行并自行暂停请用户确认。
