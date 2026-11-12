import { computed } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { currentLocale, setLocale } from '@/core/i18n'

vi.mock('@/core/auth', () => ({ authService: { hasPermission: () => true } }))

import { MENU_CONFIG, getMenuGroups } from '@/config/menu.config'
import { getModuleNav } from '@/config/module-nav.config'
import { registeredModules } from '@/modules/registry'

afterEach(() => setLocale('zh-CN', { persist: false }))

describe('navigation follows production menu and module registration', () => {
  it('translates every registered sidebar, including virtual and cross-module entries, without changing targets', async () => {
    function flatten(items) {
      return items.flatMap(item => [item, ...flatten(item.children || [])])
    }
    const original = registeredModules.map(module => ({
      code: module.code,
      targets: flatten(getModuleNav(module.code)).map(item => [
        item.key,
        item.path,
        item.accessCode
      ])
    }))
    await setLocale('en-US', { persist: false })
    for (const [index, module] of registeredModules.entries()) {
      const items = flatten(getModuleNav(module.code))
      expect(items.map(item => [item.key, item.path, item.accessCode])).toEqual(
        original[index].targets
      )
      for (const item of items)
        expect(item.label, `${module.code}:${item.key}`).not.toMatch(/[\u4e00-\u9fff]/)
    }
    expect(
      getModuleNav('patches')
        .find(item => item.key === 'yumRepoManage')
        .children.some(item => item.path === '/yum-repo/repos')
    ).toBe(true)
  })
  it('invalidates cached menu projections on language changes while preserving the source configuration and visibility', async () => {
    const original = JSON.stringify(MENU_CONFIG)
    const groups = computed(getMenuGroups)
    expect(groups.value.find(group => group.code === 'asset-management').name).toBe('资产管理')
    const codes = groups.value.map(group => group.code)
    await setLocale('en-US', { persist: false })
    expect(groups.value.find(group => group.code === 'asset-management').name).toBe(
      'Asset management'
    )
    await setLocale('zh-CN', { persist: false })
    expect(groups.value.find(group => group.code === 'asset-management').name).toBe('资产管理')
    expect(currentLocale.value).toBe('zh-CN')
    expect(groups.value.map(group => group.code)).toEqual(codes)
    expect(groups.value.some(group => group.code === 'security-management')).toBe(false)
    expect(JSON.stringify(MENU_CONFIG)).toBe(original)
  })
})
