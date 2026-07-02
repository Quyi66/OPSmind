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

import { winKbApi } from '@/modules/patches/api'

describe('Windows KB API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes KB list filters to the backend', () => {
    winKbApi.getKbList({
      page: 2,
      size: 50,
      severity: 'Critical',
      keyword: ' KB5035853 ',
      startDate: '2024-03-01',
      endDate: '2024-03-31'
    })

    expect(apiMocks.get).toHaveBeenCalledWith('/secops/api/secops/v2/win-kb/list', {
      params: {
        page: 2,
        size: 50,
        severity: 'Critical',
        keyword: ' KB5035853 ',
        startDate: '2024-03-01',
        endDate: '2024-03-31'
      }
    })
  })

  it('omits all severity and empty optional filters', () => {
    winKbApi.getKbList({
      severity: 'all',
      keyword: '',
      page: 0,
      size: 20
    })

    expect(apiMocks.get).toHaveBeenCalledWith('/secops/api/secops/v2/win-kb/list', {
      params: {
        page: 0,
        size: 20
      }
    })
  })

  it('calls detail, affected hosts and statistics endpoints', () => {
    winKbApi.getKbDetail('KB5035853')
    winKbApi.getAffectedHosts('KB5035853')
    winKbApi.getStatistics()

    expect(apiMocks.get).toHaveBeenNthCalledWith(1, '/secops/api/secops/v2/win-kb/detail/KB5035853')
    expect(apiMocks.get).toHaveBeenNthCalledWith(
      2,
      '/secops/api/secops/v2/win-kb/affected-hosts/KB5035853'
    )
    expect(apiMocks.get).toHaveBeenNthCalledWith(3, '/secops/api/secops/v2/win-kb/statistics')
  })
})
