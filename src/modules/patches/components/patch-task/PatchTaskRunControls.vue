<template>
  <span class="task-run-controls">
    <el-button v-if="canRun" type="success" :loading="busy" :disabled="disabled" @click="run">
      一键执行
    </el-button>
    <el-button v-if="waitingRestart" type="warning" :loading="busy" @click="showRestartOptions">
      确认重启策略
    </el-button>
    <span v-if="autoRunning && !canRun && !waitingRestart">一键执行中，正在自动推进…</span>
    <el-alert
      v-if="errorMessage"
      :title="errorMessage"
      type="error"
      :closable="false"
      class="task-run-error"
    />
  </span>
  <el-dialog
    v-model="restartVisible"
    title="确认重启策略"
    width="640px"
    append-to-body
    :close-on-click-modal="false"
    :close-on-press-escape="!busy"
    :show-close="!busy"
  >
    <p>平台判定需要重启，请确认后继续执行。重启完成后会自动校验并触发补丁重扫。</p>
    <el-descriptions :column="1" border>
      <el-descriptions-item v-for="item in restartDetails" :key="item.label" :label="item.label">
        <pre>{{ item.value }}</pre>
      </el-descriptions-item>
    </el-descriptions>
    <el-input
      v-model="confirmText"
      placeholder="如需重启，请输入“确认重启”"
      class="confirm-input"
    />
    <template #footer>
      <el-button :disabled="busy" @click="restartVisible = false">稍后处理</el-button>
      <el-button :loading="busy" @click="confirmRestart(false)">不重启，继续校验</el-button>
      <el-button
        type="danger"
        :loading="busy"
        :disabled="confirmText !== '确认重启'"
        @click="confirmRestart(true)"
      >
        确认重启
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { patchInstallApi } from '../../api'
import { getAgentErrorMessage } from '@/modules/asset/utils/agentErrors'
import {
  canRunPatchTask,
  forgetAutoRunTask,
  isAutoRunTask,
  rememberAutoRunTask,
  needsAutoRunRestartConfirmation
} from '../../utils/patchTaskAutoRun'

const props = defineProps({
  task: { type: Object, default: null },
  enabled: Boolean,
  disabled: Boolean
})
const emit = defineEmits(['updated', 'active-change'])
const current = ref(null)
const busy = ref(false)
const autoRunning = ref(false)
const errorMessage = ref('')
const restartVisible = ref(false)
const restartOptions = ref({})
const confirmText = ref('')
const canRun = computed(() => canRunPatchTask(current.value))
const waitingRestart = computed(
  () => autoRunning.value && needsAutoRunRestartConfirmation(current.value)
)
const restartDetails = computed(() =>
  Object.entries(restartOptions.value).map(([key, value]) => ({
    label:
      {
        restartReason: '重启原因',
        restartType: '重启类型',
        restartRequired: '需要重启',
        restartLabel: '重启说明',
        affectedPackages: '涉及软件包',
        packages: '涉及软件包',
        hosts: '涉及主机'
      }[key] || key,
    value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '-')
  }))
)
let timer
let version = 0
let prompted = false
const taskId = () => String(current.value?.id || current.value?.taskId || '')
function stop() {
  clearTimeout(timer)
}
function syncActive() {
  emit('active-change', autoRunning.value)
}
function syncTask(task) {
  current.value = task
  if (['COMPLETED', 'CANCELLED'].includes(task?.status)) {
    forgetAutoRunTask(taskId())
    autoRunning.value = false
    restartVisible.value = false
    stop()
    syncActive()
  }
}
function accept(task) {
  syncTask(task)
  emit('updated', task)
}
async function run() {
  if (busy.value || !canRun.value || props.disabled) return
  const request = version
  const id = taskId()
  busy.value = true
  errorMessage.value = ''
  try {
    const response = await patchInstallApi.runTask(id)
    rememberAutoRunTask(id)
    if (request !== version) return
    autoRunning.value = true
    prompted = false
    syncActive()
    accept(response?.data || response)
    schedulePoll()
  } catch (error) {
    if (request === version) errorMessage.value = getAgentErrorMessage(error)
  } finally {
    if (request === version) busy.value = false
  }
}
function schedulePoll() {
  stop()
  if (props.enabled && autoRunning.value && !current.value?.status?.endsWith('_FAILED'))
    timer = setTimeout(poll, 3000)
}
async function poll() {
  const request = version
  try {
    const response = await patchInstallApi.getTask(taskId())
    if (request !== version) return
    accept(response?.data || response)
    errorMessage.value = ''
    if (waitingRestart.value && !prompted) await showRestartOptions()
  } catch (error) {
    if (request === version) errorMessage.value = getAgentErrorMessage(error)
  } finally {
    if (request === version) schedulePoll()
  }
}
async function showRestartOptions() {
  if (busy.value) return
  const request = version
  busy.value = true
  try {
    const response = await patchInstallApi.getRestartOptions(taskId())
    if (request !== version) return
    restartOptions.value = response?.data || response || {}
    if (restartOptions.value.restartType === 'none') return
    confirmText.value = ''
    restartVisible.value = true
    prompted = true
  } catch (error) {
    if (request === version) errorMessage.value = getAgentErrorMessage(error)
  } finally {
    if (request === version) busy.value = false
  }
}
async function confirmRestart(confirm) {
  if (busy.value || (confirm && confirmText.value !== '确认重启')) return
  const request = version
  busy.value = true
  stop()
  try {
    // 一键模式确认即执行，不能再调用 restart/execute。
    const response = await patchInstallApi.confirmRestart(
      taskId(),
      confirm,
      confirm ? '确认重启' : undefined
    )
    if (request !== version) return
    accept(response?.data || response)
    restartVisible.value = false
    errorMessage.value = ''
  } catch (error) {
    if (request === version) errorMessage.value = getAgentErrorMessage(error)
  } finally {
    if (request === version) {
      busy.value = false
      schedulePoll()
    }
  }
}
watch(
  [() => props.enabled, () => props.task?.id || props.task?.taskId],
  () => {
    version++
    stop()
    current.value = props.task
    busy.value = false
    restartVisible.value = false
    errorMessage.value = ''
    prompted = false
    autoRunning.value = props.enabled && isAutoRunTask(current.value)
    syncTask(props.task)
    syncActive()
    if (autoRunning.value) poll()
  },
  { immediate: true }
)
watch(
  () => props.task,
  task => {
    syncTask(task)
  }
)
onUnmounted(() => {
  version++
  stop()
})
</script>

<style scoped>
.task-run-controls {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.task-run-error,
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin: 0;
}
.confirm-input {
  margin-top: 16px;
}
</style>
