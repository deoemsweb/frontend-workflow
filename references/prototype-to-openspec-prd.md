# 原型需求文档（Figma / .md）→ OpenSpec 需求规范（PRD）

本规则集把产品提供的**原型需求文档**转化为结构化、可追溯、可协作更新的 OpenSpec 规范文档，并按交付模块自动拆解为 capability（specs）与 tasks。它支持两类输入源：

- **Figma 设计原型**：通过 Figma MCP 或链接/截图读取（见第二章 2.2）。
- **`.md` 格式原型需求文档**：产品/AI 产出的 Markdown 需求草稿，含模块/页面/字段表/交互流程等（见第二章 2.3）。

无论哪种输入源，OpenSpec 的**产出格式完全一致**（见第四~八章），二者仅在“如何读取与提取需求”这一步不同。本规则集处于前端工作流的“需求理解 → 规范产出”上游阶段，产出物供后续 `references/figma-design-constraint.md`（像素级还原）与 `references/frontend-engineering-standards.md`（工程实现）衔接。

## 何时使用本规则集

当用户请求以下任一操作时，触发本规则集：

- 根据 Figma 设计稿生成 PRD / 需求文档 / 需求规格
- **根据 `.md` 格式原型需求文档 / PRD 草稿生成 OpenSpec 规范**
- Figma 转 OpenSpec / 用 OpenSpec 写需求 / 把 .md 需求文档规范化为 OpenSpec
- 把设计稿或需求文档转成需求说明、提炼其中的需求
- 生成 / 更新 OpenSpec 文档、OpenSpec 提案（proposal）
- 需求拆解为 specs 与 tasks、按模块拆分需求规范
- 需求变更后更新已有 OpenSpec 规范

> 本规则集聚焦“需求与规范”，**不**输出代码、**不**做像素级视觉还原（那是 `references/figma-design-constraint.md` 的职责），仅交叉引用其“设计稿分析”思路。

---

## 一、工作流总览

一次完整的「原型需求文档 → OpenSpec PRD」流程按以下阶段执行，每阶段均有“停止并询问”的检查点：

```
原型读取（Figma 或 .md）→ 需求分析 → OpenSpec 环境就绪 → capability 划分 →
生成 specs / proposal / design / tasks → 质量校验 →（变更时）delta 更新与归档
```

| 阶段 | 关键动作 | 产物 / 检查点 |
|------|----------|---------------|
| 1. 原型读取 | 判定输入源：Figma（MCP/链接/截图）或 `.md` 文档（见第二章）；二者也可互补 | 拿不到关键信息则停止询问 |
| 2. 需求分析 | 提炼页面/组件/交互/数据/状态/业务流程（要素清单见 2.4） | 结构化需求清单 |
| 3. 环境就绪 | 检查 OpenSpec 可用性，不可用则引导安装 | `openspec --version` 通过 |
| 4. capability 划分 | 按交付模块确定 specs 边界 | 拆解决策（见第七章） |
| 5. PRD 生成 | 写 spec.md / proposal.md / design.md / tasks.md | 符合第四章写法 |
| 6. 质量校验 | 逐项过第八章清单 | 全部通过 |
| 7. 变更更新（可选） | 以 delta 增量更新已有规范，归档 | 不整篇重写 |

---

## 二、原型需求读取与分析

> 输入源分两类：**Figma 原型**（2.2）与 **`.md` 格式原型需求文档**（2.3）。无论哪种，最终都汇入同一份「需求分析要素清单」（2.4）做结构化提炼，再进入 OpenSpec 生成。若用户**同时**提供 Figma 与 `.md`，以 `.md` 文本作为规范骨架与字段/流程的权威来源，Figma 用于补充视觉与交互细节（点击去向、状态变体等）。

### 2.1 输入源判定

收到请求后先判定输入源，决定走 2.2 还是 2.3（或两者结合）：

| 信号 | 判定 | 走哪节 |
|------|------|--------|
| 用户提供 Figma 链接 / 节点 key / 截图 | Figma 原型 | 2.2 |
| 用户提供 `.md` 文件路径或粘贴 Markdown 需求文本 | `.md` 原型需求文档 | 2.3 |
| 两者都给 | 互补（.md 为主，Figma 补视觉/交互） | 2.3 + 2.2 |
| 都没有 | 信息不足 | 停止并询问，见第十章 |

### 2.2 Figma 原型数据获取方式（按优先级）

1. **优先使用 Figma MCP**（若环境可用）：
   - `get_figma_data`：读取文件/节点的布局、内容、视觉属性、组件结构与图层树。
   - `download_figma_images`：下载图标、图片等资源（仅在需引用资源时）。
2. **MCP 不可用时回退**：请用户提供以下任一：
   - Figma 文件链接与目标 Frame/节点 key；
   - 设计稿截图（按页面/状态分别提供）；
   - 产品口述的页面结构与交互说明。

