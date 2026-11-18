<template>
  <el-dialog
    v-model="dialogVisible"
    :title="t('patches.changeControl.applicationDetail')"
    width="900px"
    :close-on-click-modal="!canHandlePreCheckFailure && !actionLoading"
    :close-on-press-escape="!canHandlePreCheckFailure && !actionLoading"
  >
    <div v-loading="loading" class="task-detail-body">
      <div v-if="loadError" class="task-load-error">
        <el-alert :title="loadError" type="error" :closable="false" show-icon />
        <el-button type="primary" :loading="loading" @click="retryLoadTask">{{ t('patches.linux.retryLoad') }}</el-button>
      </div>
      <template v-if="taskDetail">
        <el-alert
          v-if="['PENDING_APPROVAL', 'CREATED', 'REJECTED', 'EXPIRED'].includes(taskDetail.status)"
          :title="formatTaskStatus(taskDetail.status)"
          :type="['REJECTED', 'EXPIRED'].includes(taskDetail.status) ? 'error' : 'info'"
          :closable="false"
          show-icon
        >
          {{ statusDescription }}
        </el-alert>

        <div class="ops-stepper">
          <div class="stepper-item is-success">
            <div class="stepper-icon"><i class="fa fa-check" /></div>
            <div class="stepper-title">{{ t('patches.linux.createTask') }}</div>
          </div>
          <div class="stepper-line is-active" />
          <div class="stepper-item" :class="stepClass(stepStates[1])">
            <div class="stepper-icon">
              <i v-if="stepStates[1] === 'failed'" class="fa fa-times" />
              <i v-else-if="stepStates[1] === 'success'" class="fa fa-check" />
              <i v-else-if="stepStates[1] === 'active'" class="fa fa-spinner fa-spin" />
              <span v-else>2</span>
            </div>
            <div class="stepper-title">{{ t('patches.linux.environmentPrecheck') }}</div>
          </div>
          <div class="stepper-line" :class="{ 'is-active': stepStates[2] !== 'idle' }" />
          <div class="stepper-item" :class="stepClass(stepStates[2])">
            <div class="stepper-icon">
              <i v-if="stepStates[2] === 'failed'" class="fa fa-times" />
              <i v-else-if="stepStates[2] === 'success'" class="fa fa-check" />
              <i v-else-if="stepStates[2] === 'active'" class="fa fa-spinner fa-spin" />
              <span v-else>3</span>
            </div>
            <div class="stepper-title">{{ t('patches.linux.installBatches') }}</div>
          </div>
        </div>

        <div class="task-summary">
          <div>
            <strong>{{ t('patches.linux.installContentLabel') }}</strong>
            {{ installContent }}
          </div>
          <div>
            <strong>{{ t('patches.linux.batchSizeLabel') }}</strong>
            {{ taskDetail.batchSize || 50 }} {{ t('patches.linux.hostsPerBatch') }}
          </div>
          <div>
            <strong>{{ t('patches.linux.targetAssetCount') }}</strong>
            {{ targetCount }} {{ t('patches.linux.hostUnit') }}
          </div>
          <div>
            <strong>{{ t('patches.linux.taskStatusLabel') }}</strong>
            <el-tag
              :type="getTaskStatusTagType(taskDetail.status)"
              :style="getTaskStatusTagStyle(taskDetail.status)"
              size="small"
              effect="light"
              round
            >
              {{
                taskDetail.status === 'CREATED' && taskDetail.scheduledTime
                  ? t('patches.linux.waitingScheduledExecution')
                  : formatTaskStatus(taskDetail.status)
              }}
            </el-tag>
            <el-button
              v-if="taskDetail.executeRunId"
              type="primary"
              link
              size="small"
              @click="openExecuteResult"
            >
              {{ t('patches.linux.viewExecutionResult') }}
            </el-button>
          </div>
          <div v-if="taskDetail.scheduledTime">
            <strong>{{ t('patches.linux.scheduledTimeLabel') }}</strong>
            {{ formatDateTime(taskDetail.scheduledTime) }}
          </div>
          <div>
            <strong>{{ t('patches.linux.applicantLabel') }}</strong>
            {{ taskDetail.createdBy || '-' }}
          </div>
          <div v-if="taskDetail.planStartTime || taskDetail.planEndTime">
            <strong>{{ t('patches.changeControl.plan') }}</strong>
            {{ formatDateTime(taskDetail.planStartTime) }} – {{ formatDateTime(taskDetail.planEndTime) }}
          </div>
          <div v-if="taskDetail.applyReason" class="task-summary__full">
            <strong>{{ t('patches.changeControl.reason') }}</strong> {{ taskDetail.applyReason }}
          </div>
          <div v-if="taskDetail.windowCheckResult" class="task-summary__full">
            <strong>{{ t('patches.changeControl.windowResult') }}</strong>
            {{ windowLabel(taskDetail.windowCheckResult) }}
            <el-tag v-if="taskDetail.nonWindowConfirmed" type="warning" effect="plain">
              {{ t('patches.changeControl.nonWindow') }}
            </el-tag>
            <span v-if="taskDetail.nonWindowConfirmedBy"> {{ taskDetail.nonWindowConfirmedBy }}
              {{ formatDateTime(taskDetail.nonWindowConfirmedTime) }}</span>
          </div>
          <div>
            <strong>{{ t('patches.linux.approverLabel') }}</strong>
            {{ taskDetail.approvedBy || '-' }}
          </div>
          <div>
            <strong>{{ t('patches.linux.approvalTimeLabel') }}</strong>
            {{ formatDateTime(taskDetail.approvedTime) }}
          </div>
          <div class="task-summary__full">
            <strong>{{ t('patches.linux.approvalCommentLabel') }}</strong>
            {{ taskDetail.approvalComment || '-' }}
          </div>
          <div class="task-summary__full">
            <strong>{{ t('patches.linux.packagesLabel') }}</strong>
            {{ formatJsonArray(taskDetail.packages) || '-' }}
          </div>
          <div class="task-summary__full">
            <strong>{{ t('patches.linux.targetHostsLabel') }}</strong>
            {{ formatJsonArray(taskDetail.hostIds) || '-' }}
          </div>
          <div v-if="taskDetail.errorMessage" class="task-summary__full task-error">
            <strong>{{ t('patches.linux.errorReasonLabel') }}</strong>
            {{ taskDetail.errorMessage }}
          </div>
        </div>

        <div v-if="['PRE_CHECKING', 'INSTALLING'].includes(taskDetail.status)" class="task-running">
          <el-icon class="is-loading"><Loading /></el-icon>
          <div>
            {{
              taskDetail.status === 'PRE_CHECKING'
                ? t('patches.linux.environmentChecking')
                : t('patches.linux.batchInstalling')
            }}
          </div>
        </div>

        <section
          v-if="taskDetail.status === 'PRE_CHECK_FAILED' && parsedPreCheckResult"
          class="precheck-result"
        >
          <h4>{{ t('patches.linux.failedPrechecks') }}</h4>
          <div v-if="parsedPreCheckResult.unreachable?.length" class="precheck-unreachable">
            <strong>{{ t('patches.linux.unreachableHostsLabel') }}</strong>
            <el-tag
              v-for="hostId in parsedPreCheckResult.unreachable"
              :key="hostId"
              type="danger"
              size="small"
            >
              {{ hostId }}
            </el-tag>
          </div>
          <el-collapse v-if="parsedPreCheckResult.results?.length" v-model="activeCollapseNames">
            <el-collapse-item
              v-for="hostResult in parsedPreCheckResult.results"
              :key="hostResult.host_id"
              :name="hostResult.host_id"
              :title="hostResult.host_id"
            >
              <div
                v-for="check in sortChecks(hostResult.checks)"
                :key="check.id"
                class="precheck-item"
              >
                <el-tag
                  :type="
                    check.status === 'fail'
                      ? 'danger'
                      : check.status === 'warn'
                        ? 'warning'
                        : 'success'
                  "
                  size="small"
                >
                  {{ check.status === 'fail' ? t('patches.linux.blocked') : check.status === 'warn' ? t('patches.linux.warning') : t('patches.linux.pass') }}
                </el-tag>
                <strong>{{ checkTitles[check.id] || check.id }}</strong>
                <span>{{ check.detail }}</span>
              </div>
            </el-collapse-item>
          </el-collapse>
        </section>

        <el-alert
          v-if="['INSTALL_DONE', 'COMPLETED'].includes(taskDetail.status)"
          :title="t('patches.linux.batchInstallCompleted')"
          type="success"
          :closable="false"
          show-icon
        />
        <el-alert
          v-if="['INSTALL_FAILED', 'FAILED'].includes(taskDetail.status)"
          :title="t('patches.linux.batchInstallIncomplete')"
          type="error"
          :closable="false"
          show-icon
        />
      </template>
    </div>

    <template v-if="canHandlePreCheckFailure || manualActions.length || canInspect" #footer>
      <el-button v-if="canInspect" @click="inspectionVisible = true">{{ t('patches.changeControl.inspection') }}</el-button>
      <el-button v-for="action in manualActions" :key="action" :loading="actionLoading" :disabled="requestPending"
        @click="runManualStep(action)">{{ t(`patches.changeControl.actions.${action}`) }}</el-button>
      <el-button v-if="canHandlePreCheckFailure" type="warning" :loading="actionLoading"
        :disabled="requestPending" @click="handleSkipPreCheck">
        {{ t('patches.linux.acknowledgeAndInstall') }}
      </el-button>
      <el-button v-if="canHandlePreCheckFailure" type="primary" :loading="actionLoading"
        :disabled="requestPending" @click="handleRetryPreCheck">
        {{ t('patches.linux.repeatPrecheck') }}
      </el-button>
    </template>
  </el-dialog>
  <TaskInspectionDialog v-if="inspectionVisible" v-model="inspectionVisible" :task-id="taskId" :is-admin="isAdmin" />

  <ExecuteResultDialog
    v-model:visible="executeResultVisible"
    :run-id="taskDetail?.executeRunId || ''"
    :job-title="t('patches.linux.scheduledResult')"
  />
