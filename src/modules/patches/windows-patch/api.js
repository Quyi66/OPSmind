import { apiService } from '@/core/api'

const WIN_PATCH_API_PREFIX = '/vap/api/vap/win-patch'

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

  createScanTask(payload = {}) {
    return apiService.post(`${WIN_PATCH_API_PREFIX}/tasks/scan`, payload)
  },

  createInstallTask(payload = {}) {
    return apiService.post(`${WIN_PATCH_API_PREFIX}/tasks/install`, payload)
  },

  createRollbackTask(payload = {}) {
    return apiService.post(`${WIN_PATCH_API_PREFIX}/tasks/rollback`, payload)
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
