# Swagger / OpenAPI → 前端接口定义自动生成

本规则集把后端提供的 Swagger / OpenAPI（`open.json` / `swagger.json`）接口文档，**结合当前前端项目已有的技术栈与接口定义模式**，自动生成（或增量更新）前端项目中的接口定义文件。它处于前端工作流的「接口契约接入」环节，产出物供 `references/frontend-engineering-standards.md`（请求调用 / 三态 / 防竞态）与 `references/figma-design-constraint.md`（数据字段还原）衔接。

## 何时使用本规则集

当用户请求以下任一操作时，触发本规则集：

- 根据 Swagger / open.json / swagger.json 生成接口定义 / API 文件 / model
- 把接口文档转成前端接口方法 / 请求函数
- 根据 OpenAPI 文档生成 TypeScript interface / JSDoc 类型
- 接口文档更新后增量同步前端接口定义
- 批量生成 API 模块 / 按业务模块归类接口

> 本规则集聚焦「接口定义的生成与同步」，**不**实现业务调用逻辑（三态 / 防竞态 / Composable 由 `references/frontend-engineering-standards.md` 第二章负责），**不**做需求拆解（那是 `references/prototype-to-openspec-prd.md` 的职责）。当 Swagger 缺失关键字段时**停止并询问**，严禁猜测接口契约。

---

## 一、工作流总览

一次完整的 Swagger → 接口定义生成按以下阶段执行，每阶段均有「停止并询问」检查点：

```
Swagger 读取 → 项目模式探测 → 模式画像确认 → 生成规则映射 → 接口定义生成 → 质量校验 →（增量时）合并归档
```

| 阶段 | 关键动作 | 产物 / 检查点 |
|------|----------|---------------|
| 1. Swagger 读取 | 解析 open.json / swagger.json 的 paths / components | 拿不到文档或关键字段缺失则停止询问 |
| 2. 项目模式探测 | Read 请求封装层 + 既有接口模块文件，提取命名/注释/归类/签名约定 | 输出「模式画像」 |
| 3. 模式确认 | 把模式画像 + 接口清单给用户确认 | 用户确认后才生成 |
| 4. 生成规则映射 | Swagger tag/path → 业务模块；schema → 类型；operation → 函数 | 映射表 |
| 5. 接口定义生成 | 按探测到的模式生成 / 增量更新接口文件 | 接口定义文件 |
| 6. 质量校验 | 逐项过第七章清单 | 全部通过 |
| 7. 增量合并（可选） | 与已有接口定义合并，不破坏手写部分 | delta 说明 |

> **人工 Gate**：阶段 3（模式画像 + 接口清单确认）必须暂停等用户确认后才生成，不自动落盘。

---

## 二、Swagger / OpenAPI 文档读取与解析

### 2.1 输入源（按优先级）

1. **本地 `open.json` / `swagger.json` 文件**：用户提供文件路径，用 `Read` 读取后解析。
2. **在线 Swagger URL**：用户提供文档地址（如 `https://api.example.com/v2/api-docs` 或 `/v3/api-docs`），用 `WebFetch` 拉取 JSON。
3. **回退**：以上均不可得时，请用户提供以下任一：接口文档截图、Postman 导出、口述的接口清单。若仍无法获得完整契约，**停止并询问**。

> 不确定 Swagger 版本时，先看 `swagger` 字段（"2.0"）或 `openapi` 字段（"3.x.x"）判定版本，不同版本的 requestBody / responses 结构不同。

### 2.2 解析要素清单

读取文档后，逐项提取并整理为结构化接口清单：

