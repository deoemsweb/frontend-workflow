# 提示词模板 05：Swagger / OpenAPI → 前端接口定义自动生成

> 规则依据：`references/api-definition-generation.md`（Swagger 解析、项目模式自动探测、生成规则、增量更新、质量校验）。
> 适用：根据 Swagger / open.json / swagger.json 生成或增量同步前端接口定义文件（函数 + 类型 + JSDoc）。

---

## 模板 A：完整版

```text
请使用 frontend-workflow skill，按 api-definition-generation.md 把下面的 Swagger 文档生成前端接口定义。

【输入】
- Swagger 文档：{{swagger_source}}          # open.json 文件路径 / swagger.json 路径 / 在线 api-docs URL
- 技术栈：{{tech_stack}}                     # 如 Vue2/JS（本项目）或 Vue3/TS
- 生成范围：{{scope}}                        # 全量生成 / 指定模块（如「用户管理」「订单」）/ 指定接口
- 项目根目录：{{project_dir}}                # 用于探测既有接口模式
- 模式：{{mode}}                             # 全新生成 / 增量更新（已有接口定义时）

【执行要求】
1. 先解读意图（SKILL.md 2.1）：确认技术栈、生成范围、全量/增量模式，输出意图清单给我确认。
2. Swagger 读取（第二章）：解析 paths / components/schemas / tags / security；解析失败或缺关键字段（responses/schema）则停止询问，不臆造返回结构。
3. 项目模式探测（第三章）：Read 请求封装层 + 既有接口模块文件，提取命名约定 / 注释风格 / 模块归类 / 响应解包层级 / 鉴权拦截器，输出「模式画像」给我确认（人工 Gate ⑦b⑦c 前置确认）。
4. 生成规则（第四章）：
   - 复用项目封装层（本项目 http.js 的 get/post/del），禁止裸调 axios / fetch；
   - 按 Swagger tags / path 归类到对应业务模块目录；
   - 函数命名对齐项目既有约定（如 getUserList）；
   - 每个函数完整 JSDoc：@param（类型+说明）、@returns（类型）；
   - 复杂类型用 @typedef（JS）或 interface（TS）统一定义，schema $ref 解析为类型名，无 $ref 残留。
5. 增量更新（第五章，仅 mode=增量）：只追加/修改对应函数，不整文件覆盖；Swagger 已移除的接口不自动删，标注「⚠️ 待确认」；输出 delta 说明（新增/修改/移除）。
6. 质量校验（第七章）：逐项过清单（封装复用 / 模块归类 / 命名一致 / 注释完整 / 类型准确 / 解包层级 / 无重复鉴权）。
7. 完成后到人工 Gate（⑦b⑦c）暂停等我验收，不自动进入业务逻辑实现。

【硬约束】
- 严禁猜测：Swagger 缺出参 schema、响应解包层级不明、命名冲突、鉴权方式与封装层不一致时，停止询问，不脑补。
- 响应解包层级必须从封装层 / 既有样本确认，不按 Swagger 猜。
- 鉴权：封装层拦截器已注入 token 则生成的函数不重复传。

【本项目（Vue2/JS/ElementUI）适配】
- 封装层：src/utils/http/http.js，导出 get / post / del / axiosRequest；
- 模块组织：src/utils/http/modules/<Business>/<business>.js；
- 类型方式：JavaScript（无 TS），用 @typedef 定义复杂类型，置于文件顶部；
- 命名：函数名 getUserList（动词+资源+List/Detail），文件名小驼峰。
```

## 模板 B：精简版（一行触发）

```text
用 frontend-workflow skill 按 api-definition-generation.md 把 {{swagger_source}} 生成 {{tech_stack}} 接口定义，写到 {{project_dir}}。先探测项目既有 http.js 封装与 modules 模式、输出模式画像给我确认，再按探测到的命名/注释/归类生成（复用封装层、禁止裸调 axios、完整 JSDoc、$ref 解析为类型），增量模式只改对应函数并出 delta 说明，完成后等我验收。
```

## 占位符说明

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `{{swagger_source}}` | Swagger 文档来源（文件路径或 URL） | `docs/open.json` / `https://api.example.com/v3/api-docs` |
| `{{tech_stack}}` | 技术栈，决定类型表达与封装复用 | `Vue2.6 + JS` / `Vue3 + TS` |
| `{{scope}}` | 生成范围 | `全量` / `用户管理模块` / `GET /api/user/*` |
| `{{project_dir}}` | 项目根目录，用于探测既有接口模式 | `f:/Develop/www/userlive` |
| `{{mode}}` | 全量生成或增量更新 | `全新生成` / `增量更新` |

## 使用贴士

- **大文档**：Swagger 接口数 > 30 时，建议按 `scope` 分模块多次生成，每次确认一个模块的模式画像，避免一次性确认负担过重。
- **首次接入**：项目无任何接口定义文件时，模板会跳过采样按封装层导出 + 通用最佳实践生成，模式画像标注「首次接入，无既有样本」。
- **增量同步**：后端更新 Swagger 后用 `mode=增量更新`，skill 只改对应函数并输出 delta，不破坏手写扩展。
- **同时有 Figma**：若同时给 Figma 设计稿，出参类型字段应与设计稿数据字段对齐，不一致时以 Swagger 契约为准并标注差异（见 reference 第九章协作关系）。

## 多 Agent 模式（可选）

在提示词开头追加「用多 agent / 团队协作模式」即可启用：编排器 `workflow-orchestrator`（`.agents/workflow-orchestrator.md`）按阶段⑦b⑦c spawn 专职 agent **`api-contractor`**（`.agents/api-contractor.md`）生成前端接口定义，⑦b⑦c 接口验收 Gate 由编排器管理；状态机脚本（`scripts/`）负责门控校验与阶段推进，规则正文仍来自 `api-definition-generation.md`。不追加则默认单 agent 顺序执行。完整协议见 `references/multi-agent-orchestration.md`。
