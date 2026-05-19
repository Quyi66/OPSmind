import { computed, ref } from 'vue'
import { apiService } from '@/core/api'
import * as jaoApi from '@/modules/automation/api/jao'
import { useReviewCountStore } from '@/stores/useReviewCountStore.js'

const EMPTY_TOTAL_JOB_STATS = Object.freeze({
  restJobs: 0,
  scriptJobs: 0,
  commandJobs: 0
})

const EMPTY_DASHBOARD_DATA = Object.freeze({
  totalJobStats: EMPTY_TOTAL_JOB_STATS,
  recentJobStats: []
})

function createRunLogPayload({ day = '0', status = 'all', size = 1, page = 1 } = {}) {
  return {
    params: {
      day,
      job_id: '',
      type: '',
      run_ids: '',
      status
    },
    size,
    page,
    orderBy: 'start_time desc'
  }
}

function unwrapResponseData(response) {
  return response?.data || response || {}
}

export function useAutomationWorkbench({ canViewJobs = true } = {}) {
  const reviewStore = useReviewCountStore()

  const loading = ref(false)
  const dashboardData = ref({ ...EMPTY_DASHBOARD_DATA })
  const todayRunTotal = ref(0)
  const failedRunTotal = ref(0)
  const recentFailedRuns = ref([])
  const cronJobs = ref([])

  const jobTypeTotals = computed(() => {
    const totals = dashboardData.value?.totalJobStats || EMPTY_TOTAL_JOB_STATS

    return [
      {
        key: 'rest',
        label: 'REST作业',
        value: totals.restJobs || 0,
        type: 'rest'
      },
      {
        key: 'command',
        label: '命令作业',
        value: totals.commandJobs || 0,
        type: 'command'
      },
      {
        key: 'script',
        label: '脚本作业',
        value: totals.scriptJobs || 0,
        type: 'script'
      }
    ]
  })

  const trendRows = computed(() => {
    const rows = Array.isArray(dashboardData.value?.recentJobStats)
      ? dashboardData.value.recentJobStats.slice(-7)
      : []
    const max = Math.max(1, ...rows.map(item => item.totalJobs || 0))

    return rows.map(item => ({
      date: item.date,
      total: item.totalJobs || 0,
      ratio: Math.max(10, Math.round(((item.totalJobs || 0) / max) * 100))
    }))
  })

  const cronSummary = computed(() => {
    const total = cronJobs.value.length
    const enabled = cronJobs.value.filter(item => item.triggerStatus === '1').length
    const disabled = total - enabled

    return {
      total,
      enabled,
      disabled
    }
  })

  const highlightedCronJobs = computed(() => {
    const enabledJobs = cronJobs.value.filter(item => item.triggerStatus === '1')
    if (enabledJobs.length) {
      return enabledJobs.slice(0, 5)
    }

    return cronJobs.value.slice(0, 5)
  })

  async function loadDashboardData() {
    if (!canViewJobs) {
      dashboardData.value = { ...EMPTY_DASHBOARD_DATA }
      return
    }

    try {
      const data = await apiService.getDashboardFullData()
      dashboardData.value = {
        totalJobStats: data?.totalJobStats || EMPTY_TOTAL_JOB_STATS,
        recentJobStats: Array.isArray(data?.recentJobStats) ? data.recentJobStats : []
      }
    } catch (error) {
      dashboardData.value = { ...EMPTY_DASHBOARD_DATA }
      console.warn('Failed to load automation workbench dashboard data', error)
    }
  }

  async function loadRunLogData() {
    if (!canViewJobs) {
      todayRunTotal.value = 0
      failedRunTotal.value = 0
      recentFailedRuns.value = []
      return
    }

    try {
      const [todayRunsResponse, failedTotalResponse, failedListResponse] = await Promise.all([
        jaoApi.fetchJobRunLogs(createRunLogPayload({ day: '0', status: 'all', size: 1 })),
        jaoApi.fetchJobRunLogs(createRunLogPayload({ day: '0', status: 'FAILED', size: 1 })),
        jaoApi.fetchJobRunLogs(createRunLogPayload({ day: '0', status: 'FAILED', size: 5 }))
      ])

      todayRunTotal.value = Number(unwrapResponseData(todayRunsResponse).total || 0)
      failedRunTotal.value = Number(unwrapResponseData(failedTotalResponse).total || 0)
      recentFailedRuns.value = Array.isArray(unwrapResponseData(failedListResponse).records)
        ? unwrapResponseData(failedListResponse).records
        : []
    } catch (error) {
      todayRunTotal.value = 0
      failedRunTotal.value = 0
      recentFailedRuns.value = []
      console.warn('Failed to load automation workbench run log data', error)
    }
  }

  async function loadCronData() {
    if (!canViewJobs) {
      cronJobs.value = []
      return
    }

    try {
      const response = await jaoApi.fetchCronJobs()
      const rows = unwrapResponseData(response)
      cronJobs.value = Array.isArray(rows) ? rows : []
    } catch (error) {
      cronJobs.value = []
      console.warn('Failed to load automation workbench cron data', error)
    }
  }

  async function refreshAll() {
    loading.value = true

    try {
      await Promise.allSettled([
        reviewStore.fetchAll(),
        loadDashboardData(),
        loadRunLogData(),
        loadCronData()
      ])
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    reviewStore,
    todayRunTotal,
    failedRunTotal,
    recentFailedRuns,
    jobTypeTotals,
    trendRows,
    cronSummary,
    highlightedCronJobs,
    refreshAll
  }
}
