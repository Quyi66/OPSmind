/**
 * 软件管理模块 API
 */
import { apiService, getJaoOperationLogs } from '@/core/api'

const SYS_DASHBOARD_BASE = '/dashboard/api/sys/dashboard'

const unwrapApiData = (response) => {
  const body = response?.data
  if (body && body.data && Array.isArray(body.data) && body.total !== undefined) {
    return body
  }
  return body?.data ?? body
}

const normalizeRecords = (payload) => {
  if (!payload) return { records: [], total: 0 }
  if (Array.isArray(payload)) {
    return { records: payload, total: payload.length }
  }
  if (Array.isArray(payload.data)) {
    return {
      records: payload.data,
      total: payload.total ?? payload.data.length
    }
  }
  if (Array.isArray(payload.records)) {
    return {
      records: payload.records,
      total: payload.total ?? payload.records.length
    }
  }
  if (Array.isArray(payload.content)) {
    return {
      records: payload.content,
      total: payload.totalElements ?? payload.total ?? payload.content.length
    }
  }
  return { records: [], total: 0 }
}

const wrapRecordsResponse = (response) => ({
  ...response,
  data: normalizeRecords(unwrapApiData(response))
})

/**
 * 软件包统计 API
 */
export const softwareStatsApi = {
  /**
   * 获取当前软件包统计数据
   * 对应数据集: SPM_CURRENT_SOFTWARE_STATS_V2
   * 返回 KPI 统计数据：scan_count_host, scan_count_repos, scan_count_pkgs, scan_count_installed_pkgs
   */
  getStats() {
    return apiService.get(`${SYS_DASHBOARD_BASE}/spm-current-software-stats-v2`).then(wrapRecordsResponse)
  }
}

/**
 * 主机概览 API
 */
