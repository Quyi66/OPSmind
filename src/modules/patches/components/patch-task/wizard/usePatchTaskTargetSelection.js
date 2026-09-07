import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { patchInstallApi } from '../../../api'
import {
  getAgentHostId,
  resolveAgentCapabilityHosts,
  validateAgentCapability
} from '../../../utils/agentCapability'
import { useTableSelectAll } from '../../../composables/useTableSelectAll'

const AFFECTED_PACKAGE_DEBOUNCE_MS = 350
const MAX_AFFECTED_PACKAGE_SYNC_ATTEMPTS = 3
const AFFECTED_PACKAGE_LOAD_STATUS = Object.freeze({
  SUCCESS: 'success',
  FAILED: 'failed',
  SUPERSEDED: 'superseded'
})

export function usePatchTaskTargetSelection({
  props,
  hasFixedHosts,
  resolvedFixedHosts,
  isRollbackTask,
  isPackageTask,
  isVulnerabilityTask
}) {
  const installDataLoading = ref(false)
  const affectedPackagesLoading = ref(false)
  const affectedPackages = ref([])
  const affectedHosts = ref([])
  const selectedHosts = ref([])
  const confirmedHosts = ref([])
  const hostTableRef = ref(null)
  const hostFilter = ref('@@(linux)')
  const hostSearchText = ref('')
  const hostPagination = reactive({ page: 1, pageSize: 10, total: 0 })

  let affectedPackageRequestId = 0
  let affectedPackageDebounceTimer = null
  let affectedPackageLoadedKey = ''
  let affectedPackageInFlightKey = ''
  let affectedPackageInFlightPromise = null
  let targetSelectionSessionId = 0

  const packageEmptyText = computed(() => {
    if (!hasFixedHosts.value && selectedHosts.value.length === 0) {
      return '请选择目标主机后查看匹配的软件包'
    }

    return affectedPackages.value.length === 0 ? '暂无数据' : '未匹配到相关软件包'
  })

  const filteredHostList = computed(() => {
    let hosts = affectedHosts.value
    if (hostSearchText.value) {
      const keyword = hostSearchText.value.toLowerCase()
      hosts = hosts.filter(
        host =>
          host.hostKey?.toLowerCase().includes(keyword) ||
          host.os_distro?.toLowerCase().includes(keyword)
      )
    }
    return hosts
  })

  const filteredHosts = computed(() => {
    const start = (hostPagination.page - 1) * hostPagination.pageSize
    return filteredHostList.value.slice(start, start + hostPagination.pageSize)
  })

  const {
    allSelected: hostAllSelected,
    handleToggleAllSelection: toggleHostSelectAll,
    handleTableSelect: updateHostTableSelection,
    resetAllSelected: resetHostAllSelected
  } = useTableSelectAll(hostTableRef, {
    tableData: filteredHosts,
    filteredData: filteredHostList,
    selectedItems: selectedHosts,
    matchFn: (left, right) =>
      (left.hostId || left.id || left.hostKey) === (right.hostId || right.id || right.hostKey)
  })

  watch(
    filteredHostList,
    hosts => {
      hostPagination.total = hosts.length
      const maxPage = Math.max(1, Math.ceil(hosts.length / hostPagination.pageSize))
      if (hostPagination.page > maxPage) hostPagination.page = maxPage
    },
    { immediate: true }
  )

  function openTargetSelection() {
    targetSelectionSessionId += 1
    if (hasFixedHosts.value) setFixedHosts()
    loadInstallData(props.patchesToInstall.map(patch => patch.patch_id))
  }

  function closeTargetSelection() {
    targetSelectionSessionId += 1
    cancelScheduledAffectedPackageRefresh()
    invalidateAffectedPackageRequest()
  }

  async function loadInstallData(patchIds) {
    cancelScheduledAffectedPackageRefresh()
    invalidateAffectedPackageRequest()
    installDataLoading.value = true
    affectedPackages.value = []

    if (hasFixedHosts.value) {
      setFixedHosts()
    } else {
      affectedHosts.value = []
      selectedHosts.value = []
      confirmedHosts.value = []
      resetHostAllSelected()
    }

    if (isRollbackTask.value) {
      affectedPackages.value = [...props.packageCandidates]
      installDataLoading.value = false
      return
    }

    if ((isPackageTask.value || isVulnerabilityTask.value) && props.packageCandidates.length > 0) {
      affectedPackages.value = [...props.packageCandidates]
      installDataLoading.value = false
      return
    }

    if (!patchIds?.length) {
      installDataLoading.value = false
      return
    }

    try {
      if (hasFixedHosts.value) {
        await loadAffectedPackagesForHosts(resolvedFixedHosts.value)
      } else {
        const hostResponse = await patchInstallApi.getMachinesByPatch({
          patch_ids: patchIds,
          hostId: '@@(linux)'
        })
        if (hostResponse?.data?.records) {
          affectedHosts.value = hostResponse.data.records
          try {
            await refreshAgentInfoForHosts(affectedHosts.value)
          } catch (error) {
            affectedHosts.value.forEach(host => {
              host.agentInfoUnavailable = true
            })
            console.error('Failed to load Agent capability data:', error)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load install data:', error)
    } finally {
      installDataLoading.value = false
    }
  }

  async function syncAffectedPackagesForHosts(hosts = []) {
    let hostsToSync = [...hosts]
    const sessionId = targetSelectionSessionId

    for (let attempt = 0; attempt < MAX_AFFECTED_PACKAGE_SYNC_ATTEMPTS; attempt += 1) {
      const queryKey = buildAffectedPackageQuery(hostsToSync).key
      const loadStatus = await loadAffectedPackagesForHosts(hostsToSync)
      if (sessionId !== targetSelectionSessionId) return false

      const currentHosts = [...selectedHosts.value]
      const currentQueryKey = buildAffectedPackageQuery(currentHosts).key

      if (loadStatus !== AFFECTED_PACKAGE_LOAD_STATUS.SUPERSEDED && currentQueryKey === queryKey) {
        return loadStatus === AFFECTED_PACKAGE_LOAD_STATUS.SUCCESS
      }

      hostsToSync = currentHosts
    }

    ElMessage.warning('目标主机选择变化较频繁，请确认选择后重试')
    return false
  }

  async function validateSelectedHostCapabilities(hosts) {
    try {
      const resolvedHosts = await refreshAgentInfoForHosts(hosts)
      return validateAgentCapability(resolvedHosts, isRollbackTask.value ? 'rollback' : 'patch', [])
    } catch (error) {
      console.error('Failed to refresh Agent capability data:', error)
      ElMessage.error(error?.message || '无法确认目标主机的 Agent 状态，已阻止继续操作')
      return false
    }
  }

  function handleHostPageChange(page) {
    hostPagination.page = page
  }

  function handleHostSizeChange(size) {
    hostPagination.pageSize = size
    hostPagination.page = 1
  }

  function handleToggleHostSelectAll() {
    toggleHostSelectAll()
    scheduleAffectedPackageRefresh(selectedHosts.value)
  }

  function handleHostTableSelect(selection) {
    updateHostTableSelection(selection)
    scheduleAffectedPackageRefresh(selectedHosts.value)
  }

  function setFixedHosts() {
    affectedHosts.value = [...resolvedFixedHosts.value]
    selectedHosts.value = [...resolvedFixedHosts.value]
    confirmedHosts.value = [...resolvedFixedHosts.value]
  }

  function getHostId(host) {
    return String(host?.hostId || host?.host_id || host?.id || '').trim()
  }

  function formatAffectedPackage(pkg = {}) {
    const targetPackage = String(pkg.file_name || pkg.pkg_name || '').trim()
    const installedPackage = String(pkg.installed_pkg || '').trim()

    if (installedPackage && targetPackage && installedPackage !== targetPackage) {
      return `${installedPackage} → ${targetPackage}`
    }

    return targetPackage || installedPackage
  }

  function cancelScheduledAffectedPackageRefresh() {
    if (affectedPackageDebounceTimer !== null) {
      clearTimeout(affectedPackageDebounceTimer)
      affectedPackageDebounceTimer = null
    }
  }

  function invalidateAffectedPackageRequest() {
    affectedPackageRequestId += 1
    affectedPackageLoadedKey = ''
    affectedPackageInFlightKey = ''
    affectedPackageInFlightPromise = null
    affectedPackagesLoading.value = false
  }

  function buildAffectedPackageQuery(hosts = []) {
    const patchIds = Array.from(
      new Set(props.patchesToInstall.map(patch => patch.patch_id).filter(Boolean))
    ).sort()
    const hostIds = Array.from(new Set(hosts.map(getHostId).filter(Boolean))).sort()

    return {
      patchIds,
      hostIds,
      key: JSON.stringify([patchIds, hostIds])
    }
  }

  function scheduleAffectedPackageRefresh(hosts = []) {
    cancelScheduledAffectedPackageRefresh()

    if (isRollbackTask.value || isPackageTask.value || isVulnerabilityTask.value) {
      loadAffectedPackagesForHosts(hosts)
      return
    }

    const hostsSnapshot = [...hosts]
    const { hostIds } = buildAffectedPackageQuery(hostsSnapshot)
    if (hostIds.length === 0) {
      loadAffectedPackagesForHosts(hostsSnapshot)
      return
    }

    affectedPackageDebounceTimer = setTimeout(() => {
      affectedPackageDebounceTimer = null
      loadAffectedPackagesForHosts(hostsSnapshot)
    }, AFFECTED_PACKAGE_DEBOUNCE_MS)
  }

  async function loadAffectedPackagesForHosts(hosts = []) {
    cancelScheduledAffectedPackageRefresh()

    if (isRollbackTask.value) {
      invalidateAffectedPackageRequest()
      affectedPackages.value = [...props.packageCandidates]
      return AFFECTED_PACKAGE_LOAD_STATUS.SUCCESS
    }

    if ((isPackageTask.value || isVulnerabilityTask.value) && props.packageCandidates.length > 0) {
      invalidateAffectedPackageRequest()
      affectedPackages.value = [...props.packageCandidates]
      return AFFECTED_PACKAGE_LOAD_STATUS.SUCCESS
    }

    const { patchIds, hostIds, key: queryKey } = buildAffectedPackageQuery(hosts)
    if (patchIds.length === 0 || hostIds.length === 0) {
      invalidateAffectedPackageRequest()
      affectedPackages.value = []
      return AFFECTED_PACKAGE_LOAD_STATUS.SUCCESS
    }

    if (affectedPackageInFlightKey === queryKey && affectedPackageInFlightPromise) {
      return affectedPackageInFlightPromise
    }
    if (affectedPackageLoadedKey === queryKey) return AFFECTED_PACKAGE_LOAD_STATUS.SUCCESS

    const requestId = ++affectedPackageRequestId
    affectedPackageLoadedKey = ''
    affectedPackageInFlightKey = queryKey
    affectedPackagesLoading.value = true

    const requestPromise = (async () => {
      try {
        const response = await patchInstallApi.getAffectedPackages({
          patch_ids: patchIds,
          host_ids: hostIds
        })
        if (requestId !== affectedPackageRequestId) {
          return AFFECTED_PACKAGE_LOAD_STATUS.SUPERSEDED
        }

        affectedPackages.value = Array.from(
          new Set((response?.data || []).map(formatAffectedPackage).filter(Boolean))
        )
        affectedPackageLoadedKey = queryKey
        return AFFECTED_PACKAGE_LOAD_STATUS.SUCCESS
      } catch (error) {
        if (requestId !== affectedPackageRequestId) {
          return AFFECTED_PACKAGE_LOAD_STATUS.SUPERSEDED
        }

        affectedPackages.value = []
        console.error('Failed to load affected packages:', error)
        const currentQueryKey = buildAffectedPackageQuery(selectedHosts.value).key
        if (currentQueryKey === queryKey) {
          ElMessage.error('获取所选主机的受影响软件包失败，请重试')
        }
        return AFFECTED_PACKAGE_LOAD_STATUS.FAILED
      } finally {
        if (requestId === affectedPackageRequestId) {
          affectedPackagesLoading.value = false
          affectedPackageInFlightKey = ''
          affectedPackageInFlightPromise = null
        }
      }
    })()

    affectedPackageInFlightPromise = requestPromise
    return requestPromise
  }

  async function refreshAgentInfoForHosts(hosts) {
    const resolvedHosts = await resolveAgentCapabilityHosts(hosts)
    const infoByHostId = new Map(
      resolvedHosts.map(host => [getAgentHostId(host), host]).filter(([hostId]) => hostId)
    )

    hosts.forEach(host => {
      const resolved = infoByHostId.get(getAgentHostId(host))
      if (resolved) Object.assign(host, resolved)
    })
    return resolvedHosts
  }

  onBeforeUnmount(closeTargetSelection)

  return {
    affectedHosts,
    affectedPackages,
    affectedPackagesLoading,
    confirmedHosts,
    filteredHosts,
    handleHostPageChange,
    handleHostSizeChange,
    handleHostTableSelect,
    handleToggleHostSelectAll,
    hostAllSelected,
    hostFilter,
    hostPagination,
    hostSearchText,
    hostTableRef,
    installDataLoading,
    closeTargetSelection,
    openTargetSelection,
    packageEmptyText,
    resetHostAllSelected,
    selectedHosts,
    syncAffectedPackagesForHosts,
    validateSelectedHostCapabilities
  }
}
