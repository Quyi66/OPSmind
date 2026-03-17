/**
 * 密码管理模块 API
 */
import { apiService } from '@/core/api'

/**
 * 获取临时密码申请列表
 * POST /dts/api/dts/q/data/PMS2_GET_APPLICATION_FORM_BY_ROLE/
 */
export function getApplicationList(params = {}) {
    return apiService.post(`/dts/api/dts/q/data/PMS2_GET_APPLICATION_FORM_BY_ROLE/?cacheBuster=${Date.now()}`, {
        params: {
            status: params.status || 'all',
            applicantLogin: params.applicantLogin || '',
            ...params
        }
    })
}

/**
 * 获取默认用户名
 * POST /dts/api/dts/q/data/PMS_GET_DEFAULT_USERNAME/
 */
export function getDefaultUsername() {
    return apiService.post(`/dts/api/dts/q/data/PMS_GET_DEFAULT_USERNAME/?cacheBuster=${Date.now()}`, {
        params: null
    })
}

/**
 * 获取PMS服务器列表
 * POST /dts/api/dts/q/data/GET_PMS_SERVER/
 */
export function getPmsServerList(assestsObjects = '@@(linux)') {
    return apiService.post(`/dts/api/dts/q/data/GET_PMS_SERVER/?cacheBuster=${Date.now()}`, {
        params: { assestsObjects }
    })
}

/**
 * 导出密码
 */
export function exportPasswords() {
    const url = `${window.location.origin}/sjxy-portal/upm/api/upm/pms/v2/password-job/export`
    window.open(url, '_blank')
}

/**
 * 获取PMS系统参数列表
 * POST /dts/api/dts/q/data/GET_PMS_SYSTEM_PARAM/
 */
export function getSystemParams() {
    return apiService.post(`/dts/api/dts/q/data/GET_PMS_SYSTEM_PARAM/?cacheBuster=${Date.now()}`, {
        params: {}
    })
}

/**
 * 删除系统参数
 * 调用作业 8jgzI0
 */
export function deleteSystemParam(id) {
    return apiService.post(`/jao/api/jao/jobs/8jgzI0/run?cacheBuster=${Date.now()}`, {
        params: { id }
    })
}

/**
 * 保存系统参数
 * 调用作业 zRQjPA
 */
export function saveSystemParam(data) {
    return apiService.post(`/jao/api/jao/jobs/zRQjPA/run?cacheBuster=${Date.now()}`, {
        params: {
            id: data.id,
            type: data.type,
            expression: data.expression,
            paramName: data.param_name,
            description: data.description
        }
    })
}

/**
 * 获取用户名列表
 * POST /dts/api/dts/q/data/PMS_LIST_USERNAME/
 */
export function getUsernameList() {
    return apiService.post(`/dts/api/dts/q/data/PMS_LIST_USERNAME/?cacheBuster=${Date.now()}`, {
        params: {}
    })
}

/**
 * 创建/更新临时密码申请
 * 调用作业 Su0G8O
 */
export function createApplication(data = {}) {
    return apiService.post(`/jao/api/jao/jobs/Su0G8O/run?cacheBuster=${Date.now()}`, {
        params: {
            applicantLogin: data.applicantLogin,
            applicantName: data.applicantName,
            applyTime: data.applyTime,
            assestsParam: data.assestsParam || [],
            intention: data.intention,
            effectiveHours: data.effectiveHours,
            username: data.username,
            id: data.id || ''
        }
    })
}

/**
 * 提交申请
 * 调用作业 hV5lB4
 */
export function submitApplication(id) {
    return apiService.post(`/jao/api/jao/jobs/hV5lB4/run?cacheBuster=${Date.now()}`, {
        params: { id }
    })
}

/**
 * 再次申请
 * 调用作业 GqoyL7
 */
export function reapplyApplication(id) {
    return apiService.post(`/jao/api/jao/jobs/GqoyL7/run?cacheBuster=${Date.now()}`, {
        params: { id }
    })
}

/**
 * 删除申请
 * 调用作业 iHSVgH
 */
