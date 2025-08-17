# postMessage 序列化错误修复

## 问题描述

在发送认证数据到 iframe 时出现以下错误：

```
DataCloneError: Failed to execute 'postMessage' on 'Window': #<Object> could not be cloned.
```

## 错误原因

`postMessage` API 使用结构化克隆算法来序列化数据，但某些对象类型无法被序列化：

1. **函数**: 对象中包含方法或函数
2. **循环引用**: 对象之间存在循环引用
3. **特殊对象**: DOM 节点、Error 对象等
4. **Symbol**: Symbol 类型的属性
5. **Proxy 对象**: 代理对象

## 修复方案

### 1. 创建可序列化的用户对象

**修改前**:
```javascript
const authData = {
  token,
  user, // ❌ 原始用户对象可能包含不可序列化的属性
  timestamp: Date.now()
}
```

**修改后**:
```javascript
// 创建可序列化的用户对象，只包含基本属性
const serializableUser = {
  id: user.id,
  login: user.login,
  name: user.name,
  email: user.email,
  role: user.role,
  tenantId: user.tenantId,
  permissions: user.permissions,
  // 只包含基本的可序列化属性
}

const authData = {
  token,
  user: serializableUser, // ✅ 可序列化的用户对象
  timestamp: Date.now()
}
```

### 2. 确保数据完全可序列化

```javascript
// 发送消息到iframe - 确保数据可序列化
moduleIframe.value.contentWindow.postMessage(
  {
    type: 'vue-auth-data',
    authData: JSON.parse(JSON.stringify(authData)) // ✅ 深度克隆确保可序列化
  },
  '*'
)
```

### 3. 更新存储数据

```javascript
// 同时设置到sessionStorage供iframe使用
sessionStorage.setItem('vue-auth-bridge', JSON.stringify(authData))
sessionStorage.setItem('oplus_token', token)
sessionStorage.setItem('oplus_user', JSON.stringify(serializableUser)) // ✅ 使用可序列化对象
```

## 技术细节

### 结构化克隆算法支持的类型

✅ **支持的类型**:
- 基本类型: `string`, `number`, `boolean`, `null`, `undefined`
- 对象: `Object`, `Array`
- 日期: `Date`
- 正则表达式: `RegExp`
- 类型化数组: `ArrayBuffer`, `Uint8Array` 等
- `Map`, `Set`

❌ **不支持的类型**:
- 函数: `function`
- Symbol
- DOM 节点
- Error 对象
- 包含循环引用的对象

### 最佳实践

1. **显式定义可序列化属性**
```javascript
const serializableData = {
  id: obj.id,
  name: obj.name,
  // 只包含需要的基本属性
}
```

2. **使用 JSON 序列化测试**
```javascript
try {
  JSON.stringify(data) // 如果成功，通常可以通过 postMessage
} catch (e) {
  console.error('Data not serializable:', e)
}
```

3. **深度克隆确保安全**
```javascript
const clonedData = JSON.parse(JSON.stringify(originalData))
```

## 验证方法

### 1. 控制台检查

修复后，应该能在控制台看到：
```
🔗 Auth data sent to iframe: { hasToken: true, userLogin: "admin", tenantId: "xxx" }
```

### 2. 存储检查

在浏览器开发者工具中检查 sessionStorage：
```javascript
// 应该能看到这些键值
sessionStorage.getItem('vue-auth-bridge')
sessionStorage.getItem('oplus_token')
sessionStorage.getItem('oplus_user')
```

### 3. iframe 接收验证

在 iframe 中应该能接收到消息：
```javascript
window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'vue-auth-data') {
    console.log('✅ 成功接收认证数据:', event.data.authData)
  }
})
```

## 相关修改

### 文件: `src/components/modules/AngularModuleFrame.vue`

1. **导入修复**: 将 `require` 改为 `import`
2. **序列化修复**: 创建可序列化的用户对象
3. **深度克隆**: 确保 postMessage 数据完全可序列化

### 影响范围

- ✅ Vue 到 iframe 的认证数据传递
- ✅ sessionStorage 中的认证数据存储
- ✅ postMessage 通信稳定性

## 测试建议

1. **登录测试**: 完成登录后点击模块
2. **控制台监控**: 查看是否有错误信息
3. **存储检查**: 验证认证数据是否正确存储
4. **iframe 通信**: 确认 iframe 能接收到认证数据

这个修复确保了认证数据能够安全、稳定地传递给 iframe 中的 AngularJS 应用。
