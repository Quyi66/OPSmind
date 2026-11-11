import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElInput, ElMessage, ElPagination, ElTable, ElTableColumn } from 'element-plus'
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
        'el-icon': true,
        'el-alert': { props: ['title'], template: '<div role="alert">{{ title }}<slot /></div>' }
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

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const refresh = () =>
  wrapper
    .findAll('button')
    .find(item => item.text() === '刷新')
    .trigger('click')

describe('流程历史版本只读刷新上下文', () => {
  it('连续刷新中旧流程信息不覆盖新标题，也不继续读取旧历史', async () => {
    await open()
    const old = deferred(),
      latest = deferred()
    api.getFlowInfo.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    api.getFlowVersionHistory.mockClear().mockResolvedValue({ data: [{ id: 'latest-version' }] })
    await refresh()
    await refresh()
    latest.resolve({ data: { processName: '当前标题' } })
    await flushPromises()
    old.resolve({ data: { processName: '过期标题' } })
    await flushPromises()
    expect(state().processInfo.processName).toBe('当前标题')
    expect(api.getFlowVersionHistory).toHaveBeenCalledTimes(1)
    expect(state().historyList).toEqual([{ id: 'latest-version' }])
  })

  it('切换流程清除原记录和搜索，新读取只使用新流程真实ID', async () => {
    await open()
    await page(3)
    await wrapper.get('input').setValue('RELEASE')
    const pending = deferred()
    api.getFlowInfo.mockReturnValueOnce(pending.promise)
    await wrapper.setProps({ processId: 'flow-b' })
    expect(state().historyList).toEqual([])
    expect(state().searchKeyword).toBe('')
    expect(state().currentPage).toBe(1)
    pending.resolve({ data: { processName: '流程B' } })
    await flushPromises()
    expect(api.getFlowInfo).toHaveBeenLastCalledWith('flow-b')
    expect(api.getFlowVersionHistory).toHaveBeenLastCalledWith('flow-b')
  })

  it('刷新保留搜索、每页数量和有效页，记录缩量后约束到有效页', async () => {
    await open()
    await wrapper.get('input').setValue('release')
    state().pageSize = 20
    await page(2)
    await refresh()
    await flushPromises()
    expect(state().currentPage).toBe(2)
    expect(state().searchKeyword).toBe('release')
    api.getFlowVersionHistory.mockResolvedValueOnce({
      data: [{ id: 'remaining', versionRemarks: 'Release' }]
    })
    await refresh()
    await flushPromises()
    expect(state().currentPage).toBe(1)
    expect(state().pageSize).toBe(20)
    expect(state().paginatedList.map(row => row.id)).toEqual(['remaining'])
  })

  it('当前错误清除可操作旧记录并可在原页重试，旧错误不结束新加载', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
    await open()
    await wrapper.get('input').setValue('release')
    await page(2)
    const old = deferred(),
      latest = deferred()
    api.getFlowInfo.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    await refresh()
    await refresh()
    old.reject(new Error('old'))
    await flushPromises()
    expect(error).not.toHaveBeenCalled()
    expect(state().loading).toBe(true)
    latest.reject(new Error('current'))
    await flushPromises()
    expect(state().historyList).toEqual([])
    expect(state().searchKeyword).toBe('release')
    expect(state().currentPage).toBe(2)
    expect(wrapper.text()).toContain('加载历史版本失败，请重试')
    await wrapper
      .findAll('button')
      .find(item => item.text() === '重试')
      .trigger('click')
    await flushPromises()
    expect(state().historyList).toHaveLength(65)
    expect(state().currentPage).toBe(2)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('卸载后旧读取失败不弹提示', async () => {
    const error = vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await open()
    const old = deferred()
    api.getFlowInfo.mockReturnValueOnce(old.promise)
    await refresh()
    wrapper.unmount()
    old.reject(new Error('old'))
    await flushPromises()
    expect(error).not.toHaveBeenCalled()
  })
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
