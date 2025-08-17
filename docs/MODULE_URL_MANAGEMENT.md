# 模块 URL 配置管理方案

## 设计理念

基于您的建议，我们将 iframe 集成应用的 URL 配置从模块配置中抽取出来，单独维护。这样做的好处是：

1. **关注点分离**: 模块配置专注于业务逻辑，URL 配置专注于技术实现
2. **环境隔离**: 不同环境的 URL 配置独立管理
3. **维护简化**: URL 变更不影响模块业务配置
4. **iframe 友好**: 只关心应用入口，不关心内部路由

## 架构设计

### 配置文件结构

```
src/config/
├── angular-modules.config.ts    # 模块业务配置（名称、图标、功能等）
└── module-urls.config.ts        # 应用 URL 配置（入口地址、环境配置）
```

### 核心概念

- **应用 (App)**: iframe 中运行的独立应用
- **入口 URL**: 应用的访问地址，不关心内部路由
- **环境配置**: 开发/生产/测试环境的不同 URL

## 配置示例

### 1. 应用 URL 配置 (`module-urls.config.ts`)

```typescript
// 应用 URL 配置 - 只配置入口 URL，不关心内部路由
const APP_URLS_CONFIG: Record<string, AppUrlConfig> = {
  cac: {
    entryUrl: '#/cac',
    description: 'CAC 配置审计与合规性检查应用',
    enabled: true
  },
  jao: {
    entryUrl: '#/jao',
    description: 'JAO 作业编排应用',
    enabled: true
  }
  // ... 其他应用
}

// 环境配置
const ENVIRONMENT_CONFIGS: Record<Environment, EnvironmentConfig> = {
  development: {
    angularjs: {
      baseUrl: 'http://localhost:8080/oplus/base',
      hashMode: true
    }
  },
  production: {
    angularjs: {
      baseUrl: '/oplus/base',
      hashMode: true
    }
  }
}
```

### 2. 模块业务配置 (`angular-modules.config.ts`)

```typescript
export const ANGULAR_MODULES_CONFIG: AngularModulesConfig = {
  cac: {
    code: 'cac',
    name: 'CAC 配置管理',
    title: '配置审计与合规性检查',
    icon: 'fa-cogs',
    color: '#28a745',
    description: '系统配置审计、合规性检查和配置管理',
    angularModule: 'oplus.cac',
    features: ['配置检查', '合规审计', '模板管理', '主机管理', '脚本管理']
  }
  // 不再包含 entryUrl、routes、defaultRoute 等 URL 相关配置
}
```

## 使用方法

### 1. 获取应用 URL

```typescript
import { appUrlManager } from '@/config/module-urls.config'

// 获取 CAC 应用的完整 URL
const cacUrl = appUrlManager.getAppUrl('cac')
// 结果: http://localhost:8080/oplus/base/#/cac (开发环境)
// 结果: /oplus/base/#/cac (生产环境)

// 检查应用是否可用
const isAvailable = appUrlManager.hasApp('cac')

// 获取所有可用应用
const availableApps = appUrlManager.getAvailableApps()
```

### 2. 在组件中使用

```vue
<template>
  <iframe 
    :src="moduleUrl" 
    width="100%" 
    height="600px"
    frameborder="0">
  </iframe>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { appUrlManager } from '@/config/module-urls.config'

const props = defineProps<{
  moduleCode: string
}>()

const moduleUrl = computed(() => {
  return appUrlManager.getAppUrl(props.moduleCode)
})
</script>
```

### 3. 动态配置管理

```typescript
// 添加新应用配置
appUrlManager.addAppConfig('newApp', {
  entryUrl: '#/newapp',
  description: '新应用',
  enabled: true
})

// 更新应用配置
appUrlManager.updateAppConfig('cac', {
  enabled: false  // 禁用 CAC 应用
})

// 切换环境（用于测试）
appUrlManager.switchEnvironment('test')
```

## 环境配置

### 开发环境
- **AngularJS 基础 URL**: `http://localhost:8080/oplus/base`
- **CAC 应用完整 URL**: `http://localhost:8080/oplus/base/#/cac`

### 生产环境
- **AngularJS 基础 URL**: `/oplus/base`
- **CAC 应用完整 URL**: `/oplus/base/#/cac`

### 测试环境
- **AngularJS 基础 URL**: `http://test-server:8080/oplus/base`
- **CAC 应用完整 URL**: `http://test-server:8080/oplus/base/#/cac`

## 优势总结

### 1. 可维护性提升
- **单一职责**: 每个配置文件只关注自己的领域
- **变更隔离**: URL 变更不影响业务配置
- **环境管理**: 统一的环境配置管理

### 2. iframe 集成友好
- **入口导向**: 只关心应用入口，不关心内部实现
- **黑盒处理**: 应用内部路由由应用自己管理
- **简化配置**: 减少不必要的路由配置

### 3. 开发体验改善
- **类型安全**: 完整的 TypeScript 类型支持
- **智能提示**: IDE 自动补全和错误检查
- **配置验证**: 运行时配置有效性检查

### 4. 部署灵活性
- **环境适配**: 自动适配不同部署环境
- **动态配置**: 支持运行时配置更新
- **功能开关**: 支持应用级别的启用/禁用

## 迁移指南

如果您有现有的模块配置需要迁移：

1. **提取 URL 配置**: 将 `entryUrl`、`routes` 等移到 `module-urls.config.ts`
2. **简化模块配置**: 保留业务相关的配置项
3. **更新使用方式**: 使用 `appUrlManager` 获取 URL
4. **测试验证**: 确保各环境下 URL 正确生成

这种设计更符合 iframe 集成的实际需求，提供了更好的可维护性和扩展性。
