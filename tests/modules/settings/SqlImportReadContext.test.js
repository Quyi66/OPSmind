import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, KeepAlive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { ElForm, ElInput, ElMessage, ElPagination, ElTable, ElTableColumn } from 'element-plus'
import Page from '@/modules/settings/views/SscSqlImportPage.vue'

const api = vi.hoisted(() => ({ getSqlImportResult: vi.fn(), runSqlServerFile: vi.fn() }))
const permission = vi.hoisted(() => ({ allowed: true }))
vi.mock('@/modules/yum-repo/api', () => ({ yumRepoApi: api }))
vi.mock('@/core/auth', () => ({ authService: { hasPermission: () => permission.allowed } }))
const result = (jobId = 'original-job', count = 25, status = 'RUNNING') => ({
  jobId,
  status,
  fileName: 'original.sql',
  totalStatements: 0,
  failedStatements: count,
  elapsedMs: 0,
  currentEntry: '0',
  entries: [],
  errors: Array.from({ length: count }, (_, index) => ({
    entry: `entry-${index}`,
    sql: `statement-${index}`,
    error: 'original-error'
  }))
})
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
const button = label =>
  page()
    .findAll('button')
    .find(item => item.text() === label)
async function open(routed = false) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/ssc/sql-import', component: Page },
      { path: '/other', component: { template: '<div />' } }
    ]
  })
  await router.push('/ssc/sql-import')
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
      components: { ElTable, ElTableColumn, ElPagination },
      stubs: {
        'router-view': false,
        'el-form': ElForm,
        'el-input': ElInput,
        'el-form-item': { template: '<div><slot /></div>' },
        'el-icon': true,
        'el-tag': { template: '<span><slot /></span>' },
        'el-checkbox': { template: '<span><slot /></span>' },
        'el-button': {
          props: ['loading', 'disabled'],
          template: '<button :disabled="loading || disabled"><slot /></button>'
        },
        'el-descriptions': { template: '<div><slot /></div>' },
        'el-descriptions-item': { props: ['label'], template: '<div>{{ label }}: <slot /></div>' },
        'el-empty': { props: ['description'], template: '<p>{{ description }}</p>' },
        'el-alert': { props: ['title'], template: '<div role="alert">{{ title }}<slot /></div>' }
      }
    }
  })
  await flushPromises()
}
async function seed(data = result()) {
  state().applyJobResponse(data, { notify: false })
  await flushPromises()
}
beforeEach(() => {
  permission.allowed = true
  api.getSqlImportResult.mockReset().mockResolvedValue({ data: result() })
  api.runSqlServerFile.mockReset().mockResolvedValue({ data: result('new-job') })
  vi.spyOn(ElMessage, 'info').mockImplementation(() => {})
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
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
  vi.useRealTimers()
})

