import { describe, expect, it } from 'vitest'
import { isActiveRunStatus, isSuccessfulRunStatus, normalizeRunStatus } from '@/utils/taskStatus'

describe('task status helpers', () => {
  it('normalizes status values before classification', () => {
    expect(normalizeRunStatus(' running ')).toBe('RUNNING')
    expect(isActiveRunStatus(' processing ')).toBe(true)
    expect(isSuccessfulRunStatus(' completed ')).toBe(true)
  })

  it('does not classify failed or error tasks as successful', () => {
    expect(isSuccessfulRunStatus('FAILED')).toBe(false)
    expect(isSuccessfulRunStatus('ERROR')).toBe(false)
  })
})
