import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { patchScanApi } from '../api'

/**
 * 软件包列表逻辑 Composable
 */
export function usePackageList(hostId) {
  const packageLoading = ref(false)
  const packageTableData = ref([])
  const packageTableDataAll = ref([])
  const selectedPackages = ref([])
  const packageFilter = reactive({
    showHistory: 'no',
    showAll: 'no'
  })
  const packagePagination = reactive({
    page: 1,
    pageSize: 20,
    total: 0
  })

  // 处理软件包数据（根据Angular源代码逻辑）
  function processPackageData(installedPkgs, affectedPkgs) {
    const pkgMap = {}
    const showAll = packageFilter.showAll === 'yes'
    const showHistoryPatch = packageFilter.showHistory === 'yes'

    installedPkgs.forEach(pkgId => {
      const item = {
        pkgName: '',
        installedPkg: pkgId,
        updatePkg: null,
        severity: '',
        patchId: '',
        packages: ''
      }

      // 匹配所有的漏洞（包括历史漏洞）
      const matchingItems = affectedPkgs.filter(ap => ap.installedPkg === pkgId)

      if (showAll && matchingItems.length === 0) {
        pkgMap[pkgId] = item
      }

      matchingItems.forEach(ap => {
        const newItem = {
          pkgName: ap.pkgName,
          installedPkg: pkgId,
          updatePkg: ap.updatePkg,
          severity: ap.severity,
          patchId: ap.patchId,
          packages: `${ap.pkgName}#${ap.updatePkg}#${ap.patchId}`
        }

        let key = ap.installedPkg
        if (showHistoryPatch) {
          key = `${ap.installedPkg}_${ap.updatePkg}_${ap.patchId}`
        }

        const existing = pkgMap[key]
        if (!existing) {
          pkgMap[key] = newItem
        } else if (!showHistoryPatch && existing.patchId < ap.patchId) {
          // Only keep latest pkg according to patch id
          pkgMap[key] = newItem
        }
      })
    })

    return Object.values(pkgMap)
  }

  // 应用软件包前端分页
  function applyPackagePagination() {
    const start = (packagePagination.page - 1) * packagePagination.pageSize
    const end = start + packagePagination.pageSize
    packageTableData.value = packageTableDataAll.value.slice(start, end)
  }

  // 加载软件包列表
  async function loadPackageList() {
    if (!hostId.value) {
      return
    }

    packageLoading.value = true
    try {
      const response = await patchScanApi.getMachinePackages({
        host_id: hostId.value
      })

      const data = response?.data || response
      const records = data?.records || []

      if (records.length > 0) {
        const rec = records[0]
        const installedPkgs = JSON.parse(rec.installed_pkgs || '[]')
        const affectedPkgs = JSON.parse(rec.affected_pkgs || '[]')

        // 处理软件包数据并存储所有数据
        packageTableDataAll.value = processPackageData(installedPkgs, affectedPkgs)
        packagePagination.total = packageTableDataAll.value.length

        // 应用前端分页
        applyPackagePagination()
      } else {
        packageTableDataAll.value = []
        packageTableData.value = []
        packagePagination.total = 0
      }
    } catch (error) {
      console.error('Failed to load package list:', error)
      ElMessage.error('获取软件包列表失败')
      packageTableDataAll.value = []
      packageTableData.value = []
      packagePagination.total = 0
    } finally {
      packageLoading.value = false
    }
  }

  // 软件包筛选变化
  function handlePackageFilterChange() {
    packagePagination.page = 1
    packageTableData.value = []
    loadPackageList()
  }

  // 软件包选择变化
  function handlePackageSelectionChange(selection) {
    selectedPackages.value = selection
  }

  // 软件包分页变化
  function handlePackagePageChange(page) {
    packagePagination.page = page
    applyPackagePagination()
  }

  function handlePackageSizeChange(size) {
    packagePagination.pageSize = size
    packagePagination.page = 1
    applyPackagePagination()
  }

  return {
    packageLoading,
    packageTableData,
    packageTableDataAll,
    selectedPackages,
    packageFilter,
    packagePagination,
    loadPackageList,
    handlePackageFilterChange,
    handlePackageSelectionChange,
    handlePackagePageChange,
    handlePackageSizeChange
  }
}
