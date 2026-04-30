import { onBeforeUnmount, ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { patchScanApi, rpmInfoApi } from '../api'

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
  const legacyAffectedPkgsCache = ref([])
  const legacyAffectedPkgsHostId = ref('')
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

  function pickLatestLegacyMatch(matches = []) {
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

    return {
      ...row,
      packageInfo,
      pkgName,
      installedPkg,
      currentPackage: installedPkg,
      pkgId: installedPkg,
      architecture,
      arch: architecture,
      source:
        getStringValue(row, ['source']) || getStringValue(packageInfo, ['source']) || row.source || '',
      services: row.services || packageInfo.services || [],
      affected: getBooleanValue(row, ['affected'])
    }
  }

  function buildLegacyAffectedLookup(affectedPkgs = []) {
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

  function getLegacyMatches(baseRow, affectedLookup) {
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

  function mergeScanRowsWithLegacy(scanRows = [], affectedPkgs = []) {
    const affectedLookup = buildLegacyAffectedLookup(affectedPkgs)
    return scanRows.map(rawRow => {
      const baseRow = normalizeScanPackageRow(rawRow)
      const match = pickLatestLegacyMatch(getLegacyMatches(baseRow, affectedLookup))

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

  async function getLegacyAffectedPkgs(forceRefresh = false) {
    if (
      !forceRefresh &&
      legacyAffectedPkgsHostId.value === hostId.value
    ) {
      return legacyAffectedPkgsCache.value
    }

    const response = await patchScanApi.getMachinePackages({
      host_id: hostId.value
    })

    const data = response?.data || response || {}
    const legacyRecord = Array.isArray(data.records) ? data.records[0] : null
    const affectedPkgs = parseJsonArray(legacyRecord?.affected_pkgs)

    legacyAffectedPkgsCache.value = affectedPkgs
    legacyAffectedPkgsHostId.value = hostId.value

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
      const [listResult, legacyResult] = await Promise.allSettled([
        fetchInstalledPackagePage(),
        getLegacyAffectedPkgs(options.forceLegacy === true)
      ])

      if (listResult.status !== 'fulfilled') {
        throw listResult.reason
      }

      if (requestId !== latestRequestId) {
        return
      }

      let affectedPkgs = []

      if (legacyResult.status === 'fulfilled') {
        affectedPkgs = legacyResult.value
      } else {
        console.warn('Failed to load legacy package compatibility mapping:', legacyResult.reason)
      }

      const mergedRows = mergeScanRowsWithLegacy(listResult.value.rows, affectedPkgs)
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

  return {
    packageLoading,
    packageTableData,
    packageTableDataAll,
    packageKeyword,
    selectedPackages,
    packagePagination,
    loadPackageList,
    handlePackageKeywordChange,
    handlePackageSelectionChange,
    handlePackagePageChange,
    handlePackageSizeChange
  }
}
