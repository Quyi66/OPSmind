import { nextTick, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { patchInstallApi } from '../../../api'

export function usePatchTaskPipeline({
  createdTaskId,
  stepStates,
  taskStatus,
  taskErrorMessage,
  taskDetailData,
  pipelineStatus,
  pipelineFinished,
  installConfig,
  isSkipped,
  isRollbackTask,
  executeStepTitle,
  restartConfirmSubmitText,
  resolveApiErrorMessage,
  loadRestartOptions,
  loadRollbackInfo,
  emitSuccess,
  pipelineSectionRef,
  getStepIndex
}) {
  let session = 0
  let pollTimer = null
  let cancelWait = null
  let progress = null

  function clearTimer() {
    clearTimeout(pollTimer)
    pollTimer = null
  }

  // Reset/close invalidates both pending requests and the suspended execution chain.
  function stopPolling() {
    session += 1
    clearTimer()
    cancelWait?.()
    cancelWait = null
    progress = null
  }

  function checkActive(token, taskId) {
    if (token !== session || createdTaskId.value !== taskId) {
      throw new Error('任务窗口已关闭')
    }
  }

  async function refreshTaskDetail(token = session, taskId = createdTaskId.value) {
    if (!taskId) return null
    const res = await patchInstallApi.getTask(taskId)
    checkActive(token, taskId)
    const data = res?.data
    if (!data?.status) throw new Error('未获取到任务状态')
    taskStatus.value = data.status
    taskErrorMessage.value = data.errorMessage || ''
    taskDetailData.value = data
    return data
  }

  function pollStatusPromise(step, successStatuses, failedStatuses, token, taskId) {
    return new Promise((resolve, reject) => {
      let settled = false
      let failures = 0
      const finish = (error = null) => {
        if (settled) return
        settled = true
        clearTimer()
        cancelWait = null
        if (error) reject(error)
        else {
          stepStates[step] = 'success'
          resolve()
        }
      }
      cancelWait = () => finish(new Error('任务窗口已关闭'))
      const tick = async () => {
        let data
        try {
          data = await refreshTaskDetail(token, taskId)
        } catch (error) {
          if (settled || token !== session) return
          failures += 1
          if (failures >= 3) {
            const queryError = new Error(resolveApiErrorMessage(error, '任务状态查询失败'))
            queryError.queryInterrupted = true
            finish(queryError)
            return
          }
        }
        if (settled || token !== session) return
        if (data) {
          failures = 0
          if (successStatuses.includes(data.status)) {
            finish()
            return
          }
          if (failedStatuses.includes(data.status)) {
            finish(new Error(data.errorMessage || '任务执行失败'))
            return
          }
        }
        // Schedule after the request completes, so slow requests cannot overlap.
        pollTimer = setTimeout(tick, 3000)
      }
      void tick()
    })
  }

  async function startPipeline() {
    if (pipelineStatus.value === 'running') return
    const taskId = createdTaskId.value
    if (!taskId) return
    const token = session
    const isCurrent = () => token === session && createdTaskId.value === taskId
    if (!progress || progress.taskId !== taskId || pipelineStatus.value !== 'paused') {
      progress = { taskId, stage: 0, dispatched: false, skipRestart: false }
    }
    const execution = progress
    const steps = ['pre', 'execute', 'restart', 'validate']
    pipelineStatus.value = 'running'
    pipelineFinished.value = false
    taskErrorMessage.value = ''

    try {
      await nextTick()
      checkActive(token, taskId)
      pipelineSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      for (; execution.stage < steps.length; execution.stage += 1) {
        const key = steps[execution.stage]
        const index = getStepIndex(key)
        stepStates[index] = 'running'
        let successStatuses
        let failedStatuses

        if (key === 'pre') {
          if (!execution.dispatched) {
            await (isSkipped.pre
              ? patchInstallApi.skipPreCheck(taskId)
              : patchInstallApi.executePreCheck(taskId))
          }
          successStatuses = ['PRE_CHECK_DONE']
          failedStatuses = ['PRE_CHECK_FAILED', 'FAILED']
        } else if (key === 'execute') {
          if (!execution.dispatched) {
            await (isRollbackTask.value
              ? patchInstallApi.executeRollbackTask(taskId)
              : patchInstallApi.executeInstallTask(taskId))
          }
          successStatuses = [isRollbackTask.value ? 'ROLLBACK_DONE' : 'INSTALL_DONE']
          failedStatuses = [isRollbackTask.value ? 'ROLLBACK_FAILED' : 'INSTALL_FAILED', 'FAILED']
        } else if (key === 'restart') {
          if (!execution.dispatched) {
            await loadRestartOptions(isCurrent)
            checkActive(token, taskId)
            await loadRollbackInfo(isCurrent)
            checkActive(token, taskId)
            execution.skipRestart = installConfig.restartPolicy === 'none' || isSkipped.restart
            await patchInstallApi.confirmRestart(
              taskId,
              !execution.skipRestart,
              execution.skipRestart ? undefined : restartConfirmSubmitText
            )
            checkActive(token, taskId)
            if (!execution.skipRestart) await patchInstallApi.executeRestart(taskId)
          }
          successStatuses = ['RESTART_DONE']
          failedStatuses = ['RESTART_FAILED', 'FAILED']
        } else {
          if (!execution.dispatched) {
            if (installConfig.postScript && !isSkipped.validate) {
              await patchInstallApi.executeValidate(taskId)
            } else {
              await patchInstallApi.skipValidate(taskId)
              checkActive(token, taskId)
              isSkipped.validate = true
            }
          }
          successStatuses = ['COMPLETED']
          failedStatuses = ['VALIDATE_FAILED', 'FAILED']
        }
        checkActive(token, taskId)
        execution.dispatched = true
        if (key === 'restart' && execution.skipRestart) {
          // Preserve the existing confirm(false) contract; do not add a status gate here.
          try {
            await refreshTaskDetail(token, taskId)
          } catch {
            /* best-effort refresh */
          }
          checkActive(token, taskId)
          stepStates[index] = 'success'
          isSkipped.restart = true
        } else {
          await pollStatusPromise(index, successStatuses, failedStatuses, token, taskId)
          checkActive(token, taskId)
        }
        execution.dispatched = false
      }
      pipelineFinished.value = true
      pipelineStatus.value = 'success'
      emitSuccess()
      ElMessage.success('全流程执行完毕')
    } catch (error) {
      if (!isCurrent()) return
      pipelineFinished.value = true
      pipelineStatus.value = error.queryInterrupted ? 'paused' : 'failed'
      if (!error.queryInterrupted) {
        const runningIdx = stepStates.findIndex(state => state === 'running')
        if (runningIdx !== -1) stepStates[runningIdx] = 'failed'
      }
      taskErrorMessage.value = resolveApiErrorMessage(error, `${executeStepTitle.value}异常`)
      ElMessage.error(
        error.queryInterrupted
          ? '暂时无法查询任务状态，请点击“继续查询”'
          : `任务执行中断：${taskErrorMessage.value}`
      )
    }
  }

  onUnmounted(stopPolling)
  return { refreshTaskDetail, startPipeline, stopPolling }
}