export const hostOverviewApi = {
  /**
   * 获取主机概览列表
   * 对应数据集: SPM_MACHINE_OVERERVIEW_LIST
   */
  getList(params = {}) {
    return apiService.get(`${SYS_DASHBOARD_BASE}/spm-machine-overerview-list`, {
      params: {
        page: params.page || 1,
        size: params.size || 10,
        orderBy: params.orderBy || 'scan_date desc',
        filter: params.filter || ''
      }
    }).then(wrapRecordsResponse)
  },

  /**
   * 获取主机详情
   */
  async getHostDetail(hostKey) {
    const res = await apiService.get(`${SYS_DASHBOARD_BASE}/spm-machine-detail`, {
      params: { hostKey }
    })
    const data = res?.data?.data || res?.data || res || {}
    const detail = Array.isArray(data) ? data[0] : (Array.isArray(data.records) ? data.records[0] : data)
    return { data: detail || {} }
  },

  /**
   * 获取主机软件包信息（概要）
   * 对应数据集: SPM_GET_PKG_MACHINE_INFO
   */
  getMachineInfo(hostId) {
    return apiService.get(`${SYS_DASHBOARD_BASE}/spm-pkg-machine-info`, {
      params: { hostId }
    }).then(wrapRecordsResponse)
  },

  /**
   * 获取主机仓库列表
   * 对应数据集: SPM_LIST_YUM_OF_ONE_MACHIN
   */
  getMachineRepos(params = {}) {
    return apiService.get(`${SYS_DASHBOARD_BASE}/spm-list-yum-of-one-machin`, {
      params: {
        hostId: params.hostId,
        repoStatus: params.repoStatus || 'enabled',
        page: params.page || 1,
        size: params.size || 10,
        orderBy: params.orderBy || '',
        filter: params.filter || ''
      }
    }).then(wrapRecordsResponse)
  },

  /**
   * 获取主机可用软件包列表
   * 对应数据集: SPM_LIST_YUM_PKG_OF_ONE_MACHIN
   */
  getMachineAvailablePackages(params = {}) {
    return apiService.get(`${SYS_DASHBOARD_BASE}/spm-list-yum-pkg-of-one-machin`, {
      params: {
        hostId: params.hostId,
        page: params.page || 1,
        size: params.size || 10,
        orderBy: params.orderBy || '',
        filter: params.filter || ''
      }
    }).then(wrapRecordsResponse)
  },

  /**
   * 获取主机已安装软件包列表
   * 对应数据集: SPM_CURRENT_INSTALLEND_PKGS
   */
  getMachineInstalledPackages(params = {}) {
    return apiService.get(`${SYS_DASHBOARD_BASE}/spm-current-installend-pkgs`, {
      params: {
        hostId: params.hostId,
        page: params.page || 1,
        size: params.size || 10,
        orderBy: params.orderBy || '',
        filter: params.filter || ''
      }
    }).then(wrapRecordsResponse)
  },

  /**
   * 安装软件包
   * 对应作业: 3hSAVR
   */
  installPackages(params = {}) {
    return apiService.post('/workflow/api/workflow/jobs/run', {
      jobCode: '3hSAVR',
      params: {
        install_pkgs: params.installPkgs,
        hosts: params.hostId
      }
    })
  },

  /**
   * 卸载软件包
   * 对应作业: 1RR26y
   */
  uninstallPackages(params = {}) {
    return apiService.post('/workflow/api/workflow/jobs/1RR26y/run', {
      // jobCode: '1RR26y',
      params: {
        hosts: params.hostId,
        pkg_list: params.pkgList
      }
    })
  },

  /**
   * 升级软件包
   * 对应作业: aXEihQ
   */
  upgradePackages(params = {}) {
    return apiService.post('/workflow/api/workflow/jobs/aXEihQ/run', {
      params: {
        update_pkgs: params.updatePkgs,
        hosts: params.hostId
      }
    })
  },

  /**
   * 回退软件包
   * 对应作业: B5KDp0
   */
  rollbackPackages(params = {}) {
    return apiService.post('/workflow/api/workflow/jobs/B5KDp0/run', {
      params: {
        update_pkgs: params.updatePkgs,
        hosts: params.hostId
      }
    })
  },

  /**
   * 获取主机已安装软件包
   */
  getHostInstalledPackages(params = {}) {
    return apiService.get(`${SYS_DASHBOARD_BASE}/spm-host-installed-packages`, {
      params: {
        hostKey: params.hostKey,
        page: params.page || 1,
        size: params.size || 10,
        filter: params.filter || ''
      }
    }).then(wrapRecordsResponse)
  },

  /**
   * 启用/禁用仓库
   * 对应作业: gnLGFi
   */
  toggleRepoStatus(params = {}) {
    return apiService.post('/workflow/api/workflow/jobs/gnLGFi/run', {
      params: {
        repo_name: params.repoName,
        repo_status: params.repoStatus, // 'yes' or 'no'
        hosts: params.hostId,
        repo_url: params.repoUrl,
        repo_desc: params.repoDesc,
        repo_file: params.repoFile
      }
    })
  },

  /**
   * 删除仓库
   * 对应作业: foInBU
   */
  deleteHostRepo(params = {}) {
    return apiService.post('/workflow/api/workflow/jobs/run', {
      jobCode: 'foInBU',
      params: {
        repo_name: params.repoName,
        hosts: params.hostId,
        repo_file: params.repoFile
      }
    })
  }
}

/**
 * 仓库管理 API
 */
