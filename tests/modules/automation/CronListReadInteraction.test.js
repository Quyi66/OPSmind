import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, KeepAlive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import {
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElPagination,
  ElTable,
  ElTableColumn
} from 'element-plus'
import Page from '@/modules/automation/views/job/JobTaskSchedulerPage.vue'
import CronTable from '@/modules/automation/components/job/components/CronJobTable.vue'

const api = vi.hoisted(() => ({ fetchCronJobs: vi.fn(), fetchApplets: vi.fn() }))
const actions = vi.hoisted(() =>
  Object.fromEntries(
    [
      'handleToggleStatus',
      'handleBatchToggle',
      'handleExecuteOnce',
      'handleCopy',
      'handleDelete'
    ].map(name => [name, vi.fn()])
  )
)
vi.mock('@/modules/automation/api/jao', () => api)
vi.mock('@/modules/automation/components/job/composables/useCronJobActions', () => ({
  useCronJobActions: () => actions
}))
vi.mock('@/modules/automation/components/job/components/CronJobFormDialog.vue', () => ({
  __esModule: true,
  default: { props: ['editingId'], template: '<aside />' }
}))
vi.mock('@/modules/automation/components/job/components/NextExecutionTimeDialog.vue', () => ({
  __esModule: true,
  default: { props: ['scheduleConf'], template: '<aside />' }
}))
const tasks = count =>
  Array.from({ length: count }, (_, id) => ({
    id,
    jobDesc: `task-${id}`,
    jobType: 'script',
    appCode: 'original-app',
    jobId: `tool-${id}`,
    scheduleConf: '0 0 12 * * ?',
    triggerStatus: '0',
    author: 'admin'
  }))
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
let wrapper, router
const page = () => wrapper.findComponent(Page)
const state = () => page().vm.$.setupState
const tableState = () => page().findComponent(CronTable).vm.$.setupState
const button = label =>
  page()
    .findAll('button')
    .find(item => item.text() === label)
