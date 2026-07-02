import { apiService } from '@/core/api'
import { yumManageApi } from '@/modules/patches/api'

const YUM_REPO_API_PREFIX = '/secops/api/secops/v2/yum-repo'
const SQL_IMPORT_API_PREFIX = '/secops/api/secops/v2/sql'

function buildSqlImportParams(params = {}) {
  return {
    async: params.async ?? true,
    continueOnError: params.continueOnError ?? false,
    dryRun: params.dryRun ?? false
  }
}

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
        dcDataId: params.dcDataId,
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
  },

  runSqlServerFile(params = {}) {
    return apiService.post(
      `${SQL_IMPORT_API_PREFIX}/run-file`,
      {},
      {
        params: {
          file: params.file,
          ...buildSqlImportParams(params)
        }
      }
    )
  },

  getSqlImportResult(jobId) {
    return apiService.get(`${SQL_IMPORT_API_PREFIX}/result/${encodeURIComponent(jobId)}`)
  }
}

export default yumRepoApi
