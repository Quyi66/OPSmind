/**
 * 补丁管理模块 API
 * 与后端 VAP (Vulnerability and Patch) 服务交互
 */
import { apiService } from '@/core/api'

const VAP_API_PREFIX = '/vap/api/vap'

/**
 * 补丁扫描相关 API
 */
export const patchScanApi = {
  /**
   * 执行补丁扫描
   * @param {Object} params - 扫描参数
   * @param {Array<string>} params.hosts - 待扫描主机列表
   * @returns {Promise}
   */
  scan(params) {
    return apiService.post(`${VAP_API_PREFIX}/v2/scan`, params)
  },

  /**
   * 获取扫描结果列表（主机概览）
   * POST /dts/api/dts/q/data/VAP2_LIST_MACHINE_WITH_PATCH/
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.size - 每页大小
   * @param {string} params.filter - 筛选关键词
   * @returns {Promise}
   */
  getScanResults(params = {}) {
    const cacheBuster = Date.now()
    // 构建筛选条件：host_key|os_distro|os_version|num_critical|num_important|num_moderate|num_low:*keyword*
    let filter = ''
    if (params.filter && params.filter.trim()) {
      const keyword = params.filter.trim()
      filter = `host_key|os_distro|os_version|num_critical|num_important|num_moderate|num_low:*${keyword}*`
    }
    const requestBody = {
      params: {},
      size: params.size || 20,
      page: params.page || 1,
      filter: filter
    }
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_LIST_MACHINE_WITH_PATCH/?cacheBuster=${cacheBuster}`,
      requestBody
    )
  },

  /**
   * 获取主机补丁扫描详情
   * @param {string} hostId - 主机ID
   * @returns {Promise}
   */
  getHostScanDetail(hostId) {
    return apiService.get(`${VAP_API_PREFIX}/v2/scan/host/${hostId}`)
  },

  /**
   * 获取扫描统计信息
   * @returns {Promise}
   */
  getScanStats() {
    return apiService.get(`${VAP_API_PREFIX}/v2/scan/stats`)
  },

  /**
   * 获取单个主机信息
   * POST /dts/api/dts/q/data/VAP2_GET_MACHINE_INFO/
   * @param {Object} params - 查询参数
  * @param {string} params.host_id - 主机ID
  * @param {string} params.host_key - 主机 IP
   * @returns {Promise}
   */
  getMachineInfo(params) {
    const cacheBuster = Date.now()
    const requestBody = {
      params: {
        host_id: params.host_id
      }
    }
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_GET_MACHINE_INFO/?cacheBuster=${cacheBuster}`,
      requestBody
    )
  },

  /**
   * 获取单个主机的可用补丁列表
   * POST /dts/api/dts/q/data/VAP2_LIST_PATCH_OF_ONE_MACHINE/
   * @param {Object} params - 查询参数
   * @param {string} params.host_id - 主机ID
   * @param {string} params.severity - 严重程度筛选（逗号分隔：Critical,Important,Moderate,Low）
   * @param {number} params.page - 页码
   * @param {number} params.size - 每页大小
   * @returns {Promise}
   */
  getPatchesOfMachine(params = {}) {
    const cacheBuster = Date.now()
    const requestBody = {
      params: {
        host_id: params.host_id,
        host_key: params.host_key || '',
        severity: params.severity || ''
      }
      // size: params.size || 20,
      // page: params.page || 1
    }
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_LIST_PATCH_OF_ONE_MACHINE/?cacheBuster=${cacheBuster}`,
      requestBody
    )
  },

  /**
   * 获取指定主机的软件包列表
   * POST /dts/api/dts/q/data/VAP2_GET_MACHINE_PKGS/
   * @param {Object} params - 查询参数
   * @param {string} params.host_id - 主机ID
   * @returns {Promise}
   */
  getMachinePackages(params) {
    const cacheBuster = Date.now()
    const requestBody = {
      params: {
        host_id: params.host_id
      }
    }
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_GET_MACHINE_PKGS/?cacheBuster=${cacheBuster}`,
      requestBody
    )
  },

  /**
   * 获取指定主机的CVE漏洞列表
   * POST /dts/api/dts/q/data/VAP2_MACHINE_CVE_LIST/
   * @param {Object} params - 查询参数
   * @param {string} params.host_id - 主机ID
   * @param {string} params.severity - 严重程度筛选（逗号分隔：Critical,Important,Moderate,Low）
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页大小
   * @returns {Promise}
   */
  getMachineCVEList(params) {
    const cacheBuster = Date.now()
    const requestBody = {
      params: {
        host_id: params.host_id,
        severity: params.severity || ''
      }
    }
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_MACHINE_CVE_LIST/?cacheBuster=${cacheBuster}`,
      requestBody
    )
  },

  /**
   * 获取补丁详情
   * POST /dts/api/dts/q/data/VAP2_GET_PATCH_DETAIL/
   * @param {Object} params - 查询参数
   * @param {string} params.patch_id - 补丁ID
   * @returns {Promise}
   */
  getPatchDetail(params) {
    const cacheBuster = Date.now()
    const requestBody = {
      params: {
        patch_id: params.patch_id
      }
    }
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_GET_PATCH_DETAIL/?cacheBuster=${cacheBuster}`,
      requestBody
    )
  }
}

