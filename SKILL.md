---
name: frontend-workflow
description: 统一前端开发工作流 skill：覆盖 Figma 设计稿像素级还原、Figma 原型转 OpenSpec PRD、前端工程通用规范（类型安全/API/状态/安全/性能）、Swagger 接口定义生成、测试能力（待扩展）、TAPD 缺陷修复全流程、开发计划活文档（fw_dev_spec）生成，以及多 agent 编排（状态机门控 / 阶段推进与回退）。当用户要求 Figma 还原、设计稿转代码、高保真还原、切图、Figma→OpenSpec PRD、生成需求文档、前端工程规范、类型/API/状态/安全、端到端还原设计稿并实现业务、按前端工作流开发、写单测/组件测试/E2E、TAPD 缺陷修复、修复 bug、缺陷修复、tapd bugfix、需求关联缺陷、批量修 bug、开发计划活文档、fw_dev_spec、dev spec、原型转开发计划、原型转活文档、需求开发计划、多 agent 编排、工作流返工/阶段回退、技能提示词模板、活文档关联 OpenSpec、活文档同步 OpenSpec、初始化 OpenSpec 关联、fw-dev-spec 同步 OpenSpec 时使用此 skill。
---

# 前端开发工作流（统一 Skill）

本 skill 是 `frontend-workflow-skills` 合集合并后的**单一入口**。它将原先分散的 4 个 skill 整合为一个目录，规则正文拆到 `references/` 子文件，按需在运行时读取，兼顾「一次安装」与「上下文不臃肿」。

自身职责只有三件：**解读意图、按阶段调度（指向对应 reference，多 agent 模式下 spawn 对应 `.agents/` 角色）、管理检查循环与人工确认点**。

> **多 agents 模式**：本 skill 支持两种执行模式——①单 agent 顺序执行（默认，自己按阶段表推进并 `Read` 对应 reference）；②多 agent 编排（编排器按阶段 spawn `.agents/` 专职角色执行）。启用与否在意图解读阶段与用户确认。多 agent 编排协议（角色清单、阶段↔agent 映射、上下文传递 schema、状态机门控、敏感操作清单）见 `references/multi-agent-orchestration.md`。

---

## 一、何时使用（触发条件）

命中以下任一情境即触发本 skill，并先读取「三、章节索引」定位到对应 `references/*.md`：

- **Figma 还原类**：Figma 还原 / UI 还原 / 高保真还原 / 设计稿转代码 / Figma to Code / 切图
- **Figma→PRD 类**：从 Figma 生成 PRD / Figma 转 OpenSpec / 生成需求规格 / 写 OpenSpec 提案 / 需求拆解为 specs 与 tasks
- **原型文档→PRD 类**：根据 `.md` 格式原型需求文档 / PRD 草稿生成 OpenSpec 规范 / 把 .md 需求文档规范化为 OpenSpec / 需求拆解为 specs 与 tasks
- **工程规范类**：编写/重构前端代码、集成 API、状态管理、前端安全、性能优化、代码注释、AI 不确定时处理
- **接口定义生成类**：根据 Swagger / open.json / swagger.json 生成接口定义、接口文档转前端 API 方法、OpenAPI 转 TypeScript interface / JSDoc 类型、接口文档增量同步
- **测试类**：写单元测试 / 组件测试 / E2E / 视觉回归（见 `references/testing.md`，待扩展）
- **缺陷修复类**：TAPD 缺陷修复 / 修复 bug / 缺陷修复 / tapd bugfix / 需求关联缺陷 / 批量修 bug（独立分支，见 `references/tapd-bugfix-workflow.md`，不进入下列 12 阶段主流程）
- **开发计划活文档类**：开发计划活文档 / fw_dev_spec / dev spec / 原型转开发计划 / 原型转活文档 / 需求开发计划（独立分支，见 `references/fw-dev-spec.md`；是「原型→OpenSpec PRD」的可切换替代方案，产出本地活文档供 ⑧⑨ 实现使用，默认不写 OpenSpec 文件）；可选「OpenSpec 关联模式」开启后单向同步到 OpenSpec 并建立双向锚点（见 fw-dev-spec.md 第九章）
- **端到端类**：从 Figma 生成完整页面（含业务逻辑）、按前端工作流开发、端到端还原设计稿并实现业务绑定

