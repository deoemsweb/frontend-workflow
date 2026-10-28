# 多 Agent 编排协议

> 本文件是 frontend-workflow **多 agents 协作模式的单一事实来源**。SKILL.md 只做指针路由；agent 角色定义见 `.agents/*.md`，其"知识来源"仍是本目录下各 `references/*.md`（规则正文不内联进 agent 文件）。
>
> 多 agent 模式与"reference 独立 `Read` 使用"两种模式**并存兼容**：本协议不改变任何既有 reference 的规则正文，只在编排层新增角色调度与状态机门控。

---

## 一、何时启用多 agent 模式

| 场景 | 是否启用多 agent | 说明 |
|------|:---:|------|
| 端到端全流程（②~⑫） | ✅ 启用 | 由编排器按阶段 spawn 专职 agent（唯一默认多 agent 场景） |
| 单阶段深度任务（如只做 Figma 还原、只生成 PRD） | 可选 | 用户明确要求"用多 agent / 团队协作"时启用；否则按原单 agent 顺序执行即可 |
| TAPD 缺陷修复（3.6） | 可选 | 用户明确要求时由 tapd-bugfixer 执行；默认单 agent 顺序执行 |
| 仅查阅某条规则 | ❌ 不启用 | 直接 `Read` 对应 reference，无需调度 |

启用与否由编排器在**意图解读阶段**与用户确认（见 SKILL.md 2.1）。启用后，编排器**不亲自编写业务/视觉代码**，只做 dispatch、Gate 管理与状态推进。

---

## 二、角色清单与职责边界

8 个角色定义于 `.agents/` 目录。职责边界遵循"**一个角色对应阶段表中一个或多个相邻阶段 + 一个核心 reference**"。

| Agent 文件 | 角色 | 覆盖阶段 | 核心 reference | 产物 | 读写权限约定 |
|-----------|------|---------|----------------|------|-------------|
| `workflow-orchestrator.md` | 编排器 | 全部（调度）+ 人工 Gate ④⑤a⑦⑦c⑧a⑪⑫ | 本文件 + SKILL.md | 意图清单、状态推进、Gate 记录 | 不亲自写生成类代码；可写状态文件 |
| `figma-restorer.md` | Figma 还原 | ② | `figma-design-constraint.md` + `frontend-engineering-standards.md` | 静态页面代码 + tokens.css | 可写页面/样式代码 |
| `prd-analyst.md` | 需求分析/PRD | ⑤ | `prototype-to-openspec-prd.md` 或 `fw-dev-spec.md` | OpenSpec specs/proposal/tasks 或 `fw_dev_spec/` 活文档 | 可写文档目录 |
| `api-contractor.md` | 接口契约 | ⑦b⑦c | `api-definition-generation.md` | 接口定义文件（函数+类型+JSDoc） | 可写接口定义文件 |
| `frontend-implementer.md` | 工程实现 | ⑧a⑧⑨ | `frontend-engineering-standards.md`（第〇章+全文） | 业务逻辑代码 | 可写业务代码 |
| `qa-reviewer.md` | 只读检查 | ③⑥⑩ | 按阶段对应 reference 的 QA/质量清单/工程硬约束 | 结构化偏差报告 | **只读，不写任何代码/文档** |
| `tapd-bugfixer.md` | TAPD 修复 | 独立分支 3.6 | `tapd-bugfix-workflow.md` + `tapd-tool-params.md` + `tapd-grouping-rules.md` + `tapd-plan-template.md` | 修复代码 + 评论 + 状态更新 | 可写修复代码/活文档；TAPD 写操作前须询问 |
| `test-engineer.md` | 测试 | 可选环节 ⑨→⑩（3.5） | `testing.md` + `cross-cutting.md`（铁律） | 测试用例文档 + 测试代码 + 执行报告 | 两段式：用例文档经内嵌人工 Gate 后才生成代码；测试命令执行前须询问 |

