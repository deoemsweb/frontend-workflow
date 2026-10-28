---
name: frontend-workflow
version: 1.4.0
description: 前端开发全流程技能：Figma 设计稿像素级还原、原型转 OpenSpec PRD、前端工程规范（类型/API/状态/安全/性能）、Swagger 接口定义生成、测试与用例生成（两段式，Playwright E2E/单元/组件/视觉回归）、TAPD 缺陷修复、fw_dev_spec 开发计划活文档、多 agent 编排与需求追问澄清。当用户要求 Figma 还原/设计稿转代码、Figma 或 .md 转 OpenSpec PRD、按前端工作流开发、Swagger 接口定义、写测试/生成用例、TAPD 缺陷修复/tapd bugfix、fw_dev_spec 活文档、多 agent 编排、需求拷问/grill 时使用。
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
- **测试类**：写单元测试 / 组件测试 / E2E / 视觉回归、生成测试用例（见 `references/testing.md`，两段式：用例文档→人工 Gate→可执行代码；E2E 走 `scripts/testing/` Playwright 执行层）
- **缺陷修复类**：TAPD 缺陷修复 / 修复 bug / 缺陷修复 / tapd bugfix / 需求关联缺陷 / 批量修 bug（独立分支，见 `references/tapd-bugfix-workflow.md`，不进入下列 ②~⑫ 主流程）
- **开发计划活文档类**：开发计划活文档 / fw_dev_spec / dev spec / 原型转开发计划 / 原型转活文档 / 需求开发计划（独立分支，见 `references/fw-dev-spec.md`；是「原型→OpenSpec PRD」的可切换替代方案，产出本地活文档供 ⑧⑨ 实现使用，默认不写 OpenSpec 文件）；可选「OpenSpec 关联模式」开启后单向同步到 OpenSpec 并建立双向锚点（见 fw-dev-spec.md 第九章）
- **端到端类**：从 Figma 生成完整页面（含业务逻辑）、按前端工作流开发、端到端还原设计稿并实现业务绑定
- **进程回收类**：本地自测进程回收 / dev server 未关闭 / 端口被占用 / 自测服务残留清理（见 `references/cross-cutting.md` 五 + `scripts/fw-process.cjs`）

> 子领域规则**不内联**在本文件，命中分支后**必须 `Read` 对应 `references/*.md`** 再执行，本文件只做路由与上下文编排。

### 1.1 提示词模板（用户侧快速入口）

`技能使用提示词模板/` 目录把上述各能力分支封装为**可直接复制粘贴的触发提示词**，替换 `{{...}}` 占位符即可使用：

- 模板清单、数量与选用指引**以 `技能使用提示词模板/README.md` 为唯一来源**（含模板 ↔ 本文件路由 ↔ references ↔ `.agents/` 映射），本文件不再重复枚举
- 模板分「单 Agent 模式」（各能力分支的完整版 + 精简版 + 占位符说明）与「多 Agent 模式」（对应编排提示词 + README）两类
- 单 Agent 模板开头追加「用多 agent / 团队协作模式」即可切换到多 Agent 调度（端到端模板默认即多 agent，无需追加）

### 1.2 项目适配用法文档

`frontend-workflow-usage.md` 是针对具体项目的**适配落地手册**（当前为 Vue2.6 + JS + Webpack + ElementUI2 + SCSS 项目），含 Skill 默认写法（Vue3+TS）到项目实际写法（Vue2+JS）的映射表、各分支使用要点与生成后检查清单。当目标项目技术栈与 Skill 默认不一致时，先读取该文档确认输出语法适配。

---

## 二、统一调度路由

### 2.1 第一件事：解读用户意图（按 grilling 追问协议）

收到请求后先判断任务边界。**可自查的事实先自查**（技术栈/目录/既有依赖/业务文档存在性等，见 `references/grilling.md` 第五章），再输出**意图清单**供用户确认：