> 子领域规则**不内联**在本文件，命中分支后**必须 `Read` 对应 `references/*.md`** 再执行，本文件只做路由与上下文编排。

### 1.1 提示词模板（用户侧快速入口）

`技能使用提示词模板/` 目录把上述各能力分支封装为**可直接复制粘贴的触发提示词**，替换 `{{...}}` 占位符即可使用：

- `技能使用提示词模板/README.md`：目录索引与选用指引（模板 ↔ 本文件路由 ↔ references ↔ `.agents/` 的对应关系）
- `单Agent模式/`：01-Figma还原 ~ 10-活文档关联OpenSpec 共 10 个模板（10 为 3.7 的可选 OpenSpec 关联增强），每个含「完整版 + 精简版 + 占位符说明」
- `多Agent模式/`：与单 Agent 模板一一对应的 9 个多 agent 编排提示词（01~09-多Agent）+ README，粘贴即触发编排器调度

单 Agent 模板开头追加「用多 agent / 团队协作模式」即可切换到多 Agent 调度。

### 1.2 项目适配用法文档

`frontend-workflow-usage.md` 是针对具体项目的**适配落地手册**（当前为 Vue2.6 + JS + Webpack + ElementUI2 + SCSS 项目），含 Skill 默认写法（Vue3+TS）到项目实际写法（Vue2+JS）的映射表、各分支使用要点与生成后检查清单。当目标项目技术栈与 Skill 默认不一致时，先读取该文档确认输出语法适配。

---

## 二、统一调度路由

### 2.1 第一件事：解读用户意图

收到请求后先判断任务边界，输出**意图清单**供用户确认：

| 判断维度 | 说明 |
|---------|------|
| 任务范围 | 单页面 / 多页面 / 整模块；是否含业务逻辑实现 |
| 输入物 | Figma 链接 / 截图 / 节点 key；是否已有 Swagger API JSON |
| 目标产物 | 静态页面代码 / OpenSpec PRD / 业务逻辑绑定 / 全流程 |
| 起止阶段 | 从哪个环节开始（如已有静态页面则跳过②③）、到哪个环节结束 |
| 技术栈 | Vue2 / Vue3 / React / 原生 / 小程序（决定各 reference 的输出语法） |

意图不明确时**停止并询问**，不自行假设起止点。

### 2.2 第二件事：按阶段调度（读取对应 reference）

按下表顺序推进；每个阶段**先 `Read` 对应 `references/*.md`**，把上阶段产物作为下阶段输入。**多 agent 模式**下由编排器 spawn「负责 Agent」列的 `.agents/` 角色执行；单 agent 模式下由同一 agent 按阶段自行执行。

