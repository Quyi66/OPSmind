/**
 * sudo权限管理模块 API
 */
import { apiService, getJaoOperationLogs } from '@/core/api'

/**
 * 获取sudo权限列表
 * POST /dts/api/dts/q/data/GET_DC_DATA_BY_MODEL/
 * @param {Object} params 查询参数
 */
export function getSudoPermissionList(params = {}) {
  return apiService.post('/dts/api/dts/q/data/GET_DC_DATA_BY_MODEL/', {
    params: {
      model: 'sudo_scan_result',
      ...params
    }
  })
}

/**
 * 获取Linux主机列表
 * POST /dts/api/dts/q/data/GET_DC_DATA_BY_MODEL/
 */
export function getLinuxHosts(params = {}) {
  return apiService.post('/dts/api/dts/q/data/GET_DC_DATA_BY_MODEL/', {
    params: {
      model: 'linux_hosts',
      assetType: 'linux',
      ...params
    }
  })
}

/**
 * 搜索Linux主机
 * POST /dts/api/dts/q/data/GET_DC_DATA_BY_MODEL/
 */
export function searchLinuxHosts(keyword) {
  return apiService.post('/dts/api/dts/q/data/GET_DC_DATA_BY_MODEL/', {
    params: {
      model: 'linux_hosts',
      assetType: 'linux',
      keyword
    }
  })
}

/**
 * 扫描主机sudo配置
 * 调用作业 iDdpHA
 * POST /jao/api/jao/jobs/{jobCode}/run
 */
export function scanSudoHosts(data = {}) {
  return apiService.post(`/jao/api/jao/jobs/iDdpHA/run?cacheBuster=${Date.now()}`, {
    params: {
      hosts: data.hosts || []
    }
  })
}

/**
 * 获取sudo申请列表
 * POST /dts/api/dts/q/data/GET_DC_DATA_BY_MODEL/
 */
export function getSudoApplyList(params = {}) {
  return apiService.post('/dts/api/dts/q/data/GET_DC_DATA_BY_MODEL/', {
    params: {
      model: 'sudo_add_result',
      ...params
    }
  })
}

/**
 * 获取操作记录
 * GET /jao/api/jao/dashboard/list-operation-log
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
 * POST /jao/api/jao/jobs/{jobCode}/run
 */
export function addSudoPermission(data = {}) {
  return apiService.post(`/jao/api/jao/jobs/xObuPC/run?cacheBuster=${Date.now()}`, {
    params: {
      hosts: data.hosts || [],
      users: data.users,
      valid_period: data.valid_period || 0
    }
  })
}

/**
 * 获取作业执行结果
 * GET /jao/api/jao/runlogs/{runId}/result
 * @param {string} runId 执行ID
 */
export function getJobResult(runId) {
  return apiService.get(`/jao/api/jao/runlogs/${runId}/result?cacheBuster=${Date.now()}`)
}

/**
 * 通用作业执行函数
 * POST /jao/api/jao/jobs/{jobCode}/run
 * @param {string} jobCode 作业代码
 * @param {Object} params 作业参数
 */
export function runJob(jobCode, params = {}) {
  return apiService.post(`/jao/api/jao/jobs/${jobCode}/run?cacheBuster=${Date.now()}`, {
    params
  })
}

/**
 * 获取系统参数（密码复杂度配置等）
 * POST /dts/api/dts/q/data/SYS_PARAMS/
 */
export function getSystemParams() {
  return apiService.post(`/dts/api/dts/q/data/SYS_PARAMS/?cacheBuster=${Date.now()}`, {
    params: null
  })
}

/**
 * 重置密码
 * 调用作业 YUZz3m
 * POST /jao/api/jao/jobs/{jobCode}/run
 */
export function resetPassword(data = {}) {
  return apiService.post(`/jao/api/jao/jobs/YUZz3m/run?cacheBuster=${Date.now()}`, {
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
 * POST /jao/api/jao/jobs/{jobCode}/run
 */
export function savePasswordComplexity(data = {}) {
  return apiService.post(`/jao/api/jao/jobs/y8D4V1/run?cacheBuster=${Date.now()}`, {
    params: {
      ocredit: data.ocredit,
      dcredit: data.dcredit,
      ucredit: data.ucredit,
      lcredit: data.lcredit,
      passwd_length: data.passwd_length
    }
  })
}

const DTS_BASE = '/dts/api/dts/q/data'

/**
 * 获取sudo模板列表
 * API: LUPM_LIST_SUDO_TEMPLATES
 * @param {object} options 分页和筛选参数 { page, size, keyword }
 */
export function getSudoTemplates(options = {}) {
  const { page = 1, size = 10, keyword = '' } = options
  return apiService.post(`${DTS_BASE}/LUPM_LIST_SUDO_TEMPLATES/?cacheBuster=${Date.now()}`, {
    params: {},
    page,
    size,
    orderBy: 'created_at desc',
    filter: keyword ? `name|description:*${keyword}*` : ''
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
  return apiService.post(
    `${DTS_BASE}/LUPM_LIST_SUDO_COMMAND_BY_TEMPLATE_ID/?cacheBuster=${Date.now()}`,
    {
      params: { templateId },
      page,
      size
    }
  )
}

/**
 * 创建sudo模板
 * Job: kJym3M
 * @param {Object} data 模板数据 {id, name, description}
 */
export function createSudoTemplate(data) {
  return apiService.post(`/jao/api/jao/jobs/kJym3M/run?cacheBuster=${Date.now()}`, {
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
  return apiService.post(`/jao/api/jao/jobs/yW3mhs/run?cacheBuster=${Date.now()}`, {
    params: { id }
  })
}

/**
 * 添加sudo命令
 * Job: c06cQz
 * @param {Object} data 命令数据 {templateId, command, description}
 */
export function createSudoCommand(data) {
  return apiService.post(`/jao/api/jao/jobs/c06cQz/run?cacheBuster=${Date.now()}`, {
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
  return apiService.post(`/jao/api/jao/jobs/xr6PHd/run?cacheBuster=${Date.now()}`, {
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
