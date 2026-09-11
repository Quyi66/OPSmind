import { apiService } from '@/core/api'

export async function scanPatchHosts(hostIds) {
  const ids = [...new Set(hostIds.map(String).filter(Boolean))]
  if (!ids.length) throw new Error('请选择至少一台主机')
  const response = await apiService.post('/secops/api/secops/patch/scan', { hostIds: ids })
  return response?.data || response
}

export function getScanRuns(result) {
  return [
    ...(result?.windowsRunId ? [{ runId: result.windowsRunId, label: 'Windows 扫描' }] : []),
    ...(result?.linuxRunIds || []).map((runId, index) => ({
      runId,
      label: `Linux 扫描 ${index + 1}`
    }))
  ]
}