| 阶段 | 负责 Agent（多 agent 模式） | 读取的 reference | 输入 | 产物 |
|------|------|------------------|------|------|
| ② 生成静态页面 | `figma-restorer` | `references/figma-design-constraint.md` + `references/frontend-engineering-standards.md` | Figma 设计稿 | 静态页面代码 |
| ③ 检查 | `qa-reviewer`（只读） | `references/figma-design-constraint.md`（第十章 QA Checklist） | 静态页面代码 | 偏差报告 |
| ④ 确认 | 编排器（人工 Gate） | 人工 | 偏差报告 + 页面 | 验收结论 |
| ⑤a 业务文档方案确认 | 编排器（人工 Gate） | 人工 | 原型来源 + 项目环境 | 选定 OpenSpec（02/03）或 fw-dev-spec 活文档（04） |
| ⑤ 生成业务文档 | `prd-analyst` | 按 ⑤a 选定：`references/prototype-to-openspec-prd.md`（OpenSpec）或 `references/fw-dev-spec.md`（活文档） | 原型（Figma / .md）+ Swagger JSON | OpenSpec specs / proposal / tasks，或 fw_dev_spec 活文档 |
| ⑥ 检查 | `qa-reviewer`（只读） | 按 ⑤a 选定：`references/prototype-to-openspec-prd.md`（第八章清单）或 `references/fw-dev-spec.md`（质量校验清单） | 业务文档 | 偏差报告 |
| ⑦ 确认 | 编排器（人工 Gate） | 人工 | 业务文档 | 需求确认 |
| ⑦b⑦c 接口定义生成+验收 | `api-contractor` | `references/api-definition-generation.md` | Swagger open.json + 项目既有接口模式 | 接口定义文件（函数+类型+JSDoc），验收后 `gateChecks.apiConfirmed=true` |
| ⑧a 第〇章前置编排 | `frontend-implementer` | `references/frontend-engineering-standards.md`（第〇章） | 已确认业务文档 + 根目录探测 | 业务文档来源确认 + 页面/路由就绪结论 |
| ⑧ 设计桥梁 | `frontend-implementer` | `references/frontend-engineering-standards.md`（经第〇章后） | 业务文档（OpenSpec tasks.md / fw-dev-spec 活文档） | 组件树 / 状态 / 数据流草案 |
| ⑨ 生成业务逻辑 | `frontend-implementer` | `references/frontend-engineering-standards.md` | 设计草案 + 已就绪静态页面 | 业务逻辑代码 |
| ⑩ 检查 | `qa-reviewer`（只读） | `references/frontend-engineering-standards.md`（工程硬约束 + 非功能质量） | 业务逻辑代码 | 偏差报告 |
| ⑪ 确认 | 编排器（人工 Gate） | 人工 | 业务代码 | 业务验收 |
| ⑫ 终验 | 编排器（人工 Gate） | 人工 | 全部产物 | 交付 |

> 阶段顺序固定；如需跳过某阶段（如已有静态页面），须在意图解读阶段与用户确认后记录。各 reference 仍可独立读取使用（不经过本路由）。

### 2.2b 独立分支（不进入 12 阶段主流程）

部分能力是独立的生命周期（如 **3.6 TAPD 缺陷修复**、**3.7 开发计划活文档**），与「设计稿→PRD→实现」主流程无顺序耦合。命中此类分支时**不套用上表 ②~⑫**，而是直接 `Read` 对应 reference 按其内部阶段执行：
- **3.6 TAPD 缺陷修复**：`Read` `references/tapd-bugfix-workflow.md`；内部「前端代码修复」步骤复用 3.3 工程规范（UI 类加 3.1 视觉约束）；自带人工 Gate（缺陷筛选确认、验证后更新状态）。
- **3.7 开发计划活文档**：`Read` `references/fw-dev-spec.md`；是 3.2 OpenSpec PRD 的**可切换替代**，把 Figma / `.md` 原型转为项目根 `fw_dev_spec/<需求名-日期>/` 下的分层活文档（原型放子目录根、活文档放 `specs/`），默认不写 OpenSpec 文件；产出的活文档经 3.3 第〇章（业务文档接入与前置编排）被探测并确认为 ⑧⑨ 的需求依据；自带人工 Gate（Figma→.md 原型审阅、目录新建确认、组织形式单文档/多文档选择）；可选新增「OpenSpec 关联 Gate」（fw-dev-spec.md 第九章）：用户确认后单向同步到 OpenSpec 并建立双向锚点。

### 2.2c 多 agent 编排（可选模式）

默认单 agent 顺序执行即可；当用户明确要求"多 agent / 团队协作"，或端到端全流程任务启用多 agent 模式时，按本节执行。**编排协议的细节（角色清单、上下文 schema、产出物命名、状态机脚本用法、敏感操作清单）以 `references/multi-agent-orchestration.md` 为准**，本节只做入口指引。

