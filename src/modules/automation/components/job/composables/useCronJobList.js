import { ref, computed, onMounted } from 'vue'
import * as jaoApi from '@/modules/automation/api/jao'
import { ElMessage } from 'element-plus'

/**
 * CRON 任务列表管理
 * 处理列表数据加载、搜索、选择等功能
 */
export function useCronJobList() {
  const loading = ref(false)
  const tableData = ref([])
  const searchKeyword = ref('')
  const selectedRows = ref([])

  /**
   * 过滤后的表格数据
   */
  const filteredTableData = computed(() => {
    if (!searchKeyword.value) return tableData.value

    const keyword = searchKeyword.value.toLowerCase()
    return tableData.value.filter(row => {
      return (
        (row.id && String(row.id).toLowerCase().includes(keyword)) ||
        (row.jobDesc && row.jobDesc.toLowerCase().includes(keyword)) ||
        (row.scheduleConf && row.scheduleConf.toLowerCase().includes(keyword)) ||
        (row.appCode && row.appCode.toLowerCase().includes(keyword)) ||
        (row.jobType && row.jobType.toLowerCase().includes(keyword)) ||
        (row.author && row.author.toLowerCase().includes(keyword))
      )
    })
  })

  /**
   * 获取定时任务列表
   */
  async function fetchData() {
    loading.value = true
    try {
      const response = await jaoApi.fetchCronJobs()
      tableData.value = (response.data || response || []).map(item => ({
        ...item,
        _switching: false
      }))
    } catch (error) {
      ElMessage.error(error?.message || '获取定时任务列表失败')
    } finally {
      loading.value = false
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
    // 搜索由 computed 自动处理
  }

  /**
   * 刷新列表
   */
  function handleRefresh() {
    fetchData()
  }

  onMounted(() => {
    fetchData()
  })

  return {
    loading,
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
