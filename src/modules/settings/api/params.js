/**
 * 参数配置 API
 */
import { apiService } from '@/core/api'

// ==================== 系统参数 API ====================

/**
 * 获取系统参数列表
 * GET /api/params
 */
export function getSysParams() {
    return apiService.get(`/api/params?cacheBuster=${Date.now()}`)
}

/**
 * 获取系统参数详情
 * GET /api/params/:id
 */
export function getSysParamById(id) {
    return apiService.get(`/api/params/${id}?cacheBuster=${Date.now()}`)
}

/**
 * 创建系统参数
 * POST /api/params
 */
export function createSysParam(param) {
    return apiService.post(`/api/params?cacheBuster=${Date.now()}`, param)
}

/**
 * 更新系统参数
 * PUT /api/params
 */
export function updateSysParam(param) {
    return apiService.put(`/api/params?cacheBuster=${Date.now()}`, param)
}

/**
 * 删除系统参数
 * DELETE /api/params/:id
 */
export function deleteSysParam(id) {
    return apiService.delete(`/api/params/${id}?cacheBuster=${Date.now()}`)
}

// ==================== 应用参数 API ====================

/**
 * 获取应用参数列表（租户参数）
 * GET /adm/api/adm/tenant-param
 */
export function getAppParams() {
    return apiService.get(`/adm/api/adm/tenant-param?cacheBuster=${Date.now()}`)
}

/**
 * 获取应用参数详情
 * GET /adm/api/adm/tenant-param/:id
 */
export function getAppParamById(id) {
    return apiService.get(`/adm/api/adm/tenant-param/${id}?cacheBuster=${Date.now()}`)
}

/**
 * 创建应用参数
 * POST /adm/api/adm/tenant-param
 */
export function createAppParam(param) {
    return apiService.post(`/adm/api/adm/tenant-param?cacheBuster=${Date.now()}`, param)
}

/**
 * 更新应用参数
 * PUT /adm/api/adm/tenant-param
 */
export function updateAppParam(param) {
    return apiService.put(`/adm/api/adm/tenant-param?cacheBuster=${Date.now()}`, param)
}

/**
 * 删除应用参数
 * DELETE /adm/api/adm/tenant-param/:id
 */
export function deleteAppParam(id) {
    return apiService.delete(`/adm/api/adm/tenant-param/${id}?cacheBuster=${Date.now()}`)
}

export default {
    // 系统参数
    getSysParams,
    getSysParamById,
    createSysParam,
    updateSysParam,
    deleteSysParam,
    // 应用参数
    getAppParams,
    getAppParamById,
    createAppParam,
    updateAppParam,
    deleteAppParam
}
