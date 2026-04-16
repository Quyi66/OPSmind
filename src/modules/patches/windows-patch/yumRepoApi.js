import { apiService } from '@/core/api'

const YUM_REPO_API_PREFIX = '/vap/api/vap/v2/yum-repo'

export const yumRepoApi = {
  getRepos() {
    return apiService.get(`${YUM_REPO_API_PREFIX}/repos`)
  },

  createRepo(payload = {}) {
    return apiService.post(`${YUM_REPO_API_PREFIX}/repos`, payload)
  },

  updateRepo(id, payload = {}) {
    return apiService.put(`${YUM_REPO_API_PREFIX}/repos/${encodeURIComponent(id)}`, payload)
  },

  deleteRepo(id) {
    return apiService.delete(`${YUM_REPO_API_PREFIX}/repos/${encodeURIComponent(id)}`)
  },

  collectPackages(payload = {}) {
    return apiService.post(`${YUM_REPO_API_PREFIX}/collect`, payload)
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

  getCompareSummary(diffRunId) {
    return apiService.get(
      `${YUM_REPO_API_PREFIX}/patch-compare/${encodeURIComponent(diffRunId)}/summary`
    )
  },

  getCompareDetails(diffRunId, params = {}) {
    return apiService.get(
      `${YUM_REPO_API_PREFIX}/patch-compare/${encodeURIComponent(diffRunId)}/details`,
      {
        params: {
          page: params.page ?? 0,
          size: params.size ?? 20
        }
      }
    )
  },

  getNotSatisfied(diffRunId) {
    return apiService.get(
      `${YUM_REPO_API_PREFIX}/patch-compare/${encodeURIComponent(diffRunId)}/not-satisfied`
    )
  }
}

export default yumRepoApi
