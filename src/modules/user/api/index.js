/**
 * 用户管理模块 API
 */
import { apiService } from '@/core/api'
import {
  getSudoTemplates as getSudoTemplatesApi,
  getSudoCommandsByTemplate as getSudoCommandsByTemplateApi
} from '@/modules/sudo/api'

const DTS_BASE = '/dts/api/dts/q/data'
const SYS_DASHBOARD_BASE = '/svs/api/sys/dashboard'
const JAO_DASHBOARD_BASE = '/jao/api/jao/dashboard'

const unwrapApiData = (response) => response?.data?.data ?? response?.data

const normalizeRecords = (payload) => {
  if (Array.isArray(payload)) {
    return { records: payload, total: payload.length }
  }
  if (payload && Array.isArray(payload.records)) {
    return payload
  }
  return payload || { records: [], total: 0 }
}

const wrapRecordsResponse = (response) => ({
  ...response,
  data: normalizeRecords(unwrapApiData(response))
})

/**
 * 获取总览统计数据 (KPI cards)
 * API: LUPM_STATISTICS
 */
export function getOverviewStats() {
  return apiService.get(`${SYS_DASHBOARD_BASE}/lupm-statistics`).then(wrapRecordsResponse)
}

/**
 * 获取操作日志统计数据 (图表)
 * API: LUPM_AUDIT_LOG_STATISTICS
 * @param {number} diffDay 天数，默认15天
 */
export function getAuditLogStats(diffDay = 15) {
  return apiService
    .get(`${SYS_DASHBOARD_BASE}/lupm-audit-log-statistics`, { params: { diffDay: String(diffDay) } })
    .then(wrapRecordsResponse)
}

/**
 * 获取操作日志列表
 * API: JAO_LIST_OPERATION_LOG
 * @param {Object} params 查询参数
 */
export function getOperationLogs(params = {}, filter, page, size) {
  return apiService
    .get(`${JAO_DASHBOARD_BASE}/list-operation-log`, {
      params: {
        ...params,
        filter,
        page,
        size
      }
    })
    .then(wrapRecordsResponse)
}

/**
 * 获取用户列表
 * API: LUPM_LIST_USERS
 * @param {Object} options 查询参数
 */
export function getUsers(options = {}) {
  const { page = 1, size = 15, filter = '', ...params } = options
  return apiService
    .get(`${SYS_DASHBOARD_BASE}/lupm-users`, {
      params: {
        types: params.types || '0,1',
        lockStatus: params.lockStatus || '2',
        hostKey: params.host_key || params.hostKey || '',
        username: params.username || '',
        filter,
        page,
        size
      }
    })
    .then(wrapRecordsResponse)
}

/**
 * 获取用户组列表
 * API: LUPM_LIST_GROUPS
 * @param {Object} options 查询参数
 */
export function getUserGroups(options = {}) {
  const { page = 1, size = 10, filter = '', ...params } = options
  return apiService
    .get(`${SYS_DASHBOARD_BASE}/lupm-groups`, {
      params: {
        pluginFindHost: params.hostObject || '@@(linux)',
        hostKey: params.host_key || params.hostKey || '',
        groupName: params.group_name || params.groupName || '',
        filter,
        page,
        size
      }
    })
    .then(wrapRecordsResponse)
}

/**
 * 获取用户登录失败信息
 * API: LUPM_GET_USER_LOGIN_FAIL_MESSAGE
 */
export function getUserLoginFailMessage(id) {
  return apiService
    .get(`${SYS_DASHBOARD_BASE}/lupm-user-login-fail-message`, {
      params: { id }
    })
    .then(wrapRecordsResponse)
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
  getUserLoginFailMessage,
  getFeatureConfig,
  saveFeatureConfig,
  getSudoTemplates,
  getSudoCommandsByTemplate
}
