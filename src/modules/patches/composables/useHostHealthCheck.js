/**
 * 主机健康巡检业务逻辑 Composable
 * 负责概览统计、主机列表分页筛选、触发巡检及 RUNNING 状态自动轮询
 */

import { ref, reactive, computed, onBeforeUnmount, onDeactivated, onActivated } from 'vue'
import { ElMessage } from 'element-plus'
import { hostHealthApi } from '../api/hostHealth'
import { normalizeHealthSummary, normalizeHealthHostsResponse } from '../utils/hostHealth'

const DEFAULT_POLL_INTERVAL_MS = 3000

export function useHostHealthCheck(options = {}) {
  const pollIntervalMs = options.pollIntervalMs || DEFAULT_POLL_INTERVAL_MS

  const summaryLoading = ref(false)
  const hostsLoading = ref(false)
  const runSubmitting = ref(false)
  const isPolling = ref(false)

  const summary = ref(normalizeHealthSummary({}))
  const hostList = ref([])
  const total = ref(0)
  const selectedHosts = ref([])

  const filters = reactive({
    status: '',
    keyword: '',
    page: 1,
    size: 20
  })

  let pollTimer = null
  let isUnmounted = false

  const isRunInProgress = computed(
    () => summary.value?.latestRun?.status === 'RUNNING' || isPolling.value
  )

  const selectedHostIds = computed(() =>
    selectedHosts.value.map(item => item?.hostId).filter(Boolean)
  )

  function stopPolling() {
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
    isPolling.value = false
  }

  function scheduleNextPoll() {
    if (isUnmounted) return
    if (pollTimer) {
      clearTimeout(pollTimer)
    }
    isPolling.value = true
    pollTimer = setTimeout(async () => {
      if (isUnmounted) return
      try {
        const raw = await hostHealthApi.getSummary()
        if (isUnmounted) return
        const nextSummary = normalizeHealthSummary(raw)
        summary.value = nextSummary

        if (nextSummary.latestRun?.status === 'RUNNING') {
          scheduleNextPoll()
        } else {
          stopPolling()
          if (nextSummary.latestRun?.status === 'COMPLETED') {
            ElMessage.success(nextSummary.latestRun.message || '主机健康巡检已完成')
          } else if (nextSummary.latestRun?.status === 'FAILED') {
            ElMessage.warning(nextSummary.latestRun.message || '主机健康巡检执行结束（存在异常）')
          }
          await loadHosts()
        }
      } catch (error) {
        console.error('轮询主机健康概览失败:', error)
        stopPolling()
      }
    }, pollIntervalMs)
  }

  async function loadSummary(silent = false) {
    if (!silent) {
      summaryLoading.value = true
    }
    try {
      const raw = await hostHealthApi.getSummary()
      if (isUnmounted) return
      const nextSummary = normalizeHealthSummary(raw)
      summary.value = nextSummary

      if (nextSummary.latestRun?.status === 'RUNNING') {
        scheduleNextPoll()
      } else {
        stopPolling()
      }
      return nextSummary
    } catch (error) {
      console.error('加载主机健康概览失败:', error)
      if (!silent) {
        ElMessage.error(error?.message || '加载健康概览失败')
      }
      return null
    } finally {
      if (!silent) {
        summaryLoading.value = false
      }
    }
  }

  async function loadHosts() {
    hostsLoading.value = true
    try {
      const raw = await hostHealthApi.getHosts({
        status: filters.status,
        keyword: filters.keyword,
        page: filters.page,
        size: filters.size
      })
      if (isUnmounted) return
      const normalized = normalizeHealthHostsResponse(raw)
      hostList.value = normalized.list
      total.value = normalized.total
      return normalized
    } catch (error) {
      console.error('加载主机健康列表失败:', error)
      ElMessage.error(error?.message || '加载主机健康列表失败')
      hostList.value = []
      total.value = 0
      return { total: 0, list: [] }
    } finally {
      hostsLoading.value = false
    }
  }

  async function refreshAll() {
    await Promise.all([loadSummary(), loadHosts()])
  }

  function handleSearch() {
    filters.page = 1
    loadHosts()
  }

  function handleResetFilters() {
    filters.status = ''
    filters.keyword = ''
    filters.page = 1
    loadHosts()
  }

  function handleStatusCardFilter(statusValue) {
    filters.status = filters.status === statusValue ? '' : statusValue
    filters.page = 1
    loadHosts()
  }

  function handlePageChange(nextPage) {
    filters.page = nextPage
    loadHosts()
  }

  function handleSizeChange(nextSize) {
    filters.size = Math.min(Number(nextSize) || 20, 200)
    filters.page = 1
    loadHosts()
  }

  function handleSelectionChange(rows) {
    selectedHosts.value = Array.isArray(rows) ? rows : []
  }

  /**
   * 触发立即巡检（全部主机或指定主机 ID 列表）
   * @param {Array<string>} [hostIds]
   * @returns {Promise<string|null>} 成功下发时返回 runId，否则返回 null
   */
  async function triggerHealthRun(hostIds) {
    if (runSubmitting.value || isRunInProgress.value) return null
    runSubmitting.value = true
    try {
      const targetIds = Array.isArray(hostIds)
        ? hostIds.map(id => String(id || '').trim()).filter(Boolean)
        : []

      const res = await hostHealthApi.runHealthCheck(targetIds.length ? targetIds : undefined)
      const runId = res?.runId ?? null
      const msg = res?.message || (runId ? '巡检已下发' : '无法发起巡检')

      if (!runId) {
        ElMessage.warning(msg)
        await loadSummary(true)
        return null
      }

      ElMessage.success(msg)
      // 立即更新概览并进入轮询，直到 latestRun.status 不为 RUNNING 后自动刷新列表
      const latest = await loadSummary(true)
      if (latest && latest.latestRun?.status !== 'RUNNING') {
        // 若后端尚未切换为 RUNNING 或极快完成，仍启动一次轮询确认
        scheduleNextPoll()
      }
      return String(runId)
    } catch (error) {
      console.error('触发主机健康巡检失败:', error)
      ElMessage.error(error?.message || '触发主机健康巡检失败')
      return null
    } finally {
      runSubmitting.value = false
    }
  }

  onDeactivated(() => {
    stopPolling()
  })

  onActivated(() => {
    if (summary.value?.latestRun?.status === 'RUNNING') {
      scheduleNextPoll()
    }
  })

  onBeforeUnmount(() => {
    isUnmounted = true
    stopPolling()
  })

  return {
    summaryLoading,
    hostsLoading,
    runSubmitting,
    isPolling,
    isRunInProgress,
    summary,
    hostList,
    total,
    filters,
    selectedHosts,
    selectedHostIds,
    loadSummary,
    loadHosts,
    refreshAll,
    handleSearch,
    handleResetFilters,
    handleStatusCardFilter,
    handlePageChange,
    handleSizeChange,
    handleSelectionChange,
    triggerHealthRun,
    stopPolling
  }
}
