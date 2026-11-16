<template>
  <div class="task-step-content">
    <div class="task-step-editor">
      <div class="task-step-editor__title">
        <i class="fa fa-refresh" />
        {{ t('patches.linux.restartPolicy') }}
      </div>
      <el-alert :title="adviceTitle" type="info" show-icon :closable="false" class="restart-advice">
        <template #default>
          <div>{{ adviceDescription }}</div>
        </template>
      </el-alert>
      <div v-if="requiresConfirm" class="restart-confirm-field">
        <div class="confirm-label">
          {{ t('patches.linux.enterConfirmation', { keyword: confirmKeyword }) }}
        </div>
        <el-input
          :model-value="modelValue"
          :placeholder="confirmKeyword"
          class="restart-confirm-input"
          :disabled="disabled"
          @update:model-value="$emit('update:modelValue', $event)"
        />
      </div>
      <el-alert
        v-else
        :title="t('patches.linux.noRestartNext')"
        type="success"
        :closable="false"
        show-icon
      />
    </div>

    <div class="task-step-action">
      <el-alert
        v-if="state === 'success' || state === 'failed'"
        :type="state === 'success' ? 'success' : 'error'"
        :closable="false"
        show-icon
        :title="statusTitle"
        class="task-step-alert"
      >
        <template v-if="runId" #default>
          <div class="task-detail-info">
            <el-button type="primary" link @click="$emit('show-result', runId, t('patches.linux.executeRestart'))">
              {{ t('patches.linux.viewExecution') }}
            </el-button>
          </div>
        </template>
      </el-alert>
    </div>
  </div>
</template>

<script setup>
import { t } from '@/core/i18n'
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  adviceTitle: {
    type: String,
    default: ''
  },
  adviceDescription: {
    type: String,
    default: ''
  },
  requiresConfirm: {
    type: Boolean,
    default: false
  },
  confirmKeyword: {
    type: String,
    default: ''
  },
  restartPolicy: {
    type: String,
    default: 'none'
  },
  state: {
    type: String,
    default: 'idle'
  },
  skipped: {
    type: Boolean,
    default: false
  },
  errorMessage: {
    type: String,
    default: ''
  },
  runId: {
    type: [String, Number],
    default: ''
  }
})

defineEmits(['update:modelValue', 'show-result'])

const disabled = computed(() => ['running', 'success'].includes(props.state))
const statusTitle = computed(() => {
  if (props.state === 'failed') return t('patches.linux.restartError', { error: props.errorMessage })
  return props.skipped || props.restartPolicy === 'none' ? t('patches.linux.restartSkipped') : t('patches.linux.restartDone')
})
</script>

<style scoped lang="scss">
@use '../PatchTaskStep' as patch-task-step;

@include patch-task-step.base-layout;

.restart-advice {
  width: 100%;
  margin-bottom: 16px;
  line-height: 1.4;
}

.restart-confirm-field {
  margin-top: 16px;
}

.confirm-label {
  margin-bottom: 8px;
  font-size: 14px;

  span {
    color: var(--el-color-primary);
    font-weight: bold;
  }
}

.restart-confirm-input {
  width: 320px;
}

.task-detail-info {
  margin-top: 4px;
}
</style>