1. **编排器角色**：由 `workflow-orchestrator`（见 `.agents/workflow-orchestrator.md`）承担，对应本 skill 三职责。编排器**不亲自写生成类代码**，只做 dispatch、人工 Gate 管理、状态推进与敏感操作统一询问。
2. **初始化工作流**：确认启用后调用 `node scripts/create-fw-workflow.cjs <任务名> [--start <内部phase>] [--title "..."] [--biz-doc <openspec|fw-dev-spec|skip>]` 创建状态文件（`.codebuddy/plans/<任务名>-fw-state.json`），脚本返回 `nextAgent`。`--start` 之前的阶段标记为 `skipped`，在 validate/advance 时**不校验其产物**；`--biz-doc` 把业务文档方案预选写入状态文件供下游读取。
3. **按阶段 spawn**：用 Task 工具 spawn 2.2 表「负责 Agent」列的 `.agents/` 角色；dispatch 提示词用编排协议 §八 模板（含任务上下文、必读 reference、输入、交付物、横切安全约束、敏感操作上报）。
4. **门控推进**：每阶段产物就绪且人工 Gate 通过后，调用 `node scripts/advance-fw-phase.cjs <任务名> <目标内部phase>` 推进；脚本内置门控校验（产出物/前置阶段/待确认项/gateChecks），失败不得强行推进。推进前可单独用 `node scripts/validate-fw-phase-gate.cjs <任务名> <目标phase>` 预检。
5. **阶段回退（返工）**：人工 Gate 判定 [返工] 时，调用 `node scripts/rollback-fw-phase.cjs <任务名> <目标内部phase>` 回退状态机（仅允许后向回退：目标 phase < 当前 phase）；回退区间内的阶段重置为 pending、目标阶段置 running，**已完成阶段的产物文件不删除**，脚本返回 `nextAgent`（见编排协议 §9.6）。
6. **人工 Gate 置位**：获用户确认后，将状态文件对应 `gateChecks`（`staticConfirmed/docConfirmed/apiConfirmed/bizConfirmed`）置 `true`，门控才放行后续生成阶段。状态文件另有 `pendingConfirmations[]`（`{id, question, resolved, source}`）记录待确认项，存在未 `resolved` 项时门控同样阻断推进。
7. **只读检查**：③⑥⑩ 由 `qa-reviewer` 执行，只读不写，产出结构化偏差报告；回流上限 3 次，超出转人工介入。
8. **敏感操作**：git/删除/批量替换/TAPD 写操作/npm 脚本/部署等，任何 agent 执行前必须上报编排器，由编排器统一向用户询问（见编排协议 §六）。

> 状态机内部用顺序整数 phase（0~10）存储，与展示编号 ②~⑫ 的双向映射集中在 `scripts/workflow-state-utils.cjs`（⑦b⑦c 已合并为单一 phase 6）。

### 2.3 第三件事：管理检查循环与人工确认点

**检查报告格式（强制结构化）**：

```
[偏差报告]
- 文件路径: src/components/UserCard.vue
- 行号: 12-18
- 规则来源: references/figma-design-constraint.md · 第十章 颜色与视觉
- 偏差描述: 按钮背景色 #2563eb，Figma 为 #3b82f6
- 修复建议: 改为 var(--color-primary)
- 严重级别: 高 / 中 / 低
```

**回流次数上限**：每个检查阶段最多回流 3 次；第 3 次仍未通过则标记「人工介入」，停止自动循环。

**人工 Gate 提示**：到达确认环节（④⑤a⑦⑦b⑦c⑧a⑪⑫；其中 ⑤a/⑧a 为所在阶段的**内嵌 Gate**，非独立 phase）必须暂停并提示用户：

```
【人工 Gate · 阶段 X】
- 当前阶段：<阶段名>
- 待确认产物：<文件 / 页面 / 文档>
- 检查结论：<通过 / 人工介入 / 偏差清单摘要>
- 请确认：[通过] / [返工] / [调整范围]
```

未经用户确认，不得进入下一阶段。用户选择 **[返工]** 时：单 agent 模式回到对应生成阶段重做；多 agent 模式**必须**调用 `node scripts/rollback-fw-phase.cjs <任务名> <目标内部phase>` 形式化回退状态机后再重新 dispatch，不得仅口头返工。

### 2.4 上下文传递规范

