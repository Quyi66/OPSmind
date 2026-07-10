/**
 * 资产管理模块 API
 */
import { apiService, getJaoOperationLogs } from '@/core/api'

// ACM API 基础路径
const ACM_BASE = '/cmdb/api/cmdb'
const ACM_DASHBOARD_BASE = `${ACM_BASE}/dashboard`
const SYS_DASHBOARD_BASE = '/dashboard/api/sys/dashboard'
const JAO_DASHBOARD_BASE = '/workflow/api/workflow/dashboard'


const unwrapApiData = (response) => {
  const body = response?.data
  if (body && body.data && Array.isArray(body.data) && body.total !== undefined) {
    return body
  }
  return body?.data ?? body
}

const normalizeRecords = (payload) => {
  if (!payload) return { records: [], total: 0 }
  if (Array.isArray(payload)) {
    return { records: payload, total: payload.length }
  }
  if (Array.isArray(payload.data)) {
    return {
      records: payload.data,
      total: payload.total ?? payload.data.length
    }
  }
  if (Array.isArray(payload.records)) {
    return {
      records: payload.records,
      total: payload.total ?? payload.records.length
    }
  }
  if (Array.isArray(payload.content)) {
    return {
      records: payload.content,
      total: payload.totalElements ?? payload.total ?? payload.content.length
    }
  }
  return { records: [], total: 0 }
}

const normalizeSingleItem = (payload) => {
  if (!payload) return null
  if (Array.isArray(payload)) return payload[0] || null
  if (Array.isArray(payload.records)) return payload.records[0] || null
  if (Array.isArray(payload.content)) return payload.content[0] || null
  return payload
}

const parseStringListValue = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value !== 'string' || !value.trim()) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return []
  }
}

const normalizePagedRecords = (payload) => {
  if (!payload) {
    return {
      records: [],
      total: 0,
      content: [],
      totalElements: 0
    }
  }

  if (Array.isArray(payload)) {
    return {
      records: payload,
      total: payload.length,
      content: payload,
      totalElements: payload.length
    }
  }

  const records = Array.isArray(payload.records)
    ? payload.records
    : Array.isArray(payload.content)
      ? payload.content
      : []
  const total = payload.total ?? payload.totalElements ?? records.length

  return {
    ...payload,
    records,
    total,
    content: Array.isArray(payload.content) ? payload.content : records,
    totalElements: payload.totalElements ?? total
  }
}



/**
 * 资产总览 API
 */
export const overviewApi = {
  /**
   * 获取连接状态统计
   * GET /cmdb/api/cmdb/dashboard/connection-count
   */
  getConnectionCount() {
    return apiService.get(`${ACM_DASHBOARD_BASE}/connection-count`).then(res => normalizeRecords(unwrapApiData(res)))
  },

  /**
   * 获取资产类型统计
   * GET /cmdb/api/cmdb/dashboard/cit-manage
   */
  getAssetTypeCount() {
    return apiService.get(`${ACM_DASHBOARD_BASE}/cit-manage`).then(res => normalizeRecords(unwrapApiData(res)))
  },

  /**
   * 获取操作系统分布
   * GET /cmdb/api/cmdb/dashboard/os-distro
   */
  getOsDistribution() {
    return apiService.get(`${ACM_DASHBOARD_BASE}/os-distro`).then(res => normalizeRecords(unwrapApiData(res)))
  },

  /**
   * 获取资产新增统计
   * GET /cmdb/api/cmdb/dashboard/ci-new-count
   */
  getNewAssetCount() {
    return apiService.get(`${ACM_DASHBOARD_BASE}/ci-new-count`).then(res => normalizeRecords(unwrapApiData(res)))
  },

  /**
   * 获取分组内资产分布
   * GET /cmdb/api/cmdb/query/group/find/group/sum?os={os}
   * @param {string} os - 操作系统列表，逗号分隔
   */
  getGroupAssetCount(os = 'CentOS,Windows,Anolis,Debian,RedHat,Debian') {
    return apiService.get(`${ACM_BASE}/query/group/find/group/sum`, { params: { os } }).then(res => normalizeRecords(unwrapApiData(res)))
  },

  /**
   * 获取操作系统版本分布
   * GET /cmdb/api/cmdb/dashboard/os-version
   * @param {string} osDistro - 操作系统发行版
   */
  getOsVersionDistribution(osDistro) {
    return apiService
      .get(`${ACM_DASHBOARD_BASE}/os-version`, { params: { osDistro } })
      .then(res => normalizeRecords(unwrapApiData(res)))
  }
}

