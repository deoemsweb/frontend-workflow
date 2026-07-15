# Figma 设计稿还原约束【最高优先级】

此 skill 定义了 Figma 设计稿到代码的最高优先级还原规则。在任何前端开发任务涉及 Figma UI 稿时，本规则集优先级高于所有其他样式、美化或创意类指令。

## 何时使用此 Skill

当用户请求以下任一操作时，触发此 skill：

- 根据 Figma 设计稿生成前端页面 / 组件代码
- Figma 设计稿还原 / UI 还原 / 高保真还原
- 设计稿转代码 / Figma to Code / 切图
- 任何需要以 Figma 设计稿为输入的前端开发任务

***

## 一、核心规则

### 规则 1：静态页面样式必须与 Figma UI 稿保持一致

代码生成的静态页面在视觉效果上必须与 Figma 设计稿完全一致。所有可见元素的呈现，包括但不限于颜色、尺寸、位置、间距、边框、圆角，均须以设计稿为唯一标准。

### 规则 2：禁止自行添加 Figma 中不存在的任何内容

严禁在还原过程中添加以下 Figma 设计稿中不存在的项目：

- 样式（CSS 属性）
- 颜色（色值、渐变）
- 阴影（box-shadow、text-shadow）
- 边框（border 及其样式）
- 图标（icon、svg）
- 元素（HTML 元素 / DOM 节点）
- 组件（额外或无关的 UI 组件）
- 动效（transition、animation、transform）
- 文案（文本内容、提示文字、占位文字）

**判断标准**：设计稿中有则有，设计稿中无则无。任何在 Figma 中无法直接观察到的内容，均属禁止添加范畴。

### 规则 3：所有样式属性以 Figma 为准

以下所有样式维度必须严格取自 Figma 设计稿，不得自行调整：

| 类别   | 具体项目                                   |
| ---- | -------------------------------------- |
| 布局   | Flex/Grid 方向、对齐方式、间距                   |
| 间距   | margin、padding、gap                     |
| 字号   | font-size                              |
| 行高   | line-height                            |
| 字间距  | letter-spacing                         |
| 颜色   | color、background-color、border-color    |
| 圆角   | border-radius                          |
| 边框   | border-width、border-style、border-color |
| 表格样式 | 表头样式、行高、边框、斑马纹                         |
| 按钮样式 | 尺寸、颜色、圆角、hover/active 状态               |
| 弹窗样式 | 宽度、高度、遮罩、位置、动画                         |

### 规则 4：缺失的状态或样式不得自行补充

- 如果 Figma 设计稿中只提供了某个组件的默认状态，则只还原默认状态
- 不允许为 hover、active、focus、disabled、loading、empty、error 等状态自行设计样式
- 不允许自行添加响应式断点、媒体查询等设计稿中未定义的布局变化

### 规则 5：资源使用优先级

1. **优先使用 Figma 中已有的资源**：图标、图片、插画等直接从 Figma 导出
2. **无法导出时保留占位结构**：保留对应的 DOM 结构和尺寸占位，但不要创造新的视觉样式来替代
3. **禁止自行寻找替代资源**：不要使用第三方图标库、占位图服务或自行绘制的图形来填充无法导出的资源位

### 规则 6：严禁"美化"设计稿

- 不要因为自认为某个设计"不好看"而修改颜色、间距、字号等任何视觉属性
- 不要添加阴影、过渡效果、渐变等来"增强视觉效果"
- 不要调整布局来实现自认为"更合理"的排列
- **Figma 设计稿是唯一真理来源**，以像素级还原为目标

***

## 〇、Figma 设计稿数据获取（优先 Figma MCP）

本分支负责把 Figma 设计稿还原为代码，前提是 agent 能拿到**准确**的设计数据。按以下优先级获取数据，**优先用 Figma MCP 程序化读取，避免依赖人工截图或口述**，以确保规则 3（样式维度）、第三章（节点映射）所依赖的取值来自唯一权威来源。

### 0.1 优先使用 Figma MCP（若环境已连接）

- `get_figma_data`：读取目标文件 / 节点的布局、内容、视觉属性、组件结构与图层树——这是还原规则（规则 3 样式维度、第三章节点映射）的唯一权威数据来源。
- `download_figma_images`：导出图标、图片、插画等资源（对应规则 5 资源优先级，**禁止自行寻找替代资源**）。
- 通过 MCP 读取后，直接以返回的结构化数据为准进行还原，**无需**依赖 Dev Mode 手动测量或 Copy as CSS。

### 0.2 MCP 不可用时的回退（按优先级）

1. **Figma 链接 + 目标 Frame / 节点 key**：请用户提供文件链接与需还原的具体 Frame / 节点，结合 Dev Mode → Inspect 面板取值（见第四章 4.1）。
2. **设计稿截图**：按页面 / 状态分别提供截图，用于视觉核对（仅能辅助，取值仍以 Dev Mode 为准）。
3. **产品口述的页面结构与样式说明**：仅作兜底；缺失关键视觉信息（颜色、间距、字号未知）时**停止并询问**，严禁凭想象补全（规则 2 / 规则 4）。

> 若三种回退均无法获得足以还原的视觉信息，**停止并询问**，不要凭想象补全。Figma 设计稿是唯一真理来源（规则 6）。

### 0.3 与第四章取值方法的衔接

- **MCP 已返回结构化数据**：第四章 4.1 的 Dev Mode / Copy as CSS / 手动测量作为**交叉校验**手段，确认 MCP 取值无误即可。
- **MCP 不可用**：第四章 4.1 的三种方法即为**主要取值手段**。

***

## 二、Design Token 体系

### 2.1 什么是 Design Token

Design Token 是将设计稿中的视觉属性抽象为命名变量，在代码中以 CSS 自定义属性（CSS Variables）的形式统一定义和管理，确保整体一致性和可维护性。

### 2.2 Design Token 提取原则

从 Figma 设计稿中提取 Token 时遵循以下规则：

1. **只提取 Figma 中实际使用的值**，不得自创 Token
2. **命名反映用途而非数值**，如 `--color-primary` 而非 `--color-blue-500`
3. **按类别分组**：颜色、间距、字号、行高、圆角、阴影
4. **与 Figma Variables/Styles 命名对齐**（如设计稿使用了 Figma Variables，沿用其命名）

### 2.3 Design Token CSS 变量模板示例：

```css
:root {
  /* ===== 颜色 ===== */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;       /* 仅当设计稿中有 hover 状态时定义 */
  --color-text-primary: #1f2937;
  --color-text-secondary: #6b7280;
  --color-text-placeholder: #9ca3af;
  --color-bg-page: #f9fafb;
  --color-bg-card: #ffffff;
  --color-border: #e5e7eb;
  --color-divider: #f3f4f6;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  /* 仅定义图稿中实际出现的颜色，不得预先"补全"色阶 */

  /* ===== 间距 ===== */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 20px;
  --spacing-2xl: 24px;
  --spacing-3xl: 32px;

  /* ===== 字号 ===== */
  --font-size-xs: 12px;
  --font-size-sm: 13px;
  --font-size-base: 14px;
  --font-size-md: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;
  --font-size-title: 28px;

  /* ===== 行高 ===== */
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;

  /* ===== 圆角 ===== */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* ===== 阴影（仅当设计稿中存在时定义） ===== */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

### 2.4 Token 使用规范

- **严禁在组件样式中硬编码色值/字号/间距**，必须引用 Token 变量
- 示例：`color: var(--color-text-primary)` 而非 `color: #1f2937`
- 如某样式值在 Token 表中不存在，应确认 Figma 中是否确实使用了该值，再决定是否新增 Token

### 2.5 Token 的定义位置与单一来源（防重复定义）

