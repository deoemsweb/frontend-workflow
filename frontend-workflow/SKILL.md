---
name: frontend-workflow
description: 前端开发工作流编排 meta-skill。解读用户意图，按预设阶段（Figma 设计稿 → 静态页面 → 验收微调 → OpenSpec PRD → 组件/状态设计 → 业务逻辑 → 验收）依次调用子 skill，并管理"生成→检查→确认"多 Agent 闭环（检查报告格式、回流次数上限、人工 Gate）。当用户要求"从 Figma 生成完整页面""按前端工作流开发""端到端还原设计稿并实现业务"等跨多阶段任务时使用此 skill。
---

# 前端开发工作流编排（meta-skill）

本 skill 是 frontend-workflow-skills 合集的**编排层**，自身不产出代码 / 文档 / 检查结论，只做三件事：**解读用户意图、按阶段调度子 skill、管理检查循环与人工确认点**。它把 README 中定义的「前端开发工作流」固化为可执行的编排流程。

## 何时使用此 Skill

当用户请求以下跨多阶段的端到端任务时触发：

- 从 Figma 链接 / 截图生成一个完整页面（含业务逻辑）
- 按前端工作流开发某个功能 / 页面
- 端到端还原设计稿并实现业务绑定
- "把这个 Figma 做成能跑的页面"

> 本 skill **不替代**子 skill 的专业判断，只负责"何时调用谁、如何传递上下文、何时停下让人确认"。

---

## 一、第一件事：解读用户意图

接收到用户请求后，先判断任务边界，输出一份**意图清单**供用户确认：

| 判断维度 | 说明 |
|---------|------|
| 任务范围 | 单页面 / 多页面 / 整模块；是否含业务逻辑实现 |
| 输入物 | Figma 链接 / 截图 / 节点 key；是否已有 Swagger API JSON |
| 目标产物 | 静态页面代码 / OpenSpec PRD / 业务逻辑绑定 / 全流程 |
| 起止阶段 | 从哪个环节开始（如已有静态页面，则跳过②③）、到哪个环节结束 |
| 技术栈 | Vue2 / Vue3 / React / 原生 / 小程序（影响子 skill 输出） |

意图不明确时**停止并询问**，不自行假设起止点。

---

## 二、第二件事：按预设阶段依次调用子 skill

依据 README 工作流，按下表顺序调度。每个阶段调用对应子 skill，并把上一阶段产物作为下一阶段输入传递：

| 阶段 | 子 skill | 输入 | 产物 |
|------|----------|------|------|
| ② 生成静态页面 | `figma-design-constraint` + `frontend-engineering-standards` | Figma 设计稿 | 静态页面代码 |
| ③ 检查 | `figma-design-constraint`（QA Checklist） | 静态页面代码 | 偏差报告 |
| ④ 确认 | 人工 | 偏差报告 + 页面 | 验收结论 |
| ⑤ 生成 PRD | `figma-to-openspec-prd` | Figma 原型 + Swagger JSON | OpenSpec specs / proposal / tasks |
| ⑥ 检查 | `figma-to-openspec-prd`（第八章清单） | PRD 文档 | 偏差报告 |
| ⑦ 确认 | 人工 | PRD | 需求确认 |
| ⑧ 设计桥梁 | `frontend-engineering-standards` | PRD tasks.md | 组件树 / 状态 / 数据流草案 |
| ⑨ 生成业务逻辑 | `frontend-engineering-standards` | 设计草案 + 静态页面 | 业务逻辑代码 |
| ⑩ 检查 | `frontend-engineering-standards`（工程硬约束 + 非功能质量） | 业务逻辑代码 | 偏差报告 |
| ⑪ 确认 | 人工 | 业务代码 | 业务验收 |
| ⑫ 终验 | 人工 | 全部产物 | 交付 |

**调度方式**：通过工具调用 / 子 Agent 调用各子 skill；本 meta-skill 不内联子 skill 的规则正文，仅传递上下文与接收产物。阶段顺序固定，如需跳过某阶段（如已有静态页面），须在意图解读阶段与用户确认后记录。

---

## 三、第三件事：管理检查循环与人工确认点

### 3.1 检查报告格式（强制结构化）

检查 Agent 产出的偏差报告必须为以下结构，供生成 Agent 精准定位：

```
[偏差报告]
- 文件路径: src/components/UserCard.vue
- 行号: 12-18
- 规则ID: FDC-QA-COLOR-01（对应 figma-design-constraint 第十章 颜色与视觉）
- 偏差描述: 按钮背景色 #2563eb，Figma 为 #3b82f6
- 修复建议: 改为 var(--color-primary)
- 严重级别: 高 / 中 / 低
```

### 3.2 回流次数上限

每个检查阶段最多回流 3 次：

```
第 1 次检查 → 偏差报告 → 生成 Agent 修正 → 第 2 次检查 → …
  └─ 若第 3 次仍未通过 → 标记"人工介入"，停止自动循环，提示用户
```

超出上限不得继续自动回流，避免死循环消耗 Token。

### 3.3 人工 Gate 提示

到达确认环节（④⑦⑪⑫）时，本 skill 必须**暂停并提示用户**，输出：

```
【人工 Gate · 阶段 X】
- 当前阶段：<阶段名>
- 待确认产物：<文件 / 页面 / 文档>
- 检查结论：<通过 / 人工介入 / 偏差清单摘要>
- 请确认：[通过] / [返工] / [调整范围]
```

未经用户确认，不得进入下一阶段。

---

## 四、上下文传递规范

生成 / 检查 Agent 间需共享以下上下文，保证偏差可追溯：

| 上下文项 | 用途 |
|---------|------|
| Figma 节点 ID / Frame key | 定位设计稿来源 |
| 代码片段 + 文件路径 + 行号 | 检查报告锚点 |
| 上一轮检查报告 | 避免重复偏差、追踪修复进度 |
| 技术栈判断结果 | 贯穿所有生成阶段 |
| PRD capability / change-id | 业务逻辑阶段回溯需求 |

---

## 五、边界与约束

- **不内联子 skill 规则**：本 meta-skill 只编排，视觉 / 工程 / PRD 的专业判断由对应子 skill 负责。
- **不跳过人工 Gate**：④⑦⑪⑫ 必须人工确认，即使检查 Agent 报告通过。
- **不自行扩展阶段**：阶段顺序固定，跳过阶段须在意图解读阶段确认并记录。
- **不替代 testing/**：本流程不含自动化测试（单测 / E2E），`testing/` 领域占位待扩展。

---

## 六、与其他 skill 的关系

```
[frontend-workflow]（meta-skill，编排层）
      │
      ├─ figma-design-constraint        ← ②③④ 视觉还原 + 检查
      ├─ figma-to-openspec-prd          ← ⑤⑥⑦ PRD 生成 + 检查
      └─ frontend-engineering-standards ← ②⑧⑨⑩ 工程规范 + 设计 + 业务逻辑 + 检查
```

本 skill 是唯一"跨领域调度"的入口；各子 skill 仍可独立使用（不经过本 meta-skill）。
