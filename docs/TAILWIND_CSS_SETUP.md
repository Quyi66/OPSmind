# Tailwind CSS v4 配置完整指南

## 🎯 问题解决

成功解决了 Tailwind CSS v4 在 Vite + Vue 3 项目中的配置问题。

## ✅ 最终工作配置

### 1. 依赖安装

```bash
npm install -D tailwindcss@^4.1.12 @tailwindcss/postcss@^4.1.12 postcss autoprefixer
```

### 2. 配置文件

#### `tailwind.config.js`
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
```

#### `postcss.config.js`
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

### 3. 样式文件配置

#### `src/styles/main.scss`
```scss
// 导入变量 (必须在最前面)
@use './variables.scss' as *;

// Tailwind CSS
@tailwind base;
@tailwind components;
@tailwind utilities;

// 其他全局样式...
```

#### `src/main.js`
```javascript
import '@/styles/main.scss'
```

## 🔧 关键修复点

### 1. Tailwind CSS v4 变化
- ✅ 使用 `@tailwindcss/postcss` 而不是 `tailwindcss` 作为 PostCSS 插件
- ✅ 配置文件使用 ES 模块语法 (`export default`)

### 2. 解决样式冲突
- ✅ 注释掉与 Tailwind 冲突的自定义工具类
- ✅ 确保 Tailwind 指令在正确位置
- ✅ 移除重复的 CSS 配置

### 3. Vite 配置清理
- ✅ 移除重复的 `css` 配置块
- ✅ 依赖 `postcss.config.js` 而不是内联配置

## 📝 登录页面模板

```vue
<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 relative overflow-hidden">
    <!-- Background Pattern -->
    <div class="absolute inset-0 opacity-20">
      <div class="absolute top-20 left-20 w-2 h-2 bg-white rounded-full"></div>
      <!-- 更多装饰点... -->
    </div>

    <!-- Header -->
    <header class="relative z-10 p-6">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
          <div class="w-6 h-6 bg-white rounded transform rotate-45"></div>
        </div>
        <span class="text-white text-xl font-bold">OpsMind</span>
      </div>
    </header>

    <!-- Main Content -->
    <div class="relative z-10 flex items-center justify-center min-h-[calc(100vh-120px)]">
      <div class="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full mx-4">
        <div class="flex">
          <!-- Left Side - Illustration -->
          <div class="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-50 to-blue-100 items-center justify-center p-12">
            <!-- 3D插图内容 -->
          </div>

          <!-- Right Side - Login Form -->
          <div class="w-full md:w-1/2 p-12">
            <div class="max-w-sm mx-auto">
              <h2 class="text-2xl font-bold text-gray-800 mb-8 text-center">用户登录</h2>
              
              <form @submit.prevent="handleLogin" class="space-y-6">
                <div>
                  <input
                    v-model="loginForm.username"
                    type="text"
                    placeholder="用户名"
                    class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                    required
                  />
                </div>
                
                <div>
                  <input
                    v-model="loginForm.password"
                    type="password"
                    placeholder="密码"
                    class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                    required
                  />
                </div>
                
                <div class="flex items-center">
                  <input
                    v-model="loginForm.rememberMe"
                    type="checkbox"
                    id="remember"
                    class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label for="remember" class="ml-2 text-sm text-gray-600">
                    保持登录状态
                  </label>
                </div>
                
                <button
                  type="submit"
                  class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 font-medium"
                  :disabled="loading"
                >
                  <span v-if="loading">登录中...</span>
                  <span v-else>登录</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 自定义动画 */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}
</style>
```

## 🚀 验证步骤

1. **清除缓存**: `rm -rf node_modules/.vite`
2. **重启服务器**: `npm run dev`
3. **访问测试页面**: `http://localhost:5174/ops/tailwind-test`
4. **检查登录页面**: `http://localhost:5174/ops/`

## 📋 常见问题排查

### 样式不生效？
1. 检查 `content` 配置是否包含所有文件
2. 确认 PostCSS 配置使用 `@tailwindcss/postcss`
3. 检查是否有自定义 CSS 覆盖 Tailwind 类
4. 清除 Vite 缓存重启

### 构建错误？
1. 确保使用 ES 模块语法
2. 检查 Vite 配置中没有重复的 CSS 配置
3. 确认依赖版本兼容性

## ✅ 成功标志

- ✅ 开发服务器启动无错误
- ✅ Tailwind 类名正常生效
- ✅ 自定义动画工作正常
- ✅ 响应式设计正常
- ✅ 登录页面样式完美呈现

现在 Tailwind CSS v4 已经完全配置成功！🎉
