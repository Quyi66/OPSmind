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
              {{ t('patches.linux.viewExecution') }}
            </el-button>
          </div>
        </template>
      </el-alert>
      <div class="detail-block">
        <div class="detail-block__title">{{ t('automation.library.scriptContents') }}</div>
        <pre class="detail-block__content">{{ scriptContent || t('automation.flow.noScript') }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { t } from '@/core/i18n'

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
@use '../patch-task/PatchTaskStep' as patch-task-step;

@include patch-task-step.base-layout;

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
