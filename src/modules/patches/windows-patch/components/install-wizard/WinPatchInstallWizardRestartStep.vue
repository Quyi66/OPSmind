<template>
  <div class="task-step-content" :class="{ 'is-english': currentLocale === 'en-US' }">
    <div class="task-step-editor">
      <div class="task-step-editor__title">
        <i class="fa fa-refresh" style="margin-right: 6px"></i>
        {{ displayProps.title }}
      </div>
      <el-alert
        :title="displayProps.alertTitle"
        type="info"
        show-icon
        :closable="false"
        style="margin-bottom: 16px; line-height: 1.4; width: 100%"
      >
        <template #default>
          {{ displayProps.alertDescription }}
        </template>
      </el-alert>

      <div class="install-summary-card">
        <div class="install-summary-row">
          <div class="install-summary-label">{{ t('patches.windows.autoRestart') }}</div>
          <div class="install-summary-value win-patch-restart-step__summary-value">
            <span class="win-patch-restart-step__summary-text">{{ displayProps.rebootHint }}</span>
            <template v-if="confirmMode">
              <div class="win-patch-restart-step__confirm">
                <div class="win-patch-restart-step__confirm-label">
                  <I18nT keypath="patches.windows.confirmPrompt" :i18n="i18n.global">
                    <template #keyword>
                      <span class="win-patch-restart-step__confirm-keyword">{{ displayProps.rebootConfirmKeyword }}</span>
                    </template>
                  </I18nT>
                </div>
                <el-input
                  :model-value="rebootConfirmText"
                  :placeholder="displayProps.rebootConfirmKeyword"
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
          <div class="install-summary-label">{{ t('patches.windows.autoRescan') }}</div>
          <div class="install-summary-value win-patch-restart-step__summary-value">
            <span class="win-patch-restart-step__summary-text">{{ displayProps.rescanHint }}</span>
            <template v-if="confirmMode">
              <div class="win-patch-restart-step__confirm">
                <div class="win-patch-restart-step__confirm-label">
                  <I18nT keypath="patches.windows.confirmPrompt" :i18n="i18n.global">
                    <template #keyword>
                      <span class="win-patch-restart-step__confirm-keyword">{{ displayProps.rescanConfirmKeyword }}</span>
                    </template>
                  </I18nT>
                </div>
                <el-input
                  :model-value="rescanConfirmText"
                  :placeholder="displayProps.rescanConfirmKeyword"
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
import { t, currentLocale, i18n } from '@/core/i18n'
import { I18nT } from 'vue-i18n'
import { computed, reactive, ref, watch } from 'vue'

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
    default: undefined
  },
  alertTitle: {
    type: String,
    default: undefined
  },
  alertDescription: {
    type: String,
    default: undefined
  },
  rebootHint: {
    type: String,
    default: undefined
  },
  rescanHint: {
    type: String,
    default: undefined
  },
  confirmMode: {
    type: Boolean,
    default: false
  },
  rebootConfirmKeyword: {
    type: String,
    default: undefined
  },
  rescanConfirmKeyword: {
    type: String,
    default: undefined
  }
})

const displayProps = reactive({
  get title() { return props.title ?? t('patches.windows.restartRescanStrategy') },
  get alertTitle() { return props.alertTitle ?? t('patches.windows.installRestartHint') },
  get alertDescription() { return props.alertDescription ?? t('patches.windows.restartStepHint') },
  get rebootHint() { return props.rebootHint ?? t('patches.windows.rebootHint') },
  get rescanHint() { return props.rescanHint ?? t('patches.windows.rescanHint') },
  get rebootConfirmKeyword() { return props.rebootConfirmKeyword ?? t('patches.linux.confirmRestart') },
  get rescanConfirmKeyword() { return props.rescanConfirmKeyword ?? t('patches.windows.confirmRescan') }
})

const shownKeywords = { reboot: new Set(), rescanAfter: new Set() }
// Language changes retain the phrases shown for this configuration. A caller's
// explicit keyword change starts a new configuration for that field.
watch(
  () => [props.rebootConfirmKeyword, props.rescanConfirmKeyword],
  ([reboot, rescan], [previousReboot, previousRescan]) => {
    if (reboot !== previousReboot) {
      shownKeywords.reboot.clear()
      shownKeywords.reboot.add(displayProps.rebootConfirmKeyword)
    }
    if (rescan !== previousRescan) {
      shownKeywords.rescanAfter.clear()
      shownKeywords.rescanAfter.add(displayProps.rescanConfirmKeyword)
    }
  },
  { flush: 'sync' }
)
watch(
  () => [displayProps.rebootConfirmKeyword, displayProps.rescanConfirmKeyword],
  ([reboot, rescan]) => {
    shownKeywords.reboot.add(reboot)
    shownKeywords.rescanAfter.add(rescan)
  },
  { immediate: true, flush: 'sync' }
)

const emit = defineEmits(['update:modelValue'])

const rebootConfirmText = ref('')
const rescanConfirmText = ref('')

const resolvedValue = computed(() => ({
  reboot: Boolean(props.modelValue?.reboot),
  rescanAfter: Boolean(props.modelValue?.rescanAfter)
}))

watch(
  () => [props.confirmMode, props.modelValue?.reboot, props.modelValue?.rescanAfter, displayProps.rebootConfirmKeyword, displayProps.rescanConfirmKeyword],
  () => {
    if (!props.confirmMode) return

    if (resolvedValue.value.reboot) {
      rebootConfirmText.value = displayProps.rebootConfirmKeyword
    } else if (rebootConfirmText.value === displayProps.rebootConfirmKeyword) {
      rebootConfirmText.value = ''
    }

    if (resolvedValue.value.rescanAfter) {
      rescanConfirmText.value = displayProps.rescanConfirmKeyword
    } else if (rescanConfirmText.value === displayProps.rescanConfirmKeyword) {
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
  const keyword = field === 'reboot' ? displayProps.rebootConfirmKeyword : displayProps.rescanConfirmKeyword
  const textRef = field === 'reboot' ? rebootConfirmText : rescanConfirmText
  textRef.value = text

  if (text && (text === keyword || shownKeywords[field].has(text))) {
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

.is-english .win-patch-restart-step__summary-text {
  word-break: normal;
  overflow-wrap: break-word;
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