- **全局只定义一次**：Design Token 的 `:root { --xxx }` 声明**只能出现在全局样式文件** **`src/styles/tokens.css`**（或等价全局入口文件），并在应用入口（如 `main.js` / `main.ts`）`import` 一次，使其作用于整个文档。
- **组件样式禁止重定义 Token**：严禁把 `:root { ... }` 整段复制到每个组件的 `<style>` 中。组件只应**消费**已有 Token（`var(--token)`），不重新声明。
- **`<style scoped>`** **的 Scope 陷阱（关键）**：在 Vue 单文件组件的 `<style scoped>` 内书写 `:root { ... }`，编译器会将其改写为 `:root[data-v-xxx]`；而 `<html>` 元素并不携带 `[data-v-xxx]` 属性，该规则**永不命中、Token 实际失效**。因此全局 Token **必须放在非 scoped 的全局样式文件**中，绝不能写在任意组件的 `<style scoped>` 内。
- **缺失 Token 的处理**：若某组件需要的值在 `tokens.css` 中尚不存在，应将其补充进 `tokens.css` 的对应分组，而非在组件内就地声明。

### 2.6 复用优先：先查后定义（防 Token 蔓延）

在添加任何**共用样式**——包括 Design Token、工具类（如 `.flex-center` / `.text-ellipsis`）、SCSS mixin / function——之前，**必须先检索项目与同模块是否已有语义一致、取值一致的来源可直接引用**，确认不存在才新增。

- **检索范围（按顺序）**：
  1. 项目级全局 `src/styles/tokens.css`（或约定的全局样式入口）及其 `@import` 链；
  2. 同模块 / 同目录已有的样式文件（如 `src/views/<module>/styles/*.scss`、`src/components/<X>/assets/*.scss`）；
  3. 团队 / 组件库既有 Token 与工具类（如 ElementUI 的 SCSS 变量、设计系统）。
- **判定「一致可复用」**：命名 / 用途 / 取值三者其一匹配即应复用，**禁止**新建近似重复（如已存在 `--color-primary` 又新建 `--color-blue-500`、已存在 `.text-ellipsis` 又新建 `.ellipsis-1`），避免多套「真相源」。
- **有则引用，无则新增，新增仍归全局**：若已有可复用来源 → 直接 `var(--token)` / `@include mixin` / 引用类；仅当确实不存在时才新增，且新增的 Token 仍写入全局 `tokens.css` 单一来源（见 2.5），**不得写在组件内**。
- **例外**：业务强耦合、仅本组件使用、且不具备复用价值的局部样式，可不入全局；但凡有「共用」意图，必须先查。

### 2.7 Lint 校验规则（可自动执行）

2.4\~2.6 可下沉为机器可校验的 lint 项，在「第十章检查（Agent 只读）」阶段作为强制关卡运行（亦可作为 PR / CI 检查）。以下规则可直接用 ripgrep / Node 落地，**读模式执行、不写文件**：

**LINT-FIGMA-TOKEN-01（error）｜组件内禁止声明** **`:root`** **或任何** **`--token`**

- 适用：`*.vue` 内 `<style>`（含 scoped）、组件级 `*.scss` / `*.css`（路径含 `components/`、`views/`、`pages/`，且非全局入口）。
- 检测（ripgrep）：
  `rg -n -P '(:root\s*\{|^\s*--[A-Za-z0-9-]+\s*:)' --glob '!src/styles/tokens.css' src/`
- 例外：仅全局 `tokens.css` 及其 `@import` 链允许。
- 修复：删除组件内声明，改为 `var(--token)`；缺失值补入 `tokens.css`。

**LINT-FIGMA-TOKEN-02（error）｜同一 Token 名称禁止跨文件重复定义**

- 检测：提取全仓库 `--token-name` 声明点，按名称计数，出现 ≥2 次即报错（全局入口同一文件内多次不算）。
- Node 片段（读模式，输出重复项）：
  ```js
  const fs = require('fs'), path = require('path');
  const root = process.argv[2] || 'src';
  const decl = new Map();
  (function walk(dir){
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) { if (name !== 'node_modules') walk(full); }
      else if (/\.(vue|scss|css)$/.test(name) && !/tokens\.css$/.test(full)) {
        const txt = fs.readFileSync(full, 'utf8');
        for (const m of txt.matchAll(/--[A-Za-z0-9-]+\s*:/g)) {
          const t = m[0].slice(0, -1).trim();
          if (!decl.has(t)) decl.set(t, new Set());
          decl.get(t).add(full);
        }
      }
    }
  })(root);
  for (const [t, files] of decl) if (files.size > 1)
    console.log(`DUP ${t}: ${[...files].join('  |  ')}`);
  ```

**LINT-FIGMA-TOKEN-03（error）｜先查后定义（对应 2.6）**

- 检测：若组件文件内新声明了某 `--token`，而全局 `tokens.css` 已存在同名（或同值）变量 → 报错，应引用。
- 实现：以 TOKEN-02 的结果比对 `tokens.css` 现有集合，交集即违规。

**LINT-FIGMA-TOKEN-04（warn）｜共用样式复用提示**

- 新增「工具类 / mixin」时，提示先检索项目 / 同模块是否已有等价实现；已有则引用。由检查 Agent 在偏差报告中以「复用建议」形式给出。

**LINT-FIGMA-UI-01（error）｜手写** **`<table>`** **应改用项目 UI 库表格组件**

- 前置条件：`package.json` 检测到任意 UI 库（见 8.4.1：`element-ui` / `element-plus` / `antd` / `@mui/material` / `ng-zorro-antd` / `uview-ui`）。无 UI 库时不触发。
- 检测（ripgrep，强信号）：还原产物（`*.vue` / `*.tsx` / `*.jsx`）模板中出现手写 `<table` / `<thead` / `<tbody` / `<tr` / `<td` 结构（排除已包裹在库组件内的场景）。
  `rg -n -P '<(table|thead|tbody|tr|td|th)\b' --glob '*.vue' --glob '*.tsx' --glob '*.jsx' src/`
- 例外：库组件内部实现、纯展示静态表格且项目无对应库表格组件。
- 修复：改用 `el-table` / `a-table` / `<Table>` 等；保留 Figma 列结构与 Token 对齐。

**LINT-FIGMA-UI-02（warn）｜裸表单 / 按钮原生标签应优先改用 UI 库组件**

- 前置条件：同 UI-01（已识别到项目 UI 库）。
- 检测（ripgrep 初筛）：模板中出现裸 `button` / `input` / `textarea` / `select` 原生标签。
  `rg -n -P '<(button|input|textarea|select)\b' --glob '*.vue' --glob '*.tsx' --glob '*.jsx' src/`
- 说明：原生标签本身合法（如纯文本搜索框、自定义交互），故为 **warn 级**；由检查 Agent 结合 Figma 数据源判定「该节点是否为标准组件」——若是按钮 / 输入框 / 下拉等标准组件，则应替换为 `el-button`/`el-input`/`el-select` 或 `a-button`/`a-input`/`a-select`（见 8.4.3）；若是设计稿确有、库无对应组件的自建场景（8.4.5），可豁免。
- 适配：React 项目同时排查 JSX 中 `<button>` / `<input>` 手写；小程序项目（原生组件）不触发本规则。

**LINT-FIGMA-UI-03（error）｜跨栈组件混用**

- 检测：在 Vue 项目中出现 `a-` / `Mui` 前缀组件，或在 React 项目中出现 `el-` 前缀组件（与 8.4.1 识别到的栈冲突）。
  `rg -n -P '<(a-|el-|nz-|uni-|u-)[A-Za-z]' --glob '*.vue' --glob '*.tsx' --glob '*.jsx' src/`
- 修复：只保留本栈对应库组件（见 8.4.3 表）。

