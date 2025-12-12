/**
 * 引擎管理 API
 */
import { apiService } from '@/core/api'

const JAO_PREFIX = '/jao/api/jao'

/**
 * 获取指定 domain 的参数配置
 * GET /api/params/query?domain=xxx
 */
export async function getParamsByDomain(domain) {
    const res = await apiService.get('/api/params/query', {
        params: { domain, cacheBuster: Date.now() }
    })
    return res?.data || res || []
}

/**
 * 获取指定 domain 和 name 的参数
 * GET /api/params/{domain}/{name}
 */
export async function getParamByDomainAndName(domain, name) {
    const res = await apiService.get(`/api/params/${domain}/${name}`, {
        params: { cacheBuster: Date.now() }
    })
    return res?.data || res
}

/**
 * 批量更新参数
 * PUT /api/params/batch
 */
export async function batchUpdateParams(params) {
    const res = await apiService.put('/api/params/batch', params, {
        params: { cacheBuster: Date.now() }
    })
    return res?.data || res
}

/**
 * 更新单个参数
 * PUT /api/params
 */
export async function updateParam(param) {
    const res = await apiService.put('/api/params', param, {
        params: { cacheBuster: Date.now() }
    })
    return res?.data || res
}

// ==================== AAP API ====================

/**
 * 获取 AAP 项目基础目录
 */
export async function queryProjectBaseDir() {
    const res = await apiService.get(`${JAO_PREFIX}/aap/project_base_dir`, {
        params: { cacheBuster: Date.now() }
    })
    return res?.data || res
}

/**
 * 获取 AAP 项目列表
 */
export async function queryProjects() {
    const res = await apiService.get(`${JAO_PREFIX}/aap/projects`, {
        params: { cacheBuster: Date.now() }
    })
    const data = res?.data || res
    return typeof data === 'string' ? JSON.parse(data) : data
}

/**
 * 获取 AAP 组织列表
 */
export async function queryOrganizations() {
    const res = await apiService.get(`${JAO_PREFIX}/aap/organizations`, {
        params: { cacheBuster: Date.now() }
    })
    const data = res?.data || res
    return typeof data === 'string' ? JSON.parse(data) : data
}

/**
 * 获取 AAP 凭证列表
 */
export async function queryCredentials() {
    const res = await apiService.get(`${JAO_PREFIX}/aap/credentials`, {
        params: { cacheBuster: Date.now() }
    })
    const data = res?.data || res
    return typeof data === 'string' ? JSON.parse(data) : data
}

/**
 * 获取 AAP 实例组列表
 */
export async function queryInstanceGroups() {
    const res = await apiService.get(`${JAO_PREFIX}/aap/instance_group`, {
        params: { cacheBuster: Date.now() }
    })
    const data = res?.data || res
    return typeof data === 'string' ? JSON.parse(data) : data
}

/**
 * 获取 AAP 执行环境列表
 */
export async function queryExecutionEnvironments() {
    const res = await apiService.get(`${JAO_PREFIX}/aap/execution_environments`, {
        params: { cacheBuster: Date.now() }
    })
    const data = res?.data || res
    return typeof data === 'string' ? JSON.parse(data) : data
}

export default {
    getParamsByDomain,
    getParamByDomainAndName,
    batchUpdateParams,
    updateParam,
    queryProjectBaseDir,
    queryProjects,
    queryOrganizations,
    queryCredentials,
    queryInstanceGroups,
    queryExecutionEnvironments
}
