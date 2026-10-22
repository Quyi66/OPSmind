/**
 * 巡检总览：模板关联报告统计。各报告可能来自不同执行批次。
 */
import { ref, computed, onActivated, onDeactivated, onBeforeUnmount } from 'vue'
import { templateApi, dtsApi, paramApi, jobApi } from '../api'
import axios from 'axios'
import { authService } from '@/core/auth'

const resultFields = [
  ['OK', 'ok', '检查通过', '#28a745'],
  ['FAILED', 'failed', '检查失败', '#dc3545'],
  ['CHECK', 'check', '人工检查', '#17a2b8'],
  ['SKIPPING', 'skipping', '已跳过', '#6c757d'],
  ['UNREACHABLE', 'unreachable', '数据缺失', '#ffc107']
]
const hasJob = value => value !== null && value !== undefined && value !== ''

function formatRelativeTime(value) {
  if (!value) return ''
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return ''
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  const ranges = [
    [31536000, '年'],
    [2592000, '个月'],
    [86400, '天'],
    [3600, '小时'],
    [60, '分钟']
  ]
  for (const [size, unit] of ranges) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${unit}前`
  }
  return seconds < 0 ? '' : '刚刚'
}

function getIconClass(icon) {
  if (!icon) return 'fas fa-server'
  return /^(fas|far|fad|fab|fal) /.test(icon) ? icon : `fas ${icon}`
}

// This is the configured target count, not the report's observed or globally deduplicated host count.
function parseHostCount(auditParams) {
  try {
    const params = typeof auditParams === 'string' ? JSON.parse(auditParams) : auditParams || []
    if (!Array.isArray(params)) return null
    let count = 0
    for (const group of params) {
      if (!group || (group.hosts != null && !Array.isArray(group.hosts))) return null
      count += group.hosts?.length || 0
    }
    return count
  } catch {
    return null
  }
}

function parseStatistics(response) {
  const data = response?.data || response || {}
  if (!Array.isArray(data.records)) throw new Error('Invalid inspection statistics')
  const stats = { ok: 0, failed: 0, check: 0, skipping: 0, unreachable: 0, total: 0 }
  let recognized = false
  for (const record of data.records) {
    const field = resultFields.find(([name]) => name === record?.name)?.[1]
    if (!field) continue
    const value = Number(record.value)
    if (record.value == null || record.value === '' || !Number.isFinite(value) || value < 0) {
      throw new Error('Invalid inspection statistic count')
    }
    recognized = true
    stats[field] = value
  }
  if (!recognized) return null
  stats.total = resultFields.reduce((sum, [, field]) => sum + stats[field], 0)
  return stats
}

export function useOverviewData() {
  const loading = ref(true)
  const templateList = ref([])
  const searchKeyword = ref('')
  const listError = ref('')
  const listLoaded = ref(false)
  const active = ref(true)
  let disposed = false
  let generation = 0
  const rowRequests = new WeakMap()
  const available = () => active.value && !disposed
  const context = () => {
    const captured = generation
    return () => available() && captured === generation
  }
  const filteredTemplateList = computed(() => {
    const keyword = searchKeyword.value.toLowerCase()
    return keyword
      ? templateList.value.filter(item => item.templateName?.toLowerCase().includes(keyword))
      : templateList.value
  })
  const statisticsProgress = computed(() => {
    const reports = templateList.value.filter(item => hasJob(item.jobId))
    return {
      total: reports.length,
      loaded: reports.filter(item => ['ready', 'empty'].includes(item.statisticsState)).length,
      failed: reports.filter(item => ['error', 'interrupted'].includes(item.statisticsState))
        .length,
      pending: reports.filter(item => item.statisticsState === 'loading').length
    }
  })
  const statsLoading = computed(() => statisticsProgress.value.pending > 0)
  const refreshing = computed(() => loading.value || statsLoading.value)
  const hasSummaryData = computed(
    () => !loading.value && templateList.value.some(item => item.stats !== null)
  )
  const globalStats = computed(() => {
    const stats = {
      templateCount: templateList.value.length,
      hostCount: templateList.value.reduce((sum, item) => sum + (item.hostLength || 0), 0),
      executedCount: statisticsProgress.value.total,
      okTotal: 0,
      failedTotal: 0,
      checkTotal: 0,
      skippingTotal: 0,
      unreachableTotal: 0
    }
    templateList.value.forEach(item => {
      if (!item.stats) return
      resultFields.forEach(([, field]) => {
        stats[`${field}Total`] += item.stats[field]
      })
    })
    return stats
  })
  const passRate = computed(() => {
    const total = resultFields.reduce(
      (sum, [, field]) => sum + globalStats.value[`${field}Total`],
      0
    )
    return total ? Math.round((globalStats.value.okTotal / total) * 100) : 0
  })
  const distributionData = computed(() => {
    const total = resultFields.reduce(
      (sum, [, field]) => sum + globalStats.value[`${field}Total`],
      0
    )
    return resultFields.map(([key, field, label, color]) => {
      const value = globalStats.value[`${field}Total`]
      return { key, field, label, color, value, percent: total ? (value / total) * 100 : 0 }
    })
  })
  const recentExecutions = ref([])

  function isTemplateCurrent(template) {
    return (
      available() && !loading.value && !listError.value && templateList.value.includes(template)
    )
  }

  function captureTemplate(template) {
    const isCurrent = context()
    return () => isCurrent() && isTemplateCurrent(template)
  }

  async function loadTemplates() {
    if (!available()) return null
    generation += 1
    const isCurrent = context()
    loading.value = true
    listError.value = ''
    try {
      const response = await templateApi.getSquareTemplates()
      if (!isCurrent()) return null
      const data = response?.data || response || []
      if (!Array.isArray(data)) throw new Error('Invalid inspection template list')
      templateList.value = data.map(template => ({
        ...template,
        hostLength: parseHostCount(template.auditParams),
        executedTime: formatRelativeTime(template.executedAt),
        iconClass: getIconClass(template.icon),
        stats: null,
        passRate: null,
        statisticsState: hasJob(template.jobId) ? 'loading' : 'not-run'
      }))
      listLoaded.value = true
      return isCurrent
    } catch (error) {
      if (!isCurrent()) return null
      console.error('Failed to load templates:', error)
      templateList.value = []
      listLoaded.value = false
      listError.value = '读取巡检模板失败，请刷新重试。'
      return null
    } finally {
      if (isCurrent()) loading.value = false
    }
  }

  async function readTemplateStatistics(template, isContextCurrent) {
    if (!isContextCurrent() || !hasJob(template.jobId)) return
    const jobId = template.jobId
    const request = (rowRequests.get(template) || 0) + 1
    rowRequests.set(template, request)
    const isCurrent = () =>
      isContextCurrent() &&
      templateList.value.includes(template) &&
      template.jobId === jobId &&
      rowRequests.get(template) === request
    template.statisticsState = 'loading'
    template.stats = null
    template.passRate = null
    try {
      const response = await dtsApi.getStatistics(jobId)
      if (!isCurrent()) return
      template.stats = parseStatistics(response)
      template.statisticsState = template.stats?.total > 0 ? 'ready' : 'empty'
      template.passRate =
        template.stats?.total > 0
          ? Math.round((template.stats.ok / template.stats.total) * 100)
          : null
    } catch (error) {
      if (!isCurrent()) return
      template.statisticsState = 'error'
      console.error('Failed to load template statistics:', error)
    }
  }

  async function loadAllStatistics(isCurrent) {
    await Promise.allSettled(
      templateList.value
        .filter(template => hasJob(template.jobId))
        .map(template => readTemplateStatistics(template, isCurrent))
    )
  }

  function retryStatistics(template) {
    if (
      !isTemplateCurrent(template) ||
      !['error', 'interrupted'].includes(template.statisticsState)
    )
      return
    return readTemplateStatistics(template, context())
  }

  /**
   * 加载最近执行记录（对应 API: POST /audit/api/audit/v2/jobs/page/all）
   */
  async function loadRecentExecutions(isCurrent = () => true) {
    try {
      const params = new URLSearchParams()
      const columns = [
        { data: 'templateName', orderable: 'true', searchable: 'true' },
        { data: 'auditParams', orderable: 'true', searchable: 'true' },
        { data: 'createdAt', orderable: 'true', searchable: 'true' },
        { data: 'endedAt', orderable: 'true', searchable: 'true' },
        { data: 'createdBy', orderable: 'true', searchable: 'true' },
        { data: 'id', orderable: 'true', searchable: 'true' }
      ]

      columns.forEach((col, i) => {
        params.append(`columns[${i}][data]`, col.data)
        params.append(`columns[${i}][name]`, '')
        params.append(`columns[${i}][orderable]`, col.orderable)
        params.append(`columns[${i}][search][regex]`, 'false')
        params.append(`columns[${i}][search][value]`, '')
        params.append(`columns[${i}][searchable]`, col.searchable)
      })

      params.append('draw', '1')
      params.append('length', '12')
      params.append('order[0][column]', '2')
      params.append('order[0][dir]', 'desc')
      params.append('search[regex]', 'false')
      params.append('search[value]', '')
      params.append('start', '0')

      const baseURL = import.meta.env.VITE_API_BASE_URL || '/sjxy-console'
      const authHeaders = authService.getAuthHeaders()
      const response = await axios.post(`${baseURL}/audit/api/audit/v2/jobs/page/all`, params, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
      if (!isCurrent()) return
      const data = response?.data || response || {}
      const records = data.data || []

      const mappedExecutions = records.map(job => {
        const tmpl = templateList.value.find(
          t => t.id === job.templateId || t.templateName === job.templateName
        )
        const icon = tmpl ? tmpl.iconClass : 'fas fa-server'
        const executedTime = job.createdAt ? formatRelativeTime(job.createdAt) : ''

        return {
          id: job.id,
          jobId: job.id,
          templateName: job.templateName,
          executedBy: job.createdBy || '-',
          executedAt: job.createdAt,
          executedTime,
          icon,
          hasResult: Boolean(job.id),
          stats: null
        }
      })

      // 并行请求加载最近 12 条记录的检查结果统计
      const statsPromises = mappedExecutions.map(exec =>
        dtsApi
          .getStatistics(exec.jobId)
          .then(res => ({ jobId: exec.jobId, data: res?.data || res || {} }))
          .catch(() => ({ jobId: exec.jobId, data: {} }))
      )

      const statsResults = await Promise.allSettled(statsPromises)
      statsResults.forEach(result => {
        const item = result.status === 'fulfilled' ? result.value : null
        if (!item) return

        const statsData = item.data || {}
        const statsRecords = statsData.records || []

        let ok = 0
        let failed = 0
        let check = 0
        let skipping = 0
        let unreachable = 0

        statsRecords.forEach(rec => {
          const val = Number(rec.value) || 0
          if (rec.name === 'OK') ok = val
          else if (rec.name === 'FAILED') failed = val
          else if (rec.name === 'CHECK') check = val
          else if (rec.name === 'SKIPPING') skipping = val
          else if (rec.name === 'UNREACHABLE') unreachable = val
        })

        const exec = mappedExecutions.find(e => e.jobId === item.jobId)
        if (exec) {
          const total = ok + failed + check + skipping + unreachable
          exec.stats = { ok, failed, check, skipping, unreachable, total }
        }
      })

      if (isCurrent()) recentExecutions.value = mappedExecutions
    } catch (error) {
      if (!isCurrent()) return
      console.error('Failed to load recent executions:', error)
      recentExecutions.value = []
    }
  }

  async function refreshAll() {
    const isCurrent = await loadTemplates()
    if (isCurrent?.()) {
      await Promise.allSettled([loadAllStatistics(isCurrent), loadRecentExecutions(isCurrent)])
    }
  }

  function invalidate() {
    generation += 1
    if (loading.value) {
      templateList.value = []
      listLoaded.value = false
      listError.value = '模板读取已中断，请刷新重试。'
    }
    loading.value = false
    templateList.value.forEach(template => {
      if (template.statisticsState === 'loading') template.statisticsState = 'interrupted'
    })
  }

  onDeactivated(() => {
    active.value = false
    invalidate()
  })
  onActivated(() => {
    active.value = true
  })
  onBeforeUnmount(() => {
    disposed = true
    invalidate()
  })

  return {
    loading,
    statsLoading,
    refreshing,
    templateList,
    searchKeyword,
    filteredTemplateList,
    globalStats,
    passRate,
    distributionData,
    recentExecutions,
    listError,
    listLoaded,
    statisticsProgress,
    hasSummaryData,
    retryStatistics,
    isTemplateCurrent,
    captureTemplate,
    initData: refreshAll,
    refreshAll,
    loadTemplates
  }
}
