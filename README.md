# frontend-workflow

> 当前版本：**v1.3.0**（版本号权威来源见 `SKILL.md` 的 `version` 字段，变更记录见 `CHANGELOG.md`）

前端开发工作流**单一 Skill**。将原先分散的能力（Figma 还原约束、原型→OpenSpec PRD、前端工程规范、Swagger→接口定义生成、测试与用例生成、TAPD 缺陷修复、开发计划活文档）合并为一个可一次安装的 skill：路由逻辑集中在 `SKILL.md`，领域规则拆到 `references/` 子文件，按运行时需求读取，兼顾「一次安装」与「上下文不臃肿」。

## 目录结构

```
frontend-workflow/                  # 单一 skill 目录（= 安装单元）
├── SKILL.md                         # 路由层/编排器：触发描述 + 意图解读 + 阶段调度 + 多 agent 编排 + 章节指针（轻量）
├── .agents/                         # 多 agent 角色定义（可选编排模式）
│   ├── workflow-orchestrator.md     # 编排器：调度 / 人工 Gate / 状态推进 / 敏感操作统一询问
│   ├── figma-restorer.md            # Figma 还原（阶段②）
│   ├── prd-analyst.md               # 需求分析/PRD（阶段⑤；⑤a 由编排器先行确认）
│   ├── api-contractor.md            # 接口契约（阶段⑦b⑦c）
│   ├── frontend-implementer.md      # 工程实现（阶段⑧a⑧⑨）
│   ├── qa-reviewer.md               # 只读检查（阶段③⑥⑩）
│   ├── tapd-bugfixer.md             # TAPD 缺陷修复（独立分支 3.6）
│   └── test-engineer.md             # 测试与用例生成（可选环节 3.5，正式角色）
├── references/                      # 领域规则正文（按需 Read，非自动注入）
│   ├── figma-design-constraint.md   # Figma 像素级还原约束
│   ├── prototype-to-openspec-prd.md # 原型（Figma / .md）→ OpenSpec PRD
│   ├── fw-dev-spec.md               # 原型（Figma / .md）→ 开发计划活文档（独立分支 3.7，默认 OpenSpec 替代，可选关联 OpenSpec）
│   ├── frontend-engineering-standards.md  # 前端工程通用规范
│   ├── api-definition-generation.md # Swagger/OpenAPI → 前端接口定义自动生成
│   ├── testing.md                   # 测试与用例生成（可选环节 3.5，正式规则：两段式用例生成 + Playwright 执行层）
│   ├── multi-agent-orchestration.md # 多 agent 编排协议（角色/映射/上下文/状态机/敏感操作）
│   ├── grilling.md                  # 全局追问协议（设计树 / Frontier 轮次 / 推荐答案 / 收敛护栏）
│   ├── cross-cutting.md             # 横切共享块（安全硬约束 + 完成前验证铁律 + 敏感操作清单 + 只读白名单）
│   ├── tapd-bugfix-workflow.md      # TAPD 缺陷修复 5 阶段核心流程（独立分支）
│   ├── tapd-tool-params.md          # TAPD MCP 工具参数速查
│   ├── tapd-grouping-rules.md       # 缺陷分组判定规则
│   └── tapd-plan-template.md        # 活文档修复计划模板
├── scripts/                         # 辅助脚本
│   ├── testing/                     # 测试执行层（整合自 webapp-testing）
│   │   ├── with_server.py           # 服务器生命周期编排（多 server，先 --help 黑盒使用）
│   │   └── examples/                # Playwright 示例：元素发现 / 静态页 / console 捕获
│   ├── extract_workspace_id.py      # 从 TAPD 实体 ID 提取 workspace_id
│   ├── workflow-state-utils.cjs     # 多 agent 状态机公共工具（phase 映射/状态读写/产物检查）
│   ├── create-fw-workflow.cjs       # 初始化多 agent 工作流状态文件（--start / --biz-doc）
│   ├── validate-fw-phase-gate.cjs   # 阶段门控验证（含人工 Gate 的 gateChecks 强校验）
│   ├── advance-fw-phase.cjs         # 阶段推进（返回 nextAgent，不自动置位 Gate）
│   ├── rollback-fw-phase.cjs        # 阶段回退（返工，仅后向，拒绝 skipped 目标）
│   ├── set-fw-gate.cjs              # 人工 Gate 显式置位（用户确认后调用）
│   ├── skip-fw-phase.cjs            # 阶段显式跳过（biz-doc=skip 场景）
│   ├── finish-fw-workflow.cjs       # 提前完成收尾（避免状态永久 running）
│   ├── smoke-fw-scripts.cjs         # 状态机脚本冒烟测试（临时目录全链路回归）
│   └── sync-fw-openspec.cjs         # fw-dev-spec 活文档 ↔ OpenSpec 关联：init/sync/check（可选关联模式）
├── 技能使用提示词模板/              # 用户侧提示词模板（单Agent模式 01~10 / 多Agent模式 01~09 + 00-模板骨架）
├── frontend-workflow-usage.md       # 项目适配手册（示例项目：userlive Vue2.6）
├── CHANGELOG.md                     # 版本变更历史
└── README.md                        # 本文件
```

