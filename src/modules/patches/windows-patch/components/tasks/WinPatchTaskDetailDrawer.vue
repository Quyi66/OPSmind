<template>
  <el-dialog
    v-model="visibleModel"
    title="任务详情"
    width="1100px"
    destroy-on-close
    append-to-body
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="win-patch-task-detail">
      <div class="ops-action-bar win-patch-task-detail__actions">
        <el-switch v-model="autoPollingEnabled" active-text="自动轮询 3 秒" />
        <span style="flex: 1"></span>
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="loading"
          @click="loadTaskDetail()"
        >
          <el-icon v-show="!loading"><Refresh /></el-icon>
        </el-button>
      </div>

      <el-descriptions
        v-if="taskDetail"
        :column="2"
        border
        size="small"
        class="win-patch-descriptions"
      >
        <el-descriptions-item label="任务类型">
          <el-tag :type="getTaskTypeTagType(taskDetail)" size="small" effect="plain">
            {{ getTaskTypeLabel(taskDetail) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="任务状态">
          <el-tag
            :type="getTaskStatusTagType(taskDetail)"
            size="small"
            :class="{ 'clickable-tag': taskRunId }"
            @click="
              taskRunId && handleViewRunResult(taskRunId, `${getTaskTypeLabel(taskDetail)}任务`)
            "
          >
            {{ getTaskStatusLabel(taskDetail) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Run ID">
          {{ taskRunId || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="当前步骤">
          <el-tag
            v-if="getTaskStepLabel(taskDetail) !== '-'"
            :type="getTaskStepTagType(taskDetail)"
            size="small"
            effect="plain"
          >
            {{ getTaskStepLabel(taskDetail) }}
          </el-tag>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="主机数">
          {{ pickValue(taskDetail, ['hostCount', 'host_count'], 0) }}
        </el-descriptions-item>
        <el-descriptions-item label="创建人">
          {{ pickValue(taskDetail, ['createdBy', 'created_by'], '-') }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ formatDateTime(pickValue(taskDetail, ['createdDate', 'created_date'], '')) }}
        </el-descriptions-item>
        <el-descriptions-item label="完成时间">
          {{ formatDateTime(pickValue(taskDetail, ['completedDate', 'completed_date'], '')) }}
        </el-descriptions-item>
        <el-descriptions-item label="错误信息" :span="2">
          {{ pickValue(taskDetail, ['errorMessage', 'error_message'], '-') }}
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="availableExecuteRuns.length" class="win-patch-task-runs">
        <div class="win-patch-task-runs__title">作业详情</div>
        <div class="win-patch-task-runs__actions">
          <el-tag
            v-for="item in availableExecuteRuns"
            :key="`${item.label}-${item.runId}`"
            size="small"
            effect="plain"
            class="clickable-tag"
            @click="handleViewRunResult(item.runId, item.label)"
          >
            {{ item.label }}
          </el-tag>
        </div>
      </div>

      <div v-if="showStepActions" class="win-patch-task-scripts">
        <div class="win-patch-task-scripts__header">
          <div class="win-patch-task-scripts__title">脚本配置</div>
          <div class="win-patch-task-scripts__hint">
            预检查和校验脚本可按需上传，再执行对应步骤。
          </div>
        </div>
        <div class="win-patch-task-scripts__list">
          <WinPatchTaskScriptUploader
            :task-id="currentTaskId"
            script-type="pre-check"
            label="预检查脚本"
            :script-content="pickValue(taskDetail, ['preCheckScript', 'pre_check_script'], '')"
            @uploaded="handleScriptUploaded"
          />
          <WinPatchTaskScriptUploader
            :task-id="currentTaskId"
            script-type="validate"
            label="校验脚本"
            :script-content="pickValue(taskDetail, ['validateScript', 'validate_script'], '')"
            @uploaded="handleScriptUploaded"
          />
        </div>
      </div>

      <div v-if="showStepActions" class="win-patch-task-step">
        <div class="win-patch-task-step__header">
          <div class="win-patch-task-step__title">步骤控制</div>
          <div class="win-patch-task-step__hint">{{ stepActionHint }}</div>
        </div>
        <div class="win-patch-task-step__actions">
          <el-button
            type="primary"
            size="small"
            :loading="stepSubmitting"
            :disabled="!canExecuteCurrentStep"
            @click="handleExecuteStep"
          >
            {{ executeButtonText }}
          </el-button>
          <el-button
            size="small"
            :loading="stepSubmitting"
            :disabled="!canSkipCurrentStep"
            @click="handleSkipStep"
          >
            跳过当前步骤
          </el-button>
        </div>
      </div>

      <div class="win-patch-section-title">主机执行状态</div>
      <div class="ops-table-wrapper win-patch-task-detail__table">
        <el-table :data="taskHosts" v-loading="loading" max-height="420">
          <el-table-column label="主机" width="140" show-overflow-tooltip>
            <template #default="{ row }">
              {{ pickValue(row, ['hostKey', 'host_key'], '-') }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getTaskStatusTagType(row)" size="small">
                {{ getTaskStatusLabel(row) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="开始时间" width="180" class-name="win-patch-table__time-column">
            <template #default="{ row }">
              {{ formatDateTime(pickValue(row, ['startedDate', 'started_date'], '')) }}
            </template>
          </el-table-column>
          <el-table-column label="完成时间" width="180" class-name="win-patch-table__time-column">
            <template #default="{ row }">
              {{ formatDateTime(pickValue(row, ['completedDate', 'completed_date'], '')) }}
            </template>
          </el-table-column>
          <el-table-column label="错误信息" min-width="240" show-overflow-tooltip>
            <template #default="{ row }">
              {{ pickValue(row, ['errorMessage', 'error_message'], '-') }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </el-dialog>

  <ExecuteResultDialog
    v-model:visible="showRunResultDialog"
    :run-id="currentRunId"
    :job-title="currentRunJobTitle"
  />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { isSuccessfulRunStatus } from '@/utils/taskStatus'
import WinPatchTaskScriptUploader from './WinPatchTaskScriptUploader.vue'
import { winPatchApi } from '../../api'
import { useWinPatchPolling } from '../../composables/useWinPatchPolling'
import {
  canSkipTaskStep,
  formatDateTime,
  getTaskStepLabel,
  getTaskStepTagType,
  getTaskStepValue,
  getTaskStatusLabel,
  getTaskStatusValue,
  getTaskStatusTagType,
  getTaskTypeLabel,
  getTaskTypeTagType,
  isStepControlledTask,
  isTaskRunning,
  normalizeUpper,
  pickValue,
  unwrapResponse
} from '../../utils'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  taskId: {
    type: [String, Number],
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

const visibleModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const loading = ref(false)
const autoPollingEnabled = ref(true)
const taskDetail = ref(null)
const taskHosts = ref([])
const taskAuditSteps = ref([])
const taskAuditLogs = ref([])
const stepSubmitting = ref(false)
const showRunResultDialog = ref(false)
const currentRunId = ref('')
const currentRunJobTitle = ref('')

const currentTaskId = computed(() => String(props.taskId || '').trim())
const taskRunId = computed(() =>
  String(pickValue(taskDetail.value, ['runId', 'run_id'], '')).trim()
)
const currentStepValue = computed(() => getTaskStepValue(taskDetail.value))
const currentTaskStatusValue = computed(() => getTaskStatusValue(taskDetail.value))
const showStepActions = computed(() => isStepControlledTask(taskDetail.value))
const isExecutePhase = computed(() =>
  ['EXECUTE', 'INSTALL', 'ROLLBACK'].includes(currentStepValue.value)
)

function getAuditStepKey(step) {
  return normalizeUpper(step?.step)
}

function resolveExecuteStepKeys(task) {
  const taskType = normalizeUpper(pickValue(task, ['taskType', 'task_type'], ''))
  return taskType === 'ROLLBACK' ? ['ROLLBACK', 'EXECUTE'] : ['INSTALL', 'EXECUTE']
}

function findAuditStep(stepKeys = []) {
  const normalizedKeys = stepKeys.map(key => normalizeUpper(key)).filter(Boolean)

  return taskAuditSteps.value.find(step => normalizedKeys.includes(getAuditStepKey(step))) || null
}

function findLatestScriptContent(scriptType) {
  const normalizedScriptType = String(scriptType || '')
    .trim()
    .toLowerCase()

  for (let index = taskAuditLogs.value.length - 1; index >= 0; index -= 1) {
    const record = taskAuditLogs.value[index]
    if (
      getAuditStepKey(record) === 'SCRIPT' &&
      String(record?.scriptType || '')
        .trim()
        .toLowerCase() === normalizedScriptType &&
      String(record?.scriptContent || '').trim()
    ) {
      return record.scriptContent
    }
  }

  return ''
}

function deriveCurrentStep(task) {
  const explicitStep = String(pickValue(task, ['currentStep', 'current_step'], '')).trim()
  if (explicitStep) {
    return explicitStep
  }

  const activeStep = taskAuditSteps.value.find(step => {
    const status = normalizeUpper(step?.status)
    return ['PENDING', 'RUNNING', 'WAITING', 'CREATED'].includes(status)
  })

  if (activeStep) {
    return getAuditStepKey(activeStep)
  }

  if (
    taskAuditSteps.value.length &&
    taskAuditSteps.value.every(step =>
      ['SUCCESS', 'SKIPPED'].includes(normalizeUpper(step?.status))
    )
  ) {
    return 'COMPLETED'
  }

  return ''
}

function mergeTaskDetail(baseTask = null, auditTask = null, hosts = [], steps = [], logs = []) {
  const mergedTask = {
    ...(baseTask && typeof baseTask === 'object' ? baseTask : {}),
    ...(auditTask && typeof auditTask === 'object' ? auditTask : {})
  }

  if (
    !Object.keys(mergedTask).length &&
    !taskAuditSteps.value.length &&
    !taskAuditLogs.value.length
  ) {
    return null
  }

  const preCheckStep = findAuditStep(['PRE_CHECK'])
  const executeStep = findAuditStep(resolveExecuteStepKeys(mergedTask))
  const restartStep = findAuditStep(['RESTART'])
  const validateStep = findAuditStep(['VALIDATE'])

  const derivedCurrentStep = deriveCurrentStep(mergedTask)
  const preCheckScript = findLatestScriptContent('pre-check')
  const validateScript = findLatestScriptContent('validate')

  if (derivedCurrentStep) {
    mergedTask.currentStep = derivedCurrentStep
  }

  if (!pickValue(mergedTask, ['preCheckRunId', 'pre_check_run_id'], '') && preCheckStep?.runId) {
    mergedTask.preCheckRunId = preCheckStep.runId
  }

  if (!pickValue(mergedTask, ['executeRunId', 'execute_run_id'], '') && executeStep?.runId) {
    mergedTask.executeRunId = executeStep.runId
  }

  if (!pickValue(mergedTask, ['restartRunId', 'restart_run_id'], '') && restartStep?.runId) {
    mergedTask.restartRunId = restartStep.runId
  }

  if (!pickValue(mergedTask, ['validateRunId', 'validate_run_id'], '') && validateStep?.runId) {
    mergedTask.validateRunId = validateStep.runId
  }

  if (!pickValue(mergedTask, ['preCheckScript', 'pre_check_script'], '') && preCheckScript) {
    mergedTask.preCheckScript = preCheckScript
  }

  if (!pickValue(mergedTask, ['validateScript', 'validate_script'], '') && validateScript) {
    mergedTask.validateScript = validateScript
  }

  mergedTask.hosts = hosts
  mergedTask.steps = steps
  mergedTask.logs = logs

  return mergedTask
}

const availableExecuteRuns = computed(() => {
  const executeLabel = getTaskTypeLabel(taskDetail.value) === '回滚' ? '执行回滚' : '执行安装'
  const candidates = [
    {
      label: '主任务作业',
      runId: taskRunId.value
    },
    {
      label: '预检查',
      runId: String(pickValue(taskDetail.value, ['preCheckRunId', 'pre_check_run_id'], '')).trim()
    },
    {
      label: executeLabel,
      runId: String(pickValue(taskDetail.value, ['executeRunId', 'execute_run_id'], '')).trim()
    },
    {
      label: '执行重启',
      runId: String(pickValue(taskDetail.value, ['restartRunId', 'restart_run_id'], '')).trim()
    },
    {
      label: '执行验证',
      runId: String(pickValue(taskDetail.value, ['validateRunId', 'validate_run_id'], '')).trim()
    }
  ]

  const seen = new Set()
  return candidates.filter(item => {
    if (!item.runId || seen.has(item.runId)) {
      return false
    }

    seen.add(item.runId)
    return true
  })
})
const canExecuteCurrentStep = computed(() => {
  return (
    showStepActions.value &&
    Boolean(currentStepValue.value) &&
    currentStepValue.value !== 'COMPLETED' &&
    ![
      'COMPLETED',
      'SUCCESS',
      'PASS',
      'FAILED',
      'ERROR',
      'PRE_CHECK_FAILED',
      'INSTALL_FAILED',
      'ROLLBACK_FAILED',
      'VALIDATE_FAILED'
    ].includes(currentTaskStatusValue.value) &&
    !isTaskRunning(taskDetail.value)
  )
})
const canSkipCurrentStep = computed(
  () => canExecuteCurrentStep.value && canSkipTaskStep(taskDetail.value)
)
const executeButtonText = computed(() => {
  if (currentStepValue.value === 'PRE_CHECK') return '执行预检查'
  if (isExecutePhase.value) {
    return getTaskTypeLabel(taskDetail.value) === '回滚' ? '执行回滚' : '执行安装'
  }
  if (currentStepValue.value === 'RESTART') return '执行重启'
  if (currentStepValue.value === 'VALIDATE') return '执行验证'
  return '执行当前步骤'
})
const stepActionHint = computed(() => {
  if (!showStepActions.value) return ''

  if (['COMPLETED', 'SUCCESS', 'PASS'].includes(currentTaskStatusValue.value)) {
    return '任务已完成，无需继续处理。'
  }

  if (
    ['FAILED', 'ERROR', 'PRE_CHECK_FAILED', 'INSTALL_FAILED', 'ROLLBACK_FAILED', 'VALIDATE_FAILED']
      .includes(currentTaskStatusValue.value)
  ) {
    return '任务执行失败，请结合错误信息确认是否需要重试。'
  }

  if (isTaskRunning(taskDetail.value)) {
    return '当前步骤执行中，等待回调完成后会自动刷新。'
  }

  if (isExecutePhase.value) {
    return '执行步骤不可跳过，需要由用户明确触发。'
  }

  return '安装与回滚任务需要按步骤推进，当前步骤可在此继续处理。'
})

const { isPolling, start, stop } = useWinPatchPolling(3000)
let loadTaskDetailRequestId = 0

function handleClose() {
  const status = currentTaskStatusValue.value
  emit('close', {
    taskId: currentTaskId.value,
    status,
    succeeded: isSuccessfulRunStatus(status)
  })
}

function applyTaskSnapshot(taskSnapshot = null) {
  if (!taskSnapshot || typeof taskSnapshot !== 'object') {
    return
  }

  taskDetail.value = {
    ...(taskDetail.value || {}),
    ...taskSnapshot
  }
}

async function loadTaskDetail(options = {}) {
  const taskId = currentTaskId.value
  if (!taskId) return

  const requestId = ++loadTaskDetailRequestId
  loading.value = !options.silent

  try {
    const detailResponse = await winPatchApi.getTaskDetail(taskId)

    if (
      requestId !== loadTaskDetailRequestId ||
      !visibleModel.value ||
      taskId !== currentTaskId.value
    ) {
      return
    }

    const data = unwrapResponse(detailResponse)
    const baseTask = data?.task || data || null
    const nextHosts = Array.isArray(data?.hosts) ? data.hosts : []
    const nextAuditSteps = Array.isArray(data?.steps) ? data.steps : []
    const nextAuditLogs = Array.isArray(data?.logs) ? data.logs : []

    taskHosts.value = nextHosts
    taskAuditSteps.value = nextAuditSteps
    taskAuditLogs.value = nextAuditLogs

    taskDetail.value = mergeTaskDetail(baseTask, null, nextHosts, nextAuditSteps, nextAuditLogs)

    if (!autoPollingEnabled.value || !isTaskRunning(taskDetail.value)) {
      stop()
    } else if (!isPolling.value) {
      start(() => loadTaskDetail({ silent: true }))
    }
  } catch (error) {
    if (requestId !== loadTaskDetailRequestId) {
      return
    }

    console.error('加载任务详情失败:', error)
    taskDetail.value = null
    taskHosts.value = []
    taskAuditSteps.value = []
    taskAuditLogs.value = []
    stop()

    if (!options.silent) {
      ElMessage.error('加载任务详情失败')
    }
  } finally {
    if (requestId === loadTaskDetailRequestId) {
      loading.value = false
    }
  }
}

async function handleExecuteStep() {
  if (!currentTaskId.value || !canExecuteCurrentStep.value) return

  stepSubmitting.value = true
  try {
    const response = await winPatchApi.executeTaskStep(currentTaskId.value, taskDetail.value, {
      confirmText: '确认重启'
    })
    applyTaskSnapshot(unwrapResponse(response))
    ElMessage.success(`${executeButtonText.value}已发起`)

    if (autoPollingEnabled.value && isTaskRunning(taskDetail.value)) {
      start(() => loadTaskDetail({ silent: true }))
    }
  } catch (error) {
    console.error('执行任务步骤失败:', error)
    ElMessage.error('执行任务步骤失败')
  } finally {
    stepSubmitting.value = false
  }
}

async function handleSkipStep() {
  if (!currentTaskId.value || !canSkipCurrentStep.value) return

  try {
    await ElMessageBox.confirm(
      `确定跳过“${getTaskStepLabel(taskDetail.value)}”步骤吗？`,
      '跳过步骤',
      {
        type: 'warning'
      }
    )
  } catch {
    return
  }

  stepSubmitting.value = true
  try {
    const response = await winPatchApi.skipTaskStep(currentTaskId.value, taskDetail.value)
    applyTaskSnapshot(unwrapResponse(response))
    ElMessage.success(`${getTaskStepLabel(taskDetail.value)}已跳过`)

    if (autoPollingEnabled.value && isTaskRunning(taskDetail.value)) {
      start(() => loadTaskDetail({ silent: true }))
    }
  } catch (error) {
    console.error('跳过任务步骤失败:', error)
    ElMessage.error('跳过任务步骤失败')
  } finally {
    stepSubmitting.value = false
  }
}

function handleScriptUploaded(taskSnapshot) {
  applyTaskSnapshot(taskSnapshot)
}

function handleViewRunResult(runId, jobTitle = '') {
  if (!runId) return

  currentRunId.value = runId
  currentRunJobTitle.value = jobTitle || `${getTaskTypeLabel(taskDetail.value)}任务`
  showRunResultDialog.value = true
}

watch(
  [() => props.modelValue, currentTaskId],
  async ([open, taskId]) => {
    stop()

    if (!open || !taskId) {
      stepSubmitting.value = false
      taskDetail.value = null
      taskHosts.value = []
      taskAuditSteps.value = []
      taskAuditLogs.value = []
      showRunResultDialog.value = false
      currentRunId.value = ''
      currentRunJobTitle.value = ''
      return
    }

    await loadTaskDetail()
  },
  { immediate: true }
)

watch(
  () => autoPollingEnabled.value,
  value => {
    if (!value) {
      stop()
      return
    }

    if (visibleModel.value && currentTaskId.value && isTaskRunning(taskDetail.value)) {
      start(() => loadTaskDetail({ silent: true }))
    }
  }
)

watch(
  () => props.modelValue,
  open => {
    if (!open) {
      stop()
      stepSubmitting.value = false
      taskDetail.value = null
      taskHosts.value = []
      taskAuditSteps.value = []
      taskAuditLogs.value = []
      showRunResultDialog.value = false
      currentRunId.value = ''
      currentRunJobTitle.value = ''
    }
  }
)

watch(
  () => showRunResultDialog.value,
  visible => {
    if (!visible) {
      currentRunId.value = ''
      currentRunJobTitle.value = ''
    }
  }
)
</script>

<style scoped lang="scss">
.win-patch-task-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  max-height: calc(90vh - 90px);
  overflow: hidden;
}

.win-patch-task-detail__actions {
  margin-bottom: 0;
  padding-right: 4px;
}

.win-patch-descriptions {
  margin-bottom: 4px;
  flex: 0 0 auto;
}

.win-patch-task-runs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-bg-color);
}

.win-patch-task-runs__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.win-patch-task-runs__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex: 1;
  flex-wrap: wrap;
}

.clickable-tag {
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

.win-patch-task-scripts {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.win-patch-task-scripts__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.win-patch-task-scripts__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.win-patch-task-scripts__hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.win-patch-task-scripts__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.win-patch-task-step {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.win-patch-task-step__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.win-patch-task-step__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.win-patch-task-step__hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.win-patch-task-step__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.win-patch-section-title {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.win-patch-task-detail__table {
  margin-top: 0;
  flex: 1 1 auto;
  min-height: 0;
}

@media (max-width: 1200px) {
  .win-patch-task-detail {
    max-height: calc(92vh - 80px);
  }

  .win-patch-task-runs {
    flex-direction: column;
    align-items: flex-start;
  }

  .win-patch-task-runs__actions {
    width: 100%;
    justify-content: flex-start;
  }

  .win-patch-task-step {
    flex-direction: column;
    align-items: flex-start;
  }

  .win-patch-task-step__actions {
    width: 100%;
    flex-wrap: wrap;
  }
}

:deep(.win-patch-table__time-column .cell) {
  white-space: nowrap;
}
</style>
