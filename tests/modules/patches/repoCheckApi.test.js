import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/core/api', () => ({ apiService: api }))

import { patchScanApi } from '@/modules/patches/api'

beforeEach(() => {
  api.get.mockReset()
  api.get.mockResolvedValue({ data: [] })
})

describe('single-machine repository check API', () => {
  it('preserves repo_check in normalized single-machine patch records', async () => {
    const repoCheck = {
      status: 'NOT_INSTALLABLE',
      missingPkgs: ['nginx'],
      outdatedPkgs: [{ pkgName: 'libxml2', requiredVersion: '2.9.10-43', repoVersion: '2.9.10-42' }]
    }
    const records = [
      { patch_id: 'KYSA-1', repo_check: repoCheck },
      { patch_id: 'KYSA-2', repo_check: null }
    ]
    api.get.mockResolvedValueOnce({ data: records })

    const result = await patchScanApi.getPatchesOfMachine({
      host_id: 'host-1',
      severity: 'Critical'
    })

    expect(api.get).toHaveBeenCalledWith('/secops/api/secops/dashboard/patch-of-one-machine', {
      params: { hostId: 'host-1', severity: 'Critical' }
    })
    expect(result.data.records).toEqual(records)
  })
})
