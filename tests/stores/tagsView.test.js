import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { getCurrentUser } = vi.hoisted(() => ({ getCurrentUser: vi.fn() }))

vi.mock('@/core/auth', () => ({
  authService: { getCurrentUser }
}))

import { useTagsViewStore } from '@/stores/tagsView'
import { getTagsViewPersistKey } from '@/utils/tagsViewStorage'

describe('TagsView store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    getCurrentUser.mockReset()
  })

  it("does not restore another user's persisted tags or cached page instances", () => {
    getCurrentUser.mockReturnValue({ id: 'user-a', tenantId: 'tenant-a' })
    const store = useTagsViewStore()

    store.addView({
      path: '/patches/machineScan',
      fullPath: '/patches/machineScan',
      name: 'patches-machineScan',
      meta: { title: '主机概览' }
    })

    getCurrentUser.mockReturnValue({ id: 'user-b', tenantId: 'tenant-a' })
    store.loadPersistedViews()

    expect(store.visitedViews).toEqual([])
    expect(store.cachedViews).toEqual([])
  })

  it('drops retired settings tabs on restore and removes them from persisted storage', () => {
    const user = { id: 'user-a', tenantId: 'tenant-a' }
    getCurrentUser.mockReturnValue(user)
    const key = getTagsViewPersistKey(user)
    const valid = {
      path: '/ssc/engine',
      fullPath: '/ssc/engine',
      name: 'ssc-engine',
      title: '引擎管理'
    }
    const retired = ['applet', 'tag', 'appres'].map(page => ({
      path: `/ssc/${page}`,
      name: `ssc-${page}`
    }))
    localStorage.setItem(key, JSON.stringify([...retired, valid]))
    const store = useTagsViewStore()
    store.loadPersistedViews()
    expect(store.visitedViews.map(view => view.path)).toEqual(['/ssc/engine'])
    expect(JSON.parse(localStorage.getItem(key)).map(view => view.path)).toEqual(['/ssc/engine'])
  })

  it('clears storage even when every stored tab is retired', () => {
    const user = { id: 'user-a', tenantId: 'tenant-a' }
    getCurrentUser.mockReturnValue(user)
    const key = getTagsViewPersistKey(user)
    localStorage.setItem(key, JSON.stringify([{ fullPath: '/ssc/tag/?old=1', name: 'ssc-tag' }]))
    const store = useTagsViewStore()
    store.loadPersistedViews()
    expect(store.visitedViews).toEqual([])
    expect(JSON.parse(localStorage.getItem(key))).toEqual([])
  })

  it('does not add retired views or KeepAlive instances but retains valid settings pages', () => {
    getCurrentUser.mockReturnValue({ id: 'user-a', tenantId: 'tenant-a' })
    const store = useTagsViewStore()
    store.addView({ path: '/ssc/applet/', name: 'ssc-applet', meta: { title: '应用管理' } })
    store.addCachedView({ name: 'ssc-appres', meta: {} })
    store.addVisitedView({ fullPath: '/ssc/tag?old=1', meta: { title: '应用标签' } })
    expect(store.visitedViews).toEqual([])
    expect(store.cachedViews).toEqual([])
    store.addView({ path: '/ssc/param', name: 'ssc-param', meta: { title: '参数配置' } })
    expect(store.visitedViews.map(view => view.path)).toEqual(['/ssc/param'])
    expect(store.cachedViews).toEqual(['ssc-param'])
  })
})
