# frontend-workflow 项目适配手册（示例项目：userlive）

> 适用项目：userlive（Vue 2.6 + JavaScript + Webpack/Vue CLI + ElementUI 2 + SCSS）——作为**适配示例**；其他项目沿用本手册的「默认写法 → 项目写法」映射思路类推。
> 文档目的：说明该 Skill 的调用方式、工作流，以及如何在本项目规范下正确使用。
> 用户侧现成提示词：`技能使用提示词模板/` 目录（单 Agent 11-需求拷问澄清【开工前置】+ 01~10 / 多 Agent 01~09 + 00-模板骨架），替换 `{{...}}` 占位符即可粘贴触发。

## 一、Skill 是什么

`frontend-workflow` 是一个**单一入口**的前端开发工作流 Skill，把原本分散的 4 个子能力合并为一个目录（旧合集名 `frontend-workflow-skills` 已废弃，现名 `frontend-workflow`）。它自身**只做三件事**：

1. **解读意图**：判断任务范围、技术栈、起止阶段。
2. **按阶段调度**：命中分支后 `Read` 对应 `references/*.md` 再执行（规则正文不内联）；多 agent 模式下由编排器 spawn `.agents/` 专职角色执行。
3. **管理检查循环与人工确认点**：每个生成阶段后跑结构化偏差报告，并在关键节点暂停等待人工验收。

> **两种执行模式**：默认单 agent 顺序执行；用户明确要求"多 agent / 团队协作"或端到端全流程时，可启用多 agent 编排模式（见 `references/multi-agent-orchestration.md` 与 `.agents/` 角色目录）。

目录结构：

```
frontend-workflow/
├── SKILL.md                         # 路由层/编排器（触发条件 + 意图解读 + 阶段调度 + 多 agent 编排 + 章节指针）
├── README.md                        # 能力索引与安装说明（模板/脚本清单唯一来源）
├── VERSION.md                       # 版本更新记录（1.0.0~1.4.0）
├── CHANGELOG.md                     # 技术变更流水
├── .agents/                         # 多 agent 角色定义（可选编排模式）
│   ├── workflow-orchestrator.md     # 编排器：调度 / 人工 Gate / 状态推进 / 敏感操作统一询问
│   ├── figma-restorer.md            # Figma 还原（阶段②）
│   ├── prd-analyst.md               # 需求分析/PRD（阶段⑤；⑤a 由编排器先行确认）
│   ├── api-contractor.md            # 接口契约（阶段⑦b⑦c）
│   ├── frontend-implementer.md      # 工程实现（阶段⑧a⑧⑨）
│   ├── qa-reviewer.md               # 只读检查（阶段③⑥⑩）
│   ├── tapd-bugfixer.md             # TAPD 缺陷修复（独立分支 3.6）
│   └── test-engineer.md             # 测试与用例生成（可选环节 3.5，正式角色）
└── references/                      # 领域规则正文（按需 Read）
    ├── figma-design-constraint.md   # 3.1 Figma 像素级还原约束
    ├── prototype-to-openspec-prd.md     # 3.2 原型（Figma / .md）→ OpenSpec PRD
    ├── frontend-engineering-standards.md  # 3.3 前端工程通用规范
    ├── api-definition-generation.md # 3.4 Swagger/OpenAPI → 前端接口定义自动生成
    ├── testing.md                   # 3.5 测试与用例生成（可选环节，正式规则）
    ├── tapd-bugfix-workflow.md      # 3.6 TAPD 缺陷修复 5 阶段核心流程（独立分支）
    ├── multi-agent-orchestration.md # 3.8 多 agent 编排协议（角色/映射/上下文/状态机/敏感操作）
    ├── fw-dev-spec.md               # 3.7 原型 → 开发计划活文档（独立分支）
    ├── cross-cutting.md             # 横切共享块（安全硬约束 + 进程回收 + 完成前验证铁律 + 敏感操作清单 + 只读白名单）
    ├── tapd-tool-params.md          # TAPD MCP 工具参数速查
    ├── tapd-grouping-rules.md       # 缺陷分组判定规则
    └── tapd-plan-template.md        # 活文档修复计划模板
└── scripts/
    ├── testing/                     # 测试执行层（整合自 webapp-testing）
    │   ├── with_server.py           # 服务器生命周期编排（多 server，先 --help）
    │   └── examples/                # Playwright 示例：元素发现 / 静态页 / console 捕获
    ├── extract_workspace_id.py      # 从 TAPD 实体 ID 提取 workspace_id
    ├── workflow-state-utils.cjs     # 多 agent 状态机公共工具
    ├── create-fw-workflow.cjs       # 初始化多 agent 工作流
    ├── validate-fw-phase-gate.cjs   # 阶段门控验证（含 Gate 强校验）
    ├── advance-fw-phase.cjs         # 阶段推进（返回 nextAgent，不自动置位 Gate）
    ├── rollback-fw-phase.cjs        # 阶段回退（返工，仅后向）
    ├── set-fw-gate.cjs              # 人工 Gate 显式置位
    ├── skip-fw-phase.cjs            # 阶段显式跳过（biz-doc=skip）
    ├── finish-fw-workflow.cjs       # 提前完成收尾（默认阻断残留进程）
    ├── fw-process.cjs               # 本地长驻进程登记/校验/回收
    ├── smoke-fw-scripts.cjs         # 状态机脚本冒烟测试
    └── sync-fw-openspec.cjs         # fw-dev-spec 活文档 ↔ OpenSpec 关联：init/sync/check（可选关联模式）
```

