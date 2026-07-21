# 多 Agent 编排协议

> 本文件是 frontend-workflow-skills **多 agents 协作模式的单一事实来源**。SKILL.md 只做指针路由；agent 角色定义见 `.agents/*.md`，其"知识来源"仍是本目录下各 `references/*.md`（规则正文不内联进 agent 文件）。
>
> 多 agent 模式与"reference 独立 `Read` 使用"两种模式**并存兼容**：本协议不改变任何既有 reference 的规则正文，只在编排层新增角色调度与状态机门控。

---

## 一、何时启用多 agent 模式

| 场景 | 是否启用多 agent | 说明 |
|------|:---:|------|
| 端到端全流程（②~⑫） | ✅ 启用 | 由编排器按阶段 spawn 专职 agent |
| 单阶段深度任务（如只做 Figma 还原、只生成 PRD） | 可选 | 用户明确要求"用多 agent / 团队协作"时启用；否则按原单 agent 顺序执行即可 |
| TAPD 缺陷修复（3.6） | ✅ 启用 | 由 tapd-bugfixer 独立执行，编排器仅做入口路由 |
| 仅查阅某条规则 | ❌ 不启用 | 直接 `Read` 对应 reference，无需调度 |

启用与否由编排器在**意图解读阶段**与用户确认（见 SKILL.md 2.1）。启用后，编排器**不亲自编写业务/视觉代码**，只做 dispatch、Gate 管理与状态推进。

---

## 二、角色清单与职责边界

8 个角色定义于 `.agents/` 目录。职责边界遵循"**一个角色对应阶段表中一个或多个相邻阶段 + 一个核心 reference**"。

| Agent 文件 | 角色 | 覆盖阶段 | 核心 reference | 产物 | 读写权限约定 |
|-----------|------|---------|----------------|------|-------------|
| `workflow-orchestrator.md` | 编排器 | 全部（调度）+ 人工 Gate ④⑤a⑦⑦c⑧a⑪⑫ | 本文件 + SKILL.md | 意图清单、状态推进、Gate 记录 | 不亲自写生成类代码；可写状态文件 |
| `figma-restorer.md` | Figma 还原 | ② | `figma-design-constraint.md` + `frontend-engineering-standards.md` | 静态页面代码 + tokens.css | 可写页面/样式代码 |
| `prd-analyst.md` | 需求分析/PRD | ⑤a⑤ | `prototype-to-openspec-prd.md` 或 `fw-dev-spec.md` | OpenSpec specs/proposal/tasks 或 `fw_dev_spec/` 活文档 | 可写文档目录 |
| `api-contractor.md` | 接口契约 | ⑦b | `api-definition-generation.md` | 接口定义文件（函数+类型+JSDoc） | 可写接口定义文件 |
| `frontend-implementer.md` | 工程实现 | ⑧a⑧⑨ | `frontend-engineering-standards.md`（第〇章+全文） | 业务逻辑代码 | 可写业务代码 |
| `qa-reviewer.md` | 只读检查 | ③⑥⑩ | 按阶段对应 reference 的 QA/质量清单/工程硬约束 | 结构化偏差报告 | **只读，不写任何代码/文档** |
| `tapd-bugfixer.md` | TAPD 修复 | 独立分支 3.6 | `tapd-bugfix-workflow.md` + `tapd-tool-params.md` + `tapd-grouping-rules.md` + `tapd-plan-template.md` | 修复代码 + 评论 + 状态更新 | 可写修复代码/活文档；TAPD 写操作前须询问 |
| `test-engineer.md` | 测试 | 独立分支 3.5（占位） | `testing.md` | 测试用例/报告（待扩展） | 规则未定稿，触发时提示先补规范 |

> **只读约束**：qa-reviewer 的"只审查不修改"通过提示词强制（本文件 + 角色文件双重声明），不依赖 hooks 强制。其唯一输出是结构化偏差报告文件。

---

## 三、阶段 ↔ Agent ↔ Reference ↔ 产物 映射