/**
 * 补丁安装相关 API
 */
export const patchInstallApi = {
  /**
   * 执行补丁安装
   * @param {Object} params - 安装参数
   * @param {Array<string>} params.hosts - 目标主机列表
   * @param {Array<string>} params.packages - 待安装补丁包列表
   * @param {Array<string>} params.versions - 补丁版本列表
   * @returns {Promise}
   */
  install(params) {
    // 使用作业方式执行安装，后端期望参数形如 { params: { hosts, patchIds, hostIds, packages } }
    return apiService.post('/jao/api/jao/jobs/QJb6B8/run', {
      params: {
        hosts: params.hosts || null,
        patchIds: params.patchIds || [],
        hostIds: params.hostIds || [],
        packages: null
      }
    })
  },

  /**
   * 获取可安装的补丁列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.size - 每页大小
   * @param {string} params.severity - 严重程度筛选 (逗号分隔)
   * @returns {Promise}
   */
  getAvailablePatches(params = {}) {
    const requestBody = {
      params: params
    }
    return apiService.post('/dts/api/dts/q/data/VAP2_LIST_EFFECTED_PATCH_REST/', requestBody)
  },

  /**
   * 获取补丁详情
   * @param {Object} params - 查询参数
   * @param {string} params.patch_id - 补丁ID
   * @returns {Promise}
   */
  getPatchDetail(params) {
    const requestBody = {
      params: {
        patch_id: params.patch_id
      }
    }
    return apiService.post('/dts/api/dts/q/data/VAP2_GET_PATCH_DETAIL/', requestBody)
  },

  /**
   * 获取补丁影响的软件包列表
   * @param {Object} params - 查询参数
   * @param {Array<string>} params.patch_ids - 补丁ID列表
   * @returns {Promise}
   */
  getAffectedPackages(params) {
    const requestBody = {
      params: {
        patch_ids: params.patch_ids
      }
    }
    return apiService.post(
      '/dts/api/dts/q/data/VAP2_LIST_AFFECTED_PKG_OF_PATCH_DETAIL/',
      requestBody
    )
  },

  /**
   * 获取补丁影响的主机列表
   * @param {Object} params - 查询参数
   * @param {Array<string>} params.patch_ids - 补丁ID列表
   * @param {string} params.hostId - 主机筛选条件
   * @returns {Promise}
   */
  getMachinesByPatch(params) {
    const requestBody = {
      params: {
        patch_ids: params.patch_ids,
        hostId: params.hostId || '@@(linux)'
      }
    }
    return apiService.post('/dts/api/dts/q/data/VAP2_LIST_MACHINE_BY_PATCH/', requestBody)
  },

  /**
   * 获取安装任务列表
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getInstallTasks(params = {}) {
    return apiService.post(`${VAP_API_PREFIX}/v2/install/tasks`, params)
  },

  /**
   * 获取安装任务详情
   * @param {string} taskId - 任务ID
   * @returns {Promise}
   */
  getInstallTaskDetail(taskId) {
    return apiService.get(`${VAP_API_PREFIX}/v2/install/task/${taskId}`)
  }
}

/**
 * 补丁回退相关 API
 */
export const patchRollbackApi = {
  /**
   * 获取更新记录历史
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.size - 每页大小
   * @param {string} params.host_key - IP筛选
   * @param {string} params.vul_id - CVE筛选
   * @returns {Promise}
   */
  getHistUpdatePkgs(params = {}) {
    const requestBody = {
      params: {
        host_key: params.host_key || '',
        vul_id: params.vul_id || ''
      },
      page: params.page || 1,
      size: params.size || 20
    }
    return apiService.post('/dts/api/dts/q/data/VAP_HIST_UPDATE_PKGS/', requestBody)
  },

  /**
   * 执行补丁回退（通过作业方式）
   * Job Code: Uu3eb1
   * @param {Object} params - 回退参数
   * @param {Array<string>} params.histUpdateIds - 更新记录ID列表
   * @returns {Promise}
   */
  rollback(params) {
    return apiService.post('/jao/api/jao/jobs/Uu3eb1/run', {
      params: {
        histUpdateIds: params.histUpdateIds,
        hostIds: null,
        hosts: null,
        patchIds: null
      }
    })
  },

  /**
   * 删除更新记录（通过作业方式）
   * Job Code: 3Fl7CJ
   * @param {Array<string>} ids - 记录ID列表
   * @returns {Promise}
   */
  deleteHistUpdatePkgs(ids) {
    return apiService.post('/jao/api/jao/jobs/3Fl7CJ/run', {
      params: {
        histUpdatePkgsWinIds: ids
      }
    })
  },

  /**
   * 获取回退任务列表
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getRollbackTasks(params = {}) {
    return apiService.post(`${VAP_API_PREFIX}/v2/rollback/tasks`, params)
  },

  /**
   * 获取回退任务详情
   * @param {string} taskId - 任务ID
   * @returns {Promise}
   */
  getRollbackTaskDetail(taskId) {
    return apiService.get(`${VAP_API_PREFIX}/v2/rollback/task/${taskId}`)
  }
}