| 判断维度 | 说明 |
|---------|------|
| 任务范围 | 单页面 / 多页面 / 整模块；是否含业务逻辑实现 |
| 输入物 | Figma 链接 / 截图 / 节点 key；是否已有 Swagger API JSON |
| 目标产物 | 静态页面代码 / OpenSpec PRD / 业务逻辑绑定 / 全流程 |
| 起止阶段 | 从哪个环节开始（如已有静态页面则跳过②③）、到哪个环节结束 |
| 技术栈 | Vue2 / Vue3 / React / 原生 / 小程序（决定各 reference 的输出语法） |

意图不明确时**按 `references/grilling.md` 全局追问协议执行**：以待决维度为设计树起点，按 Frontier 轮次一次性提问（❓ 逐题编号 + ➡️ 每题附推荐答案），每轮 ≤4 问、同一决策点最多追问 2 轮；frontier 清空（无默默假设）并获用户确认后才进入阶段调度，不自行假设起止点。

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

### 2.2b 独立分支（不进入 ②~⑫ 主流程）

部分能力是独立的生命周期（如 **3.6 TAPD 缺陷修复**、**3.7 开发计划活文档**），与「设计稿→PRD→实现」主流程无顺序耦合。命中此类分支时**不套用上表 ②~⑫**，而是直接 `Read` 对应 reference 按其内部阶段执行：
- **3.6 TAPD 缺陷修复**：`Read` `references/tapd-bugfix-workflow.md`；内部「前端代码修复」步骤复用 3.3 工程规范（UI 类加 3.1 视觉约束）；自带人工 Gate（缺陷筛选确认、验证后更新状态）。
- **3.7 开发计划活文档**：`Read` `references/fw-dev-spec.md`；是 3.2 OpenSpec PRD 的**可切换替代**，把 Figma / `.md` 原型转为项目根 `fw_dev_spec/<需求名-日期>/` 下的分层活文档（原型放子目录根、活文档放 `specs/`），默认不写 OpenSpec 文件；产出的活文档经 3.3 第〇章（业务文档接入与前置编排）被探测并确认为 ⑧⑨ 的需求依据；自带人工 Gate（Figma→.md 原型审阅、目录新建确认、组织形式单文档/多文档选择）；可选新增「OpenSpec 关联 Gate」（fw-dev-spec.md 第九章）：用户确认后单向同步到 OpenSpec 并建立双向锚点。

### 2.2c 多 agent 编排（可选模式）

默认单 agent 顺序执行即可；当用户明确要求"多 agent / 团队协作"，或端到端全流程任务启用多 agent 模式时，按本节执行。**编排协议的细节（角色清单、上下文 schema、产出物命名、状态机脚本用法、敏感操作清单）以 `references/multi-agent-orchestration.md` 为准**，本节只做入口指引。

1. **编排器角色**：由 `workflow-orchestrator`（见 `.agents/workflow-orchestrator.md`）承担，对应本 skill 三职责。编排器**不亲自写生成类代码**，只做 dispatch、人工 Gate 管理、状态推进与敏感操作统一询问。
2. **初始化工作流**：确认启用后调用 `node scripts/create-fw-workflow.cjs <任务名> [--start <内部phase>] [--title "..."] [--biz-doc <openspec|fw-dev-spec|skip>] [--biz-doc-path <路径>]` 创建状态文件（`.codebuddy/plans/<任务名>-fw-state.json`），脚本返回 `nextAgent`。`--start` 之前的阶段标记为 `skipped`，在 validate/advance 时**不校验其产物**；`--biz-doc` 把业务文档方案预选写入状态文件；`--biz-doc-path` 预置本次业务文档路径（也可在 ⑤ 完成后用 `set-fw-gate ... docConfirmed --biz-doc <路径>` 登记）。状态文件另含 `testCasesDoc`（3.5 用例文档）与 `allowEmptyPhases`（`--allow-empty` 留痕）。
3. **按阶段 spawn**：用 Task/subagent 工具（按宿主环境映射，见编排协议 §8.1）spawn 2.2 表「负责 Agent」列的 `.agents/` 角色；dispatch 提示词用编排协议 §八 模板（含任务上下文、必读 reference、输入、交付物、横切安全约束、敏感操作上报）。
4. **门控推进**：每阶段产物就绪且人工 Gate 通过后，调用 `node scripts/advance-fw-phase.cjs <任务名> <目标内部phase>` 推进；脚本内置门控校验（产出物/前置阶段/待确认项/gateChecks/testCasesConfirmed），失败不得强行推进。**advance 不自动置位人工 Gate**；离开 Gate 阶段前必须已完成置位。推进前可单独用 `node scripts/validate-fw-phase-gate.cjs <任务名> <目标phase>` 预检。
   - **代码阶段弱校验**：phase 0/7 要求 git 工作区存在代码文件变更（文档/依赖/构建产物不计）；确无代码产出时追加 `--allow-empty`（写入 `allowEmptyPhases` 留痕，需向用户说明）；非 git 仓库降级为 warning。
   - **业务文档精确校验**：phase 3 优先校验 `bizDocPath`；未登记时回退「openspec/changes 或 fw_dev_spec 目录 + 最近 120 分钟 Markdown」并提示补登记。
