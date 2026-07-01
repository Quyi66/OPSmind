import {
  ensureArray,
  ensurePositiveInteger,
  extractRecords,
  extractTotal,
  normalizePagedResponse,
  toNumber
} from '@/modules/asset/utils/response'

describe('asset response helpers', () => {
  it('extracts records from known paged response shapes', () => {
    expect(extractRecords([{ id: 1 }])).toEqual([{ id: 1 }])
    expect(extractRecords({ records: [{ id: 2 }] })).toEqual([{ id: 2 }])
    expect(extractRecords({ data: [{ id: 3 }] })).toEqual([{ id: 3 }])
    expect(extractRecords({ data: { records: [{ id: 4 }] } })).toEqual([{ id: 4 }])
  })

  it('falls back to an empty array for malformed records', () => {
    expect(extractRecords(null)).toEqual([])
    expect(extractRecords({ records: { id: 1 } })).toEqual([])
    expect(ensureArray('broken')).toEqual([])
  })

  it('normalizes total fields with sensible fallbacks', () => {
    expect(extractTotal({ total: '12' })).toBe(12)
    expect(extractTotal({ data: { total: 8 } })).toBe(8)
    expect(extractTotal({}, 5)).toBe(5)
    expect(normalizePagedResponse({ records: [{ id: 1 }] })).toEqual({
      records: [{ id: 1 }],
      total: 1
    })
  })

  it('guards numeric helpers for invalid values', () => {
    expect(toNumber('9')).toBe(9)
    expect(toNumber('oops')).toBe(0)
    expect(ensurePositiveInteger(10, 1)).toBe(10)
    expect(ensurePositiveInteger('0', 7)).toBe(7)
    expect(ensurePositiveInteger(undefined, 3)).toBe(3)
  })
})
