import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { getCurrentUser } = vi.hoisted(() => ({ getCurrentUser: vi.fn() }))

vi.mock('@/core/auth', () => ({
  authService: { getCurrentUser }
}))

import { useTagsViewStore } from '@/stores/tagsView'

describe('TagsView store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    getCurrentUser.mockReset()
  })

  it('does not restore another user\'s persisted tags or cached page instances', () => {
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
})
