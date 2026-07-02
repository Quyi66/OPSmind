import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(() => Promise.resolve({ data: [] })),
  post: vi.fn(() => Promise.resolve({ data: [] })),
  put: vi.fn(() => Promise.resolve({ data: [] })),
  delete: vi.fn(() => Promise.resolve({ data: [] }))
}))

vi.mock('@/core/api', () => ({
  apiService: apiMocks
}))

import { patchScanApi } from '@/modules/patches/api'

describe('machine with patch list API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('queries the VAP machine list with documented filters and zero-based paging', () => {
    patchScanApi.getScanResults({
      os_distro: 'redhat',
      os_version: '8.5',
      os_sp_version: 'SP2',
      keyword: '192.168.1',
      page: 0,
      size: 20
    })

    expect(apiMocks.get).toHaveBeenCalledWith(
      '/secops/api/secops/v2/cve/machine-list?os_distro=redhat&os_version=8.5&os_sp_version=SP2&keyword=192.168.1&page=0&size=20'
    )
  })

  it('omits empty filters and keeps the documented paging defaults', () => {
    patchScanApi.getScanResults({
      os_distro: ' ',
      os_version: '',
      os_sp_version: '',
      keyword: ''
    })

    expect(apiMocks.get).toHaveBeenCalledWith('/secops/api/secops/v2/cve/machine-list?page=0&size=20')
  })
})
