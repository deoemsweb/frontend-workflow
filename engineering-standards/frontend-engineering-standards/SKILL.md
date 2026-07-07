---
name: frontend-engineering-standards
description: 通用前端工程规范，涵盖 TypeScript 类型安全、API 集成、状态管理、前端安全、性能优化、代码注释与 AI 不确定时处理协议。适用于任何前端开发任务（含非 Figma 还原场景）。
---

# 前端工程通用规范

## 何时使用此 Skill

当用户进行任何前端开发任务时触发此 skill，包括但不限于：

- 编写/重构 TypeScript 前端代码（类型安全、ESLint 合规）
- 集成后端 API、处理异步数据与请求状态
- 设计跨组件状态管理（Store）
- 涉及前端安全（XSS 防护、输入校验、敏感信息保护）
- 前端性能优化（图片、懒加载、防抖节流、重渲染）
- 代码注释与文档规范
- AI 在信息不足时如何处理不确定场景

> **安全规则为硬约束**，无论具体设计稿或需求是否体现，均必须遵守。
## 一、代码质量与类型安全

> **适用范围**：仅当项目使用了 TypeScript 时生效。如果项目是纯 JavaScript，则本章的类型注解约束不适用，但仍需遵守"禁止魔法数字"和"ESLint 兼容"规则。

### 1.1 TypeScript 严格模式约束

当项目 `tsconfig.json` 中启用了 `strict: true` 或项目依赖中包含 `typescript` 时，必须遵守：

| 规则 | 说明 |
|------|------|
| **禁止 `any` 类型** | 严禁使用 `any` 绕开类型检查。不确定的类型用 `unknown` + 类型守卫 |
| **显式函数返回类型** | 组件函数、工具函数必须声明返回值类型 |
| **Props 接口定义** | 所有组件 Props 必须有显式的 TypeScript 接口或类型别名 |
| **禁止 `as` 强制断言** | 优先使用类型守卫，仅在确认安全时使用 `as`（需加注释说明） |
| **null/undefined 检查** | 对可能为空的属性使用可选链 `?.` 和空值合并 `??` |

```typescript
// ❌ 错误：使用 any 逃避类型检查
const data: any = await fetchUserList()

// ❌ 错误：Props 无类型定义
// ❌ 错误：使用 as 强制断言且无注释
const name = (data as any).user.name

// ✅ 正确：unknown + 类型守卫
interface UserListResponse {
  user: { name: string }
}
const data: unknown = await fetchUserList()
if (isUserListResponse(data)) {
  const name = data.user.name
}

// ✅ 正确：显式 Props 接口
interface UserCardProps {
  avatar: string
  name: string
  role?: 'admin' | 'member'
}
```

### 1.2 Vue/React 类型最佳实践

#### Vue 3 + TypeScript

```vue
<script setup lang="ts">
// ✅ 正确：defineProps 带泛型
interface Props {
  title: string
  count?: number
  items: Array<{ id: string; label: string }>
}
const props = withDefaults(defineProps<Props>(), {
  count: 0
})

// ✅ 正确：defineEmits 带类型
const emit = defineEmits<{
  (e: 'update', value: string): void
  (e: 'close'): void
}>()
</script>
```

#### React + TypeScript

```tsx
// ✅ 正确：显式 FC Props 类型
interface ButtonProps {
  variant: 'primary' | 'secondary'
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  variant,
  disabled = false,
  onClick,
  children
}) => {
  // 组件逻辑
}
```

### 1.3 禁止魔法数字

所有数字字面量必须有语义（作为 Design Token 或常量），不允许在样式/逻辑中使用无意义的硬编码数字：

```typescript
// ❌ 错误：魔法数字
if (statusCode === 401) { /* ... */ }
setTimeout(() => { /* ... */ }, 300)
.element { max-width: 1200px; }

// ✅ 正确：命名常量
const HTTP_UNAUTHORIZED = 401
const DEBOUNCE_DELAY_MS = 300
const PAGE_MAX_WIDTH = 1200

if (statusCode === HTTP_UNAUTHORIZED) { /* ... */ }
setTimeout(() => { /* ... */ }, DEBOUNCE_DELAY_MS)
.element { max-width: var(--page-max-width); }

// ⚠️ 例外：Figma 设计稿中的精确样式值不属于魔法数字
.element { width: 320px; }   // ✅ 这是 Figma 的精确值
.element { border-radius: 8px; } // ✅ 这是 Figma 的精确值
```

