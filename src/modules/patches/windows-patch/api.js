import { apiService } from '@/core/api'
import { patchInstallApi } from '../api'

const WIN_PATCH_API_PREFIX = '/vap/api/vap/win-patch'
const WIN_PATCH_ACTION_API_PREFIX = '/vap/api/vap/win/patch'

function normalizeIdList(ids) {
  if (Array.isArray(ids)) {
    return Array.from(new Set(ids.map(id => String(id || '').trim()).filter(Boolean)))
  }

  if (Array.isArray(ids?.winPatchStatusIds)) {
    return normalizeIdList(ids.winPatchStatusIds)
  }

  if (Array.isArray(ids?.patchStatusIds)) {
    return normalizeIdList(ids.patchStatusIds)
  }

  if (Array.isArray(ids?.histUpdateIds)) {
    return normalizeIdList(ids.histUpdateIds)
  }

  return []
}

function normalizeTaskType(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
}

function resolveTaskType(task = null, options = {}) {
  return normalizeTaskType(options.taskType || task?.taskType || task?.task_type)
}

function resolveTaskStep(task = null, options = {}) {
  const explicitStep = normalizeTaskType(options.stepKey || task?.currentStep || task?.current_step)
  if (explicitStep && explicitStep !== 'EXECUTE') {
    return explicitStep
  }

  return resolveTaskType(task, options) === 'ROLLBACK' ? 'ROLLBACK' : 'INSTALL'
}

function extractResponseData(result) {
  if (result?.status !== 'fulfilled') {
    return null
  }

  return result.value?.data ?? result.value ?? null
}

