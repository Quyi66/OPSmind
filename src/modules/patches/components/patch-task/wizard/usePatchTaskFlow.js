import { onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'

export function usePatchTaskFlow({
  createdTaskId,
  executionSubmitting,
  pipelineStatus,
  installStep,
  getStepIndex,
  confirmedHosts,
  canReusePreparedTask,
  resetPipelineState,
  resetRestartOptions,
  createExecutionTask,
  syncScriptConfig,
  loadRestartOptions,
  loadRollbackInfo,
  requiresRestartConfirm,
  isSkipped,
  restartConfirmText,
  restartConfirmKeyword,
  currentStepKey,
  stepTransitionLoading,
  selectedHosts,
  stepStates,
  resetSkippedSteps,
  taskDetailData,
  taskErrorMessage,
  taskStatus,
  pipelineFinished,
  finalStepIndex,
  loadRestartAdviceByHostPatch,
  currentStepSkippable,
  isVisible,
  startPipeline,
  resolveApiErrorMessage,
  stopPolling,
  backendRestartReason,
  installConfig,
  resetScriptState,
  hasFixedHosts,
  resetHostAllSelected,
  validateSelectedHosts,
  syncAffectedPackages
}) {
  let session = 0
  const isBusy = () => executionSubmitting?.value || pipelineStatus.value === 'running'
  const configurationLocked = () => isBusy() || pipelineStatus.value === 'paused'

  function resetInstallState() {
    session += 1
    stopPolling()
    installStep.value = 0
    createdTaskId.value = ''
    executionSubmitting.value = false
    backendRestartReason.value = ''
    pipelineStatus.value = 'idle'
    installConfig.restartPolicy = 'none'
    resetScriptState()
    resetRestartOptions()
    if (!hasFixedHosts.value) {
      selectedHosts.value = []
      confirmedHosts.value = []
      if (typeof resetHostAllSelected === 'function') resetHostAllSelected()
    }
    taskStatus.value = ''
    taskErrorMessage.value = ''
    taskDetailData.value = null
    pipelineFinished.value = false
    for (let i = 0; i < stepStates.length; i++) stepStates[i] = 'idle'
    resetSkippedSteps()
    restartConfirmText.value = ''
    stepTransitionLoading.value = false
  }

  async function prepareTaskForExecution(isCurrent = () => true) {
    if (confirmedHosts.value.length === 0) {
      ElMessage.warning('请先选择目标主机')
      installStep.value = getStepIndex('select')
      return false
    }

    if (typeof validateSelectedHosts === 'function') {
      const valid = await validateSelectedHosts(confirmedHosts.value)
      if (!isCurrent() || !valid) return false
    }

    if (!canReusePreparedTask()) {
      resetPipelineState()
      createdTaskId.value = ''
      resetRestartOptions()
      await createExecutionTask(isCurrent)
      if (!isCurrent()) return false
    }

    const preSynced = await syncScriptConfig('pre')
    if (!isCurrent() || !preSynced) return false

    const postSynced = await syncScriptConfig('post')
    if (!isCurrent() || !postSynced) return false

    await loadRestartOptions(isCurrent)
    if (!isCurrent()) return false
    await loadRollbackInfo(isCurrent)
    if (!isCurrent()) return false

    if (
      requiresRestartConfirm.value &&
      !isSkipped.restart &&
      restartConfirmText.value !== restartConfirmKeyword.value
    ) {
      installStep.value = getStepIndex('restart')
      ElMessage.warning('后端评估结果要求确认重启，请完成确认后再开始执行')
      return false
    }

    return true
  }

  async function handleNextStep() {
    if (stepTransitionLoading.value || configurationLocked()) return
    const token = session

    stepTransitionLoading.value = true
    const stepKey = currentStepKey.value

    try {
      if (stepKey === 'select') {
        if (selectedHosts.value.length === 0) return

        if (typeof validateSelectedHosts === 'function') {
          const valid = await validateSelectedHosts(selectedHosts.value)
          if (token !== session || !valid) return
        }

        if (typeof syncAffectedPackages === 'function') {
          const affectedPackagesSynced = await syncAffectedPackages(selectedHosts.value)
          if (token !== session || affectedPackagesSynced === false) return
        }

        if (selectedHosts.value.length === 0) return

        confirmedHosts.value = [...selectedHosts.value]
        for (let i = 1; i < stepStates.length; i++) stepStates[i] = 'idle'
        resetSkippedSteps()
        taskDetailData.value = null
        taskErrorMessage.value = ''
        pipelineFinished.value = false
        pipelineStatus.value = 'idle'
        createdTaskId.value = ''
        resetRestartOptions()
        installStep.value = getStepIndex('pre')
        return
      }

      if (stepKey === 'validate') {
        await loadRestartAdviceByHostPatch(false, () => token === session)
        if (token !== session) return
      }

      if (currentStepKey.value !== 'execute' && installStep.value < finalStepIndex.value) {
        installStep.value += 1
      }
    } finally {
      if (token === session) stepTransitionLoading.value = false
    }
  }

  function goBack() {
    if (configurationLocked() || stepTransitionLoading.value) return
    if (installStep.value > 0) {
      installStep.value--
    }
  }

  function handleSkipStep() {
    if (!currentStepSkippable.value || configurationLocked() || stepTransitionLoading.value) return
    isSkipped[currentStepKey.value] = true
    handleNextStep()
  }

  function handleAdvanceStep() {
    if (configurationLocked() || stepTransitionLoading.value) return
    if (currentStepSkippable.value) {
      isSkipped[currentStepKey.value] = false
    }
    handleNextStep()
  }

  function handlePrimaryAction() {
    if (pipelineStatus.value === 'success') {
      isVisible.value = false
      return
    }

    executeStep()
  }

  async function executeStep() {
    if (executionSubmitting.value || pipelineStatus.value === 'running') return

    const token = session
    const isCurrent = () => token === session
    executionSubmitting.value = true
    try {
      if (pipelineStatus.value === 'paused') {
        await startPipeline()
        return
      }
      const taskPrepared = await prepareTaskForExecution(isCurrent)
      if (!isCurrent() || !taskPrepared) return
      await startPipeline()
    } catch (error) {
      if (isCurrent()) ElMessage.error(resolveApiErrorMessage(error, '任务准备失败，请稍后重试'))
    } finally {
      if (isCurrent()) executionSubmitting.value = false
    }
  }

  onUnmounted(() => {
    session += 1
    stopPolling?.()
  })

  return {
    executeStep,
    goBack,
    handleAdvanceStep,
    handleNextStep,
    handlePrimaryAction,
    handleSkipStep,
    prepareTaskForExecution,
    resetInstallState
  }
}
