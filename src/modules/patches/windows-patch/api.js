/**
 * Windows 离线补丁管理 API
 * 基于 windows-offline-frontend-api.md v2 接口规范
 *
 * 安装/回滚为异步接口，返回 200 后需轮询 operation_log 查看实际进度。
 * CVE 查询接口已在 patches/api/index.js 的 winCveApi 中实现，此处不重复。
 */
import { apiService } from '@/core/api'

/** 安装/回滚操作前缀 */
const WIN_PATCH_API_PREFIX = '/vap/api/vap/win/patch'

/**
 * 主机列表 / 主机补丁查询沿用旧路径（后端未变更）
 * @see windows-offline-frontend-api.md §5
 */
const WIN_HOST_API_PREFIX = '/vap/api/vap/win-patch'

export const winPatchApi = {
  // ─────────────────────────────────────────────
  //  主机与补丁查询（沿用旧接口，后端未改路径）
  // ─────────────────────────────────────────────

  /**
   * 获取主机概览列表（分页）
   */
  getHosts(params = {}) {
    return apiService.get(`${WIN_HOST_API_PREFIX}/hosts`, {
      params: {
        page: params.page ?? 0,
        size: params.size ?? 20
      }
    })
  },

  /**
   * 获取指定主机的补丁列表（分页）
   */
  getHostPatches(hostId, params = {}) {
    const queryParams = {
      page: params.page ?? 0,
      size: params.size ?? 50
    }

    if (params.severity) {
      queryParams.severity = params.severity
    }
    if (params.patchStatus) {
      queryParams.patchStatus = params.patchStatus
    }
    if (params.keyword) {
      queryParams.keyword = params.keyword
    }

    return apiService.get(`${WIN_HOST_API_PREFIX}/hosts/${encodeURIComponent(hostId)}/patches`, {
      params: queryParams
    })
  },

  /**
   * 获取安装/回滚日志（分页）
   */
  getInstallLogs(params = {}) {
    const queryParams = {
      page: params.page ?? 0,
      size: params.size ?? 20
    }

    if (params.hostId) {
      queryParams.hostId = params.hostId
    }

    return apiService.get(`${WIN_HOST_API_PREFIX}/install-logs`, {
      params: queryParams
    })
  },

  // ─────────────────────────────────────────────
  //  安装 / 回滚 — 新接口 (v2)
  // ─────────────────────────────────────────────

  /**
   * §3.1 安装补丁
   * POST /vap/api/vap/win/patch/install?reboot=yes|no
   * Body: [currMachineStatusWinId, ...]
   *
   * @param {string[]} ids - 漏洞列表中选中项的 id (vap2_curr_machine_status_win.id)
   * @param {string}   reboot - 'yes' 或 'no'，默认 'no'
   * @returns {Promise<{ _status: 'ok' }>}
   */
  installPatches(ids, reboot = 'no') {
    return apiService.post(`${WIN_PATCH_API_PREFIX}/install`, ids, {
      params: { reboot }
    })
  },

  /**
   * §3.2 回滚补丁
   * POST /vap/api/vap/win/patch/rollback?reboot=yes|no
   * Body: [histUpdatePkgsWinId, ...]
   *
   * @param {string[]} ids - 安装历史记录的 id (vap2_hist_update_pkgs_win.id)
   * @param {string}   reboot - 'yes' 或 'no'，默认 'no'
   * @returns {Promise<{ _status: 'ok' }>}
   */
  rollbackPatches(ids, reboot = 'no') {
    return apiService.post(`${WIN_PATCH_API_PREFIX}/rollback`, ids, {
      params: { reboot }
    })
  },

  /**
   * §3.3 删除回滚历史
   * DELETE /vap/api/vap/win/patch/rollback/history/windows
   * Body: [histId, ...]
   *
   * @param {string[]} ids - 需要删除的历史记录 id 数组
   * @returns {Promise<{ _status: 'ok' }>}
   */
  deleteRollbackHistory(ids) {
    return apiService.delete(`${WIN_PATCH_API_PREFIX}/rollback/history/windows`, {
      data: ids
    })
  },

  // ─────────────────────────────────────────────
  //  导出（沿用旧接口）
  // ─────────────────────────────────────────────

  /**
   * 导出主机补丁报告
   */
  exportHosts(hostIds = []) {
    return apiService.post(
      `${WIN_HOST_API_PREFIX}/export/hosts`,
      { hostIds },
      { responseType: 'blob' }
    )
  }
}

export default winPatchApi
