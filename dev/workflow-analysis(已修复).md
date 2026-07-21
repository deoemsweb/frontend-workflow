# frontend-workflow-skills 多Skills工作流分析报告

> 分析日期：2026-07-21  
> 分析范围：`frontend-workflow-skills/` 完整代码库（SKILL.md、.agents/、references/、scripts/）

---

## 一、架构优点

### 1.1 分层设计清晰合理

项目采用**路由层 + 领域规则层 + 角色定义层 + 状态机层**四层架构：

| 层级 | 文件/目录 | 职责 | 优点 |
|------|----------|------|------|
| **路由层** | `SKILL.md` | 意图解读、阶段调度、上下文编排 | 轻量单一入口，一次安装 |
| **领域规则层** | `references/` | Figma还原约束、工程规范、PRD生成规则等 | 懒加载按需读取，避免上下文臃肿 |
| **角色定义层** | `.agents/` | 8个专职agent角色 | 职责单一，专注特定领域 |
| **状态机层** | `scripts/` | 状态文件管理、门控校验、阶段推进 | AI做认知判断，脚本做确定性校验 |

### 1.2 双模式兼容设计

支持**单agent顺序执行**（默认）和**多agent编排**（可选）两种模式：
- 单阶段任务（如只做Figma还原）无需复杂调度，直接执行
- 端到端全流程启用多agent，各司其职
- 两种模式共享同一套reference规则，无重复维护成本

### 1.3 人工Gate与检查循环保障质量

- **7个人工Gate**（④⑤a⑦⑦c⑧a⑪⑫）确保关键节点用户确认
- **3次回流上限**防止无限循环
- **qa-reviewer只读检查**避免检查者自行修改导致的质量盲区
- **结构化偏差报告**格式统一，便于定位修复

### 1.4 独立分支设计合理

- **TAPD缺陷修复**（3.6）作为独立生命周期，不进入主流程
- **开发计划活文档**（3.7）作为OpenSpec的可切换替代方案
- **测试能力**（3.5）预留占位，不阻塞主流程

### 1.5 状态机脚本设计规范

- 四个脚本职责明确：创建→验证→推进→工具集
- Phase双向映射集中管理，避免散落不一致
- gateChecks状态文件强制化，从prompt约定升级为脚本校验

---

## 二、具体问题

### 2.1 P0级别Bug：validate-fw-phase-gate.cjs skip场景校验错误