> 闭环：检查 Agent 在阶段 ③ 运行以上 lint（执行 ripgrep / Node 脚本，读模式不写文件），以「结构化偏差报告」列出违规文件 / 行号 / 规则来源（2.5 / 2.6 / 2.7 / 8.4），单环节回流 ≤3 次；触发项见第十章 10.9。

***

## 三、Figma 节点到 HTML/CSS 结构映射规则

### 3.1 Auto Layout → Flexbox / Grid 映射表示例：

| Figma Auto Layout 属性   | CSS 对应属性                                                |
| ---------------------- | ------------------------------------------------------- |
| Horizontal direction   | `flex-direction: row`                                   |
| Vertical direction     | `flex-direction: column`                                |
| Gap                    | `gap`                                                   |
| Horizontal padding     | `padding-left` / `padding-right`                        |
| Vertical padding       | `padding-top` / `padding-bottom`                        |
| Padding (统一值)          | `padding`                                               |
| Align top / left (hug) | `align-items: flex-start`                               |
| Align center           | `align-items: center`                                   |
| Align bottom / right   | `align-items: flex-end`                                 |
| Space between          | `justify-content: space-between`                        |
| Packed (start)         | `justify-content: flex-start`                           |
| Packed (center)        | `justify-content: center`                               |
| Packed (end)           | `justify-content: flex-end`                             |
| Fill container         | `flex: 1` 或 `width: 100%` / `height: 100%`              |
| Fixed width / height   | 精确的 `width` / `height` + `flex-shrink: 0`               |
| Wrap                   | `flex-wrap: wrap`                                       |
| Min/Max constraints    | `min-width` / `max-width` / `min-height` / `max-height` |

### 3.2 Absolute Position 使用规则

Figma 中的 Absolute Position 映射到 CSS `position: absolute`，但需遵守：

- **只有 Figma 中明确使用了 Absolute Position 的节点才能使用绝对定位**
- 不要为了方便而滥用绝对定位替代 Auto Layout / Flexbox
- 使用绝对定位时，参考父容器边缘计算 `top` / `right` / `bottom` / `left` 值
- 父容器须设置 `position: relative`

### 3.3 Figma 节点类型 → HTML 语义标签映射表

| Figma 节点类型     | 推荐 HTML 标签                                      | 说明                  |
| -------------- | ----------------------------------------------- | ------------------- |
| Frame（页面容器）    | `<main>`, `<section>`, `<article>`              | 根据语义选择              |
| Frame（布局容器）    | `<div>`                                         | 通用布局容器              |
| Frame（可点击区域）   | `<button>`, `<a>`                               | 根据交互意图选择            |
| Group          | `<div>`                                         | 纯分组，无额外语义           |
| Text           | `<h1>`\~`<h6>`, `<p>`, `<span>`, `<label>`      | 根据文本层级和用途选择         |
| Image / Icon   | `<img>`, `<svg>`                                | 图片用 img，矢量图标用内联 svg |
| Rectangle（纯装饰） | 使用 CSS 绘制（`background` / `border`）              | 不创建额外 DOM 节点        |
| Input 占位       | `<input>`, `<textarea>`, `<select>`             | 表单控件                |
| List 结构        | `<ul>` + `<li>` 或 `<dl>` + `<dt>` + `<dd>`      | 列表类内容               |
| Table 结构       | `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<td>` | 表格类内容               |

***

## 四、精确测量与取值规范

### 4.1 获取精确值的方法

| 方法                                                    | 优先级     | 适用场景                                              |
| ----------------------------------------------------- | ------- | ------------------------------------------------- |
| Figma MCP（`get_figma_data` / `download_figma_images`） | ⭐⭐⭐⭐ 首选 | 程序化读取布局/视觉属性/组件结构与资源，无需人工截图（见本章「〇、Figma 设计稿数据获取」） |
| Figma Dev Mode → Inspect 面板                           | ⭐⭐⭐ 最高  | MCP 不可用时的准确取值来源                                   |
| Figma 右键 → Copy as → CSS                              | ⭐⭐ 次选   | 快速获取近似值，需人工复核                                     |
| 手动测量（Option+Hover）                                    | ⭐ 备选    | Dev Mode 不可用时的兜底方案                                |

### 4.2 单位取舍与精度处理

| 场景                 | 规范              | 示例                              |
| ------------------ | --------------- | ------------------------------- |
| 整数 px 值            | 直接使用            | `width: 320px`                  |
| 小数 px 值（≤ .5）      | 向下取整            | Figma 12.3px → `12px`           |
| 小数 px 值（> .5）      | 向上取整            | Figma 12.7px → `13px`           |
| 设计稿中精确小数（如 12.5px） | 保留原值            | `width: 12.5px`                 |
| 字号                 | 使用 px，不自行转为 rem | `font-size: 14px`               |
| 行高（无单位）            | 使用 Figma 百分比换算  | Figma 150% → `line-height: 1.5` |
| 行高（px 值）           | 直接使用 px         | `line-height: 22px`             |
| 颜色 alpha / opacity | 保留精度（最多 2 位小数）  | `rgba(0,0,0,0.05)`              |

### 4.3 单位使用原则

- **默认使用 px**：Figma 设计稿是像素级精确设计，px 是最直接的映射单位
- **rem 转换需谨慎**：如项目已使用 rem 方案，仅在确认根字号基准（通常 16px）后进行换算
- **禁止任意引入 vw/vh**：除非设计稿中明确有视口相关的百分比布局，否则不使用视口单位

***

## 五、可访问性（a11y）最小约束

### 5.1 语义化 HTML 要求

在不添加视觉元素的前提下，确保 HTML 结构具备基本语义：

- 使用 `<button>` 而非 `<div onclick="...">` 表示可点击按钮
- 使用 `<a href="...">` 表示链接跳转
- 使用 `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>` 等语义化区域标签
- 标题层级 `<h1>` → `<h6>` 保持连续，不跳级

### 5.2 必要 ARIA 属性

当交互元素缺少 Figma 中的视觉标签时，至少保障以下 ARIA 属性：

```html
<!-- 图标按钮：必须有 aria-label -->
<button class="icon-btn" aria-label="搜索">
  <img src="./assets/search.svg" alt="" />
</button>

<!-- 弹窗：必须有 role 和 aria-modal -->
<div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">弹窗标题</h2>
</div>

<!-- 装饰性图标：使用 aria-hidden -->
<img src="./assets/decor-icon.svg" alt="" aria-hidden="true" />
```

### 5.3 焦点管理

- 表单元素保留默认焦点样式（浏览器 outline），除非 Figma 中明确定义了 focus 样式
- 弹窗打开时焦点应移入弹窗，关闭时焦点应回到触发元素
- Tab 键导航顺序应与视觉布局一致

### 5.4 色彩对比度

- 文本与背景色对比度至少 4.5:1（正文）、3:1（大文本 18px+）
- 如 Figma 设计稿中对比度不足，应**报告问题但不自行修改色值**

***

## 六、代码组织与命名规范

### 6.1 组件文件目录结构

```
src/
├── components/
│   └── UserProfile/
│       ├── index.vue          # Vue 组件（或 .tsx 用于 React）
│       ├── UserProfile.module.css   # 样式文件（CSS Modules）
│       └── assets/            # 组件私有资源
│           └── avatar-placeholder.svg
├── styles/
│   └── tokens.css             # Design Token 全局变量
└── assets/
    └── icons/                 # 全局图标资源
```

### 6.2 命名规范

**CSS 类名（BEM 风格）**：

```css
/* Block */
.user-card { }

/* Block__Element */
.user-card__avatar { }
.user-card__name { }
.user-card__description { }

/* Block--Modifier（仅在设计稿中存在样式变体时使用） */
.user-card--featured { }
.user-card--compact { }
```

