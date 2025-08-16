# OpsMind 开发环境指南

## 快速开始

### 启动开发服务器

```bash
npm run dev
```

### 默认登录凭据

在开发环境下，系统会自动填充默认的登录凭据：

- **用户名**: `admin`
- **密码**: `Oplus@2020`
- **记住我**: 默认勾选

### 快速登录

开发环境下，登录页面会显示一个绿色的"快速登录"按钮，点击即可直接使用默认凭据登录，无需手动输入。

## 开发环境特性

### 1. 自动填充表单

- 登录页面会自动填充默认的用户名和密码
- 开发环境标识会在页面上显示提示信息

### 2. 控制台日志

开发环境启动时，控制台会输出有用的调试信息：

```
🔧 OpsMind 开发环境信息
📝 默认账号: admin
🔑 默认密码: Oplus@2020
⚡ 使用快速登录按钮可直接登录
🌐 API 基础地址: 相对路径
```

### 3. 开发工具

- Vue DevTools 支持
- 热重载 (Hot Reload)
- 源码映射 (Source Maps)
- 详细的错误信息

## 配置文件

开发环境的默认配置位于 `src/config/dev-defaults.js`：

```javascript
export const DEV_DEFAULTS = {
  LOGIN: {
    username: 'admin',
    password: 'Oplus@2020',
    rememberMe: true
  },
  // ... 其他配置
}
```

## 环境变量

开发环境支持以下环境变量：

- `VITE_API_BASE_URL`: API 基础地址
- `VITE_API_TIMEOUT`: API 超时时间
- `NODE_ENV`: 环境标识

## 调试技巧

### 1. 网络请求调试

所有 API 请求都会在控制台输出详细日志，包括：
- 请求 URL
- 请求方法
- 请求参数
- 响应状态

### 2. 认证状态调试

认证相关的操作会输出详细日志：
- 登录过程
- 认证状态变化
- 路由守卫检查

### 3. 路由调试

路由跳转会在控制台显示：
```
🧭 Route: /login → /home
🛡️ Auth Guard: { from: '/login', to: '/home', isAuthenticated: true }
```

## 生产环境差异

在生产环境中：
- 不会显示开发环境提示
- 不会自动填充登录凭据
- 不会显示快速登录按钮
- 控制台日志会被精简

## 故障排除

### 登录失败

1. 检查网络连接
2. 确认后端服务是否启动
3. 查看控制台错误信息
4. 检查 API 代理配置

### 页面无法加载

1. 确认开发服务器是否正常启动
2. 检查端口是否被占用
3. 清除浏览器缓存
4. 重启开发服务器

### 认证问题

1. 清除浏览器存储 (localStorage/sessionStorage)
2. 检查认证服务配置
3. 确认 token 格式是否正确

## 相关文件

- `src/views/Login.vue` - 登录页面组件
- `src/core/auth/index.js` - 认证服务
- `src/config/dev-defaults.js` - 开发环境配置
- `src/core/router/guards/auth.js` - 认证路由守卫
