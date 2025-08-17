# 单 iframe 方案调试指南

## 🎯 问题诊断

当点击 CAC 功能按钮没有跳转时，按以下步骤排查：

### 1️⃣ 检查点击事件流程

```javascript
// 在浏览器控制台中检查
console.log('=== 点击事件流程检查 ===')

// 1. 检查点击事件是否触发
window.addEventListener('navigate-to-module', (event) => {
  console.log('✅ 导航事件触发:', event.detail)
})

// 2. 检查路由是否正确
console.log('当前路由:', window.location.pathname)
```

### 2️⃣ 检查单 iframe 管理器状态

```javascript
// 检查管理器状态
const status = window.singleIframeManager?.getStatus()
console.log('iframe 管理器状态:', status)

// 预期输出:
{
  isInitialized: true,
  isLoading: false,
  currentModule: null,
  iframeReady: true,
  availableRoutes: ['cac', 'jao', 'sim', ...]
}
```

### 3️⃣ 检查路由映射

```javascript
// 检查模块路由映射
const moduleRoutes = {
  'cac': '#/cac',
  'jao': '#/jao', 
  'sim': '#/sim',
  // ...
}

console.log('CAC 路由:', moduleRoutes['cac'])
```

### 4️⃣ 手动测试模块切换

```javascript
// 手动测试切换到 CAC
const container = document.createElement('div')
container.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: white;
`
document.body.appendChild(container)

window.singleIframeManager.switchToModule('cac', container)
  .then(time => console.log(`✅ 切换成功: ${time}ms`))
  .catch(err => console.error('❌ 切换失败:', err))
```

## 🔧 常见问题解决

### 问题1: 点击没有反应

**可能原因**:
- 事件监听器没有正确绑定
- 模块代码不匹配

**解决方法**:
```javascript
// 检查事件监听器
console.log('事件监听器数量:', getEventListeners(window)['navigate-to-module']?.length)

// 手动触发导航事件
window.dispatchEvent(new CustomEvent('navigate-to-module', {
  detail: { moduleCode: 'cac' }
}))
```

### 问题2: iframe 没有初始化

**可能原因**:
- Angular 应用加载失败
- 网络问题

**解决方法**:
```javascript
// 检查 iframe 状态
const iframe = document.querySelector('#angular-main-iframe')
console.log('iframe 元素:', iframe)
console.log('iframe src:', iframe?.src)
console.log('iframe 加载状态:', iframe?.readyState)

// 重新初始化
window.singleIframeManager.destroy()
// 刷新页面重新初始化
```

### 问题3: 路由切换失败

**可能原因**:
- Angular 路由不支持 hash 变更
- 路由路径错误

**解决方法**:
```javascript
// 检查 Angular iframe 的当前路由
const iframe = document.querySelector('#angular-main-iframe')
if (iframe?.contentWindow) {
  console.log('当前 hash:', iframe.contentWindow.location.hash)
  
  // 手动设置路由
  iframe.contentWindow.location.hash = '#/cac'
}
```

## 🧪 完整测试流程

### 步骤1: 检查初始状态

```javascript
console.log('=== 初始状态检查 ===')
console.log('1. 管理器状态:', window.singleIframeManager?.getStatus())
console.log('2. iframe 元素:', document.querySelector('#angular-main-iframe'))
console.log('3. 当前路由:', window.location.pathname)
```

### 步骤2: 测试点击流程

```javascript
console.log('=== 点击流程测试 ===')

// 模拟点击 CAC 按钮
const cacButton = document.querySelector('[data-module="cac"]')
if (cacButton) {
  console.log('找到 CAC 按钮:', cacButton)
  cacButton.click()
} else {
  console.log('未找到 CAC 按钮，手动触发事件')
  window.dispatchEvent(new CustomEvent('navigate-to-module', {
    detail: { moduleCode: 'cac' }
  }))
}
```

### 步骤3: 验证结果

```javascript
setTimeout(() => {
  console.log('=== 结果验证 ===')
  console.log('1. 当前路由:', window.location.pathname)
  console.log('2. 当前模块:', window.singleIframeManager?.getCurrentModule())
  console.log('3. iframe 位置:', document.querySelector('#angular-main-iframe')?.parentElement?.id)
}, 2000)
```

## 🔍 调试技巧

### 1. 启用详细日志

```javascript
// 在控制台中启用详细日志
localStorage.setItem('debug', 'true')
```

### 2. 监控所有事件

```javascript
// 监控所有相关事件
['navigate-to-module', 'route-change'].forEach(eventType => {
  window.addEventListener(eventType, (event) => {
    console.log(`📡 事件: ${eventType}`, event.detail)
  })
})
```

### 3. 检查网络请求

在浏览器开发者工具的 Network 面板中：
- 检查 Angular 应用是否成功加载
- 查看是否有 404 或其他错误
- 确认认证 token 是否正确传递

### 4. 检查控制台错误

在 Console 面板中查看：
- JavaScript 错误
- 网络错误
- 认证相关错误

## 📋 问题报告模板

如果问题仍然存在，请提供以下信息：

```
### 环境信息
- 浏览器: Chrome/Firefox/Safari 版本
- 操作系统: Windows/Mac/Linux
- 网络环境: 内网/外网

### 问题描述
- 具体操作步骤
- 预期结果
- 实际结果

### 调试信息
```javascript
// 管理器状态
console.log(window.singleIframeManager?.getStatus())

// iframe 状态
const iframe = document.querySelector('#angular-main-iframe')
console.log({
  exists: !!iframe,
  src: iframe?.src,
  parent: iframe?.parentElement?.id,
  visible: iframe?.style.display !== 'none'
})

// 路由状态
console.log({
  currentPath: window.location.pathname,
  currentHash: window.location.hash
})
```

### 控制台错误
[粘贴控制台中的错误信息]

### 网络请求
[粘贴 Network 面板中的相关请求信息]
```

## 🚀 快速修复

如果遇到问题，可以尝试以下快速修复：

```javascript
// 1. 重置管理器
window.singleIframeManager?.destroy()
location.reload()

// 2. 清除缓存
localStorage.clear()
sessionStorage.clear()
location.reload()

// 3. 手动导航
window.location.href = '/module/cac'
```

这个调试指南应该能帮助快速定位和解决点击 CAC 按钮没有跳转的问题。
