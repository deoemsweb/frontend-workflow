# 提示词模板 03：.md 原型需求文档 → OpenSpec 需求规范（PRD）

> 用途：把产品/AI 产出的 Markdown 原型需求文档，借助本 skill 转换为结构化、可追溯的 OpenSpec 规范（specs / proposal / design / tasks）。
> 规则依据：`references/prototype-to-openspec-prd.md`（第二章 2.3 节 `.md` 输入源处理、第七章拆解、第八章质检、第十章边界）。

---

## 模板 A：完整版（推荐，含全部约束）

```text
请使用 frontend-workflow skill，将下面的 Markdown 原型需求文档转换为 OpenSpec 需求规范（PRD）。

【输入】
- 原型文档（.md）：{{md_file_path}}            # 或在此直接粘贴 Markdown 全文
- 目标项目目录：{{project_dir}}               # 需已 openspec init；若未初始化请先引导我执行
- 技术栈（参考用，不影响 PRD 写法）：{{tech_stack，如 Vue2/JS/ElementUI}}
- 是否同时提供 Figma：{{figma_link 或 “无”}}   # 如有，仅作视觉/交互补充，.md 文本为权威来源

【执行要求】
1. 输入源判定与读取：走 prototype-to-openspec-prd.md 第二章 2.3 节——用 Read 读取 .md，
   按映射表提炼：标题层级→capability、字段表→数据需求、有序列表→业务流程(GIVEN/WHEN/THEN)、引用块→边界约束。
2. 输出结构化需求清单给我确认（2.4/2.5）：重点澄清
   - 字段真实业务含义与数据来源；
   - 接口契约（URL/入参/出参）未知时严禁猜测，标注 `> ⚠️ 待确认：...`；
   - 文档缺失字段表、流程歧义或含“等/其他”模糊词时，停止并询问，不替我补。
3. 检查 OpenSpec 环境（第三章）：先 `openspec --version`；不可用则引导我安装，未经确认不自动执行。
4. 按第七章策略划分 capability（kebab-case 表达“能力域”而非页面名），生成：
   - openspec/specs/<capability>/spec.md（Requirement 用 SHALL，每个至少 1 个 Scenario）
   - openspec/changes/<change-id>/{proposal.md, design.md, tasks.md}
5. 逐项过第八章质量清单，确保每条需求可回溯到 .md 文档的「文件路径 + 章节/标题」。
6. 到达人工 Gate（需求确认、终验）时暂停，等我确认后再继续；单环节检查最多回流 3 次。

【硬约束】
- 严禁猜测后端接口、业务规则、字段含义；信息不足必须停下问。
- 仅记录 .md 中存在的需求，不自行补充缺失状态/页面。
- 已有规范用 `+`/`-` delta 增量更新，不整篇重写。
```

---

## 模板 B：精简版（一行触发，适合快速使用）

```text
用 frontend-workflow skill，按 prototype-to-openspec-prd.md 的 2.3 节，把 {{md_file_path}} 这个 .md 原型需求文档转成 OpenSpec PRD，写到 {{project_dir}} 的 openspec/ 下。先读文档并给我结构化需求清单确认，接口/字段未知处标 ⚠️ 待确认，别猜；环境缺失先引导安装；最后过第八章质检并等我人工验收。
```

---

## 占位符说明

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `{{md_file_path}}` | `.md` 原型文档路径，或直接粘贴内容 | `docs/prototype-order.md` |
| `{{project_dir}}` | OpenSpec 写入的目标项目根目录 | `F:/Develop/www/userlive` |
| `{{tech_stack}}` | 技术栈（仅作后续工程实现参考） | `Vue2.6 + JS + ElementUI2` |
| `{{figma_link}}` | 可选，同时提供的 Figma 链接/节点 | `https://www.figma.com/file/...` 或 `无` |

## 使用贴士
- 若文档较大，模板 A 的第 2 步“先确认需求清单再生成”能显著降低返工，建议保留。
- 若 `.md` 本身已很规范（含字段表+流程步骤），可跳过确认直接生成，但在模板里注明“文档已自洽，可省略确认 Gate”。
- 同时给 Figma 时，明确写“以 .md 文本为权威，Figma 仅补视觉/交互”，避免两套来源冲突时 skill 误判。
