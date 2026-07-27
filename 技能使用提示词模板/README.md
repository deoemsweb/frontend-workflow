# 技能使用提示词模板（全场景 / 全流程）

本目录是 `frontend-workflow` skill 的**用户侧调用入口**，按 skill 的能力分支与端到端流程组织，分为两个并列子目录：
- **`单Agent模式/`**：10 个单 agent 顺序执行的提示词模板（完整版 + 精简版 + 占位符说明），每模板底部含「多 Agent 模式（可选）」说明块。
- **[`多Agent模式/`](./多Agent模式/README.md)**：与单 agent 模板一一对应的 9 个独立多 agent 编排提示词模板，可粘贴即触发编排器调度。

单 agent 模板替换 `{{...}}` 后直接粘到对话即可触发对应分支；多 agent 模板无需追加触发句，粘贴即进入编排模式。

> **多 Agent 协作模式（可选，与单 agent 模式并存）**
> 本 skill 同时支持「单 agent 顺序执行」与「多 agent 编排」两种模式，二者**并存、互不冲突**。在单 agent 模板（`单Agent模式/` 下）提示词**开头追加「用多 agent / 团队协作模式」**，即可由编排器 `workflow-orchestrator`（`.agents/workflow-orchestrator.md`）按阶段 spawn 专职 agent 执行，并由状态机脚本（`scripts/`）管理 Gate 与产物交接；**不追加则按默认单 agent 顺序执行**（即直接用 `单Agent模式/` 下对应模板）。启用与否也可由编排器在意图解读阶段询问确认。`单Agent模式/` 各模板底部均含「多 Agent 模式」说明块，指向对应角色与 `references/multi-agent-orchestration.md`；`多Agent模式/` 则是已内联好编排指令的独立模板。

## 模板索引与选用指引

> 编号顺序对齐 SKILL.md 端到端工作流的阶段顺序：②还原 → ⑤PRD → ⑦b接口定义 → ⑨工程实现 → 测试 → 全流程。

| 文件（位于 `单Agent模式/`） | 覆盖场景 | 触发分支（reference） | 多 Agent 模式 | 何时用 |
|------|----------|----------------------|------------|--------|
| [01-Figma还原.md](./单Agent模式/01-Figma还原.md) | Figma 设计稿 → 静态页面 / 组件代码 | `figma-design-constraint.md` | 可选 · `figma-restorer` | 只做像素级还原、设计稿转代码、切图（阶段②） |
| [02-Figma原型转OpenSpec-PRD.md](./单Agent模式/02-Figma原型转OpenSpec-PRD.md) | Figma 原型 → OpenSpec PRD | `prototype-to-openspec-prd.md`（2.2） | 可选 · `prd-analyst` | 从 Figma 提炼需求规范 / 写 OpenSpec 提案（阶段⑤） |
| [03-MD原型文档转OpenSpec-PRD.md](./单Agent模式/03-MD原型文档转OpenSpec-PRD.md) | `.md` 原型需求文档 → OpenSpec PRD | `prototype-to-openspec-prd.md`（2.3） | 可选 · `prd-analyst` | 把 Markdown 需求草稿规范化为 OpenSpec（阶段⑤） |
| [04-开发计划活文档.md](./单Agent模式/04-开发计划活文档.md) | Figma / .md 原型 → 本地活文档 | `fw-dev-spec.md`（3.7 独立分支，3.2 OpenSpec 替代） | 可选 · `prd-analyst` | 原型转分层活文档（fw_dev_spec），五模块统一规范、单/多文档询问（不写 OpenSpec，供 ⑧⑨ 使用）；作为 02/03 PRD 的可切换替代方案，故紧随其后 |
| [05-Swagger接口定义生成.md](./单Agent模式/05-Swagger接口定义生成.md) | Swagger / open.json → 前端接口定义 | `api-definition-generation.md` | 可选 · `api-contractor` | 接口文档转前端 API 函数 / 类型 / JSDoc，或增量同步（阶段⑦b） |
| [06-业务文档接入与前端工程实现.md](./单Agent模式/06-业务文档接入与前端工程实现.md) | 业务文档接入 + 业务逻辑实现 / API / 状态 / 安全 | `frontend-engineering-standards.md`（第〇章 + 全文） | 可选 · `frontend-implementer` | 先经第〇章接入 OpenSpec / fw-dev-spec 业务文档并确认页面就绪，再按 tasks.md / 分步 Plan 逐步实现业务代码并更新进度（阶段⑧⑨） |
| [07-测试能力（待扩展）.md](./单Agent模式/07-测试能力（待扩展）.md) | 单元 / 组件 / E2E / 视觉回归 | `testing.md`（占位） | 占位 · `test-engineer`（规范未定稿，触发时提示先补） | 触发测试分支（**规则未定稿，需先补规范**） |
| [08-端到端全流程.md](./单Agent模式/08-端到端全流程.md) | 原型 → 交付 全链路 | 各 reference 协同 | 启用 · `workflow-orchestrator`（端到端默认多 agent） | 从 Figma/.md 一次走完还原→业务文档（⑤a 选定 OpenSpec / fw-dev-spec）→接口→第〇章前置编排→业务→验收 |
| [09-TAPD缺陷修复.md](./单Agent模式/09-TAPD缺陷修复.md) | TAPD 需求关联缺陷 / 批量修 bug | `tapd-bugfix-workflow.md`（3.6 独立分支） | 启用 · `tapd-bugfixer`（独立分支） | 拉取筛选缺陷、生成活文档计划并执行修复/通知（缺陷修复独立生命周期，不进 ②~⑫ 主流程） |
| [10-活文档关联OpenSpec.md](./单Agent模式/10-活文档关联OpenSpec.md) | 开发计划活文档 + OpenSpec 关联（3.7 可选增强） | `fw-dev-spec.md` 第九章（3.7 可选关联模式） | 可选 · `prd-analyst` | 生成 3.7 活文档时经【可选 Gate · OpenSpec 关联】开启关联：init 双向锚点 + 活文档同步钩子，模块②③④⑤ 变更以 delta 单向回写 OpenSpec（sync/check 校验）；默认不写 openspec/ |