### 1.4 ESLint / Prettier 兼容

生成的代码应兼容主流 ESLint 规则，特别注意：

- 使用 `===` 而非 `==`（除非确需类型转换）
- 避免 `var`，使用 `const` 和 `let`
- 未使用的变量/导入不得保留
- 尾随逗号、缩进风格应参考项目现有代码风格
- 组件/函数命名：Vue 组件用 PascalCase 或 kebab-case（取决于项目规范），React 组件用 PascalCase

---

## 二、API 集成与数据请求规范

> **触发条件**：仅在 Figma 设计稿中明确展示了动态数据（列表、表格、详情、搜索等需要后端数据的界面）时，才适用本章规则。纯静态展示页面不需要 API 规范。

### 2.1 统一请求封装

不要裸调 `fetch` 或 `axios`，必须通过项目已有的请求封装层：

```typescript
// ❌ 错误：裸调 axios
const res = await axios.get('/api/users')

// ✅ 正确：使用封装后的 request 实例
import { request } from '@/utils/request'
const res = await request.get('/api/users')
```

如果项目尚无封装，按以下最小模板创建：

```typescript
// src/utils/request.ts
import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
})

// 响应拦截：统一错误处理
instance.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error) => {
    // 统一错误提示（由项目引入的 Toast/Message 组件处理）
    const message = error.response?.data?.message || '网络请求失败'
    console.error(`[API Error] ${message}`)
    return Promise.reject(error)
  }
)

export const request = instance
```

### 2.2 三态模式：loading / error / empty

任何依赖异步数据的组件必须处理三种状态：

```vue
<template>
  <div class="user-list">
    <!-- loading 状态 -->
    <div v-if="loading" class="user-list__loading">
      <!-- 如果 Figma 中有 skeleton/loading 设计则按设计稿还原 -->
      <!-- 如果 Figma 中无 loading 设计，保留固定高度占位，不自行添加动画效果 -->
      <div class="skeleton-placeholder" style="height: 200px;"></div>
    </div>

    <!-- error 状态 -->
    <div v-else-if="error" class="user-list__error">
      <!-- 如果 Figma 中有错误状态设计则还原，否则仅 console.error -->
    </div>

    <!-- empty 状态 -->
    <div v-else-if="!data.length" class="user-list__empty">
      <!-- 如果 Figma 中有空状态设计则还原，否则保留区域占位 -->
    </div>

    <!-- 数据正常 -->
    <template v-else>
      <!-- 按 Figma 设计稿还原数据列表 -->
    </template>
  </div>
</template>
```

> **注意**：error 和 empty 状态的视觉呈现仍受规则 4（缺失状态不得自行补充）约束。如果 Figma 中没有对应状态的设计，仅保留 DOM 占位结构，不添加自行设计的图标/文案。

### 2.3 错误码处理

```typescript
// ✅ 正确：集中管理业务错误码映射
const ERROR_CODE_MAP: Record<number, string> = {
  401: '登录已过期，请重新登录',
  403: '暂无权限访问',
  404: '请求的资源不存在',
  500: '服务器错误，请稍后重试',
}

// ✅ 正确：统一错误处理
function handleApiError(code: number, defaultMsg: string): string {
  return ERROR_CODE_MAP[code] || defaultMsg
}
```

### 2.4 请求取消与防竞态

当组件销毁或快速切换时，必须取消未完成的请求：

```typescript
// Vue 3 (Composition API)
import { onBeforeUnmount, ref } from 'vue'

const abortController = ref<AbortController | null>(null)

async function fetchData() {
  // 取消上一次未完成的请求
  abortController.value?.abort()
  abortController.value = new AbortController()

  try {
    const res = await request.get('/api/data', {
      signal: abortController.value.signal
    })
    // 处理数据
  } catch (err) {
    if (err.name !== 'AbortError') {
      // 非取消导致的错误才处理
      console.error(err)
    }
  }
}

onBeforeUnmount(() => {
  abortController.value?.abort()
})
```

### 2.5 数据请求范式（Composables/Hooks）

```typescript
// ✅ Vue 3 Composable 范式
export function useUserList() {
  const data = ref<User[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetch() {
    loading.value = true
    error.value = null
    try {
      const res = await request.get<User[]>('/api/users')
      data.value = res
    } catch (err) {
      error.value = (err as Error).message
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, fetch }
}
```

