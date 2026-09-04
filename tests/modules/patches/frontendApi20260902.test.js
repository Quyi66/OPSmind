import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(() => Promise.resolve({ data: {} })),
  post: vi.fn(() => Promise.resolve({ data: [] })),
  put: vi.fn(),
  delete: vi.fn()
}))

vi.mock('@/core/api', () => ({
  apiService: apiMocks
}))

import { patchInstallApi } from '@/modules/patches/api'

describe('2026-09-02 frontend API changes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.get.mockResolvedValue({ data: {} })
    apiMocks.post.mockResolvedValue({ data: [] })
  })

  it('passes selected host IDs when querying affected packages', async () => {
    await patchInstallApi.getAffectedPackages({
      patch_ids: ['KYSA-202409-1017'],
      host_ids: ['host-001', 'host-002']
    })

    expect(apiMocks.post).toHaveBeenCalledWith('/secops/api/secops/v2/patch/affected-pkgs', {
      patch_ids: ['KYSA-202409-1017'],
      host_ids: ['host-001', 'host-002']
    })
  })
})
