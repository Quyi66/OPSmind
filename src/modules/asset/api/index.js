/**
 * 资产管理模块 API
 */
import { apiService } from '@/core/api'

// ACM API 基础路径
const ACM_BASE = '/acm/api/acm'
const ACM_DASHBOARD_BASE = `${ACM_BASE}/dashboard`
const SYS_DASHBOARD_BASE = '/svs/api/sys/dashboard'
const JAO_DASHBOARD_BASE = '/jao/api/jao/dashboard'
const DTS_BASE = '/api/dts/q/data'

const unwrapApiData = (response) => response?.data?.data ?? response?.data

const normalizeRecords = (payload) => {
  if (!payload) return { records: [], total: 0 }
  if (Array.isArray(payload)) {
    return { records: payload, total: payload.length }
  }
  // 处理 records 格式
  if (Array.isArray(payload.records)) {
    return {
      records: payload.records,
      total: payload.total ?? payload.records.length
    }
  }
  // 处理 Spring Data Page 格式 (content + totalElements)
  if (Array.isArray(payload.content)) {
    return {
      records: payload.content,
      total: payload.totalElements ?? payload.total ?? payload.content.length
    }
  }
  return { records: [], total: 0 }
}

/**
 * DTS 数据查询 API
 */
export const dtsApi = {
  /**
   * 通用数据查询
   * @param {string} datasetId - 数据集ID
   * @param {object} params - 查询参数
   * @param {object} options - 分页等选项
   */
  async queryData(datasetId, params = {}, options = {}) {
    const body = { params }
    if (options.size) body.size = options.size
    if (options.page) body.page = options.page
    if (options.filter !== undefined) body.filter = options.filter
    const res = await apiService.post(`${DTS_BASE}/${datasetId}/?cacheBuster=${Date.now()}`, body)
    return res.data
  }
}

/**
 * 资产总览 API
 */