> 「多 Agent 模式」列：`可选` = 在提示词开头追加「用多 agent / 团队协作模式」即可启用；`启用` = 该场景默认即走多 agent（端到端由编排器统一调度，TAPD 由 tapd-bugfixer 独立执行）；`占位` = 角色已定义但规范未定稿。多 agent 模式下编排器不亲自写生成类代码，只做 dispatch / Gate / 状态推进（详见 `references/multi-agent-orchestration.md` §二、§十二）。

### 📁 多 Agent 模式 · 独立提示词模板（本目录另设）

不想在单 agent 模板后手动追加触发句、希望直接拿到**一份可粘贴即触发多 agent 编排**的完整提示词？请移步 **[`多Agent模式/`](./多Agent模式/README.md)** 子目录：内含与上方 `01~09` **一一对应**的独立多 agent 模板（角色与阶段映射 + 模板A 完整版 + 模板B 一行触发 + 占位符说明 + 与单 agent 模板区别），覆盖 01 Figma 还原 / 02·03·04 PRD 与活文档 / 05 接口定义 / 06 工程实现 / 07 测试 / 08 端到端 / 09 TAPD。

## 通用协作约定（所有模板共通）

- **路由由 skill 完成**：提示词只需声明意图与输入，skill 的 `SKILL.md` 会判定分支并 `Read` 对应 `references/*.md`。
- **检查循环**：每个生成阶段后跑「生成 → 检查(Agent 只读) → 确认 Gate」，单环节最多回流 3 次，超出转人工介入。
- **人工 Gate 不可跳过**：Figma 还原的 ④、PRD 的 ⑦、接口定义的 ⑦c、业务的 ⑪、终验 ⑫ 必须等待用户确认。
- **严禁猜测**：接口契约 / 业务规则 / 字段含义未知时必须停下问，信息不足处标注 `> ⚠️ 待确认：...`。
- **安全硬约束全程生效**：XSS / 输入校验 / 敏感信息保护，无论需求是否体现都必须遵守。

## 与 skill 文档的对应关系

```
技能使用提示词模板/        ← 本目录（用户侧调用入口）
├── 单Agent模式/                ← 10 个单 agent 顺序执行模板（每模板底部含「多 Agent 模式」说明块）
│   └── 01~10 各场景模板（10 为 3.7 的可选 OpenSpec 关联增强）
├── 多Agent模式/                ← 9 个独立多 agent 编排模板（与单Agent模式一一对应）
│   └── 01~09-多Agent.md
└── README.md             ← 本索引
        ↑ 调用
frontend-workflow skill
├── SKILL.md                         路由层（意图解读 + 阶段调度 + 章节指针；2.2c 多 agent 编排入口）
├── README.md / frontend-workflow-usage.md   能力索引与本项目适配
├── references/
│   ├── figma-design-constraint.md       ① Figma 还原
│   ├── prototype-to-openspec-prd.md     ② 原型(Figma/.md) → OpenSpec PRD
│   ├── frontend-engineering-standards.md ③ 工程规范
│   ├── api-definition-generation.md     ④ Swagger → 接口定义生成
│   ├── testing.md                       ⑤ 测试（占位）
│   ├── tapd-bugfix-workflow.md          ⑥ TAPD 缺陷修复（独立分支，3.6）
│   ├── fw-dev-spec.md                   ⑦ 开发计划活文档（独立分支，3.7，OpenSpec 替代）
│   └── multi-agent-orchestration.md    ⚙ 多 agent 编排协议（角色清单 / 阶段映射 / 状态机 / 敏感操作）
├── .agents/                           ⚙ 多 agent 模式下的 8 个专职角色（workflow-orchestrator / figma-restorer / prd-analyst / api-contractor / frontend-implementer / qa-reviewer / tapd-bugfixer / test-engineer）
└── scripts/                          ⚙ 状态机脚本（create/validate/advance-fw-phase.cjs 等）
```

> ⚙ = 多 agent 编排层。多 agent 模式与「直接 `Read` 单个 reference」的单 agent 模式并存，模板本身不改任何 reference 规则正文，只决定由谁（单 agent / 编排器+专职 agent）来执行。
