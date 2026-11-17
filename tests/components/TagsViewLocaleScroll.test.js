import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { setLocale } from '@/core/i18n'
import { useTagsViewStore } from '@/stores/tagsView'
import TagsView from '@/components/layout/TagsView/index.vue'

vi.mock('@/core/auth', () => ({
  authService: { getCurrentUser: () => ({ id: 'tags-layout-user', login: 'tags-layout-user' }) }
}))
const moved = vi.fn()
const targetVisible = vi.fn()
const scrollState = vi.fn()
const ScrollPane = defineComponent({
  setup(_, { expose, slots }) {
    expose({
      moveToTarget: moved,
      isTargetVisible: targetVisible,
      getScrollState: scrollState
    })
    return () => h('div', slots.default?.())
  }
})
const Slot = { template: '<div><slot /></div>' }
const Link = defineComponent({
  props: ['to'],
  setup(_, { slots }) {
    return () => slots.default?.({ navigate: () => {} })
  }
})
let wrapper
let router
let store
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  targetVisible.mockReset().mockReturnValue(false)
  scrollState.mockReset().mockReturnValue({ canLeft: true, canRight: true })
  localStorage.clear()
  await setLocale('zh-CN', { persist: false })
  const routes = Array.from({ length: 20 }, (_, index) => ({
    path: `/page-${index}`,
    name: `page-${index}`,
    component: { template: '<div />' },
    meta: { title: '搜索', titleKey: 'common.search' }
  }))
  router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/page-19')
  const pinia = createPinia()
  wrapper = mount(TagsView, {
    global: {
      plugins: [pinia, router],
      stubs: {
        'router-link': Link,
        ScrollPane,
        'el-icon': Slot,
        'el-dropdown': Slot,
        'el-dropdown-menu': Slot,
        'el-dropdown-item': Slot
      }
    }
  })
  store = useTagsViewStore(pinia)
  for (const route of routes) store.addView({ ...route, fullPath: route.path })
  await flushPromises()
  moved.mockClear()
})
afterEach(async () => {
  wrapper?.unmount()
  await setLocale('zh-CN', { persist: false })
  localStorage.clear()
  moved.mockClear()
  vi.clearAllTimers()
  vi.useRealTimers()
})

it('keeps the current English tab visible after language/viewport changes without losing route or cached views', async () => {
  const views = store.visitedViews.map(item => item.path)
  await setLocale('en-US', { persist: false })
  await flushPromises()
  expect(moved).toHaveBeenCalled()
  expect(moved.mock.lastCall[0].getAttribute('data-path')).toBe('/page-19')
  expect(moved.mock.lastCall[0].textContent).toContain('Search')
  moved.mockClear()
  window.dispatchEvent(new Event('resize'))
  await vi.advanceTimersByTimeAsync(100)
  await flushPromises()
  expect(moved.mock.lastCall[0].getAttribute('data-path')).toBe('/page-19')
  expect(store.visitedViews.map(item => item.path)).toEqual(views)
  expect(router.currentRoute.value.path).toBe('/page-19')

  await setLocale('zh-CN', { persist: false })
  await flushPromises()
  moved.mockClear()
  scrollState.mockReturnValue({ canLeft: false, canRight: false })
  window.dispatchEvent(new Event('resize'))
  await flushPromises()
  expect(moved).not.toHaveBeenCalled()
  expect(wrapper.get('.tags-nav-btn--left').classes()).toContain('disabled')
  expect(wrapper.get('.tags-nav-btn--right').classes()).toContain('disabled')
  wrapper.unmount()
  wrapper = undefined
  await setLocale('en-US', { persist: false })
  window.dispatchEvent(new Event('resize'))
  await flushPromises()
  expect(moved).not.toHaveBeenCalled()
})

it('preserves manual scrolling when the current tag remains visible and refreshes both arrow states', async () => {
  await setLocale('en-US', { persist: false })
  await flushPromises()
  moved.mockClear()
  targetVisible.mockReturnValue(true)
  scrollState.mockReturnValue({ canLeft: false, canRight: true })
  window.dispatchEvent(new Event('resize'))
  await vi.advanceTimersByTimeAsync(100)
  await flushPromises()
  expect(moved).not.toHaveBeenCalled()
  expect(targetVisible.mock.lastCall[0].getAttribute('data-path')).toBe('/page-19')
  expect(wrapper.get('.tags-nav-btn--left').classes()).toContain('disabled')
  expect(wrapper.get('.tags-nav-btn--right').classes()).not.toContain('disabled')

  scrollState.mockReturnValue({ canLeft: true, canRight: false })
  window.dispatchEvent(new Event('resize'))
  await vi.advanceTimersByTimeAsync(100)
  await flushPromises()
  expect(moved).not.toHaveBeenCalled()
  expect(wrapper.get('.tags-nav-btn--left').classes()).not.toContain('disabled')
  expect(wrapper.get('.tags-nav-btn--right').classes()).toContain('disabled')
})

it('coalesces a burst of English resize events before revealing a hidden active tag', async () => {
  await setLocale('en-US', { persist: false })
  await flushPromises()
  moved.mockClear()
  for (let index = 0; index < 10; index++) window.dispatchEvent(new Event('resize'))
  await vi.advanceTimersByTimeAsync(50)
  for (let index = 0; index < 10; index++) window.dispatchEvent(new Event('resize'))
  await vi.advanceTimersByTimeAsync(99)
  await flushPromises()
  expect(moved).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  await flushPromises()
  expect(moved).toHaveBeenCalledTimes(1)
  expect(moved.mock.lastCall[0].getAttribute('data-path')).toBe('/page-19')
})

it('cancels deferred English scrolling when switching to Chinese or unmounting', async () => {
  await setLocale('en-US', { persist: false })
  await flushPromises()
  moved.mockClear()
  window.dispatchEvent(new Event('resize'))
  await setLocale('zh-CN', { persist: false })
  await vi.advanceTimersByTimeAsync(200)
  await flushPromises()
  expect(moved).not.toHaveBeenCalled()

  await setLocale('en-US', { persist: false })
  await flushPromises()
  moved.mockClear()
  window.dispatchEvent(new Event('resize'))
  wrapper.unmount()
  wrapper = undefined
  await vi.advanceTimersByTimeAsync(200)
  await flushPromises()
  expect(moved).not.toHaveBeenCalled()
})