/**
 * 补丁仓库相关 API
 */
export const patchLibraryApi = {
  /**
   * 获取厂商补丁统计
   * POST /dts/api/dts/q/data/VAP2_LIST_VENDOR_PATCH/
   * @returns {Promise}
   */
  getVendorStats() {
    return apiService.post('/dts/api/dts/q/data/VAP2_LIST_VENDOR_PATCH/', {
      params: {}
    })
  },

  /**
   * 获取补丁仓库列表
   * POST /dts/api/dts/q/data/VAP2_LIST_PATCH_DATE/
   * 源系统请求格式: {"params":{"severity":"Critical","vendor":"redhat","is_ignore":"0,1"}}
   * @param {Object} params - 查询参数
   * @param {string} params.severity - 严重程度筛选 (逗号分隔: Critical,Important,Moderate,Low)
   * @param {string} params.vendor - 厂商筛选
   * @param {string} params.is_ignore - 白名单状态 (0,1 全部 / 1 白名单 / 0 非白名单)
   * @param {string} params.filter - 按补丁编号、概要、厂商筛选
   * @param {number} params.page - 页码
   * @param {number} params.size - 每页大小
   * @returns {Promise}
   */
  getPatchList(params = {}) {
    // 源系统传 params 对象 + 分页参数
    const requestBody = {
      params: {
        severity: params.severity,
        vendor: params.vendor,
        is_ignore: params.is_ignore
      },
      page: params.page,
      size: params.size,
      filter: `patch_id|title|vendor:*${params.patch_id || ''}*`
    }
    return apiService.post('/dts/api/dts/q/data/VAP2_LIST_PATCH_DATE/', requestBody)
  },

  /**
   * 获取补丁仓库列表 (旧接口，保持兼容)
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.size - 每页大小
   * @param {string} params.filter - 筛选条件
   * @param {string} params.severity - 严重程度筛选
   * @returns {Promise}
   */
  getPatches(params = {}) {
    return apiService.post(`${VAP_API_PREFIX}/v2/library/patches`, params)
  },

  /**
   * 获取补丁详情
   * POST /dts/api/dts/q/data/VAP2_GET_PATCH_DETAIL/
   * @param {string} patchId - 补丁ID
   * @returns {Promise}
   */
  getPatchDetail(patchId) {
    return apiService
      .post('/dts/api/dts/q/data/VAP2_GET_PATCH_DETAIL/', {
        params: {
          patch_id: patchId
        },
        page: 1,
        size: 1
      })
      .then(res => {
        // 返回第一条记录
        if (res?.data?.records?.[0]) {
          return { data: res.data.records[0] }
        }
        return res
      })
  },

  /**
   * 导入补丁库
   * @param {Object} params - 导入参数
   * @returns {Promise}
   */
  importPatches(params) {
    return apiService.post(`${VAP_API_PREFIX}/v2/library/import`, params)
  },

  /**
   * 获取补丁统计
   * @returns {Promise}
   */
  getLibraryStats() {
    return apiService.get(`${VAP_API_PREFIX}/v2/library/stats`)
  }
}

/**
 * 漏洞相关 API
 */
