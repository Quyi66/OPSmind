/**
 * 系统巡检模块 API
 */
import { apiService } from '@/core/api'

// CAC API 基础路径
const CAC_BASE = '/cac/api/cac'
const DTS_BASE = '/dts/api/dts/q/data'

/**
 * DTS 数据查询 API
 */
export const dtsApi = {
  /**
   * 获取CAC结构图KPI数据
   * 对应 API: POST /dts/api/dts/q/data/CAC_STRUCTURAL_KPI/
   */
  getStructuralKpi(jobId) {
    return apiService.post(`${DTS_BASE}/CAC_STRUCTURAL_KPI/`, {
      params: { jobId }
    })
  },

  /**
   * 通用数据查询（支持分页）
   * 对应 API: POST /dts/api/dts/q/data/{datasetId}/
   * @param {string} datasetId - 数据集ID
   * @param {object} params - 查询参数
   * @param {object} options - 分页等选项 { size, page, filter }
   */
  queryData(datasetId, params = {}, options = {}) {
    const body = { params }
    if (options.size) body.size = options.size
    if (options.page) body.page = options.page
    if (options.filter !== undefined) body.filter = options.filter
    return apiService.post(`${DTS_BASE}/${datasetId}/`, body)
  },

  /**
   * 获取统计数据
   * 对应 API: POST /dts/api/dts/q/data/CAC_GET_STATISTICS/
   */
  getStatistics(jobId) {
    return apiService.post(`${DTS_BASE}/CAC_GET_STATISTICS/`, {
      params: { jobId }
    })
  },

  /**
   * 获取主机检查项统计
   * 对应 API: POST /dts/api/dts/q/data/CAC_CHECK_ITEM_MACHINE/
   */
  getCheckItemMachine(jobId, page = 1, size = 10, filter = '') {
    return apiService.post(`${DTS_BASE}/CAC_CHECK_ITEM_MACHINE/`, {
      params: { job_id: jobId },
      size,
      page,
      filter
    })
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
    return apiService.get(`${CAC_BASE}/v2/get/cac-team-config/${templateId}`)
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
    return apiService.get(`${CAC_BASE}/v2/jobs/result-v2/${jobId},${templateId}?cacheBuster=${Date.now()}`)
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
   * 对应 API: POST /jao/api/jao/jobs/DbnJiF/run
   * @param {string[]} hostIds - 主机ID数组
   */
  addHostToWhitelist(hostIds) {
    return apiService.post(`/jao/api/jao/jobs/DbnJiF/run?cacheBuster=${Date.now()}`, {
      params: {
        module: 'cac',
        blackHost: hostIds
      }
    })
  },

  /**
   * 从白名单移除主机
   * 对应 API: POST /jao/api/jao/jobs/3x6mlL/run
   * @param {string[]} hostIds - 主机ID数组
   */
  removeHostFromWhitelist(hostIds) {
    return apiService.post(`/jao/api/jao/jobs/3x6mlL/run?cacheBuster=${Date.now()}`, {
      params: {
        module: 'cac',
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
   * 对应 API: POST /jao/api/jao/jobs/3x6mlL/run
   * @param {Array<string>} hostIds - 主机ID数组
   */
  removeBlackHost(hostIds) {
    return apiService.post(`/jao/api/jao/jobs/3x6mlL/run?cacheBuster=${Date.now()}`, {
      params: {
        module: 'cac',
        blackHost: hostIds
      }
    })
  },

  /**
   * 添加黑名单主机（添加到白名单）
   * 对应 API: POST /jao/api/jao/jobs/DbnJiF/run
   * @param {Array<string>} hostIds - 主机ID数组
   */
  addBlackHost(hostIds) {
    return apiService.post(`/jao/api/jao/jobs/DbnJiF/run?cacheBuster=${Date.now()}`, {
      params: {
        module: 'cac',
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
   * 对应 API: GET /api/email-config/cac-on-off
   */
  getEmailSwitch() {
    return apiService.get('/api/email-config/cac-on-off')
  },

  /**
   * 保存邮件开关状态
   * 对应 API: POST /api/email-config/cac-on-off
   */
  saveEmailSwitch(data) {
    return apiService.post('/api/email-config/cac-on-off', data)
  },

  /**
   * 获取模板列表（用于邮件配置）
   * 对应 API: POST /dts/api/dts/q/data/CAC_QUERY_TEMPLATE/
   * @param {string} tenantId - 租户ID
   * @param {string} filter - 过滤条件，格式如 "template_name:*keyword*"
   */
  getTemplates(tenantId, filter = '') {
    const body = {
      params: { tenantId }
    }
    if (filter) {
      body.filter = filter
    }
    return apiService.post(`${DTS_BASE}/CAC_QUERY_TEMPLATE/`, body)
  },

  /**
   * 获取收件人列表
   * 对应 API: GET /jao/api/jao/dc/data?code=CAC_RECIPIENT_LIST
   */
  getRecipientList() {
    return apiService.get('/jao/api/jao/dc/data', {
      params: { code: 'CAC_RECIPIENT_LIST' }
    })
  },

  /**
   * 保存收件人（新增/编辑）
   * 对应 job code: N4TqAN, callId: CAC_RECIPIENT_LIST_ADD
   */
  saveRecipient(data) {
    return apiService.post(`/jao/api/jao/jobs/N4TqAN/run?cacheBuster=${Date.now()}`, {
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
    return apiService.post(`/jao/api/jao/jobs/eNBw8A/run?cacheBuster=${Date.now()}`, {
      params: { id }
    })
  },

  /**
   * 获取自定义邮件内容列表
   * 对应 API: GET /jao/api/jao/dc/data?code=CAC_EMAIL_CUSTOM
   */
  getEmailCustomList() {
    return apiService.get('/jao/api/jao/dc/data', {
      params: { code: 'CAC_EMAIL_CUSTOM' }
    })
  },

  /**
   * 保存自定义邮件内容
   * 对应 job code: N4TqAN, callId: CAC_EMAIL_CUSTOM_ADD
   */
  saveEmailCustom(data) {
    return apiService.post(`/jao/api/jao/jobs/N4TqAN/run?cacheBuster=${Date.now()}`, {
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
