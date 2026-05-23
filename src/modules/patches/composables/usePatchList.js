import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { patchScanApi } from '../api'

/**
 * 补丁列表逻辑 Composable
 */
export function usePatchList(hostContext) {
  const hostIdRef = hostContext?.hostId ?? hostContext
  const hostKeyRef = hostContext?.hostKey
  const getHostId = () => (hostIdRef?.value ?? hostIdRef ?? '')
  const getHostKey = () => (hostKeyRef?.value ?? hostKeyRef ?? '')
  const patchLoading = ref(false)
  const patchTableData = ref([])
  const patchAllData = ref([])
  const patchFilteredData = ref([])
  const selectedPatches = ref([])
  const selectedSeverities = ref([])
  const patchKeyword = ref('')
  const patchPagination = reactive({
    page: 1,
    pageSize: 20,
    total: 0
  })

  function applyClientPaging() {
    const keyword = patchKeyword.value.trim().toLowerCase()
    const filtered = !keyword
      ? patchAllData.value
      : patchAllData.value.filter(item => {
          const parts = [
            item.patch_id,
            item.title,
            item.severity,
            item.publish_date,
            item.affected_pkgs,
            Array.isArray(item.related_vuls) ? item.related_vuls.join(',') : item.related_vuls
          ]
          return parts
            .filter(Boolean)
            .map(v => String(v).toLowerCase())
            .some(text => text.includes(keyword))
        })

    patchFilteredData.value = filtered
    const start = (patchPagination.page - 1) * patchPagination.pageSize
    const end = start + patchPagination.pageSize
    patchPagination.total = filtered.length
    patchTableData.value = filtered.slice(start, end)
  }

  // 加载补丁列表
  async function loadPatchList() {
    const hostId = getHostId()
    const hostKey = getHostKey()
    if (!hostId && !hostKey) {
      return
    }

    patchLoading.value = true
    try {
      const severityFilter = selectedSeverities.value.join(',')
      const response = await patchScanApi.getPatchesOfMachine({
        host_id: hostId,
        host_key: hostKey,
        severity: severityFilter
      })

      const data = response?.data || response
      const records = Array.isArray(data?.records) ? data.records : Array.isArray(data) ? data : []
      patchAllData.value = records
      applyClientPaging()
    } catch (error) {
      console.error('Failed to load patch list:', error)
      ElMessage.error('获取补丁列表失败')
      patchAllData.value = []
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

  function handlePatchKeywordChange() {
    patchPagination.page = 1
    applyClientPaging()
  }

  // 补丁选择变化
  function handleSelectionChange(selection) {
    selectedPatches.value = selection
  }

  // 分页变化
  function handlePageChange(page) {
    patchPagination.page = page
    applyClientPaging()
  }

  function handleSizeChange(size) {
    patchPagination.pageSize = size
    patchPagination.page = 1
    applyClientPaging()
  }

  return {
    patchLoading,
    patchTableData,
    patchFilteredData,
    selectedPatches,
    selectedSeverities,
    patchKeyword,
    patchPagination,
    loadPatchList,
    handleFilterChange,
    handlePatchKeywordChange,
    handleSelectionChange,
    handlePageChange,
    handleSizeChange
  }
}
