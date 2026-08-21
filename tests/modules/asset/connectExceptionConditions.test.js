import {
  CONNECT_EXCEPTION_CONDITION_OPTIONS,
  CONNECT_EXCEPTION_DEFAULT_CONDITION,
  normalizeConnectExceptionCondition
} from '@/modules/asset/constants/connectException'

describe('connect exception conditions', () => {
  it('provides every meaningful condition supported by the API', () => {
    expect(CONNECT_EXCEPTION_CONDITION_OPTIONS.map(item => item.value)).toEqual([
      'today',
      'recently',
      'recently_ok',
      'low',
      'sjxy_all'
    ])
  })

  it.each(['today', 'recently', 'recently_ok', 'low', 'sjxy_all'])(
    'keeps selectable condition %s',
    condition => {
      expect(normalizeConnectExceptionCondition(condition)).toBe(condition)
    }
  )

  it.each(['oplus_all', '', 'other', undefined, null])(
    'maps full-set alias %s to the default condition',
    condition => {
      expect(normalizeConnectExceptionCondition(condition)).toBe(
        CONNECT_EXCEPTION_DEFAULT_CONDITION
      )
    }
  )
})