5. **阶段回退（返工）**：人工 Gate 判定 [返工] 时，调用 `node scripts/rollback-fw-phase.cjs <任务名> <目标内部phase>` 回退状态机（仅允许后向回退：目标 phase < 当前 phase，且**不可指向 skipped 阶段**）；回退区间内的阶段重置为 pending、目标阶段置 running，**已完成阶段的产物文件不删除**，回流计数清零，脚本返回 `nextAgent`（见编排协议 §9.6）。
6. **人工 Gate 置位**：获用户确认后，调用 `node scripts/set-fw-gate.cjs <任务名> <gateKey>`（`staticConfirmed/docConfirmed/apiConfirmed/bizConfirmed`）显式置位；`validate` 强校验「离开 Gate 前 gateChecks 已为 true」，未置位推进会被阻断。
   - **内嵌 Gate `testCasesConfirmed`（3.5 用例审阅，不占 phase）**：通过后执行 `node scripts/set-fw-gate.cjs <任务名> testCasesConfirmed --test-cases <用例文档路径>`；已登记 `testCasesDoc` 而未置位时，进入 ⑩ 会被阻断。
   - **业务文档登记**：`docConfirmed` 可带 `--biz-doc <路径>` 同步登记 `bizDocPath`（供 phase 3 精确校验）。
   - 状态文件另有 `pendingConfirmations[]`（`{id, question, options, recommendation, resolved, source}`，grilling 语义 schema）记录待确认项——执行 agent 的不确定点按 `references/grilling.md` 第五、六章上报编排器，由编排器凑满一轮 frontier 后统一按「❓+➡️推荐答案」格式问用户；存在未 `resolved` 项时门控同样阻断推进。
7. **只读检查**：③⑥⑩ 由 `qa-reviewer` 执行，只读不写，产出结构化偏差报告；回流上限 3 次，超出转人工介入。
8. **敏感操作**：git/删除/批量替换/TAPD 写操作/npm 脚本/部署等，任何 agent 执行前必须上报编排器，由编排器统一向用户询问（见编排协议 §六与 `references/cross-cutting.md`）。
9. **阶段跳过与提前完成**：⑤a 选择「跳过业务文档」（`--biz-doc skip`）后，用 `node scripts/skip-fw-phase.cjs <任务名> 3 4 5` 跳过 ⑤⑥⑦；仅需部分阶段的任务（如接口-only）完成后用 `node scripts/finish-fw-workflow.cjs <任务名>` 提前收尾，避免状态文件永久 running。
10. **收尾与进程回收（强制）**：本地自测启动的 dev server / preview / mock server 必须先 `node scripts/fw-process.cjs register` 登记（启动后再次 register 同端口补 PID）；用例结束 / 阶段收尾 / Gate 前 / 工作流 finish 必须 `cleanup` 并通过 `check`（端口已释放）。`finish-fw-workflow.cjs` 默认阻断残留进程（确需保留传 `--allow-residual-processes`）。规则见 `references/cross-cutting.md` 五、编排协议 §9.8。

