/**
 * 软件管理模块 API
 */
import { apiService } from '@/core/api'

// 数据集 API 基础路径
const DTS_BASE = '/dts/api/dts/q/data'

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
    return apiService.post(`${DTS_BASE}/SPM_CURRENT_SOFTWARE_STATS_V2/`, {
      params: {},
      size: 10,
      page: 1,
      orderBy: '',
      filter: ''
    })
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
    return apiService.post(`${DTS_BASE}/SPM_MACHINE_OVERERVIEW_LIST/`, {
      params: {},
      page: params.page || 1,
      size: params.size || 10,
      orderBy: params.orderBy || 'scan_date desc',
      filter: params.filter || ''
    })
  },

  /**
   * 获取主机详情
   */
  getHostDetail(hostKey) {
    return apiService.post(`${DTS_BASE}/SPM_MACHINE_DETAIL/`, {
      host_key: hostKey
    })
  },

  /**
   * 获取主机已安装软件包
   */
  getHostInstalledPackages(params = {}) {
    return apiService.post(`${DTS_BASE}/SPM_HOST_INSTALLED_PACKAGES/`, {
      host_key: params.hostKey,
      page: params.page || 1,
      size: params.size || 10,
      filter: params.filter || ''
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
    return apiService.post(`${DTS_BASE}/SPM_LIST_REPO/`, {
      params: params.repoStatus ? { repoStatus: params.repoStatus } : {},
      page: params.page || 1,
      size: params.size || 10,
      orderBy: params.orderBy || 'scan_date desc',
      filter: params.filter || ''
    })
  },

  /**
   * 获取基准主机ID列表
   * 对应数据集: SPM_REPO_DEFAULT_HOSTS
   */
  getRepoDefaultHosts() {
    return apiService.post(`${DTS_BASE}/SPM_REPO_DEFAULT_HOSTS/`, {
      params: {},
      page: 1,
      size: 1
    })
  },

  /**
   * 获取基准主机列表
   * 对应数据集: SPM_REPO_DEFAULT_HOSTS_LIST
   */
  getBaseHostList(params = {}) {
    return apiService.post(`${DTS_BASE}/SPM_REPO_DEFAULT_HOSTS_LIST/`, {
      params: {},
      page: params.page || 1,
      size: params.size || 10,
      orderBy: params.orderBy || '',
      filter: params.filter || ''
    })
  },

  /**
   * 获取自定义仓库列表
   * 对应数据集: SPM_REPO_COFIGS
   */
  getCustomRepoList(params = {}) {
    return apiService.post(`${DTS_BASE}/SPM_REPO_COFIGS/`, {
      params: {},
      page: params.page || 1,
      size: params.size || 10,
      orderBy: params.orderBy || '',
      filter: params.filter || ''
    })
  },

  /**
   * 获取已配置仓库列表
   * 对应数据集: SPM_CONFIGURED_REPO
   */
  getConfiguredRepoList(params = {}) {
    return apiService.post(`${DTS_BASE}/SPM_CONFIGURED_REPO/`, {
      params: params.repoStatus ? { repoStatus: params.repoStatus } : {},
      page: params.page || 1,
      size: params.size || 10,
      orderBy: params.orderBy || '',
      filter: params.filter || ''
    })
  },

  /**
   * 获取仓库详情 (根据refid)
   * 对应数据集: SPM_REPO_INFO_BY_REFID
   */
  getRepoInfoByRefid(refid) {
    return apiService.post(`${DTS_BASE}/SPM_REPO_INFO_BY_REFID/`, {
      params: { refid },
      page: 1,
      size: 1
    })
  },

  /**
   * 获取仓库已配置主机列表
   * 对应数据集: SPM_LIST_PACKAGE_MACHINE
   */
  getPackageMachineList(params = {}) {
    return apiService.post(`${DTS_BASE}/SPM_LIST_PACKAGE_MACHINE/`, {
      params: { refid: params.refid },
      page: params.page || 1,
      size: params.size || 10,
      orderBy: params.orderBy || 'scan_date desc',
      filter: params.filter || ''
    })
  },

  /**
   * 从主机移除仓库配置
   * 对应作业: foInBU
   */
  removeRepoFromHost(params = {}) {
    return apiService.post('/api/jao/jobs/run', {
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
   */
  importRepoFromExcel(formData) {
    return apiService.post('/api/jao/jobs/run/wBFwHn', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  /**
   * 保存自定义仓库 (新增/编辑)
   * 对应作业: dfApaC
   */
  saveCustomRepo(params = {}) {
    return apiService.post('/api/jao/jobs/run', {
      jobCode: 'dfApaC',
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
   */
  deleteCustomRepo(id) {
    return apiService.post('/api/jao/jobs/run', {
      jobCode: 'SPM_DELETE_CUSTOM_REPO',
      params: { id }
    })
  },

  /**
   * 设置基准仓库主机
   * 对应作业: FB8oVl
   */
  setBaseRepoHosts(params = {}) {
    return apiService.post('/api/jao/jobs/run', {
      jobCode: 'FB8oVl',
      params: {
        hosts: params.hosts
      }
    })
  },

  /**
   * 删除基准主机
   */
  deleteBaseHost(hostKey) {
    return apiService.post('/api/jao/jobs/run', {
      jobCode: 'SPM_DELETE_BASE_HOST',
      params: { host_key: hostKey }
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
    return apiService.post(`${DTS_BASE}/SPM_PACKAGES_OVERERVIEW_LIST/`, {
      params: {},
      page: params.page || 1,
      size: params.size || 10,
      orderBy: params.orderBy || '',
      filter: params.filter || ''
    })
  },

  /**
   * 获取已安装软件包列表
   * 对应数据集: SPM_INSTALLED_PACKAGES
   */
  getInstalledList(params = {}) {
    return apiService.post(`${DTS_BASE}/SPM_INSTALLED_PACKAGES/`, {
      page: params.page || 1,
      size: params.size || 10,
      filter: params.filter || ''
    })
  },

  /**
   * 获取本地上传的软件包列表
   */
  getLocalPackageList(params = {}) {
    return apiService.post(`${DTS_BASE}/SPM_LOCAL_PACKAGES/`, {
      page: params.page || 1,
      size: params.size || 10,
      filter: params.filter || ''
    })
  },

  /**
   * 删除本地软件包
   */
  deleteLocalPackage(id) {
    return apiService.delete(`/api/spm/packages/local/${id}`)
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
    return apiService.post(`${DTS_BASE}/SPM_HOST_REPOS/`, {
      host_key: params.hostKey,
      page: params.page || 1,
      size: params.size || 10
    })
  }
}

/**
 * 日志 API
 */
export const logApi = {
  /**
   * 获取日志列表
   */
  getLogList(params = {}) {
    return apiService.post(`${DTS_BASE}/SPM_OPERATION_LOGS/`, {
      page: params.page || 1,
      size: params.size || 10,
      filter: params.filter || ''
    })
  },

  /**
   * 获取日志详情
   */
  getLogDetail(logId) {
    return apiService.post(`${DTS_BASE}/SPM_OPERATION_LOG_DETAIL/`, {
      log_id: logId
    })
  }
}

/**
 * 操作日志 API
 */
export const softwareLogsApi = {
  /**
   * 获取操作日志列表
   * 对应数据集: JAO_LIST_OPERATION_LOG
   * API: /dts/api/dts/q/data/JAO_LIST_OPERATION_LOG/
   * Body: { params: { module, action, status, day } }
   */
  getLogs(params = {}) {
    return apiService.post(`${DTS_BASE}/JAO_LIST_OPERATION_LOG/`, {
      params: {
        module: 'spm',
        action: params.action || 'all',
        status: params.status || 'all',
        day: params.day || 'all'
      }
    })
  },

  /**
   * 获取操作日志列表（与 getLogs 相同，提供别名）
   * 对应数据集: JAO_LIST_OPERATION_LOG
   */
  getOperationLogs(params = {}) {
    return apiService.post(`${DTS_BASE}/JAO_LIST_OPERATION_LOG/`, {
      params: {
        module: params.module || 'spm',
        action: params.action || 'all',
        status: params.status || 'all',
        day: params.day || 'all'
      }
    })
  },

  /**
   * 获取执行结果
   * @param {string} runId 执行 ID
   */
  getRunResult(runId) {
    return apiService.get(`/api/jao/runs/${runId}/result`)
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
    return apiService.post('/api/jao/jobs/run', {
      jobCode: 'SPM_PACKAGE_SCAN',
      params
    })
  },

  /**
   * 执行仓库扫描
   */
  startRepoScan(params = {}) {
    return apiService.post('/api/jao/jobs/run', {
      jobCode: 'SPM_REPO_SCAN',
      params
    })
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
    return apiService.post('/api/jao/jobs/run', {
      jobCode: 'EKjwO7',
      params: {
        hosts: params.hosts,
        file_list: params.file_list
      }
    })
  }
}

export default {
  softwareStatsApi,
  hostOverviewApi,
  repoApi,
  packageApi,
  hostApi,
  logApi,
  softwareLogsApi,
  scanApi,
  localInstallApi
}
