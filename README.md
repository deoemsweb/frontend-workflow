# frontend-workflow-skills

前端开发工作流 Skills 合集。按**能力领域**组织子 skill，便于按团队角色与开发阶段快速定位与扩展。

## 目录结构

```
frontend-workflow-skills/
├── README.md                       # 本文件：合集总览
├── frontend-workflow/              # 工作流编排 meta-skill（调度子 skill + 检查循环 + 人工 Gate）
├── figma/                          # 设计协作领域
│   ├── figma-design-constraint/    # Figma 设计约束检查
│   └── figma-to-openspec-prd/      # Figma 原型 → OpenSpec 需求规范（PRD）
├── engineering-standards/          # 工程与规范领域
│   └── frontend-engineering-standards/  # 前端工程规范
└── testing/                        # 测试领域（占位，待扩展）
```

## 能力领域

| 领域 | 说明 | 子 skill |
|------|------|----------|
| `figma/` | 设计稿与前端还原的协作、约束检查、需求规范产出 | `figma-design-constraint`、`figma-to-openspec-prd` |
| `engineering-standards/` | 前端工程规范、代码质量与一致性 | `frontend-engineering-standards` |
| `testing/` | 前端测试相关能力（占位，待补充） | — |
| `frontend-workflow/` | **编排层 meta-skill**：解读意图、按阶段调度子 skill、管理检查循环与人工 Gate | 调度 `figma-design-constraint`、`figma-to-openspec-prd`、`frontend-engineering-standards` |

## 前端开发工作流

本合集的 skill 覆盖前端开发从设计稿到需求规范、再到业务逻辑实现的关键环节，并在每个生成环节嵌入「生成 Agent → 检查 Agent（只读）→ 确认 Gate」多 Agent 协作闭环以提升产出质量。推荐流程如下（前端部分）：

```
Figma 设计稿
  │
  ▼
AI Coding 生成静态页面                                    【生成 Agent】
  │   · figma-design-constraint：设计稿分析、还原约束
  │   · frontend-engineering-standards：工程实现规范
  ▼
检查 Agent（只读）跑 QA Checklist                         【检查】
  │   · 布局 / 颜色 / 字体 / 资源 / 内容 / 交互状态 / a11y / 对比度 / 代码质量
  │   · 偏差报告结构化输出（文件路径 + 行号 + 规则ID + 修复建议）
  │   · 发现偏差 → 回流生成 Agent 修正；单环节最多回流 3 次，超出转人工介入
  ▼
人工验收 + agent 微调还原度                                【确认 Gate·人工】
  │   · figma-design-constraint：测量抽查 / 颜色校验 / 偏差修正
  ▼
生成 OpenSpec PRD 文档                                    【生成 Agent】
  │   · figma-to-openspec-prd
  │     ├ Figma 原型 → PRD（specs / proposal / design / tasks）
  │     └ Swagger API JSON 补齐 API 列表 / 业务状态 / 权限 / 校验 / 异常态
  ▼
检查 Agent（只读）跑第八章质量清单                         【检查】
  │   · SHALL 情态 / Scenario 可验证 / 拆解粒度 / 可追溯
  │   · 偏差回流修正；最多 3 次，超出转人工介入
  ▼
人工确认需求                                              【确认 Gate·人工】
  │
  ▼
组件树 / 状态设计 / 数据流草案                            【设计桥梁】
  │   · 依据 PRD tasks.md 拆分组件树、规划状态存放（Store / 本地）、梳理数据流
  │   · 作为静态页面 → 业务逻辑绑定的实现蓝图（frontend-engineering-standards）
  ▼
AI Coding 生成业务逻辑并绑定到静态页面                     【生成 Agent】
  │   · frontend-engineering-standards
  │     ├ 依据设计草案 + PRD tasks.md 按阶段实现
  │     ├ API 集成（统一封装 + 三态 + 错误码 + 防竞态）/ 状态管理 / 类型安全
  │     └ 占位数据替换为真实 API 数据，绑定交互行为
  ▼
检查 Agent（只读）跑工程硬约束 + 非功能质量                【检查】
  │   · 工程约束：类型安全（禁 any）/ 三态 / 防竞态 / 防抖节流
  │   · 非功能质量归口：安全（XSS / 输入校验 / 敏感信息）+ 可访问性（a11y）
  │   · 偏差回流修正；最多 3 次，超出转人工介入
  ▼
人工验收业务规则                                          【确认 Gate·人工】
  │
  ▼
验收
```

> **多 Agent 协作约定**：
> - **检查 Agent 只读、不写代码**，仅输出结构化偏差报告（文件路径 + 行号 + 规则ID + 修复建议），供生成 Agent 精准定位修正。
> - **回流上限**：每个检查阶段最多回流 3 次；超出仍未通过则标记"人工介入"，避免死循环消耗 Token。
> - **上下文传递**：生成 / 检查 Agent 间共享 Figma 节点 ID、代码片段、上一轮检查报告，保证偏差可追溯。
> - **确认 Gate 保留人工**：把关视觉还原度、业务规则、需求确认等不可量化项。
> - **非功能质量归口**：安全（XSS / 输入校验 / 敏感信息）与可访问性（a11y）统一作为"非功能质量"检查项；当检查项增多时，建议沉淀为独立 skill（归入 `testing/` 或新增 `non-functional-quality/`）。

各环节（生成 / 检查 / 确认）与 skill 对照：

| 环节 | 阶段 | 动作 | 使用的 skill |
|------|------|------|--------------|
| ① | 输入 | Figma 设计稿 | — |
| ② | 生成 | AI Coding 生成静态页面 | `figma-design-constraint`、`frontend-engineering-standards` |
| ③ | 检查 | 检查 Agent 跑 QA Checklist（≤3 次回流） | `figma-design-constraint` |
| ④ | 确认 | 人工验收 + agent 微调还原度 | `figma-design-constraint` |
| ⑤ | 生成 | 生成 OpenSpec PRD + Swagger 补齐 API / 业务状态 / 权限 / 校验 / 异常态 | `figma-to-openspec-prd` |
| ⑥ | 检查 | 检查 Agent 跑第八章质量清单（≤3 次回流） | `figma-to-openspec-prd` |
| ⑦ | 确认 | 人工确认需求 | — |
| ⑧ | 设计 | 组件树 / 状态设计 / 数据流草案（实现蓝图） | `frontend-engineering-standards` |
| ⑨ | 生成 | AI Coding 生成业务逻辑并绑定到静态页面 | `frontend-engineering-standards` |
| ⑩ | 检查 | 检查 Agent 跑工程硬约束 + 非功能质量（安全 / a11y）（≤3 次回流） | `frontend-engineering-standards` |
| ⑪ | 确认 | 人工验收业务规则 | — |
| ⑫ | 终验 | 验收 | — |

## 如何扩展

新增子 skill 时，按所属能力领域放入对应目录（如测试类放入 `testing/`），每个子 skill 保持独立的 `SKILL.md` 及可选的 `assets/`、`scripts/`、`references/` 目录。
