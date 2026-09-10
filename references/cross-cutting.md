# 横切约束共享块（安全硬约束 + 敏感操作清单）

> 本文件是 frontend-workflow 各 `.agents/` 角色文件与编排协议的**共享引用**，用于消除"安全硬约束 / 敏感操作清单"在 7+ 处复制导致的漂移。
> 权威定义来源：`references/multi-agent-orchestration.md` §六（敏感操作统一询问清单）、§七（横切安全硬约束注入）、`references/frontend-engineering-standards.md` 第四章（安全规则正文）。
> 使用约定：各角色文件只保留一行指针"遵守 `references/cross-cutting.md`"，不再内联复制；本文件变更时同步登记 CHANGELOG。

---

## 一、横切安全硬约束（生成类 agent 必须遵守）

适用：figma-restorer / frontend-implementer / tapd-bugfixer 的修复步骤，以及任何生成前端代码的环节。无论设计稿 / 需求是否体现均须遵守：

- **XSS**：禁用 `v-html`/`innerHTML` 渲染未净化内容；富文本用项目认可的净化方案（如 DOMPurify）；URL 必须验证（禁 `javascript:`/`data:`）。
- **输入校验**：所有用户输入须校验/转义；前端验证仅作体验层，后端仍需独立验证。
- **敏感信息**：Token / 密钥 / 密码 / 个人信息不得硬编码（走 `.env`）；不得泄露到日志、console 或前端产物；接口 URL 不拼接敏感参数。

依据：`references/frontend-engineering-standards.md` 第四章（4.1 XSS 防护 / 4.2 输入验证 / 4.3 敏感信息保护）。

## 二、敏感操作统一询问清单（任何 agent 执行前必须暂停询问）

遵循"**默认不限制工具，敏感操作前统一询问用户**"原则。以下操作任何 agent 执行前**必须暂停并询问用户确认**，不得自动执行：

| 类别 | 操作 |
|------|------|
| Git | `git add` / `git commit` / `git push` / 创建分支 / MR |
| 文件破坏 | 删除文件 / 整文件覆盖写 / 批量替换（影响 >3 个文件） |
| TAPD 写操作 | `update_bug`（状态变更）/ `create_comments`（发评论 @人） |
| 命令执行 | `npm` / `npx` 脚本（install / lint --fix / build / test）、其他有副作用的 shell 命令 |
| 部署 | 任何构建、发布、云端部署触发 |

- 询问时须说明：**要做什么、影响哪些文件/对象、是否可逆**。用户确认后方可执行。
- 职责分工：编排器持有最终询问职责；各 agent 遇敏感操作**先上报编排器**，由编排器统一向用户询问，不得自行执行。

## 三、完成前验证铁律（全角色硬约束）

> 整合自 verification-before-completion：**任何角色在宣称"完成 / 通过 / 已修复"之前，必须持有新鲜的验证证据**。违反字面即违反精神。

**Iron Law**：`NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE` —— 验证命令不在**本次执行中**跑过，就无权断言其通过。

**Gate 函数（断言前依次执行，缺一步即视为撒谎而非验证）**：

```
1. IDENTIFY：什么命令/输出能证明这个断言？
2. RUN：完整、新鲜地执行该命令（不许引用旧结果或"应该能过"）
3. READ：读完整输出、检查退出码、数清失败数
4. VERIFY：输出是否支撑断言？不支撑 → 如实报告现状
5. THEN：带证据下结论
```

**断言 vs 所需证据（不充分的反例）**：

| 断言 | 所需证据 | 不充分 |
|------|----------|--------|
| 测试通过 | 测试命令输出 0 failures | 上次结果、"应该能过" |
| Lint 干净 / 构建成功 | 命令 0 errors / exit 0 | 局部检查、日志"看起来正常" |
| Bug 已修复 | 原症状复测通过 | 只改了代码、想当然 |
| 回归用例成立 | Red-Green 验证（还原修复后必须挂） | 只通过一次 |
| Agent 报告成功 | VCS diff / 独立复核 | 轻信 agent 自述 |
| 需求满足 | 逐条对照 checklist | 仅"测试通过" |

**Red Flags（出现即停）**：使用"应该 / 大概 / 看起来"；验证前表达满意（"完美！""搞定！"）；提交/推送/PR 前未验证；部分验证当全部；"就这一次"。

**豁免与降级**：确实无法本地验证的场景（如后端未就绪、无 dev 环境），结论只能写"**待验证**"并列出验证步骤，不得写成"已完成"。

## 四、只读检查语义白名单（qa-reviewer 专用）

qa-reviewer（③⑥⑩）为只读角色，工具白名单按**语义**定义，编排器 spawn 时按宿主映射为实际工具名（映射表见 `references/multi-agent-orchestration.md` §8.1）：

- 允许：读文件 / 文件搜索 / 内容搜索 / 目录列举
- 允许：命令执行工具，仅限只读命令（lint、grep、cat、tsc --noEmit、npm run lint 等）
- 禁止：任何写文件 / 替换内容 / 删除文件工具；命令执行中的任何写操作（rm、git commit、npm install 写入等）
- 偏差与修复建议只能回传给编排器（由编排器落盘为偏差报告），不得自行修改源码