> **⑤a 归属**：⑤a（业务文档方案确认：OpenSpec / fw-dev-spec / 跳过）是 phase 3 内的**人工 Gate，由编排器执行并置位**；prd-analyst 只负责 ⑤ 的文档生成，收到编排器传入的方案选择后执行。
>
> **只读约束**：qa-reviewer 的"只审查不修改"通过提示词强制（本文件 + 角色文件双重声明）+ 语义工具白名单（见 §8.1），不依赖 hooks 强制。其唯一输出是结构化偏差报告内容（由编排器落盘）。

---

## 三、阶段 ↔ Agent ↔ Reference ↔ 产物 映射

状态机内部用顺序整数 phase（0~10）存储，展示层保留 ②~⑫ 原编号（含 ⑤a/⑦b⑦c/⑧a 子阶段）。⑦b（接口定义生成）与 ⑦c（接口人工验收）已合并为单一内部 phase 6，以 `gateChecks.apiConfirmed` 把关。双向映射集中在 `scripts/workflow-state-utils.cjs`，避免散落不一致。

| 内部 phase | 展示编号 | 名称 | 负责 Agent | 标志产物（门控校验） | 是否人工 Gate |
|:---:|---|---|---|---|:---:|
| 0 | ② | 生成静态页面 | figma-restorer | 静态页面代码（不强制文件校验） | |
| 1 | ③ | 检查 | qa-reviewer | 偏差报告文件 `<name>-review-static.md` | |
| 2 | ④ | 人工 Gate | orchestrator | `gateChecks.staticConfirmed=true` | ✅ |
| 3 | ⑤ | 业务文档生成 | prd-analyst | `openspec/` 或 `fw_dev_spec/` 目录 | ⑤a 由编排器确认 |
| 4 | ⑥ | 检查 | qa-reviewer | 偏差报告文件 `<name>-review-prd.md` | |
| 5 | ⑦ | 人工 Gate | orchestrator | `gateChecks.docConfirmed=true` | ✅ |
| 6 | ⑦b⑦c | 接口定义生成+人工验收 | api-contractor | 接口定义文件（不强制文件校验）+ `gateChecks.apiConfirmed=true` | ✅ |
| 7 | ⑧a⑧⑨ | 前置编排+设计桥梁+业务逻辑 | frontend-implementer | 业务代码（不强制文件校验） | ⑧a 内嵌 |
| 8 | ⑩ | 检查 | qa-reviewer | 偏差报告文件 `<name>-review-impl.md` | |
| 9 | ⑪ | 人工 Gate | orchestrator | `gateChecks.bizConfirmed=true` | ✅ |
| 10 | ⑫ | 终验 | orchestrator | 交付 | ✅ |

> **人工 Gate 内嵌说明**：⑤a（业务文档方案确认）由**编排器**在 phase 3 内先行与用户确认后置位；⑦b「模式确认」（接口模式画像确认，api-contractor 流程第 3 步）为 ⑦b 内嵌 Gate；⑧a（第〇章前置编排）由 frontend-implementer 在其 reference 流程内暂停询问，经编排器向用户确认；**用例审阅 Gate（3.5）** 通过后由编排器执行 `set-fw-gate.cjs <任务名> testCasesConfirmed --test-cases <用例文档路径>` 置位。上述 Gate 均不单独占内部 phase。
>
> **phase 0/7 代码产物弱校验**：推进前校验 git 工作区存在代码文件变更（过滤文档 / 依赖 / 构建产物；未跟踪目录展开到文件）；确无代码产出时显式追加 `--allow-empty`，并在状态文件 `allowEmptyPhases` 留痕；非 git 仓库降级为 warning。代码正确性仍由 qa-reviewer + 人工 Gate 把关。
>
> **phase 3 业务文档精确校验**：优先校验状态文件 `bizDocPath`（⑤ 完成后经 `set-fw-gate ... docConfirmed --biz-doc <路径>` 登记）；未登记时回退「目录 + 最近 120 分钟内有 Markdown 修改」，并输出 warning 提示补登记。

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
| 进程登记文件 | `.codebuddy/plans/` | `<任务名>-fw-processes.json`（`fw-process.cjs` 维护） |
| 静态页面偏差报告 | `.codebuddy/plans/` | `<任务名>-review-static.md` |
| 业务文档偏差报告 | `.codebuddy/plans/` | `<任务名>-review-prd.md` |
| 业务代码偏差报告 | `.codebuddy/plans/` | `<任务名>-review-impl.md` |
| OpenSpec 产物 | 项目根 | `openspec/`（按 3.2 reference） |
| 开发计划活文档 | 项目根 | `fw_dev_spec/<需求名-日期>/`（按 3.7 reference） |
| TAPD 修复计划 | 项目根 | `.bugfix-workflow/bugfix-plan-YYYY-MM-DD.md`（按 3.6 reference） |

