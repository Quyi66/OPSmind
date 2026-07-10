/**
 * 应用标签管理 API
 */
import { apiService } from '@/core/api'

/**
 * 获取标签列表（带统计）
 * GET /workspace/api/workspace/tags/total
 */
export function getTags() {
  return apiService.get(`/workspace/api/workspace/tags/total`)
}

/**
 * 获取标签详情
 * GET /workspace/api/workspace/tags/id/:id
 */
export function getTagById(id) {
  return apiService.get(`/workspace/api/workspace/tags/id/${id}`)
}

/**
 * 创建标签
 * POST /workspace/api/workspace/tags
 */
export function createTag(tag) {
  return apiService.post(`/workspace/api/workspace/tags?cacheBuster=${Date.now()}`, tag)
}

/**
 * 更新标签
 * PUT /workspace/api/workspace/tags
 */
export function updateTag(tag) {
  return apiService.put(`/workspace/api/workspace/tags?cacheBuster=${Date.now()}`, tag)
}

/**
 * 删除标签
 * DELETE /workspace/api/workspace/tags/:id
 */
export function deleteTag(id) {
  return apiService.delete(`/workspace/api/workspace/tags/${id}?cacheBuster=${Date.now()}`)
}

/**
 * 获取标签关联的应用列表
 * GET /workspace/api/workspace/tags/applet/:id
 */
export function getTagApplets(tagId) {
  return apiService.get(`/workspace/api/workspace/tags/applet/${tagId}`)
}

/**
 * 移除标签与应用的关联
 * POST /workspace/api/workspace/tags/mapper/remove
 */
export function removeTagAppletMapper(param) {
  return apiService.post(`/workspace/api/workspace/tags/mapper/remove?cacheBuster=${Date.now()}`, param)
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
