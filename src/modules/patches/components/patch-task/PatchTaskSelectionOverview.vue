<template>
  <div v-loading="loading" class="patch-task-selection-overview">
    <section class="patch-task-selection-overview__card">
      <div class="card-header">
        <i class="fa fa-lock" />
        {{ selectionTitle }}
      </div>
      <div class="card-body card-body--scroll">
        <div v-if="selectionItems.length === 0" class="no-data">{{ selectionEmptyText }}</div>
        <div v-for="item in selectionItems" :key="item.key" class="selection-item">
          <div class="selection-item__primary">{{ item.primary }}</div>
          <div v-if="item.secondary" class="selection-item__secondary">
            {{ item.secondary }}
          </div>
        </div>
      </div>
    </section>

    <section class="patch-task-selection-overview__card patch-task-selection-overview__packages">
      <div class="card-header card-header--with-actions">
        <div>
          <i class="fa fa-cube" />
          {{ packageTitle }}
        </div>
        <slot name="package-actions" />
      </div>
      <slot name="packages" />
    </section>

    <section class="patch-task-selection-overview__card patch-task-selection-overview__full">
      <div class="card-header">
        <i class="fa fa-list" />
        {{ hostTitle }}
      </div>
      <slot name="hosts" />
    </section>
  </div>
</template>

<script setup>
defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  selectionTitle: {
    type: String,
    required: true
  },
  selectionItems: {
    type: Array,
    default: () => []
  },
  selectionEmptyText: {
    type: String,
    default: '暂无数据'
  },
  packageTitle: {
    type: String,
    required: true
  },
  hostTitle: {
    type: String,
    required: true
  }
})
</script>

<style scoped lang="scss">
.patch-task-selection-overview {
  display: grid;
  grid-template-columns: minmax(280px, 2fr) minmax(0, 3fr);
  align-items: start;
  gap: 16px;
}

.patch-task-selection-overview__card {
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;

  .card-header {
    padding: 8px 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    background: var(--el-fill-color-light);
    color: var(--el-text-color-primary);
    font-size: 13px;
    font-weight: 500;
  }

  .card-header--with-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 36px;
    padding: 4px 12px;
  }

  :deep(.card-body) {
    padding: 10px 12px;
    background: var(--el-bg-color);
    color: var(--el-text-color-primary);
    font-size: 13px;
  }

  :deep(.card-body--scroll) {
    max-height: 320px;
    overflow-y: auto;
  }
}

.patch-task-selection-overview__full {
  grid-column: span 2;

  :deep(.card-body--scroll) {
    max-height: 260px;
  }
}

.selection-item,
:deep(.selection-item) {
  padding: 6px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-bottom: none;
  }
}

.selection-item__primary,
:deep(.selection-item__primary) {
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.selection-item__secondary {
  margin-top: 2px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  word-break: break-all;
}

.no-data,
:deep(.no-data) {
  color: var(--el-text-color-placeholder);
}

@media (max-width: 760px) {
  .patch-task-selection-overview {
    grid-template-columns: minmax(0, 1fr);
  }

  .patch-task-selection-overview__full {
    grid-column: auto;
  }
}
</style>
