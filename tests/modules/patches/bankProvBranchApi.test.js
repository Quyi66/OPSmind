import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
}))

vi.mock('@/core/api', () => ({
  apiService: apiMocks
}))

import { urgencyApi } from '@/modules/patches/api'
import {
  URGENCY_RULE_TEMPLATE_FILENAME,
  URGENCY_RULE_TEMPLATE_HEADERS
} from '@/modules/patches/utils/urgencyRuleTemplate'

describe('bank province branch urgency API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uploads the rule workbook as multipart form data', () => {
    const file = new File(['rules'], 'rules.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })

    urgencyApi.importRules(file)

    expect(apiMocks.post).toHaveBeenCalledWith(
      '/secops/api/secops/v2/urgency/rule/import',
      expect.any(FormData)
    )
    expect(apiMocks.post.mock.calls[0][1].get('file')).toBe(file)
  })

  it('starts recompute asynchronously and exposes its status endpoint', () => {
    urgencyApi.recompute()
    urgencyApi.getRecomputeStatus()

    expect(apiMocks.post).toHaveBeenCalledWith('/secops/api/secops/v2/urgency/recompute')
    expect(apiMocks.get).toHaveBeenCalledWith('/secops/api/secops/v2/urgency/recompute/status')
  })

  it('encodes hostId in the recompute-host URL', () => {
    const hostId = 'host/with special&chars'

    urgencyApi.recomputeHost(hostId)

    expect(apiMocks.post).toHaveBeenCalledWith(
      `/secops/api/secops/v2/urgency/recompute-host?hostId=${encodeURIComponent(hostId)}`
    )
  })

  it('omits urgency from the page request when all rows are selected', () => {
    urgencyApi.getUrgencyPage({ urgency: 'all', page: 1, size: 20 })

    expect(apiMocks.get).toHaveBeenCalledWith('/secops/api/secops/v2/urgency/page?page=1&size=20')
  })

  it('includes a concrete urgency in the page request', () => {
    urgencyApi.getUrgencyPage({ urgency: '紧急', page: 2, size: 50 })

    expect(apiMocks.get).toHaveBeenCalledWith(
      `/secops/api/secops/v2/urgency/page?urgency=${encodeURIComponent('紧急')}&page=2&size=50`
    )
  })

  it('keeps the frontend template aligned with the documented columns', () => {
    expect(URGENCY_RULE_TEMPLATE_FILENAME).toBe('漏洞威胁等级规则导入模板.xlsx')
    expect(URGENCY_RULE_TEMPLATE_HEADERS).toEqual(['所处环境', '利用程度', '风险等级', '紧急程度'])
  })
})