> 状态机内部用顺序整数 phase（0~10）存储，与展示编号 ②~⑫ 的双向映射集中在 `scripts/workflow-state-utils.cjs`（⑦b⑦c 已合并为单一 phase 6）。

### 2.2d 可选插槽：3.5 测试与用例生成（⑨→⑩）

测试**不是固定阶段，而是主流程的可选插槽**：在 ⑨ 生成业务逻辑之后、⑩ 检查之前，按需插入由 `test-engineer` 执行的测试能力（3.5）。

- **位置**：⑨ →（可选 3.5）→ ⑩；不占状态机 phase，但用例审阅 Gate 通过后必须置位 `testCasesConfirmed`（见 2.2c 第 6 条）。
- **规则**：`Read references/testing.md`，两段式（用例文档 → 内嵌人工 Gate → 可执行测试代码），E2E 走 `scripts/testing/` Playwright 执行层。
- **触发**：用户要求写测试 / 生成用例，或任务涉及关键链路需回归；是否插入在意图解读阶段确认。
- **跳过**：不插入时直接 ⑨→⑩，无需状态标记（`testCasesDoc=null` 不产生阻断）。
- **完成断言**：一律受 `references/cross-cutting.md` 三（完成前验证铁律）约束；本地服务须按五登记回收。

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

**收尾检查（进程回收，强制）**：任何阶段收尾、人工 Gate 通过前、⑫ 终验与 `finish-fw-workflow.cjs` 收尾前，必须确认本地无遗留长驻进程：

```bash
node scripts/fw-process.cjs check   <任务名>   # 必须 exit 0
node scripts/fw-process.cjs cleanup <任务名>   # 有残留时先回收再继续
```

本地自测（dev server / preview / mock server）启动前必须 `register` 登记；禁止裸后台启动；`cleanup` 属强制收尾动作，不需二次询问但必须在结论中报告 released 端口。权威规则见 `references/cross-cutting.md` 五。

**人工 Gate 提示**：到达确认环节（④⑤a⑦⑦c⑧a⑪⑫；其中 ⑤a/⑧a 为所在阶段的**内嵌 Gate**、⑦b「模式确认」为 ⑦b 内嵌 Gate、3.5 用例审阅为内嵌 Gate，均非独立 phase）必须暂停并提示用户：

```
【人工 Gate · 阶段 X】
- 当前阶段：<阶段名>
- 待确认产物：<文件 / 页面 / 文档>
- 检查结论：<通过 / 人工介入 / 偏差清单摘要>
- 建议：➡️ <推荐结论及理由>（按 references/grilling.md 三）
- 请确认：[通过] / [返工] / [调整范围]
```

「建议」字段由编排器/角色基于已探查事实给出推荐结论，用户可零修改确认。未经用户确认，不得进入下一阶段。用户选择 **[返工]** 时：单 agent 模式回到对应生成阶段重做；多 agent 模式**必须**调用 `node scripts/rollback-fw-phase.cjs <任务名> <目标内部phase>` 形式化回退状态机后再重新 dispatch，不得仅口头返工。

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
- **敏感操作统一询问**：多 agent 模式下，git/删除/批量替换/TAPD 写操作/npm 脚本/长驻进程启动/部署等敏感操作，由编排器统一向用户询问后执行（见 `references/multi-agent-orchestration.md` §六）。
- **进程必须收口**：启动本地长驻进程前登记、收尾必回收并校验端口释放；「完成 / 已验证」结论不得携带仍在监听的本地端口（见 `references/cross-cutting.md` 五）。
- **阶段产物校验口径**：phase 3 校验本次业务文档（`bizDocPath` 优先，缺失回退目录+时间窗口）；phase 0/7 校验 git 工作区代码变更（`--allow-empty` 可显式放行并留痕）；3.5 用例审阅以 `testCasesConfirmed` + `testCasesDoc` 追溯。上述字段缺失时均降级兼容旧状态文件。

