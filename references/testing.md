# 前端测试能力（3.5，正式规则）

> 定位：测试为**主流程可选环节**，插在 ⑨（生成业务逻辑）→ ⑩（检查/终验）之间，由 `test-engineer` 执行（多 agent 模式下由编排器按需 dispatch，用例审阅为**内嵌人工 Gate**，不占状态机 phase）。
> 触发：用户要求"写单测 / 组件测试 / E2E / 视觉回归 / 生成测试用例"，或在本工作流的 ⑨→⑩ 之间插入自动化测试环节时，先 Read 本文件。
> 执行层工具随本 skill 提供：`scripts/testing/with_server.py`（服务器编排）与 `scripts/testing/examples/`（Playwright 示例）。本 skill 不引入任何 npm 运行时依赖；`playwright` 等为目标项目 devDependency。

---

## 章节索引

- 一、测试策略与工具选型
- 二、测试用例生成（两段式：文档 → Gate → 代码）
- 三、单元测试规范
- 四、组件测试规范
- 五、E2E 测试规范（Playwright 执行层）
- 六、视觉回归测试
- 七、完成前验证铁律（指针 → cross-cutting.md）
- 八、QA Checklist
- 九、边界情况与不确定处理
- 十、与其他章节的关系

---

## 一、测试策略与工具选型

### 1.1 四类测试的适用范围

| 类型 | 工具方向 | 覆盖范围 | 典型产物 |
|------|----------|----------|----------|
| 单元测试（Unit） | Vitest / Jest | 纯函数、工具函数、Store action、composable、computed 逻辑 | `*.spec.ts` / `*.spec.js` |
| 组件测试（Component） | Testing Library / @vue/test-utils / Cypress Component | 渲染结果、交互行为、props/events/插槽、可访问性断言 | `*.spec.ts` / `*.spec.js` |
| 端到端测试（E2E） | Playwright（Python 脚本，见第五章） | 关键业务流程（登录、下单、审批等）、跨页面流转 | `e2e/tc-xx-<slug>.py` |
| 视觉回归 | Playwright 截图对比（项目已配 Chromatic/Percy 则优先用之） | 像素级视觉差异捕获，与 `references/figma-design-constraint.md` 的还原验收互补 | 基线图 + diff 报告 |

### 1.2 选型与范围决策

- **优先复用项目既有测试栈**：先读目标项目 `package.json`（devDependencies 中 jest/vitest/@vue/test-utils/@testing-library/playwright 等）与既有 `*.spec.*` 风格，**按项目既有约定生成，不强行引入新框架**。
- **技术栈适配**：Skill 默认写法为 Vue3+TS（Vitest + @vue/test-utils + Testing Library）；Vue2.6+JS 等项目写法映射见 `frontend-workflow-usage.md`。
- **范围控制**：优先覆盖业务文档中标记为关键路径 / 主流程的 Requirement 与 Scenario；**不为覆盖率凑用例**——无业务依据的用例宁可不写，覆盖缺口在产出报告中显式声明。
- **各类型取舍**：纯逻辑（格式化/校验/状态机）→ 单元；含交互的 UI 块 → 组件；跨页面业务流 → E2E；还原度验收 → 视觉回归。

---

## 二、测试用例生成（两段式：文档 → Gate → 代码）

> **两段式硬约束**：先产出 Markdown 用例文档并经**人工 Gate 审阅**，确认后才生成可执行测试代码。禁止跳过用例审阅直接写测试代码。

### 2.1 输入源

| 输入 | 取用内容 |
|------|----------|
| OpenSpec specs | `Requirement` / `Scenario`（GIVEN/WHEN/THEN）→ 用例主来源 |
| fw_dev_spec 活文档 | 五模块中「需求功能模块设计」的验收点与「分步开发计划」的模块拆分 |
| 原型 `.md` / Figma 原型 | 无 Scenario 时按交互点推导（见第九章边界处理） |
| Swagger 接口定义 / `api-definition-generation.md` 产物 | 接口层用例（入参校验、错误码、边界值） |

### 2.2 用例文档落位与格式

**落位**（按项目业务文档方案二选一，均无则放项目 `test-cases/<feature>.md`）：
- fw_dev_spec 项目：`fw_dev_spec/<需求名-日期>/specs/测试用例.md`
- OpenSpec 项目：`openspec/changes/<change-id>/测试用例.md`

**格式**：

```markdown
# 测试用例：<需求名>
> 来源：<业务文档路径>　生成日期：YYYY-MM-DD　范围：<模块/页面>

## 覆盖矩阵
| Scenario/验收点 | 用例编号 | 优先级 | 状态 |
|----------------|---------|--------|------|
| spec.md · Requirement 1 · Scenario 2 | TC-03 | P0 | ⬜ |

## 用例表
### TC-01 <用例标题>（<单元/组件/E2E/视觉>）
- 优先级：P0｜回溯锚点：<Scenario 或活文档锚点>｜状态：⬜（⬜未执行 🔄进行中 ✅通过 ❌失败）
- 前置条件：
- 步骤：
- 预期结果：
```

