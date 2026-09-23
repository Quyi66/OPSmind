import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { dataManageApi } from '@/modules/asset/api'

export function usePatchHostGroupFilter() {
  const selectedGroupIds = ref([])
  const groupOptions = ref([])
  const groupLoading = ref(false)
  let groupRequestId = 0

  function resetGroupFilter() {
    groupRequestId += 1
    selectedGroupIds.value = []
    groupOptions.value = []
    groupLoading.value = false
  }

  async function loadGroupOptions() {
    const requestId = ++groupRequestId
    groupLoading.value = true
    try {
      const response = await dataManageApi.getAllGroups('linux')
      if (requestId !== groupRequestId) return
      groupOptions.value = (response?.records || [])
        .filter(group =>
          String(group.ci_type || group.ciType || '').toLowerCase() === 'linux' &&
          String(group.path || '').trim() !== '/' &&
          group.id !== null && group.id !== undefined && group.id !== ''
        )
        .map(group => ({
          id: String(group.id),
          label: group.path || group.name || String(group.id)
        }))
    } catch (error) {
      if (requestId !== groupRequestId) return
      console.error('加载主机分组失败:', error)
      ElMessage.error('加载主机分组失败')
      groupOptions.value = []
    } finally {
      if (requestId === groupRequestId) groupLoading.value = false
    }
  }

  return {
    selectedGroupIds,
    groupOptions,
    groupLoading,
    loadGroupOptions,
    resetGroupFilter
  }
}
