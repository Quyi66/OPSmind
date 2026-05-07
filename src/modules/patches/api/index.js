/**
 * 补丁管理模块 API
 * 与后端 VAP (Vulnerability and Patch) 服务交互
 */
import { apiService } from '@/core/api'

const VAP_API_PREFIX = '/vap/api/vap'
const PATCH_TASK_API_PREFIX = `${VAP_API_PREFIX}/v2/patch/task`

function buildPatchTaskListQuery(params = {}) {
  const searchParams = new URLSearchParams()

  if (params.taskType) {
    searchParams.set('taskType', params.taskType)
  }

  if (params.status) {
    searchParams.set('status', params.status)
  }

  searchParams.set('page', String(params.page ?? 0))
  searchParams.set('size', String(params.size ?? 20))

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

function buildPatchTaskAuditHistoryQuery(params = {}) {
  const searchParams = new URLSearchParams()

  searchParams.set('page', String(params.page ?? 0))
  searchParams.set('size', String(params.size ?? 50))

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

function buildPatchAuditLogsQuery(params = {}) {
  const searchParams = new URLSearchParams()

  if (params.taskType) {
    searchParams.set('taskType', params.taskType)
  }

  if (params.operator) {
    searchParams.set('operator', params.operator)
  }

  if (params.startTime) {
    searchParams.set('startTime', params.startTime)
  }

  if (params.endTime) {
    searchParams.set('endTime', params.endTime)
  }

  searchParams.set('page', String(params.page ?? 0))
  searchParams.set('size', String(params.size ?? 20))

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

function buildHostPatchesQuery(params = {}) {
  const searchParams = new URLSearchParams()

  if (params.host_id) {
    searchParams.set('host_id', params.host_id)
  }

  if (params.severity) {
    searchParams.set('severity', params.severity)
  }

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

function buildGenericQuery(params = {}) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return

    if (Array.isArray(value)) {
      value.forEach(item => {
        if (item === undefined || item === null) return

        const normalizedItem = typeof item === 'string' ? item.trim() : item
        if (normalizedItem === '') return

        searchParams.append(key, String(normalizedItem))
      })
      return
    }

    const normalizedValue = typeof value === 'string' ? value.trim() : value
    if (normalizedValue === '') return

    searchParams.set(key, String(normalizedValue))
  })

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

function normalizePatchTask(task) {
  if (!task || typeof task !== 'object' || Array.isArray(task)) {
    return task
  }

  return {
    ...task,
    executeRunId: task.executeRunId || task.installRunId || task.rollbackRunId || ''
  }
}

function normalizePatchTaskSnapshot(snapshot) {
  if (!snapshot) return snapshot

  if (typeof snapshot === 'string') {
    try {
      return JSON.stringify(normalizePatchTask(JSON.parse(snapshot)))
    } catch {
      return snapshot
    }
  }

  return normalizePatchTask(snapshot)
}

function normalizePatchAuditRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return record
  }

  return {
    ...record,
    taskSnapshot: normalizePatchTaskSnapshot(record.taskSnapshot)
  }
}

function normalizeResponseData(response, dataNormalizer) {
  if (!response || typeof response !== 'object') {
    return dataNormalizer(response)
  }

  if (Object.prototype.hasOwnProperty.call(response, 'data')) {
    return {
      ...response,
      data: dataNormalizer(response.data)
    }
  }

  return dataNormalizer(response)
}

function normalizePagedData(data, itemNormalizer) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || !Array.isArray(data.content)) {
    return data
  }

  return {
    ...data,
    content: data.content.map(itemNormalizer)
  }
}

function normalizeListData(data, itemNormalizer) {
  if (!Array.isArray(data)) {
    return data
  }

  return data.map(itemNormalizer)
}

function normalizePatchTaskResponse(response) {
  return normalizeResponseData(response, normalizePatchTask)
}

function normalizePatchTaskPageResponse(response) {
  return normalizeResponseData(response, data => normalizePagedData(data, normalizePatchTask))
}

function normalizePatchAuditPageResponse(response) {
  return normalizeResponseData(response, data =>
    normalizePagedData(data, normalizePatchAuditRecord)
  )
}

function normalizePatchAuditListResponse(response) {
  return normalizeResponseData(response, data => normalizeListData(data, normalizePatchAuditRecord))
}

/**
 * 补丁扫描相关 API
 */