## 二、能力分支与触发场景

在对话中输入以下任一含义的指令即可触发（Skill 会自动路由到对应 reference）：

| 分支 | 触发关键词示例 | 对应 reference | 产物 |
|------|---------------|----------------|------|
| Figma 还原 | "按前端工作流还原这个 Figma"、"设计稿转代码"、"高保真还原"、"切图" | `figma-design-constraint.md` | 静态页面/组件代码 |
| 原型 → PRD | "根据 Figma 生成 PRD"、"Figma 转 OpenSpec"、"根据 .md 需求文档生成 PRD"、"把 .md 需求文档规范化为 OpenSpec"、"需求拆解为 specs/tasks" | `prototype-to-openspec-prd.md` | OpenSpec 规范文档 |
| 工程规范 | "按前端工程规范实现"、"接入业务文档开发"、"连接 OpenSpec / fw-dev-spec 实现"、"集成 API"、"状态管理"、"前端安全/性能" | `frontend-engineering-standards.md`（先经第〇章接入业务文档与页面校验） | 业务代码 |
| 接口定义生成 | "根据 Swagger 生成接口定义"、"open.json 转 API"、"接口文档转前端方法"、"增量同步接口" | `api-definition-generation.md` | 接口定义文件（函数+类型+JSDoc） |
| 测试与用例生成 | "写单测/组件测试/E2E/视觉回归"、"生成测试用例" | `testing.md`（两段式：用例文档→人工 Gate→代码） | 测试用例文档 + 可执行测试代码 + 执行报告 |
| 需求拷问澄清（前置） | "需求拷问"、"追问澄清"、"澄清需求"、"grill" | `grilling.md`（3.10 全局追问协议） | 共识清单（已落定决策 + 假设 + 推荐后续分支）；frontier 清空并确认前不动手 |
| 缺陷修复（独立分支） | "修复 bug"、"缺陷修复"、"tapd bugfix"、"需求关联缺陷"、"批量修 bug" | `tapd-bugfix-workflow.md` | 修复后代码 + TAPD 评论/状态更新 + 活文档计划 |
| 开发计划活文档（独立分支 3.7） | "开发计划活文档"、"fw_dev_spec"、"原型转开发计划"、"需求开发计划"、"活文档关联 OpenSpec" | `fw-dev-spec.md` | 本地分层活文档（五模块）；可选关联 OpenSpec 时建立双向锚点并单向同步 |
| 本地进程回收（横切 3.11） | "dev server 没关"、"端口被占用"、"自测进程残留"、"清理测试服务" | `cross-cutting.md` 五 + `scripts/fw-process.cjs` | 进程登记/校验/回收；`finish` 默认阻断残留（见 5.9） |

> 也可在不经过路由的情况下，直接要求"读取 references/xxx.md 的某个章节"单独使用。

## 三、标准工作流（端到端全流程）

