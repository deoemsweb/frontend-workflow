# 技能使用提示词模板（全场景 / 全流程）

本目录汇集 `frontend-workflow` skill 在各场景下的**提示词模板**，按 skill 的能力分支与端到端流程组织。每个模板含「完整版（带占位符与硬约束）」+「精简版（一行触发）」+ 占位符说明，替换 `{{...}}` 后直接粘到对话即可触发对应分支。

## 模板索引与选用指引

| 文件 | 覆盖场景 | 触发分支（reference） | 何时用 |
|------|----------|----------------------|--------|
| [01-Figma还原.md](./01-Figma还原.md) | Figma 设计稿 → 静态页面 / 组件代码 | `figma-design-constraint.md` | 只做像素级还原、设计稿转代码、切图 |
| [02-Figma原型转OpenSpec-PRD.md](./02-Figma原型转OpenSpec-PRD.md) | Figma 原型 → OpenSpec PRD | `prototype-to-openspec-prd.md`（2.2） | 从 Figma 提炼需求规范 / 写 OpenSpec 提案 |
| [03-MD原型文档转OpenSpec-PRD.md](./03-MD原型文档转OpenSpec-PRD.md) | `.md` 原型需求文档 → OpenSpec PRD | `prototype-to-openspec-prd.md`（2.3） | 把 Markdown 需求草稿规范化为 OpenSpec |
| [04-前端工程规范实现.md](./04-前端工程规范实现.md) | 业务逻辑实现 / API / 状态 / 安全 | `frontend-engineering-standards.md` | 在静态页 / PRD 基础上写业务代码 |
| [05-测试能力（待扩展）.md](./05-测试能力（待扩展）.md) | 单元 / 组件 / E2E / 视觉回归 | `testing.md`（占位） | 触发测试分支（**规则未定稿，需先补规范**） |
| [06-端到端全流程.md](./06-端到端全流程.md) | 原型 → 交付 全链路 12 阶段 | 三个 reference 协同 | 从 Figma/.md 一次走完还原→PRD→业务→验收 |

## 通用协作约定（所有模板共通）

- **路由由 skill 完成**：提示词只需声明意图与输入，skill 的 `SKILL.md` 会判定分支并 `Read` 对应 `references/*.md`。
- **检查循环**：每个生成阶段后跑「生成 → 检查(Agent 只读) → 确认 Gate」，单环节最多回流 3 次，超出转人工介入。
- **人工 Gate 不可跳过**：Figma 还原的 ④、PRD 的 ⑦、业务的 ⑪、终验 ⑫ 必须等待用户确认。
- **严禁猜测**：接口契约 / 业务规则 / 字段含义未知时必须停下问，信息不足处标注 `> ⚠️ 待确认：...`。
- **安全硬约束全程生效**：XSS / 输入校验 / 敏感信息保护，无论需求是否体现都必须遵守。

## 与 skill 文档的对应关系

```
技能使用提示词模板/        ← 本目录（用户侧调用入口）
├── 01~06 各场景模板
└── README.md             ← 本索引
        ↑ 调用
frontend-workflow skill
├── SKILL.md                         路由层（意图解读 + 阶段调度 + 章节指针）
├── README.md / frontend-workflow-usage.md   能力索引与本项目适配
└── references/
    ├── figma-design-constraint.md       ① Figma 还原
    ├── prototype-to-openspec-prd.md     ② 原型(Figma/.md) → OpenSpec PRD
    ├── frontend-engineering-standards.md ③ 工程规范
    └── testing.md                       ④ 测试（占位）
```
