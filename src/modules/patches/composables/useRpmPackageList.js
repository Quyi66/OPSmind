import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { rpmInfoApi } from '../api'

export function useRpmPackageList() {
  const loading = ref(false)
  const tableData = ref([])

  const filters = reactive({
    source: '',
    keyword: '',
    name: '',
    arch: ''
  })

  const pagination = reactive({
    page: 1,
    pageSize: 20,
    total: 0
  })

  async function loadData() {
    loading.value = true

    try {
      const response = await rpmInfoApi.getPackageList({
        source: filters.source,
        keyword: filters.keyword,
        name: filters.name,
        arch: filters.arch,
        page: pagination.page - 1,
        size: pagination.pageSize
      })

      const data = response?.data || response || {}
      tableData.value = Array.isArray(data.content) ? data.content : []
      pagination.total = Number(data.totalElements || 0)
    } catch (error) {
      console.error('Failed to load rpm package list:', error)
      ElMessage.error('获取 RPM 包列表失败')
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
    filters.source = ''
    filters.keyword = ''
    filters.name = ''
    filters.arch = ''
    pagination.page = 1
    pagination.pageSize = 20
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

  return {
    filters,
    loading,
    pagination,
    tableData,
    loadData,
    handleSearch,
    handleReset,
    handlePageChange,
    handleSizeChange
  }
}
