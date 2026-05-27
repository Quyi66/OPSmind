import { describe, it, expect } from 'vitest'
import { inferRpmSource } from '../../src/modules/patches/utils/rpmPackageInfo'

describe('rpmPackageInfo - inferRpmSource', () => {
  it('should infer kylin correctly', () => {
    expect(inferRpmSource('KylinSec', '')).toBe('kylin')
    expect(inferRpmSource('', 'KylinOS')).toBe('kylin')
  })

  it('should infer oracle correctly', () => {
    expect(inferRpmSource('Oracle Linux', '')).toBe('oracle')
    expect(inferRpmSource('', 'Oracle')).toBe('oracle')
  })

  it('should infer redhat correctly', () => {
    expect(inferRpmSource('Red Hat', '')).toBe('redhat')
    expect(inferRpmSource('', 'rhel')).toBe('redhat')
    expect(inferRpmSource('RedHat Enterprise', '')).toBe('redhat')
  })

  it('should infer ubuntu correctly', () => {
    expect(inferRpmSource('Ubuntu', '')).toBe('ubuntu')
    expect(inferRpmSource('', 'ubuntu 20.04')).toBe('ubuntu')
  })

  it('should return empty string if no source or distro is matched', () => {
    expect(inferRpmSource('Unknown', 'CentOS')).toBe('')
  })
})