| 解析对象 | OpenAPI 3.x 路径 | Swagger 2.0 路径 | 提取内容 |
|----------|------------------|------------------|----------|
| 接口路径 | `paths.{path}.{method}` | `paths.{path}.{method}` | HTTP 方法 + URL path |
| 路径参数 | `parameters[in=path]` | `parameters[in=path]` | 参数名 / 类型 / 是否必填 |
| 查询参数 | `parameters[in=query]` | `parameters[in=query]` | 参数名 / 类型 / 是否必填 / 枚举 |
| 请求体 | `requestBody.content.{mime}.schema` | `parameters[in=body].schema` | body 结构 / 字段 / 类型 |
| 响应体 | `responses.{code}.content.{mime}.schema` | `responses.{code}.schema` | 出参结构 / 字段 / 类型 |
| 复用类型 | `components/schemas` | `definitions` | 被引用的 schema 定义 |
| 模块标签 | `paths.{path}.{method}.tags` | `paths.{path}.{method}.tags` | 业务模块归类信号 |
| 鉴权方式 | `security` / `securitySchemes` | `securityDefinitions` | 鉴权类型（Bearer / API Key / Cookie） |
| 接口描述 | `summary` / `description` | `summary` / `description` | 用于生成注释 |

### 2.3 结构化接口清单（输出给用户确认）

解析完成后，输出如下清单（节选示例），作为阶段 3 确认的依据：

```
| 模块(tag) | 函数名(建议) | 方法 | 路径 | 入参 | 出参 | 鉴权 |
|-----------|-------------|------|------|------|------|------|
| 用户管理 | getUserList | GET | /api/user/list | query: page,size,keyword | UserListResp | Bearer |
| 用户管理 | createUser | POST | /api/user/create | body: CreateUserReq | UserVO | Bearer |
| 订单 | getOrderDetail | GET | /api/order/{id} | path: id | OrderDetailVO | Bearer |
```

> 若 Swagger 中存在 `tags`，优先用 tag 作为模块归类信号；无 tag 时按 path 第一段推断并标注「⚠️ 推断」，请用户确认。

---

## 三、项目既有接口定义模式探测

> **核心原则**：生成的接口定义必须与项目已有风格一致，而非套用通用模板。生成前必须先探测项目真实模式。

### 3.1 探测目标

| 探测项 | 说明 | 用途 |
|--------|------|------|
| 请求封装层 | 请求实例位置与导出的方法（如 `http.js` 导出 `get/post/del/axiosRequest`） | 生成的函数必须复用此封装，禁止裸调 axios/fetch |
| 模块组织方式 | 接口文件按什么维度归类（如 `modules/<Business>/`、`api/<module>.js`、单文件聚合） | 决定新接口落在哪个文件 |
| 命名约定 | 函数名风格（`getUserList` / `fetchUserList` / `userList`）、文件名（小驼峰 / kebab-case） | 生成的函数名/文件名与之对齐 |
| 出入参注释风格 | JSDoc 格式（`@param` / `@returns` / `@typedef`）、是否有 `@example` | 生成注释时复用既有格式 |
| 类型表达方式 | TS（`interface` / `type`）还是 JS（JSDoc `@typedef`） | 决定类型生成语法 |
| 响应解包约定 | 封装层是否已解包（返回 `res.data` 还是完整 response） | 影响出参类型标注 |
| 鉴权/拦截器 | token 注入方式（拦截器自动注入 / 手动传 header） | 避免生成重复鉴权代码 |

### 3.2 探测步骤

1. **定位请求封装层**：
   - 优先按 usage 文档 / 项目约定的已知路径（如 `src/utils/http/http.js`、`src/utils/request.ts`、`src/api/http.js`）。
   - 未知时用 `Glob` 搜索 `src/**/{http,request,http-client,api-client}.{js,ts}` 定位，读其导出。
2. **枚举既有接口模块**：
   - 用 `Glob` 搜索 `src/**/modules/**/*.{js,ts}` 或 `src/api/**/*.{js,ts}`，列出已有接口文件。
3. **采样既有文件**：
   - `Read` 1–2 个既有接口模块文件作为模式样本（优先选与本次生成同业务域的文件）。
   - 提取：函数签名、命名风格、JSDoc 格式、import 写法、类型定义位置。
4. **提取模式画像**：把探测结果整理为「模式画像」（见 3.3）。

> 若项目当前**无任何接口定义文件**（首次接入），跳过采样，按封装层导出的方法 + 通用最佳实践生成，并在模式画像中标注「首次接入，无既有样本」。

