---
name: figma-to-openspec-prd
description: 从 Figma 设计原型读取并分析需求，生成/更新结构化的 OpenSpec 需求规范（PRD）文档，并自动拆解为 capability（specs）与 tasks（任务清单）。当用户要求“从 Figma 生成 PRD / Figma 转 OpenSpec / 生成需求规格 / 生成 OpenSpec 文档 / 更新 OpenSpec 文档 / 需求拆解为 specs 与 tasks / 写 OpenSpec 提案 / 把设计稿转成需求文档”时使用此 skill。
---

# Figma 原型 → OpenSpec 需求规范（PRD）

此 skill 把产品提供的 Figma 设计原型转化为结构化、可追溯、可协作更新的 OpenSpec 规范文档，并按交付模块自动拆解为 capability（specs）与 tasks。它处于前端工作流的“需求理解 → 规范产出”上游阶段，产出物供后续 `figma-design-constraint`（像素级还原）与 `frontend-engineering-standards`（工程实现）衔接。

## 何时使用此 Skill

当用户请求以下任一操作时，触发此 skill：

- 根据 Figma 设计稿生成 PRD / 需求文档 / 需求规格
- Figma 转 OpenSpec / 用 OpenSpec 写需求
- 把设计稿转成需求说明、提炼设计稿中的需求
- 生成 / 更新 OpenSpec 文档、OpenSpec 提案（proposal）
- 需求拆解为 specs 与 tasks、按模块拆分需求规范
- 需求变更后更新已有 OpenSpec 规范

> 本 skill 聚焦“需求与规范”，**不**输出代码、**不**做像素级视觉还原（那是 `figma-design-constraint` 的职责），仅交叉引用其“设计稿分析”思路。

---

## 一、工作流总览

一次完整的 Figma → OpenSpec PRD 流程按以下阶段执行，每阶段均有“停止并询问”的检查点：

```
Figma 读取 → 需求分析 → OpenSpec 环境就绪 → capability 划分 →
生成 specs / proposal / design / tasks → 质量校验 →（变更时）delta 更新与归档
```

| 阶段 | 关键动作 | 产物 / 检查点 |
|------|----------|---------------|
| 1. Figma 读取 | 通过 MCP 或回退方式获取设计稿数据 | 拿不到关键信息则停止询问 |
| 2. 需求分析 | 提炼页面/组件/交互/数据/状态/业务流程 | 结构化需求清单 |
| 3. 环境就绪 | 检查 OpenSpec 可用性，不可用则引导安装 | `openspec --version` 通过 |
| 4. capability 划分 | 按交付模块确定 specs 边界 | 拆解决策（见第七章） |
| 5. PRD 生成 | 写 spec.md / proposal.md / design.md / tasks.md | 符合第四章写法 |
| 6. 质量校验 | 逐项过第八章清单 | 全部通过 |
| 7. 变更更新（可选） | 以 delta 增量更新已有规范，归档 | 不整篇重写 |

---

## 二、Figma 原型需求读取与分析

### 2.1 数据获取方式（按优先级）

1. **优先使用 Figma MCP**（若环境可用）：
   - `get_figma_data`：读取文件/节点的布局、内容、视觉属性、组件结构与图层树。
   - `download_figma_images`：下载图标、图片等资源（仅在需引用资源时）。
2. **MCP 不可用时回退**：请用户提供以下任一：
   - Figma 文件链接与目标 Frame/节点 key；
   - 设计稿截图（按页面/状态分别提供）；
   - 产品口述的页面结构与交互说明。

> 若三者均无法获得足以理解需求的信息，**停止并询问**，不要凭想象补全页面结构。

### 2.2 需求分析要素清单

读取设计稿后，逐项提取并整理为结构化清单（输出给用户确认后再进入生成阶段）：

| 类别 | 需提取内容 |
|------|-----------|
| 页面/模块结构 | 页面清单、页面层级、导航关系、每个页面包含的功能区块 |
| 组件清单 | 可复用组件、组件变体（variants）、组件 Props |
| 交互行为 | 可点击元素的行为（跳转/弹窗/提交/删除/展开折叠）、表单提交流程、列表分页/加载方式 |
| 数据字段 | 列表/表格/详情中展示的字段、字段来源、字段类型推断 |
| 状态 | 设计稿中实际出现的状态（默认/空/加载/错误/成功/禁用等），**仅记录图稿中存在的状态** |
| 业务流程 | 多步骤流程（如注册、下单、审批）、角色与权限差异 |
| 边界与异常 | 长文本溢出、空数据、错误提示、确认弹窗等设计稿中体现的边界 |
| 非功能需求 | 设计稿暗示的性能/兼容/平台（PC/H5/小程序）要求 |

### 2.3 需求确认话术