| 上下文项 | 用途 |
|---------|------|
| Figma 节点 ID / Frame key | 定位设计稿来源 |
| 代码片段 + 文件路径 + 行号 | 检查报告锚点 |
| 上一轮检查报告 | 避免重复偏差、追踪修复进度 |
| 技术栈判断结果 | 贯穿所有生成阶段 |
| Swagger open.json 路径 / URL | 接口定义生成阶段的输入源 |
| 项目接口模式画像 | 接口定义生成的命名/注释/归类依据，贯穿该阶段 |
| PRD capability / change-id | 业务逻辑阶段回溯需求 |
| 业务文档方案选择结果 | 第〇章确认的需求依据（OpenSpec / fw-dev-spec / 跳过），贯穿⑧⑨⑩ |
| OpenSpec 关联模式状态 / change-id | fw-dev-spec 关联模式下回写 OpenSpec 的关联标识（开启/未开启 + openspec change-id），贯穿关联模式校验与 sync |
| TAPD 需求 ID / workspace_id | 缺陷修复分支（3.6）定位 TAPD 实体、复用 `.bugfix-workflow/` 活文档计划 |

### 2.5 边界与约束

- **不内联规则正文**：本文件只路由与编排；视觉 / 工程 / PRD 的专业判断由对应 `references/*.md` 负责，使用前先 `Read`。
- **不跳过人工 Gate**：④⑤a⑦⑦c⑧a⑪⑫ 必须人工确认（⑤a 是 ⑤ 的内嵌 Gate、⑧a 是 ⑧ 的内嵌 Gate，非独立 phase），即使检查报告通过。
- **不自行扩展阶段**：阶段顺序固定，跳过须在意图解读阶段确认。
- **安全规则为硬约束**：`references/frontend-engineering-standards.md` 第四章（XSS / 输入校验 / 敏感信息）无论设计稿是否体现均须遵守。
- **多 agent 模式下编排器不写生成类代码**：②⑤⑦b⑦c⑧⑨ 的生成工作必须 dispatch 给对应 `.agents/` 角色；编排器只做调度、Gate 与状态推进。
- **敏感操作统一询问**：多 agent 模式下，git/删除/批量替换/TAPD 写操作/npm 脚本/部署等敏感操作，由编排器统一向用户询问后执行（见 `references/multi-agent-orchestration.md` §六）。

---

## 三、章节索引（懒加载指针）

命中对应分支时，**先 `Read` 该文件再执行**；各文件内含完整章节、QA Checklist 与质量校验清单。

- **3.1 Figma 还原约束** → `references/figma-design-constraint.md`
  - 核心规则 / Design Token / 节点映射 / 精确测量 / a11y / 代码组织 / 资源导出 / 组件库共存 / Dev Mode / QA Checklist / 边界情况 / 技术栈与项目类型适配 / 工作流 / 错误示例
- **3.2 原型（Figma / .md）→ OpenSpec PRD** → `references/prototype-to-openspec-prd.md`
  - 输入源判定（Figma 或 .md）/ Figma 读取 / .md 原型文档读取与结构映射 / 需求分析要素 / OpenSpec 环境检查 / 文档结构写法 / PRD 生成 / 变更更新 / 拆解策略 / 质量校验清单 / 协作关系 / 边界与不确定处理
- **3.3 前端工程通用规范** → `references/frontend-engineering-standards.md`
  - 第〇章 业务文档接入与前置编排（根目录标准探测 / 业务文档方案推荐与询问 / 无文档转交 02/03/04 / 页面路由校验 / 衔接⑧⑨⑩）→ 类型安全 / API 集成 / 状态管理 / 安全约束 / 性能优化 / 注释文档 / AI 不确定时处理协议
- **3.4 Swagger → 接口定义生成** → `references/api-definition-generation.md`
  - Swagger 解析 / 项目既有模式自动探测 / 模式画像确认 / 生成规则（命名/注释/类型/模块归类）/ 多技术栈适配 / 增量更新与冲突处理 / 鉴权与拦截器 / 质量校验清单 / 边界与不确定处理 / 协作关系
- **3.5 测试能力（待扩展）** → `references/testing.md`
  - 单元 / 组件 / E2E / 视觉回归 骨架占位，正式规则待补充
