# frontend-workflow-skills

前端开发工作流**单一 Skill**。将原先分散的能力（Figma 还原约束、原型→OpenSpec PRD、前端工程规范、Swagger→接口定义生成、测试占位）合并为一个可一次安装的 skill：路由逻辑集中在 `SKILL.md`，领域规则拆到 `references/` 子文件，按运行时需求读取，兼顾「一次安装」与「上下文不臃肿」。

## 目录结构

```
frontend-workflow-skills/            # 单一 skill 目录（= 安装单元）
├── SKILL.md                         # 路由层：触发描述 + 意图解读 + 阶段调度 + 章节指针（轻量）
├── references/                      # 领域规则正文（按需 Read，非自动注入）
│   ├── figma-design-constraint.md   # Figma 像素级还原约束
│   ├── prototype-to-openspec-prd.md # 原型（Figma / .md）→ OpenSpec PRD
│   ├── frontend-engineering-standards.md  # 前端工程通用规范
│   ├── api-definition-generation.md # Swagger/OpenAPI → 前端接口定义自动生成
│   └── testing.md                   # 测试能力（占位，待扩展）
└── README.md                        # 本文件
```

## 能力索引

| 分支 | 对应 reference | 说明 |
|------|----------------|------|
| Figma 还原 | `references/figma-design-constraint.md` | 像素级还原、Design Token、节点映射、a11y、资源导出、技术栈/项目类型适配、QA Checklist |
| 原型→PRD | `references/prototype-to-openspec-prd.md` | 设计原型（Figma 或 .md 需求文档）→ OpenSpec 需求规范（specs / proposal / design / tasks）与拆解策略 |
| 工程规范 | `references/frontend-engineering-standards.md` | 类型安全、API 集成、状态管理、安全约束、性能优化、注释文档、AI 不确定时处理 |
| 接口定义生成 | `references/api-definition-generation.md` | Swagger/open.json → 前端接口定义（函数+类型+JSDoc），自动探测项目既有接口模式并按其风格生成 |
| 测试（待扩展） | `references/testing.md` | 单元 / 组件 / E2E / 视觉回归 骨架占位 |

> 各 `references/*.md` 仍可独立 `Read` 使用，不经过 `SKILL.md` 路由。

## 前端开发工作流

本 skill 覆盖从设计稿到需求规范、再到业务逻辑实现的关键环节，并在每个生成环节嵌入「生成 → 检查（只读）→ 确认 Gate」协作闭环：

```
Figma 设计稿
  │
  ▼ ② 生成静态页面  · figma-design-constraint + frontend-engineering-standards
  ▼ ③ 检查 Agent（只读）跑 QA Checklist        · 偏差报告结构化，单环节最多回流 3 次
  ▼ ④ 人工验收 + 微调还原度                    【确认 Gate·人工】
  ▼ ⑤ 生成 OpenSpec PRD                       · prototype-to-openspec-prd（+ Swagger 补齐 API）
  ▼ ⑥ 检查 Agent 跑第八章质量清单             【检查】最多 3 次回流
  ▼ ⑦ 人工确认需求                            【确认 Gate·人工】
  ▼ ⑦b 接口定义生成  · api-definition-generation（Swagger→函数/类型/JSDoc，自动探测项目模式）
  ▼ ⑦c 人工验收接口定义                        【确认 Gate·人工】
  ▼ ⑧ 设计桥梁：组件树 / 状态 / 数据流草案     · frontend-engineering-standards
  ▼ ⑨ 生成业务逻辑并绑定静态页面              · frontend-engineering-standards
  ▼ ⑩ 检查 Agent 跑工程硬约束 + 非功能质量      【检查】最多 3 次回流
  ▼ ⑪ 人工验收业务规则                        【确认 Gate·人工】
  ▼ ⑫ 终验
```

**协作约定**：检查 Agent 只读、不写代码；回流上限 3 次，超出转人工介入；上下文在生成/检查间共享（Figma 节点 ID、代码片段、Swagger 路径、接口模式画像、上一轮报告）；确认 Gate ④⑦⑦c⑪⑫ 必须人工确认。

## 安装

本目录本身即一个完整 skill，复制到 WorkBuddy 的 skills 路径即可：

```bash
# 用户级（所有项目可用）
cp -r frontend-workflow-skills ~/.workbuddy/skills/frontend-workflow

# 或项目级（仅当前项目）
cp -r frontend-workflow-skills <项目根>/.workbuddy/skills/frontend-workflow
```

安装后在对话中触发（如"按前端工作流还原这个 Figma"）即可。`SKILL.md` 会先解析意图并按章节索引读取对应 `references/*.md`。

## 如何扩展

- **补充测试规则**：直接完善 `references/testing.md`（单元/组件/E2E/视觉回归的写法与 QA Checklist），无需改结构。
- **新增领域**：在 `references/` 下新增 `<domain>.md`，并在 `SKILL.md` 的「三、章节索引」登记指针与触发说明即可。