**问题位置**：[validate-fw-phase-gate.cjs](file:///f:/Develop/www/mySkills/frontend-workflow-skills/scripts/validate-fw-phase-gate.cjs#L66-L70)

```javascript
// 第66-70行检查target之前所有phase的产物，但不区分skipped状态
for (let p = 0; p < targetPhase; p++) {
    const r = checkPhaseArtifact(taskName, p, state)
    if (!r.pass) {
        blockers.push(`phase ${p}（${getPhaseDisplay(p)} ${getPhaseName(p)}）产物未就绪: ${r.description}`)
    }
}
```

**影响**：当用户使用 `--start 3` 跳过②③阶段（已有静态页面）时，phase 1（review_static, type='file'）的 `-review-static.md` 报告文件不存在，门控校验会**误阻断**推进，导致工作流无法正常开始。

**修复方案**：在artifact检查循环中增加skipped状态判断：

```javascript
for (let p = 0; p < targetPhase; p++) {
    if (state.phases[getPhaseKey(p)]?.status === 'skipped') continue // 新增此行
    const r = checkPhaseArtifact(taskName, p, state)
    if (!r.pass) {
        blockers.push(`phase ${p}（${getPhaseDisplay(p)} ${getPhaseName(p)}）产物未就绪: ${r.description}` + (r.detail ? ` → ${r.detail}` : ''))
    }
}
```

### 2.2 阶段粒度不对称

| 阶段 | 合并情况 | 粒度 |
|------|---------|------|
| ⑤a⑤ | 业务文档方案确认+生成合为一phase | 合并 |
| ⑦b⑦c | 接口定义生成+人工验收拆为两个phase | 拆分 |

**问题**：⑦b和⑦c的拆分与⑤a⑤的合并策略不一致。⑦b生成接口定义后立即需要人工验收（⑦c），逻辑上紧密耦合，可考虑合并为单一phase。

### 2.3 qa-reviewer只读约束仅靠prompt强制

**风险**：qa-reviewer的"只审查不修改"仅通过提示词声明，无工具层或hooks限制。在实际执行中，如果agent误操作调用了写文件工具，无法被拦截。

### 2.4 test-engineer为空壳占位，测试能力缺失

`references/testing.md` 和 `test-engineer.md` 均为占位骨架，无实际测试规则。端到端流程缺少测试环节，质量保障链条不完整。

### 2.5 无回退机制

[advance-fw-phase.cjs](file:///f:/Develop/www/mySkills/frontend-workflow-skills/scripts/advance-fw-phase.cjs#L58-L64) 明确禁止后退：

```javascript
if (state.phase > targetPhase) {
    console.error(JSON.stringify({
        success: false,
        blockers: [`不能从 phase ${state.phase}（${getPhaseDisplay(state.phase)}）后退到 ${targetPhase}（${getPhaseDisplay(targetPhase)}）`]
    }, null, 2))
    process.exit(1)
}
```

**问题**：编排器提示"返工"选项，但状态机不支持回退到之前的phase重新生成，导致返工场景无法在状态机中形式化处理。

### 2.6 上下文开销较大

一次端到端全流程需要累计Read的reference文件：

| Agent | 需要Read的reference |
|-------|-------------------|
| figma-restorer | figma-design-constraint.md + frontend-engineering-standards.md |
| prd-analyst | prototype-to-openspec-prd.md 或 fw-dev-spec.md |
| api-contractor | api-definition-generation.md |
| frontend-implementer | frontend-engineering-standards.md（含第〇章） |
| qa-reviewer | 对应阶段的reference |

每次spawn新agent都需要重新Read，上下文token消耗较大。

---

## 三、改进建议

### 3.1 立即修复（P0）

1. **修复validate-fw-phase-gate.cjs的skip场景bug**（见2.1节修复方案）

### 3.2 架构优化（P1）

2. **统一阶段粒度**：将⑦b⑦c合并为单一phase，与⑤a⑤的合并策略保持一致
3. **增加回退机制**：支持从任意phase回退到之前的phase（仅允许未completed的phase回退），并保留已完成phase的产物
4. **上下文缓存**：编排器在spawn agent前预Read所有reference，以文件路径形式传入，避免每个agent重复Read

### 3.3 能力完善（P2）

5. **补充测试规则**：完善 `references/testing.md`，定义单元测试、组件测试、E2E测试的具体规则和QA Checklist
6. **增强只读约束**：在qa-reviewer的dispatch提示词中明确禁止调用写文件工具，或考虑在工具层添加权限控制
7. **优化阶段命名**：当前阶段编号混用②~⑫（展示层）和0~11（内部），建议统一使用一种编号体系或增加更清晰的映射说明

### 3.4 用户体验优化（P3）

8. **增加进度可视化**：在状态文件中增加进度百分比计算，便于用户了解当前任务完成度
9. **增加错误恢复指引**：当工作流中断时，提供清晰的恢复步骤指引

---

## 四、总体评价

**架构设计优秀**：分层清晰、双模式兼容、人工Gate保障质量、独立分支设计合理、状态机脚本规范。

**主要风险**：P0级别的skip场景bug会导致工作流在常见场景下无法正常推进，建议优先修复。

**改进方向**：阶段粒度统一、回退机制完善、测试能力补充是提升工作流完整性和可靠性的关键。

**适合场景**：端到端全流程开发（从设计稿到业务实现）、TAPD缺陷批量修复、独立的Figma还原或PRD生成任务。