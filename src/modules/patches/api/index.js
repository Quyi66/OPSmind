/**
 * 补丁管理模块 API
 * 与后端 VAP (Vulnerability and Patch) 服务交互
 */
import { apiService } from '@/core/api'

const VAP_API_PREFIX = '/vap/api/vap'
const PATCH_TASK_API_PREFIX = `${VAP_API_PREFIX}/v2/patch/task`

const VAP_DASHBOARD_BASE = `${VAP_API_PREFIX}/dashboard`
// 以下路径用于 VAP2-DASHBOARD-API-MIGRATION.md 中迁移的 4 个接口
// 这些接口原先通过 DTS 代理调用，现已迁移至 sjxy-vap 模块直接提供
const VAP_DASHBOARD_MIGRATION_BASE = '/vap/api/vap/dashboard'
const JAO_DASHBOARD_BASE = '/jao/api/jao/dashboard'

const unwrapApiData = (response) => response?.data?.data ?? response?.data

const normalizeRecords = (payload) => {
  if (Array.isArray(payload)) {
    return { records: payload, total: payload.length }
  }
  if (payload && Array.isArray(payload.records)) {
    return payload
  }
  if (payload && typeof payload === 'object') {
    return { ...payload, records: payload.records || [payload], total: payload.total || 1 }
  }
  return { records: [], total: 0 }
}

const wrapRecordsResponse = (response) => ({
  ...response,
  data: normalizeRecords(unwrapApiData(response))
})

const wrapFirstRecordDetail = (response) => {
  const payload = normalizeRecords(unwrapApiData(response))
  return { data: payload.records[0] || null }
}

