import { apiService } from '@/core/api'

const WIN_PATCH_API_PREFIX = '/vap/api/vap/win-patch'
const WIN_PATCH_ACTION_API_PREFIX = '/vap/api/vap/win/patch'

function resolveRebootFlag(reboot) {
  if (typeof reboot === 'string') {
    return reboot === 'yes' ? 'yes' : 'no'
  }
  return reboot ? 'yes' : 'no'
}

function normalizeIdList(ids) {
  if (Array.isArray(ids)) {
    return ids
  }
  if (Array.isArray(ids?.winPatchStatusIds)) {
    return ids.winPatchStatusIds
  }
  return []
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

  createInstallTask(payload = {}) {
    return apiService.post(`${WIN_PATCH_API_PREFIX}/tasks/install`, payload)
  },

  createRollbackTask(payload = {}) {
    return apiService.post(`${WIN_PATCH_API_PREFIX}/tasks/rollback`, payload)
  },

  // 安装补丁：POST /api/vap/win/patch/update
  // 入参为 vap2_curr_machine_status_win.id 数组，reboot 随 body 下发（yes|no）
  installPatches(winPatchStatusIds = [], reboot = false) {
    return apiService.post(`${WIN_PATCH_ACTION_API_PREFIX}/update`, {
      winPatchStatusIds: normalizeIdList(winPatchStatusIds),
      reboot: resolveRebootFlag(reboot)
    })
  },

  // 回滚补丁：POST /api/vap/win/patch/rollback
  // 入参为 vap2_curr_machine_status_win.id 数组，reboot 随 body 下发（yes|no）
  rollbackPatches(winPatchStatusIds = [], reboot = false) {
    return apiService.post(`${WIN_PATCH_ACTION_API_PREFIX}/rollback`, {
      winPatchStatusIds: normalizeIdList(winPatchStatusIds),
      reboot: resolveRebootFlag(reboot)
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
