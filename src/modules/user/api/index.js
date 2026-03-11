/**
 * 用户管理模块 API
 */
import { apiService } from '@/core/api'
import {
  getSudoTemplates as getSudoTemplatesApi,
  getSudoCommandsByTemplate as getSudoCommandsByTemplateApi
} from '@/modules/sudo/api'

const DTS_BASE = '/dts/api/dts/q/data'

/**
 * 获取总览统计数据 (KPI cards)
 * API: LUPM_STATISTICS
 */
export function getOverviewStats() {
  return apiService.post(`${DTS_BASE}/LUPM_STATISTICS/?cacheBuster=${Date.now()}`, {
    params: {}
  })
}

/**
 * 获取操作审计日志统计数据 (图表)
 * API: LUPM_AUDIT_LOG_STATISTICS
 * @param {number} diffDay 天数，默认15天
 */
export function getAuditLogStats(diffDay = 15) {
  return apiService.post(`${DTS_BASE}/LUPM_AUDIT_LOG_STATISTICS/?cacheBuster=${Date.now()}`, {
    params: { diffDay: String(diffDay) }
  })
}

/**
 * 获取操作日志列表
 * API: JAO_LIST_OPERATION_LOG
 * @param {Object} params 查询参数
 */
export function getOperationLogs(params = {}, filter, page, size) {
  return apiService.post(`${DTS_BASE}/JAO_LIST_OPERATION_LOG/?cacheBuster=${Date.now()}`, {
    params,
    filter,
    page,
    size
  })
}

/**
 * 获取用户列表
 * API: LUPM_LIST_USERS
 * @param {Object} options 查询参数
 */
export function getUsers(options = {}) {
  const { page = 1, size = 15, filter = '', ...params } = options
  return apiService.post(`${DTS_BASE}/LUPM_LIST_USERS/?cacheBuster=${Date.now()}`, {
    params: {
      // host_key: params.host_key || '',
      // username: params.username || '',
      types: params.types || '0,1',
      lockStatus: params.lockStatus || '2'
    },
    page,
    size,
    filter
  })
}

/**
 * 获取用户组列表
 * API: LUPM_LIST_GROUPS
 * @param {Object} options 查询参数
 */
export function getUserGroups(options = {}) {
  const { page = 1, size = 10, filter = '', ...params } = options
  return apiService.post(`${DTS_BASE}/LUPM_LIST_GROUPS/?cacheBuster=${Date.now()}`, {
    params: {
      // host_key: params.host_key || null,
      // group_name: params.group_name || null,
      hostObject: params.hostObject || '@@(linux)'
    },
    page,
    size,
    filter
  })
}

/**
 * 获取功能配置
 */
export function getFeatureConfig() {
  return apiService.get(`/uim/api/uim/config?cacheBuster=${Date.now()}`)
}

/**
 * 保存功能配置
 * @param {Object} config 配置数据
 */
export function saveFeatureConfig(config) {
  return apiService.post(`/uim/api/uim/config/save?cacheBuster=${Date.now()}`, config)
}

/**
 * 获取sudo模板列表
 */
export function getSudoTemplates(options = {}) {
  return getSudoTemplatesApi(options)
}

/**
 * 根据模板ID获取sudo命令列表
 */
export function getSudoCommandsByTemplate(templateId, options = {}) {
  return getSudoCommandsByTemplateApi(templateId, options)
}

export default {
  getOverviewStats,
  getAuditLogStats,
  getOperationLogs,
  getUsers,
  getUserGroups,
  getFeatureConfig,
  saveFeatureConfig,
  getSudoTemplates,
  getSudoCommandsByTemplate
}
