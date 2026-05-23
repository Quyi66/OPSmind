import { onBeforeUnmount, ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { patchScanApi, rpmInfoApi } from '../api'
import { extractInstalledPackageVersion, inferRpmSource } from '../utils/rpmPackageInfo'

/**
 * 软件包列表逻辑 Composable
 */
export function usePackageList(hostId) {
  const packageLoading = ref(false)
  const packageTableData = ref([])
  const packageTableDataAll = ref([])
  const selectedPackages = ref([])
  const packageKeyword = ref('')
  const packagePagination = reactive({
    page: 1,
    pageSize: 20,
    total: 0
  })
  const compatibilityAffectedPackagesCache = ref([])
  const compatibilityAffectedPackagesHostId = ref('')
  let keywordSearchTimer = null
  let latestRequestId = 0

  onBeforeUnmount(() => {
    clearTimeout(keywordSearchTimer)
  })

  function parseJsonArray(value) {
    if (Array.isArray(value)) return value
    if (!value || typeof value !== 'string') return []

    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  function getStringValue(record, keys = []) {
    for (const key of keys) {
      const value = record?.[key]
      if (value === undefined || value === null) continue

      const normalized = String(value).trim()
      if (normalized) return normalized
    }

    return ''
  }

  function getBooleanValue(record, keys = []) {
    for (const key of keys) {
      const value = record?.[key]
      if (value === undefined || value === null) continue
      if (typeof value === 'boolean') return value

      const normalized = String(value).trim().toLowerCase()
      if (['true', 'yes', '1'].includes(normalized)) return true
      if (['false', 'no', '0'].includes(normalized)) return false
    }

    return false
  }

  function normalizePkgKey(value) {
    return String(value || '').trim().toLowerCase()
  }

  function buildPackageToken(pkgName, updatePkg, patchId) {
    if (!pkgName && !updatePkg && !patchId) return ''
    return [pkgName, updatePkg, patchId].map(value => String(value || '').trim()).join('#')
  }

  function pickLatestMappingMatch(matches = []) {
    if (matches.length <= 1) return matches[0] || null

    return matches.reduce((latest, current) => {
      if (!latest) return current

      return String(current.patchId || '').localeCompare(String(latest.patchId || ''), undefined, {
        numeric: true,
        sensitivity: 'base'
      }) > 0
        ? current
        : latest
    }, null)
  }

  function extractPageItems(data) {
    if (Array.isArray(data?.content)) return data.content
    if (Array.isArray(data?.records)) return data.records
    if (Array.isArray(data)) return data
    return []
  }

  function extractPageTotal(data, fallback = 0) {
    const candidates = [data?.totalElements, data?.total, data?.totalCount, data?.count, fallback]

    for (const candidate of candidates) {
      const value = Number(candidate)
      if (Number.isFinite(value) && value >= 0) {
        return value
      }
    }

    return 0
  }

  function normalizeScanPackageRow(row = {}) {
    const packageInfo = row.packageInfo && typeof row.packageInfo === 'object' ? row.packageInfo : {}

    const installedPkg =
      getStringValue(row, ['currentPackage', 'pkgId', 'installedPkg', 'packageId', 'package_id']) ||
      getStringValue(packageInfo, ['currentPackage', 'pkgId', 'rpmPath', 'rpm_path'])

    const pkgName =
      getStringValue(row, ['pkgName', 'pkg_name', 'name']) ||
      getStringValue(packageInfo, ['name', 'pkgName'])

    const architecture =
      getStringValue(row, ['pkgArch', 'pkg_arch', 'arch', 'architecture']) ||
      getStringValue(packageInfo, ['architecture', 'arch'])

    const version =
      getStringValue(row, ['pkgVersion', 'pkg_version', 'version']) ||
      getStringValue(packageInfo, ['version']) ||
      extractInstalledPackageVersion({
        currentPackage: installedPkg,
        pkgName,
        arch: architecture
      })

    const source =
      getStringValue(row, ['source']) ||
      getStringValue(packageInfo, ['source']) ||
      inferRpmSource('', getStringValue(row, ['osDistro', 'os_distro']))

    return {
      ...row,
      packageInfo,
      pkgName,
      installedPkg,
      currentPackage: installedPkg,
      pkgId: installedPkg,
      architecture,
      arch: architecture,
      version,
      source: source || row.source || '',
      services: row.services || packageInfo.services || [],
      affected: getBooleanValue(row, ['affected'])
    }
  }

  function buildAffectedPackageLookup(affectedPkgs = []) {
    const byInstalledPkg = new Map()
    const byPkgName = new Map()

    const pushToMap = (map, key, value) => {
      if (!key) return
      const list = map.get(key) || []
      list.push(value)
      map.set(key, list)
    }

    affectedPkgs.forEach(item => {
      const normalizedItem = {
        pkgName: getStringValue(item, ['pkgName', 'pkg_name']),
        installedPkg: getStringValue(item, ['installedPkg', 'currentPackage', 'pkgId']),
        updatePkg: getStringValue(item, ['updatePkg', 'updatePackage']),
        severity: getStringValue(item, ['severity']),
        patchId: getStringValue(item, ['patchId', 'patch_id'])
      }

      normalizedItem.packages = buildPackageToken(
        normalizedItem.pkgName,
        normalizedItem.updatePkg,
        normalizedItem.patchId
      )

      pushToMap(byInstalledPkg, normalizePkgKey(normalizedItem.installedPkg), normalizedItem)
      pushToMap(byPkgName, normalizePkgKey(normalizedItem.pkgName), normalizedItem)
    })

    return {
      byInstalledPkg,
      byPkgName
    }
  }

  function getAffectedPackageMatches(baseRow, affectedLookup) {
    const installedPkgKey = normalizePkgKey(baseRow.installedPkg)
    const pkgNameKey = normalizePkgKey(baseRow.pkgName)

    const directMatches = installedPkgKey
      ? affectedLookup.byInstalledPkg.get(installedPkgKey) || []
      : []

    if (directMatches.length > 0) {
      return directMatches
    }

    return pkgNameKey ? affectedLookup.byPkgName.get(pkgNameKey) || [] : []
  }

  function mergeScanRowsWithCompatibility(scanRows = [], affectedPkgs = []) {
    const affectedLookup = buildAffectedPackageLookup(affectedPkgs)
    return scanRows.map(rawRow => {
      const baseRow = normalizeScanPackageRow(rawRow)
      const match = pickLatestMappingMatch(getAffectedPackageMatches(baseRow, affectedLookup))

      if (!match) {
        return {
          ...baseRow,
          updatePkg: null,
          severity: '',
          patchId: '',
          packages: '',
          hasUpdateInfo: false
        }
      }

      return {
        ...baseRow,
        pkgName: match.pkgName || baseRow.pkgName,
        installedPkg: match.installedPkg || baseRow.installedPkg,
        currentPackage: match.installedPkg || baseRow.currentPackage,
        pkgId: match.installedPkg || baseRow.pkgId,
        updatePkg: match.updatePkg || null,
        severity: match.severity || '',
        patchId: match.patchId || '',
        packages: match.packages || '',
        affected: true,
        hasUpdateInfo: Boolean(match.packages || match.patchId || match.updatePkg)
      }
    })
  }

  async function fetchInstalledPackagePage() {
    const response = await rpmInfoApi.getInstalledScanList({
      hostId: hostId.value,
      keyword: packageKeyword.value.trim() || undefined,
      page: packagePagination.page - 1,
      size: packagePagination.pageSize
    })

    const data = response?.data || response || {}

    return {
      rows: extractPageItems(data),
      total: extractPageTotal(data, extractPageItems(data).length)
    }
  }

  async function getCompatibilityAffectedPackages(forceRefresh = false) {
    if (
      !forceRefresh &&
      compatibilityAffectedPackagesHostId.value === hostId.value
    ) {
      return compatibilityAffectedPackagesCache.value
    }

    const response = await patchScanApi.getMachinePackages({
      host_id: hostId.value
    })

    const data = response?.data || response || {}
    const compatibilityRecord = Array.isArray(data.records) ? data.records[0] : null
    const affectedPkgs = parseJsonArray(compatibilityRecord?.affected_pkgs)

    compatibilityAffectedPackagesCache.value = affectedPkgs
    compatibilityAffectedPackagesHostId.value = hostId.value

    return affectedPkgs
  }

  // 加载软件包列表
  async function loadPackageList(options = {}) {
    if (!hostId.value) {
      return
    }

    const requestId = ++latestRequestId
    packageLoading.value = true
    try {
      const [listResult, compatibilityResult] = await Promise.allSettled([
        fetchInstalledPackagePage(),
        getCompatibilityAffectedPackages(options.refreshCompatibility === true)
      ])

      if (listResult.status !== 'fulfilled') {
        throw listResult.reason
      }

      if (requestId !== latestRequestId) {
        return
      }

      let affectedPkgs = []

      if (compatibilityResult.status === 'fulfilled') {
        affectedPkgs = compatibilityResult.value
      } else {
        console.warn('Failed to load package compatibility mapping:', compatibilityResult.reason)
      }

      const mergedRows = mergeScanRowsWithCompatibility(listResult.value.rows, affectedPkgs)
      packageTableDataAll.value = mergedRows
      packageTableData.value = mergedRows
      packagePagination.total = listResult.value.total
      selectedPackages.value = []
    } catch (error) {
      if (requestId !== latestRequestId) {
        return
      }

      console.error('Failed to load package list:', error)
      ElMessage.error('获取软件包列表失败')
      packageTableDataAll.value = []
      packageTableData.value = []
      packagePagination.total = 0
      selectedPackages.value = []
    } finally {
      if (requestId === latestRequestId) {
        packageLoading.value = false
      }
    }
  }

  function handlePackageKeywordChange() {
    clearTimeout(keywordSearchTimer)
    packagePagination.page = 1

    if (!packageKeyword.value.trim()) {
      loadPackageList()
      return
    }

    keywordSearchTimer = setTimeout(() => {
      loadPackageList()
    }, 300)
  }

  // 软件包选择变化
  function handlePackageSelectionChange(selection) {
    selectedPackages.value = selection
  }

  // 软件包分页变化
  function handlePackagePageChange(page) {
    packagePagination.page = page
    loadPackageList()
  }

  function handlePackageSizeChange(size) {
    packagePagination.pageSize = size
    packagePagination.page = 1
    loadPackageList()
  }

  const packageFilteredData = computed(() => {
    const list = compatibilityAffectedPackagesCache.value.map(item => {
      const normalizedItem = {
        pkgName: getStringValue(item, ['pkgName', 'pkg_name']),
        installedPkg: getStringValue(item, ['installedPkg', 'currentPackage', 'pkgId']),
        updatePkg: getStringValue(item, ['updatePkg', 'updatePackage']),
        severity: getStringValue(item, ['severity']),
        patchId: getStringValue(item, ['patchId', 'patch_id'])
      }
      normalizedItem.packages = buildPackageToken(
        normalizedItem.pkgName,
        normalizedItem.updatePkg,
        normalizedItem.patchId
      )
      return {
        ...normalizedItem,
        hasUpdateInfo: true,
        affected: true
      }
    })

    const keyword = packageKeyword.value.trim().toLowerCase()
    if (!keyword) return list

    return list.filter(item => {
      return (
        item.pkgName?.toLowerCase().includes(keyword) ||
        item.installedPkg?.toLowerCase().includes(keyword) ||
        item.updatePkg?.toLowerCase().includes(keyword) ||
        item.patchId?.toLowerCase().includes(keyword)
      )
    })
  })

  return {
    packageLoading,
    packageTableData,
    packageTableDataAll,
    packageKeyword,
    packageFilteredData,
    selectedPackages,
    packagePagination,
    loadPackageList,
    handlePackageKeywordChange,
    handlePackageSelectionChange,
    handlePackagePageChange,
    handlePackageSizeChange
  }
}
