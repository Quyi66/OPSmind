/**
 * 资产管理模块 API
 */
import { apiService } from '@/core/api'

// ACM API 基础路径
const ACM_BASE = '/acm/api/acm'
const DTS_BASE = '/dts/api/dts/q/data'

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
   * POST /dts/api/dts/q/data/ACM_CONNECTION_COUNT/
   */
  getConnectionCount() {
    return dtsApi.queryData('ACM_CONNECTION_COUNT', {})
  },

  /**
   * 获取资产类型统计
   * POST /dts/api/dts/q/data/ACM_CIT_MANAGE/
   */
  getAssetTypeCount() {
    return dtsApi.queryData('ACM_CIT_MANAGE', {})
  },

  /**
   * 获取操作系统分布
   * POST /dts/api/dts/q/data/ACM_GET_OS_DISTRO/
   */
  getOsDistribution() {
    return dtsApi.queryData('ACM_GET_OS_DISTRO', {})
  },

  /**
   * 获取资产新增统计
   * POST /dts/api/dts/q/data/ACM_CI_NEW_COUNT/
   */
  getNewAssetCount() {
    return dtsApi.queryData('ACM_CI_NEW_COUNT', {})
  },

  /**
   * 获取分组内资产分布
   * POST /dts/api/dts/q/data/ACM_PARENT_GROUP_ASSET_COUNT/
   * @param {string} os - 操作系统列表，逗号分隔
   */
  getGroupAssetCount(os = 'CentOS,Windows,Anolis,Debian,RedHat,Debian') {
    return dtsApi.queryData('ACM_PARENT_GROUP_ASSET_COUNT', { os })
  }
}

/**
 * 资产信息 API
 */
export const assetApi = {
  /**
   * 获取资产类型列表
   * POST /dts/api/dts/q/data/ACM_CIT_MANAGE/
   */
  getAssetTypes() {
    return dtsApi.queryData('ACM_CIT_MANAGE', {})
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
   * POST /dts/api/dts/q/data/ACM_CI_BY_CIT/
   * @param {object} params - 查询参数
   * @param {object} options - 分页选项
   */
  getAssetList(params, options = {}) {
    return dtsApi.queryData('ACM_CI_BY_CIT', params, options)
  },

  /**
   * 获取属性值列表（用于筛选下拉）
   * POST /dts/api/dts/q/data/ACM_GET_ALL_ATTR_BY_CODE/
   * @param {string} ciType - 资产类型
   * @param {string} code - 属性代码
   */
  getAttrValues(ciType, code) {
    return dtsApi.queryData('ACM_GET_ALL_ATTR_BY_CODE', { ciType, code })
  },

  /**
   * 获取分组列表
   * GET /acm/api/acm/query/group/view/{citCode}
   * @param {string} citCode - 资产类型代码
   */
  async getGroupList(citCode) {
    const res = await apiService.get(`${ACM_BASE}/query/group/view/${citCode}?cacheBuster=${Date.now()}`)
    return res.data
  },

  /**
   * 获取标签列表
   * GET /acm/api/acm/query/tag/view/{citCode}
   * @param {string} citCode - 资产类型代码
   */
  async getTagList(citCode) {
    const res = await apiService.get(`${ACM_BASE}/query/tag/view/${citCode}?cacheBuster=${Date.now()}`)
    return res.data
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
   * 更新资产属性
   * PUT /acm/api/acm/ci/attr/{id}
   * @param {string} id - 资产ID
   * @param {object} attrs - 属性键值对
   */
  async updateAssetAttrs(id, attrs) {
    const res = await apiService.put(`${ACM_BASE}/ci/attr/${id}`, attrs)
    return res.data
  },

  /**
   * 获取资产模型属性列表
   * POST /dts/api/dts/q/data/ACM_GET_MODEL/
   * @param {string} ciType - 资产类型
   */
  getModel(ciType) {
    return dtsApi.queryData('ACM_GET_MODEL', { ciType })
  },

  /**
   * 获取资产类型的标签列表（用于添加标签弹窗）
   * POST /dts/api/dts/q/data/ACM_GET_CI_TAGS_BY_CIT/
   * @param {string} ciType - 资产类型
   */
  getCiTagsByCit(ciType) {
    return dtsApi.queryData('ACM_GET_CI_TAGS_BY_CIT', { ciType })
  },

  /**
   * 获取资产类型的分组列表（用于添加分组弹窗）
   * POST /dts/api/dts/q/data/ACM_GET_GROUP_BY_CIT/
   * @param {string} ciType - 资产类型
   */
  getGroupByCit(ciType) {
    return dtsApi.queryData('ACM_GET_GROUP_BY_CIT', { ciType })
  }
}

/**
 * 数据管理 API
 */
export const dataManageApi = {
  /**
   * 获取当前租户ID
   * POST /dts/api/dts/q/data/TENANT_GET_CURRENT_TENANT_ID/
   */
  async getCurrentTenantId() {
    const res = await dtsApi.queryData('TENANT_GET_CURRENT_TENANT_ID', null)
    return res?.records?.[0]?.currentTenantId || ''
  },

  /**
   * 获取资源类型列表
   * POST /dts/api/dts/q/data/ACM_GET_RESOURCE_TYPE/
   */
  getResourceTypes() {
    return dtsApi.queryData('ACM_GET_RESOURCE_TYPE', null)
  },

  /**
   * 获取所有分组列表
   * POST /dts/api/dts/q/data/ACM_GET_ALL_GROUP/
   * @param {string} ciType - 资产类型，oplus_all 表示全部
   */
  getAllGroups(ciType = 'oplus_all') {
    return dtsApi.queryData('ACM_GET_ALL_GROUP', { ciType, param: 'r' })
  },

  /**
   * 获取所有标签列表
   * POST /dts/api/dts/q/data/ACM_GET_CI_TAGS/
   * @param {string} ciType - 资产类型，oplus_all 表示全部
   */
  getAllTags(ciType = 'oplus_all') {
    return dtsApi.queryData('ACM_GET_CI_TAGS', { ciType })
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
  // TODO: 待实现
}

/**
 * 自动化配置 API
 */
export const automationApi = {
  // TODO: 待实现
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
    return apiService.get(`/acm/api/acm/permission/team/table?cacheBuster=${cacheBuster}`)
  },

  /**
   * 保存团队表格权限
   * @param {string} module - 模块名称 (ACM)
   * @param {Array} data - 权限数据
   */
  saveTablePermission: (module, data) => {
    return apiService.post(`/api/team/permission/table/permission/${module}`, data)
  }
}

/**
 * 操作记录 API
 */
export const operationLogApi = {
  /**
   * 获取操作日志列表
   * POST /dts/api/dts/q/data/JAO_LIST_OPERATION_LOG/
   * @param {object} params - 查询参数
   * @param {string} params.module - 模块名称 (acm)
   * @param {string} params.action - 操作类型 (all 或具体操作)
   * @param {string} params.status - 状态 (all, COMPLETED, ERROR, RUNNING)
   * @param {number} params.day - 时间范围（天数）
   */
  getOperationLogs: (params) => {
    return dtsApi.queryData('JAO_LIST_OPERATION_LOG', params)
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
