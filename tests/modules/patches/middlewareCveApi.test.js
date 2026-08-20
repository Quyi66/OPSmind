import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn()
}))

vi.mock('@/core/api', () => ({
  apiService: apiMocks
}))

import { middlewareCveApi } from '@/modules/patches/api'

describe('middleware vulnerability API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes supported instance filters and omits empty values', () => {
    middlewareCveApi.getInstances({
      hostId: 'ci-1001',
      middlewareType: 'weblogic',
      provenance: 'tarball',
      keyword: '',
      page: 0,
      size: 20
    })

    expect(apiMocks.get).toHaveBeenCalledWith('/secops/api/secops/v2/middleware/instances', {
      params: {
        hostId: 'ci-1001',
        middlewareType: 'weblogic',
        provenance: 'tarball',
        page: 0,
        size: 20
      }
    })
  })

  it('passes vulnerability filters including false includeIgnored', () => {
    middlewareCveApi.getVulnerabilities({
      hostId: 'ci-1001',
      instanceKey: 'instance-key',
      middlewareType: 'tomcat',
      severity: 'critical',
      cveId: 'CVE-2026-1000',
      fixStatus: 'open',
      includeIgnored: false,
      page: 2,
      size: 50
    })

    expect(apiMocks.get).toHaveBeenCalledWith('/secops/api/secops/v2/middleware/vuls', {
      params: {
        hostId: 'ci-1001',
        instanceKey: 'instance-key',
        middlewareType: 'tomcat',
        severity: 'critical',
        cveId: 'CVE-2026-1000',
        fixStatus: 'open',
        includeIgnored: false,
        page: 2,
        size: 50
      }
    })
  })

  it('calls the vulnerability stats endpoint with an optional host filter', () => {
    middlewareCveApi.getVulnerabilityStats({ hostId: 'ci-1001' })

    expect(apiMocks.get).toHaveBeenCalledWith('/secops/api/secops/v2/middleware/vuls/stats', {
      params: { hostId: 'ci-1001' }
    })
  })

  it('posts ignore state and scan host ids', () => {
    const ignorePayload = {
      instanceKey: 'instance-key',
      cveId: 'CVE-2026-1000',
      ignore: true,
      reason: '内网隔离'
    }
    middlewareCveApi.setVulnerabilityIgnore(ignorePayload)
    middlewareCveApi.scan(['ci-1001', 'ci-1002'])

    expect(apiMocks.post).toHaveBeenNthCalledWith(
      1,
      '/secops/api/secops/v2/middleware/vuls/ignore',
      ignorePayload
    )
    expect(apiMocks.post).toHaveBeenNthCalledWith(2, '/secops/api/secops/v2/middleware/scan', {
      hostIds: ['ci-1001', 'ci-1002']
    })
  })

  it('gets a fix guide with an encoded instance key', () => {
    middlewareCveApi.getFixGuide('instance/key 1')

    expect(apiMocks.get).toHaveBeenCalledWith(
      '/secops/api/secops/v2/middleware/instances/instance%2Fkey%201/fix-guide'
    )
  })

  it('posts one-click fix options without rewriting the payload', () => {
    const payload = {
      instanceKeys: ['instance-key'],
      localPackages: { 'instance-key': '/tmp/tomcat.rpm' }
    }

    middlewareCveApi.fix(payload)

    expect(apiMocks.post).toHaveBeenCalledWith('/secops/api/secops/v2/middleware/fix', payload)
  })
})
