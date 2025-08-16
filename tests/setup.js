import { vi } from 'vitest'
import { config } from '@vue/test-utils'

// 全局测试配置
config.global.stubs = {
  // 存根化路由组件
  'router-link': true,
  'router-view': true
}

// 模拟 Element Plus 组件
config.global.stubs['el-button'] = true
config.global.stubs['el-card'] = true
config.global.stubs['el-row'] = true
config.global.stubs['el-col'] = true
config.global.stubs['el-form'] = true
config.global.stubs['el-form-item'] = true
config.global.stubs['el-input'] = true
config.global.stubs['el-dialog'] = true

// 模拟全局属性
config.global.mocks = {
  $router: {
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
  },
  $route: {
    path: '/',
    params: {},
    query: {},
    meta: {}
  }
}

// 模拟 window 对象的方法
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// 模拟 ResizeObserver
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// 模拟 IntersectionObserver
globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// 模拟 console 方法（可选）
// global.console = {
//   ...console,
//   log: vi.fn(),
//   warn: vi.fn(),
//   error: vi.fn(),
// }
