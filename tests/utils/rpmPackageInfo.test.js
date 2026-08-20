import { describe, it, expect } from 'vitest'
import {
  buildRpmChangelogFileUrl,
  buildRpmChangelogFileUrls,
  extractRpmPackageChangelog,
  getRpmChangelogVersionCandidates,
  inferRpmSource,
  parseRpmChangelog
} from '../../src/modules/patches/utils/rpmPackageInfo'

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

describe('rpmPackageInfo - static changelog', () => {
  const changelog = `* Fri May 10 2024 Denys Vlasenko <dvlasenk@redhat.com> [4.18.0-553.el8]
- cpuhotplug: Fix kABI breakage caused by CPUHP_AP_HYPERV_ONLINE

* Sun Apr 07 2024 Denys Vlasenko <dvlasenk@redhat.com> [4.18.0-552.el8]
- i40e: Enforce software interrupt during busy-poll exit
- i40e: Remove _t suffix from enum type names`

  it('builds a same-origin changelog URL from a normalized source', () => {
    expect(buildRpmChangelogFileUrl('Ubuntu 22.04')).toBe('/KoreOPS/changelog/ubuntu.txt')
    expect(buildRpmChangelogFileUrl('../unknown')).toBe('')
  })

  it('builds RHEL changelog paths from NEVRA, package initial and version', () => {
    const urls = buildRpmChangelogFileUrls({
      source: 'redhat',
      name: 'abrt',
      currentPackage: 'abrt-2.1.11-60.el7.x86_64',
      architecture: 'x86_64'
    })

    expect(urls[0]).toBe('/KoreOPS/changelog/rhel/rhel7/a/abrt.txt')
    expect(urls).toContain('/KoreOPS/changelog/rhel/rhel7/a/abrt-2.1.11-60.txt')
    expect(urls).toContain('/KoreOPS/changelog/rhel/rhel7/a/abrt-2.1.11-60.el7.txt')
  })

  it('uses a numeric initial and strips module RHEL metadata', () => {
    const detail = {
      source: 'redhat',
      name: '389-ds-base-snmp',
      currentPackage:
        '389-ds-base-snmp-1.4.3.39-26.module+el8.10.0+24681+e3e72ab4.x86_64',
      architecture: 'x86_64'
    }
    const urls = buildRpmChangelogFileUrls(detail)
    const versions = getRpmChangelogVersionCandidates(detail)

    expect(urls[0]).toBe('/KoreOPS/changelog/rhel/rhel8/3/389-ds-base-snmp.txt')
    expect(versions).toContain('1.4.3.39-26')
  })

  it('extracts version-release from RPM package identifiers', () => {
    expect(
      getRpmChangelogVersionCandidates({
        name: 'kernel',
        currentPackage: 'kernel-4.18.0-553.el8.x86_64',
        architecture: 'x86_64'
      })
    ).toContain('4.18.0-553.el8')

    expect(
      getRpmChangelogVersionCandidates({
        name: 'kernel',
        currentPackage: 'kernel-4.18.0-553.el8-x86_64.rpm',
        architecture: 'x86_64'
      })
    ).toContain('4.18.0-553.el8')
  })

  it('returns only the changelog block matching the current package version', () => {
    const result = extractRpmPackageChangelog(changelog, {
      source: 'redhat',
      name: 'kernel',
      currentPackage: 'kernel-4.18.0-553.el8.x86_64',
      architecture: 'x86_64'
    })

    expect(result).toContain('[4.18.0-553.el8]')
    expect(result).toContain('cpuhotplug')
    expect(result).not.toContain('[4.18.0-552.el8]')
  })

  it('matches RPM headers after removing the el distribution suffix', () => {
    const result = extractRpmPackageChangelog(
      `* 2024-06-10 Red Hat Maintainer <maintainer@redhat.com> - 2.1.11-60
- Target release

* 2024-05-01 Red Hat Maintainer <maintainer@redhat.com> - 2.1.11-59
- Previous release`,
      {
        source: 'redhat',
        name: 'abrt',
        currentPackage: 'abrt-2.1.11-60.el7.x86_64',
        architecture: 'x86_64'
      }
    )

    expect(result).toContain('2.1.11-60')
    expect(result).toContain('Target release')
    expect(result).not.toContain('Previous release')
  })

  it('parses bracketed versions for the structured changelog view', () => {
    const parsed = parseRpmChangelog(
      extractRpmPackageChangelog(changelog, { version: '4.18.0-553.el8' })
    )

    expect(parsed.isStructured).toBe(true)
    expect(parsed.entries).toHaveLength(1)
    expect(parsed.entries[0].version).toBe('4.18.0-553.el8')
  })

  it('keeps Debian changelog bullets inside the matched package block', () => {
    const debianChangelog = `linux (6.8.0-31.31) noble; urgency=medium

  * Fix an important issue
  * Update packaging metadata

 -- Ubuntu Kernel Team <kernel-team@lists.ubuntu.com>  Fri, 10 May 2024 10:00:00 +0000

linux (6.8.0-30.30) noble; urgency=medium

  * Previous change`

    const result = extractRpmPackageChangelog(debianChangelog, {
      name: 'linux',
      currentPackage: 'linux_6.8.0-31.31_amd64.deb',
      architecture: 'amd64'
    })

    expect(result).toContain('Fix an important issue')
    expect(result).toContain('Update packaging metadata')
    expect(result).not.toContain('Previous change')
    expect(parseRpmChangelog(result).isStructured).toBe(false)
  })
})