---

## 三、状态管理规范

> **触发条件**：仅在组件涉及跨组件共享状态时才适用本章。简单的父子组件通信不需要引入 Store。

### 3.1 状态分级决策树

在决定状态存放位置时，按以下优先级判断：

```
该状态是否被多个不相关的组件共享？
├── 是 → 放入 Store（Pinia / Vuex / Redux / Zustand）
└── 否 → 该状态是否需要在组件卸载后保留？
    ├── 是 → 放入 Store 或父组件（通过 keep-alive 缓存）
    └── 否 → 放入组件本地 state
```

### 3.2 Store 设计原则

| 原则 | 说明 |
|------|------|
| **单一职责** | 一个 Store 只管理一个领域（userStore、cartStore、uiStore） |
| **避免冗余** | 同一个数据只在 Store 中存一份，派生数据用 getter/computed |
| **服务端/客户端分离** | 服务端返回的数据和纯前端 UI 状态（如弹窗开关）分不同 Store |
| **禁止在 Store 中直接操作 DOM** | Store 只管理数据，不涉及视图操作 |

### 3.3 Pinia（Vue 3 推荐）Store 模板

```typescript
// stores/user.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { request } from '@/utils/request'

interface User {
  id: string
  name: string
  avatar: string
}

export const useUserStore = defineStore('user', () => {
  // State
  const list = ref<User[]>([])
  const loading = ref(false)

  // Getters（派生数据）
  const activeUsers = computed(() =>
    list.value.filter(u => u.status === 'active')
  )

  // Actions
  async function fetchList() {
    loading.value = true
    try {
      list.value = await request.get<User[]>('/api/users')
    } finally {
      loading.value = false
    }
  }

  return { list, loading, activeUsers, fetchList }
})
```

### 3.4 Zustand（React 推荐）Store 模板

```typescript
// stores/useUserStore.ts
import { create } from 'zustand'

interface User {
  id: string
  name: string
}

interface UserState {
  list: User[]
  loading: boolean
  fetchList: () => Promise<void>
}

export const useUserStore = create<UserState>((set) => ({
  list: [],
  loading: false,
  fetchList: async () => {
    set({ loading: true })
    try {
      const res = await request.get<User[]>('/api/users')
      set({ list: res })
    } finally {
      set({ loading: false })
    }
  }
}))
```

---

## 四、安全性约束

> **安全规则为硬约束，无论 Figma 设计稿是否体现，均必须遵守。**

### 4.1 XSS 防护

| 规则 | 说明 | 严重级别 |
|------|------|----------|
| **禁止直接使用 `v-html` / `innerHTML`** | 必须经过 DOMPurify 或项目已有的 XSS 过滤函数处理 | 🔴 必须 |
| **用户输入必须转义** | 所有来自用户的文本在渲染前应使用框架默认的文本插值 | 🔴 必须 |
| **URL 必须验证** | `javascript:` / `data:` 协议的 URL 禁止直接使用 | 🔴 必须 |

```vue
<!-- ❌ 错误：v-html 直接渲染用户输入，存在 XSS 风险 -->
<div v-html="userInput"></div>

<!-- ✅ 正确：经过净化后使用 -->
<script setup>
import DOMPurify from 'dompurify'
const safeHTML = computed(() => DOMPurify.sanitize(props.htmlContent))
</script>
<template>
  <div v-html="safeHTML"></div>
</template>

<!-- ✅ 更安全：使用文本插值（默认转义） -->
<div>{{ userInput }}</div>
```

```tsx
// ❌ 错误：dangerouslySetInnerHTML 直接使用用户输入
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ 正确：净化后使用
import DOMPurify from 'dompurify'
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

### 4.2 输入验证

```typescript
// ✅ 正确：前端输入验证（作为用户体验层，后端仍需独立验证）
interface ValidationRule {
  pattern: RegExp
  message: string
}

const rules: Record<string, ValidationRule> = {
  phone: {
    pattern: /^1[3-9]\d{9}$/,
    message: '请输入正确的手机号'
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: '请输入正确的邮箱地址'
  }
}

