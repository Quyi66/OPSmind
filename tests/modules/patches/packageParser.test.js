import { describe, expect, it } from 'vitest'
import {
  parsePackageItem,
  parseRawPackagesText,
  normalizeAffectedPackages
} from '@/modules/patches/utils/packageParser'

describe('packageParser utils', () => {
  describe('parsePackageItem', () => {
    it('handles null/empty strings', () => {
      expect(parsePackageItem('')).toBeNull()
      expect(parsePackageItem(null)).toBeNull()
      expect(parsePackageItem('   ')).toBeNull()
    })

    it('parses name==version', () => {
      expect(parsePackageItem('curl==7.29.0-59.el7_9.1')).toEqual({
        name: 'curl',
        version: '7.29.0-59.el7_9.1'
      })
    })

    it('parses RPM file name with architecture', () => {
      expect(parsePackageItem('openssl-1.0.2k-23.el7_9.x86_64.rpm')).toEqual({
        name: 'openssl',
        version: '1.0.2k-23.el7_9'
      })
    })

    it('parses NVR format without rpm suffix', () => {
      expect(parsePackageItem('kernel-tools-libs-3.10.0-1160.el7')).toEqual({
        name: 'kernel-tools-libs',
        version: '3.10.0-1160.el7'
      })
    })

    it('parses DEB file name', () => {
      expect(parsePackageItem('nginx_1.18.0-0ubuntu1.4_amd64.deb')).toEqual({
        name: 'nginx',
        version: '1.18.0-0ubuntu1.4'
      })
    })

    it('parses pure package name without version', () => {
      expect(parsePackageItem('curl')).toEqual({
        name: 'curl',
        version: ''
      })
    })
  })

  describe('parseRawPackagesText', () => {
    it('parses multi-line text into array', () => {
      const text = `
        curl-7.29.0-59.el7_9.1.x86_64.rpm
        openssl==1.0.2k-23.el7_9
        bash
      `
      expect(parseRawPackagesText(text)).toEqual([
        'curl==7.29.0-59.el7_9.1',
        'openssl==1.0.2k-23.el7_9',
        'bash'
      ])
    })
  })

  describe('normalizeAffectedPackages', () => {
    it('parses transition strings (installed -> target) and strips rpm extension', () => {
      const items = [
        'curl-7.29.0-57.el7.x86_64 → curl-7.29.0-59.el7_9.1.x86_64.rpm',
        'openssl-1.0.2k -> openssl-1.0.2k-23.el7_9.x86_64.rpm'
      ]
      expect(normalizeAffectedPackages(items)).toEqual([
        'curl-7.29.0-59.el7_9.1.x86_64',
        'openssl-1.0.2k-23.el7_9.x86_64'
      ])
    })

    it('parses object records from affected-pkgs API preserving file_name', () => {
      const items = [
        { file_name: 'kernel-4.19.90-89.45.v2401.ky10.aarch64', pkg_name: 'kernel' },
        { file_name: 'kernel-4.19.90-89.45.v2401.ky10.aarch64', pkg_name: 'kernel' }, // duplicate
        { target_pkg: 'bash-4.2.46-35.el7_9.x86_64.rpm' }
      ]
      expect(normalizeAffectedPackages(items)).toEqual([
        'kernel-4.19.90-89.45.v2401.ky10.aarch64',
        'bash-4.2.46-35.el7_9.x86_64'
      ])
    })
  })
})