分析完成后，向用户输出结构化需求清单并请其确认/补充，重点澄清无法从静态稿判定的内容：

- 交互元素的点击行为最终去向（弹窗内容、跳转目标）
- 字段的真实业务含义与数据来源
- 表单提交方式与接口契约（URL/入参/出参未知时**严禁猜测**）
- 缺失但“应有”的状态设计（如确认弹窗、成功页）

---

## 三、OpenSpec 环境检查与安装引导

### 3.1 可用性检查

生成 PRD 前，先确认本地 OpenSpec 可用：

```bash
openspec --version
```

- 命令存在且返回版本号 → 环境就绪，进入下一步。
- 提示 `command not found` 或类似错误 → 不可用，进入 3.2 安装引导。

### 3.2 安装与初始化引导

当 OpenSpec 不可用时，**不自动执行安装命令**，向用户呈现以下步骤并请求确认后再运行（遵循不主动执行安装类操作的原则）：

1. **环境要求**：Node.js 20.19.0 或更高版本。
2. **全局安装**（任选其一包管理器）：
   ```bash
   npm install -g @fission-ai/openspec@latest
   # 或 pnpm / yarn / bun 等价命令
   ```
3. **项目初始化**（在目标项目根目录执行）：
   ```bash
   cd <目标项目目录>
   openspec init
   ```
   `openspec init` 会在项目中创建 `openspec/` 目录结构与 agent 指引文件。
4. **再次校验**：安装后重新执行 `openspec --version` 确认就绪。

> 引导话术示例：“检测到本地未安装 OpenSpec，生成 PRD 需要它。是否需要我帮你执行 `npm install -g @fission-ai/openspec@latest`？确认后我再运行。”未经用户确认，不得执行安装命令。

### 3.3 目标项目定位

确认 OpenSpec 可用后，明确 PRD 写入的目标项目目录：

- 若用户已在某项目工作，优先写入该项目的 `openspec/` 目录；
- 若该项目尚未 `openspec init`，先引导初始化；
- 若用户未指定项目，询问目标项目路径后再生成。

---

## 四、OpenSpec PRD 文档结构与写法规范

### 4.1 目录结构

OpenSpec 在目标项目中的组织形式：

```
openspec/
├── specs/                          # 持久规范库（按 capability 划分）
│   └── <capability>/
│       └── spec.md
└── changes/                        # 变更提案
    └── <change-id>/
        ├── proposal.md             # 为什么做、改变了什么（why & what's changing）
        ├── specs/                  # spec 增量（deltas）
        │   └── <capability>/spec.md
        ├── design.md               # 技术方法（technical approach）
        └── tasks.md                # 实现检查清单（implementation checklist）
    └── archive/                    # 已归档变更
        └── <YYYY-MM-DD>-<change-name>/
```

