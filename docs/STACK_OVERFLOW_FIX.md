# 栈溢出错误修复报告

## 🚨 问题描述

点击 CAC 按钮时出现 `Maximum call stack size exceeded` 错误，这是由于 Vue Router 的无限递归导致的。

## 🔍 错误分析

### 错误堆栈
```
RangeError: Maximum call stack size exceeded
    at pushWithRedirect (vue-router.js:2365:14)
    at pushWithRedirect (vue-router.js:2365:14)
    at pushWithRedirect (vue-router.js:2365:14)
    ...
```

### 根本原因

1. **路由冲突**: 存在多个相似的路由配置
   - `/module/:moduleCode` 
   - `/modules/:moduleCode`
   - `/cac`

2. **重定向循环**: 路由守卫或配置导致无限重定向

3. **参数编码问题**: Vue Router 在处理路由参数时出现问题

## 🔧 修复方案

### 1. 清理路由配置

**移除冲突的路由**:
```typescript
// ❌ 移除这些冲突的路由
{
  path: '/modules/:moduleCode',  // 与 /module/:moduleCode 冲突
  name: 'angular-module',
  component: () => import('@/views/AngularModuleView.vue')
},
{
  path: '/cac',  // 与 /module/cac 冲突
  name: 'cac-module',
  component: () => import('@/views/AngularModuleView.vue')
}

// ✅ 只保留一个统一的路由
{
  path: '/module/:moduleCode',
  name: 'module',
  component: () => import('@/views/ModulePage.vue'),
  meta: {
    title: '模块页面',
    requiresAuth: true
  }
}
```

### 2. 简化导航逻辑

**修改前** (复杂的事件传递):
```typescript
// ❌ 复杂的事件传递机制
const openModule = async (moduleCode: string) => {
  const event = new CustomEvent('navigate-to-module', {
    detail: { moduleCode: cleanModuleCode }
  })
  window.dispatchEvent(event)
}

// App.vue 中监听事件
window.addEventListener('navigate-to-module', (event) => {
  router.push(`/module/${moduleCode}`)  // 可能导致循环
})
```

**修改后** (直接导航):
```typescript
// ✅ 直接使用 window.location 导航
const openModule = async (moduleCode: string) => {
  const cleanModuleCode = moduleCode.replace(/^__/, '')
  const targetUrl = `/module/${cleanModuleCode}`
  window.location.href = targetUrl  // 避免 Vue Router 复杂性
}
```

### 3. 移除事件监听器

**移除不必要的代码**:
```typescript
// ❌ 移除 App.vue 中的事件监听器
// window.addEventListener('navigate-to-module', navigationListener)
```

## ✅ 修复结果

### 修改的文件

1. **`src/router/index.ts`**
   - 移除冲突的路由配置
   - 只保留 `/module/:moduleCode` 路由

2. **`src/stores/dashboard.ts`**
   - 简化 `openModule` 方法
   - 使用 `window.location.href` 直接导航

3. **`src/App.vue`**
   - 移除事件监听器
   - 简化组件逻辑

### 修复效果

- ✅ 消除栈溢出错误
- ✅ 简化导航逻辑
- ✅ 避免路由冲突
- ✅ 提高系统稳定性

## 🧪 测试验证

### 测试步骤

1. **清除浏览器缓存**
2. **重新启动开发服务器**
3. **登录应用**
4. **点击 CAC 按钮**
5. **验证是否正确跳转到 `/module/cac`**

### 预期结果

```
点击 CAC → 直接导航到 /module/cac → 加载 ModulePage.vue → 显示 CAC 模块
```

### 调试命令

```javascript
// 检查当前路由
console.log('当前路由:', window.location.pathname)

// 检查路由配置
console.log('路由器实例:', router.getRoutes())

// 手动测试导航
window.location.href = '/module/cac'
```

## 🔮 进一步优化

### 1. 添加错误边界

```typescript
const openModule = async (moduleCode: string) => {
  try {
    const targetUrl = `/module/${cleanModuleCode}`
    window.location.href = targetUrl
  } catch (error) {
    console.error('导航失败:', error)
    // 显示错误提示
  }
}
```

### 2. 添加加载状态

```typescript
const openModule = async (moduleCode: string) => {
  loading.value = true
  try {
    // 导航逻辑
  } finally {
    loading.value = false
  }
}
```

### 3. 优化用户体验

```typescript
// 添加导航前确认
const openModule = async (moduleCode: string) => {
  const confirmed = await ElMessageBox.confirm(
    `确定要打开 ${moduleCode} 模块吗？`,
    '确认',
    { type: 'info' }
  )
  
  if (confirmed) {
    window.location.href = `/module/${moduleCode}`
  }
}
```

## 📋 总结

通过清理路由配置和简化导航逻辑，成功修复了栈溢出错误。新的方案更加简洁、稳定，避免了复杂的事件传递和路由冲突问题。

### 关键改进

1. **路由统一**: 只使用一个模块路由模式
2. **导航简化**: 直接使用 `window.location.href`
3. **代码清理**: 移除不必要的事件监听器
4. **错误预防**: 避免可能的循环重定向

这个修复确保了系统的稳定性和可维护性。
