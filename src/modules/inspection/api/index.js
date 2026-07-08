/**
 * 系统巡检模块 API
 */
import { apiService } from '@/core/api'

// CAC API 基础路径
const CAC_BASE = '/audit/api/audit'


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
 * DTS 数据查询 API
 */
export const dtsApi = {
  /**
   * 获取CAC结构图KPI数据
   * CAC_STRUCTURAL_KPI → GET /cac/api/cac/v2/custom-kpi/check-item/{jobId}
   */
  getStructuralKpi(jobId) {
    return apiService.get(`${CAC_BASE}/v2/custom-kpi/check-item/${jobId}`)
  },



  /**
   * 获取统计数据
   * CAC_GET_STATISTICS → GET /cac/api/cac/v2/statistics/check-item/{jobId}
   */
  getStatistics(jobId) {
    return apiService.get(`${CAC_BASE}/v2/statistics/check-item/${jobId}`)
  },

  getStructuralKpiHostAll(jobId) {
    return apiService.get(`${CAC_BASE}/dashboard/structural-kpi-host-all`, {
      params: { jobId }
    }).then(wrapRecordsResponse)
  },

  getStructuralKpiHostOk(jobId) {
    return apiService.get(`${CAC_BASE}/dashboard/structural-kpi-host-ok`, {
      params: { jobId }
    }).then(wrapRecordsResponse)
  },

  getStructuralKpiHostFailed(jobId) {
    return apiService.get(`${CAC_BASE}/dashboard/structural-kpi-host-failed`, {
      params: { jobId }
    }).then(wrapRecordsResponse)
  },

  getStructuralKpiHostCheck(jobId) {
    return apiService.get(`${CAC_BASE}/dashboard/structural-kpi-host-check`, {
      params: { jobId }
    }).then(wrapRecordsResponse)
  },

  getStructuralKpiItemAll(jobId) {
    return apiService.get(`${CAC_BASE}/dashboard/structural-kpi-item-all`, {
      params: { jobId }
    }).then(wrapRecordsResponse)
  },

  /**
   * 获取主机检查项统计
   * 对应 API: GET /cac/api/cac/dashboard/check-item-machine
   */
  getCheckItemMachine(jobId, page = 1, size = 10, filter = '') {
    return apiService.get(`${CAC_BASE}/dashboard/check-item-machine`, {
      params: {
        jobId,
        page,
        size,
        filter: filter || undefined
      }
    }).then(wrapRecordsResponse)
  },

  getCheckItem(jobId, page = 1, size = 10, filter = '') {
    return apiService.get(`${CAC_BASE}/dashboard/check-item`, {
      params: {
        jobId,
        page,
        size,
        filter: filter || undefined
      }
    }).then(wrapRecordsResponse)
  },

  getMachineInfo(hostId) {
    return apiService.get(`${CAC_BASE}/dashboard/machine-info`, {
      params: { hostId }
    }).then(wrapRecordsResponse)
  },

  getCheckItemMachineDetail(params = {}, options = {}) {
    return apiService.get(`${CAC_BASE}/dashboard/check-item-machine-detail`, {
      params: {
        jobId: params.job_id || params.jobId,
        hostKey: params.host_key || params.hostKey,
        status: params.status || 'all',
        page: options.page || 1,
        size: options.size || 100
      }
    }).then(wrapRecordsResponse)
  },

  getCheckItemByStatus(jobId, status) {
    return apiService.get(`${CAC_BASE}/dashboard/check-item-by-status`, {
      params: { jobId, status }
    }).then(wrapRecordsResponse)
  },

  getCheckItemInfo(id) {
    return apiService.get(`${CAC_BASE}/dashboard/check-item-info`, {
      params: { id }
    }).then(wrapRecordsResponse)
  },

  getCheckItemDetail(params = {}, options = {}) {
    return apiService.get(`${CAC_BASE}/dashboard/check-item-detail`, {
      params: {
        jobId: params.job_id || params.jobId,
        name: params.name,
        status: params.status || 'all',
        page: options.page || 1,
        size: options.size || 100
      }
    }).then(wrapRecordsResponse)
  },

  getBlackList(module = 'audit') {
    return apiService.get(`${CAC_BASE}/dashboard/black-list`, {
      params: { module }
    }).then(wrapRecordsResponse)
  }
}

