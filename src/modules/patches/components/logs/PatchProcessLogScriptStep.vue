<template>
  <div class="task-step-content">
    <div class="task-step-editor">
      <div class="task-step-editor__title">
        <i :class="['fa', icon]" />
        {{ title }}
      </div>
      <el-alert
        :type="alert.type"
        :closable="false"
        show-icon
        :title="alert.title"
        class="task-step-alert"
      >
        <template #default>
          <div v-if="runId" class="task-detail-info">
            <el-button
              type="primary"
              link
              class="execute-result-link"
              @click="$emit('show-result', runId)"
            >
              查看执行详情
            </el-button>
          </div>
        </template>
      </el-alert>
      <div class="detail-block">
        <div class="detail-block__title">脚本内容</div>
        <pre class="detail-block__content">{{ scriptContent || '未配置脚本' }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  icon: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  alert: {
    type: Object,
    required: true
  },
  runId: {
    type: String,
    default: ''
  },
  scriptContent: {
    type: String,
    default: ''
  }
})

defineEmits(['show-result'])
</script>

<style scoped lang="scss">
.task-step-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 280px;
}

.task-step-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-step-editor__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  padding: 4px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.task-step-alert {
  width: 100%;
}

.task-detail-info {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.execute-result-link {
  font-size: 14px;
}

.detail-block {
  margin-top: 16px;
}

.detail-block__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 8px;
}

.detail-block__content {
  margin: 0;
  padding: 12px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