### 3.3 模式画像输出格式

探测完成后，输出「模式画像」供用户确认（阶段 3 人工 Gate）：

```
📋 项目接口定义模式画像

- 请求封装层：src/utils/http/http.js，导出 get / post / del / axiosRequest
- 模块组织：src/utils/http/modules/<Business>/<business>.js（按业务域分目录）
- 命名约定：函数名 getUserList（动词+资源+List/Detail）；文件名小驼峰
- 注释风格：JSDoc，@param {Type} name - 说明；@returns {Type} 说明；无 @example
- 类型方式：JavaScript（无 TS），用 @typedef 定义复杂类型，置于文件顶部
- 响应解包：封装层已解包 res.data.data，接口函数直接返回业务数据
- 鉴权：拦截器自动注入 Bearer token，接口函数无需手动传

⚠️ 待确认：
- 模块归类：Swagger tag 为「用户管理」，是否映射到 modules/User/user.js？
- 响应解包层级：样本中 getUserList 返回 { list, total }，但 Swagger 出参为 { code, data: { list, total } }，请确认封装层解包到哪一层。
```

> 模式画像中所有「⚠️ 待确认」项必须在阶段 3 由用户确认后才能生成，严禁自行假设。

---

## 四、接口定义生成规则

### 4.1 模块归类

- **有 `tags`**：按 tag 归类到对应业务模块目录。tag 含中文时映射为英文目录名（如「用户管理」→ `User`），并在模式画像中确认映射。
- **无 `tags`**：按 path 第一段推断（`/api/user/list` → `User`），标注「⚠️ 推断」请用户确认。
- **跨模块接口**：一个 operation 有多个 tag 时，归入主 tag（第一个），其余在注释中 `@see` 标注。

### 4.2 函数命名

按探测到的命名约定生成；若项目无既有样本，默认规则：

| HTTP 方法 | 命名模板 | 示例 |
|-----------|----------|------|
| GET（列表） | `get{Resource}List` | `getUserList` |
| GET（详情） | `get{Resource}Detail` | `getUserDetail` |
| GET（其他） | `get{Resource}{Action}` | `getUserPermissions` |
| POST（创建） | `create{Resource}` | `createUser` |
| POST（其他） | `{action}{Resource}` | `submitOrder` / `approveCommission` |
| PUT / PATCH | `update{Resource}` | `updateUser` |
| DELETE | `delete{Resource}` | `deleteUser` |

> 若项目既有命名与默认规则冲突，**以项目既有命名为准**，并在模式画像中记录偏离原因。

### 4.3 请求函数生成

生成的函数必须复用项目封装层，禁止裸调 axios / fetch：

```javascript
// Vue2 + JS 项目示例（复用 http.js 封装）
import { get, post } from '@/utils/http/http'

/**
 * 获取用户列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.size - 每页条数
 * @param {string} [params.keyword] - 搜索关键词
 * @returns {Promise<UserListResp>} 用户列表数据
 */
export function getUserList(params) {
  return get('/api/user/list', params)
}
```

### 4.4 出入参注释（JSDoc）

每个生成的接口函数必须有完整 JSDoc：

- `@param`：标注每个入参的类型与说明，可选参数用 `[name]`。
- `@returns`：标注返回类型（引用 `@typedef` 定义的类型）。
- 复杂类型用 `@typedef` 在文件顶部统一定义，不内联。

### 4.5 类型定义

- **TypeScript 项目**：从 `components/schemas`（或 `definitions`）生成 `interface`，置于类型文件或接口文件顶部。命名用 PascalCase，去掉无意义前缀（如 `UserVO` → 若项目习惯保留则保留）。
- **JavaScript 项目**：用 JSDoc `@typedef` 定义，置于接口文件顶部。

```javascript
// JS 项目类型定义示例
/**
 * @typedef {Object} UserVO
 * @property {number} id - 用户 ID
 * @property {string} name - 用户名
 * @property {string} [avatar] - 头像 URL
 * @property {0|1} status - 状态：0=禁用 1=启用
 */

/**
 * @typedef {Object} UserListResp
 * @property {UserVO[]} list - 用户列表
 * @property {number} total - 总数
 */
```

