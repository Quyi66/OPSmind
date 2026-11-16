<template>
  <el-dialog
    v-model="visible"
    :title="t('patches.logs.processDetails')"
    width="1000px"
    :close-on-click-modal="true"
    destroy-on-close
    class="process-log-dialog"
    @open="load"
    @closed="handleClosed"
  >
    <div v-loading="loading" class="process-detail">
      <template v-if="detailTask">
        <section v-if="isRejected" class="rejection-banner" role="status" :aria-label="t('patches.logs.installRejected')">
          <div class="rejection-banner__content">
            <div class="rejection-banner__summary">
              <span class="rejection-banner__title">{{ t('patches.logs.installRejected') }}</span>
              <span class="rejection-banner__reason">{{ detailTask.approvalComment || detailTask.errorMessage || t('patches.logs.adminRejected') }}</span>
            </div>
            <div class="rejection-banner__hint">{{ t('patches.logs.requestSettingsHint') }}</div>
          </div>
        </section>
        <el-descriptions v-if="detailTask.scheduledTime" :column="2" border>
          <el-descriptions-item :label="t('patches.linux.taskStatus')">{{ detailTask.status === 'CREATED' ? t('patches.linux.waitingScheduledExecution') : formatTaskStatus(detailTask.status) }}</el-descriptions-item>
          <el-descriptions-item :label="t('patches.linux.scheduledTime')">{{ formatDateTime(detailTask.scheduledTime) }}</el-descriptions-item>
          <el-descriptions-item :label="t('automation.approval.applicant')">{{ detailTask.createdBy || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="t('automation.approval.approver')">{{ detailTask.approvedBy || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="t('automation.approval.approvedAt')">{{ formatDateTime(detailTask.approvedTime) }}</el-descriptions-item>
        </el-descriptions>
        <PatchTaskStepper
          class="process-detail__stepper"
          :steps="wizardSteps"
          :active-index="currentStep"
          :states="detailStepStates"
          :completed-by-index="false"
          clickable
          @select="currentStep = $event"
        />

        <PatchTaskSelectionOverview
          v-show="currentStepKey === 'select'"
          :selection-title="operationConfig.selectionTitle"
          :selection-items="selectionItems"
          :package-title="operationConfig.packageCardTitle"
          :host-title="operationConfig.hostCardTitle"
        >
          <template #packages>
            <PatchTaskPackageList class="card-body card-body--scroll" :items="affectedPackages" />
          </template>
          <template #hosts>
            <div class="card-body card-body--scroll">
              <div class="selection-item__primary">{{ t('patches.linux.totalPrefix') }} {{ hosts.length }} {{ t('patches.linux.hostUnit') }}</div>
              <div v-for="host in hosts" :key="host" class="selection-item">
                <div class="selection-item__primary">{{ host }}</div>
              </div>
              <div v-if="hosts.length === 0" class="no-data">{{ t('common.noData') }}</div>
            </div>
          </template>
        </PatchTaskSelectionOverview>

        <div v-show="currentStepKey === 'pre'" class="task-step-content">
          <ScriptStepContent
            icon="fa-code"
            :title="t('patches.linux.preScript')"
            :alert="isRejected ? rejectedStepAlert : preCheckAlert"
            :run-id="preCheckRunId"
            :script-content="preCheckScript"
            @show-result="openExecuteResult($event, '', 'preScript')"
          />

          <PatchTaskPreCheckResult :result="parsedPreCheckResult" />
        </div>

        <ScriptStepContent
          v-show="currentStepKey === 'validate'"
          icon="fa-check-square-o"
          :title="t('patches.linux.validationScript')"
          :alert="isRejected ? rejectedStepAlert : validateAlert"
          :run-id="validateRunId"
          :script-content="validateScript"
          @show-result="openExecuteResult($event, '', 'validationScript')"
        />

        <div v-show="currentStepKey === 'restart'" class="task-step-content">
          <div class="task-step-editor">
            <div class="task-step-editor__title">
              <i class="fa fa-refresh" />
              {{ t('patches.linux.restartPolicy') }}
            </div>
            <el-alert
              :type="isRejected ? 'info' : restartAlert.type"
              :closable="false"
              show-icon
              :title="isRejected ? rejectedStepAlert.title : restartAlert.title"
              class="task-step-alert"
            >
              <template #default>
                <div class="task-detail-info">
                  <div>{{ detailTask.restartReason || t('patches.logs.noRestartDescription') }}</div>
                  <el-button
                    v-if="restartRunId"
                    type="primary"
                    link
                    class="execute-result-link"
                    @click="openExecuteResult(restartRunId, '', 'restartRun')"
                  >
                    {{ t('patches.linux.viewExecution') }}
                  </el-button>
                </div>
              </template>
            </el-alert>
          </div>
        </div>

        <div v-show="currentStepKey === 'execute'" class="task-step-content">
          <div class="task-step-editor">
            <div class="task-step-editor__title">
              <i class="fa fa-download" />
              {{ operationConfig.executeTitle }}
            </div>

            <div class="install-summary-card">
              <PatchTaskSummaryRow
                :label="operationConfig.selectionSummaryLabel"
                :items="selectionItems"
                :empty-text="t('common.noData')"
              />
              <PatchTaskSummaryRow :label="t('execution.ui.targetHost')" :items="hosts" :empty-text="t('patches.linux.noHosts')" />
              <PatchTaskSummaryRow
                :label="operationConfig.packageSummaryLabel"
                :items="affectedPackages"
                :empty-text="t('patches.linux.noPackages')"
                package-style
              />
            </div>

            <PatchTaskPipeline
              class="mt-3"
              :items="detailPipelineItems"
              pending-icon
              @show-result="openExecuteResult"
            />

            <PatchTaskPreCheckResult :result="parsedPreCheckResult" />

            <!-- 全流程中断异常提示 -->
            <el-alert
              v-if="isTaskFailed"
              type="error"
              :closable="false"
              show-icon
              :title="taskErrorMessage ? t('patches.logs.interruptedReason', { error: taskErrorMessage }) : t('patches.logs.interruptedTask')"
              class="task-step-alert mt-3"
            >
              <template #default>
                <div style="font-size: 13px">
                  {{ taskErrorMessage ? t('patches.logs.stoppedReason', { error: taskErrorMessage }) : t('patches.logs.stopped') }}
                </div>
              </template>
            </el-alert>
          </div>
        </div>
      </template>
    </div>

    <template #footer>
      <div class="dialog-footer process-detail__footer">
        <el-button @click="visible = false">{{ t('common.close') }}</el-button>
        <el-button :disabled="currentStep === 0" @click="currentStep -= 1">{{ t('patches.linux.previousStep') }}</el-button>
        <el-button
          :disabled="currentStep >= wizardSteps.length - 1"
          type="primary"
          @click="currentStep += 1"
        >
          {{ t('patches.linux.nextStep') }}
        </el-button>
      </div>
    </template>
  </el-dialog>

  <ExecuteResultDialog
    v-model:visible="executeResultVisible"
    :run-id="executeRunId"
    :job-title="executeJobTitle"
  />
</template>

<script setup>

import { t } from '@/core/i18n'
import { computed, ref, toRef } from 'vue'
import { formatDateTime, formatTaskStatus } from '../../utils/patchProcessLogs'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { usePatchProcessLogDetail } from '../../composables/usePatchProcessLogDetail'
import ScriptStepContent from './PatchProcessLogScriptStep.vue'
import PatchTaskSummaryRow from '../patch-task/PatchTaskSummaryRow.vue'
import { useActiveTaskListPolling } from '@/composables/useActiveTaskListPolling'
import PatchTaskPackageList from '../patch-task/PatchTaskPackageList.vue'
import PatchTaskPipeline from '../patch-task/PatchTaskPipeline.vue'
import PatchTaskPreCheckResult from '../patch-task/PatchTaskPreCheckResult.vue'
import PatchTaskSelectionOverview from '../patch-task/PatchTaskSelectionOverview.vue'
import PatchTaskStepper from '../patch-task/PatchTaskStepper.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  task: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})
const sourceTask = toRef(props, 'task')
const executeResultVisible = ref(false)
const executeRunId = ref('')
const executeJobKey = ref('')
const executeJobFallback = ref('')
const executeJobTitle = computed(() => {
  const directKeys = { preScript: 'patches.linux.preScript', validationScript: 'patches.linux.validationScript', restartRun: 'patches.linux.executeRestart' }
  const key = directKeys[executeJobKey.value]
  return key ? t(key) : pipelineItems.value.find(item => item.key === executeJobKey.value)?.label || executeJobFallback.value
})

const {
  loading,
  task: detailTask,
  currentStep,
  currentStepKey,
  operationConfig,
  wizardSteps,
  selectionItems,
  hosts,
  affectedPackages,
  preCheckScript,
  validateScript,
  preCheckAlert,
  validateAlert,
  restartAlert,
  preCheckRunId,
  validateRunId,
  restartRunId,
  pipelineItems,
  taskErrorMessage,
  isTaskFailed,
  parsedPreCheckResult,
  load,
  refresh,
  reset,
  getWizardStepState
} = usePatchProcessLogDetail(sourceTask)

const isRejected = computed(() => String(detailTask.value?.status || '').trim().toUpperCase() === 'REJECTED')
const rejectedStepAlert = { type: 'info', get title() { return t('patches.logs.rejectedStepHint') } }
const detailStepStates = computed(() =>
  wizardSteps.value.map(step => isRejected.value ? 'idle' : getWizardStepState(step.key))
)
const detailPipelineItems = computed(() => isRejected.value
  ? pipelineItems.value.map(item => ({ ...item, state: 'idle', runId: '', text: t('patches.logs.rejectedNotExecuted') }))
  : pipelineItems.value
)

useActiveTaskListPolling({
  records: () => (detailTask.value ? [detailTask.value] : []),
  refresh,
  enabled: () => props.modelValue && !loading.value,
  activeStatuses: ['PENDING_APPROVAL', 'CREATED', 'PRE_CHECKING', 'INSTALLING', 'ROLLING_BACK', 'RESTARTING', 'VALIDATING']
})

function openExecuteResult(runId, jobTitle = '', titleKey = '') {
  if (!runId) return
  executeRunId.value = runId
  executeJobKey.value = titleKey
  executeJobFallback.value = jobTitle
  executeResultVisible.value = true
}

function handleClosed() {
  reset()
  executeResultVisible.value = false
  executeRunId.value = ''
  executeJobKey.value = ''
  executeJobFallback.value = ''
}
</script>

<style scoped lang="scss">
@use '../patch-task/PatchTaskStep' as patch-task-step;

@include patch-task-step.base-layout;

:deep(.process-log-dialog) {
  .el-dialog {
    border-radius: 12px;
    overflow: hidden;
    max-height: calc(100vh - 40px);
    display: flex;
    flex-direction: column;
  }

  .el-dialog__header {
    margin-right: 0;
    padding: 18px 24px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .el-dialog__body {
    padding: 20px 24px 12px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  .el-dialog__footer {
    padding: 12px 24px 20px;
    border-top: 1px solid var(--el-border-color-lighter);
  }
}

.process-detail {
  min-height: 420px;
  padding-right: 4px;
}

.rejection-banner {
  margin-bottom: 16px;
  padding: 12px 16px;
  border: 1px solid var(--el-color-danger-light-7);
  border-left: 3px solid var(--el-color-danger);
  border-radius: 6px;
  background: var(--el-color-danger-light-9);
}

.rejection-banner__content {
  min-width: 0;
  overflow-wrap: anywhere;
}

.rejection-banner__title {
  color: var(--el-color-danger);
  font-size: 14px;
  font-weight: 600;
}

.rejection-banner__reason {
  color: var(--el-text-color-primary);
  font-size: 13px;
  line-height: 1.6;
}

.rejection-banner__hint {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.rejection-banner__summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  line-height: 1.6;
}

.process-detail .process-detail__stepper {
  margin: 24px 0 28px;
}

.process-detail__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.execute-result-link {
  font-size: 14px;
}

.install-summary-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  overflow: hidden;
  margin-top: 4px;
}

.no-data {
  color: var(--el-text-color-placeholder);
}

.mt-3 {
  margin-top: 12px;
}

@media (max-width: 900px) {
  :deep(.process-log-dialog) {
    .el-dialog {
      width: calc(100vw - 24px) !important;
      margin: 0 auto;
    }

    .el-dialog__header,
    .el-dialog__body,
    .el-dialog__footer {
      padding-left: 16px;
      padding-right: 16px;
    }
  }
}
</style>