当任务为"端到端还原设计稿并实现业务"时，Skill 按固定顺序推进：

② 生成静态页面  → ③ 检查(Agent只读) → ④ **人工验收**【Gate】
→ ⑤ 生成业务文档（⑤a 确认方案：OpenSpec PRD 或 fw-dev-spec 活文档）→ ⑥ 检查 → ⑦ **人工确认需求**【Gate】
→ ⑦b⑦c 接口定义生成+人工验收(Swagger→函数/类型)【Gate】
→ ⑧ 设计桥梁(组件树/状态/数据流) → ⑨ 生成业务逻辑 → ⑩ 检查 → ⑪ **人工验收业务**【Gate】
→ ⑫ **终验**【Gate】

关键协作机制：
- **检查 Agent 只读不写**，输出结构化偏差报告，单环节最多回流 **3 次**，超出转"人工介入"。
- **人工 Gate（④⑤a⑦⑦c⑧a⑪⑫）不可跳过**：即使检查通过，也必须暂停请用户确认（多 agent 模式下由编排器 `set-fw-gate.cjs` 置位后再推进）。
- **可跳过阶段**：如已有静态页面则可跳过 ②③，但须在"意图解读"阶段与用户确认并记录。

偏差报告格式（强制）：

```
[偏差报告]
- 文件路径: src/components/UserCard.vue
- 行号: 12-18
- 规则来源: references/figma-design-constraint.md · 第十章 颜色与视觉
- 偏差描述: 按钮背景色 #2563eb，Figma 为 #3b82f6
- 修复建议: 改为 var(--color-primary)
- 严重级别: 高 / 中 / 低
```

人工 Gate 提示格式：

```
【人工 Gate · 阶段 X】
- 当前阶段：<阶段名>
- 待确认产物：<文件 / 页面 / 文档>
- 检查结论：<通过 / 人工介入 / 偏差清单摘要>
- 请确认：[通过] / [返工] / [调整范围]
```

## 四、与本项目（Vue2 / JS / ElementUI）的适配要点（重点）

Skill 的默认示例多为 **Vue3 + TypeScript**，与本项目的实际栈不同，使用时须按下表映射：

| 领域 | Skill 通用写法 | 本项目正确写法 |
|------|---------------|----------------|
| 组件语法 | `<script setup lang="ts">` + Composition API | **Options API**：`export default { name, directives, mixins, components, props, data, computed, watch, 生命周期, methods }` |
| Props 定义 | TS interface + `defineProps` | 对象式：`{ type, default, required, validator }` |
| 样式方案 | `<style scoped>` / CSS Modules | `<style scoped lang="scss">`；**禁止 inline style**，动态样式用 `:class` 绑定（见 workspace 规范） |
| 类型安全 | 禁止 `any`、显式返回类型 | **不适用**（本项目为 JS）；但"禁止魔法数字""ESLint 兼容""JSDoc 注释"仍适用 |
| API 封装 | `import { request } from '@/utils/request'` | 实际封装在 `src/utils/http/http.js`，导出 `get / post / del / axiosRequest`；按业务模块组织在 `src/utils/http/modules/<Business>/`，新增接口放对应业务目录并写完善出入参注释 |
| 状态管理 | Pinia / Zustand | **Vuex 3**（`src/store/`），按现有 module 模式扩展 |
| XSS 防护 | `DOMPurify` 净化后 `v-html` | **使用 `v-rich-text` 指令替代 `v-html`**（workspace 强制，且禁止重复实现）；不要自行引入 DOMPurify |
| 自定义指令 | 通用示例 | **必须优先复用**已注册指令：`v-permission`、`v-role`、`v-copy`、`v-click-outside`、`v-drag`、`v-number`、`v-rich-text`、`v-limit-lines`、`v-limit-live`、`v-show-tips`、`v-insert-tips` |
| 组件结构顺序 | — | 强制：`template` → `script`(name→directives→mixins→components→props→data→computed→watch→生命周期→methods) → `style(scoped)` |

## 五、各分支使用要点速查