export const patchScanApi = {
  /**
   * 执行补丁扫描
   * @param {Object} params - 扫描参数
   * @param {Array<string>} params.hosts - 待扫描主机列表
   * @returns {Promise}
   */
  scan(params) {
    return apiService.post(`${VAP_API_PREFIX}/v2/scan`, params)
  },

  /**
   * 获取扫描结果列表（主机概览）
   * POST /dts/api/dts/q/data/VAP2_LIST_MACHINE_WITH_PATCH/
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.size - 每页大小
   * @param {string} params.filter - 筛选关键词
   * @returns {Promise}
   */
  getScanResults(params = {}) {
    const cacheBuster = Date.now()
    // 构建筛选条件：host_key|os_distro|os_version|num_critical|num_important|num_moderate|num_low:*keyword*
    let filter = ''
    if (params.filter && params.filter.trim()) {
      const keyword = params.filter.trim()
      filter = `host_key|os_distro|os_version|num_critical|num_important|num_moderate|num_low:*${keyword}*`
    }
    const requestBody = {
      params: {},
      size: params.size || 20,
      page: params.page || 1,
      filter
    }
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_LIST_MACHINE_WITH_PATCH/?cacheBuster=${cacheBuster}`,
      requestBody
    )
  },

  /**
   * 获取主机补丁扫描详情
   * @param {string} hostId - 主机ID
   * @returns {Promise}
   */
  getHostScanDetail(hostId) {
    return apiService.get(`${VAP_API_PREFIX}/v2/scan/host/${hostId}`)
  },

  /**
   * 获取扫描统计信息
   * @returns {Promise}
   */
  getScanStats() {
    return apiService.get(`${VAP_API_PREFIX}/v2/scan/stats`)
  },

  /**
   * 获取单个主机信息
   * POST /dts/api/dts/q/data/VAP2_GET_MACHINE_INFO/
   * @param {Object} params - 查询参数
   * @param {string} params.host_id - 主机ID
   * @param {string} params.host_key - 主机 IP
   * @returns {Promise}
   */
  getMachineInfo(params) {
    const cacheBuster = Date.now()
    const requestBody = {
      params: {
        host_id: params.host_id
      }
    }
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_GET_MACHINE_INFO/?cacheBuster=${cacheBuster}`,
      requestBody
    )
  },

  /**
   * 获取单个主机的可用补丁列表
   * GET /vap/api/vap/v2/patch/host-patches
   * @param {Object} params - 查询参数
   * @param {string} params.host_id - 主机ID
   * @param {string} params.severity - 严重程度筛选（逗号分隔：Critical,Important,Moderate,Low）
   * @returns {Promise}
   */
  getPatchesOfMachine(params = {}) {
    return apiService.get(`${VAP_API_PREFIX}/v2/patch/host-patches${buildHostPatchesQuery(params)}`)
  },

  /**
   * 获取指定主机的软件包列表
   * POST /dts/api/dts/q/data/VAP2_GET_MACHINE_PKGS/
   * @param {Object} params - 查询参数
   * @param {string} params.host_id - 主机ID
   * @returns {Promise}
   */
  getMachinePackages(params) {
    const cacheBuster = Date.now()
    const requestBody = {
      params: {
        host_id: params.host_id
      }
    }
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_GET_MACHINE_PKGS/?cacheBuster=${cacheBuster}`,
      requestBody
    )
  },

  /**
   * 获取指定主机的CVE漏洞列表
   * POST /dts/api/dts/q/data/VAP2_MACHINE_CVE_LIST/
   * @param {Object} params - 查询参数
   * @param {string} params.host_id - 主机ID
   * @param {string} params.severity - 严重程度筛选（逗号分隔：Critical,Important,Moderate,Low）
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页大小
   * @returns {Promise}
   */
  getMachineCVEList(params) {
    const cacheBuster = Date.now()
    const requestBody = {
      params: {
        host_id: params.host_id,
        severity: params.severity || ''
      }
    }
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_MACHINE_CVE_LIST/?cacheBuster=${cacheBuster}`,
      requestBody
    )
  },

  /**
   * 获取补丁详情
   * POST /dts/api/dts/q/data/VAP2_GET_PATCH_DETAIL/
   * @param {Object} params - 查询参数
   * @param {string} params.patch_id - 补丁ID
   * @returns {Promise}
   */
  getPatchDetail(params) {
    const cacheBuster = Date.now()
    const requestBody = {
      params: {
        patch_id: params.patch_id
      }
    }
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_GET_PATCH_DETAIL/?cacheBuster=${cacheBuster}`,
      requestBody
    )
  }
}

/**
 * 补丁安装相关 API
 */
export const patchInstallApi = {
  /**
   * 创建补丁安装任务
   * POST /vap/api/vap/v2/patch/task/create
   */
  createTask(params) {
    return apiService
      .post(`${PATCH_TASK_API_PREFIX}/create`, params)
      .then(normalizePatchTaskResponse)
  },

  /**
   * 创建补丁回滚任务
   * POST /vap/api/vap/v2/patch/task/create-rollback
   */
  createRollbackTask(params) {
    return apiService
      .post(`${PATCH_TASK_API_PREFIX}/create-rollback`, params)
      .then(normalizePatchTaskResponse)
  },

  /**
   * 创建软件包更新任务
   * POST /vap/api/vap/v2/patch/task/create-pkg-update
   */
  createPkgUpdateTask(params) {
    return apiService
      .post(`${PATCH_TASK_API_PREFIX}/create-pkg-update`, params)
      .then(normalizePatchTaskResponse)
  },

  /**
   * 创建漏洞修复任务
   * POST /vap/api/vap/v2/patch/task/create-vuln-fix
   */
  createVulnFixTask(params) {
    return apiService
      .post(`${PATCH_TASK_API_PREFIX}/create-vuln-fix`, params)
      .then(normalizePatchTaskResponse)
  },

  /**
   * 分页查询任务列表
   * GET /vap/api/vap/v2/patch/task/list
   */
  listTasks(params = {}) {
    return apiService
      .get(`${PATCH_TASK_API_PREFIX}/list${buildPatchTaskListQuery(params)}`)
      .then(normalizePatchTaskPageResponse)
  },

  /**
   * 获取任务详情
   * GET /vap/api/vap/v2/patch/task/{id}
   */
  getTask(id) {
    return apiService.get(`${PATCH_TASK_API_PREFIX}/${id}`).then(normalizePatchTaskResponse)
  },

  /**
   * 查询任务操作审计日志（分页）
   * GET /vap/api/vap/v2/patch/task/{id}/audit/history?page=0&size=50
   */
  getTaskAuditHistory(id, params = {}) {
    return apiService
      .get(`${PATCH_TASK_API_PREFIX}/${id}/audit/history${buildPatchTaskAuditHistoryQuery(params)}`)
      .then(normalizePatchAuditPageResponse)
  },

  /**
   * 查询任务全量操作审计日志（不分页）
   * GET /vap/api/vap/v2/patch/task/{id}/audit/history/all
   */
  getTaskAuditHistoryAll(id) {
    return apiService
      .get(`${PATCH_TASK_API_PREFIX}/${id}/audit/history/all`)
      .then(normalizePatchAuditListResponse)
  },

  /**
   * 获取任务审计详情（含步骤汇总）
   * GET /vap/api/vap/v2/patch/task/{id}/audit/detail
   * 返回 { task, steps: [{ step, label, status, runId, logs }], logs }
   */
  getAuditDetail(id) {
    return apiService.get(`${PATCH_TASK_API_PREFIX}/${id}/audit/detail`)
  },

  /**
   * 上传任务脚本文件
   * POST /vap/api/vap/v2/patch/task/{id}/script/upload
   */
  uploadScript(id, scriptType, file) {
    const formData = new FormData()
    formData.append('scriptType', scriptType)
    formData.append('file', file)
    return apiService
      .post(`${PATCH_TASK_API_PREFIX}/${id}/script/upload`, formData)
      .then(normalizePatchTaskResponse)
  },

  /**
   * 编辑任务脚本内容
   * PUT /vap/api/vap/v2/patch/task/{id}/script/update
   */
  updateScript(id, scriptType, content) {
    return apiService
      .put(`${PATCH_TASK_API_PREFIX}/${id}/script/update`, {
        scriptType,
        content
      })
      .then(normalizePatchTaskResponse)
  },

  /**
   * 下载任务脚本内容
   * GET /vap/api/vap/v2/patch/task/{id}/script/download?type=pre-check
   */
  downloadScript(id, type) {
    return apiService.get(`${PATCH_TASK_API_PREFIX}/${id}/script/download?type=${type}`)
  },

  /**
   * 获取重启策略
   * GET /vap/api/vap/v2/patch/task/{id}/restart/options
   */
  getRestartOptions(id) {
    return apiService.get(`${PATCH_TASK_API_PREFIX}/${id}/restart/options`)
  },

  /**
   * 查询补丁在指定主机上的重启建议
   * GET /vap/api/vap/v2/patch/reboot-on-host?patchId=...&hostIp=...
   * patchId 支持逗号分隔多个补丁编号
   */
  getPatchRebootOnHost(params) {
    const searchParams = new URLSearchParams({
      patchId: params.patchId,
      hostIp: params.hostIp
    })

    if (params.cacheBuster) {
      searchParams.set('cacheBuster', String(params.cacheBuster))
    }

    return apiService.get(`${VAP_API_PREFIX}/v2/patch/reboot-on-host?${searchParams.toString()}`)
  },

  /**
   * 步骤1：执行预检查
   * POST /vap/api/vap/v2/patch/task/{id}/pre-check/execute
   */
  executePreCheck(id) {
    return apiService
      .post(`${PATCH_TASK_API_PREFIX}/${id}/pre-check/execute`)
      .then(normalizePatchTaskResponse)
  },

  /**
   * 跳过预检查
   * POST /vap/api/vap/v2/patch/task/{id}/pre-check/skip
   */
  skipPreCheck(id) {
    return apiService
      .post(`${PATCH_TASK_API_PREFIX}/${id}/pre-check/skip`)
      .then(normalizePatchTaskResponse)
  },

  /**
   * 步骤2：执行补丁安装
   * POST /vap/api/vap/v2/patch/task/{id}/install/execute
   */
  executeInstallTask(id) {
    return apiService
      .post(`${PATCH_TASK_API_PREFIX}/${id}/install/execute`)
      .then(normalizePatchTaskResponse)
  },

  /**
   * 步骤2：执行补丁回滚
   * POST /vap/api/vap/v2/patch/task/{id}/rollback/execute
   */
  executeRollbackTask(id) {
    return apiService
      .post(`${PATCH_TASK_API_PREFIX}/${id}/rollback/execute`)
      .then(normalizePatchTaskResponse)
  },

  /**
   * 获取回滚额外信息
   * GET /vap/api/vap/v2/patch/task/{id}/rollback/info
   */
  getRollbackInfo(id) {
    return apiService.get(`${PATCH_TASK_API_PREFIX}/${id}/rollback/info`)
  },

  /**
   * 步骤3：确认重启方式
   * POST /api/vap/v2/patch/task/{id}/restart/confirm
   * @param {string} id - 任务ID
   * @param {boolean} confirm - 是否确认执行重启
   * @param {string} confirmText - 确认文案
   */
  confirmRestart(id, confirm, confirmText) {
    const payload = { confirm }
    if (confirmText) {
      payload.confirmText = confirmText
    }
    return apiService
      .post(`${PATCH_TASK_API_PREFIX}/${id}/restart/confirm`, payload)
      .then(normalizePatchTaskResponse)
  },

  /**
   * 步骤4：执行重启
   * POST /vap/api/vap/v2/patch/task/{id}/restart/execute
   */
  executeRestart(id) {
    return apiService
      .post(`${PATCH_TASK_API_PREFIX}/${id}/restart/execute`)
      .then(normalizePatchTaskResponse)
  },

  /**
   * 步骤5：执行安装后校验
   * POST /vap/api/vap/v2/patch/task/{id}/validate/execute
   */
  executeValidate(id) {
    return apiService
      .post(`${PATCH_TASK_API_PREFIX}/${id}/validate/execute`)
      .then(normalizePatchTaskResponse)
  },

  /**
   * 跳过校验
   * POST /vap/api/vap/v2/patch/task/{id}/validate/skip
   */
  skipValidate(id) {
    return apiService
      .post(`${PATCH_TASK_API_PREFIX}/${id}/validate/skip`)
      .then(normalizePatchTaskResponse)
  },

  /**
   * 执行补丁安装
   * @param {Object} params - 安装参数
   * @param {Array<string>} params.hosts - 目标主机列表
   * @param {Array<string>} params.packages - 待安装补丁包列表
   * @param {Array<string>} params.versions - 补丁版本列表
   * @returns {Promise}
   */
  install(params) {
    // 使用作业方式执行安装，后端期望参数形如 { params: { hosts, patchIds, hostIds, packages } }
    return apiService.post('/jao/api/jao/jobs/QJb6B8/run', {
      params: {
        hosts: params.hosts || null,
        patchIds: params.patchIds || [],
        hostIds: params.hostIds || [],
        packages: null
      }
    })
  },

  /**
   * 执行软件包更新
   * @param {Object} params - 更新参数
   * @param {Array<string>} params.hosts - 目标主机列表
   * @param {Array<string>} params.patchIds - 补丁编号列表
   * @param {Array<string>} params.hostIds - 主机ID列表
   * @param {Array<string>} params.packages - 待更新软件包列表
   * @returns {Promise}
   */
  updatePackages(params) {
    const cacheBuster = Date.now()
    return apiService.post(`/jao/api/jao/jobs/QJb6B8/run?cacheBuster=${cacheBuster}`, {
      params: {
        hosts: params.hosts || [],
        patchIds: params.patchIds || [],
        hostIds: params.hostIds || [],
        packages: params.packages || []
      }
    })
  },

  /**
   * 获取可安装的补丁列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.size - 每页大小
   * @param {string} params.severity - 严重程度筛选 (逗号分隔)
   * @returns {Promise}
   */
  getAvailablePatches(params = {}) {
    const requestBody = {
      params
    }
    return apiService.post('/dts/api/dts/q/data/VAP2_LIST_EFFECTED_PATCH_REST/', requestBody)
  },

  /**
   * 获取补丁详情
   * @param {Object} params - 查询参数
   * @param {string} params.patch_id - 补丁ID
   * @returns {Promise}
   */
  getPatchDetail(params) {
    const requestBody = {
      params: {
        patch_id: params.patch_id
      }
    }
    return apiService.post('/dts/api/dts/q/data/VAP2_GET_PATCH_DETAIL/', requestBody)
  },

  /**
   * 获取补丁影响的软件包列表
   * @param {Object} params - 查询参数
   * @param {Array<string>} params.patch_ids - 补丁ID列表
   * @returns {Promise}
   */
  getAffectedPackages(params) {
    const requestBody = {
      patch_ids: params.patch_ids
    }
    return apiService.post(
      '/vap/api/vap/v2/patch/affected-pkgs',
      requestBody
    )
  },

  /**
   * 获取补丁影响的主机列表
   * @param {Object} params - 查询参数
   * @param {Array<string>} params.patch_ids - 补丁ID列表
   * @param {string} params.hostId - 主机筛选条件
   * @returns {Promise}
   */
  getMachinesByPatch(params) {
    const requestBody = {
      params: {
        patch_ids: params.patch_ids,
        hostId: params.hostId || '@@(linux)'
      }
    }
    return apiService.post('/dts/api/dts/q/data/VAP2_LIST_MACHINE_BY_PATCH/', requestBody)
  },

  /**
   * 获取安装任务列表
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getInstallTasks(params = {}) {
    return patchInstallApi.listTasks(params)
  },

  /**
   * 获取安装任务详情
   * @param {string} taskId - 任务ID
   * @returns {Promise}
   */
  getInstallTaskDetail(taskId) {
    return patchInstallApi.getTask(taskId)
  }
}

/**
 * 补丁回退相关 API
 */
export const patchRollbackApi = {
  /**
   * 获取更新记录历史
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.size - 每页大小
   * @param {string} params.host_key - IP筛选
   * @param {string} params.vul_id - CVE筛选
   * @returns {Promise}
   */
  getHistUpdatePkgs(params = {}) {
    const requestBody = {
      params: {
        host_key: params.host_key || '',
        vul_id: params.vul_id || ''
      },
      page: params.page || 1,
      size: params.size || 20
    }
    return apiService.post('/dts/api/dts/q/data/VAP_HIST_UPDATE_PKGS/', requestBody)
  },

  /**
   * 执行补丁回退（通过作业方式）
   * Job Code: Uu3eb1
   * @param {Object} params - 回退参数
   * @param {Array<string>} params.histUpdateIds - 更新记录ID列表
   * @returns {Promise}
   */
  async rollback(params) {
    const hostIds = Array.from(new Set((params.hostIds || []).filter(Boolean)))
    const patchIds = Array.from(new Set((params.patchIds || []).filter(Boolean)))

    if (hostIds.length > 0 && patchIds.length > 0) {
      const createResponse = await patchInstallApi.createRollbackTask({
        hostIds,
        patchIds,
        patchStatusIds: params.patchStatusIds || [],
        histUpdateIds: params.histUpdateIds || []
      })

      const createdTask = createResponse?.data ?? createResponse
      const taskId = createdTask?.id
      if (!taskId) {
        throw new Error('回滚任务创建失败')
      }

      return patchInstallApi.executeRollbackTask(taskId)
    }

    return apiService.post('/jao/api/jao/jobs/Uu3eb1/run', {
      params: {
        histUpdateIds: params.histUpdateIds,
        hostIds: null,
        hosts: null,
        patchIds: null
      }
    })
  },

  /**
   * 删除更新记录（通过作业方式）
   * Job Code: 3Fl7CJ
   * @param {Array<string>} ids - 记录ID列表
   * @returns {Promise}
   */
  deleteHistUpdatePkgs(ids) {
    return apiService.post('/jao/api/jao/jobs/3Fl7CJ/run', {
      params: {
        histUpdatePkgsWinIds: ids
      }
    })
  },

  /**
   * 获取回退任务列表
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getRollbackTasks(params = {}) {
    return patchInstallApi.listTasks(params)
  },

  /**
   * 获取回退任务详情
   * @param {string} taskId - 任务ID
   * @returns {Promise}
   */
  getRollbackTaskDetail(taskId) {
    return patchInstallApi.getTask(taskId)
  }
}

/**
 * 补丁仓库相关 API
 */
export const patchLibraryApi = {
  /**
   * 获取厂商补丁统计
   * POST /dts/api/dts/q/data/VAP2_LIST_VENDOR_PATCH/
   * @returns {Promise}
   */
  getVendorStats() {
    return apiService.post('/dts/api/dts/q/data/VAP2_LIST_VENDOR_PATCH/', {
      params: {}
    })
  },

  /**
   * 获取补丁仓库列表
   * POST /dts/api/dts/q/data/VAP2_LIST_PATCH_DATE/
   * 源系统请求格式: {"params":{"severity":"Critical","vendor":"redhat","is_ignore":"0,1"}}
   * @param {Object} params - 查询参数
   * @param {string} params.severity - 严重程度筛选 (逗号分隔: Critical,Important,Moderate,Low)
   * @param {string} params.vendor - 厂商筛选
   * @param {string} params.is_ignore - 白名单状态 (0,1 全部 / 1 白名单 / 0 非白名单)
   * @param {string} params.filter - 按补丁编号、概要、厂商筛选
   * @param {number} params.page - 页码
   * @param {number} params.size - 每页大小
   * @returns {Promise}
   */
  getPatchList(params = {}) {
    // 源系统传 params 对象 + 分页参数
    const keyword = params.filter || ''
    const requestBody = {
      params: {
        severity: params.severity,
        vendor: params.vendor,
        is_ignore: params.is_ignore
      },
      page: params.page,
      size: params.size,
      filter: keyword ? `patch_id|title|vendor|related_vuls:*${keyword}*` : undefined
    }
    return apiService.post('/dts/api/dts/q/data/VAP2_LIST_PATCH_DATE/', requestBody)
  },

  /**
   * 获取补丁仓库列表 (旧接口，保持兼容)
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.size - 每页大小
   * @param {string} params.filter - 筛选条件
   * @param {string} params.severity - 严重程度筛选
   * @returns {Promise}
   */
  getPatches(params = {}) {
    return apiService.post(`${VAP_API_PREFIX}/v2/library/patches`, params)
  },

  /**
   * 获取补丁详情
   * POST /dts/api/dts/q/data/VAP2_GET_PATCH_DETAIL/
   * @param {string} patchId - 补丁ID
   * @returns {Promise}
   */
  getPatchDetail(patchId) {
    return apiService
      .post('/dts/api/dts/q/data/VAP2_GET_PATCH_DETAIL/', {
        params: {
          patch_id: patchId
        },
        page: 1,
        size: 1
      })
      .then(res => {
        // 返回第一条记录
        if (res?.data?.records?.[0]) {
          return { data: res.data.records[0] }
        }
        return res
      })
  },

  /**
   * 导入补丁库
   * @param {Object} params - 导入参数
   * @returns {Promise}
   */
  importPatches(params) {
    return apiService.post(`${VAP_API_PREFIX}/v2/library/import`, params)
  },

  /**
   * 获取补丁统计
   * @returns {Promise}
   */
  getLibraryStats() {
    return apiService.get(`${VAP_API_PREFIX}/v2/library/stats`)
  },

  /**
   * 上传并导入补丁
   * @param {FormData} formData - 包含 files 的表单数据
   * @returns {Promise}
   */
  uploadAndImport(formData) {
    return apiService.post('/vap/api/vap/v2/patch/upload-and-import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
}

/**
 * 漏洞相关 API
 */
export const vulnerabilityApi = {
  /**
   * 获取补丁仓库分布（饼图）
   * POST /dts/api/dts/q/data/VAP2_PATCH_INDEX/
   * 返回: { records: [{ vendor: 'redhat', count: 100 }, ...] }
   * @returns {Promise}
   */
  getPatchIndex() {
    return apiService.post('/dts/api/dts/q/data/VAP2_PATCH_INDEX/', {
      params: {}
    })
  },

  /**
   * 获取当前统计数据（柱状图）
   * POST /dts/api/dts/q/data/VAP2_CURRENT_STATS/
   * 返回: { records: [{ name: 'scan_count_critical_patch', value: 5 }, ...] }
   * @returns {Promise}
   */
  getCurrentStats() {
    return apiService.post('/dts/api/dts/q/data/VAP2_CURRENT_STATS/', {
      params: {}
    })
  },

  /**
   * 获取补丁趋势数据（折线图）
   * POST /dts/api/dts/q/data/VAP2_PATCH_TREND/
   * 返回: { records: [{ scan_date: '2024-01-01', patch_count: 100 }, ...] }
   * @returns {Promise}
   */
  getPatchTrend() {
    return apiService.post('/dts/api/dts/q/data/VAP2_PATCH_TREND/', {
      params: {}
    })
  },

  /**
   * 获取漏洞概览列表
   * POST /dts/api/dts/q/data/VAP2_LIST_PATCH_BY_CVES/
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.size - 每页大小
   * @param {string} params.filter - 筛选关键词
   * @param {string} params.severity - 严重程度筛选 (all/Critical/Important/Moderate/Low)
   * @param {string} params.os_distro - 操作系统筛选 (all 或具体值)
   * @param {string} params.patch_status - 补丁状态筛选 (all/未修复/已修复)
   * @returns {Promise}
   */
  getVulnerabilityList(params = {}) {
    const cacheBuster = Date.now()
    const requestBody = {
      params: {
        reboot_status: params.reboot_status || 'all',
        os_distro: params.os_distro || 'all',
        os_major_version: params.os_major_version || 'all',
        severity: params.severity || 'all',
        patch_status: params.patch_status || 'all',
        is_kernel: params.is_kernel || 'all'
      },
      size: params.size || 20,
      page: params.page || 1,
      filter: params.filter
        ? `host_key|vul_id|patch_id|affected_pkgs:*${params.filter || ''}*`
        : undefined
    }
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_LIST_PATCH_BY_CVES/?cacheBuster=${cacheBuster}`,
      requestBody
    )
  },

  /**
   * 获取操作系统列表
   * POST /dts/api/dts/q/data/VAP2_LIST_MACHINE_OS_INFO/
   * @returns {Promise}
   */
  getOsDistroList() {
    const cacheBuster = Date.now()
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_LIST_MACHINE_OS_INFO/?cacheBuster=${cacheBuster}`,
      {
        params: null
      }
    )
  },

  /**
   * 获取操作系统版本列表
   * POST /dts/api/dts/q/data/VAP2_LIST_MACHINE_OS_VERSION_INFO/
   * @returns {Promise}
   */
  getOsVersionList() {
    const cacheBuster = Date.now()
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_LIST_MACHINE_OS_VERSION_INFO/?cacheBuster=${cacheBuster}`,
      {
        params: null
      }
    )
  },

  /**
   * 获取漏洞列表
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getVulnerabilities(params = {}) {
    return apiService.post(`${VAP_API_PREFIX}/v2/vulnerabilities`, params)
  },

  /**
   * 根据补丁状态ID获取主机列表
   * POST /dts/api/dts/q/data/VAP2_PATCH_STATUS_INFO/
   * @param {Array} ids - 补丁状态ID数组
   * @returns {Promise}
   */
  getPatchStatusHosts(ids) {
    const cacheBuster = Date.now()
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_PATCH_STATUS_INFO/?cacheBuster=${cacheBuster}`,
      {
        params: { ids }
      }
    )
  },

  /**
   * 根据补丁状态ID获取CVE列表
   * POST /dts/api/dts/q/data/VAP2_PATCH_STATUS_INFO_BY_CVE/
   * @param {Array} ids - 补丁状态ID数组
   * @returns {Promise}
   */
  getPatchStatusCves(ids) {
    const cacheBuster = Date.now()
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_PATCH_STATUS_INFO_BY_CVE/?cacheBuster=${cacheBuster}`,
      {
        params: { ids }
      }
    )
  },

  /**
   * 根据补丁状态ID获取补丁列表
   * POST /dts/api/dts/q/data/VAP2_PATCH_STATUS_INFO_BY_PATCH/
   * @param {Array} ids - 补丁状态ID数组
   * @returns {Promise}
   */
  getPatchStatusPatches(ids) {
    const cacheBuster = Date.now()
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_PATCH_STATUS_INFO_BY_PATCH/?cacheBuster=${cacheBuster}`,
      {
        params: { ids }
      }
    )
  },

  /**
   * 根据补丁状态ID获取软件包列表
   * POST /dts/api/dts/q/data/VAP2_PATCH_STATUS_INFO_BY_PKGS/
   * @param {Array} ids - 补丁状态ID数组
   * @returns {Promise}
   */
  getPatchStatusPackages(ids) {
    const cacheBuster = Date.now()
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_PATCH_STATUS_INFO_BY_PKGS/?cacheBuster=${cacheBuster}`,
      {
        params: { ids }
      }
    )
  },

  /**
   * 获取漏洞详情
   * @param {string} vulnId - 漏洞ID
   * @returns {Promise}
   */
  getVulnerabilityDetail(vulnId) {
    return apiService.get(`${VAP_API_PREFIX}/v2/vulnerability/${vulnId}`)
  },

  /**
   * 执行漏洞扫描
   * @param {Object} params - 扫描参数
   * @returns {Promise}
   */
  scanVulnerabilities(params) {
    return apiService.post(`${VAP_API_PREFIX}/v2/vulnerabilities/scan`, params)
  }
}

