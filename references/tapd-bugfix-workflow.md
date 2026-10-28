# TAPD 缺陷修复标准化流程

> 本文件是 `frontend-workflow` 统一 skill 的第 6 个分支（**3.6 TAPD 缺陷修复**）的核心规则正文。命中分支后由 `SKILL.md` 路由 `Read` 本文件执行。
>
> 涉及的工具均为 TAPD MCP 工具，统一使用 `mcp__tapd__` 前缀。详细参数 schema 见 `references/tapd-tool-params.md`。
>
> **前置验证（强制）**：进入阶段一之前必须先通过「阶段零：前置验证」的 TAPD MCP 连通性探针；探针未通过（工具不可用/未鉴权）须立即中止流程，不得继续。
>
> **前端代码修复的规范来源**：本分支不做前端工程规范的内联重写，执行「阶段四 4.1 前端缺陷 — 代码修复」前必须先 `Read` `references/frontend-engineering-standards.md`（UI 类 Bug 再加 `Read` `references/figma-design-constraint.md`），使安全硬约束（禁止 `v-html`、API 三态、输入校验等）与视觉还原约束自然生效，避免规范漂移。

## 输入参数

| 参数 | 必填 | 说明 | 示例 |
|------|------|------|------|
| 需求ID | 是 | TAPD 需求/故事 ID | `1138260062001029247` |
| 前端开发人员 | 是 | 前端处理人姓名（TAPD 真实姓名） | `开发人员xxx` |
| 后端开发人员 | 否 | 后端处理人姓名，用于@后端发评论 | `开发人员xxx` |
| 产品人员 | 否 | 产品经理姓名，用于@产品发评论 | `李紫茵` |
| 测试人员 | 否 | 测试人员姓名，修复完成后@测试关注验证 | `张测试` |

---

## 阶段零：前置验证 — 确认 TAPD MCP 工具可用

进入正式流程（阶段一）之前，先验证 TAPD MCP 工具链**已连接且已鉴权**，避免在中途调用失败导致流程中断、或产生半成品活文档计划。

### 步骤 — 连通性探针

调用轻量探针工具 `mcp__tapd__get_user_participant_projects`（无需必填参数，`nick` 缺省取当前 TAPD 用户；参数 schema 见 `references/tapd-tool-params.md`）：

- **成功**（返回用户参与的项目列表）→ TAPD MCP 已连接且已鉴权，进入「阶段一：准备 — 提取 workspace_id」。
- **失败 / 工具不可用**，出现以下任一情况 → **立即中止整个流程**，并向用户输出提示，**不创建计划文档、不发起任何缺陷查询**：
  - 报「未知工具 `mcp__tapd__...`」或工具列表中没有 `mcp__tapd__` 前缀工具 → TAPD MCP Server 未连接；
  - 超时 / 网络错误 → 连接异常；
  - `401` / 鉴权失败 / 返回空且非预期 → `TAPD_ACCESS_TOKEN` 无效或过期。

  中止提示文案：

  > ⚠️ TAPD MCP 工具当前不可用或未鉴权，缺陷修复流程已中止。
  > 请先：①确认 `mcp-server-tapd` 已在当前环境启用并连接；②确认 `TAPD_ACCESS_TOKEN` 有效且未过期；③重新发起缺陷修复请求。

> 仅在探针通过后，才继续执行阶段一及后续 5 阶段。探针本身不依赖尚未提取的 workspace_id，且通过后流程中不再重复调用。

---

## 阶段一：准备 — 提取 workspace_id

TAPD 实体 ID 格式为 `11{workspace_id}00{sequential}`，workspace_id 从索引 2 开始取 8 个字符。

提取逻辑：`workspace_id = story_id.substring(2, 10)` 或使用 `scripts/extract_workspace_id.py <story_id>`。

示例：`1138260062001029247` → `38260062`

**错误处理**：若提取的 workspace_id 非纯数字或 ID 长度不足 12 位，向用户询问 workspace_id。

---

## 阶段二：读取并筛选缺陷

### 步骤 1 — 获取关联 Bug ID 列表

调用 `mcp__tapd__get_related_bugs`：

```
workspace_id: <提取的workspace_id>
options: { "story_id": "<需求ID>" }
```

**错误处理**：若返回空列表，告知用户"该需求无关联缺陷"，流程结束。

### 步骤 2 — 获取自定义字段配置（前置）

使用 `custom_field_*` 查询前必须先获取字段映射。调用 `mcp__tapd__get_entity_custom_fields`：

```
workspace_id: <workspace_id>
options: { "entity_type": "bugs" }
```

**兜底策略**：若 `"bugs"` 返回错误，依次尝试 `"stories"` → `"tasks"`（TAPD 文档对 bugs 的 entity_type 取值存在不一致）。

### 步骤 3 — 批量获取 Bug 详情