</template>

<script setup>
import { t } from '@/core/i18n'
import { message, messageRef } from '@/core/i18n/feedback'
import { createPatchTaskError } from '../utils/patchTaskFeedback'
import { computed, onUnmounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { patchInstallApi } from '../api'
import TaskInspectionDialog from './change-control/TaskInspectionDialog.vue'
import { apiErrorText, isChangeControlCancelled, requestConfirmationPhrase } from '../utils/changeControl'
import { secopsText, useSecopsMessages } from '../utils/secopsMessages'
import {
  formatDateTime,
  formatJsonArray,
  formatTaskStatus,
  getTaskStatusTagStyle,
  getTaskStatusTagType,
  toDisplayArray
} from '../utils/patchProcessLogs'
import {
  canInspectPatchTask,
  isApprovedInstallApplication,
  isFutureSchedule,
  isPackageInstallFinished,
  isTaskExecutionBlocked
} from '../utils/patchInstallSchedule'

const props = defineProps({
  visible: Boolean,
  isAdmin: Boolean,
  taskId: {
    type: [String, Number],
    default: ''
  }
})
const emit = defineEmits(['update:visible'])

const dialogVisible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value)
})
const loading = ref(false)
const requestPending = ref(false)
const loadError = messageRef('')
const actionLoading = ref(false)
const taskDetail = ref(null)
const activeCollapseNames = ref([])
const executeResultVisible = ref(false)
const inspectionVisible = ref(false)
let pollingTimer = null
let requestId = 0
let actionContext = 0
useSecopsMessages()

