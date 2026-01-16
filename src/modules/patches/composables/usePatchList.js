import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { patchScanApi } from '../api'

/**
 * 补丁列表逻辑 Composable
 */
export function usePatchList(hostId) {
  const patchLoading = ref(false)
  const patchTableData = ref([])
  const selectedPatches = ref([])
  const selectedSeverities = ref([])
  const patchPagination = reactive({
    page: 1,
    pageSize: 20,
    total: 0
  })

  // 加载补丁列表
  async function loadPatchList() {
    if (!hostId.value) {
      return
    }

    patchLoading.value = true
    try {
      const severityFilter = selectedSeverities.value.join(',')
      const response = await patchScanApi.getPatchesOfMachine({
        host_id: hostId.value,
        severity: severityFilter,
        page: patchPagination.page,
        size: patchPagination.pageSize
      })

      const data = response?.data || response
      patchTableData.value = data?.records || []
      patchPagination.total = data?.total || 0
    } catch (error) {
      console.error('Failed to load patch list:', error)
      ElMessage.error('获取补丁列表失败')
      patchTableData.value = []
      patchPagination.total = 0
    } finally {
      patchLoading.value = false
    }
  }

  // 筛选变化
  function handleFilterChange() {
    patchPagination.page = 1
    loadPatchList()
  }

  // 补丁选择变化
  function handleSelectionChange(selection) {
    selectedPatches.value = selection
  }

  // 分页变化
  function handlePageChange(page) {
    patchPagination.page = page
    loadPatchList()
  }

  function handleSizeChange(size) {
    patchPagination.pageSize = size
    patchPagination.page = 1
    loadPatchList()
  }

  return {
    patchLoading,
    patchTableData,
    selectedPatches,
    selectedSeverities,
    patchPagination,
    loadPatchList,
    handleFilterChange,
    handleSelectionChange,
    handlePageChange,
    handleSizeChange
  }
}