**重点**：

- 不要为未在 Figma 中出现的变体创建 Modifier 类
- 类名应描述用途而非样式，如 `.user-card__name` 而非 `.text-bold-blue`

### 6.3 CSS 属性声明顺序

按以下顺序组织 CSS 属性，提高可读性和一致性：

1. **定位**：`position`, `top`, `right`, `bottom`, `left`, `z-index`
2. **盒模型**：`display`, `flex-direction`, `justify-content`, `align-items`, `width`, `height`, `margin`, `padding`, `border`, `border-radius`
3. **排版**：`font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`, `text-align`, `color`
4. **视觉**：`background`, `box-shadow`, `opacity`
5. **其他**：`cursor`, `overflow`, `transition`（仅 Figma 中有定义时）

***

## 七、资源导出规范

### 7.1 资源格式选择

| 资源类型       | 首选格式    | 次选格式    | 说明           |
| ---------- | ------- | ------- | ------------ |
| 图标（纯色）     | SVG     | —       | 矢量无损、文件小、可改色 |
| 图标（多色）     | SVG     | PNG @2x | 复杂图标优先 SVG   |
| 照片 / 渐变复杂图 | PNG @2x | WebP    | 照片类位图资源      |
| 插画         | SVG     | PNG @2x | 扁平插画优先 SVG   |
| Logo       | SVG     | PNG @2x | 矢量优先         |

### 7.2 分辨率规范

- `@1x`：基准分辨率（直接使用 Figma 中的尺寸导出）
- `@2x`：2 倍分辨率（Retina 屏幕适配），推荐用于位图资源
- 不要无差别使用 @2x，图标类 SVG 不需要多倍分辨率

### 7.3 压缩与优化

- PNG 资源导出后建议通过工具压缩（TinyPNG / pngquant）
- SVG 资源导出后去除 Figma 生成的冗余命名空间和注释
- 大尺寸背景图可考虑 WebP 格式（需确认项目兼容性）

***

## 八、与现有组件库的共存策略

### 8.1 场景判断优先级

| 场景               | 优先级   | 处理方式                       |
| ---------------- | ----- | -------------------------- |
| Figma 使用了组件库中的组件 | ⭐⭐⭐   | 优先使用项目组件库，按 Figma props 配置 |
| Figma 组件与组件库高度相似 | ⭐⭐    | 使用组件库，通过样式覆盖对齐 Figma       |
| Figma 组件在组件库中不存在 | ⭐     | 按 Figma 设计稿自定义编写           |
| 组件库有但 Figma 中未使用 | ❌ 不使用 | 不要因为组件库"有这个功能"而引入          |

### 8.2 样式覆盖原则

```css
/* ✅ 正确：基于 Figma 中的具体样式值覆盖组件库默认样式 */
:deep(.el-button--primary) {
  background-color: var(--color-primary);      /* 覆盖为 Figma 色值 */
  border-radius: var(--radius-md);             /* 覆盖为 Figma 圆角 */
  font-size: var(--font-size-base);            /* 覆盖为 Figma 字号 */
}

/* ❌ 错误：全量覆盖组件库样式，破坏组件库的交互逻辑（hover/focus/disabled） */
:deep(.el-button--primary) {
  all: unset;
  /* ... 重新写全部样式 */
}
```

### 8.3 冲突处理三大原则

1. **Figma 优先**：当组件库默认样式与 Figma 设计稿不一致时，以 Figma 为准进行覆盖
2. **最小覆盖**：只覆盖与 Figma 不同的属性，保留组件库的交互状态逻辑（如表单校验、loading 状态）
3. **如无法调和**：当组件库的功能行为与 Figma 差异过大时，优先自建组件以精确还原 Figma

### 8.4 主动选型：检测技术栈并自主选用 UI 组件库

本规则与 8.1「Figma 未使用则不引入」**不冲突**：8.1 约束的是"不要凭空新增库里有的功能"；8.4 约束的是"设计稿里已经出现的标准组件，必须优先用项目 UI 组件库实现，而不是手写裸标签"。

#### 8.4.1 强制前置：检测技术栈 → 识别 UI 组件库

在「第零步 项目环境识别」中，除判定技术栈 / 项目类型 / 样式方案外，**必须识别当前项目配套的 UI 组件库**，作为后续实现标准组件的选型依据：

| 技术栈            | 默认配套 UI 组件库                         | 备注                                                    |
| -------------- | ----------------------------------- | ----------------------------------------------------- |
| Vue 2          | ElementUI 2                         | `el-button` / `el-input` / `el-table` / `el-dialog` … |
| Vue 3          | Element Plus                        | 升级版 Element 体系                                        |
| React          | Ant Design（或 MUI）                   | 按项目实际依赖选定                                             |
| Angular        | Angular Material / NG-ZORRO         | 按项目实际依赖选定                                             |
| 微信小程序          | 原生组件（`<view>`/`<text>`/`<button>`…） | 无独立 UI 库时即原生组件                                        |
| UniApp         | uni-ui / uView                      | 跨端组件库                                                 |
| 原生 HTML/CSS/JS | 无（按 Figma 手写，或约定轻量库）                | 无框架则参考 8.4.5                                          |

> 识别方式：读取 `package.json` 的 `dependencies`（`element-ui` / `element-plus` / `antd` / `@mui/material` / `uview-ui` 等）；若都无，则视为"无 UI 库"，标准组件按 Figma 手写（见 8.4.5）。

#### 8.4.2 自主选型原则

- **标准组件优先用库组件**：设计稿中出现的按钮、输入框、下拉、表格、表单、弹窗、标签页、分页、日期选择、标签、开关等"标准组件"，**自主**选用 8.4.1 识别到的库组件实现，**不要**用 `<div>` / `<input>` 裸标签手写等价结构，也**不要**逐条来询问用户选哪个组件。
- **视觉仍对齐 Figma**：库组件默认样式与 Figma 不一致时，按 8.2「最小覆盖」只覆盖差异属性（颜色 / 圆角 / 字号引用 Token），保留库组件的交互状态逻辑（hover / focus / disabled / loading）。
- **props 对齐设计**：用库组件的 props 表达设计中的状态与配置（如 `disabled`、`size`、`type`），而非用额外 CSS 模拟。

#### 8.4.3 标准组件 → 库组件映射表（多技术栈）

还原时按 8.4.1 识别到的 UI 库，从下表取对应列。**同一 Figma 节点，只选本栈对应的那一个组件**，不得跨栈混用（如 Vue 项目里写 `<a-button>`）。

