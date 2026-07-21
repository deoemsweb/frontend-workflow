# 技能使用提示词模板（全场景 / 全流程）

本目录汇集 `frontend-workflow` skill 在各场景下的**提示词模板**，按 skill 的能力分支与端到端流程组织。每个模板含「完整版（带占位符与硬约束）」+「精简版（一行触发）」+ 占位符说明，替换 `{{...}}` 后直接粘到对话即可触发对应分支。

## 模板索引与选用指引

> 编号顺序对齐 SKILL.md 端到端工作流的阶段顺序：②还原 → ⑤PRD → ⑦b接口定义 → ⑨工程实现 → 测试 → 全流程。

| 文件 | 覆盖场景 | 触发分支（reference） | 何时用 |
|------|----------|----------------------|--------|
| [01-Figma还原.md](./01-Figma还原.md) | Figma 设计稿 → 静态页面 / 组件代码 | `figma-design-constraint.md` | 只做像素级还原、设计稿转代码、切图（阶段②） |
| [02-Figma原型转OpenSpec-PRD.md](./02-Figma原型转OpenSpec-PRD.md) | Figma 原型 → OpenSpec PRD | `prototype-to-openspec-prd.md`（2.2） | 从 Figma 提炼需求规范 / 写 OpenSpec 提案（阶段⑤） |
| [03-MD原型文档转OpenSpec-PRD.md](./03-MD原型文档转OpenSpec-PRD.md) | `.md` 原型需求文档 → OpenSpec PRD | `prototype-to-openspec-prd.md`（2.3） | 把 Markdown 需求草稿规范化为 OpenSpec（阶段⑤） |
| [04-开发计划活文档.md](./04-开发计划活文档.md) | Figma / .md 原型 → 本地活文档 | `fw-dev-spec.md`（3.7 独立分支，3.2 OpenSpec 替代） | 原型转分层活文档（fw_dev_spec），五模块统一规范、单/多文档询问（不写 OpenSpec，供 ⑧⑨ 使用）；作为 02/03 PRD 的可切换替代方案，故紧随其后 |
| [05-Swagger接口定义生成.md](./05-Swagger接口定义生成.md) | Swagger / open.json → 前端接口定义 | `api-definition-generation.md` | 接口文档转前端 API 函数 / 类型 / JSDoc，或增量同步（阶段⑦b） |
| [06-前端工程规范实现.md](./06-前端工程规范实现.md) | 业务逻辑实现 / API / 状态 / 安全 | `frontend-engineering-standards.md` | 在静态页 / PRD 基础上写业务代码（阶段⑨） |
| [07-测试能力（待扩展）.md](./07-测试能力（待扩展）.md) | 单元 / 组件 / E2E / 视觉回归 | `testing.md`（占位） | 触发测试分支（**规则未定稿，需先补规范**） |
| [08-端到端全流程.md](./08-端到端全流程.md) | 原型 → 交付 全链路 | 各 reference 协同 | 从 Figma/.md 一次走完还原→PRD→接口→业务→验收 |
| [09-TAPD缺陷修复.md](./09-TAPD缺陷修复.md) | TAPD 需求关联缺陷 / 批量修 bug | `tapd-bugfix-workflow.md`（3.6 独立分支） | 拉取筛选缺陷、生成活文档计划并执行修复/通知（缺陷修复独立生命周期，不进 ②~⑫ 主流程） |

## 通用协作约定（所有模板共通）

- **路由由 skill 完成**：提示词只需声明意图与输入，skill 的 `SKILL.md` 会判定分支并 `Read` 对应 `references/*.md`。
- **检查循环**：每个生成阶段后跑「生成 → 检查(Agent 只读) → 确认 Gate」，单环节最多回流 3 次，超出转人工介入。
- **人工 Gate 不可跳过**：Figma 还原的 ④、PRD 的 ⑦、接口定义的 ⑦c、业务的 ⑪、终验 ⑫ 必须等待用户确认。
- **严禁猜测**：接口契约 / 业务规则 / 字段含义未知时必须停下问，信息不足处标注 `> ⚠️ 待确认：...`。
- **安全硬约束全程生效**：XSS / 输入校验 / 敏感信息保护，无论需求是否体现都必须遵守。

## 与 skill 文档的对应关系

```
技能使用提示词模板/        ← 本目录（用户侧调用入口）
├── 01~09 各场景模板
└── README.md             ← 本索引
        ↑ 调用
frontend-workflow skill
├── SKILL.md                         路由层（意图解读 + 阶段调度 + 章节指针）
├── README.md / frontend-workflow-usage.md   能力索引与本项目适配
└── references/
    ├── figma-design-constraint.md       ① Figma 还原
    ├── prototype-to-openspec-prd.md     ② 原型(Figma/.md) → OpenSpec PRD
    ├── frontend-engineering-standards.md ③ 工程规范
    ├── api-definition-generation.md     ④ Swagger → 接口定义生成
    ├── testing.md                       ⑤ 测试（占位）
    ├── tapd-bugfix-workflow.md          ⑥ TAPD 缺陷修复（独立分支，3.6）
    └── fw-dev-spec.md                   ⑦ 开发计划活文档（独立分支，3.7，OpenSpec 替代）
```
