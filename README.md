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
AI Coding 生成静态页面
  │   · figma-design-constraint：设计稿分析、还原约束
  │   · frontend-engineering-standards：工程实现规范
  ▼
人工验收静态页面，然后调用 agent 微调还原度
  │   · figma-design-constraint：视觉偏差检查与修正、
  │     1) 测量抽查：DevTools 盒模型数值 vs Figma 数值
  │     2) 颜色校验：取色器对比实际色值与设计稿色值
  │     3) 逐项过 QA Checklist（布局 / 颜色 / 字体 / 资源 / 内容 / 交互状态 / 可访问性 / 对比度）
  │     4) 发现偏差 → 调用 agent 按"只对齐 Figma、不自行美化"原则修正
  ▼
生成 OpenSpec PRD 文档
  │   · figma-to-openspec-prd
  │     ├ 根据产品提供的 Figma 原型图生成 OpenSpec PRD（specs / proposal / design / tasks）
  │     └ 根据后端提供的 Swagger API JSON 补齐 API 列表
  │        · 校准页面功能规格
  │        · 补齐业务状态 / 权限 / 校验 / 异常态
  ▼
AI Coding 生成业务逻辑并绑定到静态页面
  │   · frontend-engineering-standards
  │     ├ 依据 PRD tasks.md 按阶段实现业务逻辑
  │     ├ API 集成：统一请求封装 + 三态（loading / error / empty）+ 错误码处理 + 请求取消防竞态
  │     ├ 状态管理：按决策树决定状态存放（Store / 本地 state）
  │     ├ 类型安全：TS 类型定义、Props 接口、禁止 any
  │     ├ 安全约束：XSS 防护、输入验证、敏感信息保护
  │     └ 将静态页面占位数据替换为真实 API 数据，绑定交互行为
  ▼
验收
```

各环节与 skill 对照：

| 环节 | 动作 | 使用的 skill |
|------|------|--------------|
| ① | Figma 设计稿（输入） | — |
| ② | AI Coding 生成静态页面 | `figma-design-constraint`、`frontend-engineering-standards` |
| ③ | 人工验收 + 调用 agent 微调 | `figma-design-constraint` |
| ④ | 生成 OpenSpec PRD + Swagger 补齐 API / 业务状态 / 权限 / 校验 / 异常态 | `figma-to-openspec-prd` |
| ⑤ | AI Coding 生成业务逻辑并绑定到静态页面（API 集成 / 状态管理 / 类型安全 / 安全约束） | `frontend-engineering-standards` |
| ⑥ | 验收 | — |

## 如何扩展

新增子 skill 时，按所属能力领域放入对应目录（如测试类放入 `testing/`），每个子 skill 保持独立的 `SKILL.md` 及可选的 `assets/`、`scripts/`、`references/` 目录。