function validate(field: string, value: string): string | null {
  const rule = rules[field]
  if (!rule) return null
  return rule.pattern.test(value) ? null : rule.message
}
```

### 4.3 敏感信息保护

| 规则 | 说明 |
|------|------|
| **禁止硬编码 API Key / Token / 密码** | 所有敏感信息必须通过环境变量（`.env`）注入 |
| **禁止 console.log 打印敏感信息** | 日志中不得输出 token、密码、手机号、身份证号等 |
| **禁止在客户端存储敏感信息** | Token 存 httpOnly cookie（推荐）或安全 localStorage 方案，不得存明文密码 |
| **接口 URL 不得拼接敏感参数** | 敏感参数通过 POST body 或 Header 传递 |

```typescript
// ❌ 错误：硬编码 API Key
const API_KEY = 'sk-xxxxxxxxxxxxxxxxxxxx'

// ❌ 错误：console.log 打印 token
console.log('token:', token)

// ✅ 正确：通过环境变量注入
const API_KEY = import.meta.env.VITE_API_KEY

// ✅ 正确：日志脱敏
console.log('token:', token ? `${token.slice(0, 4)}***` : 'null')
```

### 4.4 CSP 与第三方依赖提醒

- 如果 Figma 设计稿中包含第三方嵌入内容（iframe、外部脚本），需提醒用户配置 CSP
- 引入第三方 npm 包前，建议检查其维护状态和安全审计情况
- 不使用来自不可信 CDN 的外部脚本/样式

---

## 五、性能优化规范

> **约束原则**：性能优化仅在不影响设计要求 / 产品需求的前提下进行。如果优化措施会改变视觉效果，则不执行。

### 5.1 图片优化

```html
<!-- ✅ 正确：图片懒加载 + 明确尺寸防止布局偏移 -->
<img
  src="./assets/banner.jpg"
  loading="lazy"
  width="750"
  height="400"
  alt="Banner"
/>

<!-- ✅ 正确：响应式图片（如项目支持） -->
<img
  srcset="./assets/photo@1x.jpg 1x, ./assets/photo@2x.jpg 2x"
  src="./assets/photo@1x.jpg"
  alt="照片"
/>
```

### 5.2 路由/组件懒加载

```typescript
// Vue 3 路由懒加载
const routes = [
  {
    path: '/dashboard',
    component: () => import('@/views/Dashboard.vue')  // 懒加载
  }
]

// React 路由懒加载
import { lazy, Suspense } from 'react'
const Dashboard = lazy(() => import('@/pages/Dashboard'))
```

### 5.3 防抖与节流

```typescript
// ✅ 识别使用场景：
// 防抖（debounce）：搜索输入、窗口 resize、表单验证 → 用户停止操作后执行
// 节流（throttle）：滚动事件、鼠标移动、游戏循环 → 固定频率执行

// 防抖：搜索输入
import { debounce } from '@/utils/debounce'

const handleSearch = debounce((keyword: string) => {
  // 发起搜索请求
}, 300)

// 节流：滚动加载
import { throttle } from '@/utils/throttle'

const handleScroll = throttle(() => {
  // 滚动处理逻辑
}, 200)
```

### 5.4 避免不必要的重渲染

```vue
<!-- Vue 3：合理使用 computed / shallowRef -->
<script setup>
import { computed, shallowRef } from 'vue'

// ✅ 派生数据用 computed（自动缓存）
const fullName = computed(() => `${firstName.value} ${lastName.value}`)

// ✅ 大对象用 shallowRef（避免深度响应式开销）
const largeList = shallowRef<Item[]>([])
</script>
```

```tsx
// React：memo / useMemo / useCallback
import { memo, useMemo, useCallback } from 'react'

// ✅ 纯展示组件用 React.memo
export const UserCard: React.FC<Props> = memo(({ name, avatar }) => {
  // ...
})

// ✅ 复杂计算用 useMemo
const sortedList = useMemo(
  () => [...list].sort((a, b) => a.name.localeCompare(b.name)),
  [list]
)
```

### 5.5 虚拟滚动指示

当 Figma 设计稿中明确有长列表（> 100 条）时，建议使用虚拟滚动：

```
// 判断标准（满足任一即建议）：
// - 列表项数量 > 100
// - Figma 中列表区域高度固定且内容超出
// - 单条列表项包含图片等重资源

// Vue: vue-virtual-scroller / vxe-table
// React: react-window / react-virtuoso
// 小程序: recycle-view
```

> **注意**：如果 Figma 设计稿中的列表项视觉复杂且使用了固定的分页设计，则不需要虚拟滚动。

---

## 六、代码注释与文档规范

### 6.1 JSDoc 注释规范

所有工具函数、Hook/Composable、Store action 必须有 JSDoc 注释：

```typescript
/**
 * 根据用户角色过滤菜单列表
 * @param menus - 完整菜单列表
 * @param role - 当前用户角色
 * @returns 过滤后的可见菜单列表
 * @example
 * const visible = filterMenusByRole(menus, 'admin')
 */
