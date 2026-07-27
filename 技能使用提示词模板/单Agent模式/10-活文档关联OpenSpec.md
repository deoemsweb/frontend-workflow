# 提示词模板 10：开发计划活文档 · OpenSpec 关联（可选增强）

> 规则依据：`references/fw-dev-spec.md`（3.7 独立分支）第九章「可选 OpenSpec 关联模式」。
> 适用：在生成 3.7 开发计划活文档时，经【可选 Gate · OpenSpec 关联】确认后，将活文档单向同步到 OpenSpec 并建立双向锚点，活文档内嵌同步钩子。是 3.7 的**可选增强**，默认仍是「二选一、互不污染」，不改变既有语义。
> 辅助脚本：`scripts/sync-fw-openspec.cjs`（init / sync / check，仅 Node 内置模块，无第三方依赖）。

---

## 模板 A：完整版

```text
请使用 frontend-workflow skill，按 references/fw-dev-spec.md（3.7 开发计划活文档独立分支）生成开发计划活文档，并开启「OpenSpec 关联模式」。

【输入】
- 需求原型来源：{{source}}                # Figma 链接/节点 key，或 .md 原型需求文档路径
- 需求名：{{req_name}}                    # 用于 fw_dev_spec/<需求名-日期>/ 目录与 capability 推导
- 技术栈：{{stack}}                       # Vue3 / React / 小程序等（决定活文档与下游实现语法）
- 组织形式：{{org}}                        # 单文档 / 多 spec 文档（按需求大小，也可让 skill 询问）
- 是否关联 OpenSpec：是（开启「OpenSpec 关联模式」）
- OpenSpec capability：{{capability}}      # 可选，默认由需求名转 kebab-case
- OpenSpec change-id：{{change_id}}        # 可选，默认 init-from-fw-dev-spec

【执行要求】
1. 按 fw-dev-spec.md 第二~六章读取需求、转 .md 原型（Figma 输入经【人工 Gate · 原型审阅】）、确认目录与组织形式。
2. 在生成活文档前，经【可选 Gate · OpenSpec 关联】确认开启关联模式。
3. 调用 node scripts/sync-fw-openspec.cjs init <活文档路径> [--capability <capability>] [--change-id <change_id>] 初始化关联：
   - 检测 openspec 环境（未安装 / 无 openspec/ 则引导 openspec init，不静默创建）；
   - 脚手架 openspec/specs/<capability>/ 与 openspec/changes/<change_id>/；
   - 注入双向锚点（活文档模块①关联字段 + OpenSpec spec.md 来源回指）并写入同步指纹；
   - 活文档内嵌 <!-- openspec-sync --> 同步钩子配置块。
4. 生成五模块活文档；依据模块②将功能点转为 Requirement / Scenario 写入 openspec/changes/<change_id>/specs/<capability>/spec.md（delta 增量，单向）。
5. 开发中实时更新模块②③④⑤；每次变动后运行 node scripts/sync-fw-openspec.cjs sync <活文档路径> 列出待回写项，回写后加 --done 刷新指纹；可随时 node scripts/sync-fw-openspec.cjs check <活文档路径> 校验一致性。

【硬约束】
- 默认二选一语义不变：仅在用户确认开启关联模式后才写 openspec/。
- 单向同步：活文档为真相源，绝不反向改写活文档；语义转换（Requirement/Scenario）由 Agent 完成，脚本只做脚手架/锚点/指纹管理。
- 不静默创建 openspec/：环境缺失必须停下请用户确认 openspec init。
- 严禁猜测：信息不足停下问，标注 > ⚠️ 待确认。
```

## 模板 B：精简版（一行触发）

```text
用 frontend-workflow skill 按 references/fw-dev-spec.md（3.7）为「{{req_name}}」生成开发计划活文档，并开启 OpenSpec 关联模式：Figma/.md 原型经审阅后生成五模块活文档，确认【可选 Gate · OpenSpec 关联】后用 node scripts/sync-fw-openspec.cjs init 初始化双向关联锚点，后续模块②③④⑤ 变动以 delta 单向回写 OpenSpec（sync/check 校验）。openspec 环境缺失时请我先 openspec init，不要自动安装。
```

## 占位符说明

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `{{source}}` | 需求原型来源（Figma 链接/节点 key，或 `.md` 原型需求文档路径） | `https://figma.com/file/xxx` 或 `./docs/需求.md` |
| `{{req_name}}` | 需求名（用于 `fw_dev_spec/<需求名-日期>/` 目录与 capability 推导） | `用户中心改版` |
| `{{stack}}` | 技术栈（决定活文档与下游实现语法） | `Vue3 + TS` |
| `{{org}}` | 组织形式（单文档 / 多 spec 文档，可按需求大小留空让 skill 询问） | `单文档` |
| `{{capability}}` | OpenSpec capability（可选，默认由需求名转 kebab-case，表达能力域） | `user-center` |
| `{{change_id}}` | OpenSpec change-id（可选，默认 `init-from-fw-dev-spec`） | `init-from-fw-dev-spec` |

## 多 Agent 模式（独立分支启用）

开发计划活文档是 3.7 独立分支，默认由专职 agent **`prd-analyst`**（`.agents/prd-analyst.md`）在阶段⑤执行；开启 OpenSpec 关联模式时，其 fw-dev-spec 方案内已内置【可选 Gate · OpenSpec 关联】与 `scripts/sync-fw-openspec.cjs` 调用约定（见 `.agents/prd-analyst.md` 阶段⑤）。如需显式多 agent 协作，在提示词开头追加「用多 agent / 团队协作模式」；关联 Gate 与 openspec init 确认仍须人工确认，TAPD/openspec 写操作前须询问。完整协议见 `references/multi-agent-orchestration.md`。