/**
 * 操作日志相关 API
 */
export const patchLogsApi = {
  /**
   * 查询租户补丁操作审计日志
   * GET /vap/api/vap/v2/patch/task/audit/logs?taskType=&operator=&startTime=&endTime=&page=0&size=20
   */
  getAuditLogs(params = {}) {
    return apiService
      .get(`${PATCH_TASK_API_PREFIX}/audit/logs${buildPatchAuditLogsQuery(params)}`)
      .then(normalizePatchTaskPageResponse)
  },

  /**
   * 获取操作日志列表
   * POST /dts/api/dts/q/data/JAO_LIST_OPERATION_LOG/
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.size - 每页大小
   * @param {string} params.action - 操作类型筛选 (all 或具体类型)
   * @param {string} params.status - 状态筛选 (all/COMPLETED/FAILED/RUNNING)
   * @param {number} params.day - 时间范围（天数）
   * @returns {Promise}
   */
  getLogs(params = {}) {
    const cacheBuster = Date.now()
    const requestBody = {
      params: {
        module: 'vap2',
        action: params.action || 'all',
        status: params.status || 'all',
        day: params.day || 7
      },
      page: params.page || 1,
      size: params.size || 20,
      filter: params.filter || ''
    }
    return apiService.post(
      `/dts/api/dts/q/data/JAO_LIST_OPERATION_LOG/?cacheBuster=${cacheBuster}`,
      requestBody
    )
  },

  /**
   * 获取日志详情
   * @param {string} logId - 日志ID
   * @returns {Promise}
   */
  getLogDetail(logId) {
    return apiService.get(`${VAP_API_PREFIX}/v2/logs/${logId}`)
  }
}

