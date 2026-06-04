import { apiService } from '@/core/api'

const WIN_PATCH_API_PREFIX = '/vap/api/vap/win-patch'
const WIN_PATCH_ACTION_API_PREFIX = '/vap/api/vap/win/patch'

function resolveRebootFlag(reboot) {
  return reboot ? 'yes' : 'no'
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

  // 触发扫描：目标机本地采集（不依赖 WSUS / 联网），body 为 hostId 数组，
  // 异步返回 { _status: 'ok', runId }
  createScanTask(hostIds = []) {
    const body = Array.isArray(hostIds) ? hostIds : (hostIds?.hostIds ?? [])
    return apiService.post(`${WIN_PATCH_API_PREFIX}/tasks/scan`, body)
  },

  createInstallTask(payload = {}) {
    return apiService.post(`${WIN_PATCH_API_PREFIX}/tasks/install`, payload)
  },

  createRollbackTask(payload = {}) {
    return apiService.post(`${WIN_PATCH_API_PREFIX}/tasks/rollback`, payload)
  },

  // 安装补丁：入参为 vap2_curr_machine_status_win.id 数组，reboot 走 query
  installPatches(currMachineStatusWinIds = [], reboot = false) {
    return apiService.post(`${WIN_PATCH_ACTION_API_PREFIX}/install`, currMachineStatusWinIds, {
      params: {
        reboot: resolveRebootFlag(reboot)
      }
    })
  },

  // 回滚补丁：入参为 vap2_hist_update_pkgs_win.id 数组，reboot 走 query
  rollbackPatches(histUpdatePkgsWinIds = [], reboot = false) {
    return apiService.post(`${WIN_PATCH_ACTION_API_PREFIX}/rollback`, histUpdatePkgsWinIds, {
      params: {
        reboot: resolveRebootFlag(reboot)
      }
    })
  },

  // 删除回滚历史记录（仅删前端记录，不影响目标机）
  deleteRollbackHistory(histIds = []) {
    return apiService.delete(`${WIN_PATCH_ACTION_API_PREFIX}/rollback/history/windows`, {
      data: histIds
    })
  },

  uploadTaskScript(taskId, scriptType, file) {
    const formData = new FormData()
    formData.append('scriptType', scriptType)
    formData.append('file', file)

    return apiService.post(
      `${WIN_PATCH_API_PREFIX}/tasks/${encodeURIComponent(taskId)}/script/upload`,
      formData
    )
  },

  updateTaskScript(taskId, scriptType, content = '') {
    return apiService.put(
      `${WIN_PATCH_API_PREFIX}/tasks/${encodeURIComponent(taskId)}/script/update`,
      {
        scriptType,
        content
      }
    )
  },

  executeTaskStep(taskId) {
    return apiService.post(
      `${WIN_PATCH_API_PREFIX}/tasks/${encodeURIComponent(taskId)}/execute-step`
    )
  },

  skipTaskStep(taskId) {
    return apiService.post(`${WIN_PATCH_API_PREFIX}/tasks/${encodeURIComponent(taskId)}/skip-step`)
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
    return apiService.get(`${WIN_PATCH_API_PREFIX}/tasks/${encodeURIComponent(taskId)}`)
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