进度标记复用 `references/tapd-plan-template.md` 的 ⬜/🔄/✅/⏭ 约定（❌ 表示执行失败待修复）。

### 2.3 用例设计规则

1. **全量映射**：每条 Scenario ≥ 1 条用例；GIVEN → 前置条件、WHEN → 步骤、THEN → 预期结果逐段映射，不凭空新增验收点。
2. **边界与异常必含**：空态、边界值、错误分支、并发/重复提交、权限不足——主流程之外至少覆盖一条异常路径。
3. **优先级定义**：P0 = 关键路径 / 资损 / 权限；P1 = 主流程分支；P2 = 边界与异常细节。
4. **可执行性**：每条用例的步骤与预期必须落到可观察的 UI/DOM/接口行为，不写"应正常工作"类模糊预期。
5. **锚点回溯**：每条用例必须标注来源锚点（Scenario 编号 / 活文档章节），保证需求 ↔ 用例双向可追溯。

### 2.4 人工 Gate（内嵌，同 ⑤a 模式）

用例文档生成后**必须暂停**，向用户展示：

```
【人工 Gate · 测试用例审阅】
- 用例文档：<路径>
- 用例统计：共 N 条（P0 x / P1 y / P2 z），四类分布：单元 a / 组件 b / E2E c / 视觉 d
- 覆盖情况：<全部 Scenario 已覆盖 / 未覆盖清单及原因>
- 建议：➡️ <推荐结论，如"覆盖完整、优先级分布合理，建议通过"或"建议补 XX 异常用例后通过">（格式见 references/grilling.md 三）
- 请确认：[通过，继续生成代码] / [调整用例] / [返工]
```

> 用例设计阶段的范围/框架取舍等决策，按 `references/grilling.md` 全局追问协议执行（frontier 轮次 + 推荐答案）。

确认前不得生成可执行测试代码；多 agent 模式下由编排器持有该 Gate（不调用 `set-fw-gate.cjs`，属角色流程内嵌 Gate，不占 phase）。

### 2.5 代码生成与执行回写

- Gate 通过后按用例的「类型 + 技术栈」生成代码：单元/组件测试按第三章/第四章规范；E2E 按第五章 Playwright 执行层。
- 执行后**回写用例文档状态**（✅/❌/⏭）；❌ 用例需定位是**代码缺陷**（回业务代码修复，可触发 ⑩ 回流）还是**用例错误**（修订用例），逐条记录处置结论。

---

## 三、单元测试规范

- **文件位置与命名**：跟随项目既有惯例（同目录 `__tests__/` 或 `.spec.ts` 后缀）；无惯例时按 `源文件同名 + .spec` 就近放置。
- **结构**：`describe(<被测单元>) → it(<行为描述>)`；it 描述用"行为 + 预期"自然语言（如"金额为 0 时返回 '0.00'"），不用实现细节命名。
- **断言风格**：AAA（Arrange-Act-Assert）分段；断言具体值而非 `expect(result).toBeTruthy()` 类恒真断言。
- **Mock 策略**：API 层 mock 网络（拦截 fetch/axios 实例）；时间用 fake timers；**不 mock 被测函数内部私有实现**。
- **禁测实现细节**：只测公开行为（输入→输出、状态变化、事件），重构实现不破坏用例为合格标准。

## 四、组件测试规范

- **用户视角优先**：优先 Testing Library 的 `getByRole`/`getByText`/`getByLabelText` 查询，DOM 结构选择器为次选。
- **覆盖面**：渲染快照（关键状态，非全量）、props → 渲染映射、事件触发（click/input/submit）、异步行为（`waitFor` / `flushPromises`）、插槽与 v-model 双向绑定。
- **异步**：接口 mock 后必须等待异步更新完成再断言，禁止 `sleep` 凑时序。
- **可访问性**：交互元素断言 `role`/`aria-*`（与 `figma-design-constraint.md` 的 a11y 要求一致）。

## 五、E2E 测试规范（Playwright 执行层）

### 5.1 工具与决策树

执行层脚本位于 `scripts/testing/`（随 skill 安装）：
- `with_server.py` —— 服务器生命周期编排（支持多 server）
- `examples/` —— element_discovery.py（元素发现）/ static_html_automation.py（静态页）/ console_logging.py（console 捕获）

```
测试任务 → 是静态 HTML？
    ├─ 是 → 直接读 HTML 确定 selector → 写 Playwright 脚本
    └─ 否（动态应用）→ server 已在运行？
        ├─ 否 → python scripts/testing/with_server.py --help 后用 helper 编排
        └─ 是 → 侦察后行动（见 5.2）
```

**脚本黑盒原则**：先 `--help` 看用法再调用，**不读 with_server.py 源码**（脚本较大，避免污染上下文）。

### 5.2 侦察后行动模式（动态应用）

1. `goto` 后**必须先 `page.wait_for_load_state('networkidle')`**（不等就探查 DOM 是最高频错误）；
2. 侦察：截图（`full_page=True`）+ `page.content()` + locator 探查；
3. 从渲染结果识别 selector（优先 `text=` / `role=` / 语义化 id）；
4. 再执行动作与断言。

