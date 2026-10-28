import { computed, onActivated, onBeforeUnmount, onDeactivated, ref, watch } from 'vue'

// Only manages the four software lists. Authentication, API parsing and GET retries stay in apiService.
export function useSoftwareListRead(
  fetchRecords,
  { active = ref(true), onDiscard = () => {} } = {}
) {
  const rows = ref([])
  const total = ref(0)
  const loading = ref(false)
  const hasResult = ref(false)
  const error = ref('')
  let version = 0
  const suspended = ref(false)
  let disposed = false
  let lastParams = null
  let successfulQuery = null

  const available = () => !disposed && !suspended.value && active.value
  const canUseRows = computed(
    () => available() && hasResult.value && !loading.value && !error.value
  )
  const canRetry = computed(() => available() && !!error.value && error.value !== 'auth')
  const errorMessage = computed(() => {
    if (error.value === 'auth') return '读取失败：登录已失效或无权访问，请重新登录或联系管理员。'
    if (error.value === 'interrupted') {
      return hasResult.value
        ? '读取已中断，当前显示上次成功结果，可能已过期。请重试。'
        : '读取已中断，请重试。'
    }
    if (error.value) {
      return hasResult.value
        ? '刷新失败，当前显示上次成功结果，可能已过期。请重试。'
        : '读取失败，请重试。'
    }
    return ''
  })
  const emptyText = computed(() => {
    if (loading.value) return '正在读取…'
    if (error.value) return errorMessage.value
    return hasResult.value ? '暂无数据' : '尚未读取'
  })

  function discard() {
    rows.value = []
    total.value = 0
    hasResult.value = false
    successfulQuery = null
    onDiscard()
  }

  async function load(params) {
    if (!available()) return
    // All four callers use flat, primitive business parameters. Keep the retry separate from input drafts.
    const snapshot = { ...params }
    const query = JSON.stringify(snapshot)
    const request = ++version
    if (query !== JSON.stringify(lastParams)) error.value = ''
    lastParams = snapshot
    if (query !== successfulQuery) discard()
    loading.value = true
    // Keep the stale/error explanation visible until the retry succeeds.
    const isCurrent = () => available() && request === version
    try {
      const response = await fetchRecords({ ...snapshot })
      if (!isCurrent()) return
      const data = response?.data || response
      rows.value = data?.records || []
      total.value = data?.total || 0
      hasResult.value = true
      successfulQuery = query
      error.value = ''
    } catch (failure) {
      if (!isCurrent()) return
      const status = failure?.response?.status
      const unauthorized =
        status === 401 ||
        status === 403 ||
        ['Authentication expired', 'Access denied'].includes(failure?.message)
      if (unauthorized) discard()
      error.value = unauthorized ? 'auth' : 'read'
      console.error('Failed to read software list:', failure)
    } finally {
      if (isCurrent()) loading.value = false
    }
  }

  function retry() {
    if (!loading.value && canRetry.value) return load(lastParams)
  }

  function invalidate() {
    version += 1
    if (loading.value) error.value = 'interrupted'
    loading.value = false
  }

  // A confirmation must still belong to the same successful read when the user accepts it.
  function captureReady() {
    const captured = version
    return () => canUseRows.value && captured === version
  }

  watch(
    active,
    value => {
      if (!value) invalidate()
    },
    { flush: 'sync' }
  )
  onDeactivated(() => {
    invalidate()
    suspended.value = true
  })
  onActivated(() => {
    suspended.value = false
  })
  onBeforeUnmount(() => {
    disposed = true
    version += 1
  })

  return {
    rows,
    total,
    loading,
    hasResult,
    error,
    errorMessage,
    emptyText,
    canUseRows,
    canRetry,
    load,
    retry,
    captureReady
  }
}