状态机内部用顺序整数 phase（0~11）存储，展示层保留 ②~⑫ 原编号（含 ⑤a/⑦b/⑦c/⑧a 子阶段）。双向映射集中在 `scripts/workflow-state-utils.cjs`，避免散落不一致。

| 内部 phase | 展示编号 | 名称 | 负责 Agent | 标志产物（门控校验） | 是否人工 Gate |
|:---:|---|---|---|---|:---:|
| 0 | ② | 生成静态页面 | figma-restorer | 静态页面代码（不强制文件校验） | |
| 1 | ③ | 检查 | qa-reviewer | 偏差报告文件 `<name>-review-static.md` | |
| 2 | ④ | 人工 Gate | orchestrator | `gateChecks.staticConfirmed=true` | ✅ |
| 3 | ⑤a⑤ | 业务文档方案确认+生成 | prd-analyst | `openspec/` 或 `fw_dev_spec/` 目录 | ⑤a 内嵌 |
| 4 | ⑥ | 检查 | qa-reviewer | 偏差报告文件 `<name>-review-prd.md` | |
| 5 | ⑦ | 人工 Gate | orchestrator | `gateChecks.docConfirmed=true` | ✅ |
| 6 | ⑦b | 接口定义生成 | api-contractor | 接口定义文件 | |
| 7 | ⑦c | 人工 Gate | orchestrator | `gateChecks.apiConfirmed=true` | ✅ |
| 8 | ⑧a⑧⑨ | 前置编排+设计桥梁+业务逻辑 | frontend-implementer | 业务代码（不强制文件校验） | ⑧a 内嵌 |
| 9 | ⑩ | 检查 | qa-reviewer | 偏差报告文件 `<name>-review-impl.md` | |
| 10 | ⑪ | 人工 Gate | orchestrator | `gateChecks.bizConfirmed=true` | ✅ |
| 11 | ⑫ | 终验 | orchestrator | 交付 | ✅ |

> **人工 Gate 内嵌说明**：⑤a（业务文档方案确认）与 ⑧a（第〇章前置编排）是 phase 内部的人工确认点，由对应 agent 在其 reference 流程内暂停询问，不单独占内部 phase。
>
> **代码类产物不强制文件校验**（phase 0/8）：与 jz 的"代码变更（git diff）不校验"一致，代码正确性交由 qa-reviewer 检查 + 后续人工 Gate 把关。

---

## 四、Agent 间上下文传递 Schema

复用 SKILL.md 2.4 的上下文传递规范作为 agent 间消息 schema。编排器 dispatch 时，将下列适用项**显式写入 dispatch 提示词**；agent 完成后，将产出上下文**回写进产物文件或状态文件**供下游读取。

| 上下文项 | 提供方 → 消费方 | 载体 |
|---------|----------------|------|
| 任务名 / storyId | orchestrator → 所有 | dispatch 提示词 + 状态文件 |
| 技术栈判断结果 | orchestrator → figma-restorer / frontend-implementer | dispatch 提示词 |
| Figma 节点 ID / Frame key | 用户 → figma-restorer / prd-analyst | dispatch 提示词 |
| 上一轮检查报告 | qa-reviewer → 生成类 agent（回流时） | 偏差报告文件路径 |
| 业务文档方案选择（OpenSpec / fw-dev-spec / 跳过） | orchestrator → prd-analyst / frontend-implementer | 状态文件 `bizDocPlan` |
| PRD capability / change-id | prd-analyst → frontend-implementer | OpenSpec 目录 / 活文档 |
| Swagger open.json 路径 / URL | 用户 → api-contractor | dispatch 提示词 |
| 接口模式画像 | api-contractor → frontend-implementer | 接口定义文件 + 画像摘要 |
| TAPD 需求 ID / workspace_id | 用户 → tapd-bugfixer | dispatch 提示词 |
| 横切安全硬约束 | orchestrator → **所有生成类 agent** | dispatch 提示词注入（见 §六） |

---

## 五、产出物命名约定