| Figma 中的标准组件 | ElementUI（Vue 2）               | Element Plus（Vue 3）            | Ant Design（React）              | MUI（React）                      |
| ------------ | ------------------------------ | ------------------------------ | ------------------------------ | ------------------------------- |
| 按钮           | `el-button`                    | `el-button`                    | `a-button`                     | `<Button>`                      |
| 文本输入         | `el-input`                     | `el-input`                     | `a-input`                      | `<TextField>`                   |
| 多行文本         | `el-input type="textarea"`     | `el-input type="textarea"`     | `a-input.TextArea`             | `<TextField multiline>`         |
| 下拉 / 选择器     | `el-select` + `el-option`      | `el-select` + `el-option`      | `a-select` + `a-select-option` | `<Select>`                      |
| 级联选择         | `el-cascader`                  | `el-cascader`                  | `a-cascader`                   | —                               |
| 表格           | `el-table` + `el-table-column` | `el-table` + `el-table-column` | `a-table`                      | `<Table>`                       |
| 表单容器         | `el-form` + `el-form-item`     | `el-form` + `el-form-item`     | `a-form` + `a-form-item`       | `<FormControl>` + `<FormLabel>` |
| 弹窗           | `el-dialog`                    | `el-dialog`                    | `a-modal`                      | `<Modal>`                       |
| 抽屉           | `el-drawer`                    | `el-drawer`                    | `a-drawer`                     | `<Drawer>`                      |
| 标签页          | `el-tabs` + `el-tab-pane`      | `el-tabs` + `el-tab-pane`      | `a-tabs` + `a-tabs-tab-pane`   | `<Tabs>` + `<Tab>`              |
| 分页           | `el-pagination`                | `el-pagination`                | `a-pagination`                 | `<Pagination>`                  |
| 日期选择         | `el-date-picker`               | `el-date-picker`               | `a-date-picker`                | `<DatePicker>`                  |
| 时间选择         | `el-time-picker`               | `el-time-picker`               | `a-time-picker`                | `<TimePicker>`                  |
| 标签           | `el-tag`                       | `el-tag`                       | `a-tag`                        | `<Chip>`                        |
| 开关           | `el-switch`                    | `el-switch`                    | `a-switch`                     | `<Switch>`                      |
| 复选框          | `el-checkbox`                  | `el-checkbox`                  | `a-checkbox`                   | `<Checkbox>`                    |
| 单选框          | `el-radio`                     | `el-radio`                     | `a-radio`                      | `<Radio>`                       |
| 进度条          | `el-progress`                  | `el-progress`                  | `a-progress`                   | `<LinearProgress>`              |
| 提示 / 消息      | `el-message` / `ElMessage`     | `ElMessage`                    | `message`（静态方法）/ `a-app`       | `<Alert>` / `useSnackbar`       |
| 加载态          | `el-loading` / `v-loading`     | `v-loading`                    | `a-spin`                       | `<CircularProgress>`            |
| 面包屑          | `el-breadcrumb`                | `el-breadcrumb`                | `a-breadcrumb`                 | `<Breadcrumbs>`                 |
| 步骤条          | `el-steps`                     | `el-steps`                     | `a-steps`                      | `<Stepper>`                     |
| 空状态          | `el-empty`                     | `el-empty`                     | `a-empty`                      | —                               |
| 工具提示         | `el-tooltip`                   | `el-tooltip`                   | `a-tooltip`                    | `<Tooltip>`                     |
| 下拉菜单         | `el-dropdown`                  | `el-dropdown`                  | `a-dropdown`                   | `<Menu>`                        |
| 树            | `el-tree`                      | `el-tree`                      | `a-tree`                       | —                               |

> 其他技术栈按 8.4.1 表对应替换：Angular→NG-ZORRO（`<nz-xxx>`）/ Angular Material；UniApp→uni-ui（`<uni-xxx>`）/ uView（`<u-xxx>`）；微信小程序→原生组件（`<button>`/`<input>`/`<picker>` 等，无独立 UI 库时视为原生组件，不在此表约束内）。
> 本表仅列「标准组件」；业务定制组件仍按 Figma 自建（见 8.4.5）。

#### 8.4.4 边界

- 仅对**设计稿中实际出现**且**对应库标准组件**的节点适用；设计稿没有的组件，仍受 8.1「未使用不引入」约束。
- 仅做「最小覆盖」对齐视觉，不得为套用库组件而**新增**设计稿中没有的交互 / 状态（与规则 4 一致）。

#### 8.4.5 例外（自建）

当库组件功能 / 结构与 Figma 差异过大、或项目无 UI 组件库时，按 Figma 自定义编写（见 8.3「如无法调和」），此时回到语义化 HTML + Token 的方案。

***

## 九、Figma Dev Mode 使用指南

### 9.1 关键面板与字段

| 面板区域                       | 关键字段                                            | 用途            |
| -------------------------- | ----------------------------------------------- | ------------- |
| Properties → Layout        | Width, Height, Padding, Gap                     | 获取盒模型尺寸       |
| Properties → Fill          | Color, Opacity                                  | 获取背景色/填充色     |
| Properties → Stroke        | Color, Width, Position                          | 获取边框颜色/宽度/位置  |
| Properties → Typography    | Font, Size, Weight, Line height, Letter spacing | 获取文本完整属性      |
| Properties → Effects       | Shadow, Blur, Spread                            | 获取阴影参数（仅当存在时） |
| Properties → Corner radius | 四角圆角值                                           | 获取圆角          |
| Properties → Auto layout   | Direction, Gap, Align, Padding                  | 获取 Flex 布局参数  |
| Code 面板                    | CSS 代码片段                                        | 快速参考，需人工复核单位  |

### 9.2 注意事项

- Figma 生成的 CSS 可能包含冗余属性或非标准写法（如 `flex: none`），需人工筛选
- Figma Variables 命名可作为 Design Token 命名的直接参考
- Dev Mode 中的间距测量（Option + Hover）是最可靠的间距信息来源

***

## 十、还原验证清单 QA Checklist

完成代码还原后，逐项自检：

### 10.1 布局与尺寸 \[ ] — \[ ] — \[ ] — \[ ]

- [ ] 每个容器宽度/高度与 Figma 一致
- [ ] margin、padding、gap 值与 Figma 一致
- [ ] Flex/Grid 方向与对齐方式与 Figma Auto Layout 一致
- [ ] 元素的绝对定位位置与 Figma 一致

### 10.2 颜色与视觉 \[ ] — \[ ] — \[ ] — \[ ] — \[ ]

- [ ] 所有文字颜色与 Figma 一致（包括 placeholder 颜色）
- [ ] 背景色、边框色与 Figma 一致
- [ ] 圆角值与 Figma 一致
- [ ] 阴影（如有）参数与 Figma 一致
- [ ] 渐变（如有）方向、色标与 Figma 一致

### 10.3 字体与排版 \[ ] — \[ ] — \[ ] — \[ ]

- [ ] font-family 与 Figma 一致
- [ ] font-size 与 Figma 一致
- [ ] font-weight 与 Figma 一致
- [ ] line-height 与 Figma 一致

### 10.4 资源与图标 \[ ] — \[ ] — \[ ]

- [ ] 所有图片/图标均来自 Figma 导出或保留占位
- [ ] 图片/图标尺寸与 Figma 一致
- [ ] 未使用第三方图标库替代

### 10.5 内容与文案 \[ ] — \[ ] — \[ ]

- [ ] 所有文案内容与 Figma 完全一致
- [ ] 未添加 Figma 中不存在的提示/说明/占位文字
- [ ] 未添加 Figma 中不存在的 DOM 元素

### 10.6 交互状态 \[ ] — \[ ] — \[ ]

- [ ] 未自行添加 Figma 中不存在的 hover/active/focus 样式
- [ ] 未自行添加 Figma 中不存在的 disabled/loading/empty/error 状态
- [ ] 未自行添加 transition/animation 动效

### 10.7 可访问性 \[ ] — \[ ] — \[ ]

- [ ] 使用了语义化 HTML 标签（button/a/nav/main 等）
- [ ] 图标按钮有 aria-label
- [ ] 弹窗有 role="dialog" 和 aria-modal

### 10.8 对比验证 \[ ] — \[ ]

- [ ] 页面截图与 Figma 设计稿并列对比无明显差异
- [ ] 在不同屏幕尺寸下（如适用）未出现异常布局

### 10.9 代码质量与安全 \[ ] — \[ ] — \[ ] — \[ ] — \[ ] — \[ ]

