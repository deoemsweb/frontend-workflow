# @command://frontend-workflow 使用说明文档

> 适用项目：userlive（Vue 2.6 + JavaScript + Webpack/Vue CLI + ElementUI 2 + SCSS）
> 文档目的：说明该 Skill 的调用方式、工作流，以及如何在本项目规范下正确使用。

## 一、Skill 是什么

`frontend-workflow` 是一个**单一入口**的前端开发工作流 Skill，把原本分散的 4 个子能力合并为一个目录（位于 `~/.codebuddy/skills/frontend-workflow-skills/`）。它自身**只做三件事**：

1. **解读意图**：判断任务范围、技术栈、起止阶段。
2. **按阶段调度**：命中分支后 `Read` 对应 `references/*.md` 再执行（规则正文不内联）。
3. **管理检查循环与人工确认点**：每个生成阶段后跑结构化偏差报告，并在关键节点暂停等待人工验收。

目录结构：

```
frontend-workflow-skills/
├── SKILL.md                         # 路由层（触发条件 + 意图解读 + 阶段调度 + 章节指针）
├── README.md                        # 能力索引与安装说明
└── references/
    ├── figma-design-constraint.md   # ① Figma 像素级还原约束
    ├── prototype-to-openspec-prd.md     # ② 原型（Figma / .md）→ OpenSpec PRD
    ├── frontend-engineering-standards.md  # ③ 前端工程通用规范
    └── testing.md                   # ④ 测试能力（占位，待扩展）
```

## 二、能力分支与触发场景

在对话中输入以下任一含义的指令即可触发（Skill 会自动路由到对应 reference）：

| 分支 | 触发关键词示例 | 对应 reference | 产物 |
|------|---------------|----------------|------|
| Figma 还原 | "按前端工作流还原这个 Figma"、"设计稿转代码"、"高保真还原"、"切图" | `figma-design-constraint.md` | 静态页面/组件代码 |
| 原型 → PRD | "根据 Figma 生成 PRD"、"Figma 转 OpenSpec"、"根据 .md 需求文档生成 PRD"、"把 .md 需求文档规范化为 OpenSpec"、"需求拆解为 specs/tasks" | `prototype-to-openspec-prd.md` | OpenSpec 规范文档 |
| 工程规范 | "按前端工程规范实现"、"集成 API"、"状态管理"、"前端安全/性能" | `frontend-engineering-standards.md` | 业务代码 |
| 测试（待扩展） | "写单测/组件测试/E2E" | `testing.md` | 暂为骨架，未定稿 |

> 也可在不经过路由的情况下，直接要求"读取 references/xxx.md 的某个章节"单独使用。

## 三、标准工作流（端到端 12 阶段）

当任务为"端到端还原设计稿并实现业务"时，Skill 按固定顺序推进：

② 生成静态页面  → ③ 检查(Agent只读) → ④ **人工验收**【Gate】
→ ⑤ 生成 OpenSpec PRD → ⑥ 检查 → ⑦ **人工确认需求**【Gate】
→ ⑧ 设计桥梁(组件树/状态/数据流) → ⑨ 生成业务逻辑 → ⑩ 检查 → ⑪ **人工验收业务**【Gate】
→ ⑫ **终验**【Gate】

关键协作机制：
- **检查 Agent 只读不写**，输出结构化偏差报告，单环节最多回流 **3 次**，超出转"人工介入"。
- **人工 Gate（④⑦⑪⑫）不可跳过**：即使检查通过，也必须暂停请用户确认。
- **可跳过阶段**：如已有静态页面则可跳过 ②③，但须在"意图解读"阶段与用户确认并记录。

偏差报告格式（强制）：

```
[偏差报告]
- 文件路径: src/components/UserCard.vue
- 行号: 12-18
- 规则来源: references/figma-design-constraint.md · 第十章 颜色与视觉
- 偏差描述: 按钮背景色 #2563eb，Figma 为 #3b82f6
- 修复建议: 改为 var(--color-primary)
- 严重级别: 高 / 中 / 低
```

人工 Gate 提示格式：

```
【人工 Gate · 阶段 X】
- 当前阶段：<阶段名>
- 待确认产物：<文件 / 页面 / 文档>
- 检查结论：<通过 / 人工介入 / 偏差清单摘要>
- 请确认：[通过] / [返工] / [调整范围]
```

## 四、与本项目（Vue2 / JS / ElementUI）的适配要点（重点）

Skill 的默认示例多为 **Vue3 + TypeScript**，与本项目的实际栈不同，使用时须按下表映射：

| 领域 | Skill 通用写法 | 本项目正确写法 |
|------|---------------|----------------|
| 组件语法 | `<script setup lang="ts">` + Composition API | **Options API**：`export default { name, directives, mixins, components, props, data, computed, watch, 生命周期, methods }` |
| Props 定义 | TS interface + `defineProps` | 对象式：`{ type, default, required, validator }` |
| 样式方案 | `<style scoped>` / CSS Modules | `<style scoped lang="scss">`；**禁止 inline style**，动态样式用 `:class` 绑定（见 workspace 规范） |
| 类型安全 | 禁止 `any`、显式返回类型 | **不适用**（本项目为 JS）；但"禁止魔法数字""ESLint 兼容""JSDoc 注释"仍适用 |
| API 封装 | `import { request } from '@/utils/request'` | 实际封装在 `src/utils/http/http.js`，导出 `get / post / del / axiosRequest`；按业务模块组织在 `src/utils/http/modules/<Business>/`，新增接口放对应业务目录并写完善出入参注释 |
| 状态管理 | Pinia / Zustand | **Vuex 3**（`src/store/`），按现有 module 模式扩展 |
| XSS 防护 | `DOMPurify` 净化后 `v-html` | **使用 `v-rich-text` 指令替代 `v-html`**（workspace 强制，且禁止重复实现）；不要自行引入 DOMPurify |
| 自定义指令 | 通用示例 | **必须优先复用**已注册指令：`v-permission`、`v-role`、`v-copy`、`v-click-outside`、`v-drag`、`v-number`、`v-rich-text`、`v-limit-lines`、`v-limit-live`、`v-show-tips`、`v-insert-tips` |
| 组件结构顺序 | — | 强制：`template` → `script`(name→directives→mixins→components→props→data→computed→watch→生命周期→methods) → `style(scoped)` |

