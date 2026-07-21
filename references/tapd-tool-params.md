# TAPD MCP 工具参数速查

本 reference 列出 tapd-bugfix-workflow 流程中涉及的所有 TAPD MCP 工具及其关键参数。在调用任何工具前，始终使用完整前缀 `mcp__tapd__`。

## 工具一览

| 阶段 | 工具 | 用途 |
|------|------|------|
| 阶段零 | `mcp__tapd__get_user_participant_projects` | 连通性探针（无需参数，验证 MCP 已连接且鉴权） |
| 阶段一 | 无（纯计算） | workspace_id 提取 |
| 阶段二 | `mcp__tapd__get_related_bugs` | 获取需求关联的 Bug ID 列表 |
| 阶段二 | `mcp__tapd__get_entity_custom_fields` | 获取 bugs 的自定义字段映射 |
| 阶段二 | `mcp__tapd__get_bug` | 批量获取 Bug 详情 |
| 阶段二 | `mcp__tapd__get_workitem_types` | 获取项目需求类别（用于 status map） |
| 阶段二 | `mcp__tapd__get_workflows_status_map` | 获取缺陷状态中英文映射 |
| 阶段四 | `mcp__tapd__get_comments` | 读取已有评论（可选，用于分组判定） |
| 阶段四 | `mcp__tapd__create_comments` | 发评论 @相关人员 |
| 阶段五 | `mcp__tapd__update_bug` | 更新 Bug 状态为已解决 |

---

## mcp__tapd__get_user_participant_projects

阶段零连通性探针，用于确认 TAPD MCP 已连接且已鉴权。**无需必填参数**。

```
options:
  nick: ""   # 可选，缺省取 client.nick / 环境变量 CURRENT_USER_NICK
```

返回：用户参与的项目列表（若 `category` 为 `organization` 代表公司，获取参与项目时需过滤掉）。

判定：调用成功即代表 MCP 可用且令牌有效；失败（报「未知工具」/ 超时 / `401` 鉴权失败）则说明未连接或未鉴权，缺陷修复流程应直接中止，不进入阶段一。

---

## mcp__tapd__get_related_bugs

```
workspace_id: <int|string>  # 项目ID，必填
options:
  story_id: <string>        # 需求ID，必填
```

返回：关联的 Bug ID 列表。

---

## mcp__tapd__get_entity_custom_fields

**在前端调用 `get_bug` 使用 `custom_field_*` 前必须先调用此接口。**

```
workspace_id: <int|string>  # 项目ID，必填
options:
  entity_type: "bugs"       # 获取缺陷的自定义字段配置，必填
```

注意：`get_entity_custom_fields` 文档列出的 entity_type 取值为 `stories/tasks/iterations/tcases`，不含 `bugs`，但 `get_bug` 文档示例使用 `"bugs"`。**兜底策略**：先尝试 `"bugs"`，若返回错误依次尝试 `"stories"` → `"tasks"`。

---

## mcp__tapd__get_bug

支持**多 ID 批量查询**（用 `|` 分隔），优先使用批量模式而非逐个获取。

```
workspace_id: <int|string>  # 项目ID，必填
options:
  id: "<id1>|<id2>|<id3>"   # 支持多ID，用 | 分隔
  fields: "id,title,status,description,severity,priority,current_owner,fixer,de,te,reporter,created,bugtype,custom_field_one,custom_field_two,resolution"
  limit: 100                # 提高默认限制，避免分页
  status: "new|reopened|in_progress|assigned|open"  # API 层预筛选状态
```

注意：
- `status` 参数可做 API 层预筛选，减少不必要的网络传输
- 如超过 100 条，使用 `page` 参数分页
- `custom_field_*` 的 key 名来自 get_entity_custom_fields 的返回值

---

## mcp__tapd__get_workitem_types

获取项目下的需求类别，用于 get_workflows_status_map 的 `workitem_type_id` 参数。

```
workspace_id: <int|string>  # 项目ID，必填
options: {}                 # 可选
```

---

## mcp__tapd__get_workflows_status_map

获取缺陷状态的中英文映射关系。

```
workspace_id: <int|string>  # 项目ID，必填
options:
  system: "bug"             # 缺陷系统，必填
  workitem_type_id: <int>   # 需求类别ID，必填（从 get_workitem_types 获取）
```

---

## mcp__tapd__get_comments

（可选）读取 Bug 的已有评论，用于分组判定时了解历史讨论。

```
workspace_id: <int|string>  # 项目ID，必填
options:
  entry_id: "<bug_id>"      # 评论所依附的实体ID，必填
  entry_type: "bug"         # 评论类型，必填
```

---

## mcp__tapd__create_comments

在 Bug 下添加评论，@相关人员。

```
workspace_id: <int|string>  # 项目ID，必填
options:
  entry_id: "<bug_id>"      # 缺陷ID，必填
  entry_type: "bug"         # 评论类型，必填
  author: "<前端开发人员>"   # 评论人，必填（使用 TAPD 真实姓名）
  description: "<评论内容>"  # 内容，必填
```

---

## mcp__tapd__update_bug

将已验证通过的 Bug 状态更新为已解决。

```
workspace_id: <int|string>  # 项目ID，必填
options:
  id: "<bug_id>"            # 缺陷ID，必填
  v_status: "已解决"         # 使用中文状态名，TAPD 自动映射
```

注意：`v_status` 支持中文状态名（如"已解决"），TAPD 会自动映射为对应的英文状态。
