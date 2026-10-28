import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import WbRunLogsDrawer from '@/modules/automation/components/workbench/WbRunLogsDrawer.vue'
import { fetchJobRunLogs } from '@/modules/automation/api/jao'

vi.mock('@/modules/automation/api/jao', () => ({ fetchJobRunLogs: vi.fn() }))
vi.mock('@/modules/automation/stores/useJobStore', () => ({ JOB_TYPE_OPTIONS: [] }))
vi.mock('@/utils/i18n', () => ({ translateText: text => text || '' }))

let wrapper
const rows = [{ id: 'run-1', job_title: '系统巡检', job_type: 'script', status: 'COMPLETED' }]

async function openDrawer(props = {}) {
  wrapper = shallowMount(WbRunLogsDrawer, {
    props: { visible: false, ...props },
    global: {
      stubs: {
        ElDrawer: { template: '<div><slot /><slot name="footer" /></div>' },
        'el-form': { template: '<form><slot /></form>' },
        'el-form-item': { template: '<div><slot /></div>' },
        ElTable: true,
        ElTableColumn: true,
        ElPagination: true,
        'el-select': {
          name: 'FilterSelect',
          props: ['modelValue'],
          emits: ['update:modelValue', 'change'],
          template: '<div />'
        },
        ElOption: true,
        ElTag: true,
        ElAlert: true
      },
      directives: { loading: () => {} }
    }
  })
  await wrapper.setProps({ visible: true })
  return wrapper.vm.$.setupState
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(fetchJobRunLogs)
    .mockReset()
    .mockResolvedValue({ data: { records: rows, total: 67 } })
})
afterEach(() => {
  wrapper?.unmount()
  vi.useRealTimers()
})

describe('运行记录抽屉的查询与分页', () => {
  it.each([
    [0, 'day', '7'],
    [1, 'status', 'RUNNING'],
    [2, 'type', 'command']
  ])('下拉框 %s 切换后直接应用 %s 并回到第一页', async (index, field, value) => {
    const state = await openDrawer()
    await flushPromises()
    state.pagination.page = 3
    state.pageKeyword = '系统'
    const select = wrapper.findAllComponents({ name: 'FilterSelect' })[index]
    select.vm.$emit('update:modelValue', value)
    select.vm.$emit('change', value)
    await flushPromises()
    expect(fetchJobRunLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ [field]: value }),
        page: 1
      })
    )
    expect(state.pageKeyword).toBe('系统')
    state.handleReset()
    await flushPromises()
    expect(state.pageKeyword).toBe('')
  })

  it('按初始类型查询，保留后端总数，并使用 all 而非 ALL', async () => {
    const state = await openDrawer({ initialType: 'script' })
    await flushPromises()
    expect(fetchJobRunLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ type: 'script', status: 'all' }),
        page: 1,
        size: 20
      })
    )
    expect(state.drawerTotal).toBe(67)
    expect(state.drawerRecords).toEqual(rows)
  })

  it('分页和后台刷新沿用已应用的条件，不使用尚未提交的条件', async () => {
    const state = await openDrawer()
    await flushPromises()
    state.filters.type = 'script'
    state.filters.day = '7'
    state.handleSearch()
    await flushPromises()
    state.filters.type = 'rest'
    state.pagination.page = 3
    await state.loadRecords()
    expect(fetchJobRunLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ type: 'script', day: '7' }),
        page: 3
      })
    )
    await wrapper.setProps({ reloadVersion: 1 })
    expect(fetchJobRunLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ type: 'script' }),
        page: 3
      })
    )
    expect(state.resolvedLink).toContain('type=script')
  })

  it('快速切换查询条件时，旧响应不能覆盖新结果', async () => {
    let oldResolve
    vi.mocked(fetchJobRunLogs).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          oldResolve = resolve
        })
    )
    const state = await openDrawer()
    state.filters.type = 'command'
    state.handleSearch()
    await flushPromises()
    oldResolve({ data: { records: [{ id: 'stale' }], total: 999 } })
    await flushPromises()
    expect(state.drawerRecords).toEqual(rows)
    expect(state.drawerTotal).toBe(67)
  })

  it('失败显示错误，重试后恢复数据，不将失败伪装为空结果', async () => {
    vi.mocked(fetchJobRunLogs).mockRejectedValueOnce(new Error('offline'))
    const state = await openDrawer()
    await flushPromises()
    expect(state.loadError).toContain('加载失败')
    expect(state.drawerRecords).toEqual([])
    await state.loadRecords()
    expect(state.loadError).toBe('')
    expect(state.drawerRecords).toEqual(rows)
  })

  it('有活动记录时自动刷新，关闭抽屉后停止轮询并忽略迟到响应', async () => {
    vi.mocked(fetchJobRunLogs).mockResolvedValue({
      data: { records: [{ ...rows[0], status: 'RUNNING' }], total: 1 }
    })
    const state = await openDrawer()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(5000)
    expect(fetchJobRunLogs).toHaveBeenCalledTimes(2)
    let resolvePending
    vi.mocked(fetchJobRunLogs).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolvePending = resolve
        })
    )
    const pending = state.loadRecords()
    await wrapper.setProps({ visible: false })
    resolvePending({ data: { records: [{ id: 'late' }], total: 999 } })
    await pending
    await vi.advanceTimersByTimeAsync(10000)
    expect(fetchJobRunLogs).toHaveBeenCalledTimes(3)
    expect(state.drawerTotal).toBe(1)
  })
})
