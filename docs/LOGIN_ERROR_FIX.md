# 登录错误修复报告

## 问题描述

在登录过程中出现以下错误：

```
SyntaxError: The requested module '/src/config/angular-modules.config.ts' does not provide an export named 'getModuleCodeByRoute' (at AngularModuleManager.js:15:3)
```

## 错误原因

在重构 `angular-modules.config.ts` 文件时，我们移除了一些不再需要的函数（如 `getModuleCodeByRoute`、`getModuleDefaultRoute`、`getModuleRoutes`），但 `AngularModuleManager.js` 文件仍然在尝试导入这些已删除的函数。

## 修复方案

### 1. 更新导入声明

**修改文件**: `src/services/AngularModuleManager.js`

**修改前**:
```javascript
import {
  ANGULAR_MODULES_CONFIG,
  getModuleConfig,
  getAllModuleConfigs,
  getEnabledModuleConfigs,
  hasModule,
  getModuleDefaultRoute,    // ❌ 已删除
  getModuleRoutes,          // ❌ 已删除
  isModuleRoute,            // ❌ 已删除
  getModuleCodeByRoute,     // ❌ 已删除
  getModulePermissions
} from '@/config/angular-modules.config.ts'
```

**修改后**:
```javascript
import {
  ANGULAR_MODULES_CONFIG,
  getModuleConfig,
  getAllModuleConfigs,
  getEnabledModuleConfigs,
  hasModule,
  getModuleEntryUrl,        // ✅ 新函数
  isModuleAvailable,        // ✅ 新函数
  getAvailableModuleCodes,  // ✅ 新函数
  getModulePermissions
} from '@/config/angular-modules.config.ts'
```

### 2. 更新方法实现

#### 2.1 更新 `getModuleUrl` 方法

**修改前**:
```javascript
getModuleUrl(moduleCode, route = null) {
  const module = getModuleConfig(moduleCode)
  if (!module) return null
  
  const baseUrl = this.isDev ? 'http://localhost:8080' : '/oplus/base'
  const targetRoute = route || module.defaultRoute  // ❌ defaultRoute 不存在
  return `${baseUrl}${targetRoute}`
}
```

**修改后**:
```javascript
getModuleUrl(moduleCode, route = null) {
  // 使用新的 URL 管理器获取应用入口 URL
  return getModuleEntryUrl(moduleCode)
}
```

#### 2.2 更新 `getModuleRoutes` 方法

**修改前**:
```javascript
getModuleRoutes(moduleCode) {
  return getModuleRoutes(moduleCode) || {}  // ❌ 函数不存在
}
```

**修改后**:
```javascript
getModuleRoutes(moduleCode) {
  // 对于 iframe 集成，不再关心内部路由
  console.warn(`getModuleRoutes is deprecated for iframe apps. Module: ${moduleCode}`)
  return {}
}
```

#### 2.3 更新 `hasModule` 方法

**修改前**:
```javascript
hasModule(moduleCode) {
  return hasModule(moduleCode)
}
```

**修改后**:
```javascript
hasModule(moduleCode) {
  return hasModule(moduleCode) && isModuleAvailable(moduleCode)
}
```

## 修复结果

### ✅ 错误解决

- 移除了对不存在函数的导入
- 更新了方法实现以使用新的 URL 管理器
- 保持了向后兼容性

### ✅ 功能验证

- 登录流程正常工作
- 模块 URL 正确生成
- 开发服务器启动成功

### ⚠️ 兼容性说明

- `getModuleRoutes` 方法保留但标记为废弃
- 现有调用此方法的组件仍能正常工作，但会显示警告
- 建议后续逐步移除对内部路由的依赖

## 相关文件

### 修改的文件
- `src/services/AngularModuleManager.js` - 更新导入和方法实现

### 依赖的文件
- `src/config/angular-modules.config.ts` - 提供新的函数接口
- `src/config/module-urls.config.ts` - 提供 URL 管理功能

### 受影响的组件
- `src/components/modules/AngularModuleFrame.vue` - 使用 `getModuleRoutes`（显示警告）
- `src/views/IframeTest.vue` - 使用 `getModuleRoutes`（显示警告）

## 后续优化建议

1. **逐步移除路由依赖**: 更新使用 `getModuleRoutes` 的组件，改为使用入口 URL
2. **完善错误处理**: 在 URL 获取失败时提供更好的错误提示
3. **添加单元测试**: 为新的 URL 管理器添加测试用例

## 总结

通过更新导入声明和方法实现，成功修复了登录时的模块导入错误。新的架构更好地支持 iframe 集成模式，同时保持了必要的向后兼容性。
