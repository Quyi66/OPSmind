import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'
import Dialog from '@/modules/automation/components/job/schedule/components/DeviceActionConfirmDialog.vue'

let wrapper
const selection = [{ key: 'host-1', value: '原始主机', runType: 'host' }]
function open(props = {}) {
  wrapper = mount(Dialog, {
    props: { modelValue: true, selection, ...props },
    global: { stubs: {
      'el-dialog': { template: '<section><slot /><slot name="footer" /></section>' },
      'el-button': { template: '<button :disabled="$attrs.disabled"><slot /></button>' }
    } }
  })
  return wrapper.findAll('button')
}
beforeEach(() => setLocale('zh-CN'))
afterEach(async () => {
  wrapper?.unmount()
  await setLocale('zh-CN')
})

describe('在用补丁扫描确认弹窗语言切换', () => {
  it('原位翻译按钮和摘要，保留原始主机及选中数组', async () => {
    open()
    expect(wrapper.findAll('button').map(b => b.text())).toEqual(['取消', '更改设备', '开始扫描'])
    expect(wrapper.text()).toContain('原始主机')
    const element = wrapper.element
    const selectedBefore = wrapper.props('selection')
    await setLocale('en-US')
    expect(wrapper.element).toBe(element)
    expect(wrapper.findAll('button').map(b => b.text())).toEqual(['Cancel', 'Change devices', 'Start scan'])
    expect(wrapper.text()).toContain('Selected:')
    expect(wrapper.text()).toContain('原始主机')
    expect(wrapper.props('selection')).toBe(selectedBefore)
    expect(wrapper.emitted()).toEqual({})
    await wrapper.findAll('button')[2].trigger('click')
    expect(wrapper.emitted('confirm')[0][0]).toBe(selectedBefore)
  })

  it('更改设备只发送原事件，取消仍关闭弹窗', async () => {
    const buttons = open()
    await setLocale('en-US')
    await buttons[1].trigger('click')
    expect(wrapper.emitted('change-devices')).toEqual([[]])
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await buttons[0].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('提交期间切换语言不会解除按钮禁用或关闭保护', async () => {
    open({ submitting: true })
    await setLocale('en-US')
    expect(wrapper.findAll('button').every(b => b.element.disabled)).toBe(true)
    await wrapper.findAll('button')[0].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('无目标时禁用扫描，切换语言仍可更改设备', async () => {
    open({ selection: [] })
    await setLocale('en-US')
    expect(wrapper.findAll('button')[2].element.disabled).toBe(true)
    expect(wrapper.findAll('button')[1].element.disabled).toBe(false)
    expect(wrapper.text()).toContain('No targets selected')
  })
})
