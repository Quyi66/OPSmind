<template>
  <div class="kpi-cards" v-loading="loading">
    <div
      v-for="item in processedData"
      :key="item.name"
      class="kpi-card"
      :class="getThemeClass(item)"
      @click="handleClick(item)"
    >
      <div class="kpi-main">
        <div class="kpi-label">{{ item.name }}</div>
        <div class="kpi-value">{{ item.value }}</div>
      </div>
      <div class="kpi-icon">
        <i :class="['fa', item.icon]"></i>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

// KPI 定义映射
const kpiDefs = {
  'recently_ok': {
    title: '最近一次连通成功设备',
    icon: 'fa-check',
    order: 0,
    theme: 'success'
  },
  'oplus_all': {
    title: '所有连通异常设备',
    icon: 'fa-exclamation',
    order: 1,
    theme: 'warning'
  },
  'today': {
    title: '当日异常设备',
    icon: 'fa-exclamation-triangle',
    order: 2,
    theme: 'orange'
  },
  'recently': {
    title: '最近一次连通失败设备',
    icon: 'fa-times',
    order: 3,
    theme: 'danger'
  },
  'low': {
    title: '连通率小于50%设备',
    icon: 'fa-sync',
    order: 4,
    theme: 'info'
  }
}

// 处理数据
const processedData = computed(() => {
  const result = []

  props.data.forEach(rec => {
    const def = kpiDefs[rec.condi]
    if (def) {
      result.push({
        name: def.title,
        value: rec.c,
        icon: def.icon,
        theme: def.theme,
        pageParam: rec.condi,
        _order: def.order
      })
    }
  })

  // 按 order 排序
  return result.sort((a, b) => a._order - b._order)
})

function getThemeClass(item) {
  return `theme-${item.theme}`
}

function handleClick(item) {
  emit('click', {
    conditions: item.pageParam
  })
}
</script>

<style scoped lang="scss">
.kpi-cards {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.kpi-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 180px;
  flex: 1;
  color: #fff;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &.theme-success {
    background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
  }

  &.theme-warning {
    background: linear-gradient(135deg, #e6a23c 0%, #ebb563 100%);
  }

  &.theme-orange {
    background: linear-gradient(135deg, #f5a623 0%, #f8c261 100%);
  }

  &.theme-danger {
    background: linear-gradient(135deg, #909399 0%, #a6a9ad 100%);
  }

  &.theme-info {
    background: linear-gradient(135deg, #13c2c2 0%, #36cfc9 100%);
  }
}

.kpi-main {
  display: flex;
  flex-direction: column;
}

.kpi-label {
  font-size: 13px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.kpi-value {
  font-size: 32px;
  font-weight: 600;
  line-height: 1;
}

.kpi-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  opacity: 0.8;
}
</style>