- [ ] TypeScript 类型定义完整，无 `any` 类型泄漏
- [ ] 未使用 `v-html` / `dangerouslySetInnerHTML` 渲染未净化的用户输入
- [ ] API 调用有统一的错误处理，非 AbortError 不被吞没
- [ ] 组件/函数有必要的 JSDoc 注释
- [ ] 无硬编码的 API Key / Token / 密码等敏感信息
- [ ] 性能优化（防抖/节流/懒加载等）已按 frontend-engineering-standards skill 正确应用
- [ ] Design Token 仅在全局 `tokens.css` 定义一次，未在任意组件样式中重复声明 `:root` / Token 变量（见 2.5 Scope 陷阱）
- [ ] 新增共用样式前已先检索项目 / 同模块既有 `tokens.css` 与工具类，有可复用的直接引用、未新建近似重复（见 2.6 复用优先）
- [ ] 已运行 Token lint（2.7：TOKEN-01/02/03/04），无组件内声明 `:root`/Token、无跨文件重复定义、无「应引用却新建」的 Token
- [ ] 已运行 UI 库 lint（2.7：UI-01/02/03）：手写 `<table>` 已改为库表格组件、裸表单 / 按钮标签经核对确为自建场景或已换库组件、无跨栈组件混用
- [ ] 设计稿中的标准组件已优先使用项目 UI 组件库实现（见 8.4），未用裸标签手写等价结构、未对每条选型反复询问

***

## 十一、边界情况处理规范

### 11.1 长文本溢出

当内容文本可能超出 Figma 中预留的空间时：

```css
/* 单行截断 */
.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 多行截断（如 Figma 中限制了最大行数） */
.text-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

### 11.2 空状态

- **如果 Figma 中包含空状态设计**：按照空状态设计稿还原
- **如果 Figma 中不含空状态设计**：保留内容区域的 DOM 结构和尺寸占位，但不添加额外的空状态提示文案/图标
- 不要自行添加「暂无数据」「请添加内容」等提示

### 11.3 加载状态

- 如果 Figma 中包含骨架屏/loading 设计，按设计稿还原
- 如果 Figma 中不含加载状态，不要在代码中添加 loading 动画或骨架屏
- 数据加载期间的空白/过渡状态由运行时数据控制，不由设计稿约束

### 11.4 图片加载失败

```html
<!-- 保留 img 占位尺寸，不自定义失败回退图 -->
<img
  src="./assets/photo.png"
  alt="照片"
  width="160"
  height="160"
  onerror="this.style.visibility='hidden'"
/>
```

### 11.5 响应式行为

- 仅当 Figma 中存在不同断点的设计稿时，才实现对应的响应式布局
- 禁止根据"移动端最佳实践"自行添加媒体查询
- 如果 Figma 只有 PC 端设计稿，则只输出 PC 端代码

***

## 十二、前端技术栈判断与兼容

在编写代码之前，必须先判断当前项目所属技术栈，并根据技术栈特性输出对应代码。

### 12.1 技术栈自动识别

通过检查项目关键文件判断技术栈：

| 关键文件 / 特征                           | 判断为               | 版本判断依据             |
| ----------------------------------- | ----------------- | ------------------ |
| `package.json` 含 `vue: ^2.x`        | Vue 2             | 检查 `vue` 版本号       |
| `package.json` 含 `vue: ^3.x`        | Vue 3             | 检查 `vue` 版本号       |
| `package.json` 含 `react: ^17/18/19` | React             | 检查 `react` 版本号     |
| 存在 `vite.config.ts` + `vue`         | Vue 3 (Vite)      | Vite 默认 Vue3       |
| 存在 `vue.config.js`                  | Vue 2/3 (Vue CLI) | 进一步检查 package.json |
| 存在 `next.config.js`                 | React (Next.js)   | 全栈框架               |
| 存在 `nuxt.config.ts`                 | Vue (Nuxt)        | 全栈框架               |
| 无框架依赖，纯 `.html` 文件                  | 原生 HTML/CSS/JS    | 无框架项目              |
| 存在 `angular.json`                   | Angular           | 企业级框架              |

### 12.2 各技术栈代码风格差异

#### Vue 2 (Options API)

```vue
<template>
  <div class="user-card">
    <img :src="avatar" class="user-card__avatar" alt="头像" />
    <span class="user-card__name">{{ name }}</span>
  </div>
</template>

<script>
export default {
  name: 'UserCard',
  props: {
    avatar: { type: String, required: true },
    name: { type: String, default: '' }
  }
}
</script>

<style scoped>
/* ✅ Vue2 默认使用 scoped CSS */
.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}
</style>
```

#### Vue 3 (Composition API + `<script setup>`)

```vue
<template>
  <div class="user-card">
    <img :src="avatar" class="user-card__avatar" alt="头像" />
    <span class="user-card__name">{{ name }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  avatar: string
  name?: string
}>()
</script>

<style scoped>
/* Vue3 推荐使用 scoped CSS 或 CSS Modules */
.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}
</style>
```

#### React (Functional Component + TypeScript)

```tsx
import styles from './UserCard.module.css'

interface UserCardProps {
  avatar: string
  name?: string
}

export const UserCard: React.FC<UserCardProps> = ({ avatar, name = '' }) => {
  return (
    <div className={styles.card}>
      <img src={avatar} className={styles.avatar} alt="头像" />
      <span className={styles.name}>{name}</span>
    </div>
  )
}
```

```css
/* UserCard.module.css */
.card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}
```

#### 原生 HTML/CSS/JS

```html
<div class="user-card">
  <img src="./assets/avatar.png" class="user-card__avatar" alt="头像" />
  <span class="user-card__name">用户名</span>
</div>
```

### 12.3 样式方案兼容

根据项目使用的样式方案输出对应格式：

| 技术栈                       | 推荐样式方案                       | 触发特征                                 |
| ------------------------- | ---------------------------- | ------------------------------------ |
| Vue 2/3 默认                | `<style scoped>`             | 无特殊样式依赖                              |
| Vue 2/3 + Less            | `<style scoped lang="less">` | `package.json` 含 `less`              |
| Vue 2/3 + Sass/SCSS       | `<style scoped lang="scss">` | `package.json` 含 `sass`              |
| React 默认                  | CSS Modules (`*.module.css`) | 常规 CRA/Vite React 项目                 |
| React + Tailwind          | Tailwind 工具类                 | `package.json` 含 `tailwindcss`       |
| React + styled-components | styled-components            | `package.json` 含 `styled-components` |
| 小程序                       | `.wxss` / `.scss`            | 小程序项目                                |

### 12.4 脚手架与构建工具适配

| 构建工具             | 特征文件                | 资源路径写法                                               |
| ---------------- | ------------------- | ---------------------------------------------------- |
| Vite             | `vite.config.ts`    | `import img from '@/assets/icon.svg'` 或相对路径          |
| Vue CLI          | `vue.config.js`     | `@/assets/icon.svg`                                  |
| Create React App | `react-scripts`     | `import img from './assets/icon.svg'`                |
| Next.js          | `next.config.js`    | `import img from '@/public/icon.svg'` 或 `next/image` |
| webpack 原生       | `webpack.config.js` | 取决于 alias 配置                                         |

***

## 十三、项目类型判断与兼容

在编写代码之前，必须判断项目类型，并据此调整输出代码的写法。

### 13.1 项目类型自动识别

| 关键特征                                   | 项目类型           | 判断依据            |
| -------------------------------------- | -------------- | --------------- |
| `manifest.json` + `.wxml` 文件           | 微信小程序          | 小程序特有文件结构       |
| `pages.json` + `uni.scss`              | UniApp         | UniApp 跨端框架     |
| `app.json` + `app.wxss`                | 微信小程序          | 小程序入口文件         |
| `project.config.json`                  | 微信小程序 / 原生     | 微信开发者工具配置       |
| `index.html` 含 `<meta viewport>` 移动端配置 | H5 移动端         | 视口设定为移动端        |
| `index.html` 无移动端 viewport 限制          | PC 端 (默认)      | 没有移动端适配特征       |
| Figma 设计稿宽度 ≤ 750px                    | H5 移动端         | 设计稿宽度判定（辅助）     |
| Figma 设计稿宽度 ≥ 1200px                   | PC 端           | 设计稿宽度判定（辅助）     |
| 基于 npm 的项目 + 移动端 viewport              | H5 (Vue/React) | Web 技术栈 + 移动端特征 |

### 13.2 H5 移动端适配规范

#### Viewport 设置

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

#### rem 适配（设计稿基准 375px 或 750px）

```css
/* 以 375 设计稿为例，1rem = 100px（375 / 3.75 公式） */
/* Figma 中 16px 的间距 → 0.16rem */