## 五、各分支使用要点速查

### 5.1 Figma 还原（`figma-design-constraint.md`）
核心 6 条规则（最高优先级）：
1. 静态页面样式必须与 Figma 完全一致（颜色/尺寸/位置/间距/边框/圆角）。
2. **禁止**添加 Figma 中不存在的样式、颜色、阴影、边框、图标、元素、动效、文案。
3. 所有样式属性以 Figma 为准，不得自行调整。
4. 缺失的状态（hover/active/disabled/loading/empty/error）**不得自行补充**。
5. 资源优先从 Figma 导出；无法导出保留占位结构，禁止用第三方图标库替代。
6. 严禁"美化"设计稿（Figma 是唯一真理来源，像素级还原）。

配套要求：Design Token（CSS 变量，禁止硬编码色值/字号/间距）、Figma 节点→HTML 语义标签映射、精确测量（px 默认，小数取舍规则）、a11y 最小约束、与 ElementUI 共存策略（Figma 优先 + 最小覆盖）。
完成须过**第十章 QA Checklist**（布局/颜色/字体/资源/内容/交互/可访问性/代码质量）。

### 5.2 原型 → PRD（`prototype-to-openspec-prd.md`）

输入源支持 **Figma 原型** 与 **`.md` 格式原型需求文档** 两种：
- **Figma 原型**：走 2.2 节（MCP/链接/截图读取）。
- **`.md` 原型需求文档**：走 2.3 节——用 Read 读取 `.md` 文件后，把 Markdown 的标题层级（模块/页面）、字段表格、有序列表（业务流程）、引用块（约束/边界）映射为 OpenSpec 的 capability / Requirement / Scenario（见 2.3.2 映射表）；文档缺失字段表或流程歧义时**停止询问**，不替用户补。
- 若同时提供两者，以 `.md` 文本为规范骨架与字段/流程权威，Figma 补视觉与交互细节。
- 先检查 OpenSpec 是否可用（`openspec --version`）；本项目目前**无 `openspec/` 目录**，若要用需先 `openspec init`（Skill 不会自动安装，会请用户确认）。
- `spec.md` 写法：一级标题 `# <capability> Specification`，每条 `### Requirement:` 用 **SHALL**，每个 Requirement 至少 1 个 `#### Scenario:`（GIVEN/WHEN/THEN）。
- 变更用 `+`/`-` delta 增量，不整篇重写主 specs。
- capability 用 kebab-case 且表达能力域（非页面名），如 `user-auth`；change-id 用动词短语如 `add-remember-me`。
- **严禁猜测**后端接口 URL/入参出参、业务规则、字段含义；信息不足必须停下来询问。

### 5.3 工程规范（`frontend-engineering-standards.md`）
- **API 三态**：任何异步数据组件必须处理 loading/error/empty（视觉仍受"缺失状态不补"约束）。
- **请求取消与防竞态**：组件销毁/快速切换时 abort 未完成请求，非 `AbortError` 不被吞没。
- **安全硬约束（无论设计稿是否体现都必须遵守）**：禁止 `v-html`（用 `v-rich-text`）、用户输入必须转义、URL 协议校验、`javascript:`/`data:` 禁用；禁止硬编码 API Key/Token/密码，禁止 `console.log` 敏感信息。
- **性能**：图片 `loading="lazy"` + 明确尺寸；路由/组件懒加载；搜索输入防抖、滚动节流；长列表(>100)考虑虚拟滚动（检查项目中是否已有 `el-table-virtual-scroll`、`vue-virt-list`等组件）。
- **注释**：工具函数/Hook/Store action 必须有 JSDoc；复杂逻辑必须注释；TODO/FIXME 需带责任人+日期。

### 5.4 测试（`testing.md`）
当前为**骨架占位，规则未定稿**。触发测试需求时，Skill 会先读取本文件但提示"待扩展"，需人工补充具体规范后再执行。

## 六、生成后检查清单（合并 Skill + 本项目规范）

- [ ] 组件名符合规范（文件/组件小驼峰，本目录约定）
- [ ] Props 有完整定义（type/default/required）
- [ ] 技术栈写法是 Vue2 Options API（非 Vue3 语法）
- [ ] 使用了正确的自定义指令（v-permission 等），未重复实现
- [ ] 富文本用 `v-rich-text` 而非 `v-html`
- [ ] 无 inline style，动态样式用 `:class` + CSS class
- [ ] API 走 `src/utils/http/http.js` 封装，新接口按业务模块归类且有出入参注释
- [ ] 未硬编码敏感信息 / API Key
- [ ] 异步组件处理了 loading/error/empty
- [ ] 关键函数有 JSDoc 注释；无 ESLint 错误
- [ ] Figma 还原通过了第十章 QA Checklist（如有设计稿）

## 七、边界与不确定处理（最高优先级）

- 信息不足（接口契约未知、字段含义歧义、缺失关键状态设计、技术方案有分歧）时 **必须停止并询问用户，严禁猜测**。
- 不确定项在文档中用 `> ⚠️ 待确认：...` 显式标记，确认后移除。
- 不跳过人工 Gate（④⑦⑪⑫）；不自行扩展阶段顺序；安全规则为硬约束。