export const vulnerabilityApi = {
  /**
   * 获取补丁仓库分布（饼图）
   * POST /dts/api/dts/q/data/VAP2_PATCH_INDEX/
   * 返回: { records: [{ vendor: 'redhat', count: 100 }, ...] }
   * @returns {Promise}
   */
  getPatchIndex() {
    return apiService.post('/dts/api/dts/q/data/VAP2_PATCH_INDEX/', {
      params: {}
    })
  },

  /**
   * 获取当前统计数据（柱状图）
   * POST /dts/api/dts/q/data/VAP2_CURRENT_STATS/
   * 返回: { records: [{ name: 'scan_count_critical_patch', value: 5 }, ...] }
   * @returns {Promise}
   */
  getCurrentStats() {
    return apiService.post('/dts/api/dts/q/data/VAP2_CURRENT_STATS/', {
      params: {}
    })
  },

  /**
   * 获取补丁趋势数据（折线图）
   * POST /dts/api/dts/q/data/VAP2_PATCH_TREND/
   * 返回: { records: [{ scan_date: '2024-01-01', patch_count: 100 }, ...] }
   * @returns {Promise}
   */
  getPatchTrend() {
    return apiService.post('/dts/api/dts/q/data/VAP2_PATCH_TREND/', {
      params: {}
    })
  },

  /**
   * 获取漏洞概览列表
   * POST /dts/api/dts/q/data/VAP2_LIST_PATCH_BY_CVES/
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.size - 每页大小
   * @param {string} params.filter - 筛选关键词
   * @param {string} params.severity - 严重程度筛选 (all/Critical/Important/Moderate/Low)
   * @param {string} params.os_distro - 操作系统筛选 (all 或具体值)
   * @param {string} params.patch_status - 补丁状态筛选 (all/未修复/已修复)
   * @returns {Promise}
   */
  getVulnerabilityList(params = {}) {
    const cacheBuster = Date.now()
    const requestBody = {
      params: {
        reboot_status: params.reboot_status || 'all',
        os_distro: params.os_distro || 'all',
        os_major_version: params.os_major_version || 'all',
        severity: params.severity || 'all',
        patch_status: params.patch_status || 'all',
        is_kernel: params.is_kernel || 'all'
      },
      size: params.size || 20,
      page: params.page || 1,
      filter: params.filter
        ? `host_key|vul_id|patch_id|affected_pkgs:*${params.filter || ''}*`
        : undefined
    }
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_LIST_PATCH_BY_CVES/?cacheBuster=${cacheBuster}`,
      requestBody
    )
  },

  /**
   * 获取操作系统列表
   * POST /dts/api/dts/q/data/VAP2_LIST_MACHINE_OS_INFO/
   * @returns {Promise}
   */
  getOsDistroList() {
    const cacheBuster = Date.now()
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_LIST_MACHINE_OS_INFO/?cacheBuster=${cacheBuster}`,
      {
        params: null
      }
    )
  },

  /**
   * 获取操作系统版本列表
   * POST /dts/api/dts/q/data/VAP2_LIST_MACHINE_OS_VERSION_INFO/
   * @returns {Promise}
   */
  getOsVersionList() {
    const cacheBuster = Date.now()
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_LIST_MACHINE_OS_VERSION_INFO/?cacheBuster=${cacheBuster}`,
      {
        params: null
      }
    )
  },

  /**
   * 获取漏洞列表
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getVulnerabilities(params = {}) {
    return apiService.post(`${VAP_API_PREFIX}/v2/vulnerabilities`, params)
  },

  /**
   * 根据补丁状态ID获取主机列表
   * POST /dts/api/dts/q/data/VAP2_PATCH_STATUS_INFO/
   * @param {Array} ids - 补丁状态ID数组
   * @returns {Promise}
   */
  getPatchStatusHosts(ids) {
    const cacheBuster = Date.now()
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_PATCH_STATUS_INFO/?cacheBuster=${cacheBuster}`,
      {
        params: { ids }
      }
    )
  },

  /**
   * 根据补丁状态ID获取CVE列表
   * POST /dts/api/dts/q/data/VAP2_PATCH_STATUS_INFO_BY_CVE/
   * @param {Array} ids - 补丁状态ID数组
   * @returns {Promise}
   */
  getPatchStatusCves(ids) {
    const cacheBuster = Date.now()
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_PATCH_STATUS_INFO_BY_CVE/?cacheBuster=${cacheBuster}`,
      {
        params: { ids }
      }
    )
  },

  /**
   * 根据补丁状态ID获取补丁列表
   * POST /dts/api/dts/q/data/VAP2_PATCH_STATUS_INFO_BY_PATCH/
   * @param {Array} ids - 补丁状态ID数组
   * @returns {Promise}
   */
  getPatchStatusPatches(ids) {
    const cacheBuster = Date.now()
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_PATCH_STATUS_INFO_BY_PATCH/?cacheBuster=${cacheBuster}`,
      {
        params: { ids }
      }
    )
  },

  /**
   * 根据补丁状态ID获取软件包列表
   * POST /dts/api/dts/q/data/VAP2_PATCH_STATUS_INFO_BY_PKGS/
   * @param {Array} ids - 补丁状态ID数组
   * @returns {Promise}
   */
  getPatchStatusPackages(ids) {
    const cacheBuster = Date.now()
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_PATCH_STATUS_INFO_BY_PKGS/?cacheBuster=${cacheBuster}`,
      {
        params: { ids }
      }
    )
  },

  /**
   * 获取漏洞详情
   * @param {string} vulnId - 漏洞ID
   * @returns {Promise}
   */
  getVulnerabilityDetail(vulnId) {
    return apiService.get(`${VAP_API_PREFIX}/v2/vulnerability/${vulnId}`)
  },

  /**
   * 执行漏洞扫描
   * @param {Object} params - 扫描参数
   * @returns {Promise}
   */
  scanVulnerabilities(params) {
    return apiService.post(`${VAP_API_PREFIX}/v2/vulnerabilities/scan`, params)
  }
}

/**
 * 操作日志相关 API
 */
export const patchLogsApi = {
  /**
   * 获取操作日志列表
   * POST /dts/api/dts/q/data/JAO_LIST_OPERATION_LOG/
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.size - 每页大小
   * @param {string} params.action - 操作类型筛选 (all 或具体类型)
   * @param {string} params.status - 状态筛选 (all/COMPLETED/FAILED/RUNNING)
   * @param {number} params.day - 时间范围（天数）
   * @returns {Promise}
   */
  getLogs(params = {}) {
    const cacheBuster = Date.now()
    const requestBody = {
      params: {
        module: 'vap2',
        action: params.action || 'all',
        status: params.status || 'all',
        day: params.day || 7
      },
      page: params.page || 1,
      size: params.size || 20,
      filter: params.filter || ''
    }
    return apiService.post(
      `/dts/api/dts/q/data/JAO_LIST_OPERATION_LOG/?cacheBuster=${cacheBuster}`,
      requestBody
    )
  },

  /**
   * 获取日志详情
   * @param {string} logId - 日志ID
   * @returns {Promise}
   */
  getLogDetail(logId) {
    return apiService.get(`${VAP_API_PREFIX}/v2/logs/${logId}`)
  }
}

/**
 * 概览统计 API
 */
export const patchOverviewApi = {
  /**
   * 获取补丁管理概览统计
   * @returns {Promise}
   */
  getOverview() {
    return apiService.get(`${VAP_API_PREFIX}/v2/overview`)
  },

  /**
   * 获取首页统计卡片数据
   * @returns {Promise}
   */
  getIndexStats() {
    return apiService.post(`/dts/api/dts/q/data/VAP2_CURRENT_STATS/?cacheBuster=${Date.now()}`, {
      params: {}
    })
  }
}

/**
 * Windows 漏洞扫描相关 API
 */
export const windowsVulnerabilityApi = {
  /**
   * 获取 Windows 主机列表
   * POST /dts/api/dts/q/data/VAP2_WIN_MACHINE/
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getWinMachines(params = {}) {
    return apiService.post('/dts/api/dts/q/data/VAP2_WIN_MACHINE/', {
      params: {},
      page: params.page,
      size: params.size,
      filter: `host_key|os_distro|os_version|os_arch:*${params.filter || ''}*`
    })
  },

  /**
   * 获取 Windows 主机补丁列表 (漏洞概览)
   * POST /dts/api/dts/q/data/VAP2_WIN_MACHINE_PATCHS/
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getWinMachinePatches(params = {}) {
    return apiService.post('/dts/api/dts/q/data/VAP2_WIN_MACHINE_PATCHS/', {
      params: {
        patch_status: params.patch_status || ''
      },
      page: params.page,
      size: params.size,
      filter: params.keyword
        ? `host_key|kb_number|os_distro|os_version|os_arch|category_name|title:*${params.keyword || ''}*`
        : ''
    })
  },

  /**
   * 获取单台 Windows 主机信息
   * POST /dts/api/dts/q/data/VAP2_GET_WIN_MACHINE_INFO/
   * @param {Object} params
   * @param {string} params.host_id - 主机 ID
   * @param {string} params.host_key - 主机 IP
   * @returns {Promise}
   */
  getWinMachineInfo(params = {}) {
    return apiService.post('/dts/api/dts/q/data/VAP2_GET_WIN_MACHINE_INFO/', {
      params: {
        host_id: params.host_id || '',
        host_key: params.host_key || ''
      }
    })
  },

  /**
   * 获取单台 Windows 主机的补丁列表
   * POST /dts/api/dts/q/data/VAP2_GET_WIN_MACHINE_PATCH_INFO/
   * @param {Object} params
   * @param {string} params.host_id - 主机 ID
   * @param {string} params.host_key - 主机 IP
   * @returns {Promise}
   */
  getWinMachinePatchInfo(params = {}) {
    return apiService.post('/dts/api/dts/q/data/VAP2_GET_WIN_MACHINE_PATCH_INFO/', {
      params: {
        host_id: params.host_id || '',
        host_key: params.host_key || ''
      },
      page: params.page || 1,
      size: params.size || 10
    })
  },

  /**
   * 获取操作系统列表
   * POST /dts/api/dts/q/data/VAP2_LIST_WIN_OS_INFO/
   * @returns {Promise}
   */
  getWinOsInfo() {
    return apiService.post('/dts/api/dts/q/data/VAP2_LIST_WIN_OS_INFO/', {
      params: {}
    })
  },

  /**
   * 获取操作系统版本列表
   * POST /dts/api/dts/q/data/VAP2_LIST_WIN_OS_VERSION_INFO/
   * @returns {Promise}
   */
  getWinOsVersionInfo() {
    return apiService.post('/dts/api/dts/q/data/VAP2_LIST_WIN_OS_VERSION_INFO/', {
      params: {}
    })
  },

  /**
   * 获取操作系统架构列表
   * POST /dts/api/dts/q/data/VAP2_LIST_WIN_OS_ARCH_INFO/
   * @returns {Promise}
   */
  getWinOsArchInfo() {
    return apiService.post('/dts/api/dts/q/data/VAP2_LIST_WIN_OS_ARCH_INFO/', {
      params: {}
    })
  },

  /**
   * 获取 Windows 漏洞列表
   * POST /dts/api/dts/q/data/VAP2_WIN_VULNERABILITIES/
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getWinVulnerabilities(params = {}) {
    return apiService.post('/dts/api/dts/q/data/VAP2_WIN_VULNERABILITIES/', {
      params: {
        severity: params.severity || ''
      },
      page: params.page || 1,
      size: params.size || 20,
      filter: params.filter || ''
    })
  },

  /**
   * 获取主机漏洞详情
   * @param {Object} params - 查询参数
   * @param {string} params.host_key - 主机 IP
   * @param {string} params.host_id - 主机 ID
   * @returns {Promise}
   */
  getHostVulnDetail(params) {
    return apiService.post('/dts/api/dts/q/data/VAP2_WIN_HOST_DETAIL/', {
      params: {
        host_key: params.host_key,
        host_id: params.host_id
      }
    })
  },

  /**
   * 执行 Windows 漏洞扫描
   * @param {Object} params - 扫描参数
   * @returns {Promise}
   */
  scanVulnerabilities(params) {
    return apiService.post('/jao/api/jao/jobs/WIN_SCAN/run', {
      params: params
    })
  },

  /**
   * 获取可扫描的主机列表 (设备选择器)
   * 复用 VAP2_WIN_MACHINE 数据源获取所有 Windows 主机
   * @returns {Promise}
   */
  getAvailableHosts() {
    return apiService.post('/dts/api/dts/q/data/VAP2_WIN_MACHINE/', {
      params: {},
      page: 1,
      size: 1000
    })
  },

  /**
   * 执行 Windows 漏洞扫描作业
   * Job Code: Fteqeo
   * @param {Object} params - 扫描参数
   * @param {Array<string>} params.host_ids - 主机 ID 列表
   * @returns {Promise}
   */
  executeWinScan(params) {
    return apiService.post('/jao/api/jao/jobs/Fteqeo/run', {
      params: {
        host_ids: params.host_ids
      }
    })
  },

  /**
   * 获取选择的补丁对应主机
   */
  getWinPatchStatusInfo(ids = []) {
    return apiService.post('/dts/api/dts/q/data/VAP2_PATCH_WIN_STATUS_INFO/', {
      params: {
        ids
      }
    })
  },

  /**
   * 获取选择的补丁 KB 列表
   */
  getWinPatchPatchInfo(ids = []) {
    return apiService.post('/dts/api/dts/q/data/VAP2_PATCH_WIN_PATCH_INFO/', {
      params: {
        ids
      }
    })
  },

  /**
   * 执行补丁修复
   */
  executeWinPatchFix(params = {}) {
    return apiService.post('/jao/api/jao/jobs/EAsxlK/run', {
      params: {
        winPatchStatusIds: params.winPatchStatusIds || [],
        reboot: params.reboot || 'no'
      }
    })
  }
}

/**
 * Windows 相关 API
 */
export const windowsPatchApi = {
  /**
   * Windows 漏洞扫描
   * @param {Object} params - 扫描参数
   * @returns {Promise}
   */
  scanVulnerabilities(params) {
    return apiService.post(`${VAP_API_PREFIX}/windows/vulnerabilities/scan`, params)
  },

  /**
   * 获取 Windows 漏洞列表
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getVulnerabilities(params = {}) {
    return apiService.post(`${VAP_API_PREFIX}/windows/vulnerabilities`, params)
  },

  /**
   * Windows 更新
   * @param {Object} params - 更新参数
   * @returns {Promise}
   */
  update(params) {
    return apiService.post(`${VAP_API_PREFIX}/windows/update`, params)
  },

  /**
   * 获取 Windows 更新列表
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getUpdates(params = {}) {
    return apiService.post(`${VAP_API_PREFIX}/windows/updates`, params)
  }
}

/**
 * YUM源管理相关 API
 */
export const yumManageApi = {
  /**
   * 获取YUM源配置列表
   * GET /jao/api/jao/dc/data?code=yum_configs
   * @returns {Promise}
   */
  getYumConfigs() {
    return apiService.get('/jao/api/jao/dc/data', {
      params: {
        code: 'yum_configs',
        cacheBuster: Date.now()
      }
    })
  },

  /**
   * 创建/更新YUM源配置
   * @param {Object} data - YUM源配置数据
   * @returns {Promise}
   */
  createYumConfig(data) {
    return apiService.post(
      '/jao/api/jao/dc/data',
      {
        dataModel: 'yum_configs',
        dataJson: JSON.stringify(data)
      },
      {
        params: {
          cacheBuster: Date.now()
        }
      }
    )
  },

  /**
   * 更新YUM源配置
   * @param {string} id - 记录ID
   * @param {Object} data - YUM源配置数据
   * @returns {Promise}
   */
  updateYumConfig(id, data) {
    return apiService.post(
      '/jao/api/jao/dc/data',
      {
        id: id,
        dataModel: 'yum_configs',
        dataJson: JSON.stringify(data)
      },
      {
        params: {
          cacheBuster: Date.now()
        }
      }
    )
  },

  /**
   * 删除YUM源配置
   * @param {string} id - 记录ID
   * @returns {Promise}
   */
  deleteYumConfig(id) {
    return apiService.delete(`/jao/api/jao/dc/data/${id}`)
  },

  /**
   * 获取主机YUM源清单列表
   * POST /dts/api/dts/q/data/GET_DC_DATA_BY_MODEL/
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getHostYumList(params = {}) {
    return apiService.post('/dts/api/dts/q/data/GET_DC_DATA_BY_MODEL/', {
      params: {
        model: 'yum_host_info',
        filter: params.filter
      },
      page: params.page,
      size: params.size
    })
  },

  /**
   * 获取主机YUM源详情列表
   * POST /dts/api/dts/q/data/VAP2_DC_DATA_BY_KEYWORD/
   * @param {Object} params - 查询参数 { data_owner, repo_status }
   * @returns {Promise}
   */
  getHostRepoDetail(params = {}) {
    return apiService.post('/dts/api/dts/q/data/VAP2_DC_DATA_BY_KEYWORD/', {
      params: {
        model: 'yum_list',
        data_owner: params.data_owner || '',
        repo_status: params.repo_status || 'enabled'
      }
    })
  }
}

/**
 * Windows 更新相关 API
 */
export const windowsUpdateApi = {
  /**
   * 获取 Windows 可安装补丁列表
   * POST /dts/api/dts/q/data/VAP2_PATCH_WIN_LIST/
   * @param {Object} params - 查询参数
   * @param {string} params.category_names - 类型筛选，逗号分隔
   * @returns {Promise}
   */
  getPatchWinList(params = {}) {
    return apiService.post('/dts/api/dts/q/data/VAP2_PATCH_WIN_LIST/', {
      params: {
        category_names: params.category_names || 'Critical Updates,Security Updates'
      },
      page: params.page || 1,
      size: params.size || 10,
      filter: params.filter || ''
    })
  },

  /**
   * 获取补丁受影响的主机列表
   * POST /dts/api/dts/q/data/VAP2_LIST_MACHINE_BY_WIN_PATCH/
   * @param {Object} params - 查询参数
   * @param {string} params.kb_number - KB 编号
   * @returns {Promise}
   */
  getAffectedMachines(params = {}) {
    return apiService.post('/dts/api/dts/q/data/VAP2_LIST_MACHINE_BY_WIN_PATCH/', {
      params: {
        kb_number: params.kb_number || ''
      },
      page: 1,
      size: 500
    })
  },

  /**
   * 获取选中 KB 的受影响主机列表
   * POST /dts/api/dts/q/data/VAP2_PATCH_AFFECTED_MACHINES/
   * @param {Object} params - 查询参数
   * @param {Array<string>} params.kb_numbers - KB 编号列表
   * @returns {Promise}
   */
  getAffectedMachinesByKbNumbers(params = {}) {
    const cacheBuster = Date.now()
    return apiService.post(
      `/dts/api/dts/q/data/VAP2_PATCH_AFFECTED_MACHINES/?cacheBuster=${cacheBuster}`,
      {
        params: {
          kb_numbers: params.kb_numbers || []
        },
        page: 1,
        size: 500
      }
    )
  }
}

/**
 * Windows 概览相关 API
 */
export const windowsViewApi = {
  /**
   * 获取 Windows 当前统计数据（柱状图）
   * POST /dts/api/dts/q/data/VAP2_CURRENT_STATS_WIN/
   * 返回: { records: [{ num_critical, num_rollups, num_security }] }
   * @returns {Promise}
   */
  getCurrentStatsWin() {
    return apiService.post('/dts/api/dts/q/data/VAP2_CURRENT_STATS_WIN/', {
      params: {}
    })
  },

  /**
   * 获取 Windows 补丁趋势数据（折线图）
   * POST /dts/api/dts/q/data/VAP2_PATCH_TREND_WINDOWS/
   * 返回: { records: [{ scan_date, patch_count }] }
   * @returns {Promise}
   */
  getPatchTrendWindows() {
    return apiService.post('/dts/api/dts/q/data/VAP2_PATCH_TREND_WINDOWS/', {
      params: {}
    })
  }
}

/**
 * Windows 更新回滚相关 API
 */
export const windowsRollbackApi = {
  /**
   * 获取 Windows 更新历史记录
   * POST /dts/api/dts/q/data/VAP_HIST_UPDATE_KBS_WIN/
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getHistUpdateKbsWin(params = {}) {
    return apiService.post('/dts/api/dts/q/data/VAP_HIST_UPDATE_KBS_WIN/', {
      params: {
        host_key: params.host_key || '',
        update_kb_numbers: params.update_kb_numbers || ''
      },
      page: params.page || 1,
      size: params.size || 20
    })
  },

  /**
   * 执行回滚操作
   * Job Code: S9eC0m
   * @param {Object} params - 回滚参数
   * @returns {Promise}
   */
  rollback(params) {
    return apiService.post('/jao/api/jao/jobs/S9eC0m/run', {
      params: {
        update_kbs: params.update_kbs,
        hosts: params.hosts,
        func: 'rollback',
        reboot: params.reboot || 'no'
      }
    })
  },

  /**
   * 批量回滚操作
   * Job Code: HiuT3F
   * @param {Object} params - 回滚参数
   * @returns {Promise}
   */
  batchRollback(params) {
    return apiService.post('/jao/api/jao/jobs/HiuT3F/run', {
      params: {
        histUpdatePkgsWinIds: params.histUpdatePkgsWinIds,
        reboot: params.reboot || 'no'
      }
    })
  },

  /**
   * 删除更新记录
   * Job Code: aJlha6
   * @param {Array<string>} ids - 记录ID列表
   * @returns {Promise}
   */
  deleteHistUpdateKbs(ids) {
    return apiService.post('/jao/api/jao/jobs/aJlha6/run', {
      params: {
        histUpdatePkgsWinIds: ids
      }
    })
  }
}

/**
 * 操作报告相关 API
 */
export const operationReportApi = {
  /**
   * 获取漏洞报告列表
   * POST /dts/api/dts/q/data/VAP2_LIST_MACHINE_VUL_OTO/
   * 字段: host_key, os_distro, os_version, vul_id, scan_timestamp
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getVulnerabilityReport(params = {}) {
    return apiService.post('/dts/api/dts/q/data/VAP2_LIST_MACHINE_VUL_OTO/', {
      params: {},
      page: params.page || 1,
      size: params.size || 20,
      filter: params.filter || ''
    })
  },

  /**
   * 获取补丁报告列表
   * POST /dts/api/dts/q/data/VAP2_LIST_MACHINE_PATCH_OTO/
   * 字段: host_key, os_distro, os_version, patch_id, title, severity, scan_timestamp
   * @param {Object} params - 查询参数
   * @returns {Promise}
   */
  getPatchReport(params = {}) {
    return apiService.post('/dts/api/dts/q/data/VAP2_LIST_MACHINE_PATCH_OTO/', {
      params: {},
      page: params.page || 1,
      size: params.size || 20,
      filter: params.filter || ''
    })
  }
}

/**
 * CVE 漏洞查询 API
 * 参照 Angular vap.service.js 实现
 */
export const cveApi = {
  /**
   * 分页查询 CVE 列表
   * GET /vap/api/vap/v2/cve/list
   * @param {Object} params - 查询参数
   * @param {string} params.source - 数据源: redhat / kylin
   * @param {string} params.severity - 严重等级: critical / important / moderate / low
   * @param {string} params.keyword - 关键字（搜索CVE ID或描述）
   * @param {string} params.packageName - 包名
   * @param {string} params.startDate - 开始日期（格式：yyyy-MM-dd）
   * @param {string} params.endDate - 结束日期（格式：yyyy-MM-dd）
   * @param {number} params.page - 页码（从0开始）
   * @param {number} params.size - 每页数量
   * @param {string} params.sortBy - 排序字段: publicDate / severity / cveId
   * @param {string} params.sortDir - 排序方向: asc / desc
   * @returns {Promise}
   */
  getCveList(params = {}) {
    const queryParams = {}

    // 只添加非空且非 'all' 的参数
    if (params.source && params.source !== 'all') queryParams.source = params.source
    if (params.severity && params.severity !== 'all') queryParams.severity = params.severity
    if (params.keyword) queryParams.keyword = params.keyword
    if (params.packageName) queryParams.packageName = params.packageName
    if (params.startDate) queryParams.startDate = params.startDate
    if (params.endDate) queryParams.endDate = params.endDate
    if (params.page !== undefined) queryParams.page = params.page
    if (params.size !== undefined) queryParams.size = params.size
    if (params.sortBy) queryParams.sortBy = params.sortBy
    if (params.sortDir) queryParams.sortDir = params.sortDir

    return apiService.get(`${VAP_API_PREFIX}/v2/cve/list`, { params: queryParams })
  },

  /**
   * 查询 CVE 详情
   * GET /vap/api/vap/v2/cve/detail/{cveId}
   * @param {string} cveId - CVE编号，如 CVE-2025-26597
   * @returns {Promise}
   */
  getCveDetail(cveId) {
    return apiService.get(`${VAP_API_PREFIX}/v2/cve/detail/${encodeURIComponent(cveId)}`)
  },

  /**
   * 获取统计概览
   * GET /vap/api/vap/v2/cve/statistics
   * @returns {Promise}
   */
  getStatistics() {
    return apiService.get(`${VAP_API_PREFIX}/v2/cve/statistics`)
  },

  /**
   * 查询 CVE 受影响主机列表
   * GET /vap/api/vap/v2/cve/affected-hosts/{cveId}
   * @param {string} cveId - CVE编号
   * @returns {Promise}
   */
  getAffectedHosts(cveId) {
    return apiService.get(`${VAP_API_PREFIX}/v2/cve/affected-hosts/${encodeURIComponent(cveId)}`)
  }
}

// 导出所有 API
export default {
  scan: patchScanApi,
  install: patchInstallApi,
  rollback: patchRollbackApi,
  library: patchLibraryApi,
  vulnerability: vulnerabilityApi,
  logs: patchLogsApi,
  overview: patchOverviewApi,
  windows: windowsPatchApi,
  windowsVulnerability: windowsVulnerabilityApi,
  windowsUpdate: windowsUpdateApi,
  windowsView: windowsViewApi,
  windowsRollback: windowsRollbackApi,
  yum: yumManageApi,
  operationReport: operationReportApi,
  cve: cveApi
}
