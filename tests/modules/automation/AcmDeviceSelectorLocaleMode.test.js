import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { setLocale, t } from '@/core/i18n'
import Selector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import Dialog from '@/modules/automation/components/job/schedule/components/AcmDeviceSelectorDialog.vue'

const api = vi.hoisted(() => ({ types: vi.fn().mockResolvedValue({ data: { linux: { title: 'Linux' } } }) }))
vi.mock('@/modules/automation/api/jao', () => ({ getAcmCiTypes: api.types, getAcmCiTypesAuto: api.types }))
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
let wrapper
afterEach(async () => {
  wrapper?.unmount()
  await setLocale('zh-CN', { persist: false })
  vi.clearAllMocks()
})

describe('Device selector options language changes', () => {
  it('preserves the open group tab and selected devices when translated options are replaced', async () => {
    await setLocale('zh-CN', { persist: false })
    const modes = ref('host,group,tag')
    const devices = [{ key: 'raw-host', value: '原始主机', assetType: 'linux' }]
    const Parent = defineComponent({ setup() {
      const options = computed(() => ({ selectMode: modes.value, selector: 'multiple', label: t('inspection.templates.selectHosts') }))
      return () => h(Selector, { modelValue: devices, options: options.value })
    } })
    wrapper = mount(Parent, { global: { stubs: {
      'el-dialog': Slot, 'el-tabs': Slot, 'el-tab-pane': Slot, 'el-scrollbar': Slot, 'el-button': Slot,
      'el-tag': Slot, 'el-tooltip': Slot, 'el-input': true, 'el-select': true, 'el-option': true,
      InstanceSelector: true, GroupSelector: true, TagSelector: true, InputFilter: true, RecentlySelector: true,
      DeviceSelectionSummary: true
    }, directives: { loading() {} } } })
    const selector = wrapper.findComponent(Selector)
    selector.vm.$.setupState.dialogVisible = true
    await flushPromises()
    const dialog = wrapper.findComponent(Dialog)
    const vm = dialog.vm.$.setupState
    vm.currentMode = 'group'
    await flushPromises()
    const calls = api.types.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(dialog.props('options').label).toBe('Select inspection hosts')
    expect(vm.currentMode).toBe('group')
    expect(vm.allSelectedHosts[0]).toMatchObject(devices[0])
    expect(api.types).toHaveBeenCalledTimes(calls)
    expect(selector.emitted('update:modelValue')).toBeUndefined()
    modes.value = 'tag,host'
    await flushPromises()
    expect(vm.currentMode).toBe('tag')
    expect(vm.allSelectedHosts[0].key).toBe('raw-host')
  })
})
