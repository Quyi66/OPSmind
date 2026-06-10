<template>
  <el-dialog
    v-model="visibleModel"
    title="补丁安装向导"
    width="1000px"
    top="5vh"
    destroy-on-close
    append-to-body
    class="install-dialog win-patch-install-wizard"
    :close-on-click-modal="false"
    :show-close="!dialogBusy"
    @closed="resetState"
  >
    <WinPatchInstallWizardStepper
      :active-index="activeStep"
      :steps="wizardSteps"
      :step-states="wizardStepStates"
    />

    <WinPatchInstallWizardSummaryStep
      v-show="currentStepKey === 'summary'"
      :host-summary="hostSummary"
      :selected-rows="selectedPatchItems"
    />

    <WinPatchInstallWizardScriptStep
      v-show="currentStepKey === 'pre-check'"
      :model-value="preScriptConfig"
      title="预检查脚本"
      description="支持手动编辑或上传 PowerShell 脚本。未配置时，预检查步骤会在执行流程中自动跳过。"
      placeholder="例如：Write-Host 'pre check'"
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
      description="用于确认补丁安装效果。支持手动编辑或上传 PowerShell 脚本，未配置时会在执行流程中自动跳过。"
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
      :model-value="installOptions"
      confirm-mode
      @update:model-value="updateInstallOptions"
    />

    <WinPatchInstallWizardExecuteStep
      v-show="currentStepKey === 'execute'"
      :available-run-items="availableRunItems"
      :error-message="taskErrorMessage"
      :host-summary="hostSummary"
      :install-options="installOptions"
      :pipeline-items="pipelineItems"
      :pipeline-status="pipelineStatus"
      :pre-script-config="preScriptConfig"
      :selected-patches="selectedPatchItems"
      :skipped-steps="skippedSteps"
      :task-id="currentTaskId"
      :validate-script-config="validateScriptConfig"
      @view-run="openRunResult"
    />

    <template #footer>
      <div class="dialog-footer win-patch-install-wizard__footer">
        <!-- <el-button v-if="!dialogBusy && pipelineStatus === 'idle'" @click="visibleModel = false">取消</el-button> -->
        <el-button v-if="canGoBack" @click="goBack">上一步</el-button>

        <el-button
          v-if="currentStepKey !== 'execute' && currentStepSkippable"
          :disabled="dialogBusy || Boolean(currentTaskId)"
          @click="skipCurrentStep"
        >
          跳过此步
        </el-button>

        <el-button
          v-if="currentStepKey !== 'execute'"
          type="primary"
          :disabled="!canGoNext"
          @click="goNext"
        >
          下一步
        </el-button>

        <el-button v-else-if="dialogBusy" type="primary" loading disabled>执行中...</el-button>

        <el-button
          v-else
          type="primary"
          :disabled="selectedPatchStatusIds.length === 0"
          @click="handlePrimaryAction"
        >
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
import WinPatchInstallWizardExecuteStep from './WinPatchInstallWizardExecuteStep.vue'
import WinPatchInstallWizardRestartStep from './WinPatchInstallWizardRestartStep.vue'
import WinPatchInstallWizardScriptStep from './WinPatchInstallWizardScriptStep.vue'
import WinPatchInstallWizardStepper from './WinPatchInstallWizardStepper.vue'
import WinPatchInstallWizardSummaryStep from './WinPatchInstallWizardSummaryStep.vue'
import { useWinPatchInstallWizard } from '../../composables/useWinPatchInstallWizard'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  hostSummary: {
    type: Object,
    default: null
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
  installOptions,
  openRunResult,
  pipelineItemMap,
  pipelineItems,
  pipelineStatus,
  preScriptConfig,
  resetState,
  selectedPatchItems,
  selectedPatchStatusIds,
  showRunResultDialog,
  skipCurrentStep,
  skippedSteps,
  startExecution,
  taskErrorMessage,
  updateInstallOptions,
  updatePreScriptConfig,
  updateValidateScriptConfig,
  validateScriptConfig,
  wizardStepStates,
  wizardSteps
} = useWinPatchInstallWizard({
  hostSummary: toRef(props, 'hostSummary'),
  selectedRows: toRef(props, 'selectedRows'),
  onSubmitted: task => emit('submitted', task),
  onSuccess: task => emit('success', task)
})

const primaryButtonText = computed(() => {
  if (pipelineStatus.value === 'success') return '完成'
  if (pipelineStatus.value === 'failed') return '关闭'
  return '开始执行安装'
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
.win-patch-install-wizard__footer {
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
