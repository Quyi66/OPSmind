# iframe Token 集成实现文档

## 概述

本文档描述了如何通过URL参数的方式将JWT token传递给iframe中的Angular应用，替代原有的postMessage方式。

## 实现的功能

### 1. URL参数传递Token

登录成功后，token通过URL参数传递给iframe中的Angular应用：

```
/any-page?token=YOUR_JWT_TOKEN
```

### 2. 支持的URL格式

- 登录页面带token: `/login?token=YOUR_JWT_TOKEN`
- 主页面带token: `/home?token=YOUR_JWT_TOKEN`  
- 任意页面带token: `/any-page?token=YOUR_JWT_TOKEN`
- Angular模块带token: `/oplus/base/#/app/cac?token=YOUR_JWT_TOKEN`

## 代码更改

### 1. URL构建逻辑修改

#### `src/utils/single-iframe-manager.ts`
- 修改 `buildAuthUrl` 方法，添加token参数到URL
- 移除postMessage相关代码
- 简化认证数据传递逻辑

#### `src/components/modules/AngularModuleIframe.vue`
- 修改 `buildModuleUrlWithAuth` 方法
- 使用配置的token参数名
- 移除sessionStorage存储逻辑

#### `src/components/modules/AngularModuleContainer.vue`
- 更新URL构建逻辑
- 添加token参数支持

### 2. 配置文件更新

#### `src/config/module-urls.config.ts`
- 添加iframe配置支持
- 新增 `urlPrefix` 和 `tokenParam` 配置
- 添加获取配置的方法：
  - `getIframeConfig()`
  - `getTokenParam()`
  - `getUrlPrefix()`

### 3. 移除postMessage代码

#### 移除的功能：
- `src/utils/iframe-manager.ts` 中的postMessage广播
- `src/views/Login.vue` 中的iframe消息发送
- 所有sessionStorage认证数据存储
- Angular UI隐藏的postMessage通信

## 配置说明

### 环境配置

```typescript
iframe: {
  urlPrefix: '/iframe',    // URL前缀（暂时未使用）
  tokenParam: 'token'      // token参数名
}
```

### 应用配置

```typescript
interface AppUrlConfig {
  entryUrl: string        // 应用入口URL
  description?: string    // 应用描述
  enabled?: boolean      // 是否启用
  urlPrefix?: string     // URL前缀（用于iframe集成）
}
```

## 使用方式

### Vue主应用集成

```javascript
// Vue主应用代码示例
const iframeUrl = `${angularModuleUrl}?token=${userToken}`;
document.getElementById('angular-iframe').src = iframeUrl;
```

### Angular应用接收

Angular应用需要从URL参数中读取token：

```javascript
// Angular应用中获取token
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

if (token) {
  // 使用token进行认证
  localStorage.setItem('auth_token', token);
}
```

## 测试

创建了测试页面 `src/test-url-generation.html` 用于验证URL生成是否正确。

### 测试内容：
1. 基础URL格式测试
2. 模块URL生成测试
3. Token参数验证

## 优势

1. **简化架构**: 移除了复杂的postMessage通信机制
2. **更好的兼容性**: URL参数方式更通用，支持各种iframe场景
3. **调试友好**: URL中的参数更容易调试和验证
4. **安全性**: 避免了跨域postMessage的安全风险

## 注意事项

1. **Token安全**: URL中的token可能在浏览器历史记录中可见，需要注意安全性
2. **URL长度限制**: 很长的JWT token可能会超出URL长度限制
3. **缓存问题**: 需要确保包含token的URL不被缓存

## 后续优化建议

1. 考虑使用短期token或token引用来减少URL长度
2. 实现token刷新机制
3. 添加token过期处理
4. 考虑HTTPS强制要求以保护URL中的token
