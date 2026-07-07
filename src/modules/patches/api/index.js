/**
 * 銵乩�蝞∠�璅∪� API
 * 銝𤾸�蝡?VAP (Vulnerability and Patch) �滚𦛚鈭支�
 */
import { apiService, getJaoOperationLogs } from '@/core/api'

const VAP_API_PREFIX = '/secops/api/secops'
const PATCH_TASK_API_PREFIX = `${VAP_API_PREFIX}/v2/patch/task`

const VAP_DASHBOARD_BASE = `${VAP_API_PREFIX}/dashboard`
// 隞乩�頝臬��其� VAP2-DASHBOARD-API-MIGRATION.md 銝剛�蝘餌� 4 銝芣𦻖�?// 餈嗘��亙藁�笔��朞� DTS 隞��靚�鍂嚗𣬚緵撌脰�蝘餉秐 sjxy-vap 璅∪��湔𦻖�𣂷�
const VAP_DASHBOARD_MIGRATION_BASE = '/secops/api/secops/dashboard'
const JAO_DASHBOARD_BASE = '/workflow/api/workflow/dashboard'

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
 * 銵乩��急��詨� API
 */
export const patchScanApi = {
  /**
   * �扯�銵乩��急�
   * @param {Object} params - �急���㺭
   * @param {Array<string>} params.hosts - 敺�醌�譍蜓�箏�銵?   * @returns {Promise}
   */
  scan(params) {
    return apiService.post(`${VAP_API_PREFIX}/v2/scan`, params)
  },

  /**
   * �瑕��急�蝏𤘪��𡑒”嚗�蜓�箸�閫��
   * GET /secops/api/secops/v2/cve/machine-list
   * @param {Object} params - �亥砭��㺭
   * @param {string} params.os_distro - �滢�蝟餌��𤏸��?   * @param {string} params.os_version - �滢�蝟餌���𧋦
   * @param {string} params.os_sp_version - �滢�蝟餌� SP ��𧋦
   * @param {Array<string>} params.tags - ��倌�𡑒”
   * @param {string} params.keyword - 銝餅㦤�溻��蜓�?IP �𤥁�鈭?ID
   * @param {number} params.page - 憿萇�嚗䔶� 0 撘�憪?   * @param {number} params.size - 瘥誯△憭批�
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
   * �瑕�銝餅㦤銵乩��急�霂行�
   * @param {string} hostId - 銝餅㦤ID
   * @returns {Promise}
   */
  getHostScanDetail(hostId) {
    return apiService.get(`${VAP_API_PREFIX}/v2/scan/host/${hostId}`)
  },

  /**
   * �瑕��急�蝏蠘恣靽⊥�
   * @returns {Promise}
   */
  getScanStats() {
    return apiService.get(`${VAP_API_PREFIX}/v2/scan/stats`)
  },

  /**
   * �瑕��蓥葵銝餅㦤靽⊥�
   * API /secops/api/secops/dashboard/VAP2_GET_MACHINE_INFO/
   * @param {Object} params - �亥砭��㺭
   * @param {string} params.host_id - 銝餅㦤ID
   * @param {string} params.host_key - 銝餅㦤 IP
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
   * �瑕��蓥葵銝餅㦤��虾�刻‘銝��銵?   * GET /secops/api/secops/v2/patch/host-patches
   * @param {Object} params - �亥砭��㺭
   * @param {string} params.host_id - 銝餅㦤ID
   * @param {string} params.severity - 銝仿�蝔见漲蝑偦�㚁��堒噡���嚗鋴ritical,Important,Moderate,Low嚗?   * @returns {Promise}
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
   * �瑕����銝餅㦤��蔓隞嗅��𡑒”
   * API /secops/api/secops/dashboard/VAP2_GET_MACHINE_PKGS/
   * @param {Object} params - �亥砭��㺭
   * @param {string} params.host_id - 銝餅㦤ID
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
   * �瑕����銝餅㦤��VE瞍𤩺��𡑒”
   * GET /secops/api/secops/v2/cve/host-cve-list
   * @param {Object} params - �亥砭��㺭
   * @param {string} params.host_id - 銝餅㦤ID
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
   * �瑕�銵乩�霂行�
   * API /secops/api/secops/dashboard/VAP2_GET_PATCH_DETAIL/
   * @param {Object} params - �亥砭��㺭
   * @param {string} params.patch_id - 銵乩�ID
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
 * 銵乩�摰㕑��詨� API
 */
export const patchInstallApi = {
  /**
   * �𥕦遣銵乩�摰㕑�隞餃𦛚
   * POST /secops/api/secops/v2/patch/task/create
   */
  createTask(params) {
    return apiService
      .post(`${PATCH_TASK_API_PREFIX}/create`, params)
      .then(normalizePatchTaskResponse)
  },

  /**
   * �𥕦遣銵乩��墧�隞餃𦛚
   * POST /secops/api/secops/v2/patch/task/create-rollback
   */
  createRollbackTask(params) {
    return apiService
      .post(`${PATCH_TASK_API_PREFIX}/create-rollback`, params)
      .then(normalizePatchTaskResponse)
  },

  /**
   * �𥕦遣頧臭辣��凒�唬遙�?   * POST /secops/api/secops/v2/patch/task/create-pkg-update
   */
  createPkgUpdateTask(params) {
    return apiService
      .post(`${PATCH_TASK_API_PREFIX}/create-pkg-update`, params)
      .then(normalizePatchTaskResponse)
  },

  /**
   * �𥕦遣瞍𤩺�靽桀�隞餃𦛚
   * POST /secops/api/secops/v2/patch/task/create-vuln-fix
   */
  createVulnFixTask(params) {
    return apiService
      .post(`${PATCH_TASK_API_PREFIX}/create-vuln-fix`, params)
      .then(normalizePatchTaskResponse)
  },

  /**
   * ��△�亥砭隞餃𦛚�𡑒”
   * GET /secops/api/secops/v2/patch/task/list
   */
  listTasks(params = {}) {
    return apiService
      .get(`${PATCH_TASK_API_PREFIX}/list${buildPatchTaskListQuery(params)}`)
      .then(normalizePatchTaskPageResponse)
  },

  /**
   * �瑕�隞餃𦛚霂行�
   * GET /secops/api/secops/v2/patch/task/{id}
   */
  getTask(id) {
    return apiService.get(`${PATCH_TASK_API_PREFIX}/${id}`).then(normalizePatchTaskResponse)
  },

  /**
   * �亥砭隞餃𦛚�滢��亙�嚗��憿蛛�
   * GET /secops/api/secops/v2/patch/task/{id}/audit/history?page=0&size=50
   */
  getTaskAuditHistory(id, params = {}) {
    return apiService
      .get(`${PATCH_TASK_API_PREFIX}/${id}/audit/history${buildPatchTaskAuditHistoryQuery(params)}`)
      .then(normalizePatchAuditPageResponse)
  },

  /**
   * �亥砭隞餃𦛚�券��滢��亙�嚗����△嚗?   * GET /secops/api/secops/v2/patch/task/{id}/audit/history/all
   */
  getTaskAuditHistoryAll(id) {
    return apiService
      .get(`${PATCH_TASK_API_PREFIX}/${id}/audit/history/all`)
      .then(normalizePatchAuditListResponse)
  },

  /**
   * �瑕�隞餃𦛚摰∟恣霂行�嚗�鉄甇仿炊瘙��鳴�
   * GET /secops/api/secops/v2/patch/task/{id}/audit/detail
   * 餈𥪜� { task, steps: [{ step, label, status, runId, logs }], logs }
   */
  getAuditDetail(id) {
    return apiService.get(`${PATCH_TASK_API_PREFIX}/${id}/audit/detail`)
  },

  /**
   * 銝𠹺�隞餃𦛚�𡁏𧋦��辣
   * POST /secops/api/secops/v2/patch/task/{id}/script/upload
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
   * 蝻𤥁�隞餃𦛚�𡁏𧋦��捆
   * PUT /secops/api/secops/v2/patch/task/{id}/script/update
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
   * 銝贝蝸隞餃𦛚�𡁏𧋦��捆
   * GET /secops/api/secops/v2/patch/task/{id}/script/download?type=pre-check
   */
  downloadScript(id, type) {
    return apiService.get(`${PATCH_TASK_API_PREFIX}/${id}/script/download?type=${type}`)
  },

  /**
   * �瑕��滚鍳蝑𣇉裦
   * GET /secops/api/secops/v2/patch/task/{id}/restart/options
   */
  getRestartOptions(id) {
    return apiService.get(`${PATCH_TASK_API_PREFIX}/${id}/restart/options`)
  },

  /**
   * �亥砭銵乩��冽�摰帋蜓�箔�����臬遣霈?   * GET /secops/api/secops/v2/patch/reboot-on-host?patchId=...&hostIp=... (�蓥葵 patch)
   * POST /secops/api/secops/v2/patch/reboot-on-host (憭帋葵 patch)
   * 霂瑟�雿?{ patchIds: [...], hostIp: "..." }
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
   * 甇仿炊1嚗𡁏�銵屸�璉��?   * POST /secops/api/secops/v2/patch/task/{id}/pre-check/execute
   */
  executePreCheck(id) {
    return apiService
      .post(`${PATCH_TASK_API_PREFIX}/${id}/pre-check/execute`)
      .then(normalizePatchTaskResponse)
  },

  /**
   * 頝唾�憸���?   * POST /secops/api/secops/v2/patch/task/{id}/pre-check/skip
   */
  skipPreCheck(id) {
    return apiService
      .post(`${PATCH_TASK_API_PREFIX}/${id}/pre-check/skip`)
      .then(normalizePatchTaskResponse)
  },

  /**
   * 甇仿炊2嚗𡁏�銵諹‘銝��鋆?   * POST /secops/api/secops/v2/patch/task/{id}/install/execute
   */
  executeInstallTask(id) {
    return apiService
      .post(`${PATCH_TASK_API_PREFIX}/${id}/install/execute`)
      .then(normalizePatchTaskResponse)
  },

  /**
   * 甇仿炊2嚗𡁏�銵諹‘銝��皛?   * POST /secops/api/secops/v2/patch/task/{id}/rollback/execute
   */
  executeRollbackTask(id) {
    return apiService
      .post(`${PATCH_TASK_API_PREFIX}/${id}/rollback/execute`)
      .then(normalizePatchTaskResponse)
  },

  /**
   * �瑕��墧�憸嘥�靽⊥�
   * GET /secops/api/secops/v2/patch/task/{id}/rollback/info
   */
  getRollbackInfo(id) {
    return apiService.get(`${PATCH_TASK_API_PREFIX}/${id}/rollback/info`)
  },

  /**
   * 甇仿炊3嚗𡁶＆霈日��舀䲮撘?   * POST /api/vap/v2/patch/task/{id}/restart/confirm
   * @param {string} id - 隞餃𦛚ID
   * @param {boolean} confirm - �臬炏蝖株恕�扯��滚鍳
   * @param {string} confirmText - 蝖株恕���
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
   * 甇仿炊4嚗𡁏�銵屸��?   * POST /secops/api/secops/v2/patch/task/{id}/restart/execute
   */
  executeRestart(id) {
    return apiService
      .post(`${PATCH_TASK_API_PREFIX}/${id}/restart/execute`)
      .then(normalizePatchTaskResponse)
  },

  /**
   * 甇仿炊5嚗𡁏�銵��鋆���⊿�
   * POST /secops/api/secops/v2/patch/task/{id}/validate/execute
   */
  executeValidate(id) {
    return apiService
      .post(`${PATCH_TASK_API_PREFIX}/${id}/validate/execute`)
      .then(normalizePatchTaskResponse)
  },

  /**
   * 頝唾��⊿�
   * POST /secops/api/secops/v2/patch/task/{id}/validate/skip
   */
  skipValidate(id) {
    return apiService
      .post(`${PATCH_TASK_API_PREFIX}/${id}/validate/skip`)
      .then(normalizePatchTaskResponse)
  },

  /**
   * �扯�銵乩�摰㕑�
   * @param {Object} params - 摰㕑���㺭
   * @param {Array<string>} params.hosts - �格�銝餅㦤�𡑒”
   * @param {Array<string>} params.packages - 敺��鋆�‘銝���𡑒”
   * @param {Array<string>} params.versions - 銵乩���𧋦�𡑒”
   * @returns {Promise}
   */
  install(params) {
    // 雿輻鍂雿靝��孵��扯�摰㕑�嚗��蝡舀��𥕦��啣耦憒?{ params: { hosts, patchIds, hostIds, packages } }
    return apiService.post('/workflow/api/workflow/jobs/QJb6B8/run', {
      params: {
        hosts: params.hosts || null,
        patchIds: params.patchIds || [],
        hostIds: params.hostIds || [],
        packages: null
      }
    })
  },

  /**
   * �扯�頧臭辣��凒�?   * @param {Object} params - �湔鰵��㺭
   * @param {Array<string>} params.hosts - �格�銝餅㦤�𡑒”
   * @param {Array<string>} params.patchIds - 銵乩�蝻硋噡�𡑒”
   * @param {Array<string>} params.hostIds - 銝餅㦤ID�𡑒”
   * @param {Array<string>} params.packages - 敺�凒�啗蔓隞嗅��𡑒”
   * @returns {Promise}
   */
  updatePackages(params) {
    const cacheBuster = Date.now()
    return apiService.post(`/workflow/api/workflow/jobs/QJb6B8/run?cacheBuster=${cacheBuster}`, {
      params: {
        hosts: params.hosts || [],
        patchIds: params.patchIds || [],
        hostIds: params.hostIds || [],
        packages: params.packages || []
      }
    })
  },

  /**
   * �瑕��臬�鋆��銵乩��𡑒”
   * @param {Object} params - �亥砭��㺭
   * @param {number} params.page - 憿萇�
   * @param {number} params.size - 瘥誯△憭批�
   * @param {string} params.severity - 銝仿�蝔见漲蝑偦�?(�堒噡���)
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
   * �瑕�銵乩�霂行�
   * @param {Object} params - �亥砭��㺭
   * @param {string} params.patch_id - 銵乩�ID
   * @returns {Promise}
   */
  getPatchDetail(params) {
    return patchScanApi.getPatchDetail(params)
  },

  /**
   * �瑕�銵乩�敶勗���蔓隞嗅��𡑒”
   * @param {Object} params - �亥砭��㺭
   * @param {Array<string>} params.patch_ids - 銵乩�ID�𡑒”
   * @returns {Promise}
   */
  getAffectedPackages(params) {
    const requestBody = {
      patch_ids: params.patch_ids
    }
    return apiService
      .post('/secops/api/secops/v2/patch/affected-pkgs', requestBody)
      .then(res => {
        if (res?.data) {
          const rawData = res.data.data ?? res.data.records ?? res.data
          res.data = Array.isArray(rawData) ? rawData : []
        }
        return res
      })
  },

  /**
   * �瑕�銵乩�敶勗���蜓�箏�銵?   * @param {Object} params - �亥砭��㺭
   * @param {Array<string>} params.patch_ids - 銵乩�ID�𡑒”
   * @param {string} params.hostId - 銝餅㦤蝑偦�㗇辺隞?   * @returns {Promise}
   */
  getMachinesByPatch(params) {
    return apiService
      .post(`${VAP_DASHBOARD_BASE}/machine-by-patch`, {
        patchIds: params.patch_ids,
        hostId: params.hostId || '@@(linux)'
      })
      .then(wrapRecordsResponse)
      .then(res => {
        if (res?.data?.records) {
          const uniqueHosts = []
          const seen = new Set()
          for (const item of res.data.records) {
            const key = item.hostId || item.hostKey
            if (key && !seen.has(key)) {
              seen.add(key)
              uniqueHosts.push({
                ...item,
                hostId: item.hostId || item.id,
                hostKey: item.hostKey || item.host_key || item.hostname
              })
            }
          }
          res.data.records = uniqueHosts
          res.data.total = uniqueHosts.length
        }
        return res
      })
  },

  /**
   * �瑕�摰㕑�隞餃𦛚�𡑒”
   * @param {Object} params - �亥砭��㺭
   * @returns {Promise}
   */
  getInstallTasks(params = {}) {
    return patchInstallApi.listTasks(params)
  },

  /**
   * �瑕�摰㕑�隞餃𦛚霂行�
   * @param {string} taskId - 隞餃𦛚ID
   * @returns {Promise}
   */
  getInstallTaskDetail(taskId) {
    return patchInstallApi.getTask(taskId)
  }
}

/**
 * 頧臭辣��𧋦�啣�鋆?API
 */
export const localInstallApi = {
  /**
   * �臬𢆡頧臭辣���鋆��銝?   * Job Code: QJb6B8
   */
  startInstall(params) {
    return apiService
      .post(`/workflow/api/workflow/jobs/QJb6B8/run?cacheBuster=${Date.now()}`, {
        params
      })
      .then(response => response?.data ?? response)
  }
}

/**
 * 銵乩��鮋���詨� API
 */
export const patchRollbackApi = {
  /**
   * �瑕��湔鰵霈啣���蟮
   * @param {Object} params - �亥砭��㺭
   * @param {number} params.page - 憿萇�
   * @param {number} params.size - 瘥誯△憭批�
   * @param {string} params.host_key - IP蝑偦�?   * @param {string} params.vul_id - CVE蝑偦�?   * @returns {Promise}
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
   * �扯�銵乩��鮋��嚗��朞�雿靝��孵�嚗?   * Job Code: Uu3eb1
   * @param {Object} params - �鮋����㺭
   * @param {Array<string>} params.histUpdateIds - �湔鰵霈啣�ID�𡑒”
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
        throw new Error('�墧�隞餃𦛚�𥕦遣憭梯揖')
      }

      return patchInstallApi.executeRollbackTask(taskId)
    }

    return apiService.post('/workflow/api/workflow/jobs/Uu3eb1/run', {
      params: {
        histUpdateIds: params.histUpdateIds,
        hostIds: null,
        hosts: null,
        patchIds: null
      }
    })
  },

  /**
   * �𣳇膄�湔鰵霈啣�嚗��朞�雿靝��孵�嚗?   * Job Code: 3Fl7CJ
   * @param {Array<string>} ids - 霈啣�ID�𡑒”
   * @returns {Promise}
   */
  deleteHistUpdatePkgs(ids) {
    return apiService.post('/workflow/api/workflow/jobs/3Fl7CJ/run', {
      params: {
        histUpdatePkgsWinIds: ids
      }
    })
  },

  /**
   * �瑕��鮋��隞餃𦛚�𡑒”
   * @param {Object} params - �亥砭��㺭
   * @returns {Promise}
   */
  getRollbackTasks(params = {}) {
    return patchInstallApi.listTasks(params)
  },

  /**
   * �瑕��鮋��隞餃𦛚霂行�
   * @param {string} taskId - 隞餃𦛚ID
   * @returns {Promise}
   */
  getRollbackTaskDetail(taskId) {
    return patchInstallApi.getTask(taskId)
  }
}

/**
 * 銵乩�隞枏��詨� API
 */
export const patchLibraryApi = {
  /**
   * �瑕����銵乩�蝏蠘恣
   * API /secops/api/secops/dashboard/VAP2_LIST_VENDOR_PATCH/
   * @returns {Promise}
   */
  getVendorStats() {
    return apiService.get(`${VAP_DASHBOARD_BASE}/vendor-patch`).then(wrapRecordsResponse)
  },

  /**
   * �瑕�銵乩�隞枏��𡑒”
   * API /secops/api/secops/dashboard/VAP2_LIST_PATCH_DATE/
   * 皞鞟頂蝏蠘窈瘙�聢撘? {"params":{"severity":"Critical","vendor":"redhat","is_ignore":"0,1"}}
   * @param {Object} params - �亥砭��㺭
   * @param {string} params.severity - 銝仿�蝔见漲蝑偦�?(�堒噡���: Critical,Important,Moderate,Low)
   * @param {string} params.vendor - ���蝑偦�?   * @param {string} params.is_ignore - �賢��閧𠶖�?(0,1 �券� / 1 �賢��?/ 0 �䂿蒾�滚�)
   * @param {string} params.filter - �㕑‘銝���瑯���閬��������?   * @param {number} params.page - 憿萇�
   * @param {number} params.size - 瘥誯△憭批�
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
   * �瑕�銵乩�隞枏��𡑒” (�扳𦻖���靽脲��澆捆)
   * @param {Object} params - �亥砭��㺭
   * @param {number} params.page - 憿萇�
   * @param {number} params.size - 瘥誯△憭批�
   * @param {string} params.filter - 蝑偦�㗇辺隞?   * @param {string} params.severity - 銝仿�蝔见漲蝑偦�?   * @returns {Promise}
   */
  getPatches(params = {}) {
    return apiService.post(`${VAP_API_PREFIX}/v2/library/patches`, params)
  },

  /**
   * �瑕�銵乩�霂行�
   * API /secops/api/secops/dashboard/VAP2_GET_PATCH_DETAIL/
   * @param {string} patchId - 銵乩�ID
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
   * 撖澆�銵乩�摨?   * @param {Object} params - 撖澆���㺭
   * @returns {Promise}
   */
  importPatches(params) {
    return apiService.post(`${VAP_API_PREFIX}/v2/library/import`, params)
  },

  /**
   * �瑕�銵乩�蝏蠘恣
   * @returns {Promise}
   */
  getLibraryStats() {
    return apiService.get(`${VAP_API_PREFIX}/v2/library/stats`)
  },

  /**
   * 銝𠹺�撟嗅紡�亥‘銝?   * @param {FormData} formData - ��鉄 files ��”�閙㺭�?   * @returns {Promise}
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
 * 瞍𤩺��詨� API
 */
export const vulnerabilityApi = {
  /**
   * �瑕�銵乩�隞枏����嚗�未�橘�
   * API /secops/api/secops/dashboard/VAP2_PATCH_INDEX/
   * 餈𥪜�: { records: [{ vendor: 'redhat', count: 100 }, ...] }
   * @returns {Promise}
   */
  getPatchIndex() {
    return apiService.get(`${VAP_DASHBOARD_BASE}/patch-index`).then(wrapRecordsResponse)
  },

  /**
   * �瑕�敶枏�蝏蠘恣�唳旿嚗���嗅㦛嚗?   * GET /secops/api/secops/dashboard/current-stats
   * 餈𥪜�: { records: [{ name: 'scan_count_critical_patch', value: 5 }, ...] }
   * @returns {Promise}
   */
  getCurrentStats() {
    // VAP2_CURRENT_STATS �?GET /sjxy-vap/api/vap/dashboard/current-stats
    return apiService.get(`${VAP_DASHBOARD_MIGRATION_BASE}/current-stats`).then(wrapRecordsResponse)
  },

  /**
   * �瑕�銵乩�頞见飵�唳旿嚗��蝥踹㦛嚗?   * API /secops/api/secops/dashboard/VAP2_PATCH_TREND/
   * 餈𥪜�: { records: [{ scan_date: '2024-01-01', patch_count: 100 }, ...] }
   * @returns {Promise}
   */
  getPatchTrend() {
    return apiService.get(`${VAP_DASHBOARD_BASE}/patch-trend`).then(wrapRecordsResponse)
  },

  /**
   * �瑕�瞍𤩺�璁���𡑒”
   * GET /secops/api/secops/v2/cve/patch-by-cves
   * @param {Object} params - �亥砭��㺭
   * @param {number} params.page - 憿萇�
   * @param {number} params.size - 瘥誯△憭批�
   * @param {string} params.filter - 蝑偦�匧��株�
   * @param {string} params.severity - 銝仿�蝔见漲蝑偦�?(all/Critical/Important/Moderate/Low)
   * @param {string} params.os_distro - �滢�蝟餌�蝑偦�?(all �硋�雿枏�?
   * @param {string} params.patch_status - 銵乩��嗆����?(all/�芯耨憭?撌脖耨憭?
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
   * 撖澆枂瞍𤩺��𡑒” Excel
   * GET /secops/api/secops/v2/cve/patch-by-cves/export
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
   * �瑕��滢�蝟餌��𡑒”
   * GET /secops/api/secops/dashboard/machine-os-info
   * @returns {Promise}
   */
  getOsDistroList() {
    // VAP2_LIST_MACHINE_OS_INFO �?GET /sjxy-vap/api/vap/dashboard/machine-os-info
    return apiService.get(`${VAP_DASHBOARD_MIGRATION_BASE}/machine-os-info`).then(wrapRecordsResponse)
  },

  /**
   * �瑕��滢�蝟餌���𧋦�𡑒”
   * GET /secops/api/secops/dashboard/machine-os-version-info
   * @returns {Promise}
   */
  getOsVersionList() {
    // VAP2_LIST_MACHINE_OS_VERSION_INFO �?GET /sjxy-vap/api/vap/dashboard/machine-os-version-info
    return apiService.get(`${VAP_DASHBOARD_MIGRATION_BASE}/machine-os-version-info`).then(wrapRecordsResponse)
  },

  /**
   * �瑕�瞍𤩺��𡑒”
   * @param {Object} params - �亥砭��㺭
   * @returns {Promise}
   */
  getVulnerabilities(params = {}) {
    return apiService.post(`${VAP_API_PREFIX}/v2/vulnerabilities`, params)
  },

  /**
   * �寞旿銵乩��嗆��D�瑕�銝餅㦤�𡑒”
   * GET /secops/api/secops/dashboard/patch-status-info
   * @param {Array} ids - 銵乩��嗆��D�啁�
   * @returns {Promise}
   */
  getPatchStatusHosts(ids) {
    return apiService.get(`${VAP_DASHBOARD_BASE}/patch-status-info`, {
      params: { ids }
    }).then(wrapRecordsResponse)
  },

  /**
   * �寞旿銵乩��嗆��D�瑕�CVE�𡑒”
   * GET /secops/api/secops/dashboard/patch-status-info-by-cve
   * @param {Array} ids - 銵乩��嗆��D�啁�
   * @returns {Promise}
   */
  getPatchStatusCves(ids) {
    return apiService.get(`${VAP_DASHBOARD_BASE}/patch-status-info-by-cve`, {
      params: { ids }
    }).then(wrapRecordsResponse)
  },

  /**
   * �寞旿銵乩��嗆��D�瑕�銵乩��𡑒”
   * GET /secops/api/secops/dashboard/patch-status-info-by-patch
   * @param {Array} ids - 銵乩��嗆��D�啁�
   * @returns {Promise}
   */
  getPatchStatusPatches(ids) {
    return apiService.get(`${VAP_DASHBOARD_BASE}/patch-status-info-by-patch`, {
      params: { ids }
    }).then(wrapRecordsResponse)
  },

  /**
   * �寞旿銵乩��嗆��D�瑕�頧臭辣���銵?   * GET /secops/api/secops/dashboard/patch-status-info-by-pkgs
   * @param {Array} ids - 銵乩��嗆��D�啁�
   * @returns {Promise}
   */
  getPatchStatusPackages(ids) {
    return apiService.get(`${VAP_DASHBOARD_BASE}/patch-status-info-by-pkgs`, {
      params: { ids }
    }).then(wrapRecordsResponse)
  },

  /**
   * �瑕�瞍𤩺�霂行�
   * @param {string} vulnId - 瞍𤩺�ID
   * @returns {Promise}
   */
  getVulnerabilityDetail(vulnId) {
    return apiService.get(`${VAP_API_PREFIX}/v2/vulnerability/${vulnId}`)
  },

  /**
   * �扯�瞍𤩺��急�
   * @param {Object} params - �急���㺭
   * @returns {Promise}
   */
  scanVulnerabilities(params) {
    return apiService.post(`${VAP_API_PREFIX}/v2/vulnerabilities/scan`, params)
  }
}

/**
 * �滢��亙��詨� API
 */
export const patchLogsApi = {
  /**
   * �亥砭蝘��銵乩��滢��亙�
   * GET /secops/api/secops/v2/patch/task/audit/logs?taskType=&operator=&startTime=&endTime=&page=0&size=20
   */
  getAuditLogs(params = {}) {
    return apiService
      .get(`${PATCH_TASK_API_PREFIX}/audit/logs${buildPatchAuditLogsQuery(params)}`)
      .then(normalizePatchTaskPageResponse)
  },

  /**
   * �瑕��滢��亙��𡑒”
   * GET /workflow/api/workflow/dashboard/list-operation-log
   * @param {Object} params - �亥砭��㺭
   * @param {number} params.page - 憿萇�
   * @param {number} params.size - 瘥誯△憭批�
   * @param {string} params.action - �滢�蝐餃�蝑偦�?(all �硋�雿梶掩�?
   * @param {string} params.status - �嗆����?(all/COMPLETED/FAILED/RUNNING)
   * @param {number} params.day - �園𡢿��凒嚗�予�堆�
   * @returns {Promise}
   */
  getLogs(params = {}) {
    return getJaoOperationLogs(
      {
        module: 'secops',
        action: params.action || 'all',
        status: params.status || 'all',
        day: params.day || 7
      },
      {
        page: params.page || 1,
        size: params.size || 20,
        filter: params.filter || ''
      }
    )
  },

  /**
   * �瑕��亙�霂行�
   * @param {string} logId - �亙�ID
   * @returns {Promise}
   */
  getLogDetail(logId) {
    return apiService.get(`${VAP_API_PREFIX}/v2/logs/${logId}`)
  }
}

/**
 * 璁��蝏蠘恣 API
 */
export const patchOverviewApi = {
  /**
   * �瑕�銵乩�蝞∠�璁��蝏蠘恣
   * @returns {Promise}
   */
  getOverview() {
    return apiService.get(`${VAP_API_PREFIX}/v2/overview`)
  },

  /**
   * �瑕�擐㚚△蝏蠘恣�∠��唳旿
   * GET /secops/api/secops/dashboard/current-stats
   * @returns {Promise}
   */
  getIndexStats() {
    // VAP2_CURRENT_STATS �?GET /sjxy-vap/api/vap/dashboard/current-stats
    return apiService.get(`${VAP_DASHBOARD_MIGRATION_BASE}/current-stats`).then(wrapRecordsResponse)
  }
}

/**
 * Windows 瞍𤩺��急��詨� API
 */
export const windowsVulnerabilityApi = {
  /**
   * �瑕� Windows 銝餅㦤�𡑒”
   * API /secops/api/secops/dashboard/VAP2_WIN_MACHINE/
   * @param {Object} params - �亥砭��㺭
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
   * �瑕� Windows 銝餅㦤銵乩��𡑒” (瞍𤩺�璁��)
   * API /secops/api/secops/dashboard/VAP2_WIN_MACHINE_PATCHS/
   * @param {Object} params - �亥砭��㺭
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
   * �瑕��訫蝱 Windows 銝餅㦤靽⊥�
   * API /secops/api/secops/dashboard/VAP2_GET_WIN_MACHINE_INFO/
   * @param {Object} params
   * @param {string} params.host_id - 銝餅㦤 ID
   * @param {string} params.host_key - 銝餅㦤 IP
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
   * �瑕��訫蝱 Windows 銝餅㦤��‘銝��銵?   * API /secops/api/secops/dashboard/VAP2_GET_WIN_MACHINE_PATCH_INFO/
   * @param {Object} params
   * @param {string} params.host_id - 銝餅㦤 ID
   * @param {string} params.host_key - 銝餅㦤 IP
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
   * �瑕��滢�蝟餌��𡑒”
   * API /secops/api/secops/dashboard/VAP2_LIST_WIN_OS_INFO/
   * @returns {Promise}
   */
  getWinOsInfo() {
    return apiService.get(`${VAP_DASHBOARD_BASE}/win-os-info`).then(wrapRecordsResponse)
  },

  /**
   * �瑕��滢�蝟餌���𧋦�𡑒”
   * API /secops/api/secops/dashboard/VAP2_LIST_WIN_OS_VERSION_INFO/
   * @returns {Promise}
   */
  getWinOsVersionInfo() {
    return apiService.get(`${VAP_DASHBOARD_BASE}/win-os-version-info`).then(wrapRecordsResponse)
  },

  /**
   * �瑕��滢�蝟餌��嗆��𡑒”
   * API /secops/api/secops/dashboard/VAP2_LIST_WIN_OS_ARCH_INFO/
   * @returns {Promise}
   */
  getWinOsArchInfo() {
    return apiService.get(`${VAP_DASHBOARD_BASE}/win-os-arch-info`).then(wrapRecordsResponse)
  },



  /**
   * �扯� Windows 瞍𤩺��急�
   * @param {Object} params - �急���㺭
   * @returns {Promise}
   */
  scanVulnerabilities(params) {
    return apiService.post('/workflow/api/workflow/jobs/WIN_SCAN/run', {
      params: params
    })
  },

  /**
   * �瑕��舀醌�讐�銝餅㦤�𡑒” (霈曉��㗇𥋘�?
   * 憭滨鍂 VAP2_WIN_MACHINE �唳旿皞鞱繮�𡝗��?Windows 銝餅㦤
   * @returns {Promise}
   */
  getAvailableHosts() {
    return apiService.get(`${VAP_DASHBOARD_BASE}/win-machine`, {
      params: { page: 1, size: 1000 }
    }).then(wrapRecordsResponse)
  },

  /**
   * �扯� Windows 瞍𤩺��急�雿靝�
   * Job Code: Fteqeo
   * @param {Object} params - �急���㺭
   * @param {Array<string>} params.host_ids - 銝餅㦤 ID �𡑒”
   * @returns {Promise}
   */
  executeWinScan(params) {
    return apiService.post('/workflow/api/workflow/jobs/Fteqeo/run', {
      params: {
        host_ids: params.host_ids
      }
    })
  },

  /**
   * �瑕��㗇𥋘��‘銝�笆摨𥪯蜓�?   */
  getWinPatchStatusInfo(ids = []) {
    return apiService.get(`${VAP_DASHBOARD_BASE}/patch-win-status-info`, {
      params: { ids }
    }).then(wrapRecordsResponse)
  },

  /**
   * �瑕��㗇𥋘��‘銝?KB �𡑒”
   */
  getWinPatchPatchInfo(ids = []) {
    return apiService.get(`${VAP_DASHBOARD_BASE}/patch-win-patch-info`, {
      params: { ids }
    }).then(wrapRecordsResponse)
  },

  /**
   * �扯�銵乩�靽桀�
   */
  executeWinPatchFix(params = {}) {
    return apiService.post('/workflow/api/workflow/jobs/EAsxlK/run', {
      params: {
        winPatchStatusIds: params.winPatchStatusIds || [],
        reboot: params.reboot || 'no'
      }
    })
  }
}

/**
 * Windows �詨� API
 */
export const windowsPatchApi = {
  /**
   * Windows 瞍𤩺��急�
   * @param {Object} params - �急���㺭
   * @returns {Promise}
   */
  scanVulnerabilities(params) {
    return apiService.post(`${VAP_API_PREFIX}/windows/vulnerabilities/scan`, params)
  },

  /**
   * �瑕� Windows 瞍𤩺��𡑒”
   * @param {Object} params - �亥砭��㺭
   * @returns {Promise}
   */
  getVulnerabilities(params = {}) {
    return apiService.post(`${VAP_API_PREFIX}/windows/vulnerabilities`, params)
  },

  /**
   * Windows �湔鰵
   * @param {Object} params - �湔鰵��㺭
   * @returns {Promise}
   */
  update(params) {
    return apiService.post(`${VAP_API_PREFIX}/windows/update`, params)
  },

  /**
   * �瑕� Windows �湔鰵�𡑒”
   * @param {Object} params - �亥砭��㺭
   * @returns {Promise}
   */
  getUpdates(params = {}) {
    return apiService.post(`${VAP_API_PREFIX}/windows/updates`, params)
  }
}

/**
 * YUM皞鞟恣��㮾�?API
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
   * �瑕�YUM皞鞾�蝵桀�銵?   * GET /workflow/api/workflow/dc/data?code=yum_configs
   * @returns {Promise}
   */
  getYumConfigs() {
    return apiService.get('/workflow/api/workflow/dc/data', {
      params: {
        code: 'yum_configs',
        cacheBuster: Date.now()
      }
    })
  },

  /**
   * �瑕� YUM 皞鞾�蝵桀�銵剁��恍���𠶖���
   * GET /secops/api/secops/v2/yum-repo/configs
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
   * 閫血��閙辺 YUM 皞鞾��?   * POST /secops/api/secops/v2/yum-repo/collect
   * @param {Object} data - �����㺭
   * @returns {Promise}
   */
  collectYumRepo(data = {}) {
    return apiService.post(`${VAP_API_PREFIX}/v2/yum-repo/collect`, data)
  },

  /**
   * �寥�閫血� YUM 皞鞾��?   * POST /secops/api/secops/v2/yum-repo/collect/batch
   * @param {Object} data - �寥������㺭
   * @returns {Promise}
   */
  collectYumRepoBatch(data = {}) {
    return apiService.post(`${VAP_API_PREFIX}/v2/yum-repo/collect/batch`, data)
  },

  /**
   * �𥕦遣YUM皞鞾�蝵?   * @param {Object} data - YUM皞鞾�蝵格㺭�?   * @returns {Promise}
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
   * �湔鰵YUM皞鞾�蝵?   * PUT /secops/api/secops/v2/yum-repo/configs/{id}
   * @param {string} id - dcDataId
   * @param {Object} data - YUM皞鞾�蝵格㺭�?   * @returns {Promise}
   */
  updateYumConfig(id, data) {
    return apiService.put(
      `${VAP_API_PREFIX}/v2/yum-repo/configs/${encodeURIComponent(id)}`,
      this.buildYumConfigPayload(data)
    )
  },

  /**
   * �𣳇膄YUM皞鞾�蝵?   * DELETE /secops/api/secops/v2/yum-repo/configs/{id}
   * @param {string} id - dcDataId
   * @returns {Promise}
   */
  deleteYumConfig(id) {
    return apiService.delete(`${VAP_API_PREFIX}/v2/yum-repo/configs/${encodeURIComponent(id)}`)
  },

  /**
   * �瑕�銝餅㦤YUM皞鞉��訫�銵?   * GET /workflow/api/workflow/universal/dc/yum_host_info
   * @param {Object} params - �亥砭��㺭
   * @returns {Promise}
   */
  getHostYumList(params = {}) {
    return apiService.get('/workflow/api/workflow/universal/dc/yum_host_info', {
      params: {
        filter: params.filter,
        page: params.page,
        size: params.size
      }
    })
  },

  /**
   * �瑕�銝餅㦤YUM皞鞱祕���銵?   * POST /workflow/api/workflow/universal/dc/{model}
   * @param {Object} params - �亥砭��㺭 { data_owner, repo_status }
   * @returns {Promise}
   */
  getHostRepoDetail(params = {}) {
    return apiService.post('/workflow/api/workflow/universal/dc/yum_list', {
      '$data_owner': params.data_owner || '',
      'repo-status': params.repo_status || 'enabled'
    })
  }
}

/**
 * Windows �湔鰵�詨� API
 */
export const windowsUpdateApi = {
  /**
   * �瑕� Windows �臬�鋆�‘銝��銵?   * API /secops/api/secops/dashboard/VAP2_PATCH_WIN_LIST/
   * @param {Object} params - �亥砭��㺭
   * @param {string} params.category_names - 蝐餃�蝑偦�㚁��堒噡���
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
   * �瑕��劐葉 KB ���敶勗�銝餅㦤�𡑒”
   * API /secops/api/secops/dashboard/VAP2_PATCH_AFFECTED_MACHINES/
   * @param {Object} params - �亥砭��㺭
   * @param {Array<string>} params.kb_numbers - KB 蝻硋噡�𡑒”
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
 * Windows 璁���詨� API
 */
export const windowsViewApi = {
  /**
   * �瑕� Windows 敶枏�蝏蠘恣�唳旿嚗���嗅㦛嚗?   * API /secops/api/secops/dashboard/VAP2_CURRENT_STATS_WIN/
   * 餈𥪜�: { records: [{ num_critical, num_rollups, num_security }] }
   * @returns {Promise}
   */
  getCurrentStatsWin() {
    return apiService.get(`${VAP_DASHBOARD_BASE}/current-stats-win`).then(wrapRecordsResponse)
  },

  /**
   * �瑕� Windows 銵乩�頞见飵�唳旿嚗��蝥踹㦛嚗?   * API /secops/api/secops/dashboard/VAP2_PATCH_TREND_WINDOWS/
   * 餈𥪜�: { records: [{ scan_date, patch_count }] }
   * @returns {Promise}
   */
  getPatchTrendWindows() {
    return apiService.get(`${VAP_DASHBOARD_BASE}/patch-trend-windows`).then(wrapRecordsResponse)
  }
}

/**
 * Windows �湔鰵�墧��詨� API
 */
export const windowsRollbackApi = {
  /**
   * �瑕� Windows �湔鰵��蟮霈啣�
   * API /secops/api/secops/dashboard/VAP_HIST_UPDATE_KBS_WIN/
   * @param {Object} params - �亥砭��㺭
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
   * �扯��墧��滢�
   * Job Code: S9eC0m
   * @param {Object} params - �墧���㺭
   * @returns {Promise}
   */
  rollback(params) {
    return apiService.post('/workflow/api/workflow/jobs/S9eC0m/run', {
      params: {
        update_kbs: params.update_kbs,
        hosts: params.hosts,
        func: 'rollback',
        reboot: params.reboot || 'no'
      }
    })
  },

  /**
   * �寥��墧��滢�
   * Job Code: HiuT3F
   * @param {Object} params - �墧���㺭
   * @returns {Promise}
   */
  batchRollback(params) {
    return apiService.post('/workflow/api/workflow/jobs/HiuT3F/run', {
      params: {
        histUpdatePkgsWinIds: params.histUpdatePkgsWinIds,
        reboot: params.reboot || 'no'
      }
    })
  },

  /**
   * �𣳇膄�湔鰵霈啣�
   * Job Code: aJlha6
   * @param {Array<string>} ids - 霈啣�ID�𡑒”
   * @returns {Promise}
   */
  deleteHistUpdateKbs(ids) {
    return apiService.post('/workflow/api/workflow/jobs/aJlha6/run', {
      params: {
        histUpdatePkgsWinIds: ids
      }
    })
  }
}

/**
 * �滢��亙��詨� API
 */
export const operationReportApi = {
  /**
   * �瑕�瞍𤩺��亙��𡑒”
   * API /secops/api/secops/dashboard/VAP2_LIST_MACHINE_VUL_OTO/
   * 摮埈挾: host_key, os_distro, os_version, vul_id, scan_timestamp
   * @param {Object} params - �亥砭��㺭
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
   * �瑕�銵乩��亙��𡑒”
   * API /secops/api/secops/dashboard/VAP2_LIST_MACHINE_PATCH_OTO/
   * 摮埈挾: host_key, os_distro, os_version, patch_id, title, severity, scan_timestamp
   * @param {Object} params - �亥砭��㺭
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
 * CVE 瞍𤩺��亥砭 API
 * ��� Angular vap.service.js 摰䂿緵
 */
export const cveApi = {
  /**
   * ��△�亥砭 CVE �𡑒”
   * GET /secops/api/secops/v2/cve/list
   * @param {Object} params - �亥砭��㺭
   * @param {string} params.source - �唳旿皞琜�靘见� redhat / kylinos / nvd嚗��雿㮖誑 /cve/statistics 餈𥪜�銝箏�
   * @param {string} params.severity - 銝仿�蝑厩漣: critical / important / moderate / low
   * @param {string} params.keyword - �喲睸摮梹��𦦵揣CVE ID�𡝗�餈堆�
   * @param {string} params.packageName - ���
   * @param {string} params.startDate - 撘�憪𧢲𠯫����澆�嚗䱭yyy-MM-dd嚗?   * @param {string} params.endDate - 蝏𤘪��交�嚗�聢撘𧶏�yyyy-MM-dd嚗?   * @param {number} params.page - 憿萇�嚗��0撘�憪页�
   * @param {number} params.size - 瘥誯△�圈�
   * @param {string} params.sortBy - �鍦�摮埈挾: publicDate / severity / cveId
   * @param {string} params.sortDir - �鍦��孵�: asc / desc
   * @returns {Promise}
   */
  getCveList(params = {}) {
    const queryParams = {}

    // �芣溶�𣳇�蝛箔��?'all' ����?    if (params.source && params.source !== 'all') queryParams.source = params.source
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
   * �亥砭 CVE 霂行�
   * GET /secops/api/secops/v2/cve/detail/{cveId}
   * @param {string} cveId - CVE蝻硋噡嚗�� CVE-2025-26597
   * @returns {Promise}
   */
  getCveDetail(cveId) {
    return apiService.get(`${VAP_API_PREFIX}/v2/cve/detail/${encodeURIComponent(cveId)}`)
  },

  /**
   * �瑕�蝏蠘恣璁��
   * GET /secops/api/secops/v2/cve/statistics
   * @returns {Promise}
   */
  getStatistics() {
    return apiService.get(`${VAP_API_PREFIX}/v2/cve/statistics`)
  },

  /**
   * �亥砭 CVE �堒蔣�滢蜓�箏�銵?   * GET /secops/api/secops/v2/cve/affected-hosts/{cveId}
   * @param {string} cveId - CVE蝻硋噡
   * @returns {Promise}
   */
  getAffectedHosts(cveId) {
    return apiService.get(`${VAP_API_PREFIX}/v2/cve/affected-hosts/${encodeURIComponent(cveId)}`)
  },

  /**
   * �寥�撖澆枂 CVE �亙�嚗𠄌xcel嚗?   * POST /secops/api/secops/v2/cve/export
   * @param {string[]|Object} payload - cveIds �啁��硋��渲窈瘙��
   * @returns {Promise<Blob>}
   */
  exportReport(payload) {
    const requestBody = Array.isArray(payload) ? { cveIds: payload } : payload || {}

    return apiService.post(`${VAP_API_PREFIX}/v2/cve/export`, requestBody, {
      responseType: 'blob'
    })
  },

  /**
   * �寥�撖澆枂 CVE 瞍𤩺��埝䰻�漤�璅⊥踎嚗𠄌xcel嚗?   * POST /secops/api/secops/v2/cve/feedback-template-export
   * @param {string[]|string|Object} payload - cveIds �啁���鸌�讛��交��祆�摰峕㟲霂瑟�雿?   * @returns {Promise<Blob>}
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
   * �扯��堒蔣�滢蜓�粹��?   * POST /secops/api/secops/v2/patch/reboot-host
   * @param {Object} payload - �滚鍳霂瑟�雿?   * @returns {Promise}
   */
  rebootHost(payload) {
    return apiService.post(`${VAP_API_PREFIX}/v2/patch/reboot-host`, payload)
  }
}

/**
 * Windows CVE 瞍𤩺��亥砭 API
 * ��� win-cve-api.md 摰䂿緵
 */
export const winCveApi = {
  /**
   * ��△�亥砭 Windows CVE �𡑒”
   * GET /secops/api/secops/v2/win-cve/list
   * @param {Object} params - �亥砭��㺭
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
   * �亥砭 Windows CVE 霂行�
   * GET /secops/api/secops/v2/win-cve/detail/{cveId}
   * @param {string} cveId - CVE 蝻硋噡
   * @returns {Promise}
   */
  getCveDetail(cveId) {
    return apiService.get(`${VAP_API_PREFIX}/v2/win-cve/detail/${encodeURIComponent(cveId)}`)
  },

  /**
   * �瑕� Windows CVE 蝏蠘恣璁��
   * GET /secops/api/secops/v2/win-cve/statistics
   * @returns {Promise}
   */
  getStatistics() {
    return apiService.get(`${VAP_API_PREFIX}/v2/win-cve/statistics`)
  },

  /**
   * �亥砭�堒蔣�滨� Windows 鈭批��𡑒”
   * GET /secops/api/secops/v2/win-cve/affected/{cveId}
   * @param {string} cveId - CVE 蝻硋噡
   * @returns {Promise}
   */
  getAffectedProducts(cveId) {
    return apiService.get(`${VAP_API_PREFIX}/v2/win-cve/affected/${encodeURIComponent(cveId)}`)
  },

  /**
   * �寥�撖澆枂 Windows CVE �亙�嚗𠄌xcel嚗?   * POST v2/win-cve/export
   * @param {string[]} cveIds - CVE 蝻硋噡�𡑒”
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
 * 銝剝𡢿隞?CVE Vulnerability �亥砭 API
 * ��� middleware-cve-api.md 摰䂿緵
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
   * ��△�亥砭銝剝𡢿隞?CVE �𡑒”
   * GET /secops/api/secops/v2/middleware-cve/list
   * @param {Object} params - �亥砭��㺭
   * @param {string} params.middlewareType - 銝剝𡢿隞嗥掩�?   * @param {string} params.severity - 銝仿�蝑厩漣
   * @param {string} params.keyword - �喲睸摮?   * @param {string} params.startDate - 撘�憪𧢲𠯫�?   * @param {string} params.endDate - 蝏𤘪��交�
   * @param {number} params.page - 憿萇�
   * @param {number} params.size - 瘥誯△�圈�
   * @param {string} params.sortBy - �鍦�摮埈挾
   * @param {string} params.sortDir - �鍦��孵�
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
   * �亥砭 銝剝𡢿隞?CVE 霂行�
   * GET /secops/api/secops/v2/middleware-cve/detail/{cveId}
   * @param {string} cveId - CVE蝻硋噡
   * @returns {Promise}
   */
  getDetail(cveId) {
    return apiService.get(`${VAP_API_PREFIX}/v2/middleware-cve/detail/${encodeURIComponent(cveId)}`)
  },

  /**
   * �瑕�銝剝𡢿隞嗥掩�见�銵?   * GET /secops/api/secops/v2/middleware-cve/middleware-types
   * @returns {Promise}
   */
  getMiddlewareTypes() {
    return apiService.get(`${VAP_API_PREFIX}/v2/middleware-cve/middleware-types`)
  }
}

/**
 * RPM 頧臭辣��縑�?API
 */
export const rpmInfoApi = {
  /**
   * �亥砭�嗆��帋蜀
   * GET /secops/api/secops/v2/rpm-info/architectures
   */
  getArchitectures(params = {}) {
    const query = buildGenericQuery({ source: params.source })
    return apiService.get(`${VAP_API_PREFIX}/v2/rpm-info/architectures${query}`)
  },

  /**
   * �券� RPM 頧臭辣���憿菜䰻霂?   * GET /secops/api/secops/v2/rpm-info/list
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
   * �?ID �亥砭 RPM 頧臭辣��祕�?   * GET /secops/api/secops/v2/rpm-info/detail/{id}
   */
  getPackageDetailById(id) {
    return apiService.get(`${VAP_API_PREFIX}/v2/rpm-info/detail/${encodeURIComponent(id)}`)
  },

  /**
   * �匧��齿䰻霂?RPM 頧臭辣��祕�?   * GET /secops/api/secops/v2/rpm-info/detail
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
   * �寥��亥砭 RPM 頧臭辣��祕�?   * POST /secops/api/secops/v2/rpm-info/batch-detail
   */
  getBatchPackageDetail(payload = {}) {
    return apiService.post(`${VAP_API_PREFIX}/v2/rpm-info/batch-detail`, payload)
  },

  /**
   * �寞旿 DTS 撌脣�鋆��銵峕䰻霂Ｚ蔓隞嗅�霂行�
   * GET /secops/api/secops/v2/rpm-info/installed/detail
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
   * �寞旿�急�霈啣��亥砭銝餅㦤撌脣�鋆�蔓隞嗅�
   * GET /secops/api/secops/v2/rpm-info/installed/scan-list
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
   * �㗇醌�讐��𨅯�憿菜䰻霂?Linux �箏膥����?   * GET /secops/api/secops/v2/rpm-info/installed/scan-packages
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
   * 撖澆枂 Linux �箏膥����?   * POST /secops/api/secops/v2/rpm-info/installed/scan-packages/export
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
 * R3 繚 銝餅㦤�餉��芸�銋㕑��?API
 */
export const viewConfigApi = {
  /**
   * �匧����閫�㦛
   * GET /cmdb/api/cmdb/ci/view-config?ciType=host&scope=user
   */
  getViewConfig(params = {}) {
    const query = buildGenericQuery({
      ciType: params.ciType || 'host',
      scope: params.scope || 'user'
    })
    return apiService.get(`/cmdb/api/cmdb/ci/view-config${query}`)
  },

  /**
   * 靽嘥�閫�㦛
   * PUT /cmdb/api/cmdb/ci/view-config
   */
  saveViewConfig(data) {
    return apiService.put('/cmdb/api/cmdb/ci/view-config', data)
  },

  /**
   * �舫�匧��批�銵?   * GET /cmdb/api/cmdb/ci/view-config/attrs?ciType=host
   */
  getAttrs(params = {}) {
    const query = buildGenericQuery({
      ciType: params.ciType || 'host'
    })
    return apiService.get(`/cmdb/api/cmdb/ci/view-config/attrs${query}`)
  }
}

/**
 * R4 繚 銝餅㦤蝡臬藁銝𤾸躹��鸌�誯�蝵?API
 */
export const hostBatchApi = {
  /**
   * �寥��滨蔭蝡臬藁
   * POST /cmdb/api/cmdb/ci/batch/apply-ports
   */
  applyPorts(data) {
    return apiService.post('/cmdb/api/cmdb/ci/batch/apply-ports', data)
  },

  /**
   * �寥�霈曄蔭�蓥葵撅墧�?   * POST /cmdb/api/cmdb/ci/batch/save/attr
   */
  saveAttr(data) {
    return apiService.post('/cmdb/api/cmdb/ci/batch/save/attr', data)
  },

  /**
   * �堒枂 3 銝芯��坔躹�笔�
   * GET /cmdb/api/cmdb/ci/batch/locations
   */
  getLocations() {
    return apiService.get('/cmdb/api/cmdb/ci/batch/locations')
  },

  /**
   * �寥�蝏嗘蜓�箸�霈啣躹�?   * POST /cmdb/api/cmdb/ci/batch/set-location
   */
  setLocation(data) {
    return apiService.post('/cmdb/api/cmdb/ci/batch/set-location', data)
  },

  /**
   * �亙��唬蜓�箏��滚躹�?   * GET /cmdb/api/cmdb/ci/batch/get-location?hostId=...
   */
  getLocation(hostId) {
    return apiService.get(`/cmdb/api/cmdb/ci/batch/get-location?hostId=${hostId}`)
  }
}

/**
 * R2 繚 瞍𤩺�蝝扳�亦�摨衣��蹂�閫�� API
 */
export const urgencyApi = {
  /**
   * 4 獢��霈∪之�?   * GET /secops/api/secops/v2/urgency/statistics
   */
  getStatistics() {
    return apiService.get('/secops/api/secops/v2/urgency/statistics')
  },

  /**
   * �券��滨�
   * POST /secops/api/secops/v2/urgency/recompute?batchSize=1000
   */
  recompute(params = {}) {
    const query = buildGenericQuery({
      batchSize: params.batchSize || 1000
    })
    return apiService.post(`/secops/api/secops/v2/urgency/recompute${query}`)
  },

  /**
   * �訫蝱銝餅㦤�滨�
   * POST /secops/api/secops/v2/urgency/recompute-host?hostId=...
   */
  recomputeHost(hostId) {
    return apiService.post(`/secops/api/secops/v2/urgency/recompute-host?hostId=${hostId}`)
  },

  /**
   * 閫���𡑒”
   * GET /secops/api/secops/v2/urgency/rule
   */
  getRules() {
    return apiService.get('/secops/api/secops/v2/urgency/rule')
  },

  /**
   * 憭?CVE �亦揮�亦�摨?(�單𧒄霈∠�, 0�賢�)
   * POST /secops/api/secops/v2/urgency/lookup
   */
  lookupUrgency(data) {
    return apiService.post('/secops/api/secops/v2/urgency/lookup', data)
  },

  /**
   * 憭?CVE �亥砭蝏𤘪�撖澆枂 Excel
   * POST /secops/api/secops/v2/urgency/lookup/export
   */
  exportLookupUrgency(data) {
    return apiService.post('/secops/api/secops/v2/urgency/lookup/export', data, {
      responseType: 'blob'
    })
  },

  /**
   * 閫��蝻𤥁�
   * PUT /secops/api/secops/v2/urgency/rule/{id}
   */
  updateRule(id, data) {
    return apiService.put(`/secops/api/secops/v2/urgency/rule/${id}`, data)
  },

  /**
   * �券�撖澆�敶枏�蝘����揮�亦�摨西��?   * POST /secops/api/secops/v2/urgency/rule/import
   */
  importRules(file) {
    const formData = new FormData()
    formData.append('file', file)
    return apiService.post('/secops/api/secops/v2/urgency/rule/import', formData)
  },

  /**
   * 憭批㨃銝钅凃��△�𡑒”
   * GET /secops/api/secops/v2/urgency/page?urgency=...&page=1&size=20
   */
  getUrgencyPage(params = {}) {
    const query = buildGenericQuery({
      urgency: params.urgency,
      page: params.page ?? 1,
      size: params.size ?? 20
    })
    return apiService.get(`/secops/api/secops/v2/urgency/page${query}`)
  }
}

/**
 * R1 繚 CVE ��辣撖澆�瘥𥪜笆 API
 */
export const cveImportApi = {
  /**
   * 銝𠹺� Excel
   * POST /secops/api/secops/v2/cve/import/upload
   */
  uploadExcel(file) {
    const formData = new FormData()
    formData.append('file', file)
    return apiService.post('/secops/api/secops/v2/cve/import/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  /**
   * 閫血�瘥𥪜笆
   * POST /secops/api/secops/v2/cve/import/batch/{id}/compare
   */
  compareBatch(id) {
    return apiService.post(`/secops/api/secops/v2/cve/import/batch/${id}/compare`)
  },

  /**
   * ��蟮�寞活��△
   * GET /secops/api/secops/v2/cve/import/batch?page=0&size=20
   */
  getBatches(params = {}) {
    const query = buildGenericQuery({
      page: params.page ?? 0,
      size: params.size ?? 20
    })
    return apiService.get(`/secops/api/secops/v2/cve/import/batch${query}`)
  },

  /**
   * �寞活霂行�
   * GET /secops/api/secops/v2/cve/import/batch/{id}
   */
  getBatchDetail(id) {
    return apiService.get(`/secops/api/secops/v2/cve/import/batch/${id}`)
  },

  /**
   * 瘨匧�銝餅㦤皜��
   * GET /secops/api/secops/v2/cve/import/batch/{id}/affected-hosts
   */
  getAffectedHosts(id) {
    return apiService.get(`/secops/api/secops/v2/cve/import/batch/${id}/affected-hosts`)
  },

  /**
   * 撖澆枂銝𦠜𥁒璅⊥踎
   * POST /secops/api/secops/v2/cve/import/batch/{id}/export-report
   */
  exportReport(id) {
    return apiService.post(
      `/secops/api/secops/v2/cve/import/batch/${id}/export-report`,
      {},
      {
        responseType: 'blob'
      }
    )
  },

  /**
   * �𣳇膄�寞活
   * DELETE /secops/api/secops/v2/cve/import/batch/{id}
   */
  deleteBatch(id) {
    return apiService.delete(`/secops/api/secops/v2/cve/import/batch/${id}`)
  }
}

// 撖澆枂���?API
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