/**
 * 概览统计 API
 */
export const patchOverviewApi = {
  /**
   * 获取补丁管理概览统计
   * @returns {Promise}
   */
  getOverview() {
    return apiService.get(`${VAP_API_PREFIX}/v2/overview`)
  },

  /**
   * 获取首页统计卡片数据
   * @returns {Promise}
   */
  getIndexStats() {
    return apiService.post(`/dts/api/dts/q/data/VAP2_CURRENT_STATS/?cacheBuster=${Date.now()}`, {
      params: {}
    })
  }
}

/**
 * YUM源管理相关 API
 */
export const yumManageApi = {
  buildYumConfigPayload(data = {}) {
    const payload = {
      baseurl: String(data?.baseurl || '').trim()
    }

    const name = String(data?.name || '').trim()
    const description = String(data?.description || '').trim()
    const file = String(data?.file || '').trim()

    if (name) payload.name = name
    if (description) payload.description = description
    if (file) payload.file = file

    return payload
  },

  /**
   * 获取YUM源配置列表
   * GET /jao/api/jao/dc/data?code=yum_configs
   * @returns {Promise}
   */
  getYumConfigs() {
    return apiService.get('/jao/api/jao/dc/data', {
      params: {
        code: 'yum_configs',
        cacheBuster: Date.now()
      }
    })
  },

  /**
   * 获取 YUM 源配置列表（含采集状态）
   * GET /vap/api/vap/v2/yum-repo/configs
   * @returns {Promise}
   */
  getYumRepoConfigs() {
    return apiService.get(`${VAP_API_PREFIX}/v2/yum-repo/configs`, {
      params: {
        cacheBuster: Date.now()
      }
    })
  },

  /**
   * 触发单条 YUM 源采集
   * POST /vap/api/vap/v2/yum-repo/collect
   * @param {Object} data - 采集参数
   * @returns {Promise}
   */
  collectYumRepo(data = {}) {
    return apiService.post(`${VAP_API_PREFIX}/v2/yum-repo/collect`, data)
  },

  /**
   * 批量触发 YUM 源采集
   * POST /vap/api/vap/v2/yum-repo/collect/batch
   * @param {Object} data - 批量采集参数
   * @returns {Promise}
   */
  collectYumRepoBatch(data = {}) {
    return apiService.post(`${VAP_API_PREFIX}/v2/yum-repo/collect/batch`, data)
  },

  /**
   * 创建YUM源配置
   * @param {Object} data - YUM源配置数据
   * @returns {Promise}
   */
  createYumConfig(data) {
    return apiService.post(
      `${VAP_API_PREFIX}/v2/yum-repo/configs`,
      this.buildYumConfigPayload(data),
      {
        params: {
          cacheBuster: Date.now()
        }
      }
    )
  },

  /**
   * 更新YUM源配置
   * PUT /vap/api/vap/v2/yum-repo/configs/{id}
   * @param {string} id - dcDataId
   * @param {Object} data - YUM源配置数据
   * @returns {Promise}
   */
  updateYumConfig(id, data) {
    return apiService.put(
      `${VAP_API_PREFIX}/v2/yum-repo/configs/${encodeURIComponent(id)}`,
      this.buildYumConfigPayload(data)
    )
  },

  /**
   * 删除YUM源配置
   * DELETE /vap/api/vap/v2/yum-repo/configs/{id}
   * @param {string} id - dcDataId
   * @returns {Promise}
   */
  deleteYumConfig(id) {
    return apiService.delete(`${VAP_API_PREFIX}/v2/yum-repo/configs/${encodeURIComponent(id)}`)
  },

  /**
   * 获取主机YUM源清单列表
   * POST /dts/api/dts/q/data/GET_DC_DATA_BY_MODEL/
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getHostYumList(params = {}) {
    return apiService.post('/dts/api/dts/q/data/GET_DC_DATA_BY_MODEL/', {
      params: {
        model: 'yum_host_info',
        filter: params.filter
      },
      page: params.page,
      size: params.size
    })
  },

  /**
   * 获取主机YUM源详情列表
   * POST /dts/api/dts/q/data/VAP2_DC_DATA_BY_KEYWORD/
   * @param {Object} params - 查询参数 { data_owner, repo_status }
   * @returns {Promise}
   */
  getHostRepoDetail(params = {}) {
    return apiService.post('/dts/api/dts/q/data/VAP2_DC_DATA_BY_KEYWORD/', {
      params: {
        model: 'yum_list',
        data_owner: params.data_owner || '',
        repo_status: params.repo_status || 'enabled'
      }
    })
  }
}