---

## 六、敏感操作统一询问清单

> 本清单与 §七 的安全硬约束已提取至 `references/cross-cutting.md` 供各 `.agents/` 角色文件共享引用（避免多份拷贝漂移）；本节为编排层的权威定义。

遵循"**默认不限制工具，敏感操作前统一询问用户**"原则。以下操作任何 agent 执行前**必须暂停并询问用户确认**，不得自动执行：

| 类别 | 操作 |
|------|------|
| Git | `git add` / `git commit` / `git push` / 创建分支 / MR |
| 文件破坏 | 删除文件 / 整文件覆盖写 / 批量替换（影响 >3 个文件） |
| TAPD 写操作 | `update_bug`（状态变更）/ `create_comments`（发评论 @人） |
| 命令执行 | `npm` / `npx` 脚本（install / lint --fix / build / test）、其他有副作用的 shell 命令 |
| 长驻进程 | dev server / preview / mock server / 后台命令启动（**启动须询问**）；回收动作（`fw-process cleanup`）属强制收尾，不询问但必须执行并回报结果 |
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

编排器 spawn 专职 agent 时，使用以下模板组装 dispatch 提示词（通过 Task/subagent 工具调用 subagent，按宿主环境选择，见 §8.1）：

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
- 遇"严禁猜测"情形（接口契约/业务规则/字段含义不明、范围歧义）：**事实先自查**，确需用户裁决的决策按 `references/grilling.md` 上报编排器（含选项与推荐答案），不得自行向用户发问、不得带假设继续执行
- 完成后回报产物路径与关键上下文，供编排器推进状态机

