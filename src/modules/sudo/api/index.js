/**
 * sudo权限管理模块 API
 */
import { apiService, getJaoOperationLogs } from '@/core/api'

const JAO_DASHBOARD_BASE = '/workflow/api/workflow/dashboard'
const SYS_DASHBOARD_BASE = '/dashboard/api/sys/dashboard'

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
      total: payload.totalElements !== undefined ? payload.totalElements : (payload.total || payload.content.length)
    }
  }
  return { records: [], total: 0 }
}

const wrapRecordsResponse = (response) => ({
  ...response,
  data: normalizeRecords(unwrapApiData(response))
})

/**
 * 获取sudo权限列表
 * GET /workflow/api/workflow/universal/dc/sudo_scan_result
 * @param {Object} params 查询参数
 */
export function getSudoPermissionList(params = {}) {
  return apiService.get('/workflow/api/workflow/universal/dc/sudo_scan_result', { params })
}

/**
 * 获取Linux主机列表
 * GET /workflow/api/workflow/universal/dc/linux_hosts
 */
export function getLinuxHosts(params = {}) {
  return apiService.get('/workflow/api/workflow/universal/dc/linux_hosts', {
    params: { assetType: 'linux', ...params }
  })
}

/**
 * 搜索Linux主机
 * GET /workflow/api/workflow/universal/dc/linux_hosts
 */
export function searchLinuxHosts(keyword) {
  return apiService.get('/workflow/api/workflow/universal/dc/linux_hosts', {
    params: { assetType: 'linux', keyword }
  })
}

/**
 * 扫描主机sudo配置
 * 调用作业 iDdpHA
 * POST /workflow/api/workflow/jobs/{jobCode}/run
 */
export function scanSudoHosts(data = {}) {
  return apiService.post(`/workflow/api/workflow/jobs/iDdpHA/run?cacheBuster=${Date.now()}`, {
    params: {
      hosts: data.hosts || []
    }
  })
}

/**
 * 获取sudo申请列表
 * GET /workflow/api/workflow/universal/dc/sudo_add_result
 */
export function getSudoApplyList(params = {}) {
  return apiService.get('/workflow/api/workflow/universal/dc/sudo_add_result', { params })
}

/**
 * 获取操作记录
 * GET /workflow/api/workflow/dashboard/list-operation-log
 * @param {Object} options 包含 params(筛选参数), page, size(分页参数), keyword(关键词)
 */
export function getOperationLog(options = {}) {
  const { page = 1, size = 10, keyword = '', ...filterParams } = options
  return getJaoOperationLogs(
    {
      module: 'sudo',
      action: filterParams.action || 'all',
      status: filterParams.status || 'all',
      day: filterParams.day || 1
    },
    {
      page,
      size,
      filter: keyword ? `ata_node|message:*${keyword}*` : ''
    }
  )
}

/**
 * 添加sudo权限
 * 调用作业 xObuPC 添加sudo配置
 * POST /workflow/api/workflow/jobs/{jobCode}/run
 */
export function addSudoPermission(data = {}) {
  return apiService.post(`/workflow/api/workflow/jobs/xObuPC/run?cacheBuster=${Date.now()}`, {
    params: {
      hosts: data.hosts || [],
      users: data.users,
      valid_period: data.valid_period || 0
    }
  })
}

/**
 * 获取作业执行结果
 * GET /workflow/api/workflow/runlogs/{runId}/result
 * @param {string} runId 执行ID
 */
export function getJobResult(runId) {
  return apiService.get(`/workflow/api/workflow/runlogs/${runId}/result?cacheBuster=${Date.now()}`)
}

/**
 * 通用作业执行函数
 * POST /workflow/api/workflow/jobs/{jobCode}/run
 * @param {string} jobCode 作业代码
 * @param {Object} params 作业参数
 */
export function runJob(jobCode, params = {}) {
  return apiService.post(`/workflow/api/workflow/jobs/${jobCode}/run?cacheBuster=${Date.now()}`, {
    params
  })
}

/**
 * 获取系统参数（密码复杂度配置等）
 * GET /adm/api/adm/tenant-param
 */
export function getSystemParams() {
  return apiService.get('/adm/api/adm/tenant-param')
}

/**
 * 重置密码
 * 调用作业 YUZz3m
 * POST /workflow/api/workflow/jobs/{jobCode}/run
 */