> schema 中的 `$ref` 引用（`#/components/schemas/UserVO`）必须解析为已定义的类型名，不保留 `$ref` 原文。循环引用（如树形结构 `children` 引用自身）用 `@typedef {Object} TreeNode` + `@property {TreeNode[]} [children]` 处理。

### 4.6 生成模板（按技术栈）

| 技术栈 | 封装层复用 | 类型表达 | 文件位置 |
|--------|-----------|----------|----------|
| Vue2 + JS | `import { get, post, del } from '@/utils/http/http'` | JSDoc `@typedef` | `src/utils/http/modules/<Business>/<business>.js` |
| Vue3 + TS | `import { request } from '@/utils/request'` | `interface` / `type` | `src/api/<module>.ts` |
| React + TS | `import { request } from '@/utils/request'` | `interface` / `type` | `src/api/<module>.ts` |
| 小程序 | 项目封装的 `wxRequest` / `http` | JSDoc / TS | `src/api/<module>.js` |

> 实际生成以**阶段 2 探测到的项目模式为准**，上表仅作无样本时的默认。技术栈判定由 SKILL.md 意图解读阶段完成并传入。

---

## 五、增量更新与冲突处理

当项目已有接口定义、Swagger 更新后需增量同步时：

| 场景 | 处理策略 |
|------|----------|
| Swagger 新增接口 | 追加到对应模块文件，不改动已有函数 |
| Swagger 修改接口（入参/出参变更） | 更新对应函数 + 类型定义，在 delta 说明中列出变更项 |
| Swagger 删除接口 | **不自动删除**前端函数，在 delta 说明中标注「⚠️ Swagger 已移除，请确认是否删除前端定义」 |
| 前端手写扩展（Swagger 没有的额外参数/逻辑） | 保留手写部分，仅同步 Swagger 契约部分，不覆盖 |
| 命名冲突（Swagger 新接口与已有函数同名） | 停止并询问，给出改名建议 |

### 5.1 delta 说明格式

增量更新完成后输出变更说明：

```
📋 接口定义增量更新 delta

新增（3）：
- modules/User/user.js → getUserPermissions(params)
- modules/Order/order.js → getOrderDetail(id)

修改（1）：
- modules/User/user.js → createUser：入参新增 phone 字段（string，必填）

Swagger 已移除（1）：
- modules/User/user.js → legacyGetUser：⚠️ Swagger 已移除，请确认是否删除前端定义

未改动（12）：略
```

> 增量更新必须在阶段 3 确认映射后执行，不整文件覆盖。

---

## 六、鉴权与拦截器

- 探测封装层是否已有**拦截器自动注入 token**（如 axios 请求拦截器添加 `Authorization: Bearer`）。
- 若已有：生成的接口函数**不重复传鉴权 header**。
- 若无：在模式画像中标注「⚠️ 项目无统一鉴权拦截器，是否需要为生成的接口手动传 token？」请用户确认。
- Swagger 中 `securitySchemes` 标注的鉴权方式仅作参考，**实际以项目封装层约定为准**。

---

## 七、质量校验清单

生成完成后逐项校验：

- [ ] 所有函数复用项目封装层（`http.js` / `request`），无裸调 axios / fetch
- [ ] 模块归类与项目既有目录结构一致（探测到的 `modules/<Business>/` 等）
- [ ] 函数命名与项目既有约定一致（动词+资源等）
- [ ] 每个函数有完整 JSDoc：`@param`（含类型+说明）、`@returns`（含类型）
- [ ] 复杂类型用 `@typedef`（JS）或 `interface`（TS）统一定义，命名 PascalCase
- [ ] schema `$ref` 已解析为类型名，无 `$ref` 原文残留
- [ ] 响应解包层级与封装层约定一致（确认到 `res.data` 还是 `res.data.data`）
- [ ] 未重复实现鉴权（拦截器已有则不手动传）
- [ ] 增量更新未破坏手写扩展
- [ ] 无 `any` 类型（TS 项目） / 无未标注类型的参数（JS 项目）
- [ ] 枚举字段（如 status: 0/1）在注释中标注含义

