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

import { patchInstallApi, rpmInfoApi } from '@/modules/patches/api'
import { useRpmPackageList } from '@/modules/patches/composables/useRpmPackageList'

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

  it('queries OS version options for the selected source', () => {
    rpmInfoApi.getOsVersions({ source: ' ubuntu ' })

    expect(apiMocks.get).toHaveBeenCalledWith(
      '/secops/api/secops/v2/rpm-info/os-versions?source=ubuntu'
    )
  })

  it('passes the OS version filter to the RPM package list', () => {
    rpmInfoApi.getPackageList({
      source: 'ubuntu',
      osVersion: '22.04',
      page: 0,
      size: 20
    })

    expect(apiMocks.get).toHaveBeenCalledWith(
      '/secops/api/secops/v2/rpm-info/list?source=ubuntu&osVersion=22.04&page=0&size=20'
    )
  })

  it('keeps the newest filter options when source responses arrive out of order', async () => {
    const pendingRequests = new Map()
    apiMocks.get.mockImplementation(
      url =>
        new Promise(resolve => {
          pendingRequests.set(url, resolve)
        })
    )

    const { filters, archOptions, osVersionOptions } = useRpmPackageList()
    filters.source = 'ubuntu'
    filters.source = 'redhat'

    pendingRequests.get(
      '/secops/api/secops/v2/rpm-info/architectures?source=redhat'
    )({ data: { content: ['x86_64'] } })
    pendingRequests.get(
      '/secops/api/secops/v2/rpm-info/os-versions?source=redhat'
    )({ data: { content: ['8'] } })
    await Promise.resolve()

    expect(archOptions.value).toEqual(['x86_64'])
    expect(osVersionOptions.value).toEqual(['8'])

    pendingRequests.get(
      '/secops/api/secops/v2/rpm-info/architectures?source=ubuntu'
    )({ data: { content: ['amd64'] } })
    pendingRequests.get(
      '/secops/api/secops/v2/rpm-info/os-versions?source=ubuntu'
    )({ data: { content: ['22.04'] } })
    await Promise.resolve()

    expect(archOptions.value).toEqual(['x86_64'])
    expect(osVersionOptions.value).toEqual(['8'])
  })
})