/**
 * 巡检模板 API
 */
export const templateApi = {
  /**
   * 获取模板列表（方格视图）
   * 对应 API: GET /api/cac/v2/templates/square
   */
  getSquareTemplates() {
    return apiService.get(`${CAC_BASE}/v2/templates/square`)
  },

  /**
   * 获取模板列表
   * 对应 API: GET /api/cac/v2/templates
   */
  getTemplates() {
    return apiService.get(`${CAC_BASE}/v2/templates`)
  },

  /**
   * 获取模板详情
   * 对应 API: GET /api/cac/v2/templates/{id}
   */
  getTemplateById(id) {
    return apiService.get(`${CAC_BASE}/v2/templates/${id}`)
  },

  /**
   * 创建模板
   * 对应 API: POST /api/cac/v2/templates
   */
  createTemplate(template) {
    return apiService.post(`${CAC_BASE}/v2/templates`, template)
  },

  /**
   * 更新模板（创建和更新用同一个接口）
   * 对应 API: POST /api/cac/v2/templates
   */
  updateTemplate(id, template) {
    return apiService.post(`${CAC_BASE}/v2/templates`, template)
  },

  /**
   * 删除模板
   * 对应 API: DELETE /api/cac/v2/templates/{id}
   */
  deleteTemplate(id) {
    return apiService.delete(`${CAC_BASE}/v2/templates/${id}`)
  },

  /**
   * 获取团队配置
   */
  getTeamConfig(templateId) {
    return apiService.get(`${CAC_BASE}/v2/get/audit-team-config/${templateId}`)
  },

  /**
   * 保存团队配置
   */
  saveTeamConfig(data) {
    return apiService.post(`${CAC_BASE}/v2/save/teams-info`, data)
  }
}

/**
 * 巡检任务 API
 */
