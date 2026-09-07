<template>
  <el-dialog
    v-model="visible"
    title="流程操作详情"
    width="1000px"
    :close-on-click-modal="false"
    destroy-on-close
    class="process-log-dialog"
    @open="load"
    @closed="handleClosed"
  >
    <div v-loading="loading" class="process-detail">
      <template v-if="detailTask">
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
              <div class="selection-item__primary">共 {{ hosts.length }} 台</div>
              <div v-for="host in hosts" :key="host" class="selection-item">
                <div class="selection-item__primary">{{ host }}</div>
              </div>
              <div v-if="hosts.length === 0" class="no-data">暂无数据</div>
            </div>
          </template>
        </PatchTaskSelectionOverview>

        <div v-show="currentStepKey === 'pre'" class="task-step-content">
          <ScriptStepContent
            icon="fa-code"
            title="预执行脚本"
            :alert="preCheckAlert"
            :run-id="preCheckRunId"
            :script-content="preCheckScript"
            @show-result="openExecuteResult($event, '预执行脚本')"
          />

          <PatchTaskPreCheckResult :result="parsedPreCheckResult" />
        </div>

        <ScriptStepContent
          v-show="currentStepKey === 'validate'"
          icon="fa-check-square-o"
          title="校验脚本"
          :alert="validateAlert"
          :run-id="validateRunId"
          :script-content="validateScript"
          @show-result="openExecuteResult($event, '校验脚本')"
        />

        <div v-show="currentStepKey === 'restart'" class="task-step-content">
          <div class="task-step-editor">
            <div class="task-step-editor__title">
              <i class="fa fa-refresh" />
              重启策略
            </div>
            <el-alert
              :type="restartAlert.type"
              :closable="false"
              show-icon
              :title="restartAlert.title"
              class="task-step-alert"
            >
              <template #default>
                <div class="task-detail-info">
                  <div>{{ detailTask.restartReason || '未提供重启说明' }}</div>
                  <el-button
                    v-if="restartRunId"
                    type="primary"
                    link
                    class="execute-result-link"
                    @click="openExecuteResult(restartRunId, '执行重启')"
                  >
                    查看执行详情
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
                empty-text="暂无数据"
              />
              <PatchTaskSummaryRow label="目标主机" :items="hosts" empty-text="暂无主机" />
              <PatchTaskSummaryRow
                :label="operationConfig.packageSummaryLabel"
                :items="affectedPackages"
                empty-text="暂无软件包"
                package-style
              />
            </div>

            <PatchTaskPipeline
              class="mt-3"
              :items="pipelineItems"
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
              :title="`执行任务中断${taskErrorMessage ? '：' + taskErrorMessage : ''}`"
              class="task-step-alert mt-3"
            >
              <template #default>
                <div style="font-size: 13px">
                  由于部分环节出现异常{{
                    taskErrorMessage ? `（${taskErrorMessage}）` : ''
                  }}，任务已停止。请检查原因。
                </div>
              </template>
            </el-alert>
          </div>
        </div>
      </template>
    </div>

    <template #footer>
      <div class="dialog-footer process-detail__footer">
        <el-button @click="visible = false">关闭</el-button>
        <el-button :disabled="currentStep === 0" @click="currentStep -= 1">上一步</el-button>
        <el-button
          :disabled="currentStep >= wizardSteps.length - 1"
          type="primary"
          @click="currentStep += 1"
        >
          下一步
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
import { computed, ref, toRef } from 'vue'
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
const executeJobTitle = ref('')

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
  reset,
  getWizardStepState
} = usePatchProcessLogDetail(sourceTask)

const detailStepStates = computed(() => wizardSteps.value.map(step => getWizardStepState(step.key)))

useActiveTaskListPolling({
  records: () => (detailTask.value ? [detailTask.value] : []),
  refresh: load,
  enabled: () => props.modelValue,
  activeStatuses: ['PRE_CHECKING', 'INSTALLING', 'ROLLING_BACK', 'RESTARTING', 'VALIDATING']
})

function openExecuteResult(runId, jobTitle) {
  if (!runId) return
  executeRunId.value = runId
  executeJobTitle.value = jobTitle
  executeResultVisible.value = true
}

function handleClosed() {
  reset()
  executeResultVisible.value = false
  executeRunId.value = ''
  executeJobTitle.value = ''
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

.process-detail__stepper {
  margin-bottom: 24px;
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
