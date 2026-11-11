import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, KeepAlive, ref } from 'vue'
import { ElInput, ElPagination, ElTable, ElTableColumn } from 'element-plus'
import Page from '@/modules/flow/views/FlowListPage.vue'

const api = vi.hoisted(() => ({
  getFlowList: vi.fn(),
  deleteFlow: vi.fn(),
  batchDeleteFlow: vi.fn(),
  cloneFlow: vi.fn()
}))
vi.mock('@/modules/flow/api', () => api)
vi.mock('@/modules/flow/components/FlowHistoryDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/flow/components/FlowEditDialog.vue', () => ({
  default: { template: '<div />' }
}))
const flows = (count, prefix = 'flow') =>
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    processName: `${prefix} ${i}`,
    processAbbr: prefix,
    remarks: `备注${i}`
  }))
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
let wrapper, cachedVisibility
const state = () => wrapper.findComponent(Page).vm.$.setupState
const button = label => wrapper.findAll('button').find(item => item.text() === label)
const design = vi.fn(),
  execute = vi.fn(),
  history = vi.fn()
async function open(cached = false) {
  cachedVisibility = ref(true)
  const Host = defineComponent({
    setup: () => () =>
      h(KeepAlive, null, {
        default: () => (cachedVisibility.value ? h(Page) : null)
      })
  })
  wrapper = mount(cached ? Host : Page, {
    global: {
      provide: { handleDesign: design, handleExecute: execute, handleHistory: history },
      stubs: {
        'el-table': ElTable,
        'el-table-column': ElTableColumn,
        'el-pagination': ElPagination,
        'el-input': ElInput,
        'el-button': {
          props: ['loading', 'disabled'],
          template: '<button :disabled="loading || disabled"><slot /></button>'
        },
        'el-form': { template: '<form><slot /></form>' },
        'el-form-item': { template: '<div><slot /></div>' },
        'el-icon': true,
        'el-alert': { props: ['title'], template: '<div role="alert">{{ title }}<slot /></div>' }
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset())
  api.getFlowList.mockResolvedValue({ data: flows(25) })
  design.mockReset()
  execute.mockReset()
  history.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
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
  expect(api.deleteFlow).not.toHaveBeenCalled()
  expect(api.batchDeleteFlow).not.toHaveBeenCalled()
  expect(api.cloneFlow).not.toHaveBeenCalled()
})

describe('流程列表读取反馈', () => {
  it('刷新保留搜索和有效页，缩量约束末页，零结果回首页', async () => {
    await open()
    await wrapper.get('input[placeholder="搜索流程名称"]').setValue('  FLOW  ')
    await button('搜索').trigger('click')
    await wrapper.get('.el-pagination .btn-next').trigger('click')
    await wrapper.get('.el-pagination .btn-next').trigger('click')
    await flushPromises()
    expect(state().currentPage).toBe(3)
    await wrapper.get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(state().currentPage).toBe(3)
    expect(state().appliedKeyword).toBe('FLOW')
    api.getFlowList.mockResolvedValueOnce({ data: flows(11) })
    await wrapper.get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(state().currentPage).toBe(2)
    expect(wrapper.get('.el-table__body-wrapper tbody tr').text()).toContain('flow 10')
    api.getFlowList.mockResolvedValueOnce({ data: [] })
    await wrapper.get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(state().currentPage).toBe(1)
  })

  it('刷新中清勾选并禁用旧行操作，当前失败保留上下文和显式提示，重试成功恢复', async () => {
    await open()
    await wrapper.get('.el-table__body-wrapper tbody tr input[type="checkbox"]').setValue(true)
    const pending = deferred()
    api.getFlowList.mockReturnValueOnce(pending.promise)
    await wrapper.get('button[title="刷新"]').trigger('click')
    expect(state().selectedRows).toEqual([])
    expect(button('执行').attributes('disabled')).toBeDefined()
    expect(button('编辑').attributes('disabled')).toBeDefined()
    expect(button('导出').attributes('disabled')).toBeDefined()
    pending.reject(new Error('network'))
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('当前数据可能已过期')
    expect(state().tableData).toHaveLength(25)
    expect(button('设计').attributes('disabled')).toBeDefined()
    await button('重试').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(button('设计').attributes('disabled')).toBeUndefined()
    await button('设计').trigger('click')
    expect(design).toHaveBeenCalledExactlyOnceWith('flow-0')
    await button('历史版本').trigger('click')
    expect(history).toHaveBeenCalledExactlyOnceWith('flow-0')
    await button('执行').trigger('click')
    expect(execute).toHaveBeenCalledExactlyOnceWith('flow-0')
  })

  it.each(['resolve', 'reject'])('旧刷新%s不能覆盖新结果或提前结束新加载', async method => {
    await open()
    const old = deferred(),
      latest = deferred()
    api.getFlowList.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    const first = state().loadData(),
      second = state().loadData()
    old[method](method === 'resolve' ? { data: flows(1, 'old') } : new Error('old'))
    await first
    expect(state().loading).toBe(true)
    expect(state().loadError).toBe('')
    latest.resolve({ data: flows(1, 'latest') })
    await second
    expect(state().tableData[0].id).toBe('latest-0')
    expect(state().loading).toBe(false)
  })

  it('读取期间修改搜索仍按新搜索约束页码，草稿未应用则不改变列表', async () => {
    await open()
    const pending = deferred()
    api.getFlowList.mockReturnValueOnce(pending.promise)
    const read = state().loadData()
    await wrapper.get('input[placeholder="搜索流程名称"]').setValue('备注24')
    expect(state().filteredData).toHaveLength(25)
    await wrapper.get('input[placeholder="搜索流程名称"]').trigger('keyup', { key: 'Enter' })
    pending.resolve({ data: flows(25) })
    await read
    await flushPromises()
    expect(state().paginatedData.map(row => row.id)).toEqual(['flow-24'])
    expect(state().currentPage).toBe(1)
  })

  it.each(['resolve', 'reject'])('卸载后忽略迟到%s，不再更新列表或显示错误', async method => {
    const pending = deferred()
    api.getFlowList.mockReturnValueOnce(pending.promise)
    await open()
    const context = state()
    wrapper.unmount()
    pending[method](method === 'resolve' ? { data: flows(1, 'late') } : new Error('late'))
    await flushPromises()
    expect(context.tableData).toEqual([])
    expect(context.loading).toBe(false)
    expect(context.loadError).toBe('流程列表读取已中断，请刷新重试')
  })

  it('KeepAlive失活使旧读取失效，返回原实例可重试恢复流程操作', async () => {
    const pending = deferred()
    api.getFlowList.mockReturnValueOnce(pending.promise)
    await open(true)
    const context = state()
    cachedVisibility.value = false
    await flushPromises()
    pending.reject(new Error('old hidden request'))
    await flushPromises()
    expect(context.tableData).toEqual([])
    cachedVisibility.value = true
    await flushPromises()
    expect(state()).toBe(context)
    expect(wrapper.get('[role="alert"]').text()).toContain('读取已中断')
    await button('重试').trigger('click')
    await flushPromises()
    expect(context.tableData).toHaveLength(25)
    expect(button('执行').attributes('disabled')).toBeUndefined()
  })
})