const canInspect = computed(() => canInspectPatchTask(taskDetail.value))
const isRollback = computed(() => String(taskDetail.value?.taskType || '').toLowerCase() === 'rollback')
const isAutomaticApplication = computed(() => isApprovedInstallApplication(taskDetail.value))
const canRunManualSteps = computed(() => !isAutomaticApplication.value && !isTaskExecutionBlocked(taskDetail.value))
const manualActions = computed(() => {
  if (!canRunManualSteps.value) return []
  const task = taskDetail.value
  if (task.status === 'CREATED' && !task.scheduledTime) return ['precheck', 'skipPrecheck']
  if (task.status === 'PRE_CHECK_DONE') return [isRollback.value ? 'rollback' : 'install']
  if (['INSTALL_DONE', 'ROLLBACK_DONE', 'RESTART_PENDING'].includes(task.status)) return ['restart', 'skipRestart']
  if (task.status === 'RESTART_DONE') return ['validate', 'skipValidate']
  return []
})

function windowLabel(value) {
  return secopsText(`secops.window_result.${value}`, t(`patches.changeControl.results.${value}`, {}, value))
}

function beginTaskAction() {
  if (!dialogVisible.value || !taskDetail.value || actionLoading.value || requestPending.value) return
  const id = taskDetail.value.id
  const requestedTaskId = props.taskId
  const context = actionContext
  actionLoading.value = true
  return {
    id,
    isCurrent: () => context === actionContext && dialogVisible.value &&
      props.taskId === requestedTaskId && taskDetail.value?.id === id,
    finish: () => {
      if (context === actionContext) actionLoading.value = false
    }
  }
}

