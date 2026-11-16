<template>
  <el-dialog
    v-model="visibleModel"
    :title="t('patches.windows.rollbackWizard')"
    width="1000px"
    destroy-on-close
    append-to-body
    class="install-dialog win-patch-rollback-wizard"
    :close-on-click-modal="false"
    :show-close="!dialogBusy"
    :close-on-press-escape="false"
    :before-close="handleBeforeClose"
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
      :title="t('patches.windows.preCheckScript')" run-title-key="pre-check"
      :description="t('patches.windows.rollbackPreScriptHint')"
      :placeholder="t('patches.windows.rollbackPreScriptExample')"
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
      :description="t('patches.windows.rollbackValidateScriptHint')"
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
      :model-value="rollbackOptions"
      confirm-mode
      :title="t('patches.windows.restartRescanStrategy')"
      :alert-title="t('patches.windows.rollbackRestartHint')"
      :alert-description="t('patches.windows.restartStepHint')"
      :reboot-hint="t('patches.windows.rebootHint')"
      :rescan-hint="t('patches.windows.rollbackRescanHint')"
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

        <el-button v-else-if="dialogBusy" type="primary" loading disabled>{{ t('patches.linux.executingEllipsis') }}</el-button>

        <el-button v-else-if="pipelineStatus === 'paused'" type="primary" @click="startExecution">
          {{ t('patches.linux.resumeQuery') }}
        </el-button>

        <el-button
          v-else
          type="primary"
          :disabled="pipelineStatus === 'idle' && selectedHistUpdateIds.length === 0"
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
  set: value => {
    if (!value && dialogBusy.value) return
    emit('update:modelValue', value)
  }
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
  selectedHistUpdateIds,
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
  onSubmitted: task =>
    emit('submitted', {
      ...(task || {}),
      openDetail: false,
      refreshLogs: false
    }),
  onSuccess: task => emit('success', task)
})

const primaryButtonText = computed(() => {
  if (pipelineStatus.value === 'success') return t('execution.jobStatus.COMPLETED')
  if (pipelineStatus.value === 'failed') return t('common.close')
  return t('patches.windows.startRollback')
})

function handleBeforeClose(done) {
  if (!dialogBusy.value) done()
}

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