---

## 三、章节索引（懒加载指针）

命中对应分支时，**先 `Read` 该文件再执行**；各文件内含完整章节、QA Checklist 与质量校验清单。

- **3.1 Figma 还原约束** → `references/figma-design-constraint.md`
  - 核心规则 / 〇 Figma 数据获取（优先 MCP）/ Design Token / 节点映射 / 精确测量 / a11y / 代码组织 / 资源导出 / 组件库共存 / Dev Mode / QA Checklist（第十章）/ 边界情况 / 技术栈判断（十二章）/ 项目类型判断（十三章）/ 工作流 / 错误示例
- **3.2 原型（Figma / .md）→ OpenSpec PRD** → `references/prototype-to-openspec-prd.md`
  - 输入源判定（Figma 或 .md）/ Figma 读取 / .md 原型文档读取与结构映射 / 需求分析要素 / OpenSpec 环境检查 / 文档结构写法 / PRD 生成 / 变更更新 / 拆解策略 / 质量校验清单 / 协作关系 / 边界与不确定处理
- **3.3 前端工程通用规范** → `references/frontend-engineering-standards.md`
  - 第〇章 业务文档接入与前置编排（根目录标准探测 / 业务文档方案推荐与询问 / 无文档转交 02/03/04 / 页面路由校验 / 衔接⑧⑨⑩）→ 类型安全 / API 集成 / 状态管理 / 安全约束 / 性能优化 / 注释文档 / AI 不确定时处理协议 / 第八章 本地服务进程生命周期
- **3.4 Swagger → 接口定义生成** → `references/api-definition-generation.md`
  - Swagger 解析 / 项目既有模式自动探测 / 模式画像确认 / 生成规则（命名/注释/类型/模块归类）/ 多技术栈适配 / 增量更新与冲突处理 / 鉴权与拦截器 / 质量校验清单 / 边界与不确定处理 / 协作关系 / 生成后人工 Gate（对应主流程 ⑦c）
- **3.5 测试与用例生成（可选环节）** → `references/testing.md`
  - 测试策略与工具选型 / 测试用例生成两段式（业务文档→用例文档→人工 Gate→可执行代码）/ 单元 / 组件 / E2E（Playwright 执行层 `scripts/testing/`，含 5.5 进程回收与残留校验）/ 视觉回归 / 完成前验证铁律指针 / QA Checklist / 边界情况；定位为**主流程可选环节**（插在 ⑨→⑩ 之间，由 test-engineer 执行）
- **3.6 TAPD 缺陷修复（独立分支）** → `references/tapd-bugfix-workflow.md`
  - 阶段零（MCP 连通性探针）+ 5 主阶段：提取 workspace_id（`scripts/extract_workspace_id.py`）/ 读取筛选缺陷（`references/tapd-tool-params.md`）/ 生成活文档计划（`references/tapd-plan-template.md` + `references/tapd-grouping-rules.md`）/ 执行修复与发评论 / 验证后更新状态
  - 4.1 前端代码修复复用 `references/frontend-engineering-standards.md`（UI 类 Bug 加 `references/figma-design-constraint.md`），继承安全硬约束与工程规范
- **3.7 开发计划活文档（独立分支，3.2 OpenSpec 的可切换替代）** → `references/fw-dev-spec.md`
  - 输入读取与需求分析交叉引用 `references/prototype-to-openspec-prd.md`（2.2/2.3/2.4/第十章）；Figma 输入先转为 `.md` 原型经审阅 Gate 后存放
  - 目录：`fw_dev_spec/<需求名>-<YYYY-MM-DD>/`（原型默认文件名 `原需求-原型.md` 放子目录根、活文档放 `specs/`），复用 `references/tapd-plan-template.md` 的 `⬜/🔄/✅/⏭` 活文档进度约定
  - 统一输出五模块：当前项目说明 / 需求功能模块设计（含原需求原型关联锚点）/ 分步开发计划 / 整体进度记录 / 变更日志；单文档或多 spec 文档按需求大小询问用户
  - 可选「OpenSpec 关联模式」见第九章（单向同步 + 双向锚点 + 活文档同步钩子 `scripts/sync-fw-openspec.cjs` 的 init/sync/check）
