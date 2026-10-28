import { computed, onActivated, onBeforeUnmount, onDeactivated, reactive, ref, watch } from 'vue'
import { templateApi } from '../api'

function configuredCounts(value) {
  const unknown = { hostCount: null, scriptCount: null }
  if (value == null || value === '') return unknown
  try {
    const groups = typeof value === 'string' ? JSON.parse(value) : value
    if (!Array.isArray(groups)) return unknown
    let hostCount = 0
    let scriptCount = 0
    for (const group of groups) {
      if (!group || typeof group !== 'object' || Array.isArray(group)) return unknown
      if (group.hosts != null && !Array.isArray(group.hosts)) hostCount = null
      else if (hostCount !== null) hostCount += group.hosts?.length || 0
      if (group.scripts != null && !Array.isArray(group.scripts)) scriptCount = null
      else if (scriptCount !== null) scriptCount += group.scripts?.length || 0
    }
    return { hostCount, scriptCount }
  } catch {
    return unknown
  }
}

const sortableFields = new Set(['hostCount', 'scriptCount', 'executedAt'])
function sortValue(row, field) {
  const value = row[field]
  if (field === 'executedAt') {
    if (value == null || value === '') return null
    const time = new Date(value).getTime()
    return Number.isFinite(time) ? time : null
  }
  return value ?? null
}

export function useTemplateListData() {
  const tableData = ref([])
  const filters = reactive({ keyword: '' })
  const currentPage = ref(1)
  const pageSize = ref(10)
  const sortState = reactive({ prop: 'executedAt', order: 'descending' })
  const loading = ref(false)
  const hasResult = ref(false)
  const error = ref('')
  const active = ref(true)
  let disposed = false
  let version = 0
  const available = () => active.value && !disposed
  const canUseRows = computed(
    () => available() && hasResult.value && !loading.value && !error.value
  )
  const canRetry = computed(() => available() && !loading.value && error.value !== 'auth')
  const readMessage = computed(() => {
    if (error.value === 'auth') return '登录已失效或无权读取巡检模板，请重新登录或联系管理员。'
    if (!error.value) return ''
    const reason = error.value === 'interrupted' ? '读取已中断' : '读取失败'
    return hasResult.value
      ? `${reason}，当前保留上次成功结果，可能已过期。请刷新重试后再执行、编辑或删除。`
      : `${reason}，请重试读取巡检模板。`
  })

  const filteredData = computed(() => {
    const keyword = filters.keyword.toLowerCase()
    if (!keyword) return tableData.value
    return tableData.value.filter(row =>
      ['templateName', 'description', 'executedBy'].some(field =>
        String(row[field] ?? '')
          .toLowerCase()
          .includes(keyword)
      )
    )
  })
  const sortedData = computed(() => {
    const { prop, order } = sortState
    const rows = [...filteredData.value]
    if (!sortableFields.has(prop) || !order) return rows
    return rows.sort((a, b) => {
      const left = sortValue(a, prop)
      const right = sortValue(b, prop)
      // Unknown configuration/time always follows known values in both directions.
      if (left === null) return right === null ? 0 : 1
      if (right === null) return -1
      const result = left - right
      return order === 'ascending' ? result : -result
    })
  })
  const paginatedData = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return sortedData.value.slice(start, start + pageSize.value)
  })
  watch(
    () => filters.keyword,
    () => {
      currentPage.value = 1
    },
    { flush: 'sync' }
  )
  watch(
    pageSize,
    () => {
      currentPage.value = 1
    },
    { flush: 'sync' }
  )
  watch(
    () => filteredData.value.length,
    total => {
      currentPage.value = Math.min(
        currentPage.value,
        Math.max(1, Math.ceil(total / pageSize.value))
      )
    },
    { flush: 'sync' }
  )

  function handleSortChange({ prop, order }) {
    sortState.prop = sortableFields.has(prop) ? prop : ''
    sortState.order = ['ascending', 'descending'].includes(order) ? order : null
    currentPage.value = 1
  }

  function isTemplateCurrent(row) {
    return canUseRows.value && tableData.value.includes(row)
  }
  function captureTemplate(row) {
    const capturedVersion = version
    const id = row.id
    return () => capturedVersion === version && row.id === id && isTemplateCurrent(row)
  }

  async function loadTemplates() {
    if (!available() || error.value === 'auth') return
    const request = ++version
    const isCurrent = () => available() && request === version
    loading.value = true
    try {
      const response = await templateApi.getTemplates()
      if (!isCurrent()) return
      const data = response?.data || response || []
      if (!Array.isArray(data)) throw new Error('Invalid inspection template list')
      tableData.value = data.map(row => ({ ...row, ...configuredCounts(row.auditParams) }))
      hasResult.value = true
      error.value = ''
    } catch (failure) {
      if (!isCurrent()) return
      const status = failure?.response?.status
      const unauthorized =
        status === 401 ||
        status === 403 ||
        ['Authentication expired', 'Access denied'].includes(failure?.message)
      if (unauthorized) {
        tableData.value = []
        hasResult.value = false
      }
      error.value = unauthorized ? 'auth' : 'read'
      console.error('Failed to load inspection templates:', failure)
    } finally {
      if (isCurrent()) loading.value = false
    }
  }

  function invalidate() {
    version++
    if (loading.value) error.value = 'interrupted'
    loading.value = false
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
    active.value = false
    invalidate()
  })

  return {
    tableData,
    filters,
    currentPage,
    pageSize,
    sortState,
    loading,
    hasResult,
    error,
    canUseRows,
    canRetry,
    readMessage,
    filteredData,
    sortedData,
    paginatedData,
    handleSortChange,
    loadTemplates,
    isTemplateCurrent,
    captureTemplate
  }
}