export const overviewApi = {
  /**
   * 获取连接状态统计
   * GET /acm/api/acm/dashboard/connection-count
   */
  getConnectionCount() {
    return apiService.get(`${ACM_DASHBOARD_BASE}/connection-count`).then(res => normalizeRecords(unwrapApiData(res)))
  },

  /**
   * 获取资产类型统计
   * GET /acm/api/acm/dashboard/cit-manage
   */
  getAssetTypeCount() {
    return apiService.get(`${ACM_DASHBOARD_BASE}/cit-manage`).then(res => normalizeRecords(unwrapApiData(res)))
  },

  /**
   * 获取操作系统分布
   * GET /acm/api/acm/dashboard/os-distro
   */
  getOsDistribution() {
    return apiService.get(`${ACM_DASHBOARD_BASE}/os-distro`).then(res => normalizeRecords(unwrapApiData(res)))
  },

  /**
   * 获取资产新增统计
   * GET /acm/api/acm/dashboard/ci-new-count
   */
  getNewAssetCount() {
    return apiService.get(`${ACM_DASHBOARD_BASE}/ci-new-count`).then(res => normalizeRecords(unwrapApiData(res)))
  },

  /**
   * 获取分组内资产分布
   * GET /acm/api/acm/query/group/find/group/sum?os={os}
   * @param {string} os - 操作系统列表，逗号分隔
   */
  getGroupAssetCount(os = 'CentOS,Windows,Anolis,Debian,RedHat,Debian') {
    return apiService.get(`${ACM_BASE}/query/group/find/group/sum`, { params: { os } }).then(res => normalizeRecords(unwrapApiData(res)))
  },

  /**
   * 获取操作系统版本分布
   * GET /acm/api/acm/dashboard/os-version
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
   * GET /acm/api/acm/dashboard/cit-manage
   */
  getAssetTypes() {
    return apiService.get(`${ACM_DASHBOARD_BASE}/cit-manage`).then(res => normalizeRecords(unwrapApiData(res)))
  },

  /**
   * 获取资产类型配置（包含属性和视图定义）
   * GET /acm/api/acm/cit/code/{citCode}
   * @param {string} citCode - 资产类型代码
   */
  async getAssetTypeConfig(citCode) {
    const res = await apiService.get(`${ACM_BASE}/cit/code/${citCode}?cacheBuster=${Date.now()}`)
    return res.data
  },

  /**
   * 获取资产属性值
   * GET /acm/api/acm/ci/attr/{id}
   * @param {string} id - 资产ID
   */
  async getAssetAttrs(id) {
    const res = await apiService.get(`${ACM_BASE}/ci/attr/${id}?cacheBuster=${Date.now()}`)
    return res.data
  },

  /**
   * 获取资产类型定义（通过资产ID）
   * GET /acm/api/acm/cit/vo/cid/{id}
   * @param {string} id - 资产ID
   */
  async getAssetTypeByAssetId(id) {
    const res = await apiService.get(`${ACM_BASE}/cit/vo/cid/${id}?cacheBuster=${Date.now()}`)
    return res.data
  },

  /**
   * 获取资产列表
   * POST /acm/api/acm/ci/list-asset-selector
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
      .then(res => normalizeRecords(unwrapApiData(res)))
  },

  /**
   * 获取属性值列表（用于筛选下拉）
   * GET /acm/api/acm/ci/attr/list/{ciType}/{code}
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
   * GET /acm/api/acm/query/group/view/{citCode}
   * @param {string} citCode - 资产类型代码
   */
  async getGroupList(citCode) {
    const res = await apiService.get(
      `${ACM_BASE}/query/group/view/${citCode}?cacheBuster=${Date.now()}`
    )
    return normalizeRecords(unwrapApiData(res))
  },

  /**
   * 获取标签列表
   * GET /acm/api/acm/query/tag/view/{citCode}
   * @param {string} citCode - 资产类型代码
   */
  async getTagList(citCode) {
    const res = await apiService.get(
      `${ACM_BASE}/query/tag/view/${citCode}?cacheBuster=${Date.now()}`
    )
    return normalizeRecords(unwrapApiData(res))
  },

  /**
   * 获取所有资产类型列表
   * GET /acm/api/acm/cit/get/all/list
   */
  async getAllAssetTypes() {
    const res = await apiService.get(`${ACM_BASE}/cit/get/all/list?cacheBuster=${Date.now()}`)
    return res.data
  },

  /**
   * 更新资产属性（批量修改接口）
   * POST /acm/api/acm/ci/modify/batch
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
   * GET /acm/api/acm/cit/code/{ciType}/as/list
   * @param {string} ciType - 资产类型
   */
  getModel(ciType) {
    return apiService.get(`${ACM_BASE}/cit/code/${ciType}/as/list`).then(res => res.data)
  },

  /**
   * 获取资产类型的标签列表（用于添加标签弹窗）
   * GET /acm/api/acm/dashboard/tags/{ciType}
   * @param {string} ciType - 资产类型
   */
  getCiTagsByCit(ciType) {
    return apiService
      .get(`${ACM_DASHBOARD_BASE}/tags/${ciType}`)
      .then(res => normalizeRecords(unwrapApiData(res)))
  },

  /**
   * 获取资产类型的分组列表（用于添加分组弹窗）
   * GET /acm/api/acm/query/group/find/{ciType}
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
   * GET /svs/api/sys/dashboard/current-tenant-id
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
   * GET /acm/api/acm/dashboard/resource-type
   */
  getResourceTypes() {
    return apiService.get(`${ACM_DASHBOARD_BASE}/resource-type`).then(res => normalizeRecords(unwrapApiData(res)))
  },

  /**
   * 获取所有分组列表
   * GET /acm/api/acm/dashboard/all-group
   * @param {string} ciType - 资产类型，oplus_all 表示全部
   */
  getAllGroups(ciType = 'oplus_all') {
    const params = ciType ? { ciType } : undefined
    return apiService.get(`${ACM_DASHBOARD_BASE}/all-group`, { params }).then(res => normalizeRecords(unwrapApiData(res)))
  },

  /**
   * 获取所有标签列表
   * GET /acm/api/acm/dashboard/tags
   * @param {string} ciType - 资产类型，oplus_all 表示全部
   */
  getAllTags(ciType = 'oplus_all') {
    return apiService
      .get(`${ACM_DASHBOARD_BASE}/tags`, { params: { ciType } })
      .then(res => normalizeRecords(unwrapApiData(res)))
  },

  /**
   * 删除分组
   * POST /jao/api/jao/jobs/r08zUN/run
   * @param {string} id - 分组ID
   */
  async deleteGroup(id) {
    const res = await apiService.post(`/jao/api/jao/jobs/r08zUN/run?cacheBuster=${Date.now()}`, {
      params: { id }
    })
    return res.data
  },

  /**
   * 删除标签
   * POST /jao/api/jao/jobs/sKaBlB/run
   * @param {string} id - 标签ID
   */
  async deleteTag(id) {
    const res = await apiService.post(`/jao/api/jao/jobs/sKaBlB/run?cacheBuster=${Date.now()}`, {
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
          filter: options.filter || undefined
        }
      })
      .then(res => normalizeRecords(unwrapApiData(res)))
  },

  getOsDiff(params = {}) {
    return apiService.get(`${ACM_DASHBOARD_BASE}/os-diff`, { params }).then(res => normalizeRecords(unwrapApiData(res)))
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

  getInstanceGroupOptions() {
    return apiService
      .get(`${SYS_DASHBOARD_BASE}/tat-url-as-string-list`)
      .then(res => normalizeRecords(unwrapApiData(res)))
  },

  getAllAssetAutoConfigs() {
    return apiService
      .get(`${SYS_DASHBOARD_BASE}/all-asset-auto-config`)
      .then(res => normalizeRecords(unwrapApiData(res)))
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
    const cacheBuster = Date.now()
    return apiService.get(`/acm/api/acm/permission/team/table?cacheBuster=${cacheBuster}`).then(res => res.data)
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
   * GET /jao/api/jao/dashboard/list-operation-log
   * @param {object} params - 查询参数
   * @param {string} params.module - 模块名称 (acm)
   * @param {string} params.action - 操作类型 (all 或具体操作)
   * @param {string} params.status - 状态 (all, COMPLETED, ERROR, RUNNING)
   * @param {number} params.day - 时间范围（天数）
   */
  getOperationLogs: params => {
    return apiService
      .get(`${JAO_DASHBOARD_BASE}/list-operation-log`, { params })
      .then(res => normalizeRecords(unwrapApiData(res)))
  }
}

export default {
  dtsApi,
  overviewApi,
  assetApi,
  dataManageApi,
  modelApi,
  exceptionApi,
  automationApi,
  permissionApi,
  operationLogApi
}
