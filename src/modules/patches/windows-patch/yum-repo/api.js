import { apiService } from '@/core/api'
import { yumManageApi } from '../../api'

const YUM_REPO_API_PREFIX = '/vap/api/vap/v2/yum-repo'

export const yumRepoApi = {
  getConfigList() {
    return yumManageApi.getYumRepoConfigs()
  },

  createConfig(payload = {}) {
    return yumManageApi.createYumConfig(payload)
  },

  updateConfig(id, payload = {}) {
    return yumManageApi.updateYumConfig(id, payload)
  },

  deleteConfig(id) {
    return yumManageApi.deleteYumConfig(id)
  },

  getRepos() {
    return apiService.get(`${YUM_REPO_API_PREFIX}/repos`)
  },

  deleteRepo(id) {
    return apiService.delete(`${YUM_REPO_API_PREFIX}/repos/${encodeURIComponent(id)}`)
  },

  collectPackages(payload = {}) {
    return yumManageApi.collectYumRepo(payload)
  },

  collectPackagesBatch(payload = {}) {
    return yumManageApi.collectYumRepoBatch(payload)
  },

  getCollectStatus(id) {
    return apiService.get(`${YUM_REPO_API_PREFIX}/repos/${encodeURIComponent(id)}/status`)
  },

  getPackages(params = {}) {
    return apiService.get(`${YUM_REPO_API_PREFIX}/packages`, {
      params: {
        sourceId: params.sourceId,
        keyword: params.keyword || undefined,
        page: params.page ?? 0,
        size: params.size ?? 20
      }
    })
  },

  comparePatches(payload = {}) {
    return apiService.post(`${YUM_REPO_API_PREFIX}/patch-compare`, payload)
  },

  compareScannedPatches(payload = {}) {
    return apiService.post(`${YUM_REPO_API_PREFIX}/patch-compare/scanned`, payload)
  },

  getCompareOverview() {
    return apiService.get(`${YUM_REPO_API_PREFIX}/patch-compare/overview`)
  },

  getComparePatchView(diffRunId, params = {}) {
    return apiService.get(
      `${YUM_REPO_API_PREFIX}/patch-compare/${encodeURIComponent(diffRunId)}/patch-view`,
      {
        params: {
          diffRunId: params.diffRunId || diffRunId,
          keyword: params.keyword || undefined,
          status: params.status || undefined,
          diffType: params.diffType || undefined,
          page: params.page ?? 0,
          size: params.size ?? 20
        }
      }
    )
  }
}

export default yumRepoApi
