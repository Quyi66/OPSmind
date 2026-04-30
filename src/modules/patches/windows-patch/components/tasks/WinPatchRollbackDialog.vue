<template>
  <el-dialog
    v-model="visibleModel"
    title="补丁回滚向导"
    width="1000px"
    top="5vh"
    destroy-on-close
    append-to-body
    class="install-dialog win-patch-rollback-wizard"
    :close-on-click-modal="false"
    :show-close="!dialogBusy"
    @closed="resetState"
  >
    <WinPatchInstallWizardStepper
      :active-index="activeStep"
      :steps="wizardSteps"
      :step-states="wizardStepStates"
    />

    <WinPatchRollbackWizardSummaryStep
      v-show="currentStepKey === 'summary'"
      :host-items="selectedHostItems"
      :selected-rows="selectedRollbackItems"
    />

    <WinPatchInstallWizardScriptStep
      v-show="currentStepKey === 'pre-check'"
      :model-value="preScriptConfig"
      title="预检查脚本"
      description="支持手动编辑或上传 PowerShell 脚本。未配置时，预检查步骤会在回滚流程中自动跳过。"
      placeholder="例如：Write-Host 'pre rollback check'"
      :disabled="Boolean(currentTaskId) || dialogBusy"
      :status="pipelineItemMap.PRE_CHECK?.uiStatus || 'idle'"
      :run-id="pipelineItemMap.PRE_CHECK?.runId || ''"
      :error-message="taskErrorMessage"
      @update:model-value="updatePreScriptConfig"
      @view-run="openRunResult"
    />

    <WinPatchInstallWizardScriptStep
      v-show="currentStepKey === 'validate'"
      :model-value="validateScriptConfig"
      title="校验脚本"
      description="用于确认补丁回滚效果。支持手动编辑或上传 PowerShell 脚本，未配置时会在执行流程中自动跳过。"
      placeholder="例如：Get-HotFix | Where-Object { $_.HotFixID -eq 'KB5031364' }"
      :disabled="Boolean(currentTaskId) || dialogBusy"
      :status="pipelineItemMap.VALIDATE?.uiStatus || 'idle'"
      :run-id="pipelineItemMap.VALIDATE?.runId || ''"
      :error-message="taskErrorMessage"
      @update:model-value="updateValidateScriptConfig"
      @view-run="openRunResult"
    />

    <WinPatchInstallWizardRestartStep
      v-show="currentStepKey === 'restart'"
      :model-value="rollbackOptions"
      title="重启与重扫策略"
      alert-title="这里统一配置回滚任务中的重启与自动重扫策略。"
      alert-description="当前向导会在校验脚本之后展示这一页，未启用的项会在任务推进时自动跳过。"
      reboot-hint="启用后，任务进入重启环节时会继续执行主机重启。"
      rescan-hint="启用后，任务收尾阶段会自动刷新当前主机的补丁状态。"
      @update:model-value="updateRollbackOptions"
    />

    <WinPatchRollbackWizardExecuteStep
      v-show="currentStepKey === 'execute'"
      :available-run-items="availableRunItems"
      :error-message="taskErrorMessage"
      :host-items="selectedHostItems"
      :pipeline-items="pipelineItems"
      :pipeline-status="pipelineStatus"
      :pre-script-config="preScriptConfig"
      :rollback-options="rollbackOptions"
      :selected-rollback-items="selectedRollbackItems"
      :skipped-steps="skippedSteps"
      :task-id="currentTaskId"
      :validate-script-config="validateScriptConfig"
      @view-run="openRunResult"
    />

    <template #footer>
      <div class="dialog-footer win-patch-rollback-wizard__footer">
        <el-button v-if="canGoBack" @click="goBack">上一步</el-button>

        <el-button
          v-if="currentStepKey !== 'execute' && currentStepSkippable"
          :disabled="dialogBusy || Boolean(currentTaskId)"
          @click="skipCurrentStep"
        >
          跳过此步
        </el-button>

        <el-button v-if="currentStepKey !== 'execute'" type="primary" :disabled="!canGoNext" @click="goNext">
          下一步
        </el-button>

        <el-button v-else-if="dialogBusy" type="primary" loading disabled>
          执行中...
        </el-button>

        <el-button v-else type="primary" :disabled="selectedInstallLogIds.length === 0" @click="handlePrimaryAction">
          {{ primaryButtonText }}
        </el-button>
      </div>
    </template>
  </el-dialog>

  <ExecuteResultDialog
    v-model:visible="showRunResultDialog"
    :run-id="currentRunId"
    :job-title="currentRunTitle"
  />
</template>

<script setup>
import { computed, toRef } from 'vue'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import WinPatchInstallWizardRestartStep from '../install-wizard/WinPatchInstallWizardRestartStep.vue'
import WinPatchInstallWizardScriptStep from '../install-wizard/WinPatchInstallWizardScriptStep.vue'
import WinPatchInstallWizardStepper from '../install-wizard/WinPatchInstallWizardStepper.vue'
import WinPatchRollbackWizardExecuteStep from '../rollback-wizard/WinPatchRollbackWizardExecuteStep.vue'
import WinPatchRollbackWizardSummaryStep from '../rollback-wizard/WinPatchRollbackWizardSummaryStep.vue'
import { useWinPatchRollbackWizard } from '../../composables/useWinPatchRollbackWizard'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  selectedRows: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'submitted', 'success'])

const visibleModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const {
  activeStep,
  availableRunItems,
  canGoBack,
  canGoNext,
  currentRunId,
  currentRunTitle,
  currentStepKey,
  currentStepSkippable,
  currentTaskId,
  dialogBusy,
  goBack,
  goNext,
  openRunResult,
  pipelineItemMap,
  pipelineItems,
  pipelineStatus,
  preScriptConfig,
  resetState,
  rollbackOptions,
  selectedHostItems,
  selectedInstallLogIds,
  selectedRollbackItems,
  showRunResultDialog,
  skipCurrentStep,
  skippedSteps,
  startExecution,
  taskErrorMessage,
  updatePreScriptConfig,
  updateRollbackOptions,
  updateValidateScriptConfig,
  validateScriptConfig,
  wizardStepStates,
  wizardSteps
} = useWinPatchRollbackWizard({
  selectedRows: toRef(props, 'selectedRows'),
  onSubmitted: task => emit('submitted', {
    ...(task || {}),
    openDetail: false,
    refreshLogs: false
  }),
  onSuccess: task => emit('success', task)
})

const primaryButtonText = computed(() => {
  if (pipelineStatus.value === 'success') return '完成'
  if (pipelineStatus.value === 'failed') return '关闭'
  return '开始执行回滚'
})

async function handlePrimaryAction() {
  if (pipelineStatus.value === 'success' || pipelineStatus.value === 'failed') {
    visibleModel.value = false
    return
  }

  await startExecution()
}
</script>

<style scoped lang="scss">
.win-patch-rollback-wizard__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

:deep(.el-dialog__body) {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 560px;
}
</style>
