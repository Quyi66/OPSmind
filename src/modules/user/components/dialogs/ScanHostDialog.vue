<template>
  <AcmDeviceSelectorDialog
    :model-value="visible && !attempted"
    ci-types="linux"
    :initial-selection="selectedHosts"
    :options="{ selectMode: 'host,group,tag,input,recently', selector: 'multiple' }"
    title="选择设备 · 扫描主机用户"
    confirm-text="开始扫描"
    description="点击“开始扫描”后，将采集所选主机的系统用户、用户组、home 目录大小、sudo 权限及定时任务信息。"
    :allow-empty="false"
    :close-on-confirm="false"
    @update:model-value="handleSelectorVisibleChange"
    @confirm="handleExecute"
  />
  <!-- 提交后展示任务结果，保留原有轮询及结果未知时禁止重复提交的机制 -->
  <el-dialog
    :model-value="visible && attempted"
    title="扫描主机"
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
    <p>关闭窗口不会取消已提交的后台任务；结果未知时请先核实，勿重复操作。</p>
    <details v-if="runId">
      <summary>执行记录</summary>
      <code>{{ runId }}</code>
    </details>
    <template #footer>
      <el-button @click="handleClose">关闭窗口</el-button>
      <el-button v-if="runId" type="primary" plain @click="viewResult">查看进度与结果</el-button>
      <el-button type="primary" :loading="busy" disabled>{{ buttonText }}</el-button>
    </template>
  </el-dialog>
  <ExecuteResultDialog
    v-if="resultRunId"
    v-model:visible="resultVisible"
    :run-id="resultRunId"
    job-title="扫描主机用户"
  />
</template>

<script setup>
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
  successMessage: '扫描完成',
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
  busy.value ? '正在处理…' : attempted.value ? '请先核实结果' : '开始扫描'
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
    ElMessage.warning('请先选择要扫描的主机')
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
