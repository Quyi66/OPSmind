<template>
  <span class="task-run-controls">
    <el-button v-if="canRun" type="success" :loading="busy" :disabled="disabled" @click="run">
      一键执行
    </el-button>
    <el-button v-if="paused" :loading="busy" :disabled="disabled" @click="poll">继续查询</el-button>
    <el-button
      v-if="waitingRestart"
      type="warning"
      :loading="busy"
      :disabled="disabled"
      @click="showRestartOptions"
    >
      确认重启策略
    </el-button>
    <span v-if="autoRunning && !waitingRestart && !paused">一键执行中，正在自动推进…</span>
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
      <el-button :loading="busy" :disabled="disabled" @click="confirmRestart(false)">
        不重启，继续校验
      </el-button>
      <el-button
        type="danger"
        :loading="busy"
        :disabled="disabled || confirmText !== '确认重启'"
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
  getStartingAutoRunTask,
  isAutoRunTask,
  startAutoRunTask,
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
const paused = ref(false)
const errorMessage = ref('')
const restartVisible = ref(false)
const restartOptions = ref({})
const confirmText = ref('')
const canRun = computed(
  () => props.enabled && Boolean(taskId()) && !autoRunning.value && canRunPatchTask(current.value)
)
const waitingRestart = computed(
  () =>
    autoRunning.value &&
    needsAutoRunRestartConfirmation(current.value) &&
    String(restartOptions.value.restartType).toLowerCase() !== 'none'
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
const statusOf = task =>
  String(task?.status || '')
    .trim()
    .toUpperCase()
const terminal = task => ['COMPLETED', 'CANCELLED', 'CANCELED', 'REJECTED'].includes(statusOf(task))
const failed = task =>
  ['FAILED', 'ERROR'].includes(statusOf(task)) || statusOf(task).endsWith('_FAILED')
const taskId = () => String(current.value?.id || current.value?.taskId || '')
let timer
let version = 0
let prompted = false
let ownSnapshot = false
let pollPending = false
function stop() {
  clearTimeout(timer)
}
function isCurrent(request, id) {
  return request === version && props.enabled && id === taskId()
}
function syncTask(task) {
  current.value = task
  if (terminal(task) || failed(task)) {
    if (terminal(task)) forgetAutoRunTask(taskId())
    autoRunning.value = false
    restartVisible.value = false
    stop()
  }
}
function accept(response, id) {
  const task = response?.data ?? response
  if (!task || typeof task !== 'object' || !task.status)
    throw new Error('未返回任务状态，请继续查询确认结果')
  if (String(task.id || task.taskId || id) !== id)
    throw new Error('任务状态与当前任务不一致，请重新查询')
  ownSnapshot = true
  syncTask({ ...current.value, ...task, id })
  if (failed(task)) errorMessage.value = task.errorMessage || '任务执行失败，请排查后重新一键执行'
  emit('updated', current.value)
}
function schedulePoll() {
  stop()
  if (props.enabled && autoRunning.value && !paused.value) timer = setTimeout(poll, 3000)
}
async function run() {
  if (busy.value || !canRun.value || props.disabled) return
  const request = version
  const id = taskId()
  busy.value = true
  errorMessage.value = ''
  return completeStart(
    startAutoRunTask(id, () => patchInstallApi.runTask(id)),
    request,
    id
  )
}
async function completeStart(promise, request, id) {
  try {
    const response = await promise
    if (!isCurrent(request, id)) return
    autoRunning.value = true
    paused.value = false
    prompted = false
    restartOptions.value = {}
    accept(response, id)
  } catch (error) {
    if (isCurrent(request, id)) {
      errorMessage.value = getAgentErrorMessage(error)
      if (autoRunning.value) paused.value = true
    }
  } finally {
    if (isCurrent(request, id)) {
      busy.value = false
      schedulePoll()
    }
  }
}
async function poll() {
  if (!props.enabled || !autoRunning.value || pollPending || busy.value || props.disabled) {
    if (autoRunning.value && !paused.value) schedulePoll()
    return
  }
  stop()
  const request = version
  const id = taskId()
  pollPending = true
  try {
    const response = await patchInstallApi.getTask(id)
    if (!isCurrent(request, id)) return
    paused.value = false
    errorMessage.value = ''
    accept(response, id)
    if (waitingRestart.value && !prompted) await showRestartOptions()
  } catch (error) {
    if (isCurrent(request, id)) {
      paused.value = true
      errorMessage.value = getAgentErrorMessage(error, '查询任务状态失败，请继续查询')
    }
  } finally {
    if (isCurrent(request, id)) {
      pollPending = false
      schedulePoll()
    }
  }
}
async function showRestartOptions() {
  if (busy.value || !waitingRestart.value || !props.enabled || props.disabled) return
  const request = version
  const id = taskId()
  busy.value = true
  try {
    const response = await patchInstallApi.getRestartOptions(id)
    if (!isCurrent(request, id) || !waitingRestart.value) return
    restartOptions.value = response?.data ?? response ?? {}
    prompted = true
    if (String(restartOptions.value.restartType).toLowerCase() === 'none') return
    confirmText.value = ''
    restartVisible.value = true
    errorMessage.value = ''
  } catch (error) {
    if (isCurrent(request, id)) errorMessage.value = getAgentErrorMessage(error)
  } finally {
    if (isCurrent(request, id)) busy.value = false
  }
}
async function confirmRestart(confirm) {
  if (
    busy.value ||
    props.disabled ||
    !restartVisible.value ||
    !waitingRestart.value ||
    (confirm && confirmText.value !== '确认重启')
  )
    return
  const request = version
  const id = taskId()
  busy.value = true
  stop()
  try {
    // 一键模式确认即执行，不调用 restart/execute；分步模式由原向导处理。
    const response = await patchInstallApi.confirmRestart(
      id,
      confirm,
      confirm ? '确认重启' : undefined
    )
    if (!isCurrent(request, id)) return
    accept(response, id)
    restartVisible.value = false
    if (!failed(current.value)) errorMessage.value = ''
  } catch (error) {
    if (isCurrent(request, id)) errorMessage.value = getAgentErrorMessage(error)
  } finally {
    if (isCurrent(request, id)) {
      busy.value = false
      schedulePoll()
    }
  }
}
watch(
  () => autoRunning.value || busy.value,
  active => emit('active-change', active),
  { immediate: true, flush: 'sync' }
)
watch(
  [() => props.enabled, () => props.task?.id || props.task?.taskId],
  () => {
    version++
    stop()
    current.value = props.task
    ownSnapshot = false
    pollPending = false
    busy.value = false
    paused.value = false
    restartVisible.value = false
    restartOptions.value = {}
    errorMessage.value = ''
    prompted = false
    autoRunning.value = Boolean(
      props.enabled &&
      isAutoRunTask(current.value) &&
      !terminal(current.value) &&
      !failed(current.value)
    )
    syncTask(props.task)
    const pendingStart = getStartingAutoRunTask(taskId())
    if (props.enabled && pendingStart) {
      busy.value = true
      completeStart(pendingStart, version, taskId())
    } else if (autoRunning.value) poll()
  },
  { immediate: true }
)
watch(
  () => props.task,
  task => {
    // 审计详情可能稍晚于 /run、GET /{id}，不能用旧快照回退已经确认的执行状态。
    if (ownSnapshot && task && !terminal(task)) current.value = { ...task, ...current.value }
    else syncTask(task)
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
