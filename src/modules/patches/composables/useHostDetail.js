import { ref } from 'vue'
import { patchScanApi } from '../api'

/**
 * 主机详情数据逻辑 Composable
 */
export function useHostDetail(hostId, hostInfo) {
  const machineLoading = ref(false)
  const machineInfo = ref({
    hostKey: '',
    hostname: '',
    os_distro: '',
    os_version: '',
    scan_timestamp: '',
    installed_pkgs: ''
  })

  // 加载主机信息
  async function loadMachineInfo() {
    if (!hostId.value) {
      // 使用传入的主机信息
      machineInfo.value = hostInfo.value
      return
    }

    machineLoading.value = true
    try {
      const response = await patchScanApi.getMachineInfo({ host_id: hostId.value })
      const records = response?.data?.records || response?.records || []
      if (records.length > 0) {
        machineInfo.value = records[0]
      } else {
        machineInfo.value = hostInfo.value
      }
    } catch (error) {
      console.error('Failed to load machine info:', error)
      machineInfo.value = hostInfo.value
    } finally {
      machineLoading.value = false
    }
  }

  return {
    machineLoading,
    machineInfo,
    loadMachineInfo
  }
}
