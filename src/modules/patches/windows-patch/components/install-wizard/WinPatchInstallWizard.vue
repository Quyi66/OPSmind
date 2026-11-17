<template>
  <el-dialog
    v-model="visibleModel"
    :title="t('patches.linux.installWizard')"
    width="1000px"
    destroy-on-close
    append-to-body
    class="install-dialog win-patch-install-wizard"
    :close-on-click-modal="false"
    :show-close="!dialogBusy"
    @closed="resetState"
    :close-on-press-escape="false"
  >
    <WinPatchInstallWizardStepper
      :active-index="activeStep"
      :steps="wizardSteps"
      :step-states="wizardStepStates"
    />

    <WinPatchInstallWizardSummaryStep
      v-show="currentStepKey === 'summary'"
      :host-summaries="hostSummaries"
      :host-summary="hostSummary"
      :selected-rows="selectedPatchItems"
    />

    <WinPatchInstallWizardScriptStep
      v-show="currentStepKey === 'pre-check'"
      :model-value="preScriptConfig"
      :title="t('patches.windows.preCheckScript')" run-title-key="pre-check"
      :description="t('patches.windows.installPreScriptHint')"
      :placeholder="t('patches.windows.preScriptExample')"
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
      :title="t('patches.linux.validationScript')" run-title-key="validate"
      :description="t('patches.windows.installValidateScriptHint')"
      :placeholder="t('patches.windows.validateScriptExample')"
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
      :host-summaries="hostSummaries"
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

    <PatchImplementationPlan v-if="currentStepKey === 'execute' && !currentTaskId"
      v-model="planDraft" :disabled="dialogBusy" />
    <el-alert v-if="pendingApproval" :title="t('patches.linux.awaitApprovalHint')"
      type="info" :closable="false" />

    <template #footer>
      <div class="dialog-footer win-patch-install-wizard__footer">
        <!-- <el-button v-if="!dialogBusy && pipelineStatus === 'idle'" @click="visibleModel = false">取消</el-button> -->
        <el-button v-if="canGoBack" @click="goBack">{{ t('patches.linux.previousStep') }}</el-button>

        <el-button
          v-if="currentStepKey !== 'execute' && currentStepSkippable"
          :disabled="dialogBusy || Boolean(currentTaskId)"
          @click="skipCurrentStep"
        >
          {{ t('patches.linux.skipStep') }}
        </el-button>

        <el-button
          v-if="currentStepKey !== 'execute'"
          type="primary"
          :disabled="!canGoNext"
          @click="goNext"
        >
          {{ t('patches.linux.nextStep') }}
        </el-button>

        <el-button v-else-if="pendingApproval" tag="router-link"
          :to="{ name: 'patches-installTasks', query: { taskId: currentTaskId } }">
          {{ t('patches.changeControl.openApplication') }}
        </el-button>

        <el-button v-else-if="dialogBusy" type="primary" loading disabled>{{ t('patches.linux.executingEllipsis') }}</el-button>

        <el-button
          v-else
          type="primary"
          :disabled="
            !['success', 'failed'].includes(pipelineStatus) && selectedPatchStatusIds.length === 0
          "
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
import { t } from '@/core/i18n'
import PatchImplementationPlan from '../../../components/change-control/PatchImplementationPlan.vue'
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
  hostSummaries: {
    type: Array,
    default: () => []
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
  planDraft,
  pendingApproval,
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
  if (pipelineStatus.value === 'success') return t('execution.jobStatus.COMPLETED')
  if (pipelineStatus.value === 'failed') return t('common.close')
  return t('patches.windows.startInstallation')
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
