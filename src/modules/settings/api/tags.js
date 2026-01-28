/**
 * 应用标签管理 API
 */
import { apiService } from '@/core/api'

/**
 * 获取标签列表（带统计）
 * GET /udp/api/udp/tags/total
 */
export function getTags() {
    return apiService.get(`/udp/api/udp/tags/total`)
}

/**
 * 获取标签详情
 * GET /udp/api/udp/tags/id/:id
 */
export function getTagById(id) {
    return apiService.get(`/udp/api/udp/tags/id/${id}?cacheBuster=${Date.now()}`)
}

/**
 * 创建标签
 * POST /udp/api/udp/tags
 */
export function createTag(tag) {
    return apiService.post(`/udp/api/udp/tags?cacheBuster=${Date.now()}`, tag)
}

/**
 * 更新标签
 * PUT /udp/api/udp/tags
 */
export function updateTag(tag) {
    return apiService.put(`/udp/api/udp/tags?cacheBuster=${Date.now()}`, tag)
}

/**
 * 删除标签
 * DELETE /udp/api/udp/tags/:id
 */
export function deleteTag(id) {
    return apiService.delete(`/udp/api/udp/tags/${id}?cacheBuster=${Date.now()}`)
}

/**
 * 获取标签关联的应用列表
 * GET /udp/api/udp/tags/applet/:id
 */
export function getTagApplets(tagId) {
    return apiService.get(`/udp/api/udp/tags/applet/${tagId}?cacheBuster=${Date.now()}`)
}

/**
 * 移除标签与应用的关联
 * POST /udp/api/udp/tags/mapper/remove
 */
export function removeTagAppletMapper(param) {
    return apiService.post(`/udp/api/udp/tags/mapper/remove?cacheBuster=${Date.now()}`, param)
}

export default {
    getTags,
    getTagById,
    createTag,
    updateTag,
    deleteTag,
    getTagApplets,
    removeTagAppletMapper
}
