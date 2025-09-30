# OpsMind Vue 3 仪表盘

这是 OpsMind 系统的新一代 Vue 3 仪表盘，与现有 AngularJS 应用无缝集成。

## 功能特性

- 🚀 基于 Vue 3 + Vite 构建
- 📱 响应式设计，支持移动端
- 🎨 使用 Element Plus UI 组件库
- 🔄 与 AngularJS 应用数据同步
- 🎯 模块化架构，易于扩展
- 🌐 支持国际化

## 技术栈

- **前端框架**: Vue 3
- **构建工具**: Vite
- **UI 组件库**: Element Plus
- **状态管理**: Pinia
- **路由**: Vue Router
- **样式**: SCSS
- **图标**: FontAwesome + 自定义图标

## 快速开始

### 1. 环境要求

- Node.js 16+
- npm 7+ 或 yarn 1.22+ 或 pnpm 6+

### 2. 安装依赖

```bash
# 使用 npm
npm install

# 或使用 yarn
yarn install

# 或使用 pnpm
pnpm install
```

### 3. 启动开发服务器

```bash
# 使用便捷脚本（推荐）
./scripts/dev.sh

# 或直接使用 npm
npm run dev

# 或使用 yarn
yarn dev
```

### 4. 访问应用

- Vue 仪表盘: http://localhost:5173
- AngularJS 主应用: http://localhost:3000/oplus/base/

### 5. 开发工具

```bash
# 代码检查
npm run lint

# 运行测试
npm run test

# 测试覆盖率
npm run test:coverage

# 代码格式化
npm run format
```

## 项目结构

```
src/opsmind/
├── src/
│   ├── components/          # Vue 组件
│   │   ├── ai/              # AI 助手相关组件
│   │   ├── angular/         # AngularJS 集成组件（含 modules/ 子目录）
│   │   ├── auth/            # 认证与登录组件
│   │   ├── dashboard/       # 仪表盘业务组件
│   │   ├── layout/          # 布局与导航组件
│   │   └── shared/          # 通用复用组件
│   ├── views/              # 页面视图
│   │   ├── Dashboard.vue
│   │   └── About.vue
│   ├── stores/             # Pinia 状态管理
│   │   └── dashboard.js
│   ├── services/           # 服务层
│   │   └── angularjs-bridge.js
│   ├── styles/             # 样式文件
│   │   ├── variables.scss
│   │   └── main.scss
│   ├── router/             # 路由配置
│   │   └── index.js
│   └── main.js             # 应用入口
├── package.json
├── vite.config.ts
└── index.html
```

## 与 AngularJS 集成

### 数据通信

Vue 应用通过 `AngularJSBridge` 服务与 AngularJS 应用进行数据通信：

```javascript
import { angularBridge } from '@/services/angularjs-bridge'

// 获取可用模块
const modules = await angularBridge.getAvailableModules()

// 打开模块
await angularBridge.openModule('__jao')

// 获取用户信息
const user = await angularBridge.getCurrentUser()
```

### 消息传递

通过 PostMessage API 实现跨应用通信：

```javascript
// Vue 应用发送消息
window.parent.postMessage({
  type: 'OPEN_MODULE',
  payload: { moduleCode: '__jao' }
}, '*')

// AngularJS 应用处理消息
window.addEventListener('message', (event) => {
  if (event.data.type === 'OPEN_MODULE') {
    // 处理模块打开请求
  }
})
```

## 开发指南

### 添加新组件

1. 在 `src/components/` 目录下创建 Vue 组件
2. 使用 Element Plus 组件库
3. 遵循现有的样式规范

### 添加新页面

1. 在 `src/views/` 目录下创建页面组件
2. 在 `src/router/index.js` 中添加路由配置

### 样式开发

- 使用 SCSS 预处理器
- 遵循 BEM 命名规范
- 使用响应式设计

## 构建部署

### 开发构建

```bash
# 开发环境构建（包含 source map）
npm run build:dev

# 或使用构建脚本
./scripts/build.sh dev
```

### 生产构建

```bash
# 生产环境构建（优化压缩）
npm run build:prod

# 或使用构建脚本（包含测试）
./scripts/build.sh prod
```

### 预览构建结果

```bash
# 预览构建结果
npm run preview

# 构建并预览
npm run preview:build
```

### 可用脚本

| 脚本 | 描述 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run build:dev` | 开发构建 |
| `npm run build:prod` | 生产构建（优化） |
| `npm run preview` | 预览构建结果 |
| `npm run lint` | 代码检查并修复 |
| `npm run lint:check` | 仅检查代码 |
| `npm run test` | 运行测试（监视模式） |
| `npm run test:run` | 运行测试（单次） |
| `npm run test:ui` | 测试 UI 界面 |
| `npm run test:coverage` | 测试覆盖率 |
| `npm run format` | 格式化代码 |
| `npm run clean` | 清理构建缓存 |

### 部署配置

生产环境需要配置 Nginx 代理：

```nginx
# Vue 应用
location /opsmind/base/ {
    alias /path/to/dist/;
    try_files $uri $uri/ /opsmind/base/index.html;

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# API 代理
location /oplus-portal/ {
    proxy_pass http://backend-server/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## 故障排除

### 常见问题

1. **Vue 应用无法加载**
   - 检查端口 5173 是否被占用
   - 确认 Vue dev server 已启动

2. **模块跳转失败**
   - 检查 AngularJS 桥接服务是否正常
   - 确认模块代码是否正确

3. **样式显示异常**
   - 检查 Element Plus 样式是否正确加载
   - 确认自定义样式路径

### 调试技巧

- 使用浏览器开发者工具查看控制台日志
- 检查 Network 面板的请求状态
- 使用 Vue DevTools 调试组件状态

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request

## 许可证

本项目采用 MIT 许可证。
