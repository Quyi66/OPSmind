import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'
import HostDetail from '@/modules/inspection/components/result-detail/HostDetailDialog.vue'
import Cards from '@/modules/inspection/components/result-detail/StatisticsCards.vue'
import { getJobStatusText, getKpiStatusLabel } from '@/modules/inspection/constants/status'

const Slot = { template: '<div><slot /></div>' }
const wrappers = []
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  await setLocale('zh-CN', { persist: false })
})

describe('Inspection shared status language changes', () => {
  it('updates already-mounted filter captions while preserving the chosen status and local host search', async () => {
    await setLocale('zh-CN', { persist: false })
    const wrapper = shallowMount(HostDetail, { props: { visible: true, host: { host_id: 'raw-host', host_key: '原始主机' }, machineInfo: {}, statusFilter: 'CHECK', checkItems: [{ name: '原始检查项', status: 'CHECK' }] }, global: { stubs: { 'el-dialog': Slot, 'el-table': Slot, 'el-table-column': { template: '<div />' }, 'el-select': Slot, 'el-option': { props: ['value', 'label'], template: '<option :value="value">{{ label }}</option>' } }, directives: { loading() {} } } })
    wrappers.push(wrapper)
    const vm = wrapper.vm.$.setupState
    vm.filterText = '原始'
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.find('option[value="CHECK"]').text()).toBe('Manual check')
    expect(wrapper.props('statusFilter')).toBe('CHECK')
    expect(vm.filterText).toBe('原始')
    expect(vm.filteredCheckItems[0].name).toBe('原始检查项')
    expect(wrapper.emitted('filter-change')).toBeUndefined()
    expect(getJobStatusText('CUSTOM_BACKEND_STATE')).toBe('CUSTOM_BACKEND_STATE')
    expect(getKpiStatusLabel('后台自定义状态')).toBe('后台自定义状态')
  })

  it('updates statistics captions while preserving counts and the emitted status identity', async () => {
    await setLocale('zh-CN', { persist: false })
    const wrapper = shallowMount(Cards, { props: { statistics: { OK: 5, FAILED: 2, CHECK: 1, SKIPPING: 0, UNREACHABLE: 3 } } })
    wrappers.push(wrapper)
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.text()).toContain('Check passed')
    expect(wrapper.text()).toContain('Missing data')
    expect(wrapper.props('statistics')).toEqual({ OK: 5, FAILED: 2, CHECK: 1, SKIPPING: 0, UNREACHABLE: 3 })
    expect(wrapper.vm.$.setupState.cards.find(card => card.name === 'FAILED').value).toBe(2)
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.emitted('click').at(-1)).toEqual(['FAILED'])
  })
})