### 5.1 Figma 还原（`figma-design-constraint.md`）
核心 6 条规则（最高优先级）：
1. 静态页面样式必须与 Figma 完全一致（颜色/尺寸/位置/间距/边框/圆角）。
2. **禁止**添加 Figma 中不存在的样式、颜色、阴影、边框、图标、元素、动效、文案。
3. 所有样式属性以 Figma 为准，不得自行调整。
4. 缺失的状态（hover/active/disabled/loading/empty/error）**不得自行补充**。
5. 资源优先从 Figma 导出；无法导出保留占位结构，禁止用第三方图标库替代。
6. 严禁"美化"设计稿（Figma 是唯一真理来源，像素级还原）。

配套要求：Design Token（CSS 变量，**全局 `tokens.css` 定义一次、组件只引用，禁止硬编码、也禁止在组件内重复声明 `:root`/Token**——scoped 下 `:root` 会被改写为 `:root[data-v-xxx]` 而失效；**新增共用样式先查项目/同模块既有 tokens 与工具类（复用优先，见 2.6），并以 Token lint（2.7：TOKEN-01/02/03/04）自动校验**）、**实现时自主检测技术栈并选用匹配 UI 组件库实现标准组件（见 8.4 + 8.4.3 多栈映射表：Vue→ElementUI/Element Plus、React→Ant Design/MUI），不手写裸标签、不逐条询问选型，并以 UI 库 lint（2.7：UI-01/02/03）自动校验（手写 `<table>` 改库表格、裸表单/按钮标签核对、无跨栈混用）**、Figma 节点→HTML 语义标签映射、精确测量（px 默认，小数取舍规则）、a11y 最小约束、与 ElementUI 共存策略（Figma 优先 + 最小覆盖）。
完成须过**第十章 QA Checklist**（布局/颜色/字体/资源/内容/交互/可访问性/代码质量）。

### 5.2 原型 → PRD（`prototype-to-openspec-prd.md`）

输入源支持 **Figma 原型** 与 **`.md` 格式原型需求文档** 两种：
- **Figma 原型**：走 2.2 节（MCP/链接/截图读取）。
- **`.md` 原型需求文档**：走 2.3 节——用 Read 读取 `.md` 文件后，把 Markdown 的标题层级（模块/页面）、字段表格、有序列表（业务流程）、引用块（约束/边界）映射为 OpenSpec 的 capability / Requirement / Scenario（见 2.3.2 映射表）；文档缺失字段表或流程歧义时**停止询问**，不替用户补。
- 若同时提供两者，以 `.md` 文本为规范骨架与字段/流程权威，Figma 补视觉与交互细节。
- 先检查 OpenSpec 是否可用（`openspec --version`）；本项目目前**无 `openspec/` 目录**，若要用需先 `openspec init`（Skill 不会自动安装，会请用户确认）。
- `spec.md` 写法：一级标题 `# <capability> Specification`，每条 `### Requirement:` 用 **SHALL**，每个 Requirement 至少 1 个 `#### Scenario:`（GIVEN/WHEN/THEN）。
- 变更用 `+`/`-` delta 增量，不整篇重写主 specs。
- capability 用 kebab-case 且表达能力域（非页面名），如 `user-auth`；change-id 用动词短语如 `add-remember-me`。
- **严禁猜测**后端接口 URL/入参出参、业务规则、字段含义；信息不足必须停下来询问。

### 5.3 工程规范（`frontend-engineering-standards.md`）
- **API 三态**：任何异步数据组件必须处理 loading/error/empty（视觉仍受"缺失状态不补"约束）。
- **请求取消与防竞态**：组件销毁/快速切换时 abort 未完成请求，非 `AbortError` 不被吞没。
- **安全硬约束（无论设计稿是否体现都必须遵守）**：禁止 `v-html`（用 `v-rich-text`）、用户输入必须转义、URL 协议校验、`javascript:`/`data:` 禁用；禁止硬编码 API Key/Token/密码，禁止 `console.log` 敏感信息。
- **性能**：图片 `loading="lazy"` + 明确尺寸；路由/组件懒加载；搜索输入防抖、滚动节流；长列表(>100)考虑虚拟滚动（检查项目中是否已有 `el-table-virtual-scroll`、`vue-virt-list`等组件）。
- **注释**：工具函数/Hook/Store action 必须有 JSDoc；复杂逻辑必须注释；TODO/FIXME 需带责任人+日期。