async function runManualStep(action) {
  if (!manualActions.value.includes(action)) return
  const taskAction = beginTaskAction()
  if (!taskAction) return
  const { id, isCurrent, finish } = taskAction
  try {
    let response
    if (action === 'restart' || action === 'skipRestart') {
      if (action === 'restart') {
        const { data } = await patchInstallApi.getRestartOptions(id)
        if (!isCurrent()) return
        const confirmText = await requestConfirmationPhrase({
          confirmText: data?.confirmText || t('patches.changeControl.restartPhrase'),
          message: data?.restartReason
        }, t('patches.linux.confirmRestart'))
        if (!isCurrent()) return
        await patchInstallApi.confirmRestart(id, true, confirmText)
        if (!isCurrent()) return
        response = await patchInstallApi.executeRestart(id, { isCurrent })
      } else response = await patchInstallApi.confirmRestart(id, false)
    } else {
      const actions = {
        precheck: () => patchInstallApi.executePreCheck(id),
        skipPrecheck: () => patchInstallApi.skipPreCheck(id),
        install: () => patchInstallApi.executeInstallTask(id, { isCurrent }),
        rollback: () => patchInstallApi.executeRollbackTask(id, { isCurrent }),
        validate: () => patchInstallApi.executeValidate(id),
        skipValidate: () => patchInstallApi.skipValidate(id)
      }
      response = await actions[action]()
    }
    if (!isCurrent()) return
    taskDetail.value = response?.data || taskDetail.value
    await loadTask({ silent: true })
    if (isCurrent() && !isPackageInstallFinished(taskDetail.value?.status)) startPolling()
  } catch (error) {
    if (isCurrent() && !isChangeControlCancelled(error))
      ElMessage.error(apiErrorText(error, t('patches.linux.operationFailedRetry')))
  } finally {
    finish()
  }
}

const stepStates = computed(() => {
  const states = ['success', 'idle', 'idle']
  const status = taskDetail.value?.status
  if (status === 'PRE_CHECKING') states[1] = 'active'
  else if (status === 'PRE_CHECK_FAILED') states[1] = 'failed'
  else if (
    [
      'PRE_CHECK_DONE',
      'INSTALLING',
      'INSTALL_DONE',
      'COMPLETED',
      'INSTALL_FAILED',
      'FAILED'
    ].includes(status)
  )
    states[1] = 'success'

  if (status === 'INSTALLING') states[2] = 'active'
  else if (['INSTALL_FAILED', 'FAILED'].includes(status)) states[2] = 'failed'
  else if (['INSTALL_DONE', 'COMPLETED'].includes(status)) states[2] = 'success'
  return states
})

