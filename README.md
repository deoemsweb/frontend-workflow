# frontend-workflow-skills

前端开发工作流 Skills 合集。按**能力领域**组织子 skill，便于按团队角色与开发阶段快速定位与扩展。

## 目录结构

```
frontend-workflow-skills/
├── README.md                       # 本文件：合集总览
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

## 前端开发工作流

本合集的 skill 覆盖前端开发从设计稿到需求规范、再到业务逻辑实现的关键环节。推荐流程如下（前端部分）：

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
  │   · 发现偏差 → 回流生成 Agent 修正，复检直到通过
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
  │   · 偏差回流修正，复检直到通过
  ▼
人工确认需求                                              【确认 Gate·人工】
  │
  ▼
AI Coding 生成业务逻辑并绑定到静态页面                     【生成 Agent】
  │   · frontend-engineering-standards
  │     ├ 依据 PRD tasks.md 按阶段实现
  │     ├ API 集成（统一封装 + 三态 + 错误码 + 防竞态）/ 状态管理 / 类型安全 / 安全约束
  │     └ 占位数据替换为真实 API 数据，绑定交互行为
  ▼
检查 Agent（只读）跑工程硬约束                             【检查】
  │   · 类型安全（禁 any）/ XSS / 输入校验 / 三态 / 防竞态 / 防抖节流
  │   · 偏差回流修正，复检直到通过
  ▼
人工验收业务规则                                          【确认 Gate·人工】
  │
  ▼
验收
```

> **多 Agent 协作原则**：每个生成环节后挂独立**检查 Agent（只读、不写代码）**跑对应 checklist，偏差回流生成 Agent 修正直到通过；**确认 Gate 保留人工**把关视觉 / 业务 / 需求。

各环节（生成 / 检查 / 确认）与 skill 对照：

| 环节 | 阶段 | 动作 | 使用的 skill |
|------|------|------|--------------|
| ① | 输入 | Figma 设计稿 | — |
| ② | 生成 | AI Coding 生成静态页面 | `figma-design-constraint`、`frontend-engineering-standards` |
| ③ | 检查 | 检查 Agent 跑 QA Checklist（布局 / 颜色 / 字体 / 资源 / a11y / 对比度） | `figma-design-constraint` |
| ④ | 确认 | 人工验收 + agent 微调还原度 | `figma-design-constraint` |
| ⑤ | 生成 | 生成 OpenSpec PRD + Swagger 补齐 API / 业务状态 / 权限 / 校验 / 异常态 | `figma-to-openspec-prd` |
| ⑥ | 检查 | 检查 Agent 跑第八章质量清单（SHALL / Scenario / 拆解粒度 / 可追溯） | `figma-to-openspec-prd` |
| ⑦ | 确认 | 人工确认需求 | — |
| ⑧ | 生成 | AI Coding 生成业务逻辑并绑定到静态页面 | `frontend-engineering-standards` |
| ⑨ | 检查 | 检查 Agent 跑工程硬约束（类型安全 / 安全 / 三态 / 防竞态 / 防抖节流） | `frontend-engineering-standards` |
| ⑩ | 确认 | 人工验收业务规则 | — |
| ⑪ | 终验 | 验收 | — |

## 如何扩展

新增子 skill 时，按所属能力领域放入对应目录（如测试类放入 `testing/`），每个子 skill 保持独立的 `SKILL.md` 及可选的 `assets/`、`scripts/`、`references/` 目录。
