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
  let pollTimer = null

  async function refreshTaskDetail() {
    if (!createdTaskId.value) return null
    try {
      const res = await patchInstallApi.getTask(createdTaskId.value)
      const data = res?.data
      if (data) {
        taskStatus.value = data.status || ''
        taskErrorMessage.value = data.errorMessage || ''
        taskDetailData.value = data
      }
      return data || null
    } catch {
      return null
    }
  }

  async function scrollToPipelineSection() {
    await nextTick()
    const target = pipelineSectionRef.value
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function pollStatusPromise(step, successStatuses, failedStatuses) {
    return new Promise(resolve => {
      let settled = false

      const finalize = success => {
        if (settled) return
        settled = true
        if (step >= 0) {
          stepStates[step] = success ? 'success' : 'failed'
        }
        stopPolling()
        resolve(success)
      }

      const evaluateTask = data => {
        if (!data?.status) return false

        taskStatus.value = data.status
        taskErrorMessage.value = data.errorMessage || taskErrorMessage.value
        taskDetailData.value = data

        if (successStatuses.includes(data.status)) {
          finalize(true)
          return true
        }

        if (failedStatuses.includes(data.status)) {
          finalize(false)
          return true
        }

        return false
      }

      if (evaluateTask(taskDetailData.value)) {
        return
      }

      pollTimer = setInterval(async () => {
        try {
          const res = await patchInstallApi.getTask(createdTaskId.value)
          const data = res?.data
          evaluateTask(data)
        } catch (error) {
          taskErrorMessage.value = resolveApiErrorMessage(error, '任务状态查询失败')
          finalize(false)
        }
      }, 3000)
    })
  }

  async function startPipeline() {
    const preStepIndex = getStepIndex('pre')
    const validateStepIndex = getStepIndex('validate')
    const restartStepIndex = getStepIndex('restart')
    const executeStepIndex = getStepIndex('execute')

    pipelineStatus.value = 'running'
    taskErrorMessage.value = ''
    stopPolling()
    scrollToPipelineSection()

    try {
      if (isSkipped.pre) {
        stepStates[preStepIndex] = 'running'
        await patchInstallApi.skipPreCheck(createdTaskId.value)
        await refreshTaskDetail()
        const preSkipped = await pollStatusPromise(
          preStepIndex,
          ['PRE_CHECK_DONE'],
          ['PRE_CHECK_FAILED', 'FAILED']
        )
        if (!preSkipped) throw new Error('跳过预检查失败')
      } else {
        stepStates[preStepIndex] = 'running'
        await patchInstallApi.executePreCheck(createdTaskId.value)
        await refreshTaskDetail()
        const preSuccess = await pollStatusPromise(
          preStepIndex,
          ['PRE_CHECK_DONE'],
          ['PRE_CHECK_FAILED', 'FAILED']
        )
        if (!preSuccess) throw new Error('前置环境检查失败')
      }

      stepStates[executeStepIndex] = 'running'
      if (isRollbackTask.value) {
        await patchInstallApi.executeRollbackTask(createdTaskId.value)
      } else {
        await patchInstallApi.executeInstallTask(createdTaskId.value)
      }
      await refreshTaskDetail()
      const installSuccess = await pollStatusPromise(
        executeStepIndex,
        [isRollbackTask.value ? 'ROLLBACK_DONE' : 'INSTALL_DONE'],
        [isRollbackTask.value ? 'ROLLBACK_FAILED' : 'INSTALL_FAILED', 'FAILED']
      )
      if (!installSuccess) throw new Error(`${executeStepTitle.value}失败`)

      await loadRestartOptions()
      await loadRollbackInfo()

      if (installConfig.restartPolicy !== 'none' && !isSkipped.restart) {
        stepStates[restartStepIndex] = 'running'
        await patchInstallApi.confirmRestart(createdTaskId.value, true, restartConfirmSubmitText)
        await patchInstallApi.executeRestart(createdTaskId.value)
        await refreshTaskDetail()
        const restartSuccess = await pollStatusPromise(
          restartStepIndex,
          ['RESTART_DONE'],
          ['RESTART_FAILED', 'FAILED']
        )
        if (!restartSuccess) throw new Error('重启执行失败')
      } else {
        await patchInstallApi.confirmRestart(createdTaskId.value, false)
        await refreshTaskDetail()
        stepStates[restartStepIndex] = 'success'
        isSkipped.restart = true
      }

      if (installConfig.postScript && !isSkipped.validate) {
        stepStates[validateStepIndex] = 'running'
        await patchInstallApi.executeValidate(createdTaskId.value)
        await refreshTaskDetail()
        const validateSuccess = await pollStatusPromise(
          validateStepIndex,
          ['COMPLETED'],
          ['VALIDATE_FAILED', 'FAILED']
        )
        if (!validateSuccess) throw new Error('脚本校验执行失败')
      } else {
        stepStates[validateStepIndex] = 'running'
        await patchInstallApi.skipValidate(createdTaskId.value)
        await refreshTaskDetail()
        const validateSkipped = await pollStatusPromise(
          validateStepIndex,
          ['COMPLETED'],
          ['VALIDATE_FAILED', 'FAILED']
        )
        if (!validateSkipped) throw new Error('脚本校验跳过失败')
        isSkipped.validate = true
      }

      pipelineFinished.value = true
      pipelineStatus.value = 'success'
      emitSuccess()
      ElMessage.success('全流程执行完毕')
    } catch (error) {
      pipelineFinished.value = true
      pipelineStatus.value = 'failed'
      taskErrorMessage.value = resolveApiErrorMessage(error, '执行异常')
      ElMessage.error(`任务执行中断：${taskErrorMessage.value}`)
    }
  }

  onUnmounted(() => stopPolling())

  return {
    refreshTaskDetail,
    startPipeline,
    stopPolling
  }
}
