import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElInput, ElTable, ElTableColumn } from 'element-plus'
import HostDetail from '@/modules/inspection/components/result-detail/HostDetailDialog.vue'

const records = Array.from({ length: 64 }, (_, index) =>
  Object.freeze({
    id: `check-${index}`,
    name: index === 63 ? '安全检查-SELinux状态' : `系统检查-${index}`,
    status: 'OK'
  })
)
let wrapper
const Select = {
  name: 'ElSelect',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<select />'
}
async function open() {
  wrapper = mount(HostDetail, {
    props: {
      visible: true,
      host: { host_id: 'host-a', host_key: 'host-a' },
      machineInfo: {},
      checkItems: records,
      statusFilter: 'OK'
    },
    global: {
      components: { ElInput, ElTable, ElTableColumn },
      stubs: {
        'el-input': false,
        'el-dialog': { props: ['modelValue'], template: '<div v-if="modelValue"><slot /></div>' },
        'el-select': Select,
        'el-option': true,
        'el-tag': { template: '<span><slot /></span>' },
        'el-button': { template: '<button><slot /></button>' }
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})
afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
})
const data = () => wrapper.findComponent(ElTable).props('data')

describe('巡检主机检查项窗口本地搜索', () => {
  it('在64条已加载记录中直接搜索名称，忽略空格和大小写', async () => {
    await open()
    await wrapper.get('input').setValue('  SELINUX  ')
    expect(data()).toEqual([records[63]])
    expect(wrapper.text()).toContain('匹配 1 / 已加载 64 条')
    expect(wrapper.emitted('filter-change')).toBeUndefined()
    expect(wrapper.emitted('show-detail')).toBeUndefined()
  })

  it('空结果有明确提示，清除立即恢复原顺序', async () => {
    await open()
    await wrapper.get('input').setValue('no-such-check')
    expect(data()).toEqual([])
    expect(wrapper.text()).toContain('没有匹配的已加载检查项')
    await wrapper.get('input').setValue('')
    expect(data()).toEqual(records)
  })

  it('同主机状态切换/读取刷新保留关键词，原状态事件继续传回父页', async () => {
    await open()
    await wrapper.get('input').setValue('SELinux')
    wrapper.findComponent(Select).vm.$emit('update:modelValue', 'FAILED')
    await wrapper.setProps({
      statusFilter: 'FAILED',
      checkItems: [{ ...records[63], status: 'FAILED' }]
    })
    expect(wrapper.emitted('filter-change')).toEqual([['FAILED']])
    expect(wrapper.get('input').element.value).toBe('SELinux')
    expect(data()).toHaveLength(1)
  })

  it('关闭重开及切主机清除搜索，数字/缺失名称安全匹配', async () => {
    await open()
    await wrapper.get('input').setValue('SELinux')
    await wrapper.setProps({ visible: false })
    await wrapper.setProps({ visible: true })
    expect(wrapper.get('input').element.value).toBe('')
    await wrapper.get('input').setValue('SELinux')
    await wrapper.setProps({
      host: { host_id: 'host-b', host_key: 'host-b' },
      checkItems: [
        { id: 'zero', name: 0 },
        { id: 'empty', name: null }
      ]
    })
    expect(wrapper.get('input').element.value).toBe('')
    await wrapper.get('input').setValue('0')
    expect(data()).toEqual([{ id: 'zero', name: 0 }])
  })

  it('搜索后详情仍传原记录，包含真实ID而不改对象', async () => {
    await open()
    await wrapper.get('input').setValue('SELinux')
    await wrapper
      .findAll('button')
      .find(item => item.text() === '详情')
      .trigger('click')
    expect(wrapper.emitted('show-detail')).toEqual([[records[63]]])
    expect(wrapper.emitted('show-detail')[0][0]).toBe(records[63])
  })
})
