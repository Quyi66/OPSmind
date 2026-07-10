/**
 * 应用管理 API
 */
import { apiService } from '@/core/api'

/**
 * 获取应用列表
 * GET /workspace/api/workspace/applets
 */
export function getApplets() {
  return apiService.get('/workspace/api/workspace/applets')
}

/**
 * 获取应用详情
 * GET /adm/api/adm/applet/id/:id
 */
export function getAppletDetail(id) {
  return apiService.get(`/adm/api/adm/applet/id/${id}`)
}

/**
 * 删除应用（移至回收站）
 * DELETE /adm/api/adm/applet/:id
 */
export function deleteApplet(id) {
  return apiService.delete(`/adm/api/adm/applet/${id}`)
}

/**
 * 复制应用
 * POST /adm/api/adm/applet/copy
 */
export function copyApplet(data) {
  return apiService.post(`/adm/api/adm/applet/copy?cacheBuster=${Date.now()}`, data)
}

/**
 * 获取回收站应用列表
 * GET /adm/api/adm/applet/recycled
 */
export function getRecycledApplets() {
  return apiService.get('/adm/api/adm/applet/recycled')
}

/**
 * 删除回收站中的应用（永久删除）
 * DELETE /adm/api/adm/applet/recycled/:appletCode
 */
export function deleteRecycledApplet(appletCode) {
  return apiService.delete(`/adm/api/adm/applet/recycled/${appletCode}`)
}

/**
 * 批量删除回收站应用
 * GET /adm/api/adm/applet/recycled/delete
 */
export function deleteRecycledApplets(appletCodes) {
  return apiService.get('/adm/api/adm/applet/recycled/delete', { appletCodes })
}

/**
 * 恢复回收站应用
 * GET /adm/api/adm/applet/recycled/recover
 */
export function recoverRecycledApplet(appletCodes) {
  return apiService.get('/adm/api/adm/applet/recycled/recover', { appletCodes })
}

/**
 * 清空回收站
 * POST /adm/api/adm/applet/recycled/clear
 */
export function clearRecycledApplets() {
  return apiService.post('/adm/api/adm/applet/recycled/clear')
}

/**
 * 导出应用
 * POST /adm/api/adm/applet/export/relation
 */
export function exportApplets(appletVm) {
  return apiService.post('/adm/api/adm/applet/export/relation', appletVm, {
    responseType: 'blob'
  })
}

/**
 * 导入应用
 * POST /adm/api/adm/applet/import/relation/:importType
 */
export function importApplets(importType, udpAppletList) {
  return apiService.post(`/adm/api/adm/applet/import/relation/${importType}`, udpAppletList)
}

/**
 * 获取应用页面列表
 * GET /workspace/api/workspace/pages
 */
export function getPages(appletCode) {
  return apiService.get(
    `/workspace/api/workspace/pages?isPaging=true&appletCode=${appletCode}&page=0&size=1000`
  )
}

/**
 * 获取应用作业列表
 * GET /workflow/api/workflow/jobs/app
 */
export function getJobs(appletCode) {
  return apiService.get(`/workflow/api/workflow/jobs/app?appletCode=${appletCode}`)
}

export default {
  getApplets,
  getAppletDetail,
  deleteApplet,
  copyApplet,
  getRecycledApplets,
  deleteRecycledApplet,
  deleteRecycledApplets,
  recoverRecycledApplet,
  clearRecycledApplets,
  exportApplets,
  importApplets,
  getPages,
  getJobs
}