export function resetPassword(data = {}) {
  return apiService.post(`/workflow/api/workflow/jobs/YUZz3m/run?cacheBuster=${Date.now()}`, {
    params: {
      hosts: data.hosts || [],
      user: data.user,
      password: data.password
    }
  })
}

/**
 * 保存密码复杂度配置
 * 调用作业 y8D4V1
 * POST /workflow/api/workflow/jobs/{jobCode}/run
 */
export function savePasswordComplexity(data = {}) {
  return apiService.post(`/workflow/api/workflow/jobs/y8D4V1/run?cacheBuster=${Date.now()}`, {
    params: {
      ocredit: data.ocredit,
      dcredit: data.dcredit,
      ucredit: data.ucredit,
      lcredit: data.lcredit,
      passwd_length: data.passwd_length
    }
  })
}

/**
 * 获取sudo模板列表
 * API: LUPM_LIST_SUDO_TEMPLATES
 * @param {object} options 分页和筛选参数 { page, size, keyword }
 */
export function getSudoTemplates(options = {}) {
  const { page = 1, size = 10, keyword = '' } = options
  return apiService
    .get(`${SYS_DASHBOARD_BASE}/lupm-sudo-templates`)
    .then((response) => {
      const data = normalizeRecords(unwrapApiData(response))
      let records = data.records || []
      if (keyword) {
        const loweredKeyword = keyword.toLowerCase()
        records = records.filter(item =>
          [item.name, item.description]
            .filter(Boolean)
            .some(value => String(value).toLowerCase().includes(loweredKeyword))
        )
      }
      const start = (page - 1) * size
      return {
        data: {
          records: records.slice(start, start + size),
          total: records.length
        }
      }
    })
}

/**
 * 根据模板ID获取sudo命令列表
 * API: LUPM_LIST_SUDO_COMMAND_BY_TEMPLATE_ID
 * @param {string} templateId 模板ID
 * @param {object} options 分页参数 { page, size }
 */
export function getSudoCommandsByTemplate(templateId, options = {}) {
  const { page = 1, size = 10 } = options
  return apiService
    .get(`${SYS_DASHBOARD_BASE}/lupm-sudo-command-by-template-id`, {
      params: { templateId }
    })
    .then((response) => {
      const data = normalizeRecords(unwrapApiData(response))
      const records = data.records || []
      const start = (page - 1) * size
      return {
        data: {
          records: records.slice(start, start + size),
          total: records.length
        }
      }
    })
}

/**
 * 创建sudo模板
 * Job: kJym3M
 * @param {Object} data 模板数据 {id, name, description}
 */
export function createSudoTemplate(data) {
  return apiService.post(`/workflow/api/workflow/jobs/kJym3M/run?cacheBuster=${Date.now()}`, {
    params: {
      id: data.id || null,
      name: data.name,
      description: data.description || ''
    }
  })
}

/**
 * 删除sudo模板
 * Job: yW3mhs
 * @param {string} id 模板ID
 */
export function deleteSudoTemplate(id) {
  return apiService.post(`/workflow/api/workflow/jobs/yW3mhs/run?cacheBuster=${Date.now()}`, {
    params: { id }
  })
}

/**
 * 添加sudo命令
 * Job: c06cQz
 * @param {Object} data 命令数据 {templateId, command, description}
 */
export function createSudoCommand(data) {
  return apiService.post(`/workflow/api/workflow/jobs/c06cQz/run?cacheBuster=${Date.now()}`, {
    params: {
      id: null,
      templateId: data.templateId,
      command: data.command,
      description: data.description || ''
    }
  })
}

/**
 * 删除sudo命令
 * Job: xr6PHd
 * @param {string} id 命令ID
 */
export function deleteSudoCommand(id) {
  return apiService.post(`/workflow/api/workflow/jobs/xr6PHd/run?cacheBuster=${Date.now()}`, {
    params: { id }
  })
}

export default {
  getSudoPermissionList,
  getLinuxHosts,
  searchLinuxHosts,
  scanSudoHosts,
  getSudoApplyList,
  getOperationLog,
  addSudoPermission,
  getJobResult,
  runJob,
  getSystemParams,
  resetPassword,
  savePasswordComplexity,
  getSudoTemplates,
  getSudoCommandsByTemplate,
  createSudoTemplate,
  deleteSudoTemplate,
  createSudoCommand,
  deleteSudoCommand
}