- **3.8 多 agent 编排协议（编排层，可选模式）** → `references/multi-agent-orchestration.md`
  - 角色职责边界 / 阶段↔agent↔reference↔产物映射 / 上下文传递 schema / 产出物命名约定 / 状态机与资源脚本用法（参数与输出以 `README.md` 脚本清单 + 本协议 §9 为准，冒烟测试 `smoke-fw-scripts.cjs`）/ §9.4 Gate 置位（含内嵌 `testCasesConfirmed`）/ §9.6 回退 / §9.7 跳过与 `--allow-empty` / §9.8 进程回收 / 敏感操作清单 / dispatch 模板 / 只读约束与回流上限
  - 角色定义见 `.agents/`（完整清单与映射见 `README.md` 目录结构）：编排器、Figma 还原、PRD 分析、接口契约、业务实现、只读检查、TAPD 修复、测试
  - 横切安全硬约束与敏感操作统一清单 → `references/cross-cutting.md`（各角色文件与编排协议共享引用，避免多份拷贝漂移）
- **3.9 提示词模板与项目适配（用户侧入口）** → `技能使用提示词模板/README.md` + `frontend-workflow-usage.md`
  - 模板清单、数量与选用指引**以 `技能使用提示词模板/README.md` 为唯一来源**（单 Agent / 多 Agent 两套，含完整版、精简版与占位符说明），本文件不重复枚举；替换 `{{...}}` 占位符即可粘贴触发（见 1.1）
  - `frontend-workflow-usage.md`：具体项目技术栈适配手册（Vue3+TS 默认写法 → Vue2+JS 映射、各分支使用要点、生成后检查清单，见 1.2）
- **3.10 全局追问协议 grilling（横切询问协议）** → `references/grilling.md`
  - 何时触发 / 设计树与 Frontier 轮次机制 / 轮次格式规范（❓逐题编号 + ➡️每题推荐答案）/ 收敛护栏（每轮 ≤4 问、同点 ≤2 轮、超限降级假设清单）/ 职责分离（事实自查 vs 决策归用户）/ 工作流接入点清单（2.1 意图解读、2.3 Gate、各内嵌 Gate、角色不确定上报、边界不确定处理）；触发词：需求拷问、追问澄清、grill、澄清需求
- **3.11 本地进程生命周期与回收（横切硬约束）** → `references/cross-cutting.md` 五 + `scripts/fw-process.cjs`
  - 四步契约（register → 启动并确认监听 → 执行 → cleanup + check）/ 禁止裸后台启动 / 五个强制回收点（用例结束、阶段收尾、Gate 前、finish、会话结束）/ PID 树回收与端口兜底（Windows 下杀 shell 会残留 node）/ `finish-fw-workflow.cjs` 默认阻断残留；`scripts/testing/with_server.py` 已内置该保证

> 关系：3.2 是上游 PRD 产出（specs/tasks）；3.4（接口定义生成）是 PRD 与实现之间的「接口契约接入」桥梁，依据 Swagger 生成接口函数/类型供下游调用；3.1 与 3.3 是下游实现（视觉还原 + 工程规范）；3.6（缺陷修复）是独立的「开发后维护」生命周期分支，不进入 ②~⑫ 主流程，但其前端代码修复步骤复用 3.3 工程规范（UI 类加 3.1），并借助 `.bugfix-workflow/` 活文档实现中断恢复。各分支共享同一 Figma / Swagger / TAPD 数据源但产物不同、互不重叠。
