import { describe, expect, it, vi, beforeEach } from 'vitest'
import { normalizeAcmDeviceSelection } from '@/modules/automation/components/job/schedule/components/acmDeviceSelector.utils'
import { normalizeAffectedPackages } from '@/modules/patches/utils/packageParser'
import { isFutureSchedule } from '@/modules/patches/utils/patchInstallSchedule'

const api = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn()
}))
vi.mock('@/core/api', () => ({ apiService: api }))
import { patchInstallApi } from '@/modules/patches/api'

describe('PatchScheduleInstallDialog payload generation & validation', () => {
  const futureSchedule = '2026-09-24 02:00:00'
  const futureScheduleWithoutSeconds = '2026-09-24 02:00'
  const now = new Date('2026-09-23T11:00:00').getTime()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates future schedule time and 5-minute multiples', () => {
    expect(/^\d{4}-\d{2}-\d{2} \d{2}:[0-5][05]$/.test(futureScheduleWithoutSeconds)).toBe(true)
    expect(/^\d{4}-\d{2}-\d{2} \d{2}:[0-5][05]$/.test('2026-09-24 02:03')).toBe(false)
    expect(isFutureSchedule(futureSchedule, now)).toBe(true)
    expect(isFutureSchedule('2026-09-22 02:00:00', now)).toBe(false)
  })

  it('correctly normalizes selected hosts into targets', () => {
    const selectedHosts = [
      { hostId: 'ci-101', hostKey: '192.168.1.10', os_distro: 'CentOS' },
      { id: 'ci-102', hostname: 'server2', os_distro: 'RedHat' }
    ]
    const targets = normalizeAcmDeviceSelection(selectedHosts, 'linux')
    expect(targets).toHaveLength(2)
    expect(targets[0]).toMatchObject({
      key: 'ci-101',
      value: '192.168.1.10',
      assetType: 'linux'
    })
    expect(targets[1]).toMatchObject({
      key: 'ci-102',
      value: 'server2',
      assetType: 'linux'
    })
  })

  it('correctly extracts and normalizes packages from affected packages list', () => {
    const affectedPackagesRaw = [
      { file_name: 'kernel-4.19.90-89.45.v2401.ky10.aarch64', pkg_name: 'kernel' },
      { file_name: 'kernel-core-4.19.90-89.45.v2401.ky10.aarch64', pkg_name: 'kernel-core' },
      { file_name: 'kernel-4.19.90-89.45.v2401.ky10.aarch64' } // duplicate
    ]
    const pkgs = normalizeAffectedPackages(affectedPackagesRaw)
    expect(pkgs).toEqual([
      'kernel-4.19.90-89.45.v2401.ky10.aarch64',
      'kernel-core-4.19.90-89.45.v2401.ky10.aarch64'
    ])
  })

  it('falls back to patch package entry if affected packages list is empty', () => {
    const selectedPatches = [
      { patch_id: 'RHSA-2023:001', packages: ['bash-4.2.46-35.el7_9.x86_64.rpm'] }
    ]
    const fallback = selectedPatches.flatMap(p => p.packages || [])
    const pkgs = normalizeAffectedPackages(fallback)
    expect(pkgs).toEqual(['bash-4.2.46-35.el7_9.x86_64'])
  })

  it('submits scheduled patch install task via createAndRunTask', async () => {
    const payload = {
      targets: [{ key: 'ci-101', value: '192.168.1.10', assetType: 'linux' }],
      packages: ['kernel-4.19.90-89.45.v2401.ky10.aarch64'],
      scheduledTime: `${futureScheduleWithoutSeconds}:00`,
      batchSize: 50
    }
    const mockTask = {
      id: 'task-schedule-01',
      status: 'PENDING_APPROVAL',
      scheduledTime: payload.scheduledTime,
      batchSize: 50
    }
    api.post.mockResolvedValueOnce({ data: mockTask })

    const response = await patchInstallApi.createAndRunTask(payload)
    expect(api.post).toHaveBeenCalledWith(
      '/secops/api/secops/v2/patch/task/create-and-run',
      payload
    )
    expect(response?.data?.id).toBe('task-schedule-01')
    expect(response?.data?.status).toBe('PENDING_APPROVAL')
  })
})