/**
 * 资产信息 API
 */
export const assetApi = {
  /**
   * 获取资产类型列表
   * GET /cmdb/api/cmdb/dashboard/cit-manage
   */
  getAssetTypes() {
    return apiService.get(`${ACM_DASHBOARD_BASE}/cit-manage`).then(res => normalizeRecords(unwrapApiData(res)))
  },

  /**
   * 获取资产类型配置（包含属性和视图定义）
   * GET /cmdb/api/cmdb/cit/code/{citCode}
   * @param {string} citCode - 资产类型代码
   */
  async getAssetTypeConfig(citCode) {
    const res = await apiService.get(`${ACM_BASE}/cit/code/${citCode}`)
    return res.data
  },

  /**
   * 获取资产属性值
   * GET /cmdb/api/cmdb/ci/attr/{id}
   * @param {string} id - 资产ID
   */
  async getAssetAttrs(id) {
    const res = await apiService.get(`${ACM_BASE}/ci/attr/${id}`)
    return res.data
  },

  /**
   * 获取资产类型定义（通过资产ID）
   * GET /cmdb/api/cmdb/cit/vo/cid/{id}
   * @param {string} id - 资产ID
   */
  async getAssetTypeByAssetId(id) {
    const res = await apiService.get(`${ACM_BASE}/cit/vo/cid/${id}`)
    return res.data
  },

  /**
   * 获取资产列表
   * POST /cmdb/api/cmdb/ci/list-asset-selector
   * @param {object} params - 查询参数
   * @param {object} options - 分页选项
   */
  getAssetList(params, options = {}) {
    const body = { ...params }
    if (options.size) body.size = options.size
    if (options.page) body.page = options.page
    if (options.filter !== undefined) body.filter = options.filter
    return apiService
      .post(`${ACM_BASE}/ci/list-asset-selector`, body)
      .then(res => normalizePagedRecords(unwrapApiData(res)))
  },

  /**
   * 获取属性值列表（用于筛选下拉）
   * GET /cmdb/api/cmdb/ci/attr/list/{ciType}/{code}
   * @param {string} ciType - 资产类型
   * @param {string} code - 属性代码
   */
  getAttrValues(ciType, code) {
    return apiService
      .get(`${ACM_BASE}/ci/attr/list/${ciType}/${code}`)
      .then(res => normalizeRecords(unwrapApiData(res)))
  },

  /**
   * 获取分组列表
   * GET /cmdb/api/cmdb/query/group/view/{citCode}
   * @param {string} citCode - 资产类型代码
   */
  async getGroupList(citCode) {
    const res = await apiService.get(
      `${ACM_BASE}/query/group/view/${citCode}`
    )
    return normalizeRecords(unwrapApiData(res))
  },

  /**
   * 获取标签列表
   * GET /cmdb/api/cmdb/query/tag/view/{citCode}
   * @param {string} citCode - 资产类型代码
   */
  async getTagList(citCode) {
    const res = await apiService.get(
      `${ACM_BASE}/query/tag/view/${citCode}`
    )
    return normalizeRecords(unwrapApiData(res))
  },

  /**
   * 获取所有资产类型列表
   * GET /cmdb/api/cmdb/cit/get/all/list
   */
  async getAllAssetTypes() {
    const res = await apiService.get(`${ACM_BASE}/cit/get/all/list`)
    return res.data
  },

  /**
   * 更新资产属性（批量修改接口）
   * POST /cmdb/api/cmdb/ci/modify/batch
   * @param {string} id - 资产ID
   * @param {object} attrs - 所有属性键值对（包含 id）
   */
  async updateAssetAttrs(id, attrs) {
    const data = { ...attrs, id }
    const res = await apiService.post(`${ACM_BASE}/ci/modify/batch?cacheBuster=${Date.now()}`, data)
    return res.data
  },

  /**
   * 获取资产模型属性列表
   * GET /cmdb/api/cmdb/cit/code/{ciType}/as/list
   * @param {string} ciType - 资产类型
   */
  getModel(ciType) {
    return apiService.get(`${ACM_BASE}/cit/code/${ciType}/as/list`).then(res => res.data)
  },

  /**
   * 获取资产类型的标签列表（用于添加标签弹窗）
   * GET /cmdb/api/cmdb/dashboard/tags/{ciType}
   * @param {string} ciType - 资产类型
   */
  getCiTagsByCit(ciType) {
    return apiService
      .get(`${ACM_DASHBOARD_BASE}/tags/${ciType}`)
      .then(res => normalizeRecords(unwrapApiData(res)))
  },

  /**
   * 获取资产类型的分组列表（用于添加分组弹窗）
   * GET /cmdb/api/cmdb/query/group/find/{ciType}
   * @param {string} ciType - 资产类型
   */
  getGroupByCit(ciType) {
    return apiService
      .get(`${ACM_BASE}/query/group/find/${ciType}`)
      .then(res => normalizeRecords(unwrapApiData(res)))
  }
}

