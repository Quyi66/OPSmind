/**
 * 主机健康巡检 API
 * 参照：本次更新-前端接口-主机健康巡检-20261103.md
 * 前缀：/sjxy-console/secops -> /secops/api/secops/v2/health
 */

import { apiService } from '@/core/api'

const HEALTH_API_PREFIX = '/secops/api/secops/v2/health'

const unwrapResponse = response => response?.data?.data ?? response?.data ?? response

export const hostHealthApi = {
  /**
   * 1. 健康概览
   * GET /secops/api/secops/v2/health/summary
   */
  getSummary() {
    return apiService.get(`${HEALTH_API_PREFIX}/summary`).then(unwrapResponse)
  },

  /**
   * 2. 主机健康列表
   * GET /secops/api/secops/v2/health/hosts?status=&keyword=&page=1&size=20
   * @param {Object} params
   * @param {string} [params.status] - HEALTHY / WARNING / CRITICAL / UNREACHABLE / UNCHECKED
   * @param {string} [params.keyword] - 按 IP / 主机名模糊匹配
   * @param {number} [params.page=1] - 页码，从 1 开始
   * @param {number} [params.size=20] - 每页大小，上限 200
   */
  getHosts(params = {}) {
    const queryParams = {
      page: params.page || 1,
      size: Math.min(Number(params.size) || 20, 200)
    }

    if (params.status) {
      queryParams.status = String(params.status).trim()
    }
    if (params.keyword && String(params.keyword).trim()) {
      queryParams.keyword = String(params.keyword).trim()
    }

    return apiService
      .get(`${HEALTH_API_PREFIX}/hosts`, { params: queryParams })
      .then(unwrapResponse)
  },

  /**
   * 3. 立即巡检
   * POST /secops/api/secops/v2/health/run
   * @param {Array<string>} [hostIds] - 可选主机 ID 数组，全量巡检时传空数组 []
   */
  runHealthCheck(hostIds) {
    const normalizedIds = Array.isArray(hostIds)
      ? hostIds.map(id => String(id || '').trim()).filter(Boolean)
      : []

    return apiService.post(`${HEALTH_API_PREFIX}/run`, normalizedIds).then(unwrapResponse)
  }
}

export default hostHealthApi
