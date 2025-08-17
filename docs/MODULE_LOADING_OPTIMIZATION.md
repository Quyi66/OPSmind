# 模块加载性能优化方案

## 问题分析

CAC 模块点击后加载需要 1 秒多，主要原因包括：

1. **网络延迟**: iframe 需要建立新的 HTTP 连接
2. **认证延迟**: 500ms 的人为延迟
3. **进度条模拟**: 不必要的 100ms 间隔更新
4. **资源加载**: AngularJS 应用的 JS/CSS 资源加载
5. **应用初始化**: AngularJS 应用启动时间

## 优化方案

### 1. 移除不必要延迟 ✅

**修改前**:
```javascript
// 发送认证数据到iframe
setTimeout(() => {
  sendAuthDataToIframe()
}, 500) // ❌ 500ms 延迟
```

**修改后**:
```javascript
// 立即发送认证数据到iframe
sendAuthDataToIframe() // ✅ 立即执行
```

**效果**: 减少 500ms 延迟

### 2. 优化进度条显示 ✅

**修改前**:
```javascript
// 模拟加载进度
const progressInterval = setInterval(() => {
  if (loadProgress.value < 90) {
    loadProgress.value += Math.random() * 10
  }
}, 100) // ❌ 每 100ms 更新一次
```

**修改后**:
```javascript
// 立即设置进度到 50%，表示开始加载
loadProgress.value = 50 // ✅ 立即显示进度
```

**效果**: 减少进度条模拟延迟，提升用户感知性能

### 3. 减少超时时间 ✅

**修改前**:
```javascript
setTimeout(() => {
  if (loading.value) {
    onIframeError('加载超时，请检查网络连接')
  }
}, 30000) // ❌ 30秒超时
```

**修改后**:
```javascript
setTimeout(() => {
  if (loading.value) {
    onIframeError('加载超时，请检查网络连接')
  }
}, 15000) // ✅ 15秒超时
```

**效果**: 更快的错误反馈

### 4. iframe 优化 ✅

**添加的属性**:
```html
<iframe
  loading="eager"      <!-- 优先加载 -->
  importance="high"    <!-- 高优先级 -->
  <!-- 其他属性... -->
>
```

**效果**: 浏览器优先处理 iframe 加载

### 5. DNS 预解析和预连接 ✅

**实现**: `src/utils/performance-optimizer.ts`

```javascript
// DNS 预解析
const dnsLink = document.createElement('link')
dnsLink.rel = 'dns-prefetch'
dnsLink.href = url.origin

// 预连接
const preconnectLink = document.createElement('link')
preconnectLink.rel = 'preconnect'
preconnectLink.href = url.origin
```

**效果**: 减少 DNS 查询和连接建立时间

### 6. iframe 预加载机制 ✅

**实现**: `IframePreloader` 类

```javascript
// 预加载 iframe
static preload(url: string): Promise<HTMLIFrameElement> {
  // 创建隐藏的 iframe 进行预加载
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  // ... 预加载逻辑
}
```

**效果**: 常用模块可以实现秒开

### 7. 网络状况自适应 ✅

**实现**: `optimizeForNetworkCondition()`

```javascript
if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
  return {
    enablePreload: false,  // 慢网络禁用预加载
    timeout: 60000
  }
} else {
  return {
    enablePreload: true,   // 快网络启用预加载
    timeout: 15000
  }
}
```

**效果**: 根据网络状况优化加载策略

### 8. 性能监控 ✅

**实现**: `ModuleLoadMonitor` 类

```javascript
static startTiming(moduleCode: string) {
  this.metrics.set(moduleCode, {
    startTime: performance.now(),
    moduleCode
  })
}

static endTiming(moduleCode: string) {
  // 计算加载时间并记录
}
```

**效果**: 实时监控加载性能，识别慢加载问题

## 使用方法

### 1. 自动优化

所有优化在应用启动时自动启用：

```javascript
// main.js 中自动调用
initPerformanceOptimizations()
```

### 2. 手动预加载

```javascript
import { ModulePreloadManager } from '@/composables/useOptimizedModuleLoader'

// 预加载常用模块
ModulePreloadManager.preloadCommonModules()

// 预加载特定模块
ModulePreloadManager.addToPreloadQueue('cac')
```

### 3. 使用优化的加载器

```javascript
import { useOptimizedModuleLoader } from '@/composables/useOptimizedModuleLoader'

const { loading, loadModule, preloadModule } = useOptimizedModuleLoader('cac')
```

## 性能提升效果

### 预期改进

1. **首次加载**: 从 1000ms+ 减少到 500-800ms
2. **预加载后**: 从 1000ms+ 减少到 100-200ms
3. **网络优化**: DNS 查询时间减少 50-100ms
4. **用户感知**: 立即显示进度，减少等待感

### 实际测试

可以通过以下方式验证性能提升：

```javascript
// 在浏览器控制台查看加载时间
console.log('📊 Module load time: cac - XXXms')

// 查看预加载状态
ModulePreloadManager.getStatus()

// 查看网络配置
optimizeForNetworkCondition()
```

## 进一步优化建议

### 1. 服务端优化

- **HTTP/2**: 启用 HTTP/2 多路复用
- **Gzip 压缩**: 压缩 JS/CSS 资源
- **CDN**: 使用 CDN 加速静态资源
- **缓存策略**: 设置合适的缓存头

### 2. 应用级优化

- **代码分割**: 按需加载 AngularJS 模块
- **资源合并**: 减少 HTTP 请求数量
- **懒加载**: 延迟加载非关键资源

### 3. 用户体验优化

- **骨架屏**: 显示内容骨架而不是加载动画
- **渐进式加载**: 先显示关键内容，再加载次要内容
- **离线缓存**: 使用 Service Worker 缓存资源

## 监控和调试

### 1. 性能监控

```javascript
// 查看所有模块加载时间
ModuleLoadMonitor.getMetrics()

// 查看预加载状态
ModulePreloadManager.getStatus()
```

### 2. 网络分析

在浏览器开发者工具的 Network 面板中：
- 查看 DNS 查询时间
- 检查连接建立时间
- 分析资源加载瀑布图

### 3. 性能分析

在浏览器开发者工具的 Performance 面板中：
- 录制模块加载过程
- 分析主线程活动
- 识别性能瓶颈

这套优化方案通过多个维度的改进，可以显著提升模块加载速度和用户体验。