调用 `mcp__tapd__get_bug`，**使用批量查询**（ID 用 `|` 分隔），并在 API 层做状态预筛选（`status` 参数用 `|` 分隔多个状态）。参数 schema 详见 `references/tapd-tool-params.md`。

若返回的 Bug 数量超过 100，使用 `page` 参数分页获取剩余数据。

**错误处理**：若 MCP 调用失败，重试一次；重试仍失败则提示用户"TAPD API 调用失败，请检查连接"。

### 步骤 4 — 处理后筛选

对返回结果做二次筛选（`current_owner`/`fixer`/`de` 包含前端开发人员姓名），因为 `status` 已在 API 层过滤。

**错误处理**：若筛选后零结果，告知用户"所有关联缺陷均已关闭或不归当前前端开发负责"。

### 步骤 5 — 确认

向用户展示筛选结果表格：

| 序号 | Bug ID | 标题 | 状态 | 严重程度 | 处理人 |
|------|--------|------|------|---------|--------|
| 1 | #2986 | ... | new | normal | 开发人员xxx |

**等待用户确认**后再进入下一阶段。若用户要求调整筛选条件，重新执行步骤 3-4。

---

## 阶段三：生成修复计划

### 缺陷分组

对每个 Bug 分析描述和标题，按规则分组。详细判定规则见 `references/tapd-grouping-rules.md`。判定时可调用 `mcp__tapd__get_comments` 查看 Bug 已有评论以辅助分组：

| 分组 | 操作 |
|------|------|
| **A. 前端缺陷** | 修改代码修复 |
| **B. 后端缺陷** | 发评论 @后端开发人员 |
| **C. 需求问题** | 发评论 @产品人员 |

### 状态映射（可选）

若需确认项目的状态映射关系，按以下步骤获取：

1. `mcp__tapd__get_workitem_types` → 获取项目的需求类别列表 → 取第一个类别的 `id` 作为 `workitem_type_id`
2. `mcp__tapd__get_workflows_status_map`：
   ```
   workspace_id: <workspace_id>
   options: { "system": "bug", "workitem_type_id": <步骤1获取的id> }
   ```

### 计划文档

将修复计划写入 **项目根目录下的** `.bugfix-workflow/bugfix-plan-YYYY-MM-DD.md`。写入前确保目录存在（不存在则用 `mkdir -p .bugfix-workflow/` 创建）。

模板格式见 `references/tapd-plan-template.md`。模板采用**活文档模式**，所有 Bug 和步骤初始状态标记为 `⬜`，Agent 在执行过程中实时更新状态标记（`⬜` → `🔄` → `✅`），中断后可从文档恢复进度。

计划文档生成后告知用户，直接进入执行阶段。

---

## 阶段四：执行修复

### 恢复检测（活文档）

进入阶段四前，先检查是否存在可恢复的计划文档：

1. 读取 `.bugfix-workflow/` 下**最新**的 `bugfix-plan-*.md`（按文件名日期/修改时间取最新；跨天中断也能恢复）
2. 检查「当前状态」字段：
   - `✅ 已完成 — 等待验证` → 跳到阶段五
   - `⬜ 计划已生成` → 从 4.1 开始正常执行
   - 某阶段为 `🔄` → 从该阶段中断处继续（读取进度总览表定位）
3. 若目录下无任何 `bugfix-plan-*.md` → 从阶段一正常执行

### 4.1 前端缺陷 — 代码修复

> **规范前置（整合要点）**：开始写代码前，先 `Read` `references/frontend-engineering-standards.md`（前端工程通用规范：类型安全 / API 三态 / 状态管理 / 安全硬约束 / 性能优化 / 注释文档）；若该 Bug 属 UI 展示/样式/交互类，再加 `Read` `references/figma-design-constraint.md`（像素级还原约束与 QA Checklist）。修复必须遵循上述规范的硬约束，尤其 **禁止 `v-html`、用户输入须转义、禁止硬编码敏感信息** 等安全规则，无论 TAPD 描述是否体现均须遵守。

1. 读取 `.bugfix-workflow/` 下最新的 `bugfix-plan-*.md`，定位进度总览表，将「A. 前端修复」标记为 `🔄`
2. 按修复计划逐个修复，**每个 Bug 修复前后更新计划文档状态**：
   - 开始修复 → 将 Bug 状态标记为 `🔄 修复中`
   - 修复完成 → 将 Bug 状态标记为 `✅ 已修复`，补充修复记录
   - 检查 `package.json` 中是否存在 `lint`/`type-check` script，有则运行；无则目检
3. 全部分组 A Bug 修复完成后，进度总览「A. 前端修复」标记为 `✅`，**实施步骤第 1 步勾选为 `[x]`**
4. 汇总变更

### 4.2 后端缺陷 — 发 TAPD 评论