export const jobApi = {
  /**
   * 获取任务详情
   * 对应 API: GET /api/cac/v2/jobs/{jobId}
   */
  getJob(jobId) {
    return apiService.get(`${CAC_BASE}/v2/jobs/${jobId}`)
  },

  /**
   * 分页获取任务列表
   * 对应 API: POST /api/cac/v2/jobs/page/{templateId}
   * @param {string} templateId - 模板ID，如果为空则传 'all'
   * @param {URLSearchParams} formData - DataTables 格式的表单数据
   * @param {object} query - URL查询参数（如 cacheBuster）
   */
  getJobsPage(templateId, formData, query = {}) {
    const id = templateId || 'all'
    // 确保 formData 转换为字符串
    const data = formData instanceof URLSearchParams ? formData.toString() : formData
    return apiService.post(`${CAC_BASE}/v2/jobs/page/${id}`, data, {
      params: query,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
  },

  /**
   * 创建任务
   * 对应 API: POST /api/cac/v2/jobs
   */
  createJob(job) {
    return apiService.post(`${CAC_BASE}/v2/jobs`, job)
  },

  /**
   * 执行巡检任务
   * 对应 API: POST /api/cac/v2/jobs/run
   */
  runJob(job) {
    return apiService.post(`${CAC_BASE}/v2/jobs/run`, job)
  },

  /**
   * 删除任务
   * 对应 API: DELETE /api/cac/v2/jobs/{id}
   */
  deleteJob(id) {
    return apiService.delete(`${CAC_BASE}/v2/jobs/${id}`)
  },

  /**
   * 获取任务结果
   * 对应 API: GET /api/cac/v2/jobs/result-v2/{id}
   */
  getJobResult(id) {
    return apiService.get(`${CAC_BASE}/v2/jobs/result-v2/${id}`)
  },

  /**
   * 获取指定主机的巡检项详情
   * 对应 API: GET /api/cac/v2/jobs/result-v2/{jobId},{templateId}
   * @param {string} jobId - 任务ID
   * @param {string} templateId - 模板ID
   */
  getHostCheckItems(jobId, templateId) {
    return apiService.get(`${CAC_BASE}/v2/jobs/result-v2/${jobId},${templateId}`)
  },

  /**
   * 获取结构图
   */
  getStructuralDiagram(id) {
    return apiService.get(`${CAC_BASE}/v2/jobs/structural-diagram/${id}`)
  },

  /**
   * 获取结构图一级业务详情
   * 对应 API: POST /api/cac/v2/jobs/structural-diagram/primary-info
   */
  getStructuralDiagramPrimaryInfo(data) {
    return apiService.post(`${CAC_BASE}/v2/jobs/structural-diagram/primary-info`, data)
  },

  /**
   * 获取结构图主机/检查项详情
   * 对应 API: POST /api/cac/v2/jobs/structural-diagram/host-item-info
   */
  getStructuralDiagramHostItemInfo(data) {
    return apiService.post(`${CAC_BASE}/v2/jobs/structural-diagram/host-item-info`, data)
  },

  /**
   * 添加主机到白名单
   * 对应 API: POST /workflow/api/workflow/jobs/DbnJiF/run
   * @param {string[]} hostIds - 主机ID数组
   */
  addHostToWhitelist(hostIds) {
    return apiService.post(`/workflow/api/workflow/jobs/DbnJiF/run?cacheBuster=${Date.now()}`, {
      params: {
        module: 'audit',
        blackHost: hostIds
      }
    })
  },

  /**
   * 从白名单移除主机
   * 对应 API: POST /workflow/api/workflow/jobs/3x6mlL/run
   * @param {string[]} hostIds - 主机ID数组
   */
  removeHostFromWhitelist(hostIds) {
    return apiService.post(`/workflow/api/workflow/jobs/3x6mlL/run?cacheBuster=${Date.now()}`, {
      params: {
        module: 'audit',
        blackHost: hostIds
      }
    })
  }
}

/**
 * 巡检结果 API
 */
export const resultApi = {
  /**
   * 根据任务ID获取结果
   * 对应 API: GET /api/cac/v2/check-items/map/{jobId}
   */
  getResultsByJobId(jobId, start = 0, length = 100) {
    return apiService.get(`${CAC_BASE}/v2/check-items/map/${jobId}?start=${start}&length=${length}`)
  },

  /**
   * 查询输出详情
   * 对应 API: GET /api/cac/v2/check-items/{id}
   */
  queryOutput(id) {
    return apiService.get(`${CAC_BASE}/v2/check-items/${id}`)
  }
}

/**
 * 巡检规则 API
 */
export const ruleApi = {
  /**
   * 获取所有规则
   */
  getAllRules() {
    return apiService.get(`${CAC_BASE}/audit/rules`)
  },

  /**
   * 根据ID获取规则
   */
  getRuleById(id) {
    return apiService.get(`${CAC_BASE}/audit/rules/${id}`)
  },

  /**
   * 根据IDs批量获取规则
   */
  getRuleByIds(ruleIds) {
    return apiService.post(`${CAC_BASE}/audit/rules/ruleIds`, ruleIds)
  },

  /**
   * 创建规则
   */
  createRule(rule) {
    return apiService.post(`${CAC_BASE}/audit/rules`, rule)
  },

  /**
   * 更新规则
   */
  updateRule(rule) {
    return apiService.put(`${CAC_BASE}/audit/rules`, rule)
  },

  /**
   * 删除规则
   */
  deleteRule(id) {
    return apiService.delete(`${CAC_BASE}/audit/rules/${id}`)
  }
}

/**
 * 巡检脚本 API
 */
export const scriptApi = {
  /**
   * 创建脚本
   */
  createScript(scripts) {
    return apiService.post(`${CAC_BASE}/audit/scripts`, scripts)
  },

  /**
   * 更新脚本
   */
  updateScript(script) {
    return apiService.put(`${CAC_BASE}/audit/scripts`, script)
  },

  /**
   * 删除脚本
   */
  deleteScript(id) {
    return apiService.delete(`${CAC_BASE}/audit/scripts/${id}`)
  },

  /**
   * 根据IDs获取脚本
   */
  getScriptByIds(scriptIds) {
    return apiService.post(`${CAC_BASE}/audit/scripts/scriptIds`, scriptIds)
  },

  /**
   * 检查脚本名称
   */
  checkScriptName(fileName) {
    return apiService.get(`${CAC_BASE}/audit/scripts/checkScriptName/${fileName}`)
  }
}

/**
 * 白名单 API
 */
export const whitelistApi = {
  /**
   * 获取白名单
   */
  getWhitelist(templateId) {
    return apiService.get(`${CAC_BASE}/v2/check-white-list/all/${templateId}`)
  },

  /**
   * 删除白名单
   */
  deleteWhitelist(id) {
    return apiService.delete(`${CAC_BASE}/v2/check-white-list/delete/${id}`)
  },

  /**
   * 保存白名单
   */
  saveWhitelist(data) {
    return apiService.post(`${CAC_BASE}/v2/check-white-list/save`, data)
  },

  /**
   * 移除黑名单主机（从白名单中移除）
   * 对应 API: POST /workflow/api/workflow/jobs/3x6mlL/run
   * @param {Array<string>} hostIds - 主机ID数组
   */
  removeBlackHost(hostIds) {
    return apiService.post(`/workflow/api/workflow/jobs/3x6mlL/run?cacheBuster=${Date.now()}`, {
      params: {
        module: 'audit',
        blackHost: hostIds
      }
    })
  },

  /**
   * 添加黑名单主机（添加到白名单）
   * 对应 API: POST /workflow/api/workflow/jobs/DbnJiF/run
   * @param {Array<string>} hostIds - 主机ID数组
   */
  addBlackHost(hostIds) {
    return apiService.post(`/workflow/api/workflow/jobs/DbnJiF/run?cacheBuster=${Date.now()}`, {
      params: {
        module: 'audit',
        blackHost: hostIds
      }
    })
  }
}

/**
 * 配置参数 API
 */
export const paramApi = {
  /**
   * 获取CAC模块参数
   * 对应 API: GET /api/params/query?domain=cac
   */
  getParams() {
    return apiService.get('/api/params/query', {
      params: { domain: 'cac' }
    })
  },

  /**
   * 根据域和名称获取单个参数
   * 对应 API: GET /api/params/{domain}/{name}
   */
  getParamByName(domain, name) {
    return apiService.get(`/api/params/${domain}/${name}`)
  }
}

/**
 * 资产模型配置 API
 */
export const assetModelApi = {
  /**
   * 获取所有资产模型类型
   * 对应 API: POST /api/cac/v2/get/asssets-model-types
   */
  getAssetModelTypes() {
    return apiService.post(`${CAC_BASE}/v2/get/asssets-model-types`)
  },

  /**
   * 获取已选择的资产模型（用于回显）
   * 对应 API: POST /api/cac/v2/get/assets-model-data
   */
  getSelectedAssetModels() {
    return apiService.post(`${CAC_BASE}/v2/get/assets-model-data`)
  },

  /**
   * 保存资产模型选择
   * 对应 API: POST /api/cac/v2/save/assets-model-data
   */
  saveAssetModel(data) {
    return apiService.post(`${CAC_BASE}/v2/save/assets-model-data`, data)
  }
}

/**
 * 邮件配置 API
 */
export const emailConfigApi = {
  /**
   * 获取邮件开关状态
   * 对应 API: GET /api/email-config/audit-on-off
   */
  getEmailSwitch() {
    return apiService.get('/api/email-config/audit-on-off')
  },

  /**
   * 保存邮件开关状态
   * 对应 API: POST /api/email-config/audit-on-off
   */
  saveEmailSwitch(data) {
    return apiService.post('/api/email-config/audit-on-off', data)
  },

  /**
   * 获取模板列表（用于邮件配置）
   * 对应 API: GET /cac/api/cac/dashboard/query-template
   * @param {string} tenantId - 租户ID
   * @param {string} filter - 过滤条件，格式如 "template_name:*keyword*"
   */
  getTemplates(tenantId, filter = '') {
    return apiService.get(`${CAC_BASE}/dashboard/query-template`).then((response) => {
      const payload = response?.data?.data ?? response?.data ?? []
      let records = Array.isArray(payload) ? payload : (payload?.records || [])
      if (filter) {
        const keyword = String(filter).match(/\*(.*)\*/)?.[1]?.toLowerCase() || ''
        if (keyword) {
          records = records.filter(item =>
            String(item.template_name || item.name || '').toLowerCase().includes(keyword)
          )
        }
      }
      return { data: { records, total: records.length } }
    })
  },

  /**
   * 获取收件人列表
   * 对应 API: GET /workflow/api/workflow/dc/data?code=CAC_RECIPIENT_LIST
   */
  getRecipientList() {
    return apiService.get('/workflow/api/workflow/dc/data', {
      params: { code: 'CAC_RECIPIENT_LIST' }
    })
  },

  /**
   * 保存收件人（新增/编辑）
   * 对应 job code: N4TqAN, callId: CAC_RECIPIENT_LIST_ADD
   */
  saveRecipient(data) {
    return apiService.post(`/workflow/api/workflow/jobs/N4TqAN/run?cacheBuster=${Date.now()}`, {
      callId: 'CAC_RECIPIENT_LIST_ADD',
      params: {
        id: data.id || null,
        modelCode: 'CAC_RECIPIENT_LIST',
        module: 'CAC',
        modelJson: JSON.stringify({
          name: data.name,
          email: data.email,
          remarks: data.remarks || '',
          status: data.status,
          template_id: data.templateId
        })
      }
    })
  },

  /**
   * 删除收件人
   * 对应 job code: eNBw8A
   */
  deleteRecipient(id) {
    return apiService.post(`/workflow/api/workflow/jobs/eNBw8A/run?cacheBuster=${Date.now()}`, {
      params: { id }
    })
  },

  /**
   * 获取自定义邮件内容列表
   * 对应 API: GET /workflow/api/workflow/dc/data?code=CAC_EMAIL_CUSTOM
   */
  getEmailCustomList() {
    return apiService.get('/workflow/api/workflow/dc/data', {
      params: { code: 'CAC_EMAIL_CUSTOM' }
    })
  },

  /**
   * 保存自定义邮件内容
   * 对应 job code: N4TqAN, callId: CAC_EMAIL_CUSTOM_ADD
   */
  saveEmailCustom(data) {
    return apiService.post(`/workflow/api/workflow/jobs/N4TqAN/run?cacheBuster=${Date.now()}`, {
      callId: 'CAC_EMAIL_CUSTOM_ADD',
      params: {
        id: data.id || null,
        modelCode: 'CAC_EMAIL_CUSTOM',
        module: 'CAC',
        modelJson: JSON.stringify({
          title: data.title,
          content: data.content,
          state: data.state,
          template_id: data.templateId
        })
      }
    })
  }
}

export default {
  dtsApi,
  templateApi,
  jobApi,
  resultApi,
  ruleApi,
  scriptApi,
  whitelistApi,
  paramApi,
  assetModelApi,
  emailConfigApi
}
