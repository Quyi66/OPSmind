<template>
  <AcmDeviceSelectorDialog
    :model-value="visible && !attempted"
    ci-types="linux"
    :initial-selection="selectedHosts"
    :options="{ selectMode: 'host,group,tag,input,recently', selector: 'multiple' }"
    :title="t('hostUser.selectDevicesScanHostUsers')"
    :confirm-text="t('hostUser.startScan')"
    :description="t('hostUser.startScanCollectsSystemUsersGroupsHomeDirectory')"
    :allow-empty="false"
    :close-on-confirm="false"
    @update:model-value="handleSelectorVisibleChange"
    @confirm="handleExecute"
  />
  <!-- 提交后展示任务结果，保留原有轮询及结果未知时禁止重复提交的机制 -->
  <el-dialog
    :model-value="visible && attempted"
    :title="t('hostUser.scanHosts')"
    width="900px"
    :close-on-click-modal="false"
    :before-close="handleClose"
    :close-on-press-escape="false"
  >
    <DeviceSelectionSummary :selection="selectedHosts" show-targets />
    <el-alert
      v-if="taskMessage"
      :title="taskMessage"
      :description="reason"
      :type="taskType"
      :closable="false"
      show-icon
    />
    <p>{{ t('hostUser.closingThisWindowDoesNotCancelSubmittedTasks') }}</p>
    <details v-if="runId">
      <summary>{{ t('hostUser.executionRecord') }}</summary>
      <code>{{ runId }}</code>
    </details>
    <template #footer>
      <el-button @click="handleClose">{{ t('hostUser.closeWindow') }}</el-button>
      <el-button v-if="runId" type="primary" plain @click="viewResult">
        {{ t('hostUser.viewProgressAndResults') }}
      </el-button>
      <el-button type="primary" :loading="busy" disabled>{{ buttonText }}</el-button>
    </template>
  </el-dialog>
  <ExecuteResultDialog
    v-if="resultRunId"
    v-model:visible="resultVisible"
    :run-id="resultRunId"
    :job-title="t('hostUser.scanHostUsers')"
  />
</template>

<script setup>
import { t } from '@/core/i18n'

import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AcmDeviceSelectorDialog from '@/modules/automation/components/job/schedule/components/AcmDeviceSelectorDialog.vue'
import DeviceSelectionSummary from '@/modules/automation/components/job/schedule/components/DeviceSelectionSummary.vue'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { normalizeAcmDeviceJobHosts } from '@/modules/automation/components/job/schedule/components/acmDeviceSelector.utils'
import { useUserDialogTask } from '@/modules/user/composables/useUserDialogTask'
const props = defineProps({ visible: { type: Boolean, default: false } })
const emit = defineEmits(['update:visible', 'success'])
const visible = computed({ get: () => props.visible, set: val => emit('update:visible', val) })
const selectedHosts = ref([])
const task = useUserDialogTask({
  visible: () => props.visible,
  emit,
  onSuccess: handleClose,
  successMessage: () => t('hostUser.scanCompleted'),
  maxAttempts: 120
})
const { attempted, busy, taskType, taskMessage, reason, runId } = task
const resultVisible = ref(false)
const resultRunId = ref('')
function viewResult() {
  resultRunId.value = runId.value
  resultVisible.value = true
}
const buttonText = computed(() =>
  busy.value
    ? t('hostUser.processing')
    : attempted.value
      ? t('hostUser.verifyTheResultFirst')
      : t('hostUser.startScan')
)
watch(
  () => props.visible,
  value => {
    if (value) selectedHosts.value = []
  },
  { flush: 'sync' }
)
function handleExecute(selection = selectedHosts.value) {
  if (attempted.value) return
  selectedHosts.value = selection
  const hosts = normalizeAcmDeviceJobHosts(selectedHosts.value, 'linux')
  if (!hosts.length) {
    ElMessage.warning(t('hostUser.selectHostsToScanFirst'))
    return
  }
  return task.run('hTzJfM', { hosts })
}
function handleSelectorVisibleChange(value) {
  if (!value && !attempted.value) handleClose()
}
function handleClose(done) {
  task.reset()
  visible.value = false
  selectedHosts.value = []
  if (typeof done === 'function') done()
}
</script>
