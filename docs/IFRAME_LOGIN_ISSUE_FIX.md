# iframe 登录问题修复报告

## 问题描述

用户在 Vue 主应用中登录成功后，点击 CAC 等模块时，iframe 中的 AngularJS 应用仍然跳转到登录页面，要求重新登录。

## 根本原因

1. **认证状态隔离**: Vue 主应用和 iframe 中的 AngularJS 应用运行在不同的上下文中
2. **存储访问限制**: iframe 无法直接访问主应用的 localStorage/sessionStorage
3. **认证数据传递错误**: 原有的认证数据传递机制使用了错误的存储键名

## 修复方案

### 1. Vue 端修复 (已完成)

#### 1.1 修复认证数据获取

**问题**: `sendAuthDataToIframe` 方法使用错误的存储键名
```javascript
// ❌ 错误的键名
const token = localStorage.getItem('authToken')
const userStr = localStorage.getItem('currentUser')
```

**修复**: 使用正确的认证服务
```javascript
// ✅ 使用认证服务
const { authService } = require('@/core/auth')
const token = authService.getToken()
const user = authService.getCurrentUser()
```

#### 1.2 增强存储兼容性

```javascript
// 设置多种格式的存储，确保兼容性
sessionStorage.setItem('vue-auth-bridge', JSON.stringify(authData))
sessionStorage.setItem('oplus_token', token)
sessionStorage.setItem('oplus_user', JSON.stringify(user))
```

#### 1.3 改进 postMessage 通信

```javascript
// 发送详细的认证数据到 iframe
moduleIframe.value.contentWindow.postMessage({
  type: 'vue-auth-data',
  authData: { token, user, timestamp: Date.now() }
}, '*')
```

### 2. 通信机制

#### 2.1 Vue → AngularJS 数据传递

1. **自动传递**: iframe 加载完成后自动发送认证数据
2. **请求响应**: 监听 iframe 的认证数据请求
3. **多重保障**: 同时使用 postMessage 和 sessionStorage

#### 2.2 消息类型

```javascript
// Vue 发送给 AngularJS
{
  type: 'vue-auth-data',
  authData: { token, user, timestamp }
}

// AngularJS 请求认证数据
{
  type: 'request-auth-data'
}

// AngularJS 请求刷新认证
{
  type: 'request-auth-refresh'
}
```

### 3. AngularJS 端集成 (待实施)

#### 3.1 创建认证桥接服务

需要在 AngularJS 应用中添加 `AuthBridgeService`:

```javascript
angular.module('oplus.core').service('AuthBridgeService', function($window, $rootScope) {
  // 监听来自 Vue 的认证数据
  $window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'vue-auth-data') {
      // 处理认证数据
      var authData = event.data.authData;
      // 设置到本地存储
      // 广播认证状态更新
    }
  });
});
```

#### 3.2 修改路由守卫

```javascript
$rootScope.$on('$stateChangeStart', function(event, toState) {
  if (toState.data && toState.data.requireAuth) {
    if (!AuthBridgeService.isAuthenticated()) {
      if (window.parent !== window) {
        // 在 iframe 中，请求认证数据而不是跳转登录
        event.preventDefault();
        AuthBridgeService.requestAuthData();
        return;
      }
    }
  }
});
```

## 测试验证

### 1. 测试页面

创建了 `public/test-auth-bridge.html` 用于测试认证数据传递:

- **访问地址**: `http://localhost:5173/test-auth-bridge.html`
- **功能**: 模拟 AngularJS 应用接收认证数据
- **测试项目**:
  - postMessage 通信
  - 存储数据设置
  - 认证数据格式

### 2. 测试步骤

1. **登录主应用**: 在 Vue 应用中完成登录
2. **打开测试页面**: 在新标签页打开测试页面
3. **嵌入 iframe**: 将测试页面作为 iframe 嵌入
4. **验证数据传递**: 检查认证数据是否正确传递

### 3. 验证要点

- ✅ 认证数据正确获取
- ✅ postMessage 通信正常
- ✅ 存储数据格式正确
- ⚠️ AngularJS 端集成 (待完成)

## 部署配置

### 1. 安全配置

```javascript
// iframe 沙箱权限
sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation"

// 消息来源验证
const allowedOrigins = ['http://localhost:8080', 'https://your-domain.com'];
if (allowedOrigins.includes(event.origin)) {
  // 处理消息
}
```

### 2. 环境配置

- **开发环境**: `http://localhost:8080/oplus/base/#/cac`
- **生产环境**: `/oplus/base/#/cac`
- **测试环境**: `http://test-server:8080/oplus/base/#/cac`

## 当前状态

### ✅ 已完成
1. Vue 端认证数据传递修复
2. postMessage 通信机制完善
3. 存储兼容性增强
4. 测试页面创建

### ⚠️ 待完成
1. AngularJS 端认证桥接服务
2. AngularJS 路由守卫修改
3. HTTP 拦截器更新
4. 完整的端到端测试

### 🔄 下一步行动

1. **在 AngularJS 应用中实施认证桥接服务**
2. **修改 AngularJS 的路由守卫逻辑**
3. **更新 HTTP 拦截器以使用新的认证数据**
4. **进行完整的集成测试**

## 预期效果

完成所有修改后，用户体验将是：

1. **一次登录**: 在 Vue 主应用登录一次
2. **无缝切换**: 点击任何模块都不需要重新登录
3. **状态同步**: 认证状态在主应用和所有 iframe 应用间同步
4. **安全可靠**: 认证信息安全传递，不暴露在 URL 中

这个解决方案为 iframe 集成提供了完整的认证状态同步机制，解决了混合架构中的认证隔离问题。