/**
 * 数据管理 API
 */
export const dataManageApi = {
  /**
   * 获取当前租户ID
   * GET /dashboard/api/sys/dashboard/current-tenant-id
   */
  async getCurrentTenantId() {
    const res = await apiService.get(`${SYS_DASHBOARD_BASE}/current-tenant-id`)
    const data = unwrapApiData(res)
    if (typeof data === 'string') return data
    if (Array.isArray(data)) return data[0]?.currentTenantId || data[0]?.tenantId || ''
    return data?.currentTenantId || data?.tenantId || ''
  },

  /**
   * 获取资源类型列表
   * GET /cmdb/api/cmdb/dashboard/resource-type
   */
  getResourceTypes() {
    return apiService.get(`${ACM_DASHBOARD_BASE}/resource-type`).then(res => normalizeRecords(unwrapApiData(res)))
  },

  /**
   * 获取所有分组列表
   * GET /cmdb/api/cmdb/dashboard/all-group
   * @param {string} ciType - 资产类型，sjxy_all 表示全部
   */
  getAllGroups(ciType = 'sjxy_all') {
    const params = ciType ? { ciType } : undefined
    return apiService.get(`${ACM_DASHBOARD_BASE}/all-group`, { params }).then(res => normalizeRecords(unwrapApiData(res)))
  },

  /**
   * 获取所有标签列表
   * GET /cmdb/api/cmdb/dashboard/tags
   * @param {string} ciType - 资产类型，sjxy_all 表示全部
   */
  getAllTags(ciType = 'sjxy_all') {
    return apiService
      .get(`${ACM_DASHBOARD_BASE}/tags`, { params: { ciType } })
      .then(res => normalizeRecords(unwrapApiData(res)))
  },

  /**
   * 删除分组
   * POST /workflow/api/workflow/jobs/r08zUN/run
   * @param {string} id - 分组ID
   */
  async deleteGroup(id) {
    const res = await apiService.post(`/workflow/api/workflow/jobs/r08zUN/run?cacheBuster=${Date.now()}`, {
      params: { id }
    })
    return res.data
  },

  /**
   * 删除标签
   * POST /workflow/api/workflow/jobs/sKaBlB/run
   * @param {string} id - 标签ID
   */
  async deleteTag(id) {
    const res = await apiService.post(`/workflow/api/workflow/jobs/sKaBlB/run?cacheBuster=${Date.now()}`, {
      params: { id }
    })
    return res.data
  }
}

/**
 * 资产模型 API
 */
export const modelApi = {
  // TODO: 待实现
}

/**
 * 异常设备 API
 */
const mapExceptionItem = (item) => {
  if (!item) return item
  return {
    ...item,
    IP: item.IP || item.ip || '',
    ci_name: item.ci_name || (item.hostname && item.hostname !== 'N/A' ? item.hostname : item.ci_type) || '',
    CONN_LATEST_STATUS: item.CONN_LATEST_STATUS !== undefined ? item.CONN_LATEST_STATUS : '0',
    CONN_RATE: item.CONN_RATE !== undefined ? item.CONN_RATE : 0
  }
}

