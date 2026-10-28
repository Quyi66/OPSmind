import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/core/api', () => ({ apiService: api }))

import { middlewareCveApi } from '@/modules/patches/api'

beforeEach(() => {
  api.get.mockReset()
  api.get.mockResolvedValue({ data: [] })
})

describe('middleware CVE affected hosts API', () => {
  it('allows querying all middleware types or one specific type', async () => {
    await middlewareCveApi.getAffectedHosts('CVE-2022-41742', 'nginx')
    expect(api.get).toHaveBeenLastCalledWith(
      '/secops/api/secops/v2/middleware-cve/affected-hosts',
      {
        params: { cveId: 'CVE-2022-41742', middlewareType: 'nginx' }
      }
    )

    for (const type of [undefined, '', 'all']) {
      await middlewareCveApi.getAffectedHosts('CVE-2022-41742', type)
      expect(api.get).toHaveBeenLastCalledWith(
        '/secops/api/secops/v2/middleware-cve/affected-hosts',
        {
          params: { cveId: 'CVE-2022-41742' }
        }
      )
    }
  })
})
