# Changelog

本文件记录 `frontend-workflow` skill 的版本变更历史，按时间倒序排列。

**维护约定**：
- 版本号唯一来源为 `SKILL.md` 的 YAML frontmatter `version` 字段（语义化版本 `MAJOR.MINOR.PATCH`）。
- 每次改动后：在 `SKILL.md` 递增 `version`，并在本文件顶部新增对应 `[x.y.z] - YYYY-MM-DD` 条目。
- `README.md` 顶部的版本号展示需与 `SKILL.md` 保持同步（仅展示，不另立来源）。
- 变更类型：新增（Added）/ 修改（Changed）/ 修复（Fixed）。

---

## [1.1.0] - 2026-07-27

### Added
- 开发计划活文档（`fw-dev-spec`）新增可选的「OpenSpec 关联模式」：单向同步活文档到 OpenSpec，并建立双向锚点（`fw_dev_spec ↔ OpenSpec change`）。
- 新增同步钩子脚本 `scripts/sync-fw-openspec.cjs`，支持 `init` / `sync` / `check` 子命令。
- `fw-dev-spec.md` 新增第九章「OpenSpec 关联模式」规则与关联文档说明。
- 提示词模板新增 `10-活文档关联OpenSpec.md`（单/多 Agent 模式），覆盖关联模式触发与同步流程。
- `SKILL.md` / `README.md` 路由与索引补充 OpenSpec 关联相关触发词与章节指针。

---

## [1.0.0] - 2026-07-20

初始基线版本，汇总合并后的统一前端开发工作流能力：

### Added
- **Figma 还原约束**（`references/figma-design-constraint.md`）：像素级还原、Design Token、节点映射、a11y、资源导出、QA Checklist。
- **原型（Figma / .md）→ OpenSpec PRD**（`references/prototype-to-openspec-prd.md`）：需求规范生成与拆解策略。
- **前端工程通用规范**（`references/frontend-engineering-standards.md`）：类型安全 / API 集成 / 状态管理 / 安全约束 / 性能优化 / 注释文档 / AI 不确定时处理；第〇章业务文档接入与前置编排。
- **Swagger → 接口定义生成**（`references/api-definition-generation.md`）：Swagger/open.json → 前端接口定义（函数 + 类型 + JSDoc），自动探测项目既有接口模式。
- **测试能力（占位）**（`references/testing.md`）：单元 / 组件 / E2E / 视觉回归骨架，规则待扩展。
- **TAPD 缺陷修复（独立分支）**（`references/tapd-bugfix-workflow.md` 及 `tapd-tool-params.md` / `tapd-grouping-rules.md` / `tapd-plan-template.md`）：提取 workspace_id → 读筛选缺陷 → 生成活文档计划 → 执行修复/发评论 → 验证后更新状态。
- **开发计划活文档（独立分支，3.2 替代）**（`references/fw-dev-spec.md`）：原型 → 本地分层活文档（`fw_dev_spec/<需求名-日期>/`），五模块统一规范、单/多文档询问。
- **多 agent 编排（可选模式）**（`references/multi-agent-orchestration.md` 与 `.agents/` 8 个角色）：编排器按阶段 spawn 专职 agent，状态机门控推进、人工 Gate 统一管理、敏感操作统一询问。
- 多 agent 状态机脚本：`scripts/create-fw-workflow.cjs`、`validate-fw-phase-gate.cjs`、`advance-fw-phase.cjs`、`rollback-fw-phase.cjs`、`workflow-state-utils.cjs`、`extract_workspace_id.py`。
- 用户侧入口：`技能使用提示词模板/`（单/多 Agent 模式模板）与 `frontend-workflow-usage.md` 项目适配手册。
- 单一入口路由层 `SKILL.md`（触发描述 + 意图解读 + 阶段调度 + 章节索引）。
