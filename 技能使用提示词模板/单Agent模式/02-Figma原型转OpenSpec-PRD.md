# 提示词模板 02：Figma 原型 → OpenSpec 需求规范（PRD）

> 规则依据：`references/prototype-to-openspec-prd.md`（第二章 2.2 Figma 读取、第七章拆解、第八章质检、第十章边界）。
> 适用：把 Figma 设计原型转化为可协作的 OpenSpec 规范（specs / proposal / design / tasks）。

---

## 模板 A：完整版

```text
请使用 frontend-workflow skill，按 prototype-to-openspec-prd.md 把下面 Figma 原型转化为 OpenSpec PRD。

【输入】
- Figma 链接 / 节点：{{figma_url}}
- 目标项目目录：{{project_dir}}            # 需已 openspec init；若未初始化请先引导我执行
- 技术栈（参考用，不影响 PRD 写法）：{{tech_stack}}
- Swagger / 接口 JSON（可选）：{{swagger_path or 无}}   # 用于补齐 API 契约

【执行要求】
1. 输入源走 2.2 节（Figma 读取）：优先 Figma MCP（get_figma_data / download_figma_images），不可用则请我提供链接 / 节点 key / 截图。
2. 输出结构化需求清单给我确认（2.4/2.5），重点澄清：
   - 交互元素的点击去向（弹窗 / 跳转）；
   - 字段真实业务含义与数据来源；
   - 接口契约（URL / 入参 / 出参）未知时严禁猜测，标注 `> ⚠️ 待确认：...`；
   - 缺失状态 / 流程歧义处停止并询问，不替我补。
3. 检查 OpenSpec 环境（第三章）：先 `openspec --version`；不可用则引导我安装，未经确认不自动执行。
4. 按第七章策略划分 capability（kebab-case 表达“能力域”而非页面名），生成：
   - openspec/specs/<capability>/spec.md（Requirement 用 SHALL，每个至少 1 个 Scenario）
   - openspec/changes/<change-id>/{proposal.md, design.md, tasks.md}
5. 逐项过第八章质量清单，确保每条需求可回溯到 Figma 页面 / Frame。
6. 到达人工 Gate（需求确认、终验）时暂停，等我确认后再继续；单环节检查最多回流 3 次。

【硬约束】
- 严禁猜测后端接口、业务规则、字段含义；信息不足必须停下问。
- 仅记录 Figma 中存在的需求，不自行补充缺失状态 / 页面。
- 已有规范用 `+`/`-` delta 增量更新，不整篇重写。
```

## 模板 B：精简版（一行触发）

```text
用 frontend-workflow skill 按 prototype-to-openspec-prd.md 的 2.2 节，把 {{figma_url}} 这个 Figma 原型转成 OpenSpec PRD，写到 {{project_dir}} 的 openspec/ 下。先出需求清单给我确认，接口/字段未知标 ⚠️ 待确认，别猜；环境缺失先引导安装；最后过第八章质检并等我人工验收。
```

## 占位符说明

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `{{figma_url}}` | Figma 文件链接或节点 | `https://www.figma.com/file/xxx` |
| `{{project_dir}}` | OpenSpec 写入的目标项目根目录 | `F:/Develop/www/userlive` |
| `{{tech_stack}}` | 技术栈（仅作后续工程实现参考） | `Vue2.6 + JS + ElementUI2` |
| `{{swagger_path}}` | 可选接口文档路径 | `docs/api.json` 或 `无` |

## 多 Agent 模式（可选）

在提示词开头追加「用多 agent / 团队协作模式」即可启用：编排器 `workflow-orchestrator`（`.agents/workflow-orchestrator.md`）按阶段⑤ spawn 专职 agent **`prd-analyst`**（`.agents/prd-analyst.md`）生成 OpenSpec PRD（specs / proposal / design / tasks），⑤a 业务文档方案确认与 ⑦ 人工 Gate 由编排器管理；状态机脚本（`scripts/`）负责门控校验与阶段推进，规则正文仍来自 `prototype-to-openspec-prd.md`。不追加则默认单 agent 顺序执行。完整协议见 `references/multi-agent-orchestration.md`。
