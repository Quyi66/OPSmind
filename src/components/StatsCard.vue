<template>
  <div class="stats-card" @click="$emit('click')">
    <div class="stats-icon">
      <i :class="icon" :style="{ color: iconColor }"></i>
    </div>
    <div class="stats-content">
      <div class="stats-value">{{ formattedValue }}</div>
      <div class="stats-title">{{ title }}</div>
      <div v-if="trend" class="stats-trend" :class="trendClass">
        <i :class="trendIcon"></i>
        <span>{{ trendText }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  value: {
    type: [Number, String],
    required: true
  },
  icon: {
    type: String,
    default: 'fa-chart-bar'
  },
  iconColor: {
    type: String,
    default: '#1890ff'
  },
  trend: {
    type: Object,
    default: null
    // 格式: { type: 'up|down|stable', value: number, text: string }
  }
})

const emit = defineEmits(['click'])

const formattedValue = computed(() => {
  if (typeof props.value === 'number') {
    // 格式化数字，添加千分位分隔符
    return props.value.toLocaleString()
  }
  return props.value
})

const trendClass = computed(() => {
  if (!props.trend) return ''
  
  switch (props.trend.type) {
    case 'up':
      return 'trend-up'
    case 'down':
      return 'trend-down'
    case 'stable':
      return 'trend-stable'
    default:
      return ''
  }
})

const trendIcon = computed(() => {
  if (!props.trend) return ''
  
  switch (props.trend.type) {
    case 'up':
      return 'fa-arrow-up'
    case 'down':
      return 'fa-arrow-down'
    case 'stable':
      return 'fa-minus'
    default:
      return ''
  }
})

const trendText = computed(() => {
  if (!props.trend) return ''
  return props.trend.text || `${props.trend.value}%`
})
</script>

<style scoped lang="scss">
.stats-card {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 20px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }
}

.stats-icon {
  flex: 0 0 auto;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(24, 144, 255, 0.1);
  border-radius: 50%;
  font-size: 24px;
}

.stats-content {
  flex: 1;
  min-width: 0;
}

.stats-value {
  font-size: 32px;
  font-weight: 700;
  color: #262626;
  line-height: 1.2;
  margin-bottom: 4px;
}

.stats-title {
  font-size: 14px;
  color: #8c8c8c;
  margin-bottom: 8px;
}

.stats-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  
  &.trend-up {
    color: #52c41a;
  }
  
  &.trend-down {
    color: #f5222d;
  }
  
  &.trend-stable {
    color: #faad14;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .stats-card {
    padding: 16px;
    gap: 16px;
  }
  
  .stats-icon {
    width: 48px;
    height: 48px;
    font-size: 20px;
  }
  
  .stats-value {
    font-size: 24px;
  }
}

@media (max-width: 576px) {
  .stats-card {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  
  .stats-icon {
    width: 56px;
    height: 56px;
    font-size: 22px;
  }
}
</style>