### 5.4 接口定义生成（`api-definition-generation.md`）
- **触发**：提供 Swagger / open.json / swagger.json，要求生成或增量同步前端接口定义。
- **自动探测项目模式**：生成前先 Read `src/utils/http/http.js`（导出 `get/post/del/axiosRequest`）+ 既有 `src/utils/http/modules/<Business>/` 文件，提取命名约定（`getUserList`）、注释风格（JSDoc `@param`/`@returns`/`@typedef`）、模块归类方式、响应解包层级、鉴权拦截器，输出「模式画像」给你确认后才生成。
- **生成规则**：复用 `http.js` 封装（禁止裸调 axios）；按 Swagger `tags`/path 归类到 `modules/<Business>/`；复杂类型用 `@typedef` 定义（本项目为 JS，无 TS interface）；schema `$ref` 解析为类型名。
- **增量更新**：Swagger 改动后只追加/修改对应函数，不整文件覆盖；Swagger 已移除的接口不自动删，标注「⚠️ 待确认」。
- **严禁猜测**：Swagger 缺出参 schema、响应解包层级不明、命名冲突时**停止询问**，不臆造返回结构。

### 5.5 测试与用例生成（`testing.md`，两段式）
- **触发**："写单测/组件测试/E2E/视觉回归"、"生成测试用例"，或 ⑨→⑩ 之间插入测试环节。
- **两段式硬约束**：先从业务文档（OpenSpec Scenario / fw_dev_spec 活文档）生成 Markdown 测试用例文档（用例表 + 优先级 + 回溯锚点 + 覆盖矩阵），经**人工 Gate 审阅**确认后才生成可执行测试代码。
- **本项目（Vue2.6 + JS）测试栈映射**：

| 领域 | Skill 默认写法（Vue3+TS） | 本项目正确写法 |
|------|--------------------------|----------------|
| 单元/组件框架 | Vitest + @vue/test-utils v2 | **Jest + @vue/test-utils v1**（Vue2 兼容版）；测试文件 `tests/unit/**/*.spec.js` |
| 组件挂载 | `mount` + Testing Library 查询 | `shallowMount`/`mount`；ElementUI 组件按需 `stubs` 或局部注册 |
| 断言风格 | `expect`（Vitest） | `expect`（Jest）+ `@vue/test-utils` 的 `emitted()` / `find()` / `props()` |
| TS 类型 | 显式类型 + 禁 `any` | **不适用**（JS）；用例数据与 mock 结构写清楚注释即可 |
| E2E | Playwright（Python 脚本） | **通用**：`scripts/testing/with_server.py` 编排（`npm run serve` + 后端），自带端口预检 + 进程树回收；手工启动必须 `fw-process register` 登记并在结束 `cleanup`。动态页面先等 `networkidle` 再侦察 DOM |
| 命令 | `npm run test` | 测试命令执行前必须向用户确认（敏感操作） |

- **用例文档落位**：有 `fw_dev_spec/` 时放 `fw_dev_spec/<需求名-日期>/specs/测试用例.md`（复用 ⬜🔄✅⏭ 进度约定）；否则放项目 `test-cases/<feature>.md`。
- **用例审阅 Gate 置位（v1.4.0 起强制）**：Gate 通过后执行 `node scripts/set-fw-gate.cjs <任务名> testCasesConfirmed --test-cases <用例文档路径>`；已登记用例文档但未置位时，进入 ⑩ 会被 `validate` 阻断。回退返工用 `--unset` 复位后重走 Gate。
- **生成后检查清单**：用例覆盖全部 Scenario 并含边界异常；测试代码用 Jest+@vue/test-utils v1 写法（非 Vitest/Vue3 语法）；mock 走 `http.js` 同源路径（mock `src/utils/http/http.js` 导出，非裸 axios）；执行证据新鲜（完成前验证铁律，`references/cross-cutting.md` 三）；用例文档状态已回写；**`testCasesConfirmed=true` 且 `testCasesDoc` 与本次用例文档一致**；**本次启动的 dev server / mock server 已回收（`fw-process check` 通过、端口释放）**。

### 5.6 TAPD 缺陷修复（`tapd-bugfix-workflow.md`，独立分支）

