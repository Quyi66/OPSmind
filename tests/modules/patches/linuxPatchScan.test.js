import { describe, expect, it } from 'vitest'
import { parseOsVersionFilter } from '@/modules/patches/utils/linuxPatchScan'

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
