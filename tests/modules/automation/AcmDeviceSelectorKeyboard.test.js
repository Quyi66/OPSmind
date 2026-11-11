import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import Selector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'

vi.mock(
  '@/modules/automation/components/job/schedule/components/AcmDeviceSelectorDialog.vue',
  () => ({
    default: {
      name: 'AcmDeviceSelectorDialog',
      props: ['modelValue', 'initialSelection', 'options'],
      template: '<div />'
    }
  })
)

const devices = [
  { key: 'real-host-id', value: '192.168.1.93', assetType: 'windows', runType: 'host' }
]
let wrapper
const dialog = () => wrapper.findComponent({ name: 'AcmDeviceSelectorDialog' })
afterEach(() => wrapper?.unmount())

describe('已有设备时键盘重开选择器', () => {
  it('摘要可聚焦，Enter和空格均打开原选择器并保留真实选择，空格阻止页面滚动', async () => {
    wrapper = mount(Selector, {
      props: { modelValue: devices },
      global: { stubs: { 'el-tag': true } }
    })
    const summary = wrapper.get('[role="button"]')
    expect(summary.attributes('tabindex')).toBe('0')
    expect(summary.attributes('aria-label')).toBe('重新选择设备')
    await summary.trigger('keydown', { key: 'Enter' })
    expect(dialog().props('modelValue')).toBe(true)
    expect(dialog().props('initialSelection')).toEqual(devices)
    dialog().vm.$emit('update:modelValue', false)
    await flushPromises()
    const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
    summary.element.dispatchEvent(space)
    await flushPromises()
    expect(space.defaultPrevented).toBe(true)
    expect(dialog().props('modelValue')).toBe(true)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('change')).toBeUndefined()
  })

  it('禁用时从Tab序列移除，键盘和点击均不打开或修改设备选择', async () => {
    wrapper = mount(Selector, {
      props: { modelValue: devices, disabled: true },
      global: { stubs: { 'el-tag': true } }
    })
    const summary = wrapper.get('[role="button"]')
    expect(summary.attributes('tabindex')).toBe('-1')
    expect(summary.attributes('aria-disabled')).toBe('true')
    await summary.trigger('keydown', { key: 'Enter' })
    await summary.trigger('keydown', { key: ' ' })
    await summary.trigger('click')
    expect(dialog().props('modelValue')).toBe(false)
    expect(dialog().props('initialSelection')).toEqual(devices)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
