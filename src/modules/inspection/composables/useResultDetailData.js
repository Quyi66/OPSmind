/**
 * 结果详情页面数据加载 Composable
 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { jobApi, dtsApi, whitelistApi } from '../api'
import { parseAuditParams } from '../utils/helpers'

export function useResultDetailData() {
  // 加载状态
  const loading = ref(false)
  const statsLoading = ref(false)
  const tableLoading = ref(false)
  const overviewLoading = ref(false)

  // 任务信息
  const jobId = ref('')
  const jobInfo = ref({})
  const hostList = ref([])
  const scriptList = ref([])

  // 统计数据
  const statistics = ref({
    OK: 0,
    FAILED: 0,
    CHECK: 0,
    SKIPPING: 0,
    UNREACHABLE: 0
  })

  // 主机列表数据
  const machineData = ref([])
  const pagination = ref({
    page: 1,
    size: 10,
    total: 0
  })

  // 巡检概览数据
  const overviewData = ref([])
  const overviewPagination = ref({
    page: 1,
    size: 10,
    total: 0
  })

  /**
   * 加载任务信息
   */
  async function loadJobInfo() {
    loading.value = true
    try {
      const res = await jobApi.getJob(jobId.value)
      jobInfo.value = res?.data || res || {}
      const parsed = parseAuditParams(jobInfo.value.auditParams)
      hostList.value = parsed.hosts
      scriptList.value = parsed.scripts
    } catch (error) {
      console.error('加载任务信息失败:', error)
      ElMessage.error('加载任务信息失败')
    } finally {
      loading.value = false
    }
  }

  /**
   * 加载统计数据
   */
  async function loadStatistics() {
    statsLoading.value = true
    try {
      const res = await dtsApi.getStatistics(jobId.value)
      const data = res?.data || res || {}
      const records = data.records || []

      // 重置统计
      statistics.value = {
        OK: 0,
        FAILED: 0,
        CHECK: 0,
        SKIPPING: 0,
        UNREACHABLE: 0
      }

      // 填充统计数据
      records.forEach(rec => {
        if (statistics.value.hasOwnProperty(rec.name)) {
          statistics.value[rec.name] = rec.value
        }
      })
    } catch (error) {
      console.error('加载统计数据失败:', error)
    } finally {
      statsLoading.value = false
    }
  }

  /**
   * 加载主机列表
   */
  async function loadMachineData(searchText = '') {
    tableLoading.value = true
    try {
      const res = await dtsApi.getCheckItemMachine(
        jobId.value,
        pagination.value.page,
        pagination.value.size,
        searchText
      )
      const data = res?.data || res || {}
      machineData.value = data.records || []
      pagination.value.total = data.total || machineData.value.length
    } catch (error) {
      console.error('加载主机数据失败:', error)
      ElMessage.error('加载主机数据失败')
    } finally {
      tableLoading.value = false
    }
  }

  /**
   * 加载巡检概览数据
   */
  async function loadOverviewData(searchText = '') {
    overviewLoading.value = true
    try {
      const res = await dtsApi.queryData(
        'CAC_CHECK_ITEM',
        {
          job_id: jobId.value
        },
        {
          size: overviewPagination.value.size,
          page: overviewPagination.value.page,
          filter: searchText
        }
      )
      const data = res?.data || res || {}
      overviewData.value = data.records || []
      overviewPagination.value.total = data.total || overviewData.value.length
    } catch (error) {
      console.error('加载巡检概览数据失败:', error)
      ElMessage.error('加载巡检概览数据失败')
    } finally {
      overviewLoading.value = false
    }
  }

  /**
   * 初始化数据
   */
  function initData(id) {
    jobId.value = id
    loadJobInfo()
    loadStatistics()
    loadMachineData()
  }

  return {
    // 状态
    loading,
    statsLoading,
    tableLoading,
    overviewLoading,
    // 数据
    jobId,
    jobInfo,
    hostList,
    scriptList,
    statistics,
    machineData,
    pagination,
    overviewData,
    overviewPagination,
    // 方法
    loadJobInfo,
    loadStatistics,
    loadMachineData,
    loadOverviewData,
    initData
  }
}
