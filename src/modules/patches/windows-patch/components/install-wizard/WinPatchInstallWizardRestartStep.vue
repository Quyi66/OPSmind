<template>
  <div class="task-step-content">
    <div class="task-step-editor">
      <div class="task-step-editor__title">
        <i class="fa fa-refresh" style="margin-right: 6px"></i>
        {{ title }}
      </div>
      <el-alert
        :title="alertTitle"
        type="info"
        show-icon
        :closable="false"
        style="margin-bottom: 16px; line-height: 1.4; width: 100%"
      >
        <template #default>
          {{ alertDescription }}
        </template>
      </el-alert>

      <div class="install-summary-card">
        <div class="install-summary-row">
          <div class="install-summary-label">自动重启</div>
          <div class="install-summary-value win-patch-restart-step__summary-value">
            <span class="win-patch-restart-step__summary-text">{{ rebootHint }}</span>
            <el-switch :model-value="resolvedValue.reboot" @update:model-value="value => updateField('reboot', value)" />
          </div>
        </div>
        <div class="install-summary-row">
          <div class="install-summary-label">自动重扫</div>
          <div class="install-summary-value win-patch-restart-step__summary-value">
            <span class="win-patch-restart-step__summary-text">{{ rescanHint }}</span>
            <el-switch
              :model-value="resolvedValue.rescanAfter"
              @update:model-value="value => updateField('rescanAfter', value)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      reboot: false,
      rescanAfter: false
    })
  },
  title: {
    type: String,
    default: '重启与重扫策略'
  },
  alertTitle: {
    type: String,
    default: '这里统一配置安装任务中的重启与自动重扫策略。'
  },
  alertDescription: {
    type: String,
    default: '当前向导会在校验脚本之后展示这一页，未启用的项会在任务推进时自动跳过。'
  },
  rebootHint: {
    type: String,
    default: '启用后，任务进入重启环节时会继续执行主机重启。'
  },
  rescanHint: {
    type: String,
    default: '启用后，任务收尾阶段会自动刷新当前主机的补丁状态。'
  }
})

const emit = defineEmits(['update:modelValue'])

const resolvedValue = computed(() => ({
  reboot: Boolean(props.modelValue?.reboot),
  rescanAfter: Boolean(props.modelValue?.rescanAfter)
}))

function updateField(field, value) {
  emit('update:modelValue', {
    ...resolvedValue.value,
    [field]: Boolean(value)
  })
}
</script>

<style scoped lang="scss">
.win-patch-restart-step {
  width: 100%;
}

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
}

.install-summary-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  overflow: hidden;
  margin-top: 4px;
}

.install-summary-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  font-size: 13px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.install-summary-row:last-child {
  border-bottom: none;
}

.install-summary-label {
  min-width: 90px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
  font-size: 13px;
  line-height: 1.6;
}

.install-summary-value {
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.win-patch-restart-step__summary-value {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
}

.win-patch-restart-step__summary-text {
  display: block;
  line-height: 1.6;
}

@media (max-width: 900px) {
  .win-patch-restart-step__summary-value {
    grid-template-columns: 1fr;
    align-items: flex-start;
  }
}
</style>