### 5.3 with_server.py 用法（先 --help）

```bash
# 单 server
python scripts/testing/with_server.py --server "npm run dev" --port 5173 -- python e2e/tc-01-login.py
# 多 server（后端 + 前端）
python scripts/testing/with_server.py \
  --server "cd backend && python server.py" --port 3000 \
  --server "cd frontend && npm run dev" --port 5173 \
  -- python e2e/tc-01-login.py
```

自动化脚本只写 Playwright 逻辑（server 由 helper 拉起），模板：

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)  # 固定 headless chromium
    page = browser.new_page()
    page.goto('http://localhost:5173')
    page.wait_for_load_state('networkidle')      # 关键：等 JS 执行完
    # ... 用例步骤与断言
    browser.close()
```

### 5.4 用例 ↔ 脚本映射

- 一条 E2E 用例 = 一个脚本（或脚本内一个具名函数），命名 `e2e/tc-<编号>-<slug>.py`，与用例文档编号一一对应；
- 环境地址（base URL）从参数/环境变量读取，**不硬编码**；
- 失败时输出：截图 + console 日志（参考 `examples/console_logging.py`）+ 失败断言上下文。

## 六、视觉回归测试

- **优先项目已有方案**（Chromatic / Percy / Storybook 截图）；无则用 Playwright `page.screenshot()` + 基线对比。
- **基线目录约定**：`e2e/__screenshots__/<用例编号>/`；基线图入库，diff 图只作报告产物。
- **判定**：像素 diff 超阈值（默认 1%）即偏差，按 SKILL.md 2.3 的偏差报告格式落盘，规则来源标注本文件第六章。
- 与 `figma-design-constraint.md` 第十章 QA Checklist 互补：静态还原用其清单人工审，视觉回归是后续回归的自动化守门员。

## 七、完成前验证铁律（全工作流）

**权威定义见 `references/cross-cutting.md`「完成前验证铁律」章节**，本文件只强调测试场景要点：

- 未经**本消息内**的测试命令输出（0 failed / exit 0），不得宣称"测试通过 / 已修复"；
- 回归测试须完成 **Red-Green 验证**（写 → 过 → 还原修复 → 必须挂 → 恢复 → 过），只跑一次通过不算回归用例成立；
- 跳过的用例必须在用例文档显式标注 ⏭ 与原因，静默跳过视为未验证。

## 八、QA Checklist

**用例文档**：
- [ ] 每条 Scenario / 验收点均有映射用例，覆盖矩阵完整
- [ ] 含边界与异常用例（空态 / 边界值 / 错误分支 / 权限）
- [ ] 优先级符合 2.3 定义；每条用例有来源锚点
- [ ] 已通过人工 Gate 审阅

**测试代码**：
- [ ] 按项目既有测试栈与命名惯例生成（已对照 package.json / 既有 spec）
- [ ] 无硬编码环境 URL / 无敏感信息；mock 完备且不 mock 被测内部实现
- [ ] 断言具体、非恒真；异步等待明确（waitFor / networkidle）
- [ ] E2E 脚本与用例编号一一对应

**执行与回写**：
- [ ] 有新鲜的命令输出证据（见第七章铁律）方可标记 ✅
- [ ] ❌ 用例已定位（代码缺陷 vs 用例错误）并记录处置
- [ ] 用例文档状态已回写；覆盖缺口已声明

## 九、边界情况与不确定处理

| 情况 | 处理 |
|------|------|
| 业务文档无 Scenario / 验收点 | 停下向用户确认测试范围；或从原型交互点推导用例，并在用例文档头部标注"推导来源 + 假设" |
| 项目无测试框架 | 询问用户是否引入；`npm install` 属敏感操作（见 cross-cutting.md 二），须用户确认后执行 |
| 本地无法启动被测服务 | 询问是否有可用的 dev / 部署环境；否则降级为静态检查 + 单元/组件层，E2E 标 ⏭ 说明原因 |
| 后端未就绪 | E2E 用 Playwright 网络拦截 mock 接口响应，用例文档标注"mock 数据" |
| 时间紧 / 只需冒烟 | 只生成并执行 P0 用例，在报告中显式声明未覆盖范围 |

## 十、与其他章节的关系

- 与 `references/figma-design-constraint.md`：视觉回归是"像素级还原"的自动化守门员（见第六章）。
- 与 `references/frontend-engineering-standards.md`：单元 / 组件测试覆盖其"类型安全 / API 集成 / 状态管理"等工程约束；测试代码同样遵守其工程规范与 cross-cutting 安全硬约束。
- 与 `references/prototype-to-openspec-prd.md` / `references/fw-dev-spec.md`：E2E / 用例可回溯其 Requirement/Scenario 或活文档锚点（见 2.3）。
- 与 `references/api-definition-generation.md`：接口定义产物为接口层用例（入参校验 / 错误码）提供契约依据。
- 与 `references/cross-cutting.md`：完成前验证铁律、敏感操作清单（执行 npm test / playwright 前须询问）均以该文件为权威。
- 与 `references/tapd-bugfix-workflow.md`：缺陷修复的"验证后更新状态"步骤受第七章铁律约束。