export function deleteApplication(id) {
    return apiService.post(`/jao/api/jao/jobs/iHSVgH/run?cacheBuster=${Date.now()}`, {
        params: { id }
    })
}

/**
 * 获取作业执行结果
 * GET /jao/api/jao/runlogs/{runId}/result
 */
export function getJobResult(runId) {
    return apiService.get(`/jao/api/jao/runlogs/${runId}/result?cacheBuster=${Date.now()}`)
}

/**
 * 获取PMS操作记录
 * POST /dts/api/dts/q/data/PMS_GET_AUDIT_LOG/
 */
export function getOperationLog(params = {}) {
    return apiService.post(`/dts/api/dts/q/data/PMS_GET_AUDIT_LOG/?cacheBuster=${Date.now()}`, {
        params: {}
    })
}

/**
 * 获取服务器密码信息
 * POST /dts/api/dts/q/data/PMS_GET_PASSWORD/
 */
export function getServerPassword(serverId) {
    return apiService.post(`/dts/api/dts/q/data/PMS_GET_PASSWORD/?cacheBuster=${Date.now()}`, {
        params: { serverId }
    })
}

/**
 * 获取服务器操作历史
 * POST /dts/api/dts/q/data/PMS_GET_SERVER_HISTORY/
 */
export function getServerHistory(params = {}) {
    return apiService.post(`/dts/api/dts/q/data/PMS_GET_SERVER_HISTORY/?cacheBuster=${Date.now()}`, {
        params: {
            assestsId: params.assestsId,
            username: params.username,
            module: params.module || 'pms'
        }
    })
}

/**
 * 批量修改密码 - 全部服务器
 * 调用作业进行批量密码修改
 */
export function batchModifyPassword(params = {}) {
    return apiService.post(`/jao/api/jao/jobs/PMS_BATCH_MODIFY/run?cacheBuster=${Date.now()}`, {
        params: {
            username: params.username,
            passwordType: params.passwordType, // 'random' 或 'manual'
            password: params.password,
            expireHours: params.expireHours,
            scope: params.scope // 'all' 或 'selected'
        }
    })
}

/**
 * 选择修改密码 - 选中服务器
 * 调用作业进行选择性密码修改
 */
export function selectModifyPassword(params = {}) {
    return apiService.post(`/jao/api/jao/jobs/PMS_SELECT_MODIFY/run?cacheBuster=${Date.now()}`, {
        params: {
            commaIpStr: params.commaIpStr,
            username: params.username,
            passwordType: params.passwordType,
            password: params.password,
            expireHours: params.expireHours
        }
    })
}

/**
 * 检查密码状态
 * 调用作业检查密码状态
 */
export function checkPasswordState(params = {}) {
    return apiService.post(`/jao/api/jao/jobs/PMS_CHECK_PASSWORD/run?cacheBuster=${Date.now()}`, {
        params: {
            scope: params.scope, // 'all' 或 'selected'
            commaIpStr: params.commaIpStr
        }
    })
}

/**
 * 重置密码
 * 调用作业重置密码
 */
export function revertPassword(params = {}) {
    return apiService.post(`/jao/api/jao/jobs/PMS_REVERT_PASSWORD/run?cacheBuster=${Date.now()}`, {
        params: {
            commaIpStr: params.commaIpStr
        }
    })
}

/**
 * 导入初始化密码
 */
export function importInitPassword(formData) {
    return apiService.post('/sjxy-portal/upm/api/upm/pms/v2/password-job/import', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
}

export default {
    getApplicationList,
    getDefaultUsername,
    getPmsServerList,
    exportPasswords,
    getSystemParams,
    deleteSystemParam,
    saveSystemParam,
    getUsernameList,
    createApplication,
    submitApplication,
    reapplyApplication,
    deleteApplication,
    getJobResult,
    getOperationLog,
    getServerPassword,
    getServerHistory,
    batchModifyPassword,
    selectModifyPassword,
    checkPasswordState,
    revertPassword,
    importInitPassword
}
