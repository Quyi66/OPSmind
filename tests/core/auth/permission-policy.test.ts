import { describe, expect, it } from 'vitest'
import { canAccessMenuCode } from '@/core/auth/permission-policy'

describe('menu permission policy', () => {
  it('keeps Yum repository navigation behind its independent permission', () => {
    const hasPatchPermission = (permission: string) => permission === 'applet:vap'
    const hasYumRepoPermission = (permission: string) => permission === 'applet:spm'

    expect(canAccessMenuCode(hasPatchPermission, 'patches')).toBe(true)
    expect(canAccessMenuCode(hasPatchPermission, 'yum-repo')).toBe(false)
    expect(canAccessMenuCode(hasYumRepoPermission, 'yum-repo')).toBe(true)
  })
})
