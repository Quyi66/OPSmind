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
            <template v-if="confirmMode">
              <div class="win-patch-restart-step__confirm">
                <div class="win-patch-restart-step__confirm-label">
                  请输入
                  <span class="win-patch-restart-step__confirm-keyword">
                    {{ rebootConfirmKeyword }}
                  </span>
                  进行确认
                </div>
                <el-input
                  :model-value="rebootConfirmText"
                  :placeholder="rebootConfirmKeyword"
                  clearable
                  style="width: 320px"
                  @update:model-value="value => updateConfirmField('reboot', value)"
                />
              </div>
            </template>
            <el-switch
              v-else
              :model-value="resolvedValue.reboot"
              @update:model-value="value => updateField('reboot', value)"
            />
          </div>
        </div>
        <div class="install-summary-row">
          <div class="install-summary-label">自动重扫</div>
          <div class="install-summary-value win-patch-restart-step__summary-value">
            <span class="win-patch-restart-step__summary-text">{{ rescanHint }}</span>
            <template v-if="confirmMode">
              <div class="win-patch-restart-step__confirm">
                <div class="win-patch-restart-step__confirm-label">
                  请输入
                  <span class="win-patch-restart-step__confirm-keyword">
                    {{ rescanConfirmKeyword }}
                  </span>
                  进行确认
                </div>
                <el-input
                  :model-value="rescanConfirmText"
                  :placeholder="rescanConfirmKeyword"
                  clearable
                  style="width: 320px"
                  @update:model-value="value => updateConfirmField('rescanAfter', value)"
                />
              </div>
            </template>
            <el-switch
              v-else
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
import { computed, ref, watch } from 'vue'

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
  },
  confirmMode: {
    type: Boolean,
    default: false
  },
  rebootConfirmKeyword: {
    type: String,
    default: '确认重启'
  },
  rescanConfirmKeyword: {
    type: String,
    default: '确认重扫'
  }
})

const emit = defineEmits(['update:modelValue'])

const rebootConfirmText = ref('')
const rescanConfirmText = ref('')

const resolvedValue = computed(() => ({
  reboot: Boolean(props.modelValue?.reboot),
  rescanAfter: Boolean(props.modelValue?.rescanAfter)
}))

watch(
  () => [props.confirmMode, props.modelValue?.reboot, props.modelValue?.rescanAfter],
  () => {
    if (!props.confirmMode) return

    if (resolvedValue.value.reboot) {
      rebootConfirmText.value = props.rebootConfirmKeyword
    } else if (rebootConfirmText.value === props.rebootConfirmKeyword) {
      rebootConfirmText.value = ''
    }

    if (resolvedValue.value.rescanAfter) {
      rescanConfirmText.value = props.rescanConfirmKeyword
    } else if (rescanConfirmText.value === props.rescanConfirmKeyword) {
      rescanConfirmText.value = ''
    }
  },
  { immediate: true }
)

function updateField(field, value) {
  emit('update:modelValue', {
    ...resolvedValue.value,
    [field]: Boolean(value)
  })
}

function updateConfirmField(field, value) {
  const text = String(value || '')
  const keyword = field === 'reboot' ? props.rebootConfirmKeyword : props.rescanConfirmKeyword
  const textRef = field === 'reboot' ? rebootConfirmText : rescanConfirmText
  textRef.value = text

  if (text === keyword) {
    if (!resolvedValue.value[field]) {
      updateField(field, true)
    }
    return
  }

  if (resolvedValue.value[field]) {
    updateField(field, false)
  }
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

.win-patch-restart-step__confirm {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.win-patch-restart-step__confirm-label {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.win-patch-restart-step__confirm-keyword {
  color: var(--el-color-primary);
  font-weight: 600;
  padding: 0 2px;
}

@media (max-width: 900px) {
  .win-patch-restart-step__summary-value {
    grid-template-columns: 1fr;
    align-items: flex-start;
  }
}
</style>