describe('SQL导入结果读取与阅读上下文', () => {
  it('空任务保持原入口，原生表单提交被阻止且不执行SQL', async () => {
    await open()
    expect(page().text()).toContain('执行后可在这里查看进度与结果')
    expect(button('刷新当前任务').attributes('disabled')).toBeDefined()
    const event = new Event('submit', { bubbles: true, cancelable: true })
    page().get('form').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(api.runSqlServerFile).not.toHaveBeenCalled()
    expect(api.getSqlImportResult).not.toHaveBeenCalled()
  })

  it('同任务手动刷新保留第二页，缩量回有效页，变条数回首页', async () => {
    await open()
    await seed(result('original-job', 25, 'COMPLETED'))
    await page().get('.el-pagination .btn-next').trigger('click')
    expect(state().errorPagination.page).toBe(2)
    api.getSqlImportResult.mockResolvedValueOnce({ data: result('original-job', 25, 'COMPLETED') })
    await button('刷新当前任务').trigger('click')
    await flushPromises()
    expect(api.getSqlImportResult).toHaveBeenCalledWith('original-job')
    expect(state().errorPagination.page).toBe(2)
    expect(state().paginatedErrors[0].entry).toBe('entry-10')
    await page().get('.el-pagination .btn-next').trigger('click')
    api.getSqlImportResult.mockResolvedValueOnce({ data: result('original-job', 11, 'COMPLETED') })
    await button('刷新当前任务').trigger('click')
    await flushPromises()
    expect(state().errorPagination.page).toBe(2)
    expect(state().paginatedErrors).toHaveLength(1)
    const pagination = page().findComponent(ElPagination)
    pagination.vm.$emit('update:page-size', 20)
    pagination.vm.$emit('size-change', 20)
    await flushPromises()
    expect(state().errorPagination.page).toBe(1)
    expect(api.getSqlImportResult).toHaveBeenCalledTimes(2)
  })

  it('自动轮询保留错误明细页，完成后停止再次查询', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await open()
    await seed()
    state().errorPagination.page = 2
    await vi.advanceTimersByTimeAsync(3000)
    await flushPromises()
    expect(api.getSqlImportResult).toHaveBeenCalledTimes(1)
    expect(state().errorPagination.page).toBe(2)
    api.getSqlImportResult.mockResolvedValueOnce({ data: result('original-job', 25, 'COMPLETED') })
    await vi.advanceTimersByTimeAsync(3000)
    await flushPromises()
    expect(state().errorPagination.page).toBe(2)
    await vi.advanceTimersByTimeAsync(6000)
    expect(api.getSqlImportResult).toHaveBeenCalledTimes(2)
    expect(ElMessage.info).not.toHaveBeenCalled()
  })

  it('手动查询失败持久提示且保留原结果和页码，重试查询成功清提示', async () => {
    await open()
    await seed(result('original-job', 25, 'COMPLETED'))
    state().errorPagination.page = 2
    api.getSqlImportResult.mockRejectedValueOnce(new Error('current-read-failed'))
    await button('刷新当前任务').trigger('click')
    await flushPromises()
    expect(page().get('[role="alert"]').text()).toContain('current-read-failed')
    expect(state().errorPagination.page).toBe(2)
    expect(state().paginatedErrors).toHaveLength(10)
    expect(state().refreshing).toBe(false)
    api.getSqlImportResult.mockResolvedValueOnce({ data: result('original-job', 25, 'COMPLETED') })
    await button('重试查询').trigger('click')
    await flushPromises()
    expect(page().find('[role="alert"]').exists()).toBe(false)
    expect(api.getSqlImportResult).toHaveBeenCalledTimes(2)
  })

  it('静默暂时失败继续按原间隔重试，但不再宣称成功轮询且不弹错', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await open()
    await seed()
    api.getSqlImportResult.mockRejectedValueOnce(new Error('temporary'))
    await vi.advanceTimersByTimeAsync(3000)
    await flushPromises()
    expect(page().get('[role="alert"]').text()).toContain('将自动重试')
    expect(page().text()).not.toContain('正在自动轮询任务进度...')
    expect(ElMessage.error).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(3000)
    await flushPromises()
    expect(api.getSqlImportResult).toHaveBeenCalledTimes(2)
    expect(state().readError).toBe('')
  })

  it.each([401, 403, 404])('静默%s失败停止轮询，保留结果并允许重试', async status => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await open()
    await seed()
    api.getSqlImportResult.mockRejectedValueOnce({
      response: { status, data: { message: 'fatal-read' } }
    })
    await vi.advanceTimersByTimeAsync(3000)
    await flushPromises()
    expect(page().get('[role="alert"]').text()).toContain('结果未更新')
    expect(ElMessage.error).toHaveBeenCalledWith('fatal-read')
    await vi.advanceTimersByTimeAsync(6000)
    expect(api.getSqlImportResult).toHaveBeenCalledTimes(1)
    expect(state().jobResult.jobId).toBe('original-job')
  })

  it.each(['resolve', 'reject'])('旧%s不能覆盖最新查询或提前结束其加载态', async method => {
    await open()
    await seed()
    const old = deferred(),
      latest = deferred()
    api.getSqlImportResult.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    const first = state().refreshCurrentJob(),
      second = state().refreshCurrentJob()
    old[method](method === 'resolve' ? { data: result('original-job', 1) } : new Error('old'))
    await first
    expect(state().refreshing).toBe(true)
    expect(state().jobResult.errors).toHaveLength(25)
    expect(ElMessage.error).not.toHaveBeenCalled()
    latest.resolve({ data: result('original-job', 2) })
    await second
    expect(state().jobResult.errors).toHaveLength(2)
    expect(state().refreshing).toBe(false)
  })

  it('新任务提交使旧查询失效，保留原执行参数与任务ID且不重复提交', async () => {
    await open()
    await seed()
    state().errorPagination.page = 2
    const old = deferred(),
      submit = deferred()
    api.getSqlImportResult.mockReturnValueOnce(old.promise)
    api.runSqlServerFile.mockReturnValueOnce(submit.promise)
    const read = state().refreshCurrentJob()
    await page().get('input').setValue('  sample.sql.gz  ')
    state().form.continueOnError = true
    state().form.dryRun = true
    await button('开始执行').trigger('click')
    await state().handleSubmit()
    expect(api.runSqlServerFile).toHaveBeenCalledTimes(1)
    expect(api.runSqlServerFile).toHaveBeenCalledWith({
      file: 'sample.sql.gz',
      async: true,
      continueOnError: true,
      dryRun: true
    })
    expect(button('刷新当前任务').attributes('disabled')).toBeDefined()
    submit.resolve({ data: result('new-job', 11) })
    await flushPromises()
    old.resolve({ data: result('original-job', 1) })
    await read
    await flushPromises()
    expect(state().currentJobId).toBe('new-job')
    expect(state().jobResult.errors).toHaveLength(11)
    expect(state().errorPagination.page).toBe(1)
  })

  it('缓存页离开停止轮询并忽略在途读取，返回同实例自动更新原任务和错误页', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await open(true)
    await seed()
    const context = state(),
      pending = deferred()
    context.errorPagination.page = 2
    api.getSqlImportResult.mockReturnValueOnce(pending.promise)
    await button('刷新当前任务').trigger('click')
    await router.push('/other')
    await flushPromises()
    pending.resolve({ data: result('original-job', 1) })
    await flushPromises()
    await vi.advanceTimersByTimeAsync(6000)
    expect(context.jobResult.errors).toHaveLength(25)
    expect(api.getSqlImportResult).toHaveBeenCalledTimes(1)
    await router.push('/ssc/sql-import')
    await flushPromises()
    expect(state()).toBe(context)
    expect(state().errorPagination.page).toBe(2)
    expect(api.getSqlImportResult).toHaveBeenCalledTimes(2)
  })

  it('离开缓存时仍接收已提交任务的回执，隐藏时不轮询，返回查询新任务', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await open(true)
    const context = state(),
      pending = deferred()
    api.runSqlServerFile.mockReturnValueOnce(pending.promise)
    await page().get('input').setValue('sample.sql')
    await button('开始执行').trigger('click')
    await router.push('/other')
    await flushPromises()
    pending.resolve({ data: { ...result('accepted-job'), message: 'accepted' } })
    await flushPromises()
    expect(context.currentJobId).toBe('accepted-job')
    expect(ElMessage.info).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(6000)
    expect(api.getSqlImportResult).not.toHaveBeenCalled()
    api.getSqlImportResult.mockResolvedValueOnce({ data: result('accepted-job') })
    await router.push('/ssc/sql-import')
    await flushPromises()
    expect(api.getSqlImportResult).toHaveBeenCalledWith('accepted-job')
    expect(api.runSqlServerFile).toHaveBeenCalledTimes(1)
  })

  it.each(['resolve', 'reject'])('卸载后迟到的%s不重建轮询、改结果或提示', async method => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await open()
    await seed()
    const context = state(),
      pending = deferred()
    api.getSqlImportResult.mockReturnValueOnce(pending.promise)
    const read = context.refreshCurrentJob()
    wrapper.unmount()
    pending[method](method === 'resolve' ? { data: result('original-job', 1) } : new Error('late'))
    await read
    await vi.advanceTimersByTimeAsync(6000)
    expect(context.jobResult.errors).toHaveLength(25)
    expect(ElMessage.error).not.toHaveBeenCalled()
    expect(api.getSqlImportResult).toHaveBeenCalledTimes(1)
  })

  it('显示有效零耗时、零计数与条目，非法值使用占位', async () => {
    await open()
    await seed(result('original-job', 0, 'COMPLETED'))
    expect(page().text()).toContain('耗时: 0 ms')
    expect(page().text()).toContain('总语句数: 0')
    expect(page().text()).toContain('当前条目: 0')
    for (const value of [NaN, Infinity, -1, 'bad', undefined, null, '']) {
      expect(state().formatElapsed(value)).toBe('-')
      expect(state().formatNumber(value)).toBe('-')
    }
    expect(state().formatElapsed(1500)).toBe('1s')
    expect(state().formatElapsed(61000)).toBe('1m 1s')
    expect(state().formatElapsed(3661000)).toBe('1h 1m 1s')
    expect(state().formatResultTime('invalid')).toBe('-')
    expect(state().formatResultTime(0)).not.toBe('-')
  })

  it('没有管理员权限时不显示操作入口、不主动读取或提交', async () => {
    permission.allowed = false
    await open()
    expect(page().text()).toContain('您没有权限访问此页面')
    expect(page().find('form').exists()).toBe(false)
    state().form.serverFile = 'sample.sql'
    await state().handleSubmit()
    expect(api.runSqlServerFile).not.toHaveBeenCalled()
    expect(api.getSqlImportResult).not.toHaveBeenCalled()
  })

  it('缺失的耗时与计数继续占位，不因标准化默认值显示为真实零或成功颜色', async () => {
    await open()
    await seed({
      jobId: 'sparse-job',
      status: 'COMPLETED',
      elapsedMs: null,
      totalStatements: '',
      failedStatements: undefined
    })
    expect(page().text()).toContain('耗时: -')
    expect(page().text()).toContain('总语句数: -')
    expect(page().text()).toContain('失败语句数: -')
    expect(page().find('span.text-success').exists()).toBe(false)
    expect(state().jobResult.elapsedMs).toBeNull()
  })

  it.each([
    ['FAILED', 'SQL 执行失败'],
    ['SUCCESS', 'SQL 执行完成']
  ])('已明确%s的提交回执保留完整结果，不再提示任务刚受理', async (status, message) => {
    await open()
    api.runSqlServerFile.mockResolvedValueOnce({ data: result('accepted-job', 11, status) })
    await page().get('input').setValue('sample.sql')
    await button('开始执行').trigger('click')
    await flushPromises()
    expect(state().currentJobId).toBe('accepted-job')
    expect(state().jobResult.errors).toHaveLength(11)
    expect(state().jobResult.status).toBe(status)
    const notifier = status === 'FAILED' ? ElMessage.error : ElMessage.info
    expect(notifier).toHaveBeenCalledWith(message)
    expect(ElMessage.info).not.toHaveBeenCalledWith('任务已受理，开始查询执行进度')
    expect(api.runSqlServerFile).toHaveBeenCalledTimes(1)
  })

  it.each(['Authentication expired', 'Access denied'])(
    '共享API转写的%s同样停止静默自动重试',
    async message => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      await open()
      await seed()
      api.getSqlImportResult.mockRejectedValueOnce(new Error(message))
      await vi.advanceTimersByTimeAsync(3000)
      await flushPromises()
      expect(state().readError).toContain('结果未更新')
      expect(state().readError).not.toContain('将自动重试')
      await vi.advanceTimersByTimeAsync(9000)
      expect(api.getSqlImportResult).toHaveBeenCalledTimes(1)
      expect(ElMessage.error).toHaveBeenCalledWith(message)
    }
  )
})