const statusDescription = computed(() => {
  const status = taskDetail.value?.status
  if (status === 'PENDING_APPROVAL') return t('patches.linux.awaitApprovalHint')
  if (status === 'CREATED') {
    if (isAutomaticApplication.value) return t('patches.changeControl.awaitImplementation')
    if (taskDetail.value.scheduledTime) return t('patches.linux.awaitScheduleHint')
    return t('patches.changeControl.ready')
  }
  return t('patches.linux.resubmitHint')
})

const targetCount = computed(() => {
  if (Array.isArray(taskDetail.value?.targets)) return taskDetail.value.targets.length
  return toDisplayArray(taskDetail.value?.hostIds).length
})

const installContent = computed(() => {
  if (taskDetail.value?.packageSetName) return taskDetail.value.packageSetName
  if (taskDetail.value?.packageSetId) return t('patches.linux.packageSetValue', { name: taskDetail.value.packageSetId })
  return t('patches.linux.customPackagesPatches')
})

const parsedPreCheckResult = computed(() => {
  const value = taskDetail.value?.preCheckResult
  if (!value) return null
  try {
    return typeof value === 'string' ? JSON.parse(value) : value
  } catch {
    return null
  }
})

const canHandlePreCheckFailure = computed(
  () => taskDetail.value?.status === 'PRE_CHECK_FAILED' && canRunManualSteps.value
)

const checkTitles = {
  get conn() { return t('patches.linux.connectivity') },
  get sudo() { return t('patches.linux.sudo') },
  get os() { return t('patches.linux.osDetection') },
  get pkg_manager() { return t('patches.linux.packageManager') },
  get pkg_lock() { return t('patches.linux.packageManagerLock') },
  get pkg_db() { return t('patches.linux.packageDatabase') },
  get disk() { return t('patches.linux.diskSpace') },
  get disk_boot() { return t('patches.linux.bootSpace') },
  get kernel_pending() { return t('patches.linux.pendingKernel') },
  get repo() { return t('patches.linux.softwareRepo') },
  get pkg_exists() { return t('patches.linux.packageExists') },
  get version_ok() { return t('patches.linux.targetVersion') },
  get depsolve() { return t('patches.linux.dependencyResolution') },
  get already_satisfied() { return t('patches.linux.alreadyTargetVersion') },
  get exec() { return t('patches.linux.checkExecutionError') }
}

function stepClass(state) {
  return {
    'is-active': state === 'active',
    'is-success': state === 'success',
    'is-failed': state === 'failed'
  }
}

function sortChecks(checks) {
  const order = { fail: 0, warn: 1, ok: 2 }
  return Array.isArray(checks)
    ? [...checks].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3))
    : []
}

async function loadTask({ silent = false } = {}) {
  if (!props.taskId || (silent && requestPending.value)) return false
  const currentRequest = ++requestId
  requestPending.value = true
  if (!silent) {
    loading.value = true
    taskDetail.value = null
  }
  loadError.value = ''
  try {
    const response = await patchInstallApi.getTask(props.taskId)
    if (currentRequest !== requestId) return false
    if (!response?.data) throw createPatchTaskError('patches.linux.taskNotAccessible')
    taskDetail.value = response.data
    const results = parsedPreCheckResult.value?.results
    activeCollapseNames.value = Array.isArray(results) ? results.map(item => item.host_id) : []
    if (isPackageInstallFinished(taskDetail.value?.status)) stopPolling()
    return true
  } catch (error) {
    if (currentRequest === requestId) {
      loadError.value = error?.response?.data?.message || error?.localMessage || error?.message || message('automation.schedule.detailFailed')
      stopPolling()
    }
    return false
  } finally {
    if (currentRequest === requestId) {
      requestPending.value = false
      if (!silent) loading.value = false
    }
  }
}