html {
  font-size: calc(100vw / 3.75);  /* 375设计稿 → 1rem = 100px */
}

/* 使用示例：Figma 中 16px → 0.16rem */
.card {
  padding: 0.16rem;
  font-size: 0.14rem;  /* Figma 14px */
  border-radius: 0.08rem;  /* Figma 8px */
}
```

#### vw 适配（无需 JS 计算）

```css
/* 以 375 设计稿为例 */
/* Figma 16px = 16/375*100 = 4.267vw */
.card {
  padding: 4.267vw;
  font-size: 3.733vw;   /* Figma 14px */
  border-radius: 2.133vw; /* Figma 8px */
}
```

#### 安全区域适配（iPhone 刘海屏 / 底部横条）

```css
/* 顶部安全区域 */
.header {
  padding-top: constant(safe-area-inset-top);  /* iOS 11.0-11.2 */
  padding-top: env(safe-area-inset-top);        /* iOS 11.2+ */
}

/* 底部安全区域 */
.footer {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
```

#### 移动端 1px 边框问题

```css
/* Retina 屏幕下 1px 边框过粗的解决方案 */
.hairline-border {
  position: relative;
}
.hairline-border::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 1px;
  background: #e5e7eb;
  transform: scaleY(0.5);
  transform-origin: 0 0;
}
```

### 13.3 PC 端适配规范

- **默认使用 px 单位**，不需要 rem/vw 换算
- 如果 Figma 设计稿宽度为固定值（如 1440px），页面主体宽度对齐设计稿即可
- 如果 Figma 设计稿为自适应布局，按 Auto Layout 规则还原 Flex/Grid
- PC 端页面最小宽度建议按 Figma 设计稿宽度设置：`min-width: [设计稿宽度]px`

### 13.4 微信小程序适配规范

#### 核心约束

| 项目      | 约束说明                                                                              |
| ------- | --------------------------------------------------------------------------------- |
| 文件类型    | `.wxml`（模板）、`.wxss` 或 `.scss`（样式）、`.js`/`.ts`（逻辑）                                 |
| 单位      | 必须使用 **rpx**（responsive pixel），设计稿 375px → 1px = 2rpx，设计稿 750px → 1px = 1rpx      |
| HTML 标签 | 必须使用小程序组件：`<view>`, `<text>`, `<image>`, `<button>`, `<input>`, `<scroll-view>` 等 |
| CSS 限制  | 不支持 `*` 通配符选择器、部分伪类不完全支持                                                          |
| Flexbox | 支持 `flex-direction`, `justify-content`, `align-items` 等核心属性                       |
| 组件      | 不支持自定义 HTML 标签，所有自定义组件需在 `.json` 中注册                                              |

#### rpx 换算表

| Figma (375px 设计稿) | rpx 值 |
| ----------------- | ----- |
| 1px               | 2rpx  |
| 12px              | 24rpx |
| 14px              | 28rpx |
| 16px              | 32rpx |
| 20px              | 40rpx |
| 24px              | 48rpx |
| 32px              | 64rpx |

#### 小程序代码模板

```xml
<!-- user-card.wxml -->
<view class="user-card">
  <image src="{{avatar}}" class="user-card__avatar" mode="aspectFill" />
  <text class="user-card__name">{{name}}</text>
</view>
```

```css
/* user-card.wxss */
.user-card {
  display: flex;
  align-items: center;
  gap: 24rpx;       /* Figma 12px */
  padding: 32rpx;   /* Figma 16px */
}
.user-card__avatar {
  width: 80rpx;     /* Figma 40px */
  height: 80rpx;
  border-radius: 50%;
}
.user-card__name {
  font-size: 28rpx; /* Figma 14px */
  color: #1f2937;
}
```

### 13.5 UniApp 适配规范

#### 与原生小程序的关键差异

| 差异点     | UniApp                        | 原生小程序                     |
| ------- | ----------------------------- | ------------------------- |
| 模板文件    | `.vue` 单文件组件                  | `.wxml` + `.wxss` + `.js` |
| 单位      | 统一使用 rpx（自动转换）                | rpx                       |
| HTML 标签 | `<view>`, `<text>`, `<image>` | 同左                        |
| 条件编译    | 支持 `#ifdef` / `#ifndef`       | 不支持                       |

#### 条件编译示例（跨端兼容关键）

```vue
<template>
  <view class="page">
    <!-- #ifdef MP-WEIXIN -->
    <view class="wx-only">仅微信小程序显示</view>
    <!-- #endif -->

    <!-- #ifdef H5 -->
    <view class="h5-only">仅 H5 端显示</view>
    <!-- #endif -->

    <!-- 各端共用 -->
    <view class="common">所有端都显示</view>
  </view>
</template>

<style scoped>
/* #ifdef MP-WEIXIN */
.page {
  /* 小程序端特有样式 */
}
/* #endif */

/* #ifdef H5 */
.page {
  /* H5 端特有样式 */
}
/* #endif */
</style>
```

#### UniApp 注意事项

- `pages.json` 中配置页面路由和导航栏样式，不要遗漏
- TabBar 页面的图标尺寸：建议 40x40px（@2x 80x80px）
- 部分 CSS 属性在小程序端不支持（如 `backdrop-filter`），需通过条件编译降级处理
- 不要在小程序端使用 `window` / `document` 等 Web API

***

## 十四、工作流程

### 第零步：项目环境识别（新增，必须先行）

在分析 Figma 设计稿之前，先判断项目的技术栈和项目类型：

1. 检查项目文件（`package.json`、配置文件等），确定技术栈（Vue2/Vue3/React/原生）
2. 检查项目特征（文件类型、`manifest.json`、`pages.json` 等），确定项目类型（H5/PC/小程序/UniApp）
3. 确认项目的样式方案（Scoped CSS / CSS Modules / Tailwind / Less/Sass）
4. **识别配套的 UI 组件库**（见 8.4.1：`package.json` 的 `dependencies` 中 `element-ui` / `element-plus` / `antd` / `@mui/material` / `uview-ui` 等）；无则视为"无 UI 库"，标准组件按 Figma 手写
5. 根据上述判断结果，调整后续代码输出的语法、单位和结构；设计稿中的标准组件一律优先用识别到的库组件实现（见 8.4）

### 第一步：设计稿分析

在编写任何代码前，必须完整分析 Figma 设计稿：

1. 列出所有页面 / 组件及其层级结构
2. 提取所有颜色、字号、行高、字间距、间距、圆角、阴影等设计 Token，构建 Token 表
3. 识别所有状态（如 hover、active、disabled），**记录在 Figma 中实际出现的状态**
4. 确认可导出资源（图标、图片）清单
5. 标注每个 Figma 节点的 Auto Layout 属性，为 HTML/CSS 映射做准备
6. **标注可复用 UI 组件库的节点**：对按钮 / 输入 / 下拉 / 表格 / 弹窗 / 标签页 / 分页等标准组件，标注其应使用的库组件（如 `el-button` / `el-table`），实现时直接选用而非手写（见 8.4）

### 第二步：编码还原

按照 Figma 设计稿的结构和样式逐层还原，执行顺序：

