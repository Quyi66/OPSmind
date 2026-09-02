<template>
  <div class="patch-task-pipeline">
    <div
      v-for="(item, index) in items"
      :key="item.key || index"
      class="patch-task-pipeline__item"
      :class="itemClasses(item)"
    >
      <div class="patch-task-pipeline__node">
        <i v-if="item.state === 'success'" class="fa fa-check" />
        <i v-else-if="item.state === 'failed'" class="fa fa-times" />
        <i v-else-if="item.state === 'running'" class="fa fa-spinner fa-spin" />
        <i v-else-if="pendingIcon" class="fa fa-clock-o" />
        <span v-else>{{ index + 1 }}</span>
      </div>
      <div class="patch-task-pipeline__content">
        <div class="patch-task-pipeline__info">
          <div class="patch-task-pipeline__title">{{ item.label }}</div>
          <div class="patch-task-pipeline__status">{{ item.text }}</div>
        </div>
        <div v-if="item.runId" class="patch-task-pipeline__actions">
          <el-button
            type="primary"
            link
            size="small"
            @click="$emit('show-result', item.runId, item.label)"
          >
            查看详情
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  items: {
    type: Array,
    default: () => []
  },
  pendingIcon: {
    type: Boolean,
    default: false
  }
})

defineEmits(['show-result'])

function itemClasses(item) {
  return {
    'is-active': item.state === 'running',
    'is-success': item.state === 'success',
    'is-failed': item.state === 'failed',
    'is-skipped': item.skipped,
    'is-pending': !item.state || item.state === 'idle'
  }
}
</script>

<style scoped lang="scss">
.patch-task-pipeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 10px 0;
}

.patch-task-pipeline__item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--el-fill-color-blank);

  &.is-active {
    border-color: var(--el-color-primary-light-5);
    background-color: var(--el-color-primary-light-9);
  }

  &.is-success {
    border-color: var(--el-color-success-light-5);
    background-color: var(--el-color-success-light-9);
  }

  &.is-failed {
    border-color: var(--el-color-danger-light-5);
    background-color: var(--el-color-danger-light-9);
  }

  &.is-skipped {
    border-style: dashed;
    opacity: 0.7;
    filter: grayscale(0.5);
  }
}

.patch-task-pipeline__node {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--el-fill-color);
  color: var(--el-text-color-placeholder);
  font-size: 14px;
}

.is-active .patch-task-pipeline__node {
  background-color: var(--el-color-primary);
  color: #fff;
}

.is-success .patch-task-pipeline__node {
  background-color: var(--el-color-success);
  color: #fff;
}

.is-failed .patch-task-pipeline__node {
  background-color: var(--el-color-danger);
  color: #fff;
}

.is-active .patch-task-pipeline__title {
  color: var(--el-color-primary);
}

.is-success .patch-task-pipeline__title {
  color: var(--el-color-success);
}

.is-failed .patch-task-pipeline__title {
  color: var(--el-color-danger);
}

.patch-task-pipeline__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  gap: 12px;
}

.patch-task-pipeline__info {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 4px;
  min-width: 0;
}

.patch-task-pipeline__title {
  color: var(--el-text-color-primary);
  font-size: 15px;
  font-weight: 600;
}

.patch-task-pipeline__status,
.patch-task-pipeline__actions {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.patch-task-pipeline__actions {
  flex-shrink: 0;
}

.patch-task-pipeline__status {
  line-height: 1.5;
  overflow-wrap: anywhere;
  word-break: break-word;
}

@media (max-width: 900px) {
  .patch-task-pipeline__content {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
