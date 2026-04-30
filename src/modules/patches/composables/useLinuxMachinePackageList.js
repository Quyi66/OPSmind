import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { rpmInfoApi } from '../api'
import {
  buildSelectorHostItems,
  downloadBlobResponse,
  extractHostIds
} from '../utils/linuxMachinePackageList'

const DEFAULT_PAGE_SIZE = 20

function buildRequestPayload(filters, hostIds) {
  const payload = {
    hostKey: filters.hostKey,
    keyword: filters.keyword,
    osDistro: filters.osDistro,
    osVersion: filters.osVersion
  }

  if (hostIds.length) {
    payload.hostIds = hostIds
  }

  return payload
}

export function useLinuxMachinePackageList() {
  const loading = ref(false)
  const exporting = ref(false)
  const tableData = ref([])
  const selectedHosts = ref(buildSelectorHostItems())

  const filters = reactive({
    hostKey: '',
    keyword: '',
    osDistro: '',
    osVersion: ''
  })

  const pagination = reactive({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0
  })

  function getSelectedHostIds() {
    return extractHostIds(selectedHosts.value)
  }

  async function loadData() {
    loading.value = true

    try {
      const response = await rpmInfoApi.getInstalledScanPackages({
        ...buildRequestPayload(filters, getSelectedHostIds()),
        page: pagination.page - 1,
        size: pagination.pageSize
      })

      const data = response?.data || response || {}
      tableData.value = Array.isArray(data.content) ? data.content : []
      pagination.total = Number(data.totalElements || 0)
    } catch (error) {
      console.error('Failed to load linux machine package list:', error)
      ElMessage.error('获取机器包清单失败')
      tableData.value = []
      pagination.total = 0
    } finally {
      loading.value = false
    }
  }

  function handleSearch() {
    pagination.page = 1
    loadData()
  }

  function handleReset() {
    selectedHosts.value = []
    filters.hostKey = ''
    filters.keyword = ''
    filters.osDistro = ''
    filters.osVersion = ''
    pagination.page = 1
    pagination.pageSize = DEFAULT_PAGE_SIZE
    loadData()
  }

  function handlePageChange(page) {
    pagination.page = page
    loadData()
  }

  function handleSizeChange(size) {
    pagination.pageSize = size
    pagination.page = 1
    loadData()
  }

  async function handleExport() {
    exporting.value = true

    try {
      const response = await rpmInfoApi.exportInstalledScanPackages(buildRequestPayload(filters, getSelectedHostIds()))
      downloadBlobResponse(response)
      ElMessage.success('导出完成')
    } catch (error) {
      console.error('Failed to export linux machine package list:', error)
      ElMessage.error('导出机器包清单失败')
    } finally {
      exporting.value = false
    }
  }

  return {
    exporting,
    filters,
    handleExport,
    handlePageChange,
    handleReset,
    handleSearch,
    handleSizeChange,
    loadData,
    loading,
    pagination,
    selectedHosts,
    tableData
  }
}