> 若三者均无法获得足以理解需求的信息，**停止并询问**，不要凭想象补全页面结构。

### 2.3 `.md` 格式原型需求文档读取

当用户提供 `.md` 文件或粘贴 Markdown 需求文本时，按以下方式读取与解析。

#### 2.3.1 获取方式

1. **文件路径**：用 Read 工具完整读取用户给出的 `.md` 文档（如 `docs/prototype-xxx.md`）。若文档较长，通读全文后再提取，避免断章取义。
2. **粘贴文本**：用户直接在对话中粘贴的 Markdown 内容，按同等规则解析。
3. **内嵌资源**：文档中若引用截图/图片，仅作为辅助理解；需求以**文本与表格**为准，图片不替代结构化需求。
4. **多文档**：若原型拆成多个 `.md`（如按模块分册），逐一读取后合并为统一需求清单。

#### 2.3.2 典型结构与解析映射

`.md` 原型需求文档通常由“标题层级 + 表格 + 列表 + 引用块”构成，按下表把 Markdown 结构映射为 OpenSpec 要素：

| Markdown 元素 | 示例 | OpenSpec 映射 |
|---------------|------|---------------|
| 一级/二级标题（模块/页面） | `## 用户中心`、`### 订单列表页` | capability 候选 / 功能域边界 |
| 三级标题（功能点） | `### 导出报表` | 一条 `Requirement` 候选 |
| 表格（字段/参数） | 字段名｜类型｜说明｜是否必填 | 数据字段需求 → Scenario 的输入/输出与约束 |
| 有序列表（步骤） | 1. 点击导出 2. 选择范围 3. 下载 | 业务流程 → Scenario 的 GIVEN/WHEN/THEN |
| 无序列表（交互/规则） | 支持分页、可筛选 | 行为约束 → Requirement 正文 |
| 引用块（注意/约束） | `> 注意：导出上限 1 万条` | 边界/非功能 Requirement |
| 代码块（接口/数据结构） | `GET /api/export` | **不得臆造**：仅当文档明确给出才记录，未知则标注待确认（见第十章） |

#### 2.3.3 解析要点

- **保留层级关系**：标题层级即模块→页面→功能点的归属，直接决定 capability 划分（第七章）。
- **表格是字段真相**：字段名、类型、是否必填、说明优先从表格提取；表格缺失时标记待确认，不替用户补字段。
- **流程用有序列表还原**：把步骤映射为 GIVEN（前置）/ WHEN（触发）/ THEN（结果），多分支用多个 Scenario。
- **约束与边界优先取引用块/“注意/限制/异常”小节**：这些是高质量 Requirement 的来源。
- **识别非功能需求**：文档中“性能/兼容/平台（PC/H5/小程序）/权限”相关描述归入非功能需求要素（2.4 末行）。

#### 2.3.4 `.md` 源特有的停止并询问点

`.md` 文档常比 Figma 更“文字化”但也更易不完整，遇到以下情况**停止并询问**（不猜测）：

- 某功能点只有标题无说明/无字段表 → 请用户补全或确认范围。
- 字段表缺失“类型/必填”等关键列 → 询问是否按默认处理或直接标注待确认。
- 流程步骤存在歧义或分叉未说明 → 列出可选路径请用户选择。
- 文档中出现“等/其他/相关”等模糊兜底词 → 要求枚举明确项。

### 2.4 需求分析要素清单

读取原型（Figma 或 `.md`）后，逐项提取并整理为结构化清单（输出给用户确认后再进入生成阶段）：

| 类别 | 需提取内容 |
|------|-----------|
| 页面/模块结构 | 页面清单、页面层级、导航关系、每个页面包含的功能区块 |
| 组件清单 | 可复用组件、组件变体（variants）、组件 Props |
| 交互行为 | 可点击元素的行为（跳转/弹窗/提交/删除/展开折叠）、表单提交流程、列表分页/加载方式 |
| 数据字段 | 列表/表格/详情中展示的字段、字段来源、字段类型推断（`.md` 优先取字段表） |
| 状态 | 原型中实际出现的状态（默认/空/加载/错误/成功/禁用等），**仅记录原型中存在的状态** |
| 业务流程 | 多步骤流程（如注册、下单、审批）、角色与权限差异 |
| 边界与异常 | 长文本溢出、空数据、错误提示、确认弹窗等原型中体现的边界 |
| 非功能需求 | 原型暗示/明示的性能/兼容/平台（PC/H5/小程序）要求 |

### 2.5 需求确认话术