async function open(routed = false) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/jao/taskScheduler', component: Page },
      { path: '/other', component: { template: '<div />' } }
    ]
  })
  await router.push('/jao/taskScheduler')
  await router.isReady()
  const Host = defineComponent({
    setup: () => () =>
      h(RouterView, null, {
        default: ({ Component, route }) =>
          h(KeepAlive, null, { default: () => h(Component, { key: route.path }) })
      })
  })
  wrapper = mount(routed ? Host : Page, {
    global: {
      plugins: [router],
      stubs: {
        'router-view': false,
        'el-form': ElForm,
        'el-form-item': ElFormItem,
        'el-input': ElInput,
        'el-table': ElTable,
        'el-table-column': ElTableColumn,
        'el-pagination': ElPagination,
        'el-tag': { template: '<span><slot /></span>' },
        'el-icon': true,
        'el-button': {
          props: ['loading', 'disabled'],
          template: '<button :disabled="loading || disabled"><slot /></button>'
        },
        'el-alert': { props: ['title'], template: '<div role="alert">{{ title }}<slot /></div>' }
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
beforeEach(() => {
  api.fetchCronJobs.mockReset().mockResolvedValue({ data: tasks(25) })
  api.fetchApplets.mockReset().mockResolvedValue({ data: [] })
  Object.values(actions).forEach(mock => mock.mockReset())
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
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

describe('定时任务列表搜索/读取与分页', () => {
  it('真实分页后实时搜索trim并回首页，Enter/清除复位页码，不重新读取', async () => {
    await open()
    await page().get('.el-pagination .btn-next').trigger('click')
    expect(tableState().currentPage).toBe(2)
    const input = page().get('input[placeholder="名称、表达式、作者或 ID:编号"]')
    await input.setValue('  ID:24  ')
    await flushPromises()
    expect(tableState().currentPage).toBe(1)
    expect(tableState().pagedData.map(row => row.id)).toEqual([24])
    await input.setValue('task')
    await page().get('.el-pagination .btn-next').trigger('click')
    await input.trigger('keyup', { key: 'Enter' })
    await flushPromises()
    expect(tableState().currentPage).toBe(1)
    await input.setValue('ID:0')
    await flushPromises()
    expect(tableState().pagedData[0].id).toBe(0)
    await input.setValue('no-matching-task')
    await flushPromises()
    expect(page().text()).toContain('没有匹配的定时任务')
    expect(api.fetchCronJobs).toHaveBeenCalledTimes(1)
  })

  it('改变每页数量回首页，刷新保留有效页且缩量回末页', async () => {
    await open()
    await page().get('.el-pagination .btn-next').trigger('click')
    await page().get('.el-pagination .btn-next').trigger('click')
    expect(tableState().currentPage).toBe(3)
    await page().get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(tableState().currentPage).toBe(3)
    api.fetchCronJobs.mockResolvedValueOnce({ data: tasks(11) })
    await page().get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(tableState().currentPage).toBe(2)
    const pagination = page().findComponent(ElPagination)
    pagination.vm.$emit('update:page-size', 20)
    pagination.vm.$emit('size-change', 20)
    await flushPromises()
    expect(tableState().currentPage).toBe(1)
    expect(tableState().pagedData).toHaveLength(11)
    expect(api.fetchCronJobs).toHaveBeenCalledTimes(3)
  })

  it('读取开始清勾选，失败隐藏旧动作并可重试原查询/有效页', async () => {
    await open()
    await page().get('.el-table__body-wrapper tbody tr input[type="checkbox"]').setValue(true)
    expect(state().selectedRows).toHaveLength(1)
    const pending = deferred()
    api.fetchCronJobs.mockReturnValueOnce(pending.promise)
    await page().get('button[title="刷新"]').trigger('click')
    expect(state().selectedRows).toEqual([])
    expect(button('执行')).toBeUndefined()
    pending.reject(new Error('current'))
    await flushPromises()
    expect(page().get('[role="alert"]').text()).toContain('获取定时任务列表失败')
    expect(button('批量启停').attributes('disabled')).toBeDefined()
    expect(page().findComponent(ElPagination).exists()).toBe(false)
    await button('重试').trigger('click')
    await flushPromises()
    expect(page().find('[role="alert"]').exists()).toBe(false)
    expect(tableState().pagedData).toHaveLength(10)
  })

  it.each(['resolve', 'reject'])('旧%s不覆盖最新任务和加载状态', async method => {
    await open()
    const old = deferred(),
      latest = deferred()
    api.fetchCronJobs.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    const first = state().fetchData(),
      second = state().fetchData()
    old[method](method === 'resolve' ? { data: tasks(1) } : new Error('old'))
    await first
    expect(state().loading).toBe(true)
    expect(ElMessage.error).not.toHaveBeenCalled()
    latest.resolve({ data: tasks(2) })
    await second
    await flushPromises()
    expect(state().tableData).toHaveLength(2)
  })

  it('缓存失活忽略旧结果，返回原实例重新读取', async () => {
    await open(true)
    const context = state(),
      pending = deferred()
    api.fetchCronJobs.mockReturnValueOnce(pending.promise)
    await page().get('button[title="刷新"]').trigger('click')
    await router.push('/other')
    await flushPromises()
    pending.resolve({ data: tasks(1) })
    await flushPromises()
    expect(context.tableData).toHaveLength(25)
    await router.push('/jao/taskScheduler')
    await flushPromises()
    expect(state()).toBe(context)
    expect(state().tableData).toHaveLength(25)
    expect(api.fetchCronJobs).toHaveBeenCalledTimes(3)
  })

  it('按原完整任务对象传递行为，编辑仍传原调度ID，表单不原生提交', async () => {
    await open()
    const event = new Event('submit', { bubbles: true, cancelable: true })
    page().get('form').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    const row = tableState().pagedData[0]
    await button('复制').trigger('click')
    expect(actions.handleCopy).toHaveBeenCalledWith(row)
    expect(row.appCode).toBe('original-app')
    expect(row.jobId).toBe('tool-0')
    await button('编辑').trigger('click')
    await flushPromises()
    expect(state().editingId).toBe(0)
  })

  it.each(['resolve', 'reject'])('卸载后迟到%s不更新任务或弹错误', async method => {
    const pending = deferred()
    api.fetchCronJobs.mockReturnValueOnce(pending.promise)
    await open()
    const context = state()
    wrapper.unmount()
    pending[method](method === 'resolve' ? { data: tasks(1) } : new Error('late'))
    await flushPromises()
    expect(context.tableData).toEqual([])
    expect(ElMessage.error).not.toHaveBeenCalled()
  })

  it('启停标签支持Enter和空格并阻止默认滚动，忙碌时不重复传递原任务', async () => {
    await open()
    const row = tableState().pagedData[0]
    const tag = page().findAll('[role="button"]')[0]
    expect(tag.attributes('aria-label')).toContain('task-0')
    expect(tag.attributes('aria-label')).toContain('ID：0')
    expect(tag.attributes('tabindex')).toBe('0')
    for (const key of ['Enter', ' ']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
      tag.element.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
    }
    expect(actions.handleToggleStatus).toHaveBeenCalledTimes(2)
    expect(actions.handleToggleStatus.mock.calls.every(([value]) => value === row)).toBe(true)
    row._switching = true
    await flushPromises()
    expect(tag.attributes('aria-disabled')).toBe('true')
    expect(tag.attributes('tabindex')).toBe('-1')
    await tag.trigger('keydown', { key: 'Enter' })
    await tag.trigger('click')
    expect(actions.handleToggleStatus).toHaveBeenCalledTimes(2)
  })
})