export const winPatchApi = {
  getWsusConfigs() {
    return apiService.get(`${WIN_PATCH_API_PREFIX}/wsus-config`)
  },

  saveWsusConfig(payload = {}) {
    return apiService.post(`${WIN_PATCH_API_PREFIX}/wsus-config`, payload)
  },

  deleteWsusConfig(id) {
    return apiService.delete(`${WIN_PATCH_API_PREFIX}/wsus-config/${encodeURIComponent(id)}`)
  },

  // 触发扫描：目标机用 WUA 引擎对接内网 WSUS 扫描（客户端无需外网），body 为 hostId 数组，
  // 结果经 /win/callback/scan 异步落库，立即返回 { _status: 'ok', runId }
  createScanTask(hostIds = []) {
    const body = Array.isArray(hostIds) ? hostIds : (hostIds?.hostIds ?? [])
    return apiService.post(`${WIN_PATCH_API_PREFIX}/tasks/scan`, body)
  },

  // 安装：复用 Linux 流程化向导 POST /api/vap/v2/patch/task/create，仅以 osType=windows 区分
  createInstallTask(payload = {}) {
    return patchInstallApi.createTask({
      osType: 'windows',
      hostIds: normalizeIdList(payload.hostIds),
      patchStatusIds: normalizeIdList(payload.patchStatusIds)
    })
  },

  // 回滚：复用 Linux 流程化向导 POST /api/vap/v2/patch/task/create-rollback
  createRollbackTask(payload = {}) {
    return patchInstallApi.createRollbackTask({
      osType: 'windows',
      hostIds: normalizeIdList(payload.hostIds),
      histUpdateIds: normalizeIdList(payload.histUpdateIds)
    })
  },

  // 删除回滚历史记录（仅删前端记录，不影响目标机）
  deleteRollbackHistory(histIds = []) {
    return apiService.delete(`${WIN_PATCH_ACTION_API_PREFIX}/rollback/history/windows`, {
      data: histIds
    })
  },

  uploadTaskScript(taskId, scriptType, file) {
    return patchInstallApi.uploadScript(taskId, scriptType, file)
  },

  updateTaskScript(taskId, scriptType, content = '') {
    return patchInstallApi.updateScript(taskId, scriptType, content)
  },

  getRestartOptions(taskId) {
    return patchInstallApi.getRestartOptions(taskId)
  },

  executeTaskStep(taskId, task = null, options = {}) {
    const stepKey = resolveTaskStep(task, options)
    const taskType = resolveTaskType(task, options)

    if (stepKey === 'PRE_CHECK') {
      return patchInstallApi.executePreCheck(taskId)
    }

    if (stepKey === 'INSTALL') {
      return patchInstallApi.executeInstallTask(taskId)
    }

    if (stepKey === 'ROLLBACK') {
      return patchInstallApi.executeRollbackTask(taskId)
    }

    if (stepKey === 'RESTART') {
      const confirmText = String(options.confirmText || '确认重启').trim() || '确认重启'
      return patchInstallApi
        .confirmRestart(taskId, true, confirmText)
        .then(() => patchInstallApi.executeRestart(taskId))
    }

    if (stepKey === 'VALIDATE') {
      return patchInstallApi.executeValidate(taskId)
    }

    throw new Error(`不支持执行当前步骤：${stepKey || taskType || 'UNKNOWN'}`)
  },

  skipTaskStep(taskId, task = null, options = {}) {
    const stepKey = resolveTaskStep(task, options)

    if (stepKey === 'PRE_CHECK') {
      return patchInstallApi.skipPreCheck(taskId)
    }

    if (stepKey === 'RESTART') {
      return patchInstallApi.confirmRestart(taskId, false)
    }

    if (stepKey === 'VALIDATE') {
      return patchInstallApi.skipValidate(taskId)
    }

    throw new Error(`当前步骤不支持跳过：${stepKey || 'UNKNOWN'}`)
  },

  getHosts(params = {}) {
    return apiService.get(`${WIN_PATCH_API_PREFIX}/hosts`, {
      params: {
        page: params.page ?? 0,
        size: params.size ?? 20
      }
    })
  },

  getHostPatches(hostId, params = {}) {
    const queryParams = {
      page: params.page ?? 0,
      size: params.size ?? 50
    }

    if (params.severity) {
      queryParams.severity = params.severity
    }
    if (params.patchStatus) {
      queryParams.patchStatus = params.patchStatus
    }
    if (params.keyword) {
      queryParams.keyword = params.keyword
    }

    return apiService.get(`${WIN_PATCH_API_PREFIX}/hosts/${encodeURIComponent(hostId)}/patches`, {
      params: queryParams
    })
  },

  getTasks(params = {}) {
    const queryParams = {
      page: params.page ?? 0,
      size: params.size ?? 20
    }

    if (params.taskType) {
      queryParams.taskType = params.taskType
    }

    return apiService.get(`${WIN_PATCH_API_PREFIX}/tasks`, {
      params: queryParams
    })
  },

  getTaskDetail(taskId) {
    const encodedTaskId = encodeURIComponent(taskId)

    return Promise.allSettled([
      patchInstallApi.getTask(taskId),
      patchInstallApi.getAuditDetail(taskId),
      apiService.get(`${WIN_PATCH_API_PREFIX}/tasks/${encodedTaskId}`)
    ]).then(results => {
      const [taskResult, auditResult, historyResult] = results

      if (results.every(result => result.status === 'rejected')) {
        throw taskResult.reason || auditResult.reason || historyResult.reason
      }

      const taskData = extractResponseData(taskResult)
      const auditData = extractResponseData(auditResult)
      const historyData = extractResponseData(historyResult)

      const historyTask =
        historyData && typeof historyData === 'object'
          ? (historyData.task ?? historyData)
          : null

      const mergedTask = {
        ...(historyTask && typeof historyTask === 'object' ? historyTask : {}),
        ...(taskData && typeof taskData === 'object' ? taskData : {}),
        ...(auditData?.task && typeof auditData.task === 'object' ? auditData.task : {})
      }

      return {
        data: {
          task: Object.keys(mergedTask).length ? mergedTask : null,
          steps: Array.isArray(auditData?.steps)
            ? auditData.steps
            : Array.isArray(historyData?.steps)
              ? historyData.steps
              : [],
          logs: Array.isArray(auditData?.logs)
            ? auditData.logs
            : Array.isArray(historyData?.logs)
              ? historyData.logs
              : [],
          hosts: Array.isArray(historyData?.hosts) ? historyData.hosts : []
        }
      }
    })
  },

  getInstallLogs(params = {}) {
    const queryParams = {
      page: params.page ?? 0,
      size: params.size ?? 20
    }

    if (params.hostId) {
      queryParams.hostId = params.hostId
    }

    return apiService.get(`${WIN_PATCH_API_PREFIX}/install-logs`, {
      params: queryParams
    })
  },

  exportHosts(hostIds = []) {
    return apiService.post(
      `${WIN_PATCH_API_PREFIX}/export/hosts`,
      {
        hostIds
      },
      {
        responseType: 'blob'
      }
    )
  },

  exportReport(payload = {}) {
    return apiService.post(`${WIN_PATCH_API_PREFIX}/export`, payload, {
      responseType: 'blob'
    })
  }
}

export default winPatchApi