【进程与资源约束】（启动任何本地服务的 agent 必读，见 `references/cross-cutting.md` 五）
- 启动 dev server / preview / mock server 前先登记：node scripts/fw-process.cjs register <任务名> --port <端口> --cmd "<命令>"
- 优先用 python scripts/testing/with_server.py 受控启动（自带端口预检与回收）；禁止裸后台启动
- 收尾必须回收并校验：node scripts/fw-process.cjs cleanup <任务名> && node scripts/fw-process.cjs check <任务名>
- 回报中必须附「回收结论」（released 端口 + check 通过）；存在残留不得宣称完成
```

### 8.1 qa-reviewer 专用：只读语义白名单（硬约束，按宿主映射工具名）

spawn **qa-reviewer** 时，上述模板的「约束」块**替换为**以下只读白名单（与 `.agents/qa-reviewer.md` 的「工具白名单」小节一致），不得注入任何写工具权限。白名单按**语义**定义，编排器 spawn 时映射为宿主实际工具名：

```
## 约束（只读，硬约束）
你仅可使用以下**语义类别**的工具，且全程不得调用任何写文件/改代码工具：
- 允许：读文件 / 文件搜索 / 内容搜索 / 目录列举（语义白名单）
- 允许：命令执行工具，仅限只读命令（如 lint、grep、cat、tsc --noEmit、npm run lint）
- 禁止：任何写文件 / 替换内容 / 删除文件工具
- 禁止：命令执行中的任何写操作（如 rm、git commit、npm install 写入等）
偏差与修复建议只能回传给编排器（由编排器落盘为偏差报告），不得自行修改源码。
```

**宿主工具名映射表**（编排器 spawn 时按宿主翻译）：

| 语义 | WorkBuddy / CodeBuddy | DeepSeek Harness |
|------|----------------------|------------------|
| 读文件 | `read_file` | `read` |
| 文件搜索 | `search_file` | `glob` |
| 内容搜索 | `search_content` | `grep` |
| 目录列举 | `list_dir` | `glob` / `pwsh(Get-ChildItem)` |
| 只读命令执行 | `execute_command`（只读） | `pwsh`（只读命令） |
| 写文件（禁止） | `write_to_file` | `write`（禁止） |
| 替换内容（禁止） | `replace_in_file` | `edit`（禁止） |
| 删除文件（禁止） | `delete_file` | `pwsh(Remove-Item)`（禁止） |
| spawn subagent | `Task` | `subagent` |

> 生成类 agent 的工具同理按宿主映射；本表是编排层跨宿主兼容的唯一映射来源，宿主差异不改变语义白名单的约束力。

## 九、状态机使用说明

状态机与资源脚本位于 `scripts/`，由编排器（或其辅助）通过命令执行工具调用（`execute_command` / `pwsh` 等，按宿主）。原则："**AI 负责认知，脚本负责执行**"——确定性校验交给脚本，判断与生成交给 agent。

### 9.1 初始化工作流

```bash
node scripts/create-fw-workflow.cjs <任务名> [--start <内部phase>] [--title "<标题>"] [--biz-doc <openspec|fw-dev-spec|skip>]
```

- 在 `.codebuddy/plans/` 创建 `<任务名>-fw-state.json`，初始化 `phases{}` 与 `gateChecks{}`
- `--start` 支持从指定内部 phase 起始（跳过②③等场景，如已有静态页面则从 phase 3 起）；`--start` 之前的阶段标记为 `skipped`
- `--biz-doc` 把业务文档方案预选写入状态文件 `bizDocPlan`（默认 null，待 ⑤a 确认）；值为 `skip` 时 validate 跳过业务文档目录产物校验（见 §9.7）
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

人工 Gate（④⑤a⑦⑦c⑧a⑪⑫）由编排器在**获得用户确认后**调用置位脚本写回状态文件，门控才会放行离开该 Gate 阶段——把"未经确认不得进入下一阶段"从提示词约定升级为**脚本强制**：

```bash
node scripts/set-fw-gate.cjs <任务名> <gateKey>        # gateKey: staticConfirmed | docConfirmed | apiConfirmed | bizConfirmed
node scripts/set-fw-gate.cjs <任务名> <gateKey> --unset # 回退返工时复位
```

- `validate-fw-phase-gate.cjs` 强校验：离开 Gate 阶段前，对应 `gateChecks[gateKey]` 必须为 `true`，否则 blocker 阻断
- `advance-fw-phase.cjs` **不自动置位** Gate；置位只有通过本脚本（或等价的人工确认记录）完成
- 置位记录写入状态文件 `gate_<gateKey>.{value,at}` 供事后审计

内嵌 Gate（不占 phase）与产物路径登记：

```bash
# 用例审阅 Gate（3.5）：必须带 --test-cases，供进入 ⑩ 前追溯
node scripts/set-fw-gate.cjs <任务名> testCasesConfirmed --test-cases <用例文档路径>

