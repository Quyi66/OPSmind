import { afterEach, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import ScrollPane from '@/components/layout/TagsView/ScrollPane.vue'

const Scrollbar = defineComponent({
  setup(_, { expose, slots }) {
    const wrapRef = ref(null)
    expose({ wrapRef })
    return () =>
      h('div', [h('div', { ref: wrapRef, class: 'el-scrollbar__wrap' }, slots.default?.())])
  }
})
let wrapper
afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
})

it('recognizes fully visible tags and either clipped edge using the scroll viewport', () => {
  wrapper = mount(ScrollPane, {
    slots: { default: '<span class="test-tag">Current page</span>' },
    global: { stubs: { 'el-scrollbar': Scrollbar } }
  })
  const viewport = wrapper.get('.el-scrollbar__wrap').element
  const target = wrapper.get('.test-tag').element
  Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 200 })
  vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({ left: 100, right: 300 })
  const rect = vi.spyOn(target, 'getBoundingClientRect')
  rect.mockReturnValue({ left: 110, right: 250, width: 140 })
  expect(wrapper.vm.isTargetVisible(target)).toBe(true)
  rect.mockReturnValue({ left: 100, right: 300, width: 200 })
  expect(wrapper.vm.isTargetVisible({ $el: target })).toBe(true)
  rect.mockReturnValue({ left: 90, right: 190, width: 100 })
  expect(wrapper.vm.isTargetVisible(target)).toBe(false)
  rect.mockReturnValue({ left: 250, right: 350, width: 100 })
  expect(wrapper.vm.isTargetVisible(target)).toBe(false)
  expect(wrapper.vm.isTargetVisible(null)).toBe(false)
  Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 0 })
  expect(wrapper.vm.isTargetVisible(target)).toBe(false)
})
