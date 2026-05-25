/**
 * 巡检总览页数据 Composable
 *
 * 聚合所有模板的最新巡检统计，计算全局 KPI，
 * 为仪表盘提供响应式数据源。
 */
import { ref, computed } from 'vue'
import { templateApi, dtsApi, paramApi, jobApi } from '../api'
import axios from 'axios'
import { authService } from '@/core/auth'

/**
 * 格式化相对时间
 */
function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffYears > 0) return `${diffYears}年前`
  if (diffMonths > 0) return `${diffMonths}个月前`
  if (diffDays > 0) return `${diffDays}天前`
  if (diffHours > 0) return `${diffHours}小时前`
  if (diffMinutes > 0) return `${diffMinutes}分钟前`
  return '刚刚'
}

/**
 * 获取图标类名
 */
function getIconClass(icon) {
  if (!icon) return 'fas fa-server'
  if (
    icon.startsWith('fas ') ||
    icon.startsWith('far ') ||
    icon.startsWith('fad ') ||
    icon.startsWith('fab ') ||
    icon.startsWith('fal ')
  ) {
    return icon
  }
  return `fas ${icon}`
}

/**
 * 解析 auditParams 获取主机数
 */
function parseHostCount(auditParams) {
  let params = []
  try {
    params = typeof auditParams === 'string' ? JSON.parse(auditParams) : auditParams || []
  } catch {
    params = []
  }
  let count = 0
  params.forEach(p => {
    count += (p.hosts || []).length
  })
  return count
}

