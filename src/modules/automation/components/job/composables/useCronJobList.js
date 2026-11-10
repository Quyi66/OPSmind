import { ref, computed, onMounted, onBeforeUnmount, onActivated, onDeactivated, watch } from 'vue'
import * as jaoApi from '@/modules/automation/api/jao'
import { ElMessage } from 'element-plus'
import { matchesCronTaskKeyword } from '@/modules/automation/utils/cronTaskPresentation'

/**
 * CRON 任务列表管理
 * 处理列表数据加载、搜索、选择等功能
 */
export function useCronJobList() {
  const loading = ref(false)
  const loadError = ref('')
  const searchRevision = ref(0)
  let active = true
  let requestId = 0
  const tableData = ref([])
  const searchKeyword = ref('')
  const selectedRows = ref([])

  /**
   * 过滤后的表格数据
   */
  const filteredTableData = computed(() => {
    if (!searchKeyword.value) return tableData.value

    const keyword = searchKeyword.value.toLowerCase()
    return tableData.value.filter(row =>
      matchesCronTaskKeyword(row, keyword, ['jobDesc', 'scheduleConf', 'jobType', 'author'])
    )
  })

  /**
   * 获取定时任务列表
   */
  async function fetchData() {
    if (!active) return
    const request = ++requestId
    loading.value = true
    loadError.value = ''
    selectedRows.value = []
    try {
      const response = await jaoApi.fetchCronJobs()
      if (!active || request !== requestId) return
      tableData.value = (response.data || response || []).map(item => ({
        ...item,
        _switching: false
      }))
    } catch (error) {
      if (!active || request !== requestId) return
      loadError.value = '获取定时任务列表失败，请重试'
      ElMessage.error(error?.message || '获取定时任务列表失败')
    } finally {
      if (active && request === requestId) loading.value = false
    }
  }

  /**
   * 处理表格选择变化
   */
  function handleSelectionChange(selection) {
    selectedRows.value = selection
  }

  /**
   * 处理搜索
   */
  function handleSearch() {
    searchRevision.value += 1
    selectedRows.value = []
  }
  watch(searchKeyword, handleSearch)

  /**
   * 刷新列表
   */
  function handleRefresh() {
    fetchData()
  }

  onMounted(() => {
    fetchData()
  })

  function invalidateRead() {
    active = false
    requestId += 1
    if (loading.value) loadError.value = '定时任务读取已中断，请刷新重试'
    loading.value = false
  }
  onBeforeUnmount(invalidateRead)
  onDeactivated(invalidateRead)
  onActivated(() => {
    if (active) return
    active = true
    fetchData()
  })

  return {
    loading,
    loadError,
    searchRevision,
    tableData,
    searchKeyword,
    filteredTableData,
    selectedRows,
    fetchData,
    handleSelectionChange,
    handleSearch,
    handleRefresh
  }
}