1. **先结构后样式**：先搭建语义化 HTML 骨架，再编写 CSS 样式
2. **先布局后细节**：先建立 Flex/Grid 布局和盒模型，再填充字号、颜色等细节
3. **先定义 Token、后引用**：在「设计稿分析」阶段产出的 Token 表，统一写入**全局** `src/styles/tokens.css` 的 `:root` 中（在应用入口 `import` 一次）；各组件样式**只引用** `var(--token)`，**绝不**在组件 `<style>` 内重复声明 `:root` 或任何 Token 变量（见 2.5 Scope 陷阱）

每完成一个组件或区块时进行自查：

- 该区块 / 组件在 Figma 中是否存在？（规则 2）
- 所有样式值是否与设计稿完全一致？（规则 1、3）
- 是否添加了设计稿中没有的状态或效果？（规则 4）
- 使用的资源是否来自 Figma？（规则 5）
- 是否因个人审美做出了调整？（规则 6）
- HTML 标签是否语义化？（可访问性）
- 是否使用了正确的单位？（技术栈/类型适配）
- CSS 是否引用了 Token 而非硬编码值？（Token 体系）

### 第三步：对比验证

完成代码后执行以下验证流程：

1. **快照对比**：将页面截图与 Figma 设计稿并列对比
2. **测量抽查**：随机选取 3\~5 个元素，在浏览器 DevTools 中对比其盒模型数值与 Figma 设计稿是否一致
3. **颜色校验**：使用取色器工具对比页面实际色值与 Figma 设计稿色值是否一致
4. **QA Checklist**：逐项过第十章还原验证清单，全部通过方可认为还原完成

***

## 十五、错误示例与正确做法

### 错误示例 1：添加设计稿中不存在的动效

```css
/* ❌ 错误：设计稿中没有 hover 放大效果 */
.card:hover {
  transform: scale(1.05);
  transition: transform 0.3s ease;
}

/* ✅ 正确：只保留设计稿中存在的样式 */
.card {
  /* 仅包含 Figma 设计稿中定义的样式 */
}
```

### 错误示例 2：自行调整颜色

```css
/* ❌ 错误：认为原色不够明显而加深 */
.button-primary {
  background-color: #1a56db; /* Figma 中是 #3b82f6 */
}

/* ✅ 正确：严格使用 Figma 色值 */
.button-primary {
  background-color: var(--color-primary); /* #3b82f6 */
}
```

### 错误示例 3：添加设计稿中不存在的占位文案

```html
<!-- ❌ 错误：设计稿中没有这段提示文字 -->
<p class="hint">请输入有效信息</p>

<!-- ✅ 正确：设计稿中无此文案，不添加 -->
```

### 错误示例 4：自行补充缺失状态

```css
/* ❌ 错误：设计稿中只有默认状态，自行添加 disabled 样式 */
.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ✅ 正确：只还原设计稿中存在的样式 */
```

### 错误示例 5：用第三方图标替代

```html
<!-- ❌ 错误：使用 FontAwesome 图标替代 Figma 中的图标 -->
<i class="fas fa-search"></i>

<!-- ✅ 正确：从 Figma 导出图标或保留占位 -->
<img src="./assets/search-icon.svg" alt="搜索" />
<!-- 或无法导出时 -->
<span class="icon-placeholder" style="width: 24px; height: 24px;"></span>
```

### 错误示例 6：四舍五入 Figma 小数像素值

```css
/* ❌ 错误：Figma 中 gap 是 12.5px，自行向下取整为 12px */
.container {
  gap: 12px;
}

/* ✅ 正确：保留 Figma 中的精确值 */
.container {
  gap: 12.5px;
}
```

### 错误示例 7：技术栈不匹配

```vue
<!-- ❌ 错误：在 Vue2 项目中使用了 Vue3 Composition API 语法 -->
<script setup lang="ts">
import { ref } from 'vue'
const count = ref(0)
</script>

<!-- ✅ 正确：在 Vue2 项目中使用 Options API -->
<script>
export default {
  data() {
    return { count: 0 }
  }
}
</script>
```

```xml
<!-- ❌ 错误：在小程序中使用了 HTML 标签和 px 单位 -->
<div class="card" style="padding: 16px;">
  <span>文本</span>
</div>

<!-- ✅ 正确：使用小程序组件标签和 rpx 单位 -->
<view class="card">
  <text>文本</text>
</view>
```

```css
.card {
  padding: 32rpx;
}
```

### 错误示例 8：在每个组件重复定义 Token

```css
/* ❌ 错误：把 :root Token 整段复制进每个组件，且 scoped 下 :root 会被改写为 :root[data-v-xxx] 而失效 */
<style scoped>
:root {
  --color-primary: #3b82f6;
  --spacing-md: 12px;
  /* ... 整张 Token 表 ... */
}
.user-card { color: var(--color-primary); padding: var(--spacing-md); }
</style>

/* ✅ 正确：Token 只在全局 tokens.css 定义一次（非 scoped），组件只消费 */
/* src/styles/tokens.css（在 main.js 中 import 一次） */
:root {
  --color-primary: #3b82f6;
  --spacing-md: 12px;
}
/* UserCard.vue —— <style scoped> 内只引用，不声明 */
.user-card { color: var(--color-primary); padding: var(--spacing-md); }
```

### 错误示例 9：未先查既有 tokens.css 就新建重复 / 近似 Token

```css
/* 项目 src/styles/tokens.css 已存在：--color-primary: #3b82f6; */

/* ❌ 错误：未检索既有 tokens.css，又新建一个取值重复、命名不同的 Token，
   造成多套「真相源」、后续维护漂移 */
:root { --color-blue-500: #3b82f6; }   /* 写在组件 / 局部，且与 --color-primary 同值 */
.btn { background: var(--color-blue-500); }

/* ✅ 正确：先查后定义——发现 --color-primary 已存在，直接引用 */
.btn { background: var(--color-primary); }
```

### 错误示例 10：标准组件手写裸标签、未用项目 UI 组件库

```vue
<!-- ❌ 错误：项目已装 ElementUI，却用裸标签手写按钮与输入框，
     既重复造轮子，又丢失组件库的交互 / 无障碍能力 -->
<template>
  <div class="btn" @click="submit">提交</div>
  <input class="ipt" v-model="name" />
</template>

<!-- ✅ 正确：检测技术栈后自主选用库组件，仅用最小覆盖对齐 Figma -->
<template>
  <el-button type="primary" @click="submit">提交</el-button>
  <el-input v-model="name" />
</template>
```

### 错误示例 11：React 项目手写裸标签、未用 Ant Design 组件（对应 8.4 + UI lint）

```tsx
// ❌ 错误：项目已装 antd，却用裸 <button> / <input> / 手写 <table> 实现标准组件，
//   丢失组件库交互 / 无障碍能力，且触发 LINT-FIGMA-UI-01 / UI-02
export const UserTable = () => (
  <div>
    <button className="btn" onClick={submit}>提交</button>
    <input className="ipt" value={name} onChange={onChange} />
    <table className="tbl">
      <thead><tr><th>姓名</th><th>角色</th></tr></thead>
      <tbody>{rows.map(r => <tr key={r.id}><td>{r.name}</td><td>{r.role}</td></tr>)}</tbody>
    </table>
  </div>
)

// ✅ 正确：检测技术栈为 React + antd 后，自主选用 a-button / a-input / a-table
import { Button, Input, Table } from 'antd'
export const UserTable = () => (
  <div>
    <Button type="primary" onClick={submit}>提交</Button>
    <Input value={name} onChange={onChange} />
    <Table
      columns={[{ title: '姓名', dataIndex: 'name' }, { title: '角色', dataIndex: 'role' }]}
      dataSource={rows}
      rowKey="id"
    />
  </div>
)
```

