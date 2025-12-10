import { apiService } from '@/core/api'

/**
 * 获取流程列表
 * GET /flow/api/flow/process/list
 */
export function getFlowList() {
    return apiService.get(`/flow/api/flow/process/list?cacheBuster=${Date.now()}`)
}

/**
 * 获取流程基本信息
 * GET /flow/api/flow/process?id=xxx
 * @param {string} id 流程ID
 */
export function getFlowInfo(id) {
    return apiService.get('/flow/api/flow/process', {
        params: { id, cacheBuster: Date.now() }
    })
}

/**
 * 获取流程详情（包含BPMN XML）
 * GET /flow/api/flow/process/detail?processId=xxx&detailId=xxx
 * @param {string} processId 流程ID
 * @param {string} detailId 流程详情ID (可选，不传则使用当前版本)
 */
export function getFlowDetail(processId, detailId = '') {
    const params = { processId, cacheBuster: Date.now() }
    if (detailId) {
        params.detailId = detailId
    }
    return apiService.get('/flow/api/flow/process/detail', { params })
}

/**
 * 获取流程历史版本
 * GET /flow/api/flow/process/version?processId=xxx
 * @param {string} processId 流程ID
 */
export function getFlowVersionHistory(processId) {
    return apiService.get('/flow/api/flow/process/version', {
        params: { processId, cacheBuster: Date.now() }
    })
}

/**
 * 切换流程版本
 * PUT /flow/api/flow/process/version
 * @param {Object} data 包含 processId 和 detailId
 */
export function changeFlowVersion(data) {
    return apiService.put(`/flow/api/flow/process/version?cacheBuster=${Date.now()}`, data)
}

/**
 * 获取流程参数
 * GET /flow/api/flow/process/params?processId=xxx
 * @param {string} processId 流程ID
 */
export function getFlowParams(processId) {
    return apiService.get('/flow/api/flow/process/params', {
        params: { processId, cacheBuster: Date.now() }
    })
}

/**
 * 执行流程
 * POST /flow/api/flow/process/run
 * @param {Object} data 执行参数
 */
export function runFlow(data) {
    return apiService.post('/flow/api/flow/process/run', data)
}

/**
 * 获取执行记录列表
 * GET /flow/api/flow/execution/list?processId=xxx
 * @param {Object} params 包含 processId
 */
export function getExecutionList(params = {}) {
    return apiService.get('/flow/api/flow/execution/list', {
        params: {
            ...params,
            cacheBuster: Date.now()
        }
    })
}

/**
 * 删除执行记录
 * DELETE /flow/api/flow/execution/:id
 */
export function deleteExecution(id) {
    return apiService.delete(`/flow/api/flow/execution/${id}`)
}

/**
 * 批量删除执行记录
 * POST /flow/api/flow/execution/batch-delete
 */
export function batchDeleteExecution(ids) {
    return apiService.post('/flow/api/flow/execution/batch-delete', { ids })
}

/**
 * 终止流程所有运行实例
 * POST /flow/api/flow/process/:id/terminate
 */
export function terminateProcess(processId) {
    return apiService.post(`/flow/api/flow/process/${processId}/terminate`)
}

/**
 * 终止所有流程
 * POST /flow/api/flow/process/terminate-all
 */
export function terminateAllProcesses() {
    return apiService.post('/flow/api/flow/process/terminate-all')
}

/**
 * 创建流程
 */
export function createFlow(data) {
    return apiService.post('/flow/api/flow/process/create', data)
}

/**
 * 保存流程设计（BPMN XML）
 * PUT /flow/api/flow/process/detail
 * @param {Object} data 包含 id, processXml, remarks, copyScenes
 */
export function saveFlowDesign(data) {
    return apiService.put(`/flow/api/flow/process/detail?cacheBuster=${Date.now()}`, data)
}

/**
 * 更新流程基本信息
 * PUT /flow/api/flow/process
 * @param {Object} data 完整的流程对象
 */
export function updateFlow(data) {
    return apiService.put(`/flow/api/flow/process?cacheBuster=${Date.now()}`, data)
}

/**
 * 删除流程
 * @param {string} id 流程ID
 */
export function deleteFlow(id) {
    return apiService.delete(`/flow/api/flow/process/${id}`)
}

/**
 * 批量删除流程
 * @param {string[]} ids 流程ID数组
 */
export function batchDeleteFlow(ids) {
    return apiService.post('/flow/api/flow/process/batch-delete', { ids })
}

/**
 * 执行流程
 * @param {string} id 流程ID
 */
export function executeFlow(id, params = {}) {
    return apiService.post(`/flow/api/flow/process/${id}/execute`, params)
}

/**
 * 克隆流程
 * POST /flow/api/flow/process/clone
 * @param {Object} data 完整的流程对象 + copyScenes
 */
export function cloneFlow(data) {
    return apiService.post(`/flow/api/flow/process/clone?cacheBuster=${Date.now()}`, data)
}

export default {
    getFlowList,
    getFlowInfo,
    getFlowDetail,
    getFlowVersionHistory,
    changeFlowVersion,
    getFlowParams,
    getExecutionList,
    createFlow,
    updateFlow,
    saveFlowDesign,
    runFlow,
    deleteFlow,
    batchDeleteFlow,
    executeFlow,
    cloneFlow
}