export const exceptionApi = {
  getConnectionCount() {
    return overviewApi.getConnectionCount()
  },

  getFailedConnectHost(params = {}) {
    return apiService
      .get(`${ACM_DASHBOARD_BASE}/failed-connect-host`, { params })
      .then(res => normalizeRecords(unwrapApiData(res)))
  },

  getConnectException(params = {}, options = {}) {
    return apiService
      .get(`${ACM_DASHBOARD_BASE}/connect-exception`, {
        params: {
          ...params,
          page: options.page || 1,
          size: options.size || 10,
          // filter: options.ip || undefined
        }
      })
      .then(res => normalizeRecords(unwrapApiData(res)))
      .then(res => {
        if (res && Array.isArray(res.records)) {
          res.records = res.records.map(mapExceptionItem)
        }
        return res
      })
  },

  getOsDiff(params = {}) {
    return apiService.get(`${ACM_DASHBOARD_BASE}/os-diff`, { params }).then(res => normalizeRecords(unwrapApiData(res)))
  },

  getExceptionDevices(params = {}, options = {}) {
    return apiService
      .get(`${ACM_DASHBOARD_BASE}/connect-exception`, {
        params: {
          ...params,
          page: options.page || 1,
          size: options.size || 10,
          filter: options.filter || undefined
        }
      })
      .then(res => normalizeRecords(unwrapApiData(res)))
      .then(res => {
        if (res && Array.isArray(res.records)) {
          res.records = res.records.map(mapExceptionItem)
        }
        return res
      })
  }
}

/**
 * 自动化配置 API
 */
export const automationApi = {
  getAutomationConfigs(params = {}, options = {}) {
    return apiService
      .get(`${ACM_DASHBOARD_BASE}/automation`, {
        params: {
          ...params,
          page: options.page || 1,
          size: options.size || 10,
          filter: options.filter || undefined
        }
      })
      .then(res => normalizeRecords(unwrapApiData(res)))
  },

  getScriptEngine() {
    return apiService.get('/api/params/jao/script_engine').then(res => normalizeSingleItem(unwrapApiData(res)))
  },

  getInstanceGroupOptions() {
    return apiService
      .get(`${SYS_DASHBOARD_BASE}/tat-url-as-string-list`)
      .then(res => normalizeRecords(unwrapApiData(res)))
  },

  getInstanceGroupList() {
    return apiService
      .get(`${SYS_DASHBOARD_BASE}/tat-url-as-string-list`)
      .then(res => normalizeRecords(unwrapApiData(res)))
      .then(payload => parseStringListValue(payload?.records?.[0]?.value))
  },

  getAllAssetAutoConfigs() {
    return apiService
      .get(`${SYS_DASHBOARD_BASE}/all-asset-auto-config`)
      .then(res => normalizeRecords(unwrapApiData(res)))
  },

  getAllAssetAutoConfigOptions() {
    return apiService
      .get(`${SYS_DASHBOARD_BASE}/all-asset-auto-config`)
      .then(res => normalizeRecords(unwrapApiData(res)))
      .then(payload => (payload?.records || []).filter(item => item?.id))
  }
}

/**
 * 资源权限 API
 */
export const permissionApi = {
  /**
   * 获取团队表格权限
   */
  getTablePermission: () => {
    return apiService.get('/cmdb/api/cmdb/permission/team/table').then(res => res.data)
  },

  /**
   * 保存团队表格权限
   * @param {string} module - 模块名称 (ACM)
   * @param {Array} data - 权限数据
   */
  saveTablePermission: (module, data) => {
    return apiService.post(`/api/team/permission/table/permission/${module}`, data).then(res => res.data)
  }
}

/**
 * 操作记录 API
 */
export const operationLogApi = {
  /**
   * 获取操作日志列表
   * GET /workflow/api/workflow/dashboard/list-operation-log
   * @param {object} params - 查询参数
   * @param {string} params.module - 模块名称 (acm)
   * @param {string} params.action - 操作类型 (all 或具体操作)
   * @param {string} params.status - 状态 (all, COMPLETED, ERROR, RUNNING)
   * @param {number} params.day - 时间范围（天数）
   */
  getOperationLogs: (params, options = {}) => {
    return getJaoOperationLogs(params, options)
  }
}

export default {
  overviewApi,
  assetApi,
  dataManageApi,
  modelApi,
  exceptionApi,
  automationApi,
  permissionApi,
  operationLogApi
}