- **specs/**：跨变更持久存在的“当前真相”，按 capability（能力域）分子目录。
- **changes/**：一次需求变更的完整提案，含 spec 增量、技术设计、任务清单；归档后其增量合并回 specs/。

### 4.2 spec.md 写法骨架

```markdown
# <capability> Specification

## Purpose
<该 capability 的目的与边界，1~3 句>

## Requirements

### Requirement: <需求名>
The system SHALL <可验证、可观察的行为描述>.

#### Scenario: <场景名>
- GIVEN <前置条件>
- WHEN <触发动作>
- THEN <预期结果>
- AND <补充约束或附加结果>
```

写法硬约束：

- 一级标题统一为 `# <capability> Specification`。
- 每条 Requirement 用三级标题 `### Requirement: <名称>`，正文使用强制情态动词 **SHALL**（不要用 should/may/can）。
- 每个 Requirement 至少配一个 `#### Scenario:`，用 GIVEN / WHEN / THEN（可加 AND）列表项，描述可验证的预期。
- 行为须可验证、无歧义；避免实现细节（不写具体代码、不写具体接口 URL）。
- 仅描述“系统应做什么”，不描述“如何写代码”。

### 4.3 spec 增量（delta）写法

在 `changes/<id>/specs/<capability>/spec.md` 中以 `+` / `-` 前缀表达对现有规范的增删，保留可追溯的变更历史：

```markdown
### Requirement: 会话过期
The system SHALL expire sessions after a configured duration.
- #### Scenario: 超时自动登出
  - GIVEN 用户已登录且 30 分钟无操作
  - WHEN 达到过期阈值
  - THEN 系统清除会话并跳转登录页

## 修改的 Requirement: 登录方式
+ The system SHALL support "记住我" with 30-day sessions.
- The system SHALL only support single-session login.
```

- `+` 前缀 = 新增的规范行；
- `-` 前缀 = 删除的现有规范行；
- 新增整条 Requirement 时使用 `### Requirement:`（无前缀，表示全新）。

### 4.4 proposal.md 写法

```markdown
# <change-id>

## Why
<业务背景与变更动机，关联到 Figma 原型来源>

## What Changes
- <要点 1：新增/修改/移除了什么 capability>
- <要点 2：…>

## Impact
- Affected specs: <列出受影响的 capability>
- <对现有功能、数据、流程的影响>
```

### 4.5 design.md 写法

记录技术决策与方法（非代码实现）：

```markdown
# Design: <change-id>

## Approach
<采用的整体技术方案与关键决策>

## Decisions
- <决策点 A>：选择 X 而非 Y，因为 …
- <决策点 B>：…

## Risks / Trade-offs
- <风险与权衡>
```

### 4.6 tasks.md 写法

按 phases（阶段）+ 具体任务组织，任务可勾选：

```markdown
# Tasks: <change-id>

## Phase 1: <阶段名>
- [ ] T1.1 <任务描述>
- [ ] T1.2 <任务描述>

## Phase 2: <阶段名>
- [ ] T2.1 <任务描述>
```

约束：任务描述须可执行、可验证，引用对应 Requirement/Scenario 而非空泛动作。

---

## 五、PRD 生成工作流

在需求清单获用户确认、OpenSpec 环境就绪后，按以下步骤生成：

1. **capability 划分**：依据第七章拆解策略，确定一个或多个 capability（specs）边界与 change-id。
2. **写 specs**：为每个 capability 创建/更新 `openspec/specs/<capability>/spec.md`（新需求）或在 `changes/<id>/specs/` 中写 delta（变更，见第六章）。
3. **建 change 提案**：创建 `openspec/changes/<change-id>/`，写 `proposal.md`（why/what/impact）。
4. **写 design.md**：记录技术方法与关键决策（仅当涉及非平凡技术取舍时；纯展示型需求可简略）。
5. **拆 tasks.md**：将 spec 中的 Requirement/Scenario 映射为可执行任务，按阶段组织。
6. **自校验**：逐项过第八章质量清单。
7. **向用户汇报**：列出生成的文件路径与 capability/tasks 概览，提示可用 `/opsx:apply` 推进实现、`/opsx:archive` 归档。

命名规范：

- capability：kebab-case，表达能力域而非页面名（如 `user-auth`、`order-checkout`，而非 `page-login`）。
- change-id：kebab-case 动词短语（如 `add-remember-me`、`refactor-cart-flow`）。

---

## 六、需求变更与已有文档更新

当需求发生变更时，**不整篇重写已有 specs**，改用 delta 增量提案更新，保留可追溯历史。

### 6.1 更新流程

1. **读取现有规范**：定位目标项目 `openspec/specs/<capability>/spec.md` 与历史 `changes/archive/`，理解当前真相。
2. **比对差异**：将新需求（来自更新后的 Figma 原型或口述变更）与现有 Requirement/Scenario 比对，列出新增 / 修改 / 移除项。
3. **建变更提案**：创建 `openspec/changes/<新-change-id>/`，在 `specs/<capability>/spec.md` 中用 `+` / `-` delta 表达增删（见 4.3）。
4. **更新 proposal/design/tasks**：说明 why/what/impact 及对应任务调整。
5. **校验一致性**：确保 delta 与现有 specs 不冲突、Scenario 仍可验证。
6. **归档（可选）**：变更实现并验证后，用 `/opsx:archive` 归档至 `openspec/changes/archive/<YYYY-MM-DD>-<change-name>/`，增量合并回主 specs。

### 6.2 变更更新约束

- 优先以 delta 表达，避免直接改写 `openspec/specs/` 主规范（主规范由归档动作统一更新）。
- 修改 Requirement 时同步更新其 Scenario，保证可验证性不丢失。
- 移除功能须在 proposal.md 的 Impact 中明确说明影响面，提示回归风险。

---

## 七、PRD 拆解策略与约束

### 7.1 核心约束

- 同一需求下 OpenSpec **可以做多个 proposal**，但**不建议拆得太细**。
- 优先按**交付模块**划分 capability；内容较多时再按 specs（capability）或 tasks（阶段/任务）拆分。

### 7.2 拆解粒度决策树

```
该需求是否跨多个独立交付模块？
├── 是 → 按模块拆为多个 capability（specs），每个模块一个 spec.md
│        （例：注册登录、商品浏览、下单结算 各自一个 capability）
└── 否 → 单 capability 内，Requirement 数量与内容是否过多？
    ├── 是 → 按 Requirement 分组写 Scenario；tasks.md 按 phase 拆阶段
    │        （例：order-checkout 内拆“购物车/地址/支付”三阶段）
    └── 否 → 单 capability + 单 proposal，tasks 按实现顺序列任务即可
```

### 7.3 拆分维度对照

| 维度 | 适用场景 | 示例 |
|------|----------|------|
| 按 specs（capability）拆 | 模块边界清晰、可独立交付/回归 | `user-auth`、`order-checkout`、`content-list` |
| 按 tasks（阶段）拆 | 单模块内工作量大、需分阶段推进 | Phase1 购物车 → Phase2 地址 → Phase3 支付 |
| 多 proposal | 同一需求有多个独立变更点、需分别评审上线 | `add-remember-me` 与 `refactor-login-ui` 分开 |

### 7.4 反模式（禁止）

- 把单个按钮、单个弹窗拆成独立 capability（粒度过细）。
- 一个 capability 跨越多个不相关业务模块（边界混乱）。
- 用页面名命名 capability（应表达能力域）。
- 为追求“拆得全”而把同一 Requirement 拆到多个 spec 中造成重复维护。

### 7.5 命名与目录约定

- capability 目录与 change 目录均用 kebab-case。
- change-id 用动词短语（add-xxx / refactor-xxx / remove-xxx）。
- 同一 capability 的 spec 只有一份 `openspec/specs/<capability>/spec.md`，变更经 delta 提案维护。

---

## 八、质量校验清单

生成或更新完成后，逐项自检：

### 8.1 结构与命名
- [ ] capability 用 kebab-case 且表达能力域（非页面名）
- [ ] change-id 为动词短语 kebab-case
- [ ] 文件落在正确的 `openspec/specs/` 或 `openspec/changes/<id>/` 路径

### 8.2 spec 内容
- [ ] 每个 Requirement 使用 SHALL，无 should/may/can
- [ ] 每个 Requirement 至少一个 Scenario，含 GIVEN/WHEN/THEN
- [ ] Scenario 可验证、无歧义，未混入代码实现细节
- [ ] 未凭空添加 Figma 原型中不存在的要求

### 8.3 变更一致性
- [ ] 变更使用 `+`/`-` delta，未直接改写主 specs
- [ ] 修改的 Requirement 同步更新了 Scenario
- [ ] proposal.md 说明了 why/what/impact，移除项标注了回归风险

### 8.4 拆解合理性
- [ ] 拆解粒度符合第七章决策树，未出现过细或跨模块混乱
- [ ] tasks.md 任务可执行、可验证，且映射到对应 Requirement
- [ ] 多 proposal 时各提案边界清晰、可独立评审

### 8.5 可追溯性
- [ ] 每条需求可回溯到 Figma 原型来源（页面/Frame）
- [ ] 不确定项已停止询问并在文档中标注待确认点

---

## 九、与其它 skill 的协作关系

本 skill 是前端工作流的上游 PRD 产出环节：

```
[本 skill] Figma → OpenSpec PRD（specs/tasks）
      │
      ├── 下游 ① figma-design-constraint：依据同一 Figma 原型做像素级代码还原
      └── 下游 ② frontend-engineering-standards：依据 PRD 做工程实现（类型/API/状态/安全）
```

协作约定：

- 与 `figma-design-constraint` **不重叠**：后者管“视觉还原忠实度”，本 skill 管“需求与规范”。两者共享同一 Figma 数据源，但产物不同。
- 与 `frontend-engineering-standards` **不重叠**：后者管“代码工程规范”，本 skill 产出的 tasks.md 可作为其实现输入。
- 复用其“设计稿分析”与“不确定处理”思路，但**不复制**其规则正文，仅交叉引用。

---

## 十、边界与不确定处理

> 优先级最高：信息不足时优先询问用户，**严禁猜测**。

### 10.1 必须停止并询问的场景

| 场景 | 处理 |
|------|------|
| Figma 原型无法获取或不足以理解需求 | 停止，请用户提供链接/节点/截图 |
| 交互行为无法从静态稿判定（跳转/弹窗/提交） | 列出可选行为请用户选择，不猜测 |
| 后端接口契约未知（URL/入参/出参） | 询问，不在 spec 中臆造接口 |
| 字段含义有歧义 | 询问业务含义，不自行赋义 |
| 缺失关键状态设计（确认弹窗/成功页） | 询问是否需补充，不凭空补 |
| 拆解粒度难以判断 | 给出两种拆法与影响，请用户选择 |

### 10.2 严禁猜测的内容

- 后端接口 URL、请求方式、入参/出参格式
- 业务规则细节（如优惠券叠加、权限判断逻辑）
- 数据字段真实含义与类型
- 用户完整操作流程与意图
- Figma 中未出现的状态/页面

### 10.3 不确定项的文档处理

无法确认但需记录的点，在对应文档中用显式标记，便于后续跟进：

```markdown
> ⚠️ 待确认：<不确定点描述>。已向用户询问，待回复后补全。
```

确认后移除标记并补全内容。