编排类产物统一落在**项目级** `.codebuddy/plans/` 目录（与状态文件同目录），便于中断恢复与跨 agent 交接；业务产物（OpenSpec / fw_dev_spec / 接口定义 / 代码）按各 reference 约定落在对应业务目录。

| 产物 | 路径 | 命名 |
|------|------|------|
| 工作流状态文件 | `.codebuddy/plans/` | `<任务名>-fw-state.json` |
| 静态页面偏差报告 | `.codebuddy/plans/` | `<任务名>-review-static.md` |
| 业务文档偏差报告 | `.codebuddy/plans/` | `<任务名>-review-prd.md` |
| 业务代码偏差报告 | `.codebuddy/plans/` | `<任务名>-review-impl.md` |
| OpenSpec 产物 | 项目根 | `openspec/`（按 3.2 reference） |
| 开发计划活文档 | 项目根 | `fw_dev_spec/<需求名-日期>/`（按 3.7 reference） |
| TAPD 修复计划 | 项目根 | `.bugfix-workflow/bugfix-plan-YYYY-MM-DD.md`（按 3.6 reference） |

---

## 六、敏感操作统一询问清单

遵循"**默认不限制工具，敏感操作前统一询问用户**"原则。以下操作任何 agent 执行前**必须暂停并询问用户确认**，不得自动执行：

| 类别 | 操作 |
|------|------|
| Git | `git add` / `git commit` / `git push` / 创建分支 / MR |
| 文件破坏 | 删除文件 / 整文件覆盖写 / 批量替换（影响 >3 个文件） |
| TAPD 写操作 | `update_bug`（状态变更）/ `create_comments`（发评论 @人） |
| 命令执行 | `npm` / `npx` 脚本（install / lint --fix / build / test）、其他有副作用的 shell 命令 |
| 部署 | 任何构建、发布、云端部署触发 |

> 询问时须说明：**要做什么、影响哪些文件/对象、是否可逆**。用户确认后方可执行。编排器持有最终询问职责，各 agent 遇敏感操作先上报编排器，由编排器统一向用户询问。

---

## 七、横切安全硬约束注入

`frontend-engineering-standards.md` 第四章（XSS / 输入校验 / 敏感信息）是**横切关注点**，不随 frontend-implementer 独占。编排器 dispatch **所有生成类 agent**（figma-restorer / frontend-implementer / tapd-bugfixer 的修复步骤）时，必须在 dispatch 提示词中注入以下提醒：

```
【横切安全硬约束 · 必须遵守】
- XSS：禁用 v-html 渲染未净化内容；富文本用项目认可的净化方案
- 输入校验：所有用户输入须校验
- 敏感信息：Token / 密钥 / 个人信息不得硬编码或泄露到日志/前端
依据：references/frontend-engineering-standards.md 第四章
```

---

## 八、编排器 Dispatch 提示词模板

编排器 spawn 专职 agent 时，使用以下模板组装 dispatch 提示词（通过 Task 工具调用 subagent）：

```
你是【<角色名>】，请严格按照 .agents/<角色文件>.md 履行职责。

## 任务上下文
- 任务名 / storyId：<任务名>
- 当前阶段：<展示编号 + 名称>
- 技术栈：<技术栈画像>

## 必读（执行前先 Read）
- references/<核心 reference>.md
- （回流时）上一轮偏差报告：.codebuddy/plans/<任务名>-review-*.md

## 输入
<本阶段输入：Figma 节点 / Swagger 路径 / 业务文档方案 / 上游产物路径等>

## 交付物
<本阶段产物 + 存放路径（见 §五）>

## 约束
【横切安全硬约束】（生成类 agent 注入，见 §七）
- 遇敏感操作先上报，不得自行执行（见 §六）
- 完成后回报产物路径与关键上下文，供编排器推进状态机
```

---

## 九、状态机使用说明

四个脚本位于 `scripts/`，由编排器（或其辅助）通过 `execute_command` 调用。原则："**AI 负责认知，脚本负责执行**"——确定性校验交给脚本，判断与生成交给 agent。

### 9.1 初始化工作流