## 能力索引

| 分支 | 对应 reference | 说明 |
|------|----------------|------|
| Figma 还原 | `references/figma-design-constraint.md` | 像素级还原、Design Token、节点映射、a11y、资源导出、技术栈/项目类型适配、QA Checklist |
| 原型→PRD | `references/prototype-to-openspec-prd.md` | 设计原型（Figma 或 .md 需求文档）→ OpenSpec 需求规范（specs / proposal / design / tasks）与拆解策略 |
| 工程规范 | `references/frontend-engineering-standards.md` | 类型安全、API 集成、状态管理、安全约束、性能优化、注释文档、AI 不确定时处理 |
| 接口定义生成 | `references/api-definition-generation.md` | Swagger/open.json → 前端接口定义（函数+类型+JSDoc），自动探测项目既有接口模式并按其风格生成 |
| 测试与用例生成 | `references/testing.md` | 测试用例生成两段式（业务文档→用例文档→人工 Gate→可执行代码）+ 单元 / 组件 / E2E（Playwright 执行层 `scripts/testing/`）/ 视觉回归；定位为主流程可选环节（⑨→⑩ 之间，由 test-engineer 执行）；执行受 `cross-cutting.md` 完成前验证铁律约束 |
| 缺陷修复（独立分支） | `references/tapd-bugfix-workflow.md` | TAPD 缺陷修复全流程：提取 workspace_id → 读筛选缺陷 → 生成活文档计划 → 执行修复/发评论 → 验证后更新状态；前端代码修复复用工程规范 |
| 开发计划活文档（独立分支，3.2 替代） | `references/fw-dev-spec.md` | 原型（Figma / .md）→ 本地分层活文档（fw_dev_spec/<需求名-日期>/）：Figma 先转 .md 原型审阅后存、五模块统一规范、单/多文档询问；替代 OpenSpec PRD 供 ⑧⑨ 使用，复用活文档进度约定；可选「OpenSpec 关联模式」开启后单向同步到 OpenSpec 并建立双向锚点（见 fw-dev-spec.md 第九章） |
| 多 agent 编排（可选模式） | `references/multi-agent-orchestration.md` | 8 个 `.agents/` 角色协作：编排器按阶段 spawn 专职 agent，状态机门控推进、人工 Gate 统一管理、敏感操作统一询问 |
| 需求拷问澄清（前置，3.10） | `references/grilling.md` | 全局追问协议：设计树 / Frontier 轮次（❓逐题编号 + ➡️每题推荐答案）/ 收敛护栏（每轮≤4问、同点≤2轮）/ 事实自查 vs 决策归用户；统一接入 2.1 意图解读、人工 Gate 与角色不确定上报 |

> 各 `references/*.md` 仍可独立 `Read` 使用，不经过 `SKILL.md` 路由。

## 多 agents 协作（可选模式）

本 skill 支持两种执行模式，在意图解读阶段与用户确认选用：

- **单 agent 顺序执行（默认）**：同一 agent 按 ②~⑫ 阶段表顺序推进，自己 `Read` 对应 reference 并扮演生成/检查双角色。
- **多 agent 编排**：由 `workflow-orchestrator` 编排器按阶段 spawn `.agents/` 专职角色执行，各角色专注单一领域，通过状态机门控确定性推进。

**角色分工**（详见 `references/multi-agent-orchestration.md`）：

| Agent | 覆盖阶段 | 职责 |
|-------|---------|------|
| `workflow-orchestrator` | 全部（调度）+ 人工 Gate | 意图解读、spawn 调度、Gate 管理、状态推进、敏感操作统一询问 |
| `figma-restorer` | ② | Figma 像素级还原 → 静态页面 + tokens.css |
| `qa-reviewer` | ③⑥⑩ | 只读检查 → 结构化偏差报告（只审查不修改，报告由编排器落盘） |
| `prd-analyst` | ⑤ | 原型 → OpenSpec / fw_dev_spec 业务文档（⑤a 方案确认由编排器先行完成） |
| `api-contractor` | ⑦b⑦c | Swagger → 接口定义（函数+类型+JSDoc） |
| `frontend-implementer` | ⑧a⑧⑨ | 前置编排 + 设计桥梁 + 业务逻辑代码 |
| `tapd-bugfixer` | 独立分支 3.6 | TAPD 缺陷批量修复 |
| `test-engineer` | 可选环节 3.5 | 测试用例生成（两段式）+ 单元 / 组件 / E2E / 视觉回归编写与执行 |