- **触发**：提供 TAPD 需求 ID + 前端开发人员姓名（后端/产品/测试人员可选），或说"修复 bug / 缺陷修复 / tapd bugfix / 需求关联缺陷 / 批量修 bug"。
- **5 阶段**：①提取 `workspace_id`（`scripts/extract_workspace_id.py`，从需求 ID 自动解析）→ ②读取并筛选关联缺陷（按状态+处理人过滤，向用户确认）→ ③按责任方分组（A 前端 / B 后端 / C 需求，规则见 `references/tapd-grouping-rules.md`）并生成活文档计划（`.bugfix-workflow/bugfix-plan-YYYY-MM-DD.md`，模板见 `references/tapd-plan-template.md`）→ ④执行（A 改代码 / B·C·D 发 TAPD 评论 @相关人员）→ ⑤用户验证通过后更新 Bug 状态为"已解决"。
- **前端代码修复复用工程规范**：4.1 改代码前先 `Read references/frontend-engineering-standards.md`（UI 类 Bug 加 `Read references/figma-design-constraint.md`），**禁止 `v-html`、用户输入须转义、禁止硬编码敏感信息** 等安全硬约束无论缺陷描述是否体现均须遵守；修复后跑 lint/type-check。
- **TAPD MCP 工具**：统一 `mcp__tapd__` 前缀，参数 schema 见 `tapd-tool-params.md`。
- **活文档机制**：阶段间用 `⬜/🔄/✅/⏭` 状态标记，中断后可从 `.bugfix-workflow/` 计划文档恢复进度。
- **人工 Gate**：缺陷筛选结果须确认；验证通过后才更新状态，修复阶段不自动改状态。

### 5.7 开发计划活文档（`fw-dev-spec.md`，独立分支 3.7）
- **触发**：提供 Figma 或 `.md` 原型需求文档，要求生成「开发计划活文档」（如"生成 fw_dev_spec 活文档"、"原型转开发计划"、"需求开发计划"）。
- **定位**：是 3.2 OpenSpec PRD 的**可切换替代**——默认把需求与开发计划沉淀为项目内 `fw_dev_spec/<需求名-日期>/` 活文档（原型放子目录根、活文档放 `specs/`），供 ⑧⑨ 实现消费，**默认不写 `openspec/`**。
- **五模块统一规范**：①当前项目说明 ②需求功能模块设计（含原型关联锚点）③按步骤开发计划 ④整体进度记录（⬜🔄✅⏭）⑤变更日志；单文档或多 spec 文档按需求大小询问用户。
- **可选「OpenSpec 关联模式」**：生成活文档时经【可选 Gate · OpenSpec 关联】询问用户；确认后调用 `node scripts/sync-fw-openspec.cjs init` 初始化 OpenSpec 关联（注入双向锚点、写入同步指纹），活文档内嵌同步钩子配置块；后续模块②③④⑤ 任一变更须以 `+`/`-` delta 单向回写 OpenSpec（详见 `fw-dev-spec.md` 第九章）。本模式默认关闭，不改变默认二选一语义。
- **关联校验**：`node scripts/sync-fw-openspec.cjs check <活文档路径>` 校验 openspec 环境、双向锚点完整性与同步指纹一致性。
- **目录结构**：本项目当前**无 `openspec/` 目录**，若开启关联模式需先 `openspec init`（Skill 不会自动安装，会请用户确认）。

### 5.8 需求拷问澄清（`grilling.md`，3.10 全局追问协议，前置）
- **触发**："需求拷问"、"追问澄清"、"澄清需求"、"grill"，或用模板 `单Agent模式/11-需求拷问澄清.md`（开工前置，可先于 01 使用）。
- **用途**：开工前把需求/方案的待决事项走成设计树，按 Frontier 轮次逐轮澄清（❓逐题编号 + ➡️每题推荐答案，每轮 ≤4 问，同一决策点最多追问 2 轮），产出共识清单后再进对应分支执行。
- **本项目要点**：可自查的事实（技术栈 Vue2.6+Webpack、API 封装 `src/utils/http/http.js`、自定义指令清单等）agent 先自查不问用户；待决项（如业务文档方案、测试范围、起止阶段）才交用户拍板。澄清结论可直接作为 01~10 各模板的意图清单输入，不重复追问。

