<template>
  <div class="kpi-cards" v-loading="loading">
    <div
      v-for="item in processedData"
      :key="item.name"
      class="kpi-card"
      :class="getThemeClass(item)"
      @click="handleClick(item)"
    >
      <div class="kpi-icon">
        <i :class="['fa', item.icon]"></i>
      </div>
      <div class="kpi-content">
        <div class="kpi-value">{{ item.value }}</div>
        <div class="kpi-name">{{ item.name }}</div>
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
    title: '最近正常',
    icon: 'fa-check',
    order: 0,
    theme: 'success'
  },
  'oplus_all': {
    title: '异常总计',
    icon: 'fa-exclamation',
    order: 1,
    theme: 'warning'
  },
  'today': {
    title: '今日异常',
    icon: 'fa-exclamation-triangle',
    order: 2,
    theme: 'warning'
  },
  'recently': {
    title: '最近异常',
    icon: 'fa-times',
    order: 3,
    theme: 'warning'
  },
  'low': {
    title: '低频访问',
    icon: 'fa-bomb',
    order: 4,
    theme: 'danger'
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
  gap: 12px;
  padding: 16px 20px;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 160px;
  flex: 1;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &.theme-success {
    border-left: 4px solid #67c23a;

    .kpi-icon {
      color: #67c23a;
      background: rgba(103, 194, 58, 0.1);
    }
  }

  &.theme-warning {
    border-left: 4px solid #e6a23c;

    .kpi-icon {
      color: #e6a23c;
      background: rgba(230, 162, 60, 0.1);
    }
  }

  &.theme-danger {
    border-left: 4px solid #f56c6c;

    .kpi-icon {
      color: #f56c6c;
      background: rgba(245, 108, 108, 0.1);
    }
  }
}

.kpi-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 18px;
}

.kpi-content {
  flex: 1;
}

.kpi-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  line-height: 1.2;
}

.kpi-name {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}
</style>
