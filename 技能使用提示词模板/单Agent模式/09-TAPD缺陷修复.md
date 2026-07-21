# 提示词模板 08：TAPD 缺陷修复（需求关联缺陷 / 批量修 bug）

> 规则依据：`references/tapd-bugfix-workflow.md`（3.6 独立分支，含阶段零前置验证 + 5 阶段流程）。
> 适用：根据 TAPD 需求 ID 拉取关联缺陷、筛选前端负责的 Bug、生成活文档修复计划并执行（前端代码修复 / 发评论通知后端·产品·测试），验证通过后更新状态。是开发后维护生命周期分支，不进入 ②~⑫ 主流程。
> 前端代码修复（4.1）须复用 `references/frontend-engineering-standards.md`（UI 类 Bug 加 `references/figma-design-constraint.md`），继承安全硬约束与工程规范。

---

## 模板 A：完整版

```text
请使用 frontend-workflow skill，按 references/tapd-bugfix-workflow.md（3.6 TAPD 缺陷修复独立分支）处理下面需求的关联缺陷。

【输入】
- 需求ID：{{story_id}}                        # TAPD 需求 / 故事 ID，如 1138260062001029247
- 前端开发人员：{{frontend_dev}}              # 前端处理人真实姓名（用于筛选 current_owner/fixer/de）
- 后端开发人员：{{backend_dev}}              # 可选，用于@后端发评论
- 产品人员：{{product}}                      # 可选，用于@产品发评论
- 测试人员：{{qa}}                           # 可选，修复完成后@测试关注验证

【执行要求】
0. 阶段零 — 前置验证（强制）：先调用 mcp__tapd__get_user_participant_projects 做 TAPD MCP 连通性探针。
   - 成功（返回项目列表）→ 继续阶段一；
   - 失败 / 工具不可用（未知工具、超时、401 鉴权失败）→ 立即中止整个流程，不创建计划、不发任何查询，向用户输出中止提示；不要继续。
1. 阶段一 — 准备：从需求 ID 自动提取 workspace_id（substring(2,10)，或用 scripts/extract_workspace_id.py）。非纯数字或长度不足 12 位则向用户询问。
2. 阶段二 — 读取并筛选缺陷：调 mcp__tapd__get_related_bugs 取关联 Bug → mcp__tapd__get_entity_custom_fields 取字段映射 → mcp__tapd__get_bug（批量，| 分隔）按状态预筛选 → 二次筛选归当前前端开发的 Bug。
   - 向用户展示筛选结果表格（Bug ID / 标题 / 状态 / 严重程度 / 处理人），【人工 Gate · 缺陷筛选确认】必须等我确认后再进入下一阶段。
3. 阶段三 — 生成计划：按 frontend/backend/需求问题 分组（判定规则见 references/tapd-grouping-rules.md，必要时调 mcp__tapd__get_comments 辅助），将活文档计划写入项目根目录 .bugfix-workflow/bugfix-plan-YYYY-MM-DD.md（目录不存在先 mkdir -p），模板见 references/tapd-plan-template.md；状态初始 ⬜，执行中实时更新 ⬜→🔄→✅。
4. 阶段四 — 执行修复：
   - 4.1 前端缺陷：先 Read references/frontend-engineering-standards.md（UI 类加 references/figma-design-constraint.md），遵循安全硬约束（禁止 v-html / 输入转义 / 不硬编码敏感信息）逐 Bug 修复，有 lint/type-check 则运行；
   - 4.2 后端缺陷：调 mcp__tapd__create_comments @后端开发人员；
   - 4.3 需求问题：调 mcp__tapd__create_comments @产品人员；
   - 4.4 通知测试：若提供测试人员，调 mcp__tapd__create_comments @测试人员；未提供则标记跳过。
   每完成一项即时更新活文档状态。4.2/4.3/4.4 无依赖可并行发起。
5. 阶段五 — 验证后更新状态：【人工 Gate · 验证通过】必须等我确认缺陷已修复并验证通过后，才调 mcp__tapd__update_bug（v_status="已解决"）更新状态；仅更新我确认的 Bug，并行更新。不自动改状态、不脑补验证结论。

【硬约束】
- 仅当阶段零探针通过才继续；工具不可用立即中止，不创建半成品计划。
- 缺陷筛选确认、验证后更新状态两个 Gate 必须等我确认，绝不可自动跳过。
- 安全硬约束（XSS / 输入校验 / 敏感信息）全程生效，无论 Bug 描述是否体现。
- 不猜测接口契约 / 业务规则 / 字段含义，信息不足停下问，标注 > ⚠️ 待确认。
- 修复完成后追加工作记录到项目 memory。
```

## 模板 B：精简版（一行触发）

```text
用 frontend-workflow skill 按 references/tapd-bugfix-workflow.md（3.6）修复需求 {{story_id}} 的关联缺陷，前端处理人 {{frontend_dev}}。先跑 TAPD MCP 连通性探针（不通就中止），自动提取 workspace_id、拉取筛选归我负责的 Bug 等你确认；生成 .bugfix-workflow/ 活文档计划后执行（前端修复复用工程规范，UI 类加视觉约束，后端/产品/测试评论通知），修复完等我验证通过再更新状态。
```

## 占位符说明

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `{{story_id}}` | TAPD 需求 / 故事 ID（必填，用于提取 workspace_id 与拉取关联缺陷） | `1138260062001029247` |
| `{{frontend_dev}}` | 前端处理人真实姓名（必填，用于筛选归当前前端负责的 Bug） | `傅成龙` |
| `{{backend_dev}}` | 后端处理人姓名（可选，用于@后端发评论） | `linweicheng` |
| `{{product}}` | 产品经理姓名（可选，用于@产品发评论） | `李紫茵` |
| `{{qa}}` | 测试人员姓名（可选，修复完成后@测试关注验证） | `张测试` |

## 多 Agent 模式（独立分支启用）

TAPD 缺陷修复是**独立生命周期分支**，默认即由专职 agent **`tapd-bugfixer`**（`.agents/tapd-bugfixer.md`）执行，编排器 `workflow-orchestrator`（`.agents/workflow-orchestrator.md`）仅做入口路由，不进入 ②~⑫ 主流程状态机。如需显式多 agent 协作，在提示词开头追加「用多 agent / 团队协作模式」；缺陷筛选确认、验证后更新状态两处 Gate 仍须人工确认，TAPD 写操作（`update_bug` / `create_comments`）前须询问。完整协议见 `references/multi-agent-orchestration.md`（§十一 3.6）。
