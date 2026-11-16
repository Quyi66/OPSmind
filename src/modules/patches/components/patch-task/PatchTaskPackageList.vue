<template>
  <div v-loading="loading" class="patch-task-package-list">
    <div v-for="packageName in items" :key="packageName" class="patch-task-package-list__item">
      {{ packageName }}
    </div>
    <div v-if="items.length === 0" class="patch-task-package-list__empty">
      {{ emptyText ?? t('common.noData') }}
    </div>
    <div v-if="hasMore" class="patch-task-package-list__more">
      <el-button link type="primary" size="small" @click="$emit('load-more')">
        {{ t('patches.linux.moreShown', { shown: items.length, total }) }}
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { t } from '@/core/i18n'
defineProps({
  items: {
    type: Array,
    default: () => []
  },
  emptyText: {
    type: String,
    default: undefined
  },
  loading: {
    type: Boolean,
    default: false
  },
  hasMore: {
    type: Boolean,
    default: false
  },
  total: {
    type: Number,
    default: 0
  }
})

defineEmits(['load-more'])
</script>

<style scoped lang="scss">
.patch-task-package-list__item {
  margin-bottom: 4px;
  color: var(--el-text-color-secondary);
  font-family: monospace;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-all;
}

.patch-task-package-list__empty {
  color: var(--el-text-color-placeholder);
}

.patch-task-package-list__more {
  padding-top: 4px;
  text-align: center;
}
</style>
