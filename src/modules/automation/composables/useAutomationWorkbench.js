import { computed, onActivated, onDeactivated, onScopeDispose, ref } from 'vue'
import { ElMessage } from 'element-plus'
import * as jaoApi from '@/modules/automation/api/jao'
import { findAllUnapprovedCommand, findCommandByTenantId } from '@/modules/automation/api/command'
import { listFiles as gfsListFiles } from '@/modules/automation/api/gfs'
import { useReviewCountStore } from '@/stores/useReviewCountStore.js'

const ACTIVE_RUN_STATUSES = ['WAITING', 'RUNNING', 'CALLBACK']

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

function resolveRunLogTotal(data) {
  const records = Array.isArray(data?.records) ? data.records : []
  return Number(data?.total ?? data?.count ?? records.length ?? 0) || 0
}

function normalizeRunStatus(status) {
  return String(status || '')
    .trim()
    .toUpperCase()
}

function countActiveRunRecords(records) {
  if (!Array.isArray(records)) return 0
  return records.filter(item => ACTIVE_RUN_STATUSES.includes(normalizeRunStatus(item?.status)))
    .length
}

export function useAutomationWorkbench({ canViewJobs = true, canViewCommands = true } = {}) {
  const reviewStore = useReviewCountStore()

  const loading = ref(false)
  const todayRunTotal = ref(0)
  const failedRunTotal = ref(0)
  const activeRunCount = ref(0)
  const todayRunRecords = ref([])
  const cronJobs = ref([])
  const jobList = ref([])
  const flows = ref([])
  const commandList = ref([])
  let activeRunPollingTimer = 0

  const JOB_TYPE_META = [
    { key: 'rest', label: 'REST运维工具', type: 'rest' },
    { key: 'command', label: '命令运维工具', type: 'command' },
    { key: 'script', label: '脚本运维工具', type: 'script' }
  ]
  const CMD_TYPE_META = [
    { key: 'cmd', label: 'CMD', type: 'cmd' },
    { key: 'shell', label: 'Shell', type: 'shell' },
    { key: 'python', label: 'Python', type: 'python' },
    { key: 'playbook', label: 'Playbook', type: 'playbook' },
    { key: 'powershell', label: 'PowerShell', type: 'powershell' }
  ]

  const jobTypeCounts = computed(() =>
    JOB_TYPE_META.map(m => ({ ...m, value: jobList.value.filter(j => j.type === m.type).length }))
  )

  const commandJobList = computed(() =>
    jobList.value
      .filter(item => item.type === 'command')
      .slice()
      .sort((left, right) => {
        const leftTime = new Date(left?.updatedAt || left?.createdAt || 0).getTime() || 0
        const rightTime = new Date(right?.updatedAt || right?.createdAt || 0).getTime() || 0
        return rightTime - leftTime
      })
  )

  const commandTypeCounts = computed(() =>
    CMD_TYPE_META.map(m => ({
      ...m,
      value: commandList.value.filter(c => c.type === m.type).length
    })).filter(item => item.value > 0)
  )

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

  const hasActiveRuns = computed(() => activeRunCount.value > 0)

  async function loadRunLogData() {
    if (!canViewJobs) {
      todayRunTotal.value = 0
      failedRunTotal.value = 0
      activeRunCount.value = 0
      todayRunRecords.value = []
      stopActiveRunPolling()
      return
    }

    try {
      const [todayRunsResult, failedRunsResult, activeTotals] = await Promise.all([
        fetchTodayRuns(20),
        fetchFailedRuns(20),
        fetchActiveRunTotals()
      ])

      todayRunTotal.value = todayRunsResult.total
      failedRunTotal.value = failedRunsResult.total
      activeRunCount.value = Math.max(activeTotals, countActiveRunRecords(todayRunsResult.records))
      todayRunRecords.value = todayRunsResult.records
      syncActiveRunPolling()
    } catch (error) {
      todayRunTotal.value = 0
      failedRunTotal.value = 0
      activeRunCount.value = 0
      todayRunRecords.value = []
      stopActiveRunPolling()
      console.warn('Failed to load automation workbench run log data', error)
    }
  }

  async function fetchActiveRunTotals() {
    const totals = await Promise.all(
      ACTIVE_RUN_STATUSES.map(status => fetchRunTotalByStatus(status))
    )
    return totals.reduce((sum, count) => sum + count, 0)
  }

  async function fetchRunTotalByStatus(status) {
    const response = await jaoApi.fetchJobRunLogs(
      createRunLogPayload({ day: '0', status, size: 1 })
    )
    return resolveRunLogTotal(unwrapResponseData(response))
  }

  function syncActiveRunPolling() {
    if (activeRunCount.value > 0) {
      scheduleActiveRunPolling()
      return
    }

    stopActiveRunPolling()
  }

  function scheduleActiveRunPolling(delay = 5000) {
    stopActiveRunPolling()
    activeRunPollingTimer = setTimeout(() => {
      activeRunPollingTimer = 0
      void loadRunLogData()
    }, delay)
  }

  function stopActiveRunPolling() {
    if (activeRunPollingTimer) {
      clearTimeout(activeRunPollingTimer)
      activeRunPollingTimer = 0
    }
  }

  async function loadJobListData() {
    if (!canViewJobs) {
      jobList.value = []
      return
    }
    try {
      const res = await jaoApi.appTableList({ appletCode: '' })
      jobList.value = Array.isArray(res?.data) ? res.data : []
    } catch {
      jobList.value = []
    }
  }

  async function loadFlowData() {
    if (!canViewJobs) {
      flows.value = []
      return
    }
    try {
      const res = await jaoApi.fetchFlows()
      const raw = res?.data || res || []
      flows.value = Array.isArray(raw)
        ? raw
            .map(r => ({
              id: r.id ?? r.flowId ?? '',
              name: r.name ?? r.flowName ?? '未命名流程',
              updatedAt: r.updatedAt ?? r.updated_at ?? ''
            }))
            .filter(f => f.id)
        : []
    } catch {
      flows.value = []
    }
  }

  async function loadCommandData() {
    if (!canViewCommands) {
      commandList.value = []
      return
    }
    try {
      const res = await findCommandByTenantId()
      commandList.value = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
    } catch {
      commandList.value = []
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

  async function toggleCronJob(item) {
    const isEnabled = item.triggerStatus === '1'
    try {
      if (isEnabled) {
        await jaoApi.stopCronJob(item.id)
        ElMessage.success(`已停用：${item.jobDesc || item.id}`)
      } else {
        await jaoApi.startCronJob(item.id)
        ElMessage.success(`已启用：${item.jobDesc || item.id}`)
      }
      await loadCronData()
    } catch {
      ElMessage.error('操作失败，请重试')
    }
  }

  async function executeCronJobNow(item) {
    try {
      const response = await jaoApi.executeCronJob(item.id)
      ElMessage.success(`已触发执行：${item.jobDesc || item.id}`)
      return unwrapResponseData(response)
    } catch {
      ElMessage.error('执行失败，请重试')
      return null
    }
  }

  async function fetchFailedRuns(size = 20) {
    const response = await jaoApi.fetchJobRunLogs(
      createRunLogPayload({ day: '0', status: 'FAILED', size })
    )
    const data = unwrapResponseData(response)
    return {
      records: Array.isArray(data.records) ? data.records : [],
      total: resolveRunLogTotal(data)
    }
  }

  async function fetchTodayRuns(size = 20) {
    const response = await jaoApi.fetchJobRunLogs(
      createRunLogPayload({ day: '0', status: 'all', size })
    )
    const data = unwrapResponseData(response)
    return {
      records: Array.isArray(data.records) ? data.records : [],
      total: resolveRunLogTotal(data)
    }
  }

  async function fetchRunsByType(type = '', size = 20) {
    const payload = createRunLogPayload({ day: '0', status: 'all', size })
    if (type) payload.params.type = type
    const response = await jaoApi.fetchJobRunLogs(payload)
    const data = unwrapResponseData(response)
    return {
      records: Array.isArray(data.records) ? data.records : [],
      total: resolveRunLogTotal(data)
    }
  }

  async function fetchApproveItems() {
    const response = await jaoApi.fetchApproveList()
    const list = response?.data || response || []
    return Array.isArray(list) ? list : []
  }

  async function fetchCommandReviewItems() {
    const response = await findAllUnapprovedCommand()
    const list = response?.data || response || []
    return Array.isArray(list) ? list : []
  }

  async function fetchScriptReviewItems() {
    const files = await gfsListFiles('$tnt', '', 'stage')
    return Array.isArray(files) ? files : []
  }

  async function refreshAll() {
    loading.value = true

    try {
      await Promise.allSettled([
        reviewStore.fetchAll(),
        loadRunLogData(),
        loadCronData(),
        loadJobListData(),
        loadFlowData(),
        loadCommandData()
      ])
    } finally {
      loading.value = false
    }
  }

  onScopeDispose(() => {
    stopActiveRunPolling()
  })

  onDeactivated(() => {
    stopActiveRunPolling()
  })

  onActivated(() => {
    if (!canViewJobs) return
    void loadRunLogData()
  })

  return {
    loading,
    reviewStore,
    todayRunTotal,
    failedRunTotal,
    activeRunCount,
    todayRunRecords,
    hasActiveRuns,
    jobList,
    jobTypeCounts,
    commandJobList,
    commandTypeCounts,
    commandList,
    flows,
    cronSummary,
    cronJobs,
    highlightedCronJobs,
    refreshRunLogData: loadRunLogData,
    toggleCronJob,
    executeCronJobNow,
    fetchFailedRuns,
    fetchTodayRuns,
    fetchRunsByType,
    fetchApproveItems,
    fetchCommandReviewItems,
    fetchScriptReviewItems,
    refreshAll
  }
}
