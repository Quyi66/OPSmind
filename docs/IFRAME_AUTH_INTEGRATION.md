# iframe 认证集成解决方案

## 问题描述

当点击 CAC 等模块时，iframe 中的 AngularJS 应用会跳转到登录页面，这是因为：

1. **认证状态隔离**: Vue 主应用和 iframe 中的 AngularJS 应用有独立的认证状态
2. **存储隔离**: iframe 无法直接访问主应用的 localStorage/sessionStorage
3. **Cookie 作用域**: 如果域名不同，Cookie 也无法共享

## 解决方案

### 1. Vue 端修改 (已完成)

#### 1.1 认证数据传递

在 `AngularModuleFrame.vue` 中，iframe 加载完成后会自动发送认证数据：

```javascript
// 发送认证数据到iframe
const sendAuthDataToIframe = () => {
  const { authService } = require('@/core/auth')
  const token = authService.getToken()
  const user = authService.getCurrentUser()

  const authData = { token, user, timestamp: Date.now() }

  // 1. 设置到 sessionStorage 供 iframe 使用
  sessionStorage.setItem('vue-auth-bridge', JSON.stringify(authData))
  sessionStorage.setItem('oplus_token', token)
  sessionStorage.setItem('oplus_user', JSON.stringify(user))

  // 2. 通过 postMessage 发送到 iframe
  moduleIframe.value.contentWindow.postMessage({
    type: 'vue-auth-data',
    authData
  }, '*')
}
```

#### 1.2 消息监听

Vue 应用会监听来自 iframe 的认证请求：

```javascript
// 处理认证数据请求
if (event.data && event.data.type === 'request-auth-data') {
  sendAuthDataToIframe()
  return
}
```

### 2. AngularJS 端修改 (需要实现)

在 AngularJS 应用中需要添加以下代码来接收和使用认证数据：

#### 2.1 创建认证桥接服务

```javascript
// auth-bridge.service.js
angular.module('oplus.core').service('AuthBridgeService', function($window, $rootScope) {
  var self = this;
  var authData = null;

  // 监听来自 Vue 应用的消息
  $window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'vue-auth-data') {
      console.log('🔗 Received auth data from Vue app');
      authData = event.data.authData;
      
      // 设置到本地存储
      if (authData.token) {
        localStorage.setItem('oplus_token', authData.token);
        sessionStorage.setItem('oplus_token', authData.token);
      }
      
      if (authData.user) {
        localStorage.setItem('oplus_user', JSON.stringify(authData.user));
        sessionStorage.setItem('oplus_user', JSON.stringify(authData.user));
      }
      
      // 广播认证状态更新
      $rootScope.$broadcast('auth-updated', authData);
      $rootScope.$apply();
    }
  });

  // 请求认证数据
  this.requestAuthData = function() {
    if ($window.parent !== $window) {
      $window.parent.postMessage({
        type: 'request-auth-data'
      }, '*');
    }
  };

  // 获取认证数据
  this.getAuthData = function() {
    return authData;
  };

  // 检查是否已认证
  this.isAuthenticated = function() {
    return !!(authData && authData.token);
  };
});
```

#### 2.2 修改应用启动逻辑

```javascript
// app.run.js
angular.module('oplus.app').run(function(AuthBridgeService, $rootScope, $state) {
  
  // 应用启动时请求认证数据
  AuthBridgeService.requestAuthData();
  
  // 监听认证状态更新
  $rootScope.$on('auth-updated', function(event, authData) {
    console.log('🔐 Auth state updated:', authData);
    
    // 如果当前在登录页面且已认证，跳转到主页面
    if ($state.current.name === 'login' && AuthBridgeService.isAuthenticated()) {
      $state.go('app.dashboard');
    }
  });
  
  // 路由守卫
  $rootScope.$on('$stateChangeStart', function(event, toState) {
    if (toState.data && toState.data.requireAuth) {
      if (!AuthBridgeService.isAuthenticated()) {
        // 如果在 iframe 中，请求认证数据而不是跳转登录
        if (window.parent !== window) {
          event.preventDefault();
          AuthBridgeService.requestAuthData();
          return;
        }
        
        // 否则跳转到登录页面
        event.preventDefault();
        $state.go('login');
      }
    }
  });
});
```

#### 2.3 修改 HTTP 拦截器

```javascript
// http-interceptor.js
angular.module('oplus.core').config(function($httpProvider) {
  $httpProvider.interceptors.push(function(AuthBridgeService) {
    return {
      request: function(config) {
        var authData = AuthBridgeService.getAuthData();
        if (authData && authData.token) {
          config.headers.Authorization = 'Bearer ' + authData.token;
        }
        return config;
      },
      
      responseError: function(response) {
        if (response.status === 401) {
          // 认证失败，请求新的认证数据
          AuthBridgeService.requestAuthData();
        }
        return Promise.reject(response);
      }
    };
  });
});
```

### 3. 部署配置

#### 3.1 确保同源策略

如果 Vue 应用和 AngularJS 应用在不同域名下，需要配置：

```javascript
// 在 Vue 应用中设置允许的源
const allowedOrigins = [
  'http://localhost:8080',
  'https://your-angular-domain.com'
];

// 验证消息来源
if (allowedOrigins.includes(event.origin)) {
  // 处理消息
}
```

#### 3.2 iframe 沙箱配置

确保 iframe 有足够的权限：

```html
<iframe
  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation"
  allow="fullscreen"
>
```

### 4. 调试和监控

#### 4.1 Vue 端调试

```javascript
// 在浏览器控制台查看认证数据传递
console.log('🔗 Auth data sent to iframe:', authData);
```

#### 4.2 AngularJS 端调试

```javascript
// 在 AngularJS 应用中查看接收到的数据
console.log('🔗 Received auth data from Vue app:', authData);
```

#### 4.3 存储检查

```javascript
// 检查存储中的认证数据
console.log('Token:', sessionStorage.getItem('oplus_token'));
console.log('User:', sessionStorage.getItem('oplus_user'));
```

## 实施步骤

1. **Vue 端修改** ✅ 已完成
   - 修复认证数据获取
   - 完善 postMessage 通信

2. **AngularJS 端修改** ⚠️ 需要实施
   - 添加 AuthBridgeService
   - 修改应用启动逻辑
   - 更新 HTTP 拦截器

3. **测试验证**
   - 测试认证数据传递
   - 验证 iframe 应用免登录
   - 检查 API 调用认证

4. **生产部署**
   - 配置域名和安全策略
   - 监控认证状态同步

## 预期效果

实施完成后：

1. **无缝登录**: 用户在 Vue 应用登录后，点击任何模块都不需要重新登录
2. **状态同步**: 认证状态在主应用和 iframe 应用之间实时同步
3. **安全性**: 认证信息通过安全的 postMessage 传递，不暴露在 URL 中
4. **兼容性**: 保持与现有 AngularJS 认证系统的兼容性

这个方案解决了 iframe 集成中的认证隔离问题，提供了良好的用户体验。
