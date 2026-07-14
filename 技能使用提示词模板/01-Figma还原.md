# 提示词模板 01：Figma 设计稿像素级还原（静态页面 / 组件代码）

> 规则依据：`references/figma-design-constraint.md`（六条核心规则、Design Token、第十章 QA Checklist）。
> 适用：根据 Figma 生成静态页面 / 组件代码，不实现业务逻辑。

---

## 模板 A：完整版

```text
请使用 frontend-workflow skill，按 figma-design-constraint.md 把下面 Figma 设计稿还原为静态前端页面/组件代码。

【输入】
- Figma 链接 / 节点 key：{{figma_url_or_node}}
- 技术栈：{{tech_stack}}                 # 如 Vue2/JS/ElementUI（本项目）或 Vue3/TS
- 目标范围：{{scope}}                     # 单页面 / 多页面 / 单个组件 / 整模块
- 输出目录：{{output_dir}}

【执行要求】
1. 先解读意图（SKILL.md 2.1）：确认任务范围、起止阶段、技术栈，输出意图清单给我确认。
2. 严格遵循 figma-design-constraint.md 六条核心规则：
   - 样式与 Figma 完全一致（颜色 / 尺寸 / 位置 / 间距 / 边框 / 圆角）；
   - 禁止添加 Figma 中不存在的样式 / 颜色 / 阴影 / 边框 / 图标 / 元素 / 动效 / 文案；
   - 缺失状态（hover / active / disabled / loading / empty / error）不得自行补充；
   - 资源优先从 Figma 导出，无法导出保留占位结构，禁止用第三方图标库替代；
   - 严禁“美化”设计稿，Figma 是唯一真理来源。
3. 用 Design Token（CSS 变量），禁止硬编码色值 / 字号 / 间距。
4. 按第十章 QA Checklist 逐项自检（布局 / 颜色 / 字体 / 资源 / 内容 / 交互 / 可访问性 / 代码质量）。
5. 完成后进入「检查（Agent 只读）」跑结构化偏差报告，单环节最多回流 3 次；到达人工 Gate（④）暂停等我验收。

【本项目（Vue2/JS/ElementUI）适配】
- 用 Options API，非 Vue3 <script setup>；
- 样式 <style scoped lang="scss">，禁止 inline style，动态样式用 :class；
- 富文本用 v-rich-text 指令，禁用 v-html；
- 与 ElementUI 共存策略：Figma 优先 + 最小覆盖。
```

## 模板 B：精简版（一行触发）

```text
用 frontend-workflow skill 按 figma-design-constraint.md 把 {{figma_url}} 还原成 {{tech_stack}} 静态页面，写到 {{output_dir}}。严格六条核心规则（禁止美化 / 补缺失状态 / 第三方图标替代），用 Design Token，过第十章 QA Checklist，完成后等我验收。
```

## 占位符说明

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `{{figma_url_or_node}}` | Figma 文件链接或目标 Frame/节点 key | `https://www.figma.com/file/xxx?node-id=12-34` |
| `{{tech_stack}}` | 技术栈，决定输出语法 | `Vue2.6 + JS + ElementUI2` |
| `{{scope}}` | 本次还原范围 | `订单列表页` / `UserCard 组件` |
| `{{output_dir}}` | 代码输出目录 | `src/views/order/` |
