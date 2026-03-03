<template>
  <div class="stats-container">
    <div
      v-for="stat in cards"
      :key="stat.name"
      class="stat-card"
      :class="stat.theme"
      @click="$emit('click', stat.statusKey)"
    >
      <div class="stat-value">{{ stat.value }}</div>
      <div class="stat-label">{{ stat.label }}</div>
      <div class="stat-icon">
        <i :class="stat.icon"></i>
      </div>
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

const cards = computed(() =>
  STATISTICS_CARD_CONFIG.map(config => ({
    ...config,
    value: props.statistics[config.name] || 0,
    statusKey: config.name
  }))
)
</script>

<style scoped lang="scss">
.stats-container {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
}

.stat-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #fff;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .stat-value {
    font-size: 32px;
    font-weight: bold;
    line-height: 1;
  }

  .stat-label {
    font-size: 13px;
    opacity: 0.9;
    margin-top: 4px;
  }

  .stat-icon {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 40px;
    opacity: 0.3;
  }

  &.theme-success {
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  }

  &.theme-danger {
    background: linear-gradient(135deg, #dc3545 0%, #e83e8c 100%);
  }

  &.theme-info {
    background: linear-gradient(135deg, #17a2b8 0%, #20c997 100%);
  }

  &.theme-secondary {
    background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
  }

  &.theme-warning {
    background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);
    color: #333;

    .stat-icon {
      opacity: 0.2;
    }
  }
}
</style>