**状态机脚本**（`scripts/`，由编排器调用）：

```bash
node scripts/create-fw-workflow.cjs <任务名> [--start <phase>] [--title "..."] [--biz-doc <openspec|fw-dev-spec|skip>]  # 初始化
node scripts/validate-fw-phase-gate.cjs <任务名> <目标phase>                     # 门控预检（含 Gate 强校验）
node scripts/advance-fw-phase.cjs <任务名> <目标phase>                           # 推进并返回 nextAgent（不自动置位 Gate）
node scripts/set-fw-gate.cjs <任务名> <gateKey>                                  # 人工 Gate 置位（用户确认后）
node scripts/rollback-fw-phase.cjs <任务名> <目标phase>                          # 阶段回退（返工）
node scripts/skip-fw-phase.cjs <任务名> 3 4 5                                    # 阶段跳过（biz-doc=skip）
node scripts/finish-fw-workflow.cjs <任务名>                                     # 提前完成收尾
node scripts/smoke-fw-scripts.cjs                                                # 脚本冒烟测试
```

**协作约定**：编排器不亲自写生成类代码；人工 Gate ④⑤a⑦⑦c⑧a⑪⑫ 由编排器统一持有、用户确认后调用 `set-fw-gate.cjs` 置位再推进（`advance` 不自动置位，未置位会被门控阻断）；检查 agent 只读、报告由编排器落盘；回流上限 3 次；横切安全约束注入所有生成类 agent（`references/cross-cutting.md`）；敏感操作（git/删除/批量替换/TAPD 写操作/npm 脚本/部署）由编排器统一询问用户。

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
  ▼ ⑦b⑦c 接口定义生成+人工验收  · api-definition-generation（Swagger→函数/类型/JSDoc，自动探测项目模式）【确认 Gate·人工】
  ▼ ⑧ 设计桥梁：组件树 / 状态 / 数据流草案     · frontend-engineering-standards
  ▼ ⑨ 生成业务逻辑并绑定静态页面              · frontend-engineering-standards
  ▼ ⑩ 检查 Agent 跑工程硬约束 + 非功能质量      【检查】最多 3 次回流
  ▼ ⑪ 人工验收业务规则                        【确认 Gate·人工】
  ▼ ⑫ 终验
```

**协作约定**：检查 Agent 只读、不写代码；回流上限 3 次，超出转人工介入；上下文在生成/检查间共享（Figma 节点 ID、代码片段、Swagger 路径、接口模式画像、上一轮报告）；确认 Gate ④⑤a⑦⑦c⑧a⑪⑫ 必须人工确认（多 agent 下经 set-fw-gate.cjs 置位）。

## 安装

本目录本身即一个完整 skill，**目录名保持 `frontend-workflow`**，复制到宿主的 skills 目录即可。各宿主对照：

| 宿主 | skills 目录 |
|------|-------------|
| WorkBuddy | `~/.workbuddy/skills/frontend-workflow` |
| CodeBuddy | `~/.codebuddy/skills/frontend-workflow` |
| DeepSeek Harness | `<skills 仓库>/skills/frontend-workflow` |
| 项目级（通用） | `<项目根>/.<宿主>/skills/frontend-workflow` |

安装后在对话中触发（如"按前端工作流还原这个 Figma"）即可。`SKILL.md` 会先解析意图并按章节索引读取对应 `references/*.md`。

### 前置依赖（按分支选用）

| 分支 | 依赖 |
|------|------|
| ②/⑤ Figma 数据获取 | Figma MCP（`get_figma_data` / `download_figma_images`；无 MCP 时回退链接+Dev Mode / 截图 / 口述） |
| 3.6 TAPD 缺陷修复 | TAPD MCP（`mcp__tapd__*` 9 工具；阶段零探针不通即中止） |
| 3.2 OpenSpec PRD / 3.7 关联模式 | openspec CLI（`npm install -g @fission-ai/openspec@latest` 后 `openspec init`） |
| 3.5 测试与用例生成（E2E） | Python 3 + playwright（`pip install playwright && playwright install chromium`）；目标项目自身测试框架按项目既有栈（不随 skill 安装） |
| 状态机脚本 | Node.js ≥ 18（`node --check` 与运行）；TAPD workspace_id 提取脚本需 Python 3 |
| 全部 | 无第三方 npm 依赖（脚本仅用 Node 内置模块） |

## 如何扩展

- **补充测试规则**：`references/testing.md` 已定稿（两段式用例生成 + 四类测试规范 + QA Checklist）；调整时直接修改该文件并同步 CHANGELOG。
- **新增领域**：在 `references/` 下新增 `<domain>.md`，并在 `SKILL.md` 的「三、章节索引」登记指针与触发说明即可。
