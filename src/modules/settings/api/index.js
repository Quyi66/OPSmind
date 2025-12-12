import { apiService } from '@/core/api'

/**
 * 获取用户列表
 * GET /api/users
 */
export function getUsers(tenantId) {
    const params = tenantId ? `?tenantId=${tenantId}&cacheBuster=${Date.now()}` : `?cacheBuster=${Date.now()}`
    return apiService.get(`/api/users${params}`)
}

/**
 * 获取基础用户列表（用于团队成员选择）
 * GET /api/users/basic
 */
export function getBasicUsers(tenantId) {
    return apiService.get(`/api/users/basic?tenantId=${tenantId}&cacheBuster=${Date.now()}`)
}

/**
 * 获取用户详情
 * GET /api/users/:tenantUserId
 */
export function getUserDetail(tenantUserId) {
    return apiService.get(`/api/users/${tenantUserId}`)
}

/**
 * 创建用户
 * POST /api/users
 */
export function createUser(user) {
    return apiService.post('/api/users', user)
}

/**
 * 更新用户信息
 * PUT /api/users
 */
export function updateUser(user) {
    return apiService.put('/api/users', user)
}

/**
 * 删除用户
 * DELETE /api/users/:userId
 */
export function deleteUser(userId) {
    return apiService.delete(`/api/users/${userId}`)
}

/**
 * 激活/禁用用户
 * PUT /api/users
 */
export function toggleUserActivation(user, activated) {
    return apiService.put('/api/users', { ...user, activated })
}

/**
 * 获取所有角色
 * GET /api/roles
 */
export function getRoles(withPermission = false) {
    const params = withPermission ? '?isWithPermission=true' : ''
    return apiService.get(`/api/roles${params}`)
}

/**
 * 获取用户的应用列表
 * GET /udp/api/udp/applets/tenant/user
 */
export function getUserApplets(login, tenantUserId) {
    return apiService.get(`/udp/api/udp/applets/tenant/user?cacheBuster=${Date.now()}&login=${login}&tenantUserId=${tenantUserId}`)
}

/**
 * 获取用户的API Keys
 * GET /api/apikey/:tenantUserId
 */
export function getUserApiKeys(tenantUserId) {
    return apiService.get(`/api/apikey/${tenantUserId}`)
}

/**
 * 保存用户应用权限
 * POST /udp/api/udp/applet/tenant/:tenantUserId
 * Body: 完整的应用列表，包含 _user_applet 标记
 */
export function saveUserApplets(tenantUserId, applets) {
    return apiService.post(`/udp/api/udp/applet/tenant/${tenantUserId}?cacheBuster=${Date.now()}`, applets)
}

/**
 * 批量更新用户角色
 * PUT /api/users/roles
 */
export function updateUserRoles(users) {
    return apiService.put('/api/users/roles', users)
}

/**
 * 获取未关联租户的用户
 * GET /api/users/not-associated
 */
export function getNotAssociatedUsers(tenantId) {
    return apiService.get(`/api/users/not-associated?tenantId=${tenantId}`)
}

/**
 * 关联用户到租户
 * POST /api/users/associate
 */
export function associateTenantUsers(tenantId, userIds) {
    return apiService.post('/api/users/associate', { tenantId, userIds })
}

/**
 * 获取租户的所有应用列表（用于创建新用户时）
 * GET /udp/api/udp/applets/tenant
 */
export function getTenantApplets(tenantId) {
    return apiService.get(`/udp/api/udp/applets/tenant?tenantId=${tenantId}&cacheBuster=${Date.now()}`)
}

export default {
    getUsers,
    getBasicUsers,
    getUserDetail,
    createUser,
    updateUser,
    deleteUser,
    toggleUserActivation,
    getRoles,
    getUserApplets,
    getUserApiKeys,
    saveUserApplets,
    updateUserRoles,
    getNotAssociatedUsers,
    associateTenantUsers,
    getTenantApplets
}