```bash
node scripts/create-fw-workflow.cjs <任务名> [--start <内部phase>] [--title "<标题>"]
```

- 在 `.codebuddy/plans/` 创建 `<任务名>-fw-state.json`，初始化 `phases{}` 与 `gateChecks{}`
- `--start` 支持从指定内部 phase 起始（跳过②③等场景，如已有静态页面则从 phase 3 起）
- 输出初始状态 JSON

### 9.2 门控验证

```bash
node scripts/validate-fw-phase-gate.cjs <任务名> <目标内部phase>
```

- 校验：前置阶段已 completed、标志产物存在、`pendingConfirmations` 全 resolved、人工 Gate 对应 `gateChecks` 为 true
- 输出 `{ pass, blockers, warnings }`；`pass=false` 时编排器**不得推进**，向用户报告 blockers

### 9.3 阶段推进

```bash
node scripts/advance-fw-phase.cjs <任务名> <目标内部phase>
```

- 内部流程：门控验证 → 产物检查 → 更新状态（前一 phase 置 completed、目标 phase 置 running）→ 返回 `nextAgent`
- 输出 `{ success, nextAgent, phaseName, blockers }`；`nextAgent` 提示编排器下一步应 spawn 的 `.agents/` 角色

### 9.4 人工 Gate 置位

人工 Gate（④⑤a⑦⑦c⑧a⑪⑫）由编排器在获得用户确认后，将对应 `gateChecks` 字段置为 `true` 并写回状态文件（可用脚本或直接 `write_to_file`），门控才会放行后续生成阶段——把"未经确认不得进入下一阶段"从提示词约定升级为脚本强制。

### 9.5 待确认项管理

需求/方案中的模糊点写入状态文件 `pendingConfirmations[]`（`{ id, question, resolved, source }`）。`resolved=false` 存在时，门控阻断进入下一生成阶段，须用户逐项确认后由编排器置位。

---

## 十、检查循环与回流

- **回流上限**：每个检查阶段（③⑥⑩）最多回流 3 次；第 3 次仍未通过则标记"人工介入"，停止自动循环，上报编排器转人工。
- **回流载体**：qa-reviewer 输出偏差报告 → 编排器将报告路径 dispatch 回对应生成类 agent → 生成类 agent 修复后再交 qa-reviewer 复检。
- **偏差报告格式**（强制结构化，复用 SKILL.md 2.3）：

```
[偏差报告]
- 文件路径: <path>
- 行号: <行号区间>
- 规则来源: references/<file>.md · <章节>
- 偏差描述: <现象>
- 修复建议: <建议>
- 严重级别: 高 / 中 / 低
```

---

## 十一、独立分支说明

- **3.6 TAPD 缺陷修复**：不进 12 阶段主流程状态机。编排器路由到 tapd-bugfixer，由其对 `.bugfix-workflow/` 活文档做断点恢复，自带人工 Gate（缺陷筛选确认、验证后更新状态）。
- **3.7 fw-dev-spec 单独触发**：作为 PRD 产出单独使用时，由 prd-analyst 执行，产物供后续 ⑧⑨ 经第〇章探测接入。
- **3.5 测试**：testing.md 为占位骨架。test-engineer 触发时**提示"测试规范未定稿，需先补充 testing.md，勿套通用模板"**，不自动生成测试代码。

---

## 十二、边界与不变量

1. **编排器不亲自写生成类代码**：②⑤⑦b⑧⑨ 的生成工作必须 dispatch 给对应 agent；编排器只做调度、Gate、状态推进。
2. **人工 Gate 不可跳过**：④⑤a⑦⑦c⑧a⑪⑫ 必须人工确认，即使 qa-reviewer 报告通过。
3. **reference 规则正文不内联**：agent 文件只做指针引用，执行前必须 `Read` 对应 reference；本协议与各 reference 冲突时，**以各 reference 的领域规则为准**，本协议只管编排。
4. **两种模式并存**：用户可绕过编排直接 `Read` 单个 reference 使用，多 agent 模式不是唯一入口。
