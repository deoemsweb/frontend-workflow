# 横切约束共享块（安全硬约束 + 进程回收 + 验证铁律 + 敏感操作清单）

> 本文件是 frontend-workflow 各 `.agents/` 角色文件与编排协议的**共享引用**，用于消除"安全硬约束 / 进程回收 / 验证铁律 / 敏感操作清单"在多处复制导致的漂移。
> 权威定义来源：`references/multi-agent-orchestration.md` §六（敏感操作统一询问清单）、§七（横切安全硬约束注入）、`references/frontend-engineering-standards.md` 第四章（安全规则正文）、本文件第五章（进程生命周期，实现见 `scripts/fw-process.cjs`）。
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
| 长驻进程 | 启动 dev server / preview / mock server / 后台命令（**启动须询问**）；回收动作（`cleanup`）属强制收尾，必须执行、不需再次询问 |
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

## 五、进程生命周期与资源回收（全角色硬约束）

> **背景**：本地自测（dev server / preview / mock server / 静态服务）若以「后台启动」方式拉起且结束后不回收，会持续占用端口与 CPU/内存；更危险的是**下次自测连到旧进程**，代码没生效却显示"通过"，形成假绿。Windows 上 `terminate()` 只杀 `cmd`/shell，`node` 子进程会残留占住端口，是最常见的泄漏形态。
>
> **权威实现**：`scripts/fw-process.cjs`（登记/校验/回收）+ `scripts/testing/with_server.py`（受控启动，自带回收）。

### 5.1 生命周期契约（四步，缺一不可）

```
register（启动前登记端口+命令） → 启动并确认端口监听 → register（补 PID） → 执行自测/验证 → cleanup（回收 + 校验端口释放）
```

| 步骤 | 要求 | 命令 |
|------|------|------|
| 登记 | 启动**前**登记端口 + 命令；启动后**再次 `register` 同一端口补 PID**（脚本会自动反查并更新原条目） | `node scripts/fw-process.cjs register <任务名> --port <端口> --cmd "<命令>"` |
| 启动 | 优先受控启动器；多实例禁止同端口 | `python scripts/testing/with_server.py --server "<cmd>" --port <端口> -- <测试命令>` |
| 回收 | 用例结束 / 阶段收尾 / Gate 通过后 / 工作流收尾，**任一发生即回收** | `node scripts/fw-process.cjs cleanup <任务名>` |
| 校验 | 回收后必须确认端口已释放（不能只看 kill 返回码） | `node scripts/fw-process.cjs check <任务名>` |

### 5.2 禁止事项

1. **禁止裸后台启动**：`Start-Process` / `nohup … &` / `cmd /c start` / `&` 后台运算符 / `subprocess.Popen(shell=True)` 直接跑 dev server 而不登记。
2. **禁止同端口重复启动**：启动前必须预检；端口已占用时先判断是否本任务残留 → 回收，不得直接再启一个。
3. **禁止把「进程还在跑」当作交付状态**：不得在收尾结论中遗留 dev server / preview / 浏览器调试端口。
4. **禁止用「kill 返回 0」代替验证**：必须实际探测端口（`with_server.py` 已内置；手工场景用 `fw-process check`）。
5. **禁止跨任务复用未登记进程**：来源不明的监听端口不得直接用来做验证（可能跑的是旧代码）。

### 5.3 强制回收点（必须执行，不可延后）

| 时点 | 动作 |
|------|------|
| E2E / 用例执行结束（成功、失败、异常、Ctrl+C 均含） | `cleanup`；`with_server.py` 的 `finally` 已自动处理 |
| ⑩ 检查 / ⑪ 人工验收前 | `check` 必须 pass，残留先 `cleanup` |
| `finish-fw-workflow.cjs` 收尾 | 脚本默认阻断残留；确需保留传 `--allow-residual-processes` |
| 会话结束 / 用户中断 | `cleanup --all-tasks` 兜底清理本机所有本 skill 登记的进程 |

```bash
node scripts/fw-process.cjs check   <任务名>          # 残留校验（0=无残留，1=有残留）
node scripts/fw-process.cjs cleanup <任务名>          # 回收本任务全部登记进程并校验端口
node scripts/fw-process.cjs cleanup <任务名> --dry-run # 只打印将终止的 PID
node scripts/fw-process.cjs cleanup <任务名> --all-tasks # 跨任务兜底清理
```

### 5.4 异常与降级

- **登记时反查不到 PID**：仍可登记，`cleanup` 会按端口兜底回收；须在结论中说明该端口由本任务独占。
- **回收失败**（端口仍被占用）：不得静默通过，必须向用户报告 `端口 / PID / 命令` 清单并请求人工处理。
- **端口被非本任务进程占用**：不直接杀，改用其他空闲端口并在结论中记录冲突。
- **无法回收又必须结束时**：只能标记「待清理」，不得宣称"已完成 / 已验证"。

> 任何角色（含只读的 qa-reviewer）都可以执行 `check`（只读探测）；`cleanup` 属强制收尾动作，不需要再向用户二次确认，但必须在结论中报告回收结果。
