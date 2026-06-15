import { describe, expect, it } from 'vitest'
import { buildMemoryOverview, parseOsVersionFilter } from '@/modules/patches/utils/linuxPatchScan'

describe('Linux patch scan version filter', () => {
  it('keeps a version without spaces as the main version', () => {
    expect(parseOsVersionFilter('V10')).toEqual({
      osVersion: 'V10',
      osSpVersion: ''
    })
  })

  it('splits a custom value into the main version and SP version', () => {
    expect(parseOsVersionFilter(' V10   SP3 2403 ')).toEqual({
      osVersion: 'V10',
      osSpVersion: 'SP3 2403'
    })
  })
})

describe('Linux patch scan memory overview', () => {
  it('converts memory from MB to GB and calculates the used percentage', () => {
    expect(buildMemoryOverview('16384', 4096)).toEqual({
      totalGb: '16.0',
      freeGb: '4.0',
      usedPercent: 75,
      usageLevel: 'warning'
    })
  })

  it('supports comma-separated values and clamps invalid usage percentages', () => {
    expect(buildMemoryOverview('8,192', '10,240')).toEqual({
      totalGb: '8.0',
      freeGb: '10.0',
      usedPercent: 0,
      usageLevel: 'healthy'
    })
  })

  it('marks critically high memory usage as dangerous', () => {
    expect(buildMemoryOverview(10240, 512)).toMatchObject({
      usedPercent: 95,
      usageLevel: 'danger'
    })
  })

  it('returns null when both memory fields are unavailable', () => {
    expect(buildMemoryOverview(undefined, '')).toBeNull()
  })
})
