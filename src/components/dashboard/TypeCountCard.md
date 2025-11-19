# TypeCountCard 组件

一个通用的类型数量统计卡片组件，用于显示带图标的统计信息。

## 功能特点

- 左侧图标，右侧两行文字的布局
- 图标位于上半部分
- 第一行显示类型名称，第二行显示数量（加粗、大号字体）
- 支持点击事件
- 响应式设计
- 数字自动格式化（千分位分隔符）

## Props

| 属性名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| typeName | String | 是 | - | 类型名称 |
| count | Number/String | 是 | - | 数量值 |
| icon | String | 是 | - | 图标类名或图片URL |
| iconColor | String | 否 | '#1890ff' | 图标颜色（仅字体图标有效） |
| iconType | String | 否 | 'font' | 图标类型：'font'（字体图标）或 'image'（图片图标） |

## Events

| 事件名 | 说明 | 参数 |
|--------|------|------|
| click | 卡片被点击时触发 | - |

## 使用示例

### 基础用法

```vue
<template>
  <TypeCountCard
    type-name="REST作业"
    :count="78"
    icon="fas fa-globe"
    icon-color="#3b82f6"
    @click="handleClick"
  />
</template>

<script setup>
import TypeCountCard from './TypeCountCard.vue'

const handleClick = () => {
  //console.log('卡片被点击')
}
</script>
```

### 批量使用

```vue
<template>
  <div class="stats-container">
    <TypeCountCard
      v-for="stat in stats"
      :key="stat.id"
      :type-name="stat.name"
      :count="stat.count"
      :icon="stat.icon"
      :icon-color="stat.color"
      @click="handleStatClick(stat.id)"
    />
  </div>
</template>

<script setup>
import TypeCountCard from './TypeCountCard.vue'

const stats = ref([
  {
    id: 'rest-jobs',
    name: 'REST作业',
    count: 78,
    icon: 'fas fa-globe',
    color: '#3b82f6'
  },
  {
    id: 'command-jobs',
    name: '命令作业',
    count: 2,
    icon: 'fas fa-terminal',
    color: '#f97316'
  },
  {
    id: 'script-jobs',
    name: '脚本作业',
    count: 56,
    icon: 'fas fa-file-code',
    color: '#10b981'
  }
])

const handleStatClick = (statId) => {
  //console.log('点击了统计项:', statId)
}
</script>

<style scoped>
.stats-container {
  display: flex;
  gap: 16px;
}
</style>
```

## 样式定制

组件使用 scoped 样式，如需自定义样式，可以通过以下方式：

1. 使用 CSS 变量（如果组件支持）
2. 通过父组件的样式覆盖
3. 修改组件源码中的样式

## 响应式行为

- 在小屏幕设备上，组件会自动调整尺寸
- 图标和文字大小会相应缩放
- 保持良好的可读性和可点击性