1. 进度总览「B. 后端通知」标记为 `🔄`
2. 对每个后端缺陷，调用 `mcp__tapd__create_comments`（参数 schema 见 `references/tapd-tool-params.md`），评论内容：`@{后端开发人员} 这个问题需要后端协助：\n\n问题：{问题描述}\n\n请帮忙检查接口/数据，谢谢！`
3. **发完评论后更新计划文档**：Bug 状态标记为 `✅ 已通知`，补充评论记录，实施步骤第 2 步勾选为 `[x]`
4. 全部完成后，进度总览「B. 后端通知」标记为 `✅`

评论要求：开头 @后端开发人员、说明具体问题和复现步骤、语气礼貌。

### 4.3 需求问题 — 发 TAPD 评论

1. 进度总览「C. 产品确认」标记为 `🔄`
2. 对每个需求问题，调用 `mcp__tapd__create_comments`（参数 schema 见 `references/tapd-tool-params.md`），评论内容：`@{产品人员} 这个问题需要产品确认：\n\n问题：{问题描述}\n\n请确认期望的行为/文案/交互，谢谢！`
3. **发完评论后更新计划文档**：Bug 状态标记为 `✅ 已通知`，补充评论记录，实施步骤第 3 步勾选为 `[x]`
4. 全部完成后，进度总览「C. 产品确认」标记为 `✅`

### 4.4 通知测试人员

若提供了测试人员参数：
1. 进度总览「D. 测试通知」标记为 `🔄`
2. 对每个已完成的前端修复 Bug，调用 `mcp__tapd__create_comments`（参数 schema 见 `references/tapd-tool-params.md`），评论内容：`@{测试人员} 该缺陷已修复，请验证：\n\n修复内容：{修复简述}\n\n如有问题请反馈，谢谢！`
3. **发完评论后更新计划文档**：实施步骤第 4 步勾选为 `[x]`
4. 全部完成后，进度总览「D. 测试通知」标记为 `✅`

若未提供测试人员，进度总览「D. 测试通知」标记为 `⏭` 已跳过。

> **并行提示**：4.2、4.3、4.4 之间无依赖关系，可在同一消息中并行发起多个 `mcp__tapd__create_comments` 调用以加速执行。

### 4.5 修复验证

修复完成后：
0. **先回收本地自测进程**：若为复现/验证启动过 dev server / serve-test / mock server，执行
   `node scripts/fw-process.cjs cleanup <任务名> && node scripts/fw-process.cjs check <任务名>`，
   端口全部释放（check exit 0）后才进入下一步；回收结论记入计划文档（见 `references/cross-cutting.md` 五）。
1. 将计划文档顶部「当前状态」更新为 `✅ 已完成 — 等待验证`
2. 确认所有修复已通过 lint/type-check 检查（已在 4.1 中逐 Bug 执行）
3. 汇总所有变更（前端修复 + 后端评论 + 需求评论 + 测试通知）
4. 告知用户「修复已完成，请验证」

**不自动更新 Bug 状态**，等待用户验证。

---

## 阶段五：验证通过后更新状态

**前置检查**：更新状态前先确认本地无残留自测进程（`node scripts/fw-process.cjs check <任务名>` 退出码 0）；存在残留先 `cleanup`，避免"验证用服务"长期占用端口/资源。

当用户确认验证通过后，调用 `mcp__tapd__update_bug` 将对应 Bug 状态更新为已解决（参数 schema 见 `references/tapd-tool-params.md`），`v_status` 使用中文状态名"已解决"，TAPD 自动映射为 `resolved`。

- 并行更新所有已验证通过的 Bug（在同一消息中发起多个调用）
- 仅更新用户确认的 Bug

**错误处理**：若 `mcp__tapd__update_bug` 调用失败，重试一次；重试仍失败则告知用户哪些 Bug 更新失败，由用户手动处理。

**活文档更新**：Bug 状态更新成功后，同步更新计划文档：
1. 将对应 Bug 的状态标记为 `✅ 已解决`
2. 全部更新完成后，将计划文档顶部「当前状态」更新为 `✅ 全部完成`

更新完成后展示结果表格：

| Bug ID | 标题 | 新状态 |
|--------|------|--------|
| #2986 | ... | ✅ 已解决 |

---

## 注意事项

1. TAPD MCP 工具统一使用 `mcp__tapd__` 前缀，参数 schema 详见 `references/tapd-tool-params.md`
2. workspace_id 从需求 ID 自动提取，无需用户额外提供（脚本见 `scripts/extract_workspace_id.py`）
3. 评论 @ 人名使用 TAPD 中的真实姓名
4. 修复计划写入项目根目录的 `.bugfix-workflow/`，写入前检查目录存在性
5. 验证通过后才更新状态，修复阶段不自动改状态
6. 前端代码修复须复用 `references/frontend-engineering-standards.md` 的工程规范与安全硬约束，UI 类 Bug 加 `references/figma-design-constraint.md`
7. 修复完成后追加工作记录到项目 memory
8. 本地启动的自测/复现服务必须登记并回收（`scripts/fw-process.cjs`），不得遗留 dev server 占用端口