const paginateRecords = (records, page = 1, size = records.length || 20) => {
  const start = (page - 1) * size
  return {
    records: records.slice(start, start + size),
    total: records.length
  }
}

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
   * GET /vap/api/vap/v2/cve/machine-list
   * @param {Object} params - 查询参数
   * @param {string} params.os_distro - 操作系统发行版
   * @param {string} params.os_version - 操作系统版本
   * @param {string} params.os_sp_version - 操作系统 SP 版本
   * @param {Array<string>} params.tags - 标签列表
   * @param {string} params.keyword - 主机名、主机 IP 或资产 ID
   * @param {number} params.page - 页码，从 0 开始
   * @param {number} params.size - 每页大小
   * @returns {Promise}
   */
  getScanResults(params = {}) {
    const query = buildGenericQuery({
      os_distro: params.os_distro,
      os_version: params.os_version,
      os_sp_version: params.os_sp_version,
      tags: params.tags,
      keyword: params.keyword,
      page: params.page ?? 0,
      size: params.size ?? 20
    })

    return apiService.get(`${VAP_API_PREFIX}/v2/cve/machine-list${query}`).then(wrapRecordsResponse)
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
    return apiService
      .get(`${VAP_DASHBOARD_BASE}/machine-info`, {
        params: { hostId: params.host_id || params.hostId }
      })
      .then(wrapRecordsResponse)
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
    return apiService
      .get(`${VAP_DASHBOARD_BASE}/patch-of-one-machine`, {
        params: {
          hostId: params.host_id || params.hostId,
          severity: params.severity || undefined
        }
      })
      .then(wrapRecordsResponse)
  },

  /**
   * 获取指定主机的软件包列表
   * POST /dts/api/dts/q/data/VAP2_GET_MACHINE_PKGS/
   * @param {Object} params - 查询参数
   * @param {string} params.host_id - 主机ID
   * @returns {Promise}
   */
  getMachinePackages(params) {
    return apiService
      .get(`${VAP_DASHBOARD_BASE}/machine-pkgs`, {
        params: { hostId: params.host_id || params.hostId }
      })
      .then(wrapRecordsResponse)
  },

  /**
   * 获取指定主机的CVE漏洞列表
   * GET /vap/api/vap/v2/cve/host-cve-list
   * @param {Object} params - 查询参数
   * @param {string} params.host_id - 主机ID
   * @returns {Promise}
   */
  getMachineCVEList(params) {
    return apiService
      .get(`${VAP_DASHBOARD_BASE}/machine-cve-list`, {
        params: {
          hostId: params.host_id || params.hostId,
          severity: params.severity || undefined
        }
      })
      .then(wrapRecordsResponse)
  },

  /**
   * 获取补丁详情
   * POST /dts/api/dts/q/data/VAP2_GET_PATCH_DETAIL/
   * @param {Object} params - 查询参数
   * @param {string} params.patch_id - 补丁ID
   * @returns {Promise}
   */
  getPatchDetail(params) {
    return apiService
      .get(`${VAP_DASHBOARD_BASE}/patch-detail`, {
        params: { patchId: params.patch_id || params.patchId }
      })
      .then(wrapRecordsResponse)
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
   * 查询任务操作日志（分页）
   * GET /vap/api/vap/v2/patch/task/{id}/audit/history?page=0&size=50
   */
  getTaskAuditHistory(id, params = {}) {
    return apiService
      .get(`${PATCH_TASK_API_PREFIX}/${id}/audit/history${buildPatchTaskAuditHistoryQuery(params)}`)
      .then(normalizePatchAuditPageResponse)
  },

  /**
   * 查询任务全量操作日志（不分页）
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
   * GET /vap/api/vap/v2/patch/reboot-on-host?patchId=...&hostIp=... (单个 patch)
   * POST /vap/api/vap/v2/patch/reboot-on-host (多个 patch)
   * 请求体 { patchIds: [...], hostIp: "..." }
   */
  getPatchRebootOnHost(params) {
    let patchIds = []
    if (Array.isArray(params.patchIds)) {
      patchIds = params.patchIds
    } else if (typeof params.patchId === 'string') {
      patchIds = params.patchId
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    } else if (params.patchId) {
      patchIds = [String(params.patchId)]
    }

    if (patchIds.length > 1) {
      const payload = {
        patchIds,
        hostIp: params.hostIp
      }
      const url = params.cacheBuster
        ? `${VAP_API_PREFIX}/v2/patch/reboot-on-host?cacheBuster=${params.cacheBuster}`
        : `${VAP_API_PREFIX}/v2/patch/reboot-on-host`
      return apiService.post(url, payload)
    } else {
      const patchIdVal = patchIds.length > 0 ? patchIds[0] : params.patchId || ''
      const searchParams = new URLSearchParams({
        patchId: patchIdVal,
        hostIp: params.hostIp
      })

      if (params.cacheBuster) {
        searchParams.set('cacheBuster', String(params.cacheBuster))
      }

      return apiService.get(`${VAP_API_PREFIX}/v2/patch/reboot-on-host?${searchParams.toString()}`)
    }
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
    const severity = Array.isArray(params.severity)
      ? params.severity
      : typeof params.severity === 'string' && params.severity.trim()
        ? params.severity.split(',').map(item => item.trim()).filter(Boolean)
        : []

    return apiService.post(`${VAP_API_PREFIX}/v2/patch/effect/patch`, severity)
  },

  /**
   * 获取补丁详情
   * @param {Object} params - 查询参数
   * @param {string} params.patch_id - 补丁ID
   * @returns {Promise}
   */
  getPatchDetail(params) {
    return patchScanApi.getPatchDetail(params)
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
    return apiService.post('/vap/api/vap/v2/patch/affected-pkgs', requestBody).then(wrapRecordsResponse)
  },

  /**
   * 获取补丁影响的主机列表
   * @param {Object} params - 查询参数
   * @param {Array<string>} params.patch_ids - 补丁ID列表
   * @param {string} params.hostId - 主机筛选条件
   * @returns {Promise}
   */
  getMachinesByPatch(params) {
    return apiService
      .get(`${VAP_DASHBOARD_BASE}/machine-by-patch`, {
        params: {
          patchIds: params.patch_ids,
          hostId: params.hostId || '@@(linux)'
        }
      })
      .then(wrapRecordsResponse)
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
 * 软件包本地安装 API
 */
export const localInstallApi = {
  /**
   * 启动软件包安装作业
   * Job Code: QJb6B8
   */
  startInstall(params) {
    return apiService
      .post(`/jao/api/jao/jobs/QJb6B8/run?cacheBuster=${Date.now()}`, {
        params
      })
      .then(response => response?.data ?? response)
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
    return apiService
      .get(`${VAP_DASHBOARD_BASE}/hist-update-pkgs`, {
        params: {
          hostKey: params.host_key || '',
          vulId: params.vul_id || '',
          page: params.page || 1,
          size: params.size || 20
        }
      })
      .then(wrapRecordsResponse)
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
    return apiService.get(`${VAP_DASHBOARD_BASE}/vendor-patch`).then(wrapRecordsResponse)
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
    const keyword = String(params.filter || '').trim().toLowerCase()
    return apiService
      .get(`${VAP_DASHBOARD_BASE}/patch-date`, {
        params: {
          vendor: params.vendor,
          severity: params.severity,
          isIgnore: params.is_ignore
        }
      })
      .then((response) => {
        let records = normalizeRecords(unwrapApiData(response)).records || []
        if (keyword) {
          records = records.filter(item =>
            [item.patch_id, item.title, item.vendor, item.related_vuls]
              .filter(Boolean)
              .some(value => String(value).toLowerCase().includes(keyword))
          )
        }
        return { data: paginateRecords(records, params.page || 1, params.size || 20) }
      })
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
      .get(`${VAP_DASHBOARD_BASE}/patch-detail`, {
        params: { patchId }
      })
      .then(wrapFirstRecordDetail)
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
    return apiService.post(`${VAP_API_PREFIX}/v2/patch/upload-and-import`, formData, {
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
    return apiService.get(`${VAP_DASHBOARD_BASE}/patch-index`).then(wrapRecordsResponse)
  },

  /**
   * 获取当前统计数据（柱状图）
   * GET /vap/api/vap/dashboard/current-stats
   * 返回: { records: [{ name: 'scan_count_critical_patch', value: 5 }, ...] }
   * @returns {Promise}
   */
  getCurrentStats() {
    // VAP2_CURRENT_STATS → GET /sjxy-vap/api/vap/dashboard/current-stats
    return apiService.get(`${VAP_DASHBOARD_MIGRATION_BASE}/current-stats`).then(wrapRecordsResponse)
  },

  /**
   * 获取补丁趋势数据（折线图）
   * POST /dts/api/dts/q/data/VAP2_PATCH_TREND/
   * 返回: { records: [{ scan_date: '2024-01-01', patch_count: 100 }, ...] }
   * @returns {Promise}
   */
  getPatchTrend() {
    return apiService.get(`${VAP_DASHBOARD_BASE}/patch-trend`).then(wrapRecordsResponse)
  },

  /**
   * 获取漏洞概览列表
   * GET /vap/api/vap/v2/cve/patch-by-cves
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
    const query = buildGenericQuery({
      host_key: params.host_key === 'all' ? undefined : params.host_key,
      vul_id: params.vul_id === 'all' ? undefined : params.vul_id,
      severity: params.severity === 'all' ? undefined : params.severity,
      reboot_status: params.reboot_status === 'all' ? undefined : params.reboot_status,
      is_kernel: params.is_kernel === 'all' ? undefined : params.is_kernel,
      patch_status: params.patch_status === 'all' ? undefined : params.patch_status,
      os_distro: params.os_distro === 'all' ? undefined : params.os_distro,
      os_major_version: params.os_major_version === 'all' ? undefined : params.os_major_version,
      filter: params.filter,
      page: params.page ?? 0,
      size: params.size ?? 20
    })

    return apiService.get(`${VAP_API_PREFIX}/v2/cve/patch-by-cves${query}`).then(wrapRecordsResponse)
  },

  /**
   * 导出漏洞列表 Excel
   * GET /vap/api/vap/v2/cve/patch-by-cves/export
   */
  exportVulnerabilityList(params = {}) {
    const query = buildGenericQuery({
      host_key: params.host_key === 'all' ? undefined : params.host_key,
      vul_id: params.vul_id === 'all' ? undefined : params.vul_id,
      severity: params.severity === 'all' ? undefined : params.severity,
      reboot_status: params.reboot_status === 'all' ? undefined : params.reboot_status,
      is_kernel: params.is_kernel === 'all' ? undefined : params.is_kernel,
      patch_status: params.patch_status === 'all' ? undefined : params.patch_status,
      os_distro: params.os_distro === 'all' ? undefined : params.os_distro,
      os_major_version: params.os_major_version === 'all' ? undefined : params.os_major_version,
      filter: params.filter
    })

    return apiService.get(`${VAP_API_PREFIX}/v2/cve/patch-by-cves/export${query}`, {
      responseType: 'blob'
    })
  },

  /**
   * 获取操作系统列表
   * GET /vap/api/vap/dashboard/machine-os-info
   * @returns {Promise}
   */
  getOsDistroList() {
    // VAP2_LIST_MACHINE_OS_INFO → GET /sjxy-vap/api/vap/dashboard/machine-os-info
    return apiService.get(`${VAP_DASHBOARD_MIGRATION_BASE}/machine-os-info`).then(wrapRecordsResponse)
  },

  /**
   * 获取操作系统版本列表
   * GET /vap/api/vap/dashboard/machine-os-version-info
   * @returns {Promise}
   */
  getOsVersionList() {
    // VAP2_LIST_MACHINE_OS_VERSION_INFO → GET /sjxy-vap/api/vap/dashboard/machine-os-version-info
    return apiService.get(`${VAP_DASHBOARD_MIGRATION_BASE}/machine-os-version-info`).then(wrapRecordsResponse)
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
   * GET /vap/api/vap/dashboard/patch-status-info
   * @param {Array} ids - 补丁状态ID数组
   * @returns {Promise}
   */
  getPatchStatusHosts(ids) {
    return apiService.get(`${VAP_DASHBOARD_BASE}/patch-status-info`, {
      params: { ids }
    }).then(wrapRecordsResponse)
  },

  /**
   * 根据补丁状态ID获取CVE列表
   * GET /vap/api/vap/dashboard/patch-status-info-by-cve
   * @param {Array} ids - 补丁状态ID数组
   * @returns {Promise}
   */
  getPatchStatusCves(ids) {
    return apiService.get(`${VAP_DASHBOARD_BASE}/patch-status-info-by-cve`, {
      params: { ids }
    }).then(wrapRecordsResponse)
  },

  /**
   * 根据补丁状态ID获取补丁列表
   * GET /vap/api/vap/dashboard/patch-status-info-by-patch
   * @param {Array} ids - 补丁状态ID数组
   * @returns {Promise}
   */
  getPatchStatusPatches(ids) {
    return apiService.get(`${VAP_DASHBOARD_BASE}/patch-status-info-by-patch`, {
      params: { ids }
    }).then(wrapRecordsResponse)
  },

  /**
   * 根据补丁状态ID获取软件包列表
   * GET /vap/api/vap/dashboard/patch-status-info-by-pkgs
   * @param {Array} ids - 补丁状态ID数组
   * @returns {Promise}
   */
  getPatchStatusPackages(ids) {
    return apiService.get(`${VAP_DASHBOARD_BASE}/patch-status-info-by-pkgs`, {
      params: { ids }
    }).then(wrapRecordsResponse)
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
   * 查询租户补丁操作日志
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
    return apiService
      .get(`${JAO_DASHBOARD_BASE}/list-operation-log`, {
        params: {
          module: 'vap2',
          action: params.action || 'all',
          status: params.status || 'all',
          day: params.day || 7,
          page: params.page || 1,
          size: params.size || 20,
          filter: params.filter || ''
        }
      })
      .then(wrapRecordsResponse)
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
   * GET /vap/api/vap/dashboard/current-stats
   * @returns {Promise}
   */
  getIndexStats() {
    // VAP2_CURRENT_STATS → GET /sjxy-vap/api/vap/dashboard/current-stats
    return apiService.get(`${VAP_DASHBOARD_MIGRATION_BASE}/current-stats`).then(wrapRecordsResponse)
  }
}

/**
 * Windows 漏洞扫描相关 API
 */
export const windowsVulnerabilityApi = {
  /**
   * 获取 Windows 主机列表
   * POST /dts/api/dts/q/data/VAP2_WIN_MACHINE/
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getWinMachines(params = {}) {
    return apiService.get(`${VAP_DASHBOARD_BASE}/win-machine`, {
      params: {
        page: params.page,
        size: params.size,
        filter: params.filter || ''
      }
    }).then(wrapRecordsResponse)
  },

  /**
   * 获取 Windows 主机补丁列表 (漏洞概览)
   * POST /dts/api/dts/q/data/VAP2_WIN_MACHINE_PATCHS/
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getWinMachinePatches(params = {}) {
    return apiService.get(`${VAP_DASHBOARD_BASE}/win-machine-patchs`, {
      params: {
        hostKey: params.host_key || '',
        kbNumber: params.kb_number || '',
        patchStatus: params.patch_status || 'all',
        osDistro: params.os_distro || 'all',
        osArch: params.os_arch || 'all',
        osVersion: params.os_version || 'all',
        page: params.page,
        size: params.size,
        filter: params.keyword || ''
      }
    }).then(wrapRecordsResponse)
  },

  /**
   * 获取单台 Windows 主机信息
   * POST /dts/api/dts/q/data/VAP2_GET_WIN_MACHINE_INFO/
   * @param {Object} params
   * @param {string} params.host_id - 主机 ID
   * @param {string} params.host_key - 主机 IP
   * @returns {Promise}
   */
  getWinMachineInfo(params = {}) {
    return apiService.get(`${VAP_DASHBOARD_BASE}/win-machine-info`, {
      params: {
        hostId: params.host_id || params.hostId || ''
      }
    }).then(wrapRecordsResponse)
  },

  /**
   * 获取单台 Windows 主机的补丁列表
   * POST /dts/api/dts/q/data/VAP2_GET_WIN_MACHINE_PATCH_INFO/
   * @param {Object} params
   * @param {string} params.host_id - 主机 ID
   * @param {string} params.host_key - 主机 IP
   * @returns {Promise}
   */
  getWinMachinePatchInfo(params = {}) {
    return apiService.get(`${VAP_DASHBOARD_BASE}/win-machine-patch-info`, {
      params: {
        hostId: params.host_id || params.hostId || '',
        page: params.page || 1,
        size: params.size || 10
      }
    }).then(wrapRecordsResponse)
  },

  /**
   * 获取操作系统列表
   * POST /dts/api/dts/q/data/VAP2_LIST_WIN_OS_INFO/
   * @returns {Promise}
   */
  getWinOsInfo() {
    return apiService.get(`${VAP_DASHBOARD_BASE}/win-os-info`).then(wrapRecordsResponse)
  },

  /**
   * 获取操作系统版本列表
   * POST /dts/api/dts/q/data/VAP2_LIST_WIN_OS_VERSION_INFO/
   * @returns {Promise}
   */
  getWinOsVersionInfo() {
    return apiService.get(`${VAP_DASHBOARD_BASE}/win-os-version-info`).then(wrapRecordsResponse)
  },

  /**
   * 获取操作系统架构列表
   * POST /dts/api/dts/q/data/VAP2_LIST_WIN_OS_ARCH_INFO/
   * @returns {Promise}
   */
  getWinOsArchInfo() {
    return apiService.get(`${VAP_DASHBOARD_BASE}/win-os-arch-info`).then(wrapRecordsResponse)
  },

  /**
   * 获取 Windows 漏洞列表
   * POST /dts/api/dts/q/data/VAP2_WIN_VULNERABILITIES/
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getWinVulnerabilities(params = {}) {
    return apiService.post('/dts/api/dts/q/data/VAP2_WIN_VULNERABILITIES/', {
      params: {
        severity: params.severity || ''
      },
      page: params.page || 1,
      size: params.size || 20,
      filter: params.filter || ''
    })
  },

  /**
   * 获取主机漏洞详情
   * @param {Object} params - 查询参数
   * @param {string} params.host_key - 主机 IP
   * @param {string} params.host_id - 主机 ID
   * @returns {Promise}
   */
  getHostVulnDetail(params) {
    return apiService.post('/dts/api/dts/q/data/VAP2_WIN_HOST_DETAIL/', {
      params: {
        host_key: params.host_key,
        host_id: params.host_id
      }
    })
  },

  /**
   * 执行 Windows 漏洞扫描
   * @param {Object} params - 扫描参数
   * @returns {Promise}
   */
  scanVulnerabilities(params) {
    return apiService.post('/jao/api/jao/jobs/WIN_SCAN/run', {
      params: params
    })
  },

  /**
   * 获取可扫描的主机列表 (设备选择器)
   * 复用 VAP2_WIN_MACHINE 数据源获取所有 Windows 主机
   * @returns {Promise}
   */
  getAvailableHosts() {
    return apiService.get(`${VAP_DASHBOARD_BASE}/win-machine`, {
      params: { page: 1, size: 1000 }
    }).then(wrapRecordsResponse)
  },

  /**
   * 执行 Windows 漏洞扫描作业
   * Job Code: Fteqeo
   * @param {Object} params - 扫描参数
   * @param {Array<string>} params.host_ids - 主机 ID 列表
   * @returns {Promise}
   */
  executeWinScan(params) {
    return apiService.post('/jao/api/jao/jobs/Fteqeo/run', {
      params: {
        host_ids: params.host_ids
      }
    })
  },

  /**
   * 获取选择的补丁对应主机
   */
  getWinPatchStatusInfo(ids = []) {
    return apiService.get(`${VAP_DASHBOARD_BASE}/patch-win-status-info`, {
      params: { ids }
    }).then(wrapRecordsResponse)
  },

  /**
   * 获取选择的补丁 KB 列表
   */
  getWinPatchPatchInfo(ids = []) {
    return apiService.get(`${VAP_DASHBOARD_BASE}/patch-win-patch-info`, {
      params: { ids }
    }).then(wrapRecordsResponse)
  },

  /**
   * 执行补丁修复
   */
  executeWinPatchFix(params = {}) {
    return apiService.post('/jao/api/jao/jobs/EAsxlK/run', {
      params: {
        winPatchStatusIds: params.winPatchStatusIds || [],
        reboot: params.reboot || 'no'
      }
    })
  }
}

/**
 * Windows 相关 API
 */
export const windowsPatchApi = {
  /**
   * Windows 漏洞扫描
   * @param {Object} params - 扫描参数
   * @returns {Promise}
   */
  scanVulnerabilities(params) {
    return apiService.post(`${VAP_API_PREFIX}/windows/vulnerabilities/scan`, params)
  },

  /**
   * 获取 Windows 漏洞列表
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getVulnerabilities(params = {}) {
    return apiService.post(`${VAP_API_PREFIX}/windows/vulnerabilities`, params)
  },

  /**
   * Windows 更新
   * @param {Object} params - 更新参数
   * @returns {Promise}
   */
  update(params) {
    return apiService.post(`${VAP_API_PREFIX}/windows/update`, params)
  },

  /**
   * 获取 Windows 更新列表
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getUpdates(params = {}) {
    return apiService.post(`${VAP_API_PREFIX}/windows/updates`, params)
  }
}

/**
 * YUM源管理相关 API
 */
export const yumManageApi = {
  buildYumConfigPayload(data = {}) {
    const payload = {}
    const baseurls = Array.from(
      new Set(
        (Array.isArray(data?.baseurls) ? data.baseurls : [data?.baseurls])
          .map(item => String(item || '').trim())
          .filter(Boolean)
      )
    )
    const baseurl = String(data?.baseurl || '').trim()

    if (baseurls.length > 0) {
      payload.baseurls = baseurls
    } else if (baseurl) {
      payload.baseurl = baseurl
    }

    const name = String(data?.name || '').trim()
    const description = String(data?.description || '').trim()
    const file = String(data?.file || '').trim()
    const osFamily = String(data?.osFamily || '').trim()
    const osMajor = String(data?.osMajor || '').trim()
    const osSpVersion = String(data?.osSpVersion || '').trim()
    const arch = String(data?.arch || '').trim()

    if (name) payload.name = name
    if (description) payload.description = description
    if (file) payload.file = file
    if (osFamily) payload.osFamily = osFamily
    if (osMajor) payload.osMajor = osMajor
    if (osSpVersion) payload.osSpVersion = osSpVersion
    if (arch) payload.arch = arch

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
   * GET /jao/api/jao/universal/dc/yum_host_info
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getHostYumList(params = {}) {
    return apiService.get('/jao/api/jao/universal/dc/yum_host_info', {
      params: {
        filter: params.filter,
        page: params.page,
        size: params.size
      }
    })
  },

  /**
   * 获取主机YUM源详情列表
   * POST /jao/api/jao/universal/dc/{model}
   * @param {Object} params - 查询参数 { data_owner, repo_status }
   * @returns {Promise}
   */
  getHostRepoDetail(params = {}) {
    return apiService.post('/jao/api/jao/universal/dc/yum_list', {
      '$data_owner': params.data_owner || '',
      'repo-status': params.repo_status || 'enabled'
    })
  }
}

/**
 * Windows 更新相关 API
 */
export const windowsUpdateApi = {
  /**
   * 获取 Windows 可安装补丁列表
   * POST /dts/api/dts/q/data/VAP2_PATCH_WIN_LIST/
   * @param {Object} params - 查询参数
   * @param {string} params.category_names - 类型筛选，逗号分隔
   * @returns {Promise}
   */
  getPatchWinList(params = {}) {
    return apiService.get(`${VAP_DASHBOARD_BASE}/patch-win-list`, {
      params: {
        categoryNames: params.category_names || 'Critical Updates,Security Updates',
        page: params.page || 1,
        size: params.size || 10,
        filter: params.filter || ''
      }
    }).then(wrapRecordsResponse)
  },

  /**
   * 获取补丁受影响的主机列表
   * POST /dts/api/dts/q/data/VAP2_LIST_MACHINE_BY_WIN_PATCH/
   * @param {Object} params - 查询参数
   * @param {string} params.kb_number - KB 编号
   * @returns {Promise}
   */
  getAffectedMachines(params = {}) {
    return apiService.post('/dts/api/dts/q/data/VAP2_LIST_MACHINE_BY_WIN_PATCH/', {
      params: {
        kb_number: params.kb_number || ''
      },
      page: 1,
      size: 500
    })
  },

  /**
   * 获取选中 KB 的受影响主机列表
   * POST /dts/api/dts/q/data/VAP2_PATCH_AFFECTED_MACHINES/
   * @param {Object} params - 查询参数
   * @param {Array<string>} params.kb_numbers - KB 编号列表
   * @returns {Promise}
   */
  getAffectedMachinesByKbNumbers(params = {}) {
    return apiService.get(`${VAP_DASHBOARD_BASE}/patch-affected-machines`, {
      params: {
        kbNumbers: params.kb_numbers || [],
        page: 1,
        size: 500
      }
    }).then(wrapRecordsResponse)
  }
}

/**
 * Windows 概览相关 API
 */
export const windowsViewApi = {
  /**
   * 获取 Windows 当前统计数据（柱状图）
   * POST /dts/api/dts/q/data/VAP2_CURRENT_STATS_WIN/
   * 返回: { records: [{ num_critical, num_rollups, num_security }] }
   * @returns {Promise}
   */
  getCurrentStatsWin() {
    return apiService.get(`${VAP_DASHBOARD_BASE}/current-stats-win`).then(wrapRecordsResponse)
  },

  /**
   * 获取 Windows 补丁趋势数据（折线图）
   * POST /dts/api/dts/q/data/VAP2_PATCH_TREND_WINDOWS/
   * 返回: { records: [{ scan_date, patch_count }] }
   * @returns {Promise}
   */
  getPatchTrendWindows() {
    return apiService.get(`${VAP_DASHBOARD_BASE}/patch-trend-windows`).then(wrapRecordsResponse)
  }
}

/**
 * Windows 更新回滚相关 API
 */
export const windowsRollbackApi = {
  /**
   * 获取 Windows 更新历史记录
   * POST /dts/api/dts/q/data/VAP_HIST_UPDATE_KBS_WIN/
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getHistUpdateKbsWin(params = {}) {
    return apiService.get(`${VAP_DASHBOARD_BASE}/hist-update-kbs-win`, {
      params: {
        hostKey: params.host_key || '',
        updateKbNumbers: params.update_kb_numbers || '',
        page: params.page || 1,
        size: params.size || 20
      }
    }).then(wrapRecordsResponse)
  },

  /**
   * 执行回滚操作
   * Job Code: S9eC0m
   * @param {Object} params - 回滚参数
   * @returns {Promise}
   */
  rollback(params) {
    return apiService.post('/jao/api/jao/jobs/S9eC0m/run', {
      params: {
        update_kbs: params.update_kbs,
        hosts: params.hosts,
        func: 'rollback',
        reboot: params.reboot || 'no'
      }
    })
  },

  /**
   * 批量回滚操作
   * Job Code: HiuT3F
   * @param {Object} params - 回滚参数
   * @returns {Promise}
   */
  batchRollback(params) {
    return apiService.post('/jao/api/jao/jobs/HiuT3F/run', {
      params: {
        histUpdatePkgsWinIds: params.histUpdatePkgsWinIds,
        reboot: params.reboot || 'no'
      }
    })
  },

  /**
   * 删除更新记录
   * Job Code: aJlha6
   * @param {Array<string>} ids - 记录ID列表
   * @returns {Promise}
   */
  deleteHistUpdateKbs(ids) {
    return apiService.post('/jao/api/jao/jobs/aJlha6/run', {
      params: {
        histUpdatePkgsWinIds: ids
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
    return apiService.get(`${VAP_DASHBOARD_BASE}/machine-vul-oto`, {
      params: {
        page: params.page || 1,
        size: params.size || 20,
        filter: params.filter || ''
      }
    }).then(wrapRecordsResponse)
  },

  /**
   * 获取补丁报告列表
   * POST /dts/api/dts/q/data/VAP2_LIST_MACHINE_PATCH_OTO/
   * 字段: host_key, os_distro, os_version, patch_id, title, severity, scan_timestamp
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getPatchReport(params = {}) {
    return apiService.get(`${VAP_DASHBOARD_BASE}/machine-patch-oto`, {
      params: {
        page: params.page || 1,
        size: params.size || 20,
        filter: params.filter || ''
      }
    }).then(wrapRecordsResponse)
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

    return apiService.post(`${VAP_API_PREFIX}/v2/cve/export`, requestBody, {
      responseType: 'blob'
    })
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

    return apiService.post(`${VAP_API_PREFIX}/v2/cve/feedback-template-export`, requestBody, {
      responseType: 'blob'
    })
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
export const winKbApi = {
  getKbList(params = {}) {
    const queryParams = {}

    if (params.severity && params.severity !== 'all') queryParams.severity = params.severity
    if (params.keyword) queryParams.keyword = params.keyword
    if (params.startDate) queryParams.startDate = params.startDate
    if (params.endDate) queryParams.endDate = params.endDate
    if (params.page !== undefined) queryParams.page = params.page
    if (params.size !== undefined) queryParams.size = params.size

    return apiService.get(`${VAP_API_PREFIX}/v2/win-kb/list`, { params: queryParams })
  },

  getKbDetail(kbNumber) {
    return apiService.get(`${VAP_API_PREFIX}/v2/win-kb/detail/${encodeURIComponent(kbNumber)}`)
  },

  getAffectedHosts(kbNumber) {
    return apiService.get(
      `${VAP_API_PREFIX}/v2/win-kb/affected-hosts/${encodeURIComponent(kbNumber)}`
    )
  },

  getStatistics() {
    return apiService.get(`${VAP_API_PREFIX}/v2/win-kb/statistics`)
  }
}

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
   * 查询架构枚举
   * GET /vap/api/vap/v2/rpm-info/architectures
   */
  getArchitectures(params = {}) {
    const query = buildGenericQuery({ source: params.source })
    return apiService.get(`${VAP_API_PREFIX}/v2/rpm-info/architectures${query}`)
  },

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
      currentPackage: params.currentPackage,
      osDistro: params.osDistro,
      osVersion: params.osVersion,
      osArch: params.osArch,
      version: params.version,
      pkgName: params.pkgName,
      source: params.source,
      arch: params.arch || params.pkgArch || params.architecture
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
    return apiService.post(
      `${VAP_API_PREFIX}/v2/rpm-info/installed/scan-packages/export`,
      payload,
      {
        responseType: 'blob'
      }
    )
  }
}

/**
 * R3 · 主机总览自定义视图 API
 */
export const viewConfigApi = {
  /**
   * 拉取生效视图
   * GET /acm/api/acm/ci/view-config?ciType=host&scope=user
   */
  getViewConfig(params = {}) {
    const query = buildGenericQuery({
      ciType: params.ciType || 'host',
      scope: params.scope || 'user'
    })
    return apiService.get(`/acm/api/acm/ci/view-config${query}`)
  },

  /**
   * 保存视图
   * PUT /acm/api/acm/ci/view-config
   */
  saveViewConfig(data) {
    return apiService.put('/acm/api/acm/ci/view-config', data)
  },

  /**
   * 可选属性列表
   * GET /acm/api/acm/ci/view-config/attrs?ciType=host
   */
  getAttrs(params = {}) {
    const query = buildGenericQuery({
      ciType: params.ciType || 'host'
    })
    return apiService.get(`/acm/api/acm/ci/view-config/attrs${query}`)
  }
}

/**
 * R4 · 主机端口与区域批量配置 API
 */
export const hostBatchApi = {
  /**
   * 批量配置端口
   * POST /acm/api/acm/ci/batch/apply-ports
   */
  applyPorts(data) {
    return apiService.post('/acm/api/acm/ci/batch/apply-ports', data)
  },

  /**
   * 批量设置单个属性
   * POST /acm/api/acm/ci/batch/save/attr
   */
  saveAttr(data) {
    return apiService.post('/acm/api/acm/ci/batch/save/attr', data)
  },

  /**
   * 列出 3 个保留区域名
   * GET /acm/api/acm/ci/batch/locations
   */
  getLocations() {
    return apiService.get('/acm/api/acm/ci/batch/locations')
  },

  /**
   * 批量给主机标记区域
   * POST /acm/api/acm/ci/batch/set-location
   */
  setLocation(data) {
    return apiService.post('/acm/api/acm/ci/batch/set-location', data)
  },

  /**
   * 查单台主机当前区域
   * GET /acm/api/acm/ci/batch/get-location?hostId=...
   */
  getLocation(hostId) {
    return apiService.get(`/acm/api/acm/ci/batch/get-location?hostId=${hostId}`)
  }
}

/**
 * R2 · 漏洞紧急程度看板与规则 API
 */
export const urgencyApi = {
  /**
   * 4 档统计大卡
   * GET /vap/api/vap/v2/urgency/statistics
   */
  getStatistics() {
    return apiService.get('/vap/api/vap/v2/urgency/statistics')
  },

  /**
   * 全量重算
   * POST /vap/api/vap/v2/urgency/recompute?batchSize=1000
   */
  recompute(params = {}) {
    const query = buildGenericQuery({
      batchSize: params.batchSize || 1000
    })
    return apiService.post(`/vap/api/vap/v2/urgency/recompute${query}`)
  },

  /**
   * 单台主机重算
   * POST /vap/api/vap/v2/urgency/recompute-host?hostId=...
   */
  recomputeHost(hostId) {
    return apiService.post(`/vap/api/vap/v2/urgency/recompute-host?hostId=${hostId}`)
  },

  /**
   * 规则列表
   * GET /vap/api/vap/v2/urgency/rule
   */
  getRules() {
    return apiService.get('/vap/api/vap/v2/urgency/rule')
  },

  /**
   * 多 CVE 查紧急程度 (即时计算, 0落库)
   * POST /vap/api/vap/v2/urgency/lookup
   */
  lookupUrgency(data) {
    return apiService.post('/vap/api/vap/v2/urgency/lookup', data)
  },

  /**
   * 多 CVE 查询结果导出 Excel
   * POST /vap/api/vap/v2/urgency/lookup/export
   */
  exportLookupUrgency(data) {
    return apiService.post('/vap/api/vap/v2/urgency/lookup/export', data, {
      responseType: 'blob'
    })
  },

  /**
   * 规则编辑
   * PUT /vap/api/vap/v2/urgency/rule/{id}
   */
  updateRule(id, data) {
    return apiService.put(`/vap/api/vap/v2/urgency/rule/${id}`, data)
  },

  /**
   * 全量导入当前租户的紧急程度规则
   * POST /vap/api/vap/v2/urgency/rule/import
   */
  importRules(file) {
    const formData = new FormData()
    formData.append('file', file)
    return apiService.post('/vap/api/vap/v2/urgency/rule/import', formData)
  },

  /**
   * 大卡下钻分页列表
   * GET /vap/api/vap/v2/urgency/page?urgency=...&page=1&size=20
   */
  getUrgencyPage(params = {}) {
    const query = buildGenericQuery({
      urgency: params.urgency,
      page: params.page ?? 1,
      size: params.size ?? 20
    })
    return apiService.get(`/vap/api/vap/v2/urgency/page${query}`)
  }
}

/**
 * R1 · CVE 文件导入比对 API
 */
export const cveImportApi = {
  /**
   * 上传 Excel
   * POST /vap/api/vap/v2/cve/import/upload
   */
  uploadExcel(file) {
    const formData = new FormData()
    formData.append('file', file)
    return apiService.post('/vap/api/vap/v2/cve/import/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  /**
   * 触发比对
   * POST /vap/api/vap/v2/cve/import/batch/{id}/compare
   */
  compareBatch(id) {
    return apiService.post(`/vap/api/vap/v2/cve/import/batch/${id}/compare`)
  },

  /**
   * 历史批次分页
   * GET /vap/api/vap/v2/cve/import/batch?page=0&size=20
   */
  getBatches(params = {}) {
    const query = buildGenericQuery({
      page: params.page ?? 0,
      size: params.size ?? 20
    })
    return apiService.get(`/vap/api/vap/v2/cve/import/batch${query}`)
  },

  /**
   * 批次详情
   * GET /vap/api/vap/v2/cve/import/batch/{id}
   */
  getBatchDetail(id) {
    return apiService.get(`/vap/api/vap/v2/cve/import/batch/${id}`)
  },

  /**
   * 涉及主机清单
   * GET /vap/api/vap/v2/cve/import/batch/{id}/affected-hosts
   */
  getAffectedHosts(id) {
    return apiService.get(`/vap/api/vap/v2/cve/import/batch/${id}/affected-hosts`)
  },

  /**
   * 导出上报模板
   * POST /vap/api/vap/v2/cve/import/batch/{id}/export-report
   */
  exportReport(id) {
    return apiService.post(
      `/vap/api/vap/v2/cve/import/batch/${id}/export-report`,
      {},
      {
        responseType: 'blob'
      }
    )
  },

  /**
   * 删除批次
   * DELETE /vap/api/vap/v2/cve/import/batch/{id}
   */
  deleteBatch(id) {
    return apiService.delete(`/vap/api/vap/v2/cve/import/batch/${id}`)
  }
}

// 导出所有 API
export default {
  scan: patchScanApi,
  install: patchInstallApi,
  localInstall: localInstallApi,
  rollback: patchRollbackApi,
  library: patchLibraryApi,
  vulnerability: vulnerabilityApi,
  logs: patchLogsApi,
  overview: patchOverviewApi,
  yum: yumManageApi,
  operationReport: operationReportApi,
  cve: cveApi,
  winCve: winCveApi,
  winKb: winKbApi,
  middlewareCve: middlewareCveApi,
  rpmInfo: rpmInfoApi,
  viewConfig: viewConfigApi,
  hostBatch: hostBatchApi,
  urgency: urgencyApi,
  cveImport: cveImportApi
}