function filterMenusByRole(menus: Menu[], role: string): Menu[] {
  // ...
}
```

### 6.2 组件文档注释

```vue
<script setup lang="ts">
/**
 * UserCard - 用户信息卡片组件
 *
 * @description 展示用户头像、姓名、角色信息，支持紧凑/标准两种尺寸
 *              （仅当 Figma 中确实存在两种尺寸变体时才注明）
 *
 * @figma 设计稿参考：[Figma 链接]
 */
interface Props {
  /** 用户头像图片 URL */
  avatar: string
  /** 用户姓名 */
  name: string
  /** 用户角色标签，对应 Figma 中的 badge 样式 */
  role?: 'admin' | 'editor' | 'viewer'
}
</script>
```

### 6.3 复杂逻辑必须注释

```typescript
// ❌ 错误：复杂逻辑无注释
const price = base * (1 + taxRate) / (1 - discount) * quantity / 100

// ✅ 正确：清晰注释业务含义
// 计算订单最终价格（元）
// 公式：(原价 × (1 + 税率)) / (1 - 折扣) × 数量 ÷ 100（分转元）
const finalPriceInYuan =
  (basePrice * (1 + taxRate)) / (1 - discountRate) * quantity / CENTS_PER_YUAN
```

### 6.4 TODO / FIXME / HACK 标记

```typescript
// TODO(username): 待确认 → 需要确认/补充的功能点
// FIXME(username): 待修复 → 已知问题，低优先级暂不修复
// HACK(username): 临时方案 → 不优雅的临时解决方案，需注明原因和计划

// ✅ 正确：TODO 标记（含负责人和日期）
// TODO(zhangsan): 待后端接口就绪后替换 mock 数据 2026-01-15

// ❌ 错误：无责任人/时间的模糊 TODO
// TODO: 以后改
```

---

## 七、AI 不确定时的处理协议

> **此协议优先级最高。当信息不足时，优先询问用户，严禁猜测。**

### 7.1 必须停止并询问的场景

以下任一情况发生时，**必须停止代码生成，向用户提出明确问题**：

| 场景类别 | 具体触发条件 |
|----------|------------|
| **业务逻辑不明确** | Figma 中交互元素的点击行为（跳转/弹窗/提交/删除？）或业务流程（审批流/支付/权限判断）无法从视觉判定 |
| **后端接口契约未知** | 接口 URL、请求方式、参数格式、返回数据结构未在对话中提供 |
| **字段含义无法推断** | Figma 中的文案/标签存在歧义，可能有多种业务解释 |
| **缺失关键设计稿** | 页面/弹窗的某些状态（确认弹窗、成功页、错误页）明显应有对应设计稿但未提供 |
| **技术方案有分歧** | Figma 设计暗示了某种技术选型但可能与项目现有方案冲突，且无法确定取舍 |
| **数据交互模式不明确** | 表单的提交方式、文件上传接口、分页加载方式等无法从静态设计稿获知 |

### 7.2 严禁猜测的内容

```
🚫 不准猜测：
- 后端接口的 URL、请求方式、入参/出参格式
- 业务规则的逻辑细节（如优惠券叠加规则、权限判断逻辑）
- 数据字段的真实含义和数据类型
- 用户的操作意图和完整操作流程
- 缺失页面的视觉设计（即使你认为"应该"有一个确认弹窗）
```

### 7.3 Fallback 策略

当遇到不确定但可降级处理的场景：

```typescript
// ✅ 正确做法：提供两种方案供用户选择
// 方案 A：使用 el-input（Element Plus 输入框）
// 方案 B：自定义 input 组件（精确还原 Figma 样式）
// 请确认你倾向于哪种实现方式？
```

### 7.4 标准话术模板

当需要停止并询问时，使用以下话术结构：

```
📋 需要确认以下信息才能继续：

1. [信息项名称]
   当前可观察：[Figma 中能看到什么]
   需要确认：[需要用户明确的点]
   可选方案（如适用）：
   - A) [方案A简述]
   - B) [方案B简述]

请逐个确认上述信息，我将据此继续还原。
```