---

## 八、边界与不确定处理

### 8.1 必须停止并询问的场景

| 场景 | 处理 |
|------|------|
| Swagger 文档无法获取或解析失败 | 停止，请用户提供文件路径 / URL / 截图 |
| Swagger 缺少 `responses` 或出参 schema | 标注「⚠️ 出参未知」，请用户补充，不臆造返回结构 |
| schema 字段类型为 `object` 但无 properties | 询问字段结构，不生成空类型 |
| 命名冲突（新接口与已有函数同名） | 停止，给出改名建议请用户选择 |
| 响应解包层级无法从样本确定 | 询问封装层解包到哪一层，不假设 |
| 模块归类歧义（无 tag 且 path 多义） | 给出两种归类方案请用户选择 |
| 鉴权方式与项目封装层不一致 | 询问以哪个为准 |

### 8.2 严禁猜测的内容

- 接口的实际返回结构（Swagger 标注 `object` 但无字段定义时）
- 字段的真实业务含义（仅用 Swagger `description`，不自行赋义）
- 响应解包层级（必须从封装层 / 既有样本确认）
- 枚举值的业务含义（Swagger 未标注时询问，不脑补）
- 鉴权注入方式（以项目封装层为准，不按 Swagger 猜）

### 8.3 标准话术

```
📋 需要确认以下信息才能继续生成接口定义：

1. [响应解包层级]
   当前可观察：封装层 http.js 的 get() 返回 Promise，样本 getUserList 返回 { list, total }
   需要确认：封装层是否已解包到 res.data.data？还是返回完整 { code, message, data }？
   可选方案：
   - A) 已解包到 data 层，函数直接返回业务数据
   - B) 未解包，函数返回完整 response，由调用方取 .data

请逐个确认，我将据此生成接口定义。
```

---

## 九、协作关系

```
[本 skill] Swagger → 前端接口定义（函数 + 类型 + JSDoc）
      │
      ├── 上游 ① prototype-to-openspec-prd：PRD 的 tasks.md 可引用接口契约，本 skill 的接口清单可反哺 PRD
      ├── 下游 ② frontend-engineering-standards（第二章 API 集成）：本 skill 产出的接口函数供其调用，三态/防竞态/Composable 在该章实现
      └── 下游 ③ figma-design-constraint：本 skill 的出参类型为设计稿数据字段还原提供字段来源
```

协作约定：

- 与 `references/prototype-to-openspec-prd.md` **不重叠**：后者管「需求与规范」，本规则集管「接口定义代码生成」。PRD 中标注的接口契约可作为本规则集的补充输入。
- 与 `references/frontend-engineering-standards.md` **不重叠**：后者管「请求调用规范」（三态/防竞态/错误码），本规则集只生成「接口定义本身」（函数 + 类型 + 注释），不实现业务调用逻辑。
- 与 `references/figma-design-constraint.md` **互补**：设计稿中的数据字段（列表/表格列）应与本规则集生成的出参类型字段对齐；字段不一致时以 Swagger 契约为准并标注差异。

---

## 十、生成后人工 Gate（对应主流程 ⑦c，gateChecks.apiConfirmed）

生成完成后，必须暂停并提示用户验收（多 agent 模式下由编排器经 `set-fw-gate.cjs` 置位 `apiConfirmed` 后 advance 离开 phase 6）：

```
【人工 Gate · 接口定义生成】
- 当前阶段：Swagger → 接口定义生成
- 待确认产物：
  - src/utils/http/modules/User/user.js（新增 3 个函数）
  - src/utils/http/modules/Order/order.js（新增 2 个函数，修改 1 个）
- 质量校验：第七章清单 11/11 通过
- delta 说明：新增 5 / 修改 1 / Swagger 已移除 1（待确认）
- 请确认：[通过] / [返工] / [调整映射]
```

未经用户确认，不进入下游业务逻辑实现阶段。
