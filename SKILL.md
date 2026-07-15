---
name: frontend-workflow
description: 统一前端开发工作流 skill：覆盖 Figma 设计稿像素级还原、Figma 原型转 OpenSpec PRD、前端工程通用规范（类型安全/API/状态/安全/性能）、以及测试能力（待扩展）。当用户要求 Figma 还原、设计稿转代码、高保真还原、切图、Figma→OpenSpec PRD、生成需求文档、前端工程规范、类型/API/状态/安全、端到端还原设计稿并实现业务、按前端工作流开发、写单测/组件测试/E2E 时使用此 skill。
---

# 前端开发工作流（统一 Skill）

本 skill 是 `frontend-workflow-skills` 合集合并后的**单一入口**。它将原先分散的 4 个 skill 整合为一个目录，规则正文拆到 `references/` 子文件，按需在运行时读取，兼顾「一次安装」与「上下文不臃肿」。

自身职责只有三件：**解读意图、按阶段调度（指向对应 reference）、管理检查循环与人工确认点**。

---

## 一、何时使用（触发条件）

命中以下任一情境即触发本 skill，并先读取「三、章节索引」定位到对应 `references/*.md`：

- **Figma 还原类**：Figma 还原 / UI 还原 / 高保真还原 / 设计稿转代码 / Figma to Code / 切图
- **Figma→PRD 类**：从 Figma 生成 PRD / Figma 转 OpenSpec / 生成需求规格 / 写 OpenSpec 提案 / 需求拆解为 specs 与 tasks
- **原型文档→PRD 类**：根据 `.md` 格式原型需求文档 / PRD 草稿生成 OpenSpec 规范 / 把 .md 需求文档规范化为 OpenSpec / 需求拆解为 specs 与 tasks
- **工程规范类**：编写/重构前端代码、集成 API、状态管理、前端安全、性能优化、代码注释、AI 不确定时处理
- **接口定义生成类**：根据 Swagger / open.json / swagger.json 生成接口定义、接口文档转前端 API 方法、OpenAPI 转 TypeScript interface / JSDoc 类型、接口文档增量同步
- **测试类**：写单元测试 / 组件测试 / E2E / 视觉回归（见 `references/testing.md`，待扩展）
- **端到端类**：从 Figma 生成完整页面（含业务逻辑）、按前端工作流开发、端到端还原设计稿并实现业务绑定

> 子领域规则**不内联**在本文件，命中分支后**必须 `Read` 对应 `references/*.md`** 再执行，本文件只做路由与上下文编排。

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

按下表顺序推进；每个阶段**先 `Read` 对应 `references/*.md`**，把上阶段产物作为下阶段输入。

| 阶段 | 读取的 reference | 输入 | 产物 |
|------|------------------|------|------|
| ② 生成静态页面 | `references/figma-design-constraint.md` + `references/frontend-engineering-standards.md` | Figma 设计稿 | 静态页面代码 |
| ③ 检查 | `references/figma-design-constraint.md`（第十章 QA Checklist） | 静态页面代码 | 偏差报告 |
| ④ 确认 | 人工 | 偏差报告 + 页面 | 验收结论 |
| ⑤ 生成 PRD | `references/prototype-to-openspec-prd.md` | 原型（Figma / .md）+ Swagger JSON | OpenSpec specs / proposal / tasks |
| ⑥ 检查 | `references/prototype-to-openspec-prd.md`（第八章清单） | PRD 文档 | 偏差报告 |
| ⑦ 确认 | 人工 | PRD | 需求确认 |
| ⑦b 接口定义生成 | `references/api-definition-generation.md` | Swagger open.json + 项目既有接口模式 | 接口定义文件（函数+类型+JSDoc） |
| ⑦c 确认 | 人工 | 接口定义 + delta 说明 | 接口验收 |
| ⑧ 设计桥梁 | `references/frontend-engineering-standards.md` | PRD tasks.md | 组件树 / 状态 / 数据流草案 |
| ⑨ 生成业务逻辑 | `references/frontend-engineering-standards.md` | 设计草案 + 静态页面 | 业务逻辑代码 |
| ⑩ 检查 | `references/frontend-engineering-standards.md`（工程硬约束 + 非功能质量） | 业务逻辑代码 | 偏差报告 |
| ⑪ 确认 | 人工 | 业务代码 | 业务验收 |
| ⑫ 终验 | 人工 | 全部产物 | 交付 |

> 阶段顺序固定；如需跳过某阶段（如已有静态页面），须在意图解读阶段与用户确认后记录。各 reference 仍可独立读取使用（不经过本路由）。

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

**人工 Gate 提示**：到达确认环节（④⑦⑦c⑪⑫）必须暂停并提示用户：

```
【人工 Gate · 阶段 X】
- 当前阶段：<阶段名>
- 待确认产物：<文件 / 页面 / 文档>
- 检查结论：<通过 / 人工介入 / 偏差清单摘要>
- 请确认：[通过] / [返工] / [调整范围]
```

未经用户确认，不得进入下一阶段。

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

### 2.5 边界与约束

- **不内联规则正文**：本文件只路由与编排；视觉 / 工程 / PRD 的专业判断由对应 `references/*.md` 负责，使用前先 `Read`。
- **不跳过人工 Gate**：④⑦⑦c⑪⑫ 必须人工确认，即使检查报告通过。
- **不自行扩展阶段**：阶段顺序固定，跳过须在意图解读阶段确认。
- **安全规则为硬约束**：`references/frontend-engineering-standards.md` 第四章（XSS / 输入校验 / 敏感信息）无论设计稿是否体现均须遵守。

---

## 三、章节索引（懒加载指针）

命中对应分支时，**先 `Read` 该文件再执行**；各文件内含完整章节、QA Checklist 与质量校验清单。

- **3.1 Figma 还原约束** → `references/figma-design-constraint.md`
  - 核心规则 / Design Token / 节点映射 / 精确测量 / a11y / 代码组织 / 资源导出 / 组件库共存 / Dev Mode / QA Checklist / 边界情况 / 技术栈与项目类型适配 / 工作流 / 错误示例
- **3.2 原型（Figma / .md）→ OpenSpec PRD** → `references/prototype-to-openspec-prd.md`
  - 输入源判定（Figma 或 .md）/ Figma 读取 / .md 原型文档读取与结构映射 / 需求分析要素 / OpenSpec 环境检查 / 文档结构写法 / PRD 生成 / 变更更新 / 拆解策略 / 质量校验清单 / 协作关系 / 边界与不确定处理
- **3.3 前端工程通用规范** → `references/frontend-engineering-standards.md`
  - 类型安全 / API 集成 / 状态管理 / 安全约束 / 性能优化 / 注释文档 / AI 不确定时处理协议
- **3.4 Swagger → 接口定义生成** → `references/api-definition-generation.md`
  - Swagger 解析 / 项目既有模式自动探测 / 模式画像确认 / 生成规则（命名/注释/类型/模块归类）/ 多技术栈适配 / 增量更新与冲突处理 / 鉴权与拦截器 / 质量校验清单 / 边界与不确定处理 / 协作关系
- **3.5 测试能力（待扩展）** → `references/testing.md`
  - 单元 / 组件 / E2E / 视觉回归 骨架占位，正式规则待补充

> 关系：3.2 是上游 PRD 产出（specs/tasks）；3.4（接口定义生成）是 PRD 与实现之间的「接口契约接入」桥梁，依据 Swagger 生成接口函数/类型供下游调用；3.1 与 3.3 是下游实现（视觉还原 + 工程规范）。各分支共享同一 Figma / Swagger 数据源但产物不同、互不重叠。
