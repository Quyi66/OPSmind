import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { dataManageApi } from '@/modules/asset/api'

export function usePatchHostGroupFilter() {
  const selectedGroupIds = ref([])
  const groupOptions = ref([])
  const selectedTagNames = ref([])
  const tagOptions = ref([])
  const groupLoading = ref(false)
  let groupRequestId = 0
  let tagRequestId = 0

  function resetGroupFilter() {
    groupRequestId += 1
    tagRequestId += 1
    selectedGroupIds.value = []
    selectedTagNames.value = []
    groupOptions.value = []
    tagOptions.value = []
    groupLoading.value = false
  }

  async function loadGroupOptions() {
    const requestId = ++groupRequestId
    groupLoading.value = true
    loadTagOptions()
    try {
      const response = await dataManageApi.getAllGroups('linux')
      if (requestId !== groupRequestId) return
      const linuxGroups = (response?.records || []).filter(group =>
        String(group.ci_type || group.ciType || '').toLowerCase() === 'linux' &&
        String(group.path || '').trim() !== '/' &&
        group.id !== null && group.id !== undefined && group.id !== ''
      )
      groupOptions.value = linuxGroups.map(group => ({
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

  async function loadTagOptions() {
    const requestId = ++tagRequestId
    try {
      const response = await dataManageApi.getAllTags('linux')
      if (requestId !== tagRequestId) return
      tagOptions.value = [
        ...new Set((response?.records || []).map(tag => String(tag?.name || '').trim()).filter(Boolean))
      ].map(name => ({ name, label: name }))
    } catch (error) {
      if (requestId !== tagRequestId) return
      console.error('加载主机标签失败:', error)
      ElMessage.error('加载主机标签失败')
      tagOptions.value = []
    }
  }

  return {
    selectedGroupIds,
    groupOptions,
    selectedTagNames,
    tagOptions,
    groupLoading,
    loadGroupOptions,
    resetGroupFilter
  }
}
