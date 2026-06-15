import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
}))

vi.mock('@/core/api', () => ({
  apiService: apiMocks
}))

import { winPatchApi } from '@/modules/patches/windows-patch/api'

describe('Windows patch API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes host list filters to the backend', () => {
    winPatchApi.getHosts({
      page: 2,
      size: 50,
      os: ' Windows Server 2025 ',
      osVersion: ' 10.0.26100 ',
      keyword: ' 192.168.1 '
    })

    expect(apiMocks.get).toHaveBeenCalledWith('/vap/api/vap/win-patch/hosts', {
      params: {
        page: 2,
        size: 50,
        os: 'Windows Server 2025',
        osVersion: '10.0.26100',
        keyword: '192.168.1'
      }
    })
  })

  it('omits empty optional host list filters', () => {
    winPatchApi.getHosts({
      os: ' ',
      osVersion: null,
      keyword: undefined
    })

    expect(apiMocks.get).toHaveBeenCalledWith('/vap/api/vap/win-patch/hosts', {
      params: {
        page: 0,
        size: 20
      }
    })
  })
})
