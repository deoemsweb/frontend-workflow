# 前端测试能力（待扩展）

> 本节为 `frontend-workflow` 单一 skill 的测试领域占位。当前尚未填充详细规则，后续可在此按下方骨架补充各测试类型的规范与 QA Checklist。
> 触发：当用户要求"写单测 / 组件测试 / E2E / 视觉回归测试"，或在本工作流的"业务逻辑实现 → 验收"之间插入自动化测试环节时，先 Read 本文件。

## 章节索引（待填充）

- 一、单元测试（Unit）
  - 适用：Vitest / Jest
  - 范围：纯函数、工具函数、Store action、组件逻辑
- 二、组件测试（Component）
  - 适用：Testing Library / Cypress Component
  - 范围：交互行为、渲染结果、可访问性断言
- 三、端到端测试（E2E）
  - 适用：Playwright / Cypress
  - 范围：关键业务流程（登录、下单、审批等）、跨页面流转
- 四、视觉回归测试
  - 适用：Chromatic / Percy / Playwright 截图对比
  - 范围：像素级视觉差异捕获，与 `references/figma-design-constraint.md` 的还原验收互补

## 与其他章节的关系

- 与 `references/figma-design-constraint.md`：视觉回归测试是"像素级还原"的自动化守门员。
- 与 `references/frontend-engineering-standards.md`：单元测试 / 组件测试覆盖其"类型安全 / API 集成 / 状态管理"等工程约束。
- 与 `references/prototype-to-openspec-prd.md`：E2E 测试可映射其 `tasks.md` 中的 Requirement/Scenario 为可执行用例。

> ⚠️ 待扩展：本文件目前仅提供骨架，正式规则确定后再补全各章节的写法规范、示例代码与 QA Checklist。
