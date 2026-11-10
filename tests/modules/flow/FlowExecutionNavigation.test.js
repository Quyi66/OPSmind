import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElMessage, ElPagination, ElTable, ElTableColumn } from 'element-plus'
import FlowExecutionPage from '@/modules/flow/views/FlowExecutionPage.vue'

const api = vi.hoisted(() => ({ getFlowList: vi.fn(), getExecutionList: vi.fn() }))
vi.mock('@/modules/flow/api', () => api)

const processes = [
  { id: 'flow-a', processName: '流程A' },
  { id: 'flow-b', processName: '流程B' }
]
const rows = (count, prefix = 'A') =>
  Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    versionRemarks: `${prefix}记录${index + 1}`,
    processDetailId: `${prefix}-detail-${index + 1}`,
    processInstanceId: `${prefix}-instance-${index + 1}`,
    runStatus: 3
  }))
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
let wrapper
const state = () => wrapper.vm.$.setupState
const button = label => wrapper.findAll('button').find(item => item.text() === label)
async function open() {
  wrapper = mount(FlowExecutionPage, {
    global: {
      components: { ElTable, ElTableColumn, ElPagination },
      stubs: {
        'el-input': true,
        'el-empty': { props: ['description'], template: '<div>{{ description }}</div>' },
        'el-button': {
          props: ['disabled'],
          template: '<button :disabled="disabled"><slot /></button>'
        },
        'el-tag': { template: '<span><slot /></span>' },
        'el-icon': true
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
async function selectProcess(index) {
  await wrapper.findAll('.ops-sidebar-item')[index].trigger('click')
  await flushPromises()
}
async function page(number) {
  wrapper.findComponent(ElPagination).vm.$emit('update:current-page', number)
  await flushPromises()
}
beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset())
  api.getFlowList.mockResolvedValue({ data: processes })
  api.getExecutionList.mockResolvedValue({ data: rows(25) })
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

describe('流程执行记录导航', () => {
  it('切换流程立即移除旧记录与勾选，最新响应才可显示，查看使用当前真实关联ID', async () => {
    await open()
    await wrapper.find('.el-table__body-wrapper .el-checkbox__original').setValue(true)
    expect(state().selectedRows).toHaveLength(1)
    const pendingA = deferred()
    const pendingB = deferred()
    api.getExecutionList.mockReturnValueOnce(pendingA.promise).mockReturnValueOnce(pendingB.promise)
    await button('刷新').trigger('click')
    await selectProcess(1)
    expect(state().executionList).toEqual([])
    expect(state().selectedRows).toEqual([])
    expect(wrapper.text()).not.toContain('A记录1')
    expect(button('删除').attributes('disabled')).toBeDefined()
    expect(api.getExecutionList.mock.calls.at(-1)[0]).toEqual({ processId: 'flow-b' })
    pendingB.resolve({ data: rows(1, 'B') })
    await flushPromises()
    pendingA.resolve({ data: rows(25) })
    await flushPromises()
    expect(state().executionList).toEqual(rows(1, 'B'))
    await button('查看').trigger('click')
    expect(wrapper.emitted('view-detail')).toEqual([
      [
        {
          processId: 'flow-b',
          detailId: 'B-detail-1',
          instanceId: 'B-instance-1'
        }
      ]
    ])
  })

  it('旧流程查询失败不干扰新流程的加载状态或弹出错误', async () => {
    await open()
    const old = deferred(),
      current = deferred()
    const error = vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
    api.getExecutionList.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    await button('刷新').trigger('click')
    await selectProcess(1)
    old.reject(new Error('old flow'))
    await flushPromises()
    expect(state().loading).toBe(true)
    expect(error).not.toHaveBeenCalled()
    current.resolve({ data: rows(1, 'B') })
    await flushPromises()
    expect(state().loading).toBe(false)
  })

  it('刷新保留当前页，记录减少时回到最后有效页，空结果仍为第1页', async () => {
    await open()
    await page(3)
    expect(wrapper.text()).toContain('A记录21')
    await button('刷新').trigger('click')
    await flushPromises()
    expect(state().currentPage).toBe(3)
    api.getExecutionList.mockResolvedValueOnce({ data: rows(11) })
    await button('刷新').trigger('click')
    await flushPromises()
    expect(state().currentPage).toBe(2)
    expect(wrapper.text()).toContain('A记录11')
    api.getExecutionList.mockResolvedValueOnce({ data: [] })
    await button('刷新').trigger('click')
    await flushPromises()
    expect(state().currentPage).toBe(1)
    expect(wrapper.findComponent(ElPagination).exists()).toBe(false)
  })

  it('改变每页条数回第1页，切换流程也回首页并保留每页条数', async () => {
    await open()
    await page(3)
    const pagination = wrapper.findComponent(ElPagination)
    pagination.vm.$emit('update:page-size', 20)
    pagination.vm.$emit('size-change', 20)
    await flushPromises()
    expect(state().currentPage).toBe(1)
    expect(state().paginatedList).toHaveLength(20)
    await page(2)
    await selectProcess(1)
    expect(state().currentPage).toBe(1)
    expect(state().pageSize).toBe(20)
  })

  it('离页后迟到的流程列表不会自动继续查询执行记录', async () => {
    const pending = deferred()
    api.getFlowList.mockReturnValue(pending.promise)
    await open()
    wrapper.unmount()
    pending.resolve({ data: processes })
    await flushPromises()
    expect(api.getExecutionList).not.toHaveBeenCalled()
  })

  it('离页后迟到的执行记录错误不弹出提示', async () => {
    const pending = deferred()
    const error = vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
    api.getExecutionList.mockReturnValue(pending.promise)
    await open()
    wrapper.unmount()
    pending.reject(new Error('late'))
    await flushPromises()
    expect(error).not.toHaveBeenCalled()
  })
})
