<template>
  <div class="install-summary-row">
    <span class="install-summary-label">{{ label }}</span>
    <div class="install-summary-list">
      <div v-if="items.length === 0" class="install-summary-empty">{{ emptyText }}</div>
      <div
        v-for="(item, index) in normalizedItems"
        :key="item.key || `${index}-${item.primary}`"
        class="install-summary-item"
      >
        <div>{{ item.primary }}</div>
        <div v-if="item.secondary" class="install-summary-subtext">
          {{ item.secondary }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  items: {
    type: Array,
    default: () => []
  },
  emptyText: {
    type: String,
    default: '暂无数据'
  }
})

const normalizedItems = computed(() =>
  props.items.map(item =>
    typeof item === 'object' && item !== null
      ? item
      : {
          primary: item,
          secondary: ''
        }
  )
)
</script>

<style scoped lang="scss">
.install-summary-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 14px;
  font-size: 13px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-bottom: none;
  }
}

.install-summary-label {
  min-width: 90px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
  font-size: 12px;
}

.install-summary-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.install-summary-item {
  color: var(--el-text-color-primary);
  word-break: break-all;
  line-height: 1.5;
}

.install-summary-subtext {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.install-summary-empty {
  color: var(--el-text-color-placeholder);
}
</style>
