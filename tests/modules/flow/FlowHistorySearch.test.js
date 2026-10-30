import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElInput, ElPagination, ElTable, ElTableColumn } from 'element-plus'
import FlowHistoryView from '@/modules/flow/components/FlowHistoryView.vue'

const api = vi.hoisted(() => ({ getFlowInfo: vi.fn(), getFlowVersionHistory: vi.fn() }))
vi.mock('@/modules/flow/api', () => api)
let wrapper
const state = () => wrapper.vm.$.setupState
async function open() {
  wrapper = mount(FlowHistoryView, {
    props: { processId: 'real-flow-id' },
    global: {
      components: { ElInput, ElPagination, ElTable, ElTableColumn },
      stubs: {
        'el-input': ElInput,
        'el-button': { template: '<button><slot /></button>' },
        'el-breadcrumb': { template: '<div><slot /></div>' },
        'el-breadcrumb-item': { template: '<span><slot /></span>' },
        'el-tag': { template: '<span><slot /></span>' },
        'el-icon': true
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
async function page(number) {
  wrapper.findComponent(ElPagination).vm.$emit('update:current-page', number)
  await flushPromises()
}
beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset())
  api.getFlowInfo.mockResolvedValue({ data: { processName: '示例流程' } })
  api.getFlowVersionHistory.mockResolvedValue({
    data: Array.from({ length: 65 }, (_, index) => ({
      id: `history-${index}`,
      processDetailId: `detail-${index}`,
      version: index + 1,
      versionRemarks: index < 35 ? `Release-${index + 1}` : `补充版本-${index + 1}`
    }))
  })
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
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('流程历史版本搜索分页', () => {
  it('在第3页输入备注即时回首页，忽略首尾空格和大小写，查询只使用已加载数据', async () => {
    await open()
    await page(3)
    await wrapper.get('input').setValue(' RELEASE ')
    await flushPromises()
    expect(state().currentPage).toBe(1)
    expect(state().filteredList).toHaveLength(35)
    expect(wrapper.text()).toContain('Release-1')
    expect(wrapper.text()).not.toContain('补充版本-')
    expect(api.getFlowVersionHistory).toHaveBeenCalledTimes(1)
  })

  it('零匹配后清除搜索恢复首页和完整数据，不重新发请求', async () => {
    await open()
    await wrapper.get('input').setValue('不存在的版本')
    await flushPromises()
    expect(state().paginatedList).toEqual([])
    expect(wrapper.findComponent(ElPagination).exists()).toBe(false)
    await wrapper.get('input').setValue('')
    await flushPromises()
    expect(state().filteredList).toHaveLength(65)
    expect(state().currentPage).toBe(1)
    expect(api.getFlowVersionHistory).toHaveBeenCalledTimes(1)
  })

  it('每页条数变化回首页，设计动作保留真实流程和版本ID', async () => {
    await open()
    await page(3)
    const pagination = wrapper.findComponent(ElPagination)
    pagination.vm.$emit('update:page-size', 20)
    pagination.vm.$emit('size-change', 20)
    await flushPromises()
    expect(state().currentPage).toBe(1)
    expect(state().paginatedList).toHaveLength(20)
    await wrapper
      .findAll('button')
      .find(item => item.text() === '设计')
      .trigger('click')
    expect(wrapper.emitted('view-version')).toEqual([
      [{ processId: 'real-flow-id', detailId: 'detail-0' }]
    ])
  })
})
