import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/core/api', () => ({ apiService: api }))

import { patchInstallApi } from '@/modules/patches/api'

beforeEach(() => {
  api.get.mockReset()
  api.get.mockResolvedValue({ data: [] })
})

describe('patch task failed hosts API', () => {
  it('fetches failed hosts with the task ID in the path', async () => {
    await patchInstallApi.getFailedHosts('task/1')
    expect(api.get).toHaveBeenCalledWith('/secops/api/secops/v2/patch/task/task%2F1/failed-hosts')
  })
})