/**
 * 操作报告相关 API
 */
export const operationReportApi = {
  /**
   * 获取漏洞报告列表
   * POST /dts/api/dts/q/data/VAP2_LIST_MACHINE_VUL_OTO/
   * 字段: host_key, os_distro, os_version, vul_id, scan_timestamp
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getVulnerabilityReport(params = {}) {
    return apiService.post('/dts/api/dts/q/data/VAP2_LIST_MACHINE_VUL_OTO/', {
      params: {},
      page: params.page || 1,
      size: params.size || 20,
      filter: params.filter || ''
    })
  },

  /**
   * 获取补丁报告列表
   * POST /dts/api/dts/q/data/VAP2_LIST_MACHINE_PATCH_OTO/
   * 字段: host_key, os_distro, os_version, patch_id, title, severity, scan_timestamp
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getPatchReport(params = {}) {
    return apiService.post('/dts/api/dts/q/data/VAP2_LIST_MACHINE_PATCH_OTO/', {
      params: {},
      page: params.page || 1,
      size: params.size || 20,
      filter: params.filter || ''
    })
  }
}

/**
 * CVE 漏洞查询 API
 * 参照 Angular vap.service.js 实现
 */
export const cveApi = {
  /**
   * 分页查询 CVE 列表
   * GET /vap/api/vap/v2/cve/list
   * @param {Object} params - 查询参数
   * @param {string} params.source - 数据源，例如 redhat / kylinos / nvd，具体以 /cve/statistics 返回为准
   * @param {string} params.severity - 严重等级: critical / important / moderate / low
   * @param {string} params.keyword - 关键字（搜索CVE ID或描述）
   * @param {string} params.packageName - 包名
   * @param {string} params.startDate - 开始日期（格式：yyyy-MM-dd）
   * @param {string} params.endDate - 结束日期（格式：yyyy-MM-dd）
   * @param {number} params.page - 页码（从0开始）
   * @param {number} params.size - 每页数量
   * @param {string} params.sortBy - 排序字段: publicDate / severity / cveId
   * @param {string} params.sortDir - 排序方向: asc / desc
   * @returns {Promise}
   */
  getCveList(params = {}) {
    const queryParams = {}

    // 只添加非空且非 'all' 的参数
    if (params.source && params.source !== 'all') queryParams.source = params.source
    if (params.severity && params.severity !== 'all') queryParams.severity = params.severity
    if (params.keyword) queryParams.keyword = params.keyword
    if (params.packageName) queryParams.packageName = params.packageName
    if (params.startDate) queryParams.startDate = params.startDate
    if (params.endDate) queryParams.endDate = params.endDate
    if (params.page !== undefined) queryParams.page = params.page
    if (params.size !== undefined) queryParams.size = params.size
    if (params.sortBy) queryParams.sortBy = params.sortBy
    if (params.sortDir) queryParams.sortDir = params.sortDir

    return apiService.get(`${VAP_API_PREFIX}/v2/cve/list`, { params: queryParams })
  },

  /**
   * 查询 CVE 详情
   * GET /vap/api/vap/v2/cve/detail/{cveId}
   * @param {string} cveId - CVE编号，如 CVE-2025-26597
   * @returns {Promise}
   */
  getCveDetail(cveId) {
    return apiService.get(`${VAP_API_PREFIX}/v2/cve/detail/${encodeURIComponent(cveId)}`)
  },

  /**
   * 获取统计概览
   * GET /vap/api/vap/v2/cve/statistics
   * @returns {Promise}
   */
  getStatistics() {
    return apiService.get(`${VAP_API_PREFIX}/v2/cve/statistics`)
  },

  /**
   * 查询 CVE 受影响主机列表
   * GET /vap/api/vap/v2/cve/affected-hosts/{cveId}
   * @param {string} cveId - CVE编号
   * @returns {Promise}
   */
  getAffectedHosts(cveId) {
    return apiService.get(`${VAP_API_PREFIX}/v2/cve/affected-hosts/${encodeURIComponent(cveId)}`)
  },

  /**
   * 批量导出 CVE 报告（Excel）
   * POST /vap/api/vap/v2/cve/export
   * @param {string[]|Object} payload - cveIds 数组或完整请求体
   * @returns {Promise<Blob>}
   */
  exportReport(payload) {
    const requestBody = Array.isArray(payload) ? { cveIds: payload } : payload || {}

    return apiService.post(
      `${VAP_API_PREFIX}/v2/cve/export`,
      requestBody,
      {
        responseType: 'blob'
      }
    )
  },

  /**
   * 批量导出 CVE 漏洞排查反馈模板（Excel）
   * POST /vap/api/vap/v2/cve/feedback-template-export
   * @param {string[]|string|Object} payload - cveIds 数组、批量输入文本或完整请求体
   * @returns {Promise<Blob>}
   */
  exportFeedbackTemplate(payload) {
    const requestBody = Array.isArray(payload)
      ? { cveIds: payload }
      : typeof payload === 'string'
        ? { text: payload }
        : payload || {}

    return apiService.post(
      `${VAP_API_PREFIX}/v2/cve/feedback-template-export`,
      requestBody,
      {
        responseType: 'blob'
      }
    )
  },

  /**
   * 执行受影响主机重启
   * POST /vap/api/vap/v2/patch/reboot-host
   * @param {Object} payload - 重启请求体
   * @returns {Promise}
   */
  rebootHost(payload) {
    return apiService.post(`${VAP_API_PREFIX}/v2/patch/reboot-host`, payload)
  }
}

/**
 * Windows CVE 漏洞查询 API
 * 参照 win-cve-api.md 实现
 */
export const winCveApi = {
  /**
   * 分页查询 Windows CVE 列表
   * GET /vap/api/vap/v2/win-cve/list
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getCveList(params = {}) {
    const queryParams = {}

    if (params.severity && params.severity !== 'all') queryParams.severity = params.severity
    if (params.keyword) queryParams.keyword = params.keyword
    if (params.startDate) queryParams.startDate = params.startDate
    if (params.endDate) queryParams.endDate = params.endDate
    if (params.page !== undefined) queryParams.page = params.page
    if (params.size !== undefined) queryParams.size = params.size
    if (params.sortBy) queryParams.sortBy = params.sortBy
    if (params.sortDir) queryParams.sortDir = params.sortDir

    return apiService.get(`${VAP_API_PREFIX}/v2/win-cve/list`, { params: queryParams })
  },

  /**
   * 查询 Windows CVE 详情
   * GET /vap/api/vap/v2/win-cve/detail/{cveId}
   * @param {string} cveId - CVE 编号
   * @returns {Promise}
   */
  getCveDetail(cveId) {
    return apiService.get(`${VAP_API_PREFIX}/v2/win-cve/detail/${encodeURIComponent(cveId)}`)
  },

  /**
   * 获取 Windows CVE 统计概览
   * GET /vap/api/vap/v2/win-cve/statistics
   * @returns {Promise}
   */
  getStatistics() {
    return apiService.get(`${VAP_API_PREFIX}/v2/win-cve/statistics`)
  },

  /**
   * 查询受影响的 Windows 产品列表
   * GET /vap/api/vap/v2/win-cve/affected/{cveId}
   * @param {string} cveId - CVE 编号
   * @returns {Promise}
   */
  getAffectedProducts(cveId) {
    return apiService.get(`${VAP_API_PREFIX}/v2/win-cve/affected/${encodeURIComponent(cveId)}`)
  },

  /**
   * 批量导出 Windows CVE 报告（Excel）
   * POST v2/win-cve/export
   * @param {string[]} cveIds - CVE 编号列表
   * @returns {Promise<Blob>}
   */
  exportReport(cveIds) {
    return apiService.post(
      `${VAP_API_PREFIX}/v2/win-cve/export`,
      { cveIds },
      {
        responseType: 'blob'
      }
    )
  }
}

/**
 * 中间件 CVE Vulnerability 查询 API
 * 参照 middleware-cve-api.md 实现
 */
export const middlewareCveApi = {
  /**
   * 分页查询中间件 CVE 列表
   * GET /vap/api/vap/v2/middleware-cve/list
   * @param {Object} params - 查询参数
   * @param {string} params.middlewareType - 中间件类型
   * @param {string} params.severity - 严重等级
   * @param {string} params.keyword - 关键字
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @param {number} params.page - 页码
   * @param {number} params.size - 每页数量
   * @param {string} params.sortBy - 排序字段
   * @param {string} params.sortDir - 排序方向
   * @returns {Promise}
   */
  getList(params = {}) {
    const queryParams = {}

    if (params.middlewareType && params.middlewareType !== 'all')
      queryParams.middlewareType = params.middlewareType
    if (params.severity && params.severity !== 'all') queryParams.severity = params.severity
    if (params.keyword) queryParams.keyword = params.keyword
    if (params.startDate) queryParams.startDate = params.startDate
    if (params.endDate) queryParams.endDate = params.endDate
    if (params.page !== undefined) queryParams.page = params.page
    if (params.size !== undefined) queryParams.size = params.size
    if (params.sortBy) queryParams.sortBy = params.sortBy
    if (params.sortDir) queryParams.sortDir = params.sortDir

    return apiService.get(`${VAP_API_PREFIX}/v2/middleware-cve/list`, { params: queryParams })
  },

  /**
   * 查询 中间件 CVE 详情
   * GET /vap/api/vap/v2/middleware-cve/detail/{cveId}
   * @param {string} cveId - CVE编号
   * @returns {Promise}
   */
  getDetail(cveId) {
    return apiService.get(`${VAP_API_PREFIX}/v2/middleware-cve/detail/${encodeURIComponent(cveId)}`)
  },

  /**
   * 获取中间件类型列表
   * GET /vap/api/vap/v2/middleware-cve/middleware-types
   * @returns {Promise}
   */
  getMiddlewareTypes() {
    return apiService.get(`${VAP_API_PREFIX}/v2/middleware-cve/middleware-types`)
  }
}

/**
 * RPM 软件包信息 API
 */
export const rpmInfoApi = {
  /**
   * 全量 RPM 软件包分页查询
   * GET /vap/api/vap/v2/rpm-info/list
   */
  getPackageList(params = {}) {
    const query = buildGenericQuery({
      source: params.source,
      keyword: params.keyword,
      name: params.name,
      arch: params.arch,
      page: params.page ?? 0,
      size: params.size ?? 20
    })

    return apiService.get(`${VAP_API_PREFIX}/v2/rpm-info/list${query}`)
  },

  /**
   * 按 ID 查询 RPM 软件包详情
   * GET /vap/api/vap/v2/rpm-info/detail/{id}
   */
  getPackageDetailById(id) {
    return apiService.get(`${VAP_API_PREFIX}/v2/rpm-info/detail/${encodeURIComponent(id)}`)
  },

  /**
   * 按包名查询 RPM 软件包详情
   * GET /vap/api/vap/v2/rpm-info/detail
   */
  getPackageDetail(params = {}) {
    const query = buildGenericQuery({
      name: params.name,
      source: params.source,
      arch: params.arch
    })

    return apiService.get(`${VAP_API_PREFIX}/v2/rpm-info/detail${query}`)
  },

  /**
   * 批量查询 RPM 软件包详情
   * POST /vap/api/vap/v2/rpm-info/batch-detail
   */
  getBatchPackageDetail(payload = {}) {
    return apiService.post(`${VAP_API_PREFIX}/v2/rpm-info/batch-detail`, payload)
  },

  /**
   * 根据 DTS 已安装包行查询软件包详情
   * GET /vap/api/vap/v2/rpm-info/installed/detail
   */
  getInstalledDetail(params = {}) {
    const query = buildGenericQuery({
      version: params.version,
      pkgName: params.pkgName,
      source: params.source,
      arch: params.arch
    })

    return apiService.get(`${VAP_API_PREFIX}/v2/rpm-info/installed/detail${query}`)
  },

  /**
   * 根据扫描记录查询主机已安装软件包
   * GET /vap/api/vap/v2/rpm-info/installed/scan-list
   */
  getInstalledScanList(params = {}) {
    const query = buildGenericQuery({
      hostId: params.hostId,
      keyword: params.keyword,
      page: params.page ?? 0,
      size: params.size ?? 20
    })

    return apiService.get(`${VAP_API_PREFIX}/v2/rpm-info/installed/scan-list${query}`)
  },

  /**
   * 按扫描结果分页查询 Linux 机器包清单
   * GET /vap/api/vap/v2/rpm-info/installed/scan-packages
   */
  getInstalledScanPackages(params = {}) {
    const query = buildGenericQuery({
      hostId: params.hostId,
      hostKey: params.hostKey,
      hostIds: params.hostIds,
      keyword: params.keyword,
      osDistro: params.osDistro,
      osVersion: params.osVersion,
      page: params.page ?? 0,
      size: params.size ?? 20
    })

    return apiService.get(`${VAP_API_PREFIX}/v2/rpm-info/installed/scan-packages${query}`)
  },

  /**
   * 导出 Linux 机器包清单
   * POST /vap/api/vap/v2/rpm-info/installed/scan-packages/export
   */
  exportInstalledScanPackages(payload = {}) {
    return apiService.post(`${VAP_API_PREFIX}/v2/rpm-info/installed/scan-packages/export`, payload, {
      responseType: 'blob'
    })
  }
}

// 导出所有 API
export default {
  scan: patchScanApi,
  install: patchInstallApi,
  rollback: patchRollbackApi,
  library: patchLibraryApi,
  vulnerability: vulnerabilityApi,
  logs: patchLogsApi,
  overview: patchOverviewApi,
  yum: yumManageApi,
  operationReport: operationReportApi,
  cve: cveApi,
  winCve: winCveApi,
  middlewareCve: middlewareCveApi,
  rpmInfo: rpmInfoApi
}
