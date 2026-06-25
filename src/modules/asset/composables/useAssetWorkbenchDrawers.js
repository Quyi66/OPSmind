/**
 * 资产工作台抽屉与弹窗状态管理
 * 从 AssetOverviewPage.vue 提取，减少单文件体积
 */
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { assetApi, exceptionApi, operationLogApi, overviewApi } from '../api'
import { ensureArray, normalizePagedResponse, toNumber } from '../utils/response'

function formatCount(value) {
  return toNumber(value).toLocaleString('zh-CN')
}

function formatDateTime(value) {
  if (!value) return '--'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '--'
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDateTimeShort(value) {
  return formatDateTime(value)
}

function formatConnRate(value) {
  if (value === null || value === undefined || value === '') return '--'
  return `${toNumber(value)}%`
}

function getConnStatusText(status) {
  if (status === null || status === 'null' || status === undefined) return '未测试'
  if (status == 0) return '最近失败'
  if (status == 1) return '最近成功'
  return '状态未知'
}

import { translateI18nKey } from '@/utils/i18n'

function getOperationActionLabel(action) {
  if (!action) return '未知操作'
  const actionLabelMap = {
    asset_import: '资产导入'
  }
  if (actionLabelMap[action]) return actionLabelMap[action]
  return translateI18nKey(action)
}

function formatOperationMessage(message) {
  if (!message) return '无失败详情'
  try {
    const p = typeof message === 'string' ? JSON.parse(message) : message
    return p?.exception?.message || p?.message || p?.msg_id || JSON.stringify(p)
  } catch {
    return String(message)
  }
}

export function useAssetWorkbenchDrawers({
  assetDetailDialogVisible,
  currentAssetId,
  runResultDialogVisible,
  runResultMeta,
  getOperationActionLabel: getActionLabel
} = {}) {
  const router = useRouter()

  // ── 抽屉状态 ──
  const assetListDrawer = reactive({
    visible: false,
    loading: false,
    records: [],
    keyword: '',
    filterType: '',
    total: 0,
    page: 1,
    pageSize: 20
  })
  const exceptionDrawer = reactive({
    visible: false,
    loading: false,
    records: [],
    total: 0,
    page: 1,
    pageSize: 20,
    actionLoading: false
  })
  const failedLogDrawer = reactive({ visible: false, loading: false, records: [] })
  const recentLogsDrawer = reactive({
    visible: false,
    loading: false,
    records: [],
    total: 0,
    page: 1,
    pageSize: 20
  })
  const governanceDrawer = reactive({ visible: false, loading: false })

  // ── 计算 ──
  const assetListDrawerTitle = computed(() => {
    return assetListDrawer.filterType ? `设备清单 · ${assetListDrawer.filterType}` : '设备清单'
  })

  // ── 资产列表抽屉 ──
  async function openAssetListDrawer(ciType, isSearch = false, goPage) {
    assetListDrawer.filterType = ciType || ''
    if (typeof goPage === 'number') {
      assetListDrawer.page = goPage
    } else if (isSearch) {
      // 与 AssetInfoPage 行为一致：执行筛选时回到第一页
      assetListDrawer.page = 1
    } else if (!isSearch) {
      assetListDrawer.keyword = ''
      assetListDrawer.page = 1
    }
    assetListDrawer.visible = true
    assetListDrawer.loading = true
    try {
      const res = await assetApi.getAssetList(
        {
          assetType: assetListDrawer.filterType || '',
          permission: 'r',
          status: 'all',
          CONN_LATEST_STATUS: '',
          hostKeys: '/'
        },
        {
          page: assetListDrawer.page,
          size: assetListDrawer.pageSize,
          filter: assetListDrawer.keyword || ''
        }
      )
      const normalized = normalizePagedResponse(res)
      assetListDrawer.records = normalized.records
      assetListDrawer.total = normalized.total
    } catch (e) {
      console.error('加载设备清单失败:', e)
      assetListDrawer.records = []
      assetListDrawer.total = 0
    } finally {
      assetListDrawer.loading = false
    }
  }

  function handleAssetListPageChange(page) {
    openAssetListDrawer(assetListDrawer.filterType, true, page)
  }

  function handleAssetListPageSizeChange(size) {
    assetListDrawer.pageSize = Number(size) || assetListDrawer.pageSize
    assetListDrawer.page = 1
    openAssetListDrawer(assetListDrawer.filterType, true, 1)
  }

  function handleViewAssetDetail(item) {
    if (!item?.id) return
    // 打开资产详情弹窗
    if (currentAssetId) {
      currentAssetId.value = item.id
      assetDetailDialogVisible.value = true
    }
  }

  // ── 异常设备抽屉 ──
  async function openExceptionDrawer(goPage) {
    exceptionDrawer.page = typeof goPage === 'number' ? goPage : 1
    exceptionDrawer.visible = true
    exceptionDrawer.loading = true
    try {
      const response = await exceptionApi.getExceptionDevices(
        { cit: 'oplus_all', conditions: 'recently', param: 'rwx' },
        { page: exceptionDrawer.page, size: exceptionDrawer.pageSize }
      )
      const { records: rows, total } = normalizePagedResponse(response)
      exceptionDrawer.records = rows.map(row => ({
        key: row.IP || row.ci_name || `${row.updated_at || ''}-${row.CONN_RATE || ''}`,
        title: row.IP || '未识别 IP',
        badge: formatConnRate(row.CONN_RATE),
        desc: row.ci_name || '未命名资产',
        meta: `${getConnStatusText(row.CONN_LATEST_STATUS)} · ${formatDateTimeShort(row.updated_at)}`,
        raw: row
      }))
      exceptionDrawer.total = total
    } catch (e) {
      console.error(e)
      exceptionDrawer.records = []
      exceptionDrawer.total = 0
    } finally {
      exceptionDrawer.loading = false
    }
  }

  function handleExceptionPageChange(page) {
    openExceptionDrawer(page)
  }

  function handleExceptionPageSizeChange(size) {
    exceptionDrawer.pageSize = Number(size) || exceptionDrawer.pageSize
    exceptionDrawer.page = 1
    openExceptionDrawer(1)
  }

  function handleOpenExceptionDevicePage() {
    router.push({ path: '/acm/exception', query: { conditions: 'recently' } })
  }

  // ── 失败日志抽屉 ──
  async function openFailedLogDrawer() {
    failedLogDrawer.visible = true
    failedLogDrawer.loading = true
    try {
      const response = await operationLogApi.getOperationLogs(
        { module: 'acm', action: 'all', status: 'ERROR', day: 7 },
        { page: 1, size: 20 }
      )
      const { records: rows } = normalizePagedResponse(response)
      failedLogDrawer.records = rows.map(row => {
        const actionLabel = getActionLabel
          ? getActionLabel(row.action)
          : getOperationActionLabel(row.action)
        return {
          key: row.run_id || `${row.start_time || ''}-${row.action || ''}`,
          title: actionLabel,
          badge: formatDateTimeShort(row.start_time),
          desc: formatOperationMessage(row.message),
          meta: `${row.ata_node || '--'} · ${row.username || '--'}`,
          raw: row
        }
      })
    } catch (e) {
      console.error(e)
      failedLogDrawer.records = []
    } finally {
      failedLogDrawer.loading = false
    }
  }

  function handleFailedLogClick(row) {
    if (!row?.run_id) return
    if (runResultMeta) {
      runResultMeta.value = {
        runId: row.run_id,
        jobTitle: getActionLabel ? getActionLabel(row.action) : getOperationActionLabel(row.action)
      }
      runResultDialogVisible.value = true
    }
  }

  function handleOpenFailedLogPage() {
    router.push({ path: '/acm/log', query: { day: '7', status: 'ERROR' } })
  }

  // ── 操作记录抽屉 ──
  async function openRecentLogsDrawer(goPage) {
    recentLogsDrawer.page = typeof goPage === 'number' ? goPage : 1
    recentLogsDrawer.visible = true
    recentLogsDrawer.loading = true
    try {
      const response = await operationLogApi.getOperationLogs(
        { module: 'acm', action: 'all', status: 'all', day: 7 },
        { page: recentLogsDrawer.page, size: recentLogsDrawer.pageSize }
      )
      const normalized = normalizePagedResponse(response)
      recentLogsDrawer.records = ensureArray(normalized.records)
      recentLogsDrawer.total = normalized.total
    } catch (e) {
      console.error('加载操作记录抽屉数据失败:', e)
      recentLogsDrawer.records = []
      recentLogsDrawer.total = 0
    } finally {
      recentLogsDrawer.loading = false
    }
  }

  function handleRecentLogsPageChange(page) {
    openRecentLogsDrawer(page)
  }

  function handleRecentLogsPageSizeChange(size) {
    recentLogsDrawer.pageSize = Number(size) || recentLogsDrawer.pageSize
    recentLogsDrawer.page = 1
    openRecentLogsDrawer(1)
  }

  function handleLogItemClick(item) {
    if (!item?.run_id) return
    if (runResultMeta) {
      runResultMeta.value = {
        runId: item.run_id,
        jobTitle: getActionLabel
          ? getActionLabel(item.action)
          : getOperationActionLabel(item.action)
      }
      runResultDialogVisible.value = true
    }
  }

  function handleOpenOperationLogPage() {
    router.push({ path: '/acm/log', query: { day: '7', status: 'all' } })
  }

  // ── 分组与标签抽屉 ──
  function openGovernanceDrawer() {
    governanceDrawer.visible = true
    governanceDrawer.loading = false
  }

  function finishGovernanceLoading() {
    governanceDrawer.loading = false
  }

  return {
    // state
    assetListDrawer,
    exceptionDrawer,
    failedLogDrawer,
    recentLogsDrawer,
    governanceDrawer,
    // computed
    assetListDrawerTitle,
    // functions
    openAssetListDrawer,
    handleAssetListPageChange,
    handleAssetListPageSizeChange,
    handleViewAssetDetail,
    openExceptionDrawer,
    handleExceptionPageChange,
    handleExceptionPageSizeChange,
    handleOpenExceptionDevicePage,
    openFailedLogDrawer,
    handleFailedLogClick,
    handleOpenFailedLogPage,
    openRecentLogsDrawer,
    handleRecentLogsPageChange,
    handleRecentLogsPageSizeChange,
    handleLogItemClick,
    handleOpenOperationLogPage,
    openGovernanceDrawer
  }
}
