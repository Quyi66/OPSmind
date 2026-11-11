import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import Selector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelectorDialog.vue'
import InstanceSelector from '@/modules/automation/components/job/schedule/components/acm/InstanceSelector.vue'

vi.mock('@/modules/automation/api/jao', () => ({
  getAcmCiTypes: vi.fn().mockResolvedValue({ windows: { title: 'Windows' } })
}))

const hosts = [{ key: 'agent/a', value: '192.0.2.1', assetType: 'windows' }]
let wrapper
const confirmButton = () => wrapper.findAll('button').find(button => button.text() === '确定')

afterEach(() => wrapper?.unmount())

describe('设备选择器 Agent 校验联动', () => {
  it('校验期间禁止确认，校验通过后提交真实选择，选择变化通知业务页', async () => {
    wrapper = shallowMount(Selector, {
      props: {
        modelValue: true,
        ciTypes: 'windows',
        initialSelection: hosts,
        confirmDisabled: true,
        closeOnConfirm: false
      },
      global: {
        directives: { loading() {} },
        stubs: {
          'el-dialog': { template: '<section><slot /><slot name="footer" /></section>' },
          'el-card': { template: '<div><slot /></div>' },
          'el-tabs': { template: '<div><slot /></div>' },
          'el-tab-pane': { template: '<div><slot /></div>' },
          'el-button': {
            props: ['disabled'],
            template: '<button :disabled="disabled"><slot /></button>'
          }
        }
      }
    })
    await flushPromises()
    expect(confirmButton().element.disabled).toBe(true)
    wrapper.vm.$.setupState.handleConfirm()
    expect(wrapper.emitted('confirm')).toBeUndefined()

    const nextHosts = [{ key: 'agent/b', value: '192.0.2.2', assetType: 'windows' }]
    wrapper.findComponent(InstanceSelector).vm.$emit('update:modelValue', nextHosts)
    await flushPromises()
    expect(wrapper.emitted('selection-change').at(-1)).toEqual([nextHosts])

    await wrapper.setProps({ confirmDisabled: false })
    await confirmButton().trigger('click')
    expect(wrapper.emitted('confirm')).toEqual([[nextHosts]])
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