- **3.6 TAPD 缺陷修复（独立分支）** → `references/tapd-bugfix-workflow.md`
  - 阶段零（MCP 连通性探针）+ 5 主阶段：提取 workspace_id（`scripts/extract_workspace_id.py`）/ 读取筛选缺陷（`references/tapd-tool-params.md`）/ 生成活文档计划（`references/tapd-plan-template.md` + `references/tapd-grouping-rules.md`）/ 执行修复与发评论 / 验证后更新状态
  - 4.1 前端代码修复复用 `references/frontend-engineering-standards.md`（UI 类 Bug 加 `references/figma-design-constraint.md`），继承安全硬约束与工程规范
- **3.7 开发计划活文档（独立分支，3.2 OpenSpec 的可切换替代）** → `references/fw-dev-spec.md`
  - 输入读取与需求分析交叉引用 `references/prototype-to-openspec-prd.md`（2.2/2.3/2.4/第十章）；Figma 输入先转为 `.md` 原型经审阅 Gate 后存放
  - 目录：`fw_dev_spec/<需求名>-<YYYY-MM-DD>/`（原型默认文件名 `原需求-原型.md` 放子目录根、活文档放 `specs/`），复用 `references/tapd-plan-template.md` 的 `⬜/🔄/✅/⏭` 活文档进度约定
  - 统一输出五模块：当前项目说明 / 需求功能模块设计（含原需求原型关联锚点）/ 分步开发计划 / 整体进度记录 / 变更日志；单文档或多 spec 文档按需求大小询问用户
  - 可选「OpenSpec 关联模式」见第九章（单向同步 + 双向锚点 + 活文档同步钩子 `scripts/sync-fw-openspec.cjs` 的 init/sync/check）
- **3.8 多 agent 编排协议（编排层，可选模式）** → `references/multi-agent-orchestration.md`
  - 8 个 `.agents/` 角色清单与职责边界 / 阶段↔agent↔reference↔产物映射 / agent 间上下文传递 schema / 产出物命名约定 / 状态机脚本（create/validate/advance/rollback）使用说明 / §9.6 阶段回退（返工）协议 / 敏感操作统一询问清单 / dispatch 提示词模板 / 只读约束与回流上限
  - 角色定义见 `.agents/`：`workflow-orchestrator`（编排器）、`figma-restorer`（②）、`prd-analyst`（⑤）、`api-contractor`（⑦b⑦c）、`frontend-implementer`（⑧⑨）、`qa-reviewer`（③⑥⑩只读）、`tapd-bugfixer`（3.6）、`test-engineer`（3.5 占位）
- **3.9 提示词模板与项目适配（用户侧入口）** → `技能使用提示词模板/README.md` + `frontend-workflow-usage.md`
  - `单Agent模式/`（01~10 共 10 个模板，含 10-活文档关联OpenSpec）与 `多Agent模式/`（01~09-多Agent 共 9 个模板 + README；10 号无独立多 Agent 模板，其多 agent 执行复用 `prd-analyst` 说明，见 `技能使用提示词模板/单Agent模式/10-活文档关联OpenSpec.md`），替换 `{{...}}` 占位符即可粘贴触发（见 1.1）
  - `frontend-workflow-usage.md`：具体项目技术栈适配手册（Vue3+TS 默认写法 → Vue2+JS 映射、各分支使用要点、生成后检查清单，见 1.2）

> 关系：3.2 是上游 PRD 产出（specs/tasks）；3.4（接口定义生成）是 PRD 与实现之间的「接口契约接入」桥梁，依据 Swagger 生成接口函数/类型供下游调用；3.1 与 3.3 是下游实现（视觉还原 + 工程规范）；3.6（缺陷修复）是独立的「开发后维护」生命周期分支，不进入 ②~⑫ 主流程，但其前端代码修复步骤复用 3.3 工程规范（UI 类加 3.1），并借助 `.bugfix-workflow/` 活文档实现中断恢复。各分支共享同一 Figma / Swagger / TAPD 数据源但产物不同、互不重叠。