分析完成后，向用户输出结构化需求清单并请其确认/补充，重点澄清无法从原型判定的内容：

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
<业务背景与变更动机，关联到原型来源（Figma 链接/节点 或 .md 文档路径与章节）>

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
2. **比对差异**：将新需求（来自更新后的 Figma 原型、`.md` 文档或口述变更）与现有 Requirement/Scenario 比对，列出新增 / 修改 / 移除项。
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
- [ ] 未凭空添加原型（Figma 或 .md）中不存在的要求

### 8.3 变更一致性
- [ ] 变更使用 `+`/`-` delta，未直接改写主 specs
- [ ] 修改的 Requirement 同步更新了 Scenario
- [ ] proposal.md 说明了 why/what/impact，移除项标注了回归风险

### 8.4 拆解合理性
- [ ] 拆解粒度符合第七章决策树，未出现过细或跨模块混乱
- [ ] tasks.md 任务可执行、可验证，且映射到对应 Requirement
- [ ] 多 proposal 时各提案边界清晰、可独立评审

### 8.5 可追溯性
- [ ] 每条需求可回溯到原型来源：Figma（页面/Frame）或 `.md` 文档（文件路径 + 章节/标题）
- [ ] 不确定项已停止询问并在文档中标注待确认点

---

## 九、与其它 skill 的协作关系

本 skill 是前端工作流的上游 PRD 产出环节：

```
[本 skill] 原型（Figma / .md）→ OpenSpec PRD（specs/tasks）
      │
      ├── 下游 ① figma-design-constraint：依据同一原型做像素级代码还原
      └── 下游 ② frontend-engineering-standards：依据 PRD 做工程实现（类型/API/状态/安全）
```

协作约定：

- 与 `figma-design-constraint` **不重叠**：后者管“视觉还原忠实度”，本 skill 管“需求与规范”。两者可共享同一原型数据源（Figma 或 `.md`），但产物不同。
- 与 `frontend-engineering-standards` **不重叠**：后者管“代码工程规范”，本 skill 产出的 tasks.md 可作为其实现输入。
- 复用其“设计稿分析”与“不确定处理”思路，但**不复制**其规则正文，仅交叉引用。
- 与 `fw-dev-spec`（3.7 开发计划活文档）**默认二选一、互不污染**：本 skill 是上游 OpenSpec PRD 产出，fw-dev-spec 是面向“无 OpenSpec 环境 / 需求计划留项目内”的替代，默认不写 `openspec/`。**可选增强**：当 fw-dev-spec 在生成流程开启「OpenSpec 关联模式」（见 `fw-dev-spec.md` 第九章）时，活文档单向同步到本 skill 的 `openspec/`（capability/change-id 由 fw-dev-spec 侧确定），二者成为「关联镜像」而非互斥；此时 `spec.md`/`changes/` 作为活文档的结构化镜像，但语义转换仍在 fw-dev-spec 侧完成，本 skill 不反向改写活文档。

---

## 十、边界与不确定处理

> 优先级最高：信息不足时优先询问用户，**严禁猜测**。

### 10.1 必须停止并询问的场景

| 场景 | 处理 |
|------|------|
| Figma 原型无法获取或不足以理解需求 | 停止，请用户提供链接/节点/截图 |
| `.md` 文档缺失/未提供，或内容不足以理解需求 | 停止，请用户提供 `.md` 文件路径或粘贴内容 |
| `.md` 文档某功能点只有标题、无说明/字段表 | 请用户补全或确认范围，不替补字段 |
| `.md` 文档字段表缺关键列（类型/必填） | 询问是否按默认处理，或直接标注待确认 |
| `.md` 文档流程步骤歧义/分叉未说明 | 列出可选路径请用户选择 |
| `.md` 文档出现“等/其他/相关”等模糊兜底词 | 要求枚举明确项 |
| 同时提供 Figma 与 `.md`，两者对同一点描述冲突 | 以 `.md` 文本为权威，冲突处请用户裁定 |
| 交互行为无法从原型判定（跳转/弹窗/提交） | 列出可选行为请用户选择，不猜测 |
| 后端接口契约未知（URL/入参/出参） | 询问，不在 spec 中臆造接口 |
| 字段含义有歧义 | 询问业务含义，不自行赋义 |
| 缺失关键状态设计（确认弹窗/成功页） | 询问是否需补充，不凭空补 |
| 拆解粒度难以判断 | 给出两种拆法与影响，请用户选择 |

### 10.2 严禁猜测的内容

- 后端接口 URL、请求方式、入参/出参格式
- 业务规则细节（如优惠券叠加、权限判断逻辑）
- 数据字段真实含义与类型
- 用户完整操作流程与意图
- 原型（Figma 或 `.md`）中未出现的状态/页面

### 10.3 不确定项的文档处理

无法确认但需记录的点，在对应文档中用显式标记，便于后续跟进：

```markdown
> ⚠️ 待确认：<不确定点描述>。已向用户询问，待回复后补全。
```

确认后移除标记并补全内容。
