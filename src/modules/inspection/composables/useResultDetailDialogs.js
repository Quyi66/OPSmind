/**
 * 弹窗管理 Composable
 */
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { dtsApi, whitelistApi } from '../api'

export function useResultDetailDialogs(jobId, jobInfo) {
  // ===== 主机详情弹窗 =====
  const hostDetailVisible = ref(false)
  const hostCheckItemsLoading = ref(false)
  const hostDetailStatusFilter = ref('all')
  const currentHost = ref(null)
  const hostMachineInfo = ref({})
  const hostCheckItems = ref([])

  async function showHostDetail(row) {
    currentHost.value = row
    hostDetailStatusFilter.value = 'all'
    hostDetailVisible.value = true
    hostMachineInfo.value = {}
    loadHostMachineInfo(row.host_id)
    loadHostCheckItems()
  }

  function showItemsByStatus(row, status) {
    currentHost.value = row
    hostDetailStatusFilter.value = status
    hostDetailVisible.value = true
    hostMachineInfo.value = {}
    loadHostMachineInfo(row.host_id)
    loadHostCheckItems()
  }

  async function loadHostMachineInfo(hostId) {
    try {
      const res = await dtsApi.getMachineInfo(hostId)
      const data = res?.data || res || {}
      const records = data.records || []
      if (records.length > 0) {
        hostMachineInfo.value = records[0]
      }
    } catch (error) {
      console.error('加载主机信息失败:', error)
    }
  }

  async function loadHostCheckItems() {
    if (!currentHost.value) return
    hostCheckItemsLoading.value = true
    hostCheckItems.value = []

    try {
      const res = await dtsApi.getCheckItemMachineDetail({
        host_key: currentHost.value.host_key,
        job_id: jobId.value,
        status: hostDetailStatusFilter.value
      }, { size: 100, page: 1 })
      const data = res?.data || res || {}
      hostCheckItems.value = data.records || []
    } catch (error) {
      console.error('加载检查项列表失败:', error)
      ElMessage.error('加载检查项失败')
    } finally {
      hostCheckItemsLoading.value = false
    }
  }

  // ===== KPI 详情弹窗 =====
  const kpiDialogVisible = ref(false)
  const kpiDialogTitle = ref('')
  const kpiDialogData = ref([])
  const kpiDialogLoading = ref(false)

  async function showKpiDialog(status) {
    const titleMap = {
      'OK': '检查通过',
      'FAILED': '检查失败',
      'CHECK': '人工检查',
      'SKIPPING': '白名单',
      'UNREACHABLE': '数据缺失'
    }

    kpiDialogTitle.value = `${titleMap[status]} - 详情`
    kpiDialogVisible.value = true
    kpiDialogLoading.value = true
    kpiDialogData.value = []

    try {
      const res = await dtsApi.getCheckItemByStatus(jobId.value, status)
      const data = res?.data || res || {}
      kpiDialogData.value = data.records || []
    } catch (error) {
      console.error('获取 KPI 详情失败:', error)
      ElMessage.error('获取详情失败')
    } finally {
      kpiDialogLoading.value = false
    }
  }

  // ===== 巡检结果详情弹窗 =====
  const checkItemDetailVisible = ref(false)
  const checkItemDetailLoading = ref(false)
  const currentCheckItem = ref(null)

  async function showCheckItemDetail(row) {
    currentCheckItem.value = { ...row }
    checkItemDetailVisible.value = true
    checkItemDetailLoading.value = true

    try {
      if (row.id) {
        const res = await dtsApi.getCheckItemInfo(row.id)
        const data = res?.data || res || {}
        const records = data.records || []
        if (records.length > 0) {
          const record = records[0]
          currentCheckItem.value = {
            ...row,
            status: record.status,
            name: record.name,
            output: record.output || '',
            host_key: record.host_key,
            host_id: record.host_id,
            job_id: record.job_id
          }
        }
      }
    } catch (error) {
      console.error('获取检查项详情失败:', error)
    } finally {
      checkItemDetailLoading.value = false
    }
  }

  // ===== 检查项关联主机弹窗 =====
  const checkItemHostsVisible = ref(false)
  const checkItemHostsLoading = ref(false)
  const checkItemHostsData = ref([])
  const currentCheckItemName = ref('')
  const checkItemHostsStatusFilter = ref('all')

  async function showCheckItemHostsDialog(row) {
    currentCheckItemName.value = row.name
    checkItemHostsStatusFilter.value = 'all'
    checkItemHostsVisible.value = true
    loadCheckItemHosts()
  }

  async function loadCheckItemHosts() {
    checkItemHostsLoading.value = true
    checkItemHostsData.value = []

    try {
      const res = await dtsApi.getCheckItemDetail({
        job_id: jobId.value,
        name: currentCheckItemName.value,
        status: checkItemHostsStatusFilter.value
      }, { size: 100, page: 1 })
      const data = res?.data || res || {}
      checkItemHostsData.value = data.records || []
    } catch (error) {
      console.error('获取检查项关联主机失败:', error)
      ElMessage.error('获取关联主机失败')
    } finally {
      checkItemHostsLoading.value = false
    }
  }

  // ===== 白名单弹窗 =====
  const whitelistVisible = ref(false)
  const whitelistLoading = ref(false)
  const whitelistData = ref([])
  const selectedWhitelistIds = ref([])

  async function showWhitelistDialog() {
    whitelistVisible.value = true
    whitelistLoading.value = true
    selectedWhitelistIds.value = []

    try {
      const res = await dtsApi.getBlackList('cac')
      const data = res?.data || res || {}
      whitelistData.value = data.records || []
    } catch (error) {
      console.error('加载白名单失败:', error)
      ElMessage.error('加载白名单失败')
    } finally {
      whitelistLoading.value = false
    }
  }

  function handleWhitelistSelectionChange(selection) {
    selectedWhitelistIds.value = selection.map(row => row.host_id)
  }

  async function removeSelectedWhitelist() {
    if (selectedWhitelistIds.value.length === 0) {
      ElMessage.warning('请先选择要移除的主机')
      return
    }

    try {
      await ElMessageBox.confirm('确定要将选中的主机从白名单移除吗？', '确认')
      await whitelistApi.removeBlackHost(selectedWhitelistIds.value)
      ElMessage.success('移除成功')
      showWhitelistDialog()
    } catch (e) {
      if (e !== 'cancel') {
        console.error('移除白名单失败:', e)
      }
    }
  }

  // ===== 检查项白名单弹窗 =====
  const itemWhitelistVisible = ref(false)
  const itemWhitelistLoading = ref(false)
  const itemWhitelistData = ref([])

  async function showItemWhitelist() {
    itemWhitelistVisible.value = true
    itemWhitelistLoading.value = true
    itemWhitelistData.value = []

    try {
      const templateId = jobInfo.value?.templateId
      if (templateId) {
        const res = await whitelistApi.getWhitelist(templateId)
        itemWhitelistData.value = res?.data || res || []
      }
    } catch (error) {
      console.error('加载检查项白名单失败:', error)
      ElMessage.error('加载白名单失败')
    } finally {
      itemWhitelistLoading.value = false
    }
  }

  async function deleteItemWhitelist(item) {
    try {
      await ElMessageBox.confirm('确定要删除此白名单项吗？', '确认')
      await whitelistApi.deleteWhitelist(item.id)
      ElMessage.success('删除成功')
      showItemWhitelist()
    } catch (e) {
      if (e !== 'cancel') {
        console.error('删除白名单失败:', e)
      }
    }
  }

  return {
    // 主机详情
    hostDetailVisible,
    hostCheckItemsLoading,
    hostDetailStatusFilter,
    currentHost,
    hostMachineInfo,
    hostCheckItems,
    showHostDetail,
    showItemsByStatus,
    loadHostCheckItems,
    // KPI 详情
    kpiDialogVisible,
    kpiDialogTitle,
    kpiDialogData,
    kpiDialogLoading,
    showKpiDialog,
    // 巡检结果详情
    checkItemDetailVisible,
    checkItemDetailLoading,
    currentCheckItem,
    showCheckItemDetail,
    // 检查项关联主机
    checkItemHostsVisible,
    checkItemHostsLoading,
    checkItemHostsData,
    currentCheckItemName,
    checkItemHostsStatusFilter,
    showCheckItemHostsDialog,
    loadCheckItemHosts,
    // 白名单
    whitelistVisible,
    whitelistLoading,
    whitelistData,
    selectedWhitelistIds,
    showWhitelistDialog,
    handleWhitelistSelectionChange,
    removeSelectedWhitelist,
    // 检查项白名单
    itemWhitelistVisible,
    itemWhitelistLoading,
    itemWhitelistData,
    showItemWhitelist,
    deleteItemWhitelist
  }
}
