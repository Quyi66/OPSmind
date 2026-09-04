import { computed, ref } from 'vue'
import { assetApi, dataManageApi, operationLogApi, overviewApi, permissionApi } from '../api'
import { extractRecords, extractTotal, toNumber } from './response'

const ASSET_TYPE_TOTAL_CONCURRENCY = 4

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
  const connectionSummary = ref({ successCount: 0, failureCount: 0 })
  const groupRows = ref([])
  const tagRows = ref([])
  const permissionRows = ref([])
  const recentLogs = ref([])
  const recentOperationTotal = ref(0)
  const recentErrorTotal = ref(0)
  const assetTypeTotalsCache = new Map()
  let assetTypeTotalsRequestId = 0

  const overviewLoading = ref(false)
  const governanceLoading = ref(false)
  const logLoading = ref(false)
  const refreshing = ref(false)

  const totalAssets = computed(() =>
    assetTypeData.value.reduce((sum, item) => sum + toNumber(item?.count), 0)
  )

  const assetTypeCount = computed(
    () => assetTypeData.value.filter(item => toNumber(item?.count) > 0).length
  )

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
    const successCount = toNumber(connectionSummary.value.successCount)
    const failureCount = toNumber(connectionSummary.value.failureCount)

    const totalConnection = successCount + failureCount
    const rawRate = totalConnection ? (successCount / totalConnection) * 100 : 0
    const successRate = totalConnection ? Number(rawRate.toFixed(2)) : 0

    return {
      successCount,
      failureCount,
      anomalyCount: failureCount,
      totalConnection,
      successRate
    }
  })

  async function loadConnectionSummary(assetTypes) {
    let successCount = 0

    for (let index = 0; index < assetTypes.length; index += ASSET_TYPE_TOTAL_CONCURRENCY) {
      const chunk = assetTypes.slice(index, index + ASSET_TYPE_TOTAL_CONCURRENCY)
      const normalTotals = await Promise.all(
        chunk.map(async item => {
          const assetType = item?.code || item?.title || ''
          if (!assetType) return 0

          const response = await assetApi.getAssetList(
            {
              assetType,
              permission: 'r',
              status: 'all',
              CONN_LATEST_STATUS: '1',
              hostKeys: '@@'
            },
            { page: 1, size: 1, filter: '' }
          )
          return extractTotal(response, 0)
        })
      )

      successCount += normalTotals.reduce((sum, total) => sum + toNumber(total), 0)
    }

    const totalConnection = assetTypes.reduce(
      (sum, item) => sum + toNumber(item?.count),
      0
    )

    return {
      successCount,
      failureCount: Math.max(totalConnection - successCount, 0)
    }
  }

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

  async function resolveAssetTypeTotals(assetTypes, forceRefresh = false) {
    const pendingItems = assetTypes.filter(item => {
      const typeCode = item?.code || item?.title || ''
      return typeCode && (forceRefresh || !assetTypeTotalsCache.has(typeCode))
    })

    if (!pendingItems.length) {
      return assetTypes.map(item => {
        const typeCode = item?.code || item?.title || ''
        return {
          ...item,
          count: assetTypeTotalsCache.get(typeCode) ?? toNumber(item?.count)
        }
      })
    }

    const requestId = assetTypeTotalsRequestId + 1
    assetTypeTotalsRequestId = requestId

    for (let index = 0; index < pendingItems.length; index += ASSET_TYPE_TOTAL_CONCURRENCY) {
      const chunk = pendingItems.slice(index, index + ASSET_TYPE_TOTAL_CONCURRENCY)
      const results = await Promise.all(
        chunk.map(async item => {
          const typeCode = item.code || item.title || ''
          try {
            const response = await assetApi.getAssetList(
              {
                assetType: typeCode,
                permission: 'r',
                status: 'all',
                CONN_LATEST_STATUS: '',
                hostKeys: '@@'
              },
              { page: 1, size: 1, filter: '' }
            )
            return { typeCode, total: extractTotal(response, toNumber(item?.count)) }
          } catch {
            return { typeCode, total: toNumber(item?.count) }
          }
        })
      )

      if (requestId !== assetTypeTotalsRequestId) {
        return assetTypes.map(item => ({ ...item, count: toNumber(item?.count) }))
      }

      results.forEach(({ typeCode, total }) => {
        assetTypeTotalsCache.set(typeCode, total)
      })
    }

    return assetTypes.map(item => {
      const typeCode = item?.code || item?.title || ''
      return {
        ...item,
        count: assetTypeTotalsCache.get(typeCode) ?? toNumber(item?.count)
      }
    })
  }

  async function loadOverviewMetrics(options = {}) {
    const { forceAssetTypeTotals = false } = options
    overviewLoading.value = true

    const [assetTypeRes, osRes, trendRes, groupRes] = await Promise.allSettled([
      overviewApi.getAssetTypeCount(),
      overviewApi.getOsDistribution(),
      overviewApi.getNewAssetCount(),
      overviewApi.getGroupAssetCount()
    ])

    if (assetTypeRes.status === 'fulfilled') {
      assetTypeData.value = extractRecords(assetTypeRes.value)

      // ACM_CIT_MANAGE 只统计在线设备数量，需要额外请求获取包含所有状态的真实总数
      if (assetTypeData.value.length) {
        assetTypeData.value = await resolveAssetTypeTotals(
          assetTypeData.value,
          forceAssetTypeTotals
        )
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

    try {
      connectionSummary.value = await loadConnectionSummary(assetTypeData.value)
    } catch (error) {
      console.error('加载连通性统计失败:', error)
      connectionSummary.value = { successCount: 0, failureCount: 0 }
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
          module: 'cmdb',
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
          module: 'cmdb',
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

  async function refreshAll(options = {}) {
    refreshing.value = true
    await Promise.allSettled([
      loadOverviewMetrics(options),
      loadGovernanceData(),
      loadRecentOperations()
    ])
    refreshing.value = false
  }

  return {
    assetTypeData,
    osDistributionData,
    newAssetData,
    groupAssetData,
    connectionSummary,
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
