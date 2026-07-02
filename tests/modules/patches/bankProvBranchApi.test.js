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

  it('keeps the frontend template aligned with the documented columns', () => {
    expect(URGENCY_RULE_TEMPLATE_FILENAME).toBe('漏洞威胁等级规则导入模板.xlsx')
    expect(URGENCY_RULE_TEMPLATE_HEADERS).toEqual(['所处环境', '利用程度', '风险等级', '紧急程度'])
  })
})
