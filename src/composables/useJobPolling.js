/**
 * 作业轮询 Composable
 * 用于轮询作业执行状态，直到任务完成
 */
import { ref, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'

/**
 * 作业状态常量
 */
export const JOB_STATUS = {
  WAITING: 'WAITING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED'
}

/**
 * 判断作业是否仍在执行
 */
export function isJobRunning(status) {
  return status === JOB_STATUS.WAITING || status === JOB_STATUS.RUNNING
}

/**
 * 判断作业是否成功完成
 */
export function isJobSuccess(status) {
  return status === JOB_STATUS.COMPLETED || status === JOB_STATUS.SUCCESS
}

/**
 * 获取作业运行结果 API
 * @param {string} runId - 运行ID
 */
export async function getJobRunResult(runId) {
  const cacheBuster = Date.now()
  return apiService.get(`/jao/api/jao/runlogs/${runId}/result?cacheBuster=${cacheBuster}`)
}

/**
 * 作业轮询 Composable
 * @returns {object} 轮询相关状态和方法
 */
export function useJobPolling() {
  const isPolling = ref(false)
  let pollTimer = null
  let currentRunId = null

  /**
   * 开始轮询作业状态
   * @param {string} runId - 运行ID
   * @param {object} options - 轮询选项
   * @param {number} options.interval - 轮询间隔（毫秒），默认 4000
   * @param {number} options.maxAttempts - 最大轮询次数，默认无限制
   * @param {function} options.onProgress - 进度回调，每次轮询时调用，参数为 (result, attempts)
   * @param {function} options.onSuccess - 成功回调
   * @param {function} options.onError - 失败回调
   * @param {function} options.onTimeout - 超时回调
   * @param {function} options.onComplete - 完成回调（无论成功失败）
   * @param {string} options.successMessage - 成功提示消息
   * @param {string} options.errorMessage - 失败提示消息
   * @param {string} options.timeoutMessage - 超时提示消息
   * @param {boolean} options.showMessage - 是否显示消息，默认 true
   */
  async function startPolling(runId, options = {}) {
    const {
      interval = 4000,
      maxAttempts = 0, // 0 表示无限制
      onProgress,
      onSuccess,
      onError,
      onTimeout,
      onComplete,
      successMessage = '任务执行成功',
      errorMessage = '任务执行失败',
      timeoutMessage = '任务执行超时',
      showMessage = true
    } = options

    currentRunId = runId
    isPolling.value = true
    let attempts = 0

    async function poll() {
      if (!isPolling.value || currentRunId !== runId) return

      attempts++

      try {
        const response = await getJobRunResult(runId)
        const result = response?.data || response
        const status = result?.status

        // 调用进度回调
        onProgress?.(result, attempts)

        if (isJobRunning(status)) {
          // 检查是否超过最大尝试次数
          if (maxAttempts > 0 && attempts >= maxAttempts) {
            isPolling.value = false
            currentRunId = null
            if (showMessage) {
              ElMessage.warning(timeoutMessage)
            }
            onTimeout?.(result)
            onComplete?.(result)
            return
          }
          // 任务仍在执行，继续轮询
          pollTimer = setTimeout(poll, interval)
        } else {
          // 任务结束
          isPolling.value = false
          currentRunId = null

          if (isJobSuccess(status)) {
            if (showMessage) {
              ElMessage.success(successMessage)
            }
            onSuccess?.(result)
          } else if (status === JOB_STATUS.FAILED || status === 'ERROR') {
            if (showMessage) {
              ElMessage.error(result?.error || errorMessage)
            }
            onError?.(result)
          } else {
            // 其他状态视为成功
            if (showMessage) {
              ElMessage.success(successMessage)
            }
            onSuccess?.(result)
          }

          onComplete?.(result)
        }
      } catch (error) {
        console.error('Failed to poll job status:', error)
        isPolling.value = false
        currentRunId = null
        if (showMessage) {
          ElMessage.error('获取任务状态失败')
        }
        onError?.(error)
        onComplete?.(null)
      }
    }

    // 开始轮询
    poll()
  }

  /**
   * 停止轮询
   */
  function stopPolling() {
    isPolling.value = false
    currentRunId = null
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  // 组件卸载时自动停止轮询
  onUnmounted(() => {
    stopPolling()
  })

  return {
    isPolling,
    startPolling,
    stopPolling
  }
}

/**
 * 简单的轮询函数（不使用 composable）
 * 适用于不在 setup 中使用的场景
 * @param {string} runId - 运行ID
 * @param {object} options - 轮询选项
 */
export async function pollJobStatus(runId, options = {}) {
  const {
    interval = 4000,
    onSuccess,
    onError,
    onComplete,
    successMessage = '任务执行成功',
    errorMessage = '任务执行失败',
    showMessage = true
  } = options

  let cancelled = false

  const poll = async () => {
    if (cancelled) return

    try {
      const response = await getJobRunResult(runId)
      const result = response?.data || response
      const status = result?.status

      if (isJobRunning(status)) {
        // 任务仍在执行，继续轮询
        setTimeout(poll, interval)
      } else {
        // 任务结束
        if (isJobSuccess(status)) {
          if (showMessage) {
            ElMessage.success(successMessage)
          }
          onSuccess?.(result)
        } else if (status === JOB_STATUS.FAILED) {
          if (showMessage) {
            ElMessage.error(errorMessage)
          }
          onError?.(result)
        }

        onComplete?.(result)
      }
    } catch (error) {
      console.error('Failed to poll job status:', error)
      if (showMessage) {
        ElMessage.error('获取任务状态失败')
      }
      onError?.(error)
      onComplete?.(null)
    }
  }

  // 开始轮询
  poll()

  // 返回取消函数
  return () => {
    cancelled = true
  }
}

export default useJobPolling
