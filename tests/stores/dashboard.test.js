import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDashboardStore } from '@/stores/dashboard'

// 模拟 angularjs-bridge 服务
vi.mock('@/services/angularjs-bridge', () => ({
  angularBridge: {
    getCurrentUser: vi.fn(),
    getAvailableModules: vi.fn(),
    getSystemStats: vi.fn()
  }
}))

describe('Dashboard Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with correct default state', () => {
    const store = useDashboardStore()

    expect(store.currentUser).toBeNull()
    expect(store.availableModules).toEqual([])
    expect(store.systemStats).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('computes desktop modules correctly', () => {
    const store = useDashboardStore()

    store.availableModules = [
      { code: 'module1', showIn: { desktop: 1 } },
      { code: 'module2', showIn: { desktop: 2 } },
      { code: 'module3', showIn: { dock: 1 } }
    ]

    expect(store.desktopModules).toHaveLength(2)
    expect(store.desktopModules[0].code).toBe('module1')
    expect(store.desktopModules[1].code).toBe('module2')
  })

  it('computes dock modules correctly', () => {
    const store = useDashboardStore()

    store.availableModules = [
      { code: 'module1', showIn: { desktop: 1 } },
      { code: 'module2', showIn: { dock: 1 } },
      { code: 'module3', showIn: { dock: 2 } }
    ]

    expect(store.dockModules).toHaveLength(2)
    expect(store.dockModules[0].code).toBe('module2')
    expect(store.dockModules[1].code).toBe('module3')
  })

  it('gets correct module title', () => {
    const store = useDashboardStore()

    expect(store.getModuleTitle('cac')).toBe('CAC 配置管理')
    expect(store.getModuleTitle('jao')).toBe('JAO 作业编排')
    expect(store.getModuleTitle('unknown')).toBe('UNKNOWN')
  })

  it('resets state correctly', () => {
    const store = useDashboardStore()

    // 设置一些状态
    store.currentUser = { name: 'test' }
    store.availableModules = [{ code: 'test' }]
    store.loading = true
    store.error = 'test error'

    // 重置状态
    store.reset()

    expect(store.currentUser).toBeNull()
    expect(store.availableModules).toEqual([])
    expect(store.systemStats).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })
})
