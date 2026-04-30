export function usePatchTaskPreparedState({
  stopPolling,
  createdTaskId,
  pipelineStatus,
  pipelineFinished,
  stepStates,
  taskStatus,
  taskErrorMessage,
  taskDetailData,
  resetRestartOptions
}) {
  function resetPipelineState() {
    stopPolling()
    pipelineStatus.value = 'idle'
    taskStatus.value = ''
    taskErrorMessage.value = ''
    taskDetailData.value = null
    pipelineFinished.value = false
    for (let i = 1; i < stepStates.length; i++) stepStates[i] = 'idle'
  }

  function canReusePreparedTask() {
    return (
      Boolean(createdTaskId.value) &&
      pipelineStatus.value === 'idle' &&
      !pipelineFinished.value &&
      stepStates.slice(1).every(state => state === 'idle')
    )
  }

  function invalidatePreparedTask() {
    if (!canReusePreparedTask()) return

    createdTaskId.value = ''
    taskStatus.value = ''
    taskErrorMessage.value = ''
    taskDetailData.value = null
    resetRestartOptions()
  }

  return {
    canReusePreparedTask,
    invalidatePreparedTask,
    resetPipelineState
  }
}
