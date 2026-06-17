import { computed, ref } from 'vue'
import { assetApi, dataManageApi, operationLogApi, overviewApi, permissionApi } from '../api'

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toTimestamp(value) {
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function sortByField(list, field, fallbackField) {
  return [...list].sort(
    (a, b) =>
      toNumber(b?.[field] ?? b?.[fallbackField]) - toNumber(a?.[field] ?? a?.[fallbackField])
  )
}

function extractRecords(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.records)) return response.records
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.records)) return response.data.records
  return []
}

function extractPermissionRows(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  return []
}

function formatCount(value) {
  return toNumber(value).toLocaleString('zh-CN')
}

function formatPercent(part, total) {
  const totalValue = toNumber(total)
  if (!totalValue) return '0%'
  return `${Math.round((toNumber(part) / totalValue) * 100)}%`
}

export function useAssetOverviewWorkbench() {
  const assetTypeData = ref([])
  const osDistributionData = ref([])
  const newAssetData = ref([])
  const groupAssetData = ref([])
  const connectionData = ref([])
  const groupRows = ref([])
  const tagRows = ref([])
  const permissionRows = ref([])
  const recentLogs = ref([])
  const recentOperationTotal = ref(0)
  const recentErrorTotal = ref(0)

  const overviewLoading = ref(false)
  const governanceLoading = ref(false)
  const logLoading = ref(false)
  const refreshing = ref(false)

  const totalAssets = computed(() =>
    assetTypeData.value.reduce((sum, item) => sum + toNumber(item?.count), 0)
  )

  const assetTypeCount = computed(() => assetTypeData.value.length)

  const topAssetType = computed(() => {
    if (!assetTypeData.value.length) return null
    return sortByField(assetTypeData.value, 'count')[0]
  })

  const topOs = computed(() => {
    if (!osDistributionData.value.length) return null
    return sortByField(osDistributionData.value, 'count')[0]
  })

  const latestTrendPoint = computed(() => {
    if (!newAssetData.value.length) return null
    return [...newAssetData.value]
      .sort((a, b) => toTimestamp(a?.times) - toTimestamp(b?.times))
      .at(-1)
  })

  const connectionStats = computed(() => {
    const statsMap = connectionData.value.reduce((result, item) => {
      if (item?.condi) {
        result[item.condi] = toNumber(item?.c)
      }
      return result
    }, {})

    const successCount = statsMap.recently_ok || 0
    const failureCount = statsMap.recently || 0
    const totalConnection = successCount + failureCount

    return {
      successCount,
      failureCount,
      anomalyCount: statsMap.sjxy_all || failureCount,
      todayCount: statsMap.today || 0,
      lowCount: statsMap.low || 0,
      totalConnection,
      successRate: totalConnection ? Math.round((successCount / totalConnection) * 100) : 0
    }
  })

  const topGroups = computed(() =>
    sortByField(
      groupRows.value.filter(item => item?.path),
      'total'
    )
      .filter(item => item.path !== '/')
      .slice(0, 5)
  )

  const topTags = computed(() =>
    sortByField(
      tagRows.value.filter(item => item?.name),
      'total'
    ).slice(0, 5)
  )

  const governanceStats = computed(() => {
    const teamNames = new Set()

    permissionRows.value.forEach(row => {
      const teams = Array.isArray(row?.teamInfo) ? row.teamInfo : []
      teams.forEach(team => {
        if (team?.teamName) {
          teamNames.add(team.teamName)
        }
      })
    })

    return {
      groupCount: groupRows.value.length,
      tagCount: tagRows.value.length,
      permissionResourceCount: permissionRows.value.length,
      permissionTeamCount: teamNames.size
    }
  })

  async function loadOverviewMetrics() {
    overviewLoading.value = true

    const [assetTypeRes, osRes, trendRes, groupRes, connectionRes] = await Promise.allSettled([
      overviewApi.getAssetTypeCount(),
      overviewApi.getOsDistribution(),
      overviewApi.getNewAssetCount(),
      overviewApi.getGroupAssetCount(),
      overviewApi.getConnectionCount()
    ])

    if (assetTypeRes.status === 'fulfilled') {
      assetTypeData.value = extractRecords(assetTypeRes.value)

      // ACM_CIT_MANAGE 只统计在线设备数量，需要额外请求获取包含所有状态的真实总数
      if (assetTypeData.value.length) {
        const countPromises = assetTypeData.value.map(item => {
          const typeCode = item.code || item.title || ''
          return assetApi
            .getAssetList(
              {
                assetType: typeCode,
                permission: 'r',
                status: 'all',
                CONN_LATEST_STATUS: '',
                hostKeys: '/'
              },
              { page: 1, size: 1, filter: '' }
            )
            .then(res => ({ typeCode, total: toNumber(res?.total) }))
            .catch(() => ({ typeCode, total: toNumber(item?.count) })) // 失败时保留原值
        })
        const countResults = await Promise.all(countPromises)
        const countMap = Object.fromEntries(countResults.map(r => [r.typeCode, r.total]))
        assetTypeData.value = assetTypeData.value.map(item => {
          const key = item.code || item.title || ''
          return { ...item, count: countMap[key] ?? toNumber(item?.count) }
        })
      }
    } else {
      console.error('加载资产类型统计失败:', assetTypeRes.reason)
      assetTypeData.value = []
    }

    if (osRes.status === 'fulfilled') {
      osDistributionData.value = extractRecords(osRes.value)
    } else {
      console.error('加载操作系统分布失败:', osRes.reason)
      osDistributionData.value = []
    }

    if (trendRes.status === 'fulfilled') {
      newAssetData.value = [...extractRecords(trendRes.value)].sort(
        (a, b) => toTimestamp(a?.times) - toTimestamp(b?.times)
      )
    } else {
      console.error('加载新增资产趋势失败:', trendRes.reason)
      newAssetData.value = []
    }

    if (groupRes.status === 'fulfilled') {
      groupAssetData.value = extractRecords(groupRes.value)
    } else {
      console.error('加载分组分布失败:', groupRes.reason)
      groupAssetData.value = []
    }

    if (connectionRes.status === 'fulfilled') {
      connectionData.value = extractRecords(connectionRes.value)
    } else {
      console.error('加载连通性统计失败:', connectionRes.reason)
      connectionData.value = []
    }

    overviewLoading.value = false
  }

  async function loadGovernanceData() {
    governanceLoading.value = true

    const [groupRes, tagRes, permissionRes] = await Promise.allSettled([
      dataManageApi.getAllGroups('sjxy_all'),
      dataManageApi.getAllTags('sjxy_all'),
      permissionApi.getTablePermission()
    ])

    if (groupRes.status === 'fulfilled') {
      groupRows.value = extractRecords(groupRes.value)
    } else {
      console.error('加载分组列表失败:', groupRes.reason)
      groupRows.value = []
    }

    if (tagRes.status === 'fulfilled') {
      tagRows.value = extractRecords(tagRes.value)
    } else {
      console.error('加载标签列表失败:', tagRes.reason)
      tagRows.value = []
    }

    if (permissionRes.status === 'fulfilled') {
      permissionRows.value = extractPermissionRows(permissionRes.value)
    } else {
      console.error('加载资源权限失败:', permissionRes.reason)
      permissionRows.value = []
    }

    governanceLoading.value = false
  }

  async function loadRecentOperations() {
    logLoading.value = true

    const [logRes, errorRes] = await Promise.allSettled([
      operationLogApi.getOperationLogs(
        {
          module: 'acm',
          action: 'all',
          status: 'all',
          day: 7
        },
        {
          page: 1,
          size: 6
        }
      ),
      operationLogApi.getOperationLogs(
        {
          module: 'acm',
          action: 'all',
          status: 'ERROR',
          day: 7
        },
        {
          page: 1,
          size: 1
        }
      )
    ])

    if (logRes.status === 'fulfilled') {
      recentLogs.value = [...extractRecords(logRes.value)].sort(
        (a, b) => toTimestamp(b?.start_time) - toTimestamp(a?.start_time)
      )
      recentOperationTotal.value = toNumber(logRes.value?.total ?? recentLogs.value.length)
    } else {
      console.error('加载最近操作失败:', logRes.reason)
      recentLogs.value = []
      recentOperationTotal.value = 0
    }

    if (errorRes.status === 'fulfilled') {
      recentErrorTotal.value = toNumber(errorRes.value?.total)
    } else {
      console.error('加载错误操作统计失败:', errorRes.reason)
      recentErrorTotal.value = 0
    }

    logLoading.value = false
  }

  async function refreshAll() {
    refreshing.value = true
    await Promise.allSettled([loadOverviewMetrics(), loadGovernanceData(), loadRecentOperations()])
    refreshing.value = false
  }

  return {
    assetTypeData,
    osDistributionData,
    newAssetData,
    groupAssetData,
    connectionData,
    groupRows,
    tagRows,
    permissionRows,
    topAssetType,
    topOs,
    latestTrendPoint,
    totalAssets,
    assetTypeCount,
    connectionStats,
    topGroups,
    topTags,
    governanceStats,
    recentLogs,
    recentOperationTotal,
    recentErrorTotal,
    overviewLoading,
    governanceLoading,
    logLoading,
    refreshing,
    refreshAll,
    loadOverviewMetrics,
    loadGovernanceData,
    loadRecentOperations,
    formatCount,
    formatPercent,
    toNumber
  }
}

export default useAssetOverviewWorkbench
