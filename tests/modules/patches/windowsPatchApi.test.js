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

    expect(apiMocks.get).toHaveBeenCalledWith('/secops/api/secops/win-patch/hosts?page=2&size=50&os=Windows+Server+2025&osVersion=10.0.26100&keyword=192.168.1')
  })

  it('omits empty optional host list filters', () => {
    winPatchApi.getHosts({
      os: ' ',
      osVersion: null,
      keyword: undefined
    })

    expect(apiMocks.get).toHaveBeenCalledWith('/secops/api/secops/win-patch/hosts?page=0&size=20')
  })

  it('loads task detail without calling deprecated /win-patch/tasks/{id} endpoint', async () => {
    apiMocks.get.mockImplementation(url => {
      if (url.includes('/secops/v2/patch/task/task-123/audit/detail')) {
        return Promise.resolve({ data: { steps: [{ step: 'INSTALL', status: 'SUCCESS' }] } })
      }
      if (url.includes('/secops/v2/patch/task/task-123')) {
        return Promise.resolve({ data: { id: 'task-123', status: 'INSTALL_DONE' } })
      }
      return Promise.resolve({ data: {} })
    })

    const result = await winPatchApi.getTaskDetail('task-123')

    expect(result.data.task).toEqual(expect.objectContaining({ id: 'task-123', status: 'INSTALL_DONE' }))
    expect(result.data.steps).toEqual([{ step: 'INSTALL', status: 'SUCCESS' }])
    expect(apiMocks.get).not.toHaveBeenCalledWith(expect.stringMatching(/\/win-patch\/tasks\/task-123/))
  })
})