### 5.9 本地进程登记与回收（`cross-cutting.md` 五，强制收尾）
- **典型问题**：自测/复现时后台启动 `npm run serve-test` / dev server，验证完不回收 → 端口与 CPU 长期占用；Windows 上只杀 `cmd` 时 `node` 子进程仍占端口；下次自测连到旧进程导致「代码没生效却显示通过」。
- **四步契约**：`register`（启动前登记）→ 启动并确认端口监听 → 执行测试/验证 → `cleanup` + `check`（端口释放）。
- **命令**：

```bash
node scripts/fw-process.cjs register <任务名> --port 8088 --cmd "npm run serve-test"
node scripts/fw-process.cjs check    <任务名>          # 0=无残留
node scripts/fw-process.cjs cleanup  <任务名>          # 回收并校验端口
node scripts/fw-process.cjs cleanup  <任务名> --all-tasks
```

- **强制回收点**：用例执行结束（含失败/中断）、阶段收尾、⑪/⑫ Gate 前、`finish-fw-workflow.cjs`（默认阻断残留，`--allow-residual-processes` 才放行）。
- **本项目注意**：一次自测可能同时起多个服务（如 3030 前端 + 8088 插件 + 后端），**每个端口都要登记**；Playwright 跑完先 `check` 再继续下一个用例。

### 5.10 v1.4.0 升级提示（状态机校验口径变化）

1. **phase 3 业务文档**：不再只看 `openspec/` 或 `fw_dev_spec/` 目录是否存在。⑤ 完成后用 `create --biz-doc-path` 或 `set-fw-gate ... docConfirmed --biz-doc <路径>` 登记本次文档；未登记时回退「目录 + 最近 120 分钟 Markdown」，可能误判或漏判。
2. **phase 0/7 代码阶段**：推进前要求 git 工作区存在代码文件变更（文档/依赖/构建产物不计）。纯配置/纯文档任务确无代码产出时，追加 `--allow-empty`（状态文件留痕，需向用户说明）。
3. **3.5 用例审阅**：Gate 通过后必须置位 `testCasesConfirmed`，否则进入 ⑩ 被阻断；未执行 3.5 的任务不受影响（`testCasesDoc=null`）。
4. **兼容性**：旧状态文件缺少新字段时自动降级，无需迁移；非 git 仓库的阶段 0/7 校验仅告警不阻断。

## 六、生成后检查清单（合并 Skill + 本项目规范）

- [ ] 组件名符合规范（文件/组件小驼峰，本目录约定）
- [ ] Props 有完整定义（type/default/required）
- [ ] 技术栈写法是 Vue2 Options API（非 Vue3 语法）
- [ ] 使用了正确的自定义指令（v-permission 等），未重复实现
- [ ] 富文本用 `v-rich-text` 而非 `v-html`
- [ ] 无 inline style，动态样式用 `:class` + CSS class
- [ ] API 走 `src/utils/http/http.js` 封装，新接口按业务模块归类且有出入参注释
- [ ] 接口定义由 Swagger 生成时，模式画像已经确认、复用了既有封装与命名约定、无裸调 axios
- [ ] 未硬编码敏感信息 / API Key
- [ ] 异步组件处理了 loading/error/empty
- [ ] 关键函数有 JSDoc 注释；无 ESLint 错误
- [ ] Figma 还原通过了第十章 QA Checklist（如有设计稿）
- [ ] 若执行了 3.5 测试：用例审阅 Gate 已置位（`testCasesConfirmed=true`）且 `testCasesDoc` 指向本次用例文档
- [ ] 本次启动的本地服务已全部回收：`node scripts/fw-process.cjs check <任务名>` 通过，无遗留监听端口（cross-cutting.md 五）

## 七、边界与不确定处理（最高优先级）

- 信息不足（接口契约未知、字段含义歧义、缺失关键状态设计、技术方案有分歧）时 **必须停止并询问用户，严禁猜测**。
- 不确定项在文档中用 `> ⚠️ 待确认：...` 显式标记，确认后移除。
- 不跳过人工 Gate（④⑤a⑦⑦c⑧a⑪⑫）；不自行扩展阶段顺序；安全规则为硬约束（`references/cross-cutting.md` 一）。