export const repoApi = {
  /**
   * 获取仓库列表
   * 对应数据集: SPM_LIST_REPO
   * @param {Object} params - 查询参数
   * @param {string} params.repoStatus - 仓库状态 enabled/disabled
   */
  getRepoList(params = {}) {
    return apiService.get(`${SYS_DASHBOARD_BASE}/spm-list-repo`, {
      params: {
        repoStatus: params.repoStatus || '',
        page: params.page || 1,
        size: params.size || 10,
        orderBy: params.orderBy || 'scan_date desc',
        filter: params.filter || ''
      }
    }).then(wrapRecordsResponse)
  },

  /**
   * 获取基准主机ID列表
   * 对应数据集: SPM_REPO_DEFAULT_HOSTS
   */
  getRepoDefaultHosts() {
    return apiService.get(`${SYS_DASHBOARD_BASE}/spm-repo-default-hosts`).then(wrapRecordsResponse)
  },

  /**
   * 获取基准主机列表
   * 对应数据集: SPM_REPO_DEFAULT_HOSTS_LIST
   */
  getBaseHostList(params = {}) {
    return apiService.get(`${SYS_DASHBOARD_BASE}/spm-repo-default-hosts-list`, {
      params: {
        page: params.page || 1,
        size: params.size || 10,
        orderBy: params.orderBy || '',
        filter: params.filter || ''
      }
    }).then(wrapRecordsResponse)
  },

  /**
   * 获取自定义仓库列表
   * 对应数据集: SPM_REPO_COFIGS
   */
  getCustomRepoList(params = {}) {
    return apiService.get(`${SYS_DASHBOARD_BASE}/spm-repo-cofigs`, {
      params: {
        page: params.page || 1,
        size: params.size || 10,
        orderBy: params.orderBy || '',
        filter: params.filter || ''
      }
    }).then(wrapRecordsResponse)
  },

  /**
   * 获取已配置仓库列表
   * 对应数据集: SPM_CONFIGURED_REPO
   */
  getConfiguredRepoList(params = {}) {
    return apiService.get(`${SYS_DASHBOARD_BASE}/spm-configured-repo`, {
      params: {
        repoStatus: params.repoStatus || '',
        page: params.page || 1,
        size: params.size || 10,
        orderBy: params.orderBy || 'scan_date',
        filter: params.filter || ''
      }
    }).then(wrapRecordsResponse)
  },

  /**
   * 获取仓库详情 (根据refid)
   * 对应数据集: SPM_REPO_INFO_BY_REFID
   */
  getRepoInfoByRefid(refid) {
    return apiService.get(`${SYS_DASHBOARD_BASE}/spm-repo-info-by-refid`, {
      params: { refid }
    }).then(wrapRecordsResponse)
  },

  /**
   * 获取仓库已配置主机列表
   * 对应数据集: SPM_LIST_PACKAGE_MACHINE
   */
  getPackageMachineList(params = {}) {
    return apiService.get(`${SYS_DASHBOARD_BASE}/spm-list-package-machine`, {
      params: {
        refid: params.refid,
        page: params.page || 1,
        size: params.size || 10,
        orderBy: params.orderBy || 'scan_date desc',
        filter: params.filter || ''
      }
    }).then(wrapRecordsResponse)
  },

  /**
   * 从主机移除仓库配置
   * 对应作业: foInBU
   */
  removeRepoFromHost(params = {}) {
    return apiService.post('/workflow/api/workflow/jobs/run', {
      jobCode: 'foInBU',
      params: {
        repo_name: params.repo_name,
        hosts: params.hosts,
        repo_file: params.repo_file
      }
    })
  },

  /**
   * 从 Excel 导入仓库配置
   * 对应作业: wBFwHn
   * POST: /workflow/api/workflow/jobs/wBFwHn/upload-to-run
   * Form Data: file (binary)
   */
  importRepoFromExcel(formData) {
    return apiService.post('/workflow/api/workflow/jobs/wBFwHn/upload-to-run', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  /**
   * 保存自定义仓库 (新增/编辑)
   * 对应作业: dfApaC
   * POST: /workflow/api/workflow/jobs/dfApaC/run
   */
  saveCustomRepo(params = {}) {
    return apiService.post('/workflow/api/workflow/jobs/dfApaC/run', {
      params: {
        id: params.id,
        repoName: params.repoName,
        repoFile: params.repoFile,
        repoDesc: params.repoDesc,
        repoUrl: params.repoUrl
      }
    })
  },

  /**
   * 删除自定义仓库
   * 对应作业: K6zNCC
   * POST: /workflow/api/workflow/jobs/K6zNCC/run
   */
  deleteCustomRepo(id) {
    return apiService.post('/workflow/api/workflow/jobs/K6zNCC/run', {
      params: { id }
    })
  },

  /**
   * 设置基准仓库主机
   * 对应作业: FB8oVl
   * POST: /workflow/api/workflow/jobs/FB8oVl/run
   */
  setBaseRepoHosts(params = {}) {
    return apiService.post('/workflow/api/workflow/jobs/FB8oVl/run', {
      params: {
        hosts: params.hosts
      }
    })
  },

  /**
   * 删除基准主机
   * 对应作业: puc46x
   * POST: /workflow/api/workflow/jobs/puc46x/run
   */
  deleteBaseHost(ids) {
    // ids 可以是单个 id 字符串或 id 数组
    const idsArray = Array.isArray(ids) ? ids : [ids]
    return apiService.post('/workflow/api/workflow/jobs/puc46x/run', {
      params: { ids: idsArray }
    })
  },

  /**
   * 配置仓库到主机
   * 对应作业: 3m2kbd
   * POST: /workflow/api/workflow/jobs/3m2kbd/run
   * 参数格式:
   * {
   *   params: {
   *     repoConfigIds: '4028c0849ba1827f019be8b85e223da1',  // 选中的仓库配置IDs，逗号分隔
   *     hosts: [{ key, value, assetType }],                 // 目标主机列表
   *     repoIds: null,
   *     repoInfoJobId: 'zYn2Is',                           // 仓库信息作业ID
   *     configJobId: 'dchUqi'                              // 配置作业ID
   *   }
   * }
   */
  configRepoToHosts(params = {}) {
    const cacheBuster = Date.now()
    return apiService.post(`/workflow/api/workflow/jobs/3m2kbd/run?cacheBuster=${cacheBuster}`, {
      params: {
        repoConfigIds: params.repoConfigIds,
        hosts: params.hosts,
        repoIds: params.repoIds || null,
        repoInfoJobId: params.repoInfoJobId || 'zYn2Is',
        configJobId: params.configJobId || 'dchUqi'
      }
    })
  }
}

/**
 * 软件包 API
 */
export const packageApi = {
  /**
   * 获取可用软件包列表
   * 对应数据集: SPM_PACKAGES_OVERERVIEW_LIST
   */
  getAvailableList(params = {}) {
    return apiService.get(`${SYS_DASHBOARD_BASE}/spm-packages-overerview-list`, {
      params: {
        page: params.page || 1,
        size: params.size || 10,
        orderBy: params.orderBy || '',
        filter: params.filter || ''
      }
    }).then(wrapRecordsResponse)
  },



  /**
   * 获取所有已安装的软件包 (支持过滤可升级)
   * 对应数据集: SPM_PACKAGES_INSTALLLED_ALL_LIST
   */
  getAllInstalledPackages(params = {}) {
    return apiService.get(`${SYS_DASHBOARD_BASE}/spm-packages-installled-all-list`, {
      params: {
        availablePkg: params.availablePkg || '可升级,all',
        page: params.page || 1,
        size: params.size || 10,
        filter: params.filter || ''
      }
    }).then(wrapRecordsResponse)
  },



  /**
   * 删除本地软件包
   */
  deleteLocalPackage(id) {
    return apiService.delete(`/api/spm/packages/local/${id}`)
  },

  /**
   * 获取安装了特定软件包的主机列表
   * 对应数据集: SPM_INSTALLED_PKGS_MACHINE
   */
  getInstalledPkgMachines(params = {}) {
    return apiService.get(`${SYS_DASHBOARD_BASE}/spm-installed-pkgs-machine`, {
      params: {
        pkgs: params.pkgId,
        page: params.page || 1,
        size: params.size || 10,
        filter: params.filter || ''
      }
    }).then(wrapRecordsResponse)
  }
}

/**
 * 主机 API (兼容别名)
 */
export const hostApi = {
  /**
   * 获取主机列表
   */
  getHostList(params = {}) {
    return hostOverviewApi.getList(params)
  },

  /**
   * 获取主机详情
   */
  getHostDetail(hostKey) {
    return hostOverviewApi.getHostDetail(hostKey)
  },

  /**
   * 获取主机已安装软件包
   */
  getHostInstalledPackages(params = {}) {
    return hostOverviewApi.getHostInstalledPackages(params)
  },

  /**
   * 获取主机仓库列表
   */
  getHostRepos(params = {}) {
    return apiService.get(`${SYS_DASHBOARD_BASE}/spm-host-repos`, {
      params: {
        hostKey: params.hostKey,
        page: params.page || 1,
        size: params.size || 10
      }
    }).then(wrapRecordsResponse)
  }
}



/**
 * 操作日志 API
 */
export const softwareLogsApi = {
  /**
   * 获取操作日志列表
   * API: /workflow/api/workflow/dashboard/list-operation-log
   */
  getLogs(params = {}) {
    return getJaoOperationLogs({
      module: 'secops',
      action: params.action || 'all',
      status: params.status || 'all',
      day: params.day || 'all'
    })
  },

  /**
   * 获取操作日志列表（与 getLogs 相同，提供别名）
   * API: /workflow/api/workflow/dashboard/list-operation-log
   */
  getOperationLogs(params = {}) {
    return getJaoOperationLogs({
      module: params.module || 'secops',
      action: params.action || 'all',
      status: params.status || 'all',
      day: params.day || 'all'
    })
  },

  /**
   * 获取执行结果
   * @param {string} runId 执行 ID
   */
  getRunResult(runId) {
    return apiService.get(`/workflow/api/workflow/runs/${runId}/result`)
  }
}

/**
 * 扫描任务 API
 */
export const scanApi = {
  /**
   * 执行软件包扫描
   */
  startPackageScan(params = {}) {
    return apiService.post('/workflow/api/workflow/jobs/run', {
      jobCode: 'SPM_PACKAGE_SCAN',
      params
    })
  },

  /**
   * 执行仓库扫描
   */
  startRepoScan(params = {}) {
    return apiService.post('/workflow/api/workflow/jobs/run', {
      jobCode: 'SPM_REPO_SCAN',
      params
    })
  }
}

/**
 * 软件包扫描 API
 * 作业代码: ccZagK
 */
export const softwareScanApi = {
  /**
   * 执行软件包扫描
   * POST: /workflow/api/workflow/jobs/ccZagK/run
   * 参数格式: { params: { hosts: [{ key, value, assetType }] } }
   */
  scan(params = {}) {
    const cacheBuster = Date.now()
    return apiService.post(`/workflow/api/workflow/jobs/ccZagK/run?cacheBuster=${cacheBuster}`, {
      params: {
        hosts: params.hosts
      }
    })
  },

  /**
   * 获取扫描运行结果
   * GET: /workflow/api/workflow/runlogs/{runId}/result
   */
  getRunResult(runId) {
    return apiService.get(`/workflow/api/workflow/runlogs/${runId}/result`)
  }
}

/**
 * 本地安装 API
 */
export const localInstallApi = {
  /**
   * 开始本地安装
   * 对应作业: EKjwO7
   */
  startInstall(params = {}) {
    const cacheBuster = Date.now()
    return apiService.post(
      '/workflow/api/workflow/jobs/EKjwO7/run',
      {
        params: {
          hosts: params.hosts,
          file_list: params.file_list
        }
      },
      {
        params: { cacheBuster }
      }
    )
  },

  /**
   * 获取安装结果
   * @param {string} runId
   */
  getInstallResult(runId) {
    // 根据用户提供的示例："/workflow/api/workflow/runlogs/c633f22e799b43db95d1c1403a3702d4/result?cacheBuster=1766050551531"
    const cacheBuster = Date.now()
    return apiService.get(`/workflow/api/workflow/runlogs/${runId}/result`, {
      params: { cacheBuster }
    })
  }
}

export default {
  softwareStatsApi,
  hostOverviewApi,
  repoApi,
  packageApi,
  hostApi,
  softwareLogsApi,
  scanApi,
  softwareScanApi,
  localInstallApi
}
