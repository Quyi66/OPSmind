<template>
  <div class="stats-strip" aria-label="检查项结果统计">
    <div class="stats-strip-header">
      <span class="stats-strip-title">检查结果统计</span>
      <span class="stats-strip-hint">点击数值查看明细 · 共 {{ totalCount.toLocaleString() }} 项</span>
    </div>

    <div class="stats-strip-items">
      <button
        v-for="stat in cards"
        :key="stat.name"
        type="button"
        class="stat-metric-item"
        :class="stat.theme"
        @click="$emit('click', stat.statusKey)"
      >
        <span class="stat-metric-label">
          <span class="stat-dot" aria-hidden="true"></span>
          <span>{{ stat.label }}</span>
        </span>
        <span class="stat-metric-numbers">
          <strong class="stat-value">{{ stat.value.toLocaleString() }}</strong>
          <span class="stat-percent">{{ stat.percent }}%</span>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { STATISTICS_CARD_CONFIG } from '../../constants/status'

const props = defineProps({
  statistics: {
    type: Object,
    required: true
  }
})

defineEmits(['click'])

const totalCount = computed(() =>
  STATISTICS_CARD_CONFIG.reduce((sum, config) => sum + (Number(props.statistics[config.name]) || 0), 0)
)

const cards = computed(() =>
  STATISTICS_CARD_CONFIG.map(config => {
    const value = Number(props.statistics[config.name]) || 0
    const percent = totalCount.value > 0 ? Math.round((value / totalCount.value) * 1000) / 10 : 0
    return {
      ...config,
      value,
      percent,
      statusKey: config.name
    }
  })
)
</script>

<style scoped lang="scss">
.stats-strip {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  min-width: 0;
}

.stats-strip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.stats-strip-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.stats-strip-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.stats-strip-items {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-fill-color-blank);
  overflow: hidden;
}

.stat-metric-item {
  appearance: none;
  border: none;
  border-right: 1px solid var(--el-border-color-lighter);
  background: transparent;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:last-child {
    border-right: none;
  }

  &:hover {
    background: var(--el-fill-color-light);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: -2px;
  }
}

.stat-metric-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}

.stat-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--el-text-color-secondary);
}

.stat-metric-numbers {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  width: 100%;
  gap: 6px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-primary);
}

.stat-percent {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);
}

.theme-success {
  .stat-dot {
    background: var(--el-color-success);
  }
}

.theme-danger {
  .stat-dot {
    background: var(--el-color-danger);
  }
  .stat-value {
    color: var(--el-color-danger);
  }
}

.theme-info {
  .stat-dot {
    background: var(--el-color-primary);
  }
}

.theme-secondary {
  .stat-dot {
    background: var(--el-text-color-secondary);
  }
}

.theme-warning {
  .stat-dot {
    background: var(--el-color-warning);
  }
}

@media (max-width: 960px) {
  .stats-strip-items {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .stat-metric-item {
    border-bottom: 1px solid var(--el-border-color-lighter);
  }
}
</style>