async function retryLoadTask() {
  if (await loadTask() && !isPackageInstallFinished(taskDetail.value?.status)) startPolling()
}

function startPolling() {
  stopPolling()
  pollingTimer = setInterval(() => {
    if (
      dialogVisible.value &&
      !requestPending.value &&
      !loadError.value &&
      !actionLoading.value &&
      !isFutureSchedule(taskDetail.value?.scheduledTime)
    )
      loadTask({ silent: true })
  }, 5000)
}

function stopPolling() {
  if (pollingTimer) clearInterval(pollingTimer)
  pollingTimer = null
}

async function handleRetryPreCheck() {
  if (!canHandlePreCheckFailure.value) return
  const taskAction = beginTaskAction()
  if (!taskAction) return
  const { id, isCurrent, finish } = taskAction
  try {
    const response = await patchInstallApi.executePreCheck(id)
    if (!isCurrent()) return
    taskDetail.value = response?.data || taskDetail.value
    ElMessage.success(t('patches.linux.precheckRestarted'))
    startPolling()
  } catch (error) {
    if (isCurrent()) ElMessage.error(error?.message || t('patches.linux.precheckRetryFailed'))
  } finally {
    finish()
  }
}

async function handleSkipPreCheck() {
  if (!canHandlePreCheckFailure.value) return
  const taskAction = beginTaskAction()
  if (!taskAction) return
  const { id, isCurrent, finish } = taskAction
  const execute = isRollback.value
    ? () => patchInstallApi.executeRollbackTask(id, { isCurrent })
    : () => patchInstallApi.executeInstallTask(id, { isCurrent })
  try {
    await ElMessageBox.confirm(t('patches.linux.forceInstallConfirm'), t('patches.linux.forceInstallTitle'), {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      get confirmButtonText() { return t('patches.linux.skipAndInstall') },
      get cancelButtonText() { return t('common.cancel') },
      type: 'warning'
    })
    if (!isCurrent()) return
    await patchInstallApi.skipPreCheck(id)
    if (!isCurrent()) return
    const response = await execute()
    if (!isCurrent()) return
    taskDetail.value = response?.data || taskDetail.value
    ElMessage.success(t('patches.linux.precheckSkippedInstall'))
    startPolling()
  } catch (error) {
    if (isCurrent() && !isChangeControlCancelled(error) && error !== 'cancel' && error !== 'close')
      ElMessage.error(apiErrorText(error, t('patches.linux.skipPrecheckFailed')))
  } finally {
    finish()
  }
}

function openExecuteResult() {
  executeResultVisible.value = true
}

watch(
  () => [props.visible, props.taskId],
  ([visible, taskId]) => {
    actionContext += 1
    actionLoading.value = false
    if (!visible || !taskId) {
      inspectionVisible.value = false
      stopPolling()
      requestId += 1
      requestPending.value = false
      loading.value = false
      loadError.value = ''
      taskDetail.value = null
      activeCollapseNames.value = []
      return
    }
    loadTask()
    startPolling()
  },
  { immediate: true }
)

onUnmounted(() => {
  stopPolling()
  requestId += 1
  actionContext += 1
})
</script>

<style scoped lang="scss">
@use './patch-task/wizard/PatchTaskWizard.scss' as *;

.task-detail-body {
  min-height: 120px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.task-load-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}
.task-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 24px;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-light);
  font-size: 13px;
}
.task-summary__full {
  grid-column: 1 / -1;
}
.task-error {
  color: var(--el-color-danger);
}
.task-running {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px;
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
}
.task-running .el-icon {
  font-size: 32px;
  color: var(--el-color-primary);
}
.precheck-result {
  padding: 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
}
.precheck-result h4 {
  margin: 0 0 12px;
  color: var(--el-color-danger);
}
.precheck-unreachable {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.precheck-item {
  display: grid;
  grid-template-columns: auto 140px 1fr;
  align-items: start;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 13px;
}
</style>