export function useOverviewData() {
  const loading = ref(true)
  const statsLoading = ref(false)
  const templateList = ref([])
  const searchKeyword = ref('')

  // 全局汇总统计
  const globalStats = ref({
    templateCount: 0,
    hostCount: 0,
    executedCount: 0,
    okTotal: 0,
    failedTotal: 0,
    checkTotal: 0,
    skippingTotal: 0,
    unreachableTotal: 0
  })

  // 过滤后的模板列表
  const filteredTemplateList = computed(() => {
    if (!searchKeyword.value) return templateList.value
    const keyword = searchKeyword.value.toLowerCase()
    return templateList.value.filter(item =>
      item.templateName?.toLowerCase().includes(keyword)
    )
  })

  // 通过率
  const passRate = computed(() => {
    const { okTotal, failedTotal, checkTotal, skippingTotal, unreachableTotal } = globalStats.value
    const total = okTotal + failedTotal + checkTotal + skippingTotal + unreachableTotal
    if (total === 0) return 0
    return Math.round((okTotal / total) * 100)
  })

  // 检查结果分布数据（用于环形图）
  const distributionData = computed(() => {
    const { okTotal, failedTotal, checkTotal, skippingTotal, unreachableTotal } = globalStats.value
    const total = okTotal + failedTotal + checkTotal + skippingTotal + unreachableTotal
    return [
      { key: 'OK', label: '检查通过', value: okTotal, color: '#28a745', percent: total ? (okTotal / total * 100) : 0 },
      { key: 'FAILED', label: '检查失败', value: failedTotal, color: '#dc3545', percent: total ? (failedTotal / total * 100) : 0 },
      { key: 'CHECK', label: '人工检查', value: checkTotal, color: '#17a2b8', percent: total ? (checkTotal / total * 100) : 0 },
      { key: 'SKIPPING', label: '白名单', value: skippingTotal, color: '#6c757d', percent: total ? (skippingTotal / total * 100) : 0 },
      { key: 'UNREACHABLE', label: '数据缺失', value: unreachableTotal, color: '#ffc107', percent: total ? (unreachableTotal / total * 100) : 0 }
    ]
  })

  // 最近执行记录
  const recentExecutions = ref([])

  /**
   * 加载模板列表
   */
  async function loadTemplates() {
    loading.value = true
    try {
      const response = await templateApi.getSquareTemplates()
      const data = response?.data || response || []

      templateList.value = data.map(template => {
        const hostLength = parseHostCount(template.auditParams)
        const executedTime = template.executedAt
          ? formatRelativeTime(template.executedAt)
          : ''

        return {
          ...template,
          hostLength,
          executedTime,
          iconClass: getIconClass(template.icon),
          // 统计占位，后续填充
          stats: null,
          passRate: null
        }
      })

      // 更新全局计数
      globalStats.value.templateCount = templateList.value.length
      globalStats.value.hostCount = templateList.value.reduce((sum, t) => sum + t.hostLength, 0)
      globalStats.value.executedCount = templateList.value.filter(t => t.jobId).length
    } catch (error) {
      console.error('Failed to load templates:', error)
      templateList.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * 加载所有模板的巡检统计（并行请求）
   */
  async function loadAllStatistics() {
    const templatesWithJob = templateList.value.filter(t => t.jobId)
    if (templatesWithJob.length === 0) {
      statsLoading.value = false
      return
    }

    statsLoading.value = true
    try {
      const promises = templatesWithJob.map(t =>
        dtsApi.getStatistics(t.jobId)
          .then(res => ({ jobId: t.jobId, data: res?.data || res || {} }))
          .catch(() => ({ jobId: t.jobId, data: {} }))
      )

      const results = await Promise.allSettled(promises)

      // 汇总全局统计
      let okTotal = 0
      let failedTotal = 0
      let checkTotal = 0
      let skippingTotal = 0
      let unreachableTotal = 0

      results.forEach(result => {
        const item = result.status === 'fulfilled' ? result.value : null
        if (!item) return

        const statsData = item.data || {}
        const records = statsData.records || []

        let ok = 0
        let failed = 0
        let check = 0
        let skipping = 0
        let unreachable = 0

        records.forEach(rec => {
          const val = Number(rec.value) || 0
          if (rec.name === 'OK') ok = val
          else if (rec.name === 'FAILED') failed = val
          else if (rec.name === 'CHECK') check = val
          else if (rec.name === 'SKIPPING') skipping = val
          else if (rec.name === 'UNREACHABLE') unreachable = val
        })

        okTotal += ok
        failedTotal += failed
        checkTotal += check
        skippingTotal += skipping
        unreachableTotal += unreachable

        // 给模板附加统计
        const tmpl = templateList.value.find(t => t.jobId === item.jobId)
        if (tmpl) {
          const total = ok + failed + check + skipping + unreachable
          tmpl.stats = { ok, failed, check, skipping, unreachable, total }
          tmpl.passRate = total > 0 ? Math.round((ok / total) * 100) : null
        }
      })

      globalStats.value.okTotal = okTotal
      globalStats.value.failedTotal = failedTotal
      globalStats.value.checkTotal = checkTotal
      globalStats.value.skippingTotal = skippingTotal
      globalStats.value.unreachableTotal = unreachableTotal
    } catch (error) {
      console.error('Failed to load statistics:', error)
    } finally {
      statsLoading.value = false
    }
  }

  /**
   * 加载最近执行记录（对应 API: POST /cac/api/cac/v2/jobs/page/all）
   */
  async function loadRecentExecutions() {
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

      const baseURL = import.meta.env.VITE_API_BASE_URL || '/oplus-portal'
      const authHeaders = authService.getAuthHeaders()
      const response = await axios.post(`${baseURL}/cac/api/cac/v2/jobs/page/all`, params, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
      const data = response?.data || response || {}
      const records = data.data || []

      const mappedExecutions = records.map(job => {
        const tmpl = templateList.value.find(t => t.id === job.templateId || t.templateName === job.templateName)
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
        dtsApi.getStatistics(exec.jobId)
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

      recentExecutions.value = mappedExecutions
    } catch (error) {
      console.error('Failed to load recent executions:', error)
      recentExecutions.value = []
    }
  }

  /**
   * 初始化数据
   */
  async function initData() {
    await loadTemplates()
    void Promise.allSettled([
      loadAllStatistics(),
      loadRecentExecutions()
    ])
  }

  /**
   * 刷新所有数据
   */
  async function refreshAll() {
    await loadTemplates()
    await Promise.allSettled([
      loadAllStatistics(),
      loadRecentExecutions()
    ])
  }

  return {
    loading,
    statsLoading,
    templateList,
    searchKeyword,
    filteredTemplateList,
    globalStats,
    passRate,
    distributionData,
    recentExecutions,
    initData,
    refreshAll,
    loadTemplates
  }
}