# 业务文档确认（⑤ 完成后登记本次文档路径，phase 3 精确校验）
node scripts/set-fw-gate.cjs <任务名> docConfirmed --biz-doc <活文档文件或 openspec change 目录>
```

- `testCasesConfirmed` 无对应 phase，输出「内嵌 Gate（不占 phase）」；`validate` 在 `target ≥ 8` 且 `testCasesDoc` 非空时强校验该键；
- `--test-cases` / `--biz-doc` 与 gateKey 错配时脚本直接报错，避免写错字段。

### 9.5 待确认项管理（grilling 语义）

需求/方案中的模糊点写入状态文件 `pendingConfirmations[]`，schema 为 `{ id, question, options, recommendation, resolved, source }`——`question` 为决策问题，`options` 为可选项，`recommendation` 为基于已探查事实的推荐答案（承接 `references/grilling.md` 的 frontier 轮次格式）。

执行规则：
- agent 上报的不确定点由编排器登记入列（`resolved=false`）；存在未 resolved 项时门控阻断进入下一生成阶段；
- 编排器把待确认项**凑满一轮 frontier**（每轮 ≤4 问）后统一按「❓ Q 编号 + ➡️ 推荐答案」格式问用户（格式见 grilling.md 第三章）；
- 用户逐项确认（或整体授权默认）后由编排器置位 `resolved=true` 并回写上下文；同一决策点最多追问 2 轮，超限按 grilling.md 第四章降级为假设清单。

### 9.6 阶段回退（返工）

当某阶段产物经人工/Gate 评审需"返工"时，编排器调用回退脚本将状态机后向流转，**已完成阶段的产物文件（偏差报告、OpenSpec 目录等）不做删除**，仅重置状态：

```bash
node scripts/rollback-fw-phase.cjs <任务名> <目标内部phase>
```

- 仅允许后向回退（`目标 phase < 当前 phase`），否则报错退出；**目标为 skipped 的阶段不可回退**（skipped 语义表示本阶段本就不执行）
- 将 `[目标 phase, TOTAL_PHASES)` 区间内所有 phase 重置为 `pending`（清除 `startedAt/completedAt`），目标 phase 置 `running`；区间内人工 Gate 的 gateChecks 复位 false；回流计数 `reviewLoopCount` 清零
- 输出 `{ success, fromPhase, toPhase, nextAgent, ... }`；编排器据 `nextAgent` 重新 spawn 对应角色
- 回退后再次推进前，`validate-fw-phase-gate.cjs` 仍会对 `pending/running` 前置 phase 正常拦截

### 9.7 阶段跳过与提前完成

- **阶段跳过**（如 ⑤a 确认"跳过业务文档"后，跳过 ⑤⑥⑦）：

```bash
node scripts/skip-fw-phase.cjs <任务名> 3 4 5
```

  已完成（completed）阶段不可跳过；跳过人工 Gate 阶段时其 gateChecks 同步复位；若跳过的是当前阶段，自动前进到下一个未 skipped 的 phase。
- **代码阶段空产出放行**（phase 0/7 无工作区变更但确属预期，如纯配置/纯文档任务）：

```bash
node scripts/advance-fw-phase.cjs <任务名> <目标phase> --allow-empty
```

  放行后状态文件写入 `allowEmptyPhases[phase] = { at, reason }` 留痕；不得用于掩盖"代码没写"。validate 单独调用时同样支持 `--allow-empty`。
- **提前完成**（如接口-only 任务走完 ⑦b⑦c、静态页-only 任务走完 ④ 后收尾）：

```bash
node scripts/finish-fw-workflow.cjs <任务名>
```

  将剩余未完成阶段标记 skipped、终验置 completed、工作流 status=completed，避免状态文件永久 running。
- **冒烟测试**：改动状态机脚本后可运行 `node scripts/smoke-fw-scripts.cjs`（临时目录全链路回归，含状态机主链路 + bizdoc/workspace 校验 + 用例门控 + 进程登记/回收/收尾阻断，当前 61 项断言）。

### 9.8 收尾与资源回收（进程）

本地自测（dev server / preview / mock server）必须登记并回收，规则见 `references/cross-cutting.md` 五，实现见 `scripts/fw-process.cjs`。

```bash
node scripts/fw-process.cjs register <任务名> --port <端口> --cmd "<命令>"   # 启动前登记
node scripts/fw-process.cjs list     <任务名>                              # 查看登记与存活状态
node scripts/fw-process.cjs check    <任务名>                              # 残留校验（0=无残留）
node scripts/fw-process.cjs cleanup  <任务名>                              # 回收并校验端口释放
node scripts/fw-process.cjs cleanup  <任务名> --all-tasks                  # 跨任务兜底清理
```

编排器职责：

1. dispatch 含本地服务的阶段（3.5 测试、⑩ 检查、3.6 缺陷验证）时，注入上文 dispatch 模板的「进程与资源约束」块；
2. 回收各 agent 结论时核验「回收结论」（released 端口 + `check` 通过），缺失视为未完成；
3. `finish-fw-workflow.cjs` 默认阻断残留进程（`--allow-residual-processes` 可显式放行，需向用户说明）；
4. 会话结束/用户中断时执行 `cleanup --all-tasks` 兜底，避免端口与 CPU 长期占用。

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

- **3.6 TAPD 缺陷修复**：不进 ②~⑫ 主流程状态机。编排器路由到 tapd-bugfixer，由其对 `.bugfix-workflow/` 活文档做断点恢复，自带人工 Gate（缺陷筛选确认、验证后更新状态）。
- **3.7 fw-dev-spec 单独触发**：作为 PRD 产出单独使用时，由 prd-analyst 执行，产物供后续 ⑧⑨ 经第〇章探测接入。
- **3.5 测试（可选环节，正式）**：定位为主流程可选环节，插在 ⑨→⑩ 之间，由 test-engineer 执行，规则以 `testing.md` 为准。采用**两段式**：① 从业务文档（OpenSpec Scenario / fw_dev_spec 活文档）生成 Markdown 测试用例文档；② 经**内嵌人工 Gate（用例审阅）**确认后才生成可执行测试代码（E2E 走 `scripts/testing/` 的 Playwright 执行层）。该 Gate 为角色流程内嵌 Gate（同 ⑤a/⑧a 模式），不占状态机 phase，但**通过后必须置位**：`node scripts/set-fw-gate.cjs <任务名> testCasesConfirmed --test-cases <用例文档路径>`；已登记 `testCasesDoc` 而未置位时，`validate` 在进入 ⑩ 前阻断。测试命令执行属敏感操作，须先上报编排器询问；"测试通过"断言受 `cross-cutting.md` 三（完成前验证铁律）约束。**测试涉及的本地进程（dev server / mock server）必须按 `cross-cutting.md` 五登记与回收**，结论中附 `fw-process check` 通过证据。

---

## 十二、边界与不变量

1. **编排器不亲自写生成类代码**：②⑤⑦b⑦c⑧⑨ 的生成工作必须 dispatch 给对应 agent；编排器只做调度、Gate、状态推进。
2. **人工 Gate 不可跳过**：④⑤a⑦⑦c⑧a⑪⑫ 必须人工确认（⑤a 由编排器执行、⑦b「模式确认」为内嵌 Gate、⑧a 内嵌于 ⑧、3.5 用例审阅为内嵌 Gate），即使 qa-reviewer 报告通过；确认后经 `set-fw-gate.cjs` 置位（内嵌 Gate 用 `testCasesConfirmed --test-cases`），未置位不得推进。
3. **reference 规则正文不内联**：agent 文件只做指针引用，执行前必须 `Read` 对应 reference；本协议与各 reference 冲突时，**以各 reference 的领域规则为准**，本协议只管编排。
4. **两种模式并存**：用户可绕过编排直接 `Read` 单个 reference 使用，多 agent 模式不是唯一入口。
5. **本地进程必须收口**：长驻进程启动前登记、收尾必回收并校验端口释放；`finish` 默认阻断残留，任何"完成"结论不得带未回收进程（见 `cross-cutting.md` 五）。
