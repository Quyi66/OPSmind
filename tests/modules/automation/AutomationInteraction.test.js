import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, inject, provide } from 'vue'
import { createPinia } from 'pinia'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import JobListPage from '@/modules/automation/views/job/JobListPage.vue'
import ExecuteHistoryDialog from '@/modules/automation/components/job/JobListView/ExecuteHistoryDialog.vue'
import CronJobFormDialog from '@/modules/automation/components/job/components/CronJobFormDialog.vue'
import NextExecutionTimeDialog from '@/modules/automation/components/job/components/NextExecutionTimeDialog.vue'
import * as api from '@/modules/automation/api/jao'

vi.mock('@/modules/automation/api/jao', () => ({
  appList: vi.fn(),
  appTableList: vi.fn(),
  getJobDetail: vi.fn(),
  executeJob: vi.fn(),
  checkNeedApprove: vi.fn(),
  fetchJobRunLogs: vi.fn(),
  queryNextExecutionTime: vi.fn(),
  fetchCronJobById: vi.fn(),
  fetchJobsByType: vi.fn(),
  fetchJobById: vi.fn(),
  createCronJob: vi.fn(),
  updateCronJob: vi.fn()
}))
vi.mock('element-plus', () => ({
  ElMessage: { info: vi.fn(), error: vi.fn(), warning: vi.fn(), success: vi.fn() },
  ElMessageBox: { confirm: vi.fn() }
}))
vi.mock('@/utils/i18n', () => ({
  initTranslations: vi.fn().mockResolvedValue(),
  translateText: value => value || ''
}))
vi.mock('@/modules/automation/stores/useJobStore', async () => {
  const { defineStore } = await import('pinia')
  const { ref, reactive } = await import('vue')
  return {
    JOB_TYPE_OPTIONS: [],
    useAutomationJobStore: defineStore('interaction-jobs', () => ({
      jobs: ref([]),
      filteredJobs: ref([]),
      error: ref(null),
      filters: reactive({ appletCode: 'ALL' })
    }))
  }
})
vi.mock('@/modules/automation/components/job/JobListView/CreateJobDialog.vue', () => ({
  default: { name: 'CreateJobDialog', template: '<div />' }
}))
vi.mock('@/modules/automation/components/job/JobListView/JobApproveDialog.vue', () => ({
  default: { name: 'JobApproveDialog', props: ['jobId', 'params'], template: '<div />' }
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: {
    name: 'ExecuteResultDialog',
    props: ['visible', 'runId', 'jobId', 'jobTitle'],
    emits: ['update:visible'],
    template: '<div><button @click="$emit(\'update:visible\', false)">关闭结果</button></div>'
  }
}))
vi.mock('@/modules/automation/components/job/CronGeneratorDialog.vue', () => ({
  default: { name: 'CronGeneratorDialog', props: ['modelValue'], template: '<div />' }
}))
vi.mock('@/modules/automation/components/job/components/CronJobParamsSection.vue', () => ({
  default: { name: 'CronJobParamsSection', template: '<div />' }
}))

const Slot = { template: '<div><slot /><slot name="footer" /><slot name="append" /></div>' }
const Form = defineComponent({
  setup(_props, { slots, expose }) {
    expose({ validate: vi.fn().mockResolvedValue(true), clearValidate: vi.fn() })
    return () => h('div', slots.default?.())
  }
})
const Button = {
  props: ['disabled', 'loading'],
  template: '<button :disabled="disabled || loading"><slot /></button>'
}
const Table = defineComponent({
  props: ['data'],
  setup(props, { slots }) {
    provide(
      'rows',
      computed(() => props.data || [])
    )
    return () => h('div', slots.default?.())
  }
})
const Column = defineComponent({
  props: ['prop'],
  setup(props, { slots }) {
    const rows = inject(
      'rows',
      computed(() => [])
    )
    return () =>
      h(
        'section',
        rows.value.map(row =>
          h('div', slots.default ? slots.default({ row }) : String(row[props.prop] ?? ''))
        )
      )
  }
})
const Select = {
  props: ['modelValue'],
  emits: ['update:modelValue', 'change'],
  template: '<div><slot /></div>'
}
const Input = { name: 'ElInput', template: '<div><slot name="append" /></div>' }
const Empty = { props: ['description'], template: '<p>{{ description }}</p>' }
const wrappers = []
const stateOf = wrapper => wrapper.vm.$.setupState
const button = (wrapper, text) => wrapper.findAll('button').find(item => item.text() === text)
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
function mount(component, props = {}) {
  const wrapper = shallowMount(component, {
    props,
    global: {
      plugins: [createPinia()],
      directives: { loading() {} },
      stubs: {
        'el-dialog': Slot,
        'el-form': Form,
        'el-form-item': Slot,
        'el-input': Input,
        'el-button': Button,
        'el-table': Table,
        'el-table-column': Column,
        'el-select': Select,
        'el-option': true,
        'el-pagination': true,
        'el-icon': Slot,
        'el-tag': Slot,
        'el-dropdown': Slot,
        'el-dropdown-menu': Slot,
        'el-dropdown-item': Slot,
        'el-alert': Slot,
        'el-collapse': Slot,
        'el-collapse-item': Slot,
        'el-empty': Empty,
        RunLogStatusTag: Slot,
        ExecuteJobDialog: false,
        ExecuteResultDialog: false,
        NextExecutionTimeDialog: false,
        CronJobFormDialog: false
      }
    }
  })
  wrappers.push(wrapper)
  return wrapper
}
const job = Object.freeze({
  id: 'real-tool',
  title: '自定义工具',
  type: 'rest',
  configJson: '{"raw":true}'
})
const cron = '0 0 12 * * ?'
const log = (id, status = 'COMPLETED') => ({ id, job_id: job.id, job_title: job.title, status })
beforeEach(() => {
  vi.resetAllMocks()
  api.appList.mockResolvedValue({ data: [] })
  api.appTableList.mockResolvedValue({ data: [job] })
  api.getJobDetail.mockResolvedValue({
    data: {
      type: job.type,
      configJson: job.configJson,
      params: [
        { name: 'hosts', defaultValue: 'raw-host-key' },
        { name: 'empty', defaultValue: '' }
      ]
    }
  })
  api.executeJob.mockResolvedValue({ data: { runId: 'real-run', status: 'COMPLETED' } })
  api.checkNeedApprove.mockResolvedValue({ data: { isApproving: false } })
  api.fetchJobRunLogs.mockResolvedValue({ data: { records: [log('history-run')], total: 1 } })
  api.queryNextExecutionTime.mockResolvedValue({ data: [{ next: ['2026-10-21 12:00:00'] }] })
  api.fetchJobsByType.mockResolvedValue({ data: [job] })
  api.fetchJobById.mockResolvedValue({ data: { params: [] } })
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => {
    if (wrapper.exists()) wrapper.unmount()
  })
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('AUTO-1 列表执行与本次结果', () => {
  async function openExecution() {
    const wrapper = mount(JobListPage)
    await flushPromises()
    await button(wrapper, '执行').trigger('click')
    await flushPromises()
    return wrapper
  }
  it('原参数提交后直接打开真实运行结果，关闭保留列表上下文，不查询历史', async () => {
    const wrapper = await openExecution()
    const state = stateOf(wrapper)
    state.filters.keyword = '草稿'
    state.currentPage = 3
    state.pageSize = 20
    const calls = api.appTableList.mock.calls.length
    await button(wrapper, '执行运维工具').trigger('click')
    await flushPromises()
    expect(api.executeJob).toHaveBeenCalledExactlyOnceWith({
      jobId: job.id,
      type: job.type,
      configJson: job.configJson,
      options: { secretParams: [], params: { hosts: 'raw-host-key', empty: '' } }
    })
    expect(wrapper.findComponent({ name: 'ExecuteResultDialog' }).props()).toMatchObject({
      visible: true,
      runId: 'real-run',
      jobId: job.id,
      jobTitle: job.title
    })
    await button(wrapper, '关闭结果').trigger('click')
    expect(state.currentPage).toBe(3)
    expect(state.pageSize).toBe(20)
    expect(state.filters.keyword).toBe('草稿')
    expect(api.appTableList).toHaveBeenCalledTimes(calls)
    expect(api.fetchJobRunLogs).not.toHaveBeenCalled()
  })
  it('未返回运行ID时提示从原历史查看，不猜最新记录、不重试执行', async () => {
    api.executeJob.mockResolvedValue({ data: { status: 'WAITING' } })
    const wrapper = await openExecution()
    await button(wrapper, '执行运维工具').trigger('click')
    await flushPromises()
    expect(stateOf(wrapper).resultDialogVisible).toBe(false)
    expect(ElMessage.info).toHaveBeenCalledWith(expect.stringContaining('历史'))
    expect(api.executeJob).toHaveBeenCalledTimes(1)
    expect(button(wrapper, '历史')).toBeDefined()
  })
  it.each(['axios', 'raw'])('脚本单条WAITING数组响应（%s）打开本次真实结果', async shape => {
    const runId = 'eb8aa4e626e24d0cb4a0e92419527c03'
    const scriptJob = { ...job, id: '3mss7G', type: 'script' }
    const response = Object.freeze([
      Object.freeze({
        status: 'WAITING',
        data: null,
        error: null,
        statsJson: null,
        runId,
        detail: Object.freeze({ batches: Object.freeze([]) })
      })
    ])
    api.appTableList.mockResolvedValue({ data: [scriptJob] })
    api.getJobDetail.mockResolvedValue({
      data: { type: 'script', configJson: scriptJob.configJson, params: [] }
    })
    api.executeJob.mockResolvedValue(shape === 'axios' ? { data: response } : response)
    const wrapper = await openExecution()
    const execute = wrapper.findComponent({ name: 'ExecuteJobDialog' })
    await button(wrapper, '执行运维工具').trigger('click')
    await flushPromises()
    expect(execute.emitted('success').at(-1)[0]).toMatchObject({
      runId,
      status: 'WAITING',
      jobId: '3mss7G',
      jobType: 'script'
    })
    expect(wrapper.findComponent({ name: 'ExecuteResultDialog' }).props()).toMatchObject({
      visible: true,
      runId,
      jobId: '3mss7G'
    })
    expect(ElMessage.info).not.toHaveBeenCalled()
    expect(api.executeJob).toHaveBeenCalledExactlyOnceWith({
      jobId: '3mss7G',
      type: 'script',
      configJson: scriptJob.configJson,
      options: { secretParams: [], params: {} }
    })
    expect(response[0]).toMatchObject({ runId, status: 'WAITING', data: null })
  })
  it.each([
    { name: 'empty', response: [] },
    { name: 'multiple', response: [{ runId: 'run-a' }, { runId: 'run-b' }] }
  ])('空数组或多条响应不猜运行ID（$name）', async ({ response }) => {
    api.executeJob.mockResolvedValue({ data: response })
    const wrapper = await openExecution()
    await button(wrapper, '执行运维工具').trigger('click')
    await flushPromises()
    expect(stateOf(wrapper).resultDialogVisible).toBe(false)
    expect(api.executeJob).toHaveBeenCalledTimes(1)
  })
  it('失败保留原表单供手动重试，取消不执行', async () => {
    api.executeJob.mockRejectedValue(new Error('mock failure'))
    const wrapper = await openExecution()
    await button(wrapper, '执行运维工具').trigger('click')
    await flushPromises()
    expect(stateOf(wrapper).executeDialogVisible).toBe(true)
    expect(stateOf(wrapper).resultDialogVisible).toBe(false)
    await button(wrapper, '取消').trigger('click')
    expect(api.executeJob).toHaveBeenCalledTimes(1)
  })
  it('关闭后或开启另一工具后，旧会话成功回调不能打开结果', async () => {
    const wrapper = await openExecution()
    const state = stateOf(wrapper)
    const oldSuccess = state.executeJobMeta.onSuccess
    await button(wrapper, '取消').trigger('click')
    oldSuccess({ runId: 'late-run', jobId: job.id })
    expect(state.resultDialogVisible).toBe(false)
    await state.handleViewJob({ ...job, id: 'another-tool' })
    oldSuccess({ runId: 'late-run', jobId: job.id })
    expect(state.resultDialogVisible).toBe(false)
    state.executeJobMeta.onSuccess({ runId: 'wrong-run', jobId: 'wrong-tool' })
    expect(state.resultDialogVisible).toBe(false)
    expect(api.executeJob).not.toHaveBeenCalled()
  })
  it.each(['needs-approval', 'server-pending', 'row-pending', 'check-failed'])(
    '保留原审批前置分支 %s，不打开执行表单',
    async mode => {
      const wrapper = mount(JobListPage)
      await flushPromises()
      if (mode === 'server-pending')
        api.checkNeedApprove.mockResolvedValue({ data: { isApproving: true } })
      if (mode === 'check-failed') api.checkNeedApprove.mockRejectedValue(new Error('denied'))
      await stateOf(wrapper).handleViewJob({
        ...job,
        needApprove: true,
        isApproving: mode === 'row-pending'
      })
      await flushPromises()
      expect(stateOf(wrapper).executeDialogVisible).toBe(false)
      expect(stateOf(wrapper).approveDialogVisible).toBe(mode === 'needs-approval')
      expect(api.checkNeedApprove).toHaveBeenCalledExactlyOnceWith(job.id)
      expect(api.executeJob).not.toHaveBeenCalled()
    }
  )
})

describe('AUTO-4 当前工具创建定时任务', () => {
  it.each(['script', 'rest'])('%s工具原地带入真实ID和类型，仅手动保存原定时请求', async type => {
    const source = { ...job, type, appletCode: 'do-not-copy', jobParam: { scope: 'old-execution' } }
    api.appTableList.mockResolvedValue({ data: [source] })
    api.fetchJobsByType.mockResolvedValue({ data: [source] })
    api.fetchJobById.mockResolvedValue({
      data: {
        id: source.id,
        type,
        params: [
          { name: 'scope', defaultValue: 'original-default' },
          { name: 'empty', defaultValue: '' }
        ]
      }
    })
    const wrapper = mount(JobListPage)
    await flushPromises()
    await button(wrapper, '创建定时任务').trigger('click')
    await flushPromises()
    const form = wrapper.findComponent(CronJobFormDialog)
    const state = stateOf(form)
    expect(form.props('initialJob')).toEqual({ id: job.id, type })
    expect(state.formData).toMatchObject({
      jobId: job.id,
      jobType: type,
      jobDesc: '',
      scheduleConf: '',
      appCode: '',
      triggerStatus: '1',
      logOutput: '1',
      isEncrypt: '1',
      jobParam: {}
    })
    expect(state.jobParams.map(param => param.defaultValue)).toEqual(['original-default', ''])
    expect(api.fetchJobsByType).toHaveBeenCalledExactlyOnceWith(type)
    expect(api.fetchJobById).toHaveBeenCalledExactlyOnceWith(job.id)
    expect(api.createCronJob).not.toHaveBeenCalled()
    expect(api.executeJob).not.toHaveBeenCalled()
    state.formData.jobDesc = '新计划'
    state.formData.scheduleConf = cron
    await flushPromises()
    await button(form, '保存').trigger('click')
    await flushPromises()
    expect(api.createCronJob).toHaveBeenCalledExactlyOnceWith({
      jobId: job.id,
      jobType: type,
      jobDesc: '新计划',
      scheduleConf: cron,
      appCode: '',
      triggerStatus: '1',
      logOutput: false,
      isEncrypt: false,
      jobParam: { scope: 'original-default', empty: '' }
    })
    expect(api.updateCronJob).not.toHaveBeenCalled()
  })
  it('取消不保存，列表上下文保持，再次打开不复用上次草稿', async () => {
    const wrapper = mount(JobListPage)
    await flushPromises()
    await button(wrapper, '创建定时任务').trigger('click')
    await flushPromises()
    const list = stateOf(wrapper)
    list.currentPage = 3
    list.pageSize = 20
    list.filters.keyword = '原筛选'
    const form = wrapper.findComponent(CronJobFormDialog)
    stateOf(form).formData.jobDesc = '取消的草稿'
    await button(form, '取消').trigger('click')
    await flushPromises()
    expect(list.scheduleDialogVisible).toBe(false)
    expect(list.currentPage).toBe(3)
    expect(list.pageSize).toBe(20)
    expect(list.filters.keyword).toBe('原筛选')
    list.handleCreateSchedule(job)
    await flushPromises()
    expect(stateOf(wrapper.findComponent(CronJobFormDialog)).formData.jobDesc).toBe('')
    expect(api.createCronJob).not.toHaveBeenCalled()
  })
  it('需审批/审批中禁快捷入口，命令及无真实ID不提供入口，不读取或执行', async () => {
    api.appTableList.mockResolvedValue({
      data: [
        { ...job, needApprove: true },
        { ...job, id: 'pending', isApproving: true },
        { ...job, id: 'command-id', type: 'command' },
        { ...job, id: '' }
      ]
    })
    const wrapper = mount(JobListPage)
    await flushPromises()
    const entries = wrapper.findAll('button').filter(item => item.text() === '创建定时任务')
    expect(entries).toHaveLength(2)
    expect(entries.every(item => item.attributes('disabled') !== undefined)).toBe(true)
    const state = stateOf(wrapper)
    state.handleCreateSchedule({ ...job, needApprove: true })
    state.handleCreateSchedule({ ...job, isApproving: true })
    state.handleCreateSchedule({ ...job, type: 'command' })
    state.handleCreateSchedule({ ...job, id: '' })
    expect(state.scheduleDialogVisible).toBe(false)
    expect(api.fetchJobsByType).not.toHaveBeenCalled()
    expect(api.fetchJobById).not.toHaveBeenCalled()
    expect(api.executeJob).not.toHaveBeenCalled()
  })
  it('初始工具读取失败禁保存，可重试原只读请求', async () => {
    api.fetchJobsByType.mockRejectedValueOnce(new Error('read failed'))
    const wrapper = mount(JobListPage)
    await flushPromises()
    await button(wrapper, '创建定时任务').trigger('click')
    await flushPromises()
    const form = wrapper.findComponent(CronJobFormDialog)
    expect(stateOf(form).initializationError).toContain('读取')
    expect(button(form, '保存').attributes('disabled')).toBeDefined()
    await button(form, '重新加载工具').trigger('click')
    await flushPromises()
    expect(stateOf(form).initializationError).toBe('')
    expect(stateOf(form).formData.jobId).toBe(job.id)
    expect(api.createCronJob).not.toHaveBeenCalled()
  })
})

describe('AUTO-2 单工具历史筛选', () => {
  const openHistory = () =>
    mount(ExecuteHistoryDialog, { visible: true, jobId: job.id, autoRefresh: false })
  async function select(wrapper, index, value) {
    const control = wrapper.findAllComponents(Select)[index]
    control.vm.$emit('update:modelValue', value)
    control.vm.$emit('change', value)
    await flushPromises()
  }
  it('时间/状态立即查询并重置页码，保留真实ID和隐藏空值', async () => {
    const wrapper = openHistory()
    await flushPromises()
    stateOf(wrapper).currentPage = 3
    await select(wrapper, 0, 'last7')
    expect(api.fetchJobRunLogs).toHaveBeenLastCalledWith({
      params: { job_id: job.id, day: '7', type: '', run_ids: '', status: 'all' },
      size: 10,
      page: 1,
      orderBy: 'start_time desc',
      filter: ''
    })
    await select(wrapper, 1, 'ERROR')
    expect(api.fetchJobRunLogs.mock.calls.at(-1)[0].params.status).toBe('ERROR')
    stateOf(wrapper).handleStatusClick(stateOf(wrapper).tableData[0])
    await flushPromises()
    expect(wrapper.findComponent({ name: 'ExecuteResultDialog' }).props('runId')).toBe(
      'history-run'
    )
    expect(api.executeJob).not.toHaveBeenCalled()
  })
  it('关键词草稿不随下拉、分页或刷新提交，搜索/回车才应用，重置清除', async () => {
    const wrapper = openHistory()
    await flushPromises()
    const state = stateOf(wrapper)
    state.keyword = 'raw-name'
    await select(wrapper, 0, 'last30')
    expect(api.fetchJobRunLogs.mock.calls.at(-1)[0].filter).toBe('')
    await button(wrapper, '搜索').trigger('click')
    await flushPromises()
    expect(api.fetchJobRunLogs.mock.calls.at(-1)[0].filter).toBe('job_title:*raw-name*')
    state.keyword = 'draft'
    state.handlePageChange(2)
    await flushPromises()
    expect(api.fetchJobRunLogs.mock.calls.at(-1)[0].filter).toBe('job_title:*raw-name*')
    state.handleRefresh()
    await flushPromises()
    expect(api.fetchJobRunLogs.mock.calls.at(-1)[0].filter).toBe('job_title:*raw-name*')
    await wrapper.findComponent({ name: 'ElInput' }).trigger('keyup.enter')
    await flushPromises()
    expect(api.fetchJobRunLogs.mock.calls.at(-1)[0].filter).toBe('job_title:*draft*')
    await button(wrapper, '重置').trigger('click')
    await flushPromises()
    expect(api.fetchJobRunLogs.mock.calls.at(-1)[0]).toMatchObject({
      filter: '',
      page: 1,
      params: { day: '0', status: 'all' }
    })
  })
  it('快速切换只接纳最新响应，旧错误不提示、不覆盖加载状态', async () => {
    const wrapper = openHistory()
    await flushPromises()
    const old = deferred(),
      latest = deferred()
    api.fetchJobRunLogs.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    await select(wrapper, 0, 'last7')
    await select(wrapper, 1, 'ERROR')
    old.reject(new Error('stale failure'))
    await flushPromises()
    expect(stateOf(wrapper).tableLoading).toBe(true)
    expect(ElMessage.error).not.toHaveBeenCalled()
    latest.resolve({ data: { records: [log('latest')], total: 1 } })
    await flushPromises()
    expect(stateOf(wrapper).tableData[0].id).toBe('latest')
    expect(stateOf(wrapper).tableLoading).toBe(false)
  })
  it('换工具、关闭或卸载后忽略旧响应', async () => {
    const old = deferred()
    api.fetchJobRunLogs.mockReturnValueOnce(old.promise)
    const wrapper = openHistory()
    await wrapper.setProps({ jobId: 'another-tool' })
    await flushPromises()
    old.resolve({ data: { records: [log('wrong-tool')], total: 9 } })
    await flushPromises()
    expect(stateOf(wrapper).tableData[0].id).toBe('history-run')
    const closed = deferred()
    api.fetchJobRunLogs.mockReturnValueOnce(closed.promise)
    stateOf(wrapper).handleRefresh()
    await wrapper.setProps({ visible: false })
    closed.resolve({ data: { records: [log('closed-run')], total: 9 } })
    await flushPromises()
    expect(stateOf(wrapper).tableData).toEqual([])
    const unmounted = deferred()
    api.fetchJobRunLogs.mockReturnValueOnce(unmounted.promise)
    await wrapper.setProps({ visible: true })
    wrapper.unmount()
    unmounted.reject(new Error('after unmount'))
    await flushPromises()
    expect(ElMessage.error).not.toHaveBeenCalled()
  })
  it('当前请求失败可原条件搜索重试，运行中记录仍沿原规则轮询', async () => {
    vi.useFakeTimers()
    api.fetchJobRunLogs.mockRejectedValueOnce(new Error('current failure'))
    const wrapper = mount(ExecuteHistoryDialog, { visible: true, jobId: job.id })
    await flushPromises()
    expect(ElMessage.error).toHaveBeenCalledWith('current failure')
    api.fetchJobRunLogs.mockResolvedValueOnce({
      data: { records: [log('active-run', 'RUNNING')], total: 1 }
    })
    await button(wrapper, '搜索').trigger('click')
    await flushPromises()
    const calls = api.fetchJobRunLogs.mock.calls.length
    await vi.advanceTimersByTimeAsync(5000)
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(calls + 1)
    await wrapper.setProps({ visible: false })
    await vi.advanceTimersByTimeAsync(10000)
    expect(api.fetchJobRunLogs).toHaveBeenCalledTimes(calls + 1)
  })
})

describe('AUTO-3 定时草稿预览', () => {
  it('表单直接预览原表达式，不打开生成器、不保存，原默认字段保持', async () => {
    const wrapper = mount(CronJobFormDialog, { modelValue: true })
    const state = stateOf(wrapper)
    expect(button(wrapper, '预览执行时间').attributes('disabled')).toBeDefined()
    state.formData.scheduleConf = cron
    await flushPromises()
    const snapshot = JSON.parse(JSON.stringify(state.formData))
    await button(wrapper, '预览执行时间').trigger('click')
    await flushPromises()
    expect(api.queryNextExecutionTime).toHaveBeenCalledExactlyOnceWith(cron)
    expect(wrapper.text()).toContain('2026-10-21 12:00:00')
    expect(state.cronGeneratorVisible).toBe(false)
    expect(state.formData).toEqual(snapshot)
    expect(state.formData).toMatchObject({
      appCode: '',
      triggerStatus: '1',
      jobParam: {},
      logOutput: '1',
      isEncrypt: '1'
    })
    expect(api.createCronJob).not.toHaveBeenCalled()
    expect(api.updateCronJob).not.toHaveBeenCalled()
    await wrapper.setProps({ modelValue: false })
    expect(state.nextTimeVisible).toBe(false)
  })
  it('编辑原关联和参数不被预览写回，关闭预览仍保留草稿', async () => {
    const fixture = {
      jobDesc: '已有计划',
      scheduleConf: cron,
      jobType: 'script',
      jobId: job.id,
      appCode: 'raw-app',
      triggerStatus: '0',
      logOutput: true,
      isEncrypt: false,
      jobParam: { raw: '#{keep}' }
    }
    api.fetchCronJobById.mockResolvedValue({ data: fixture })
    const wrapper = mount(CronJobFormDialog, { modelValue: true, editingId: 'cron-id' })
    await flushPromises()
    const snapshot = JSON.parse(JSON.stringify(stateOf(wrapper).formData))
    await button(wrapper, '预览执行时间').trigger('click')
    await flushPromises()
    wrapper.findComponent(NextExecutionTimeDialog).vm.$emit('update:modelValue', false)
    await flushPromises()
    expect(stateOf(wrapper).formData).toEqual(snapshot)
    expect(api.createCronJob).not.toHaveBeenCalled()
    expect(api.updateCronJob).not.toHaveBeenCalled()
  })
  it('不同表达式的旧结果/旧错误、关闭后响应均不能复活', async () => {
    const old = deferred(),
      latest = deferred()
    api.queryNextExecutionTime.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    const wrapper = mount(NextExecutionTimeDialog, { modelValue: true, scheduleConf: cron })
    await wrapper.setProps({ scheduleConf: '0 0 13 * * ?' })
    old.resolve({ data: [{ next: ['stale-time'] }] })
    await flushPromises()
    expect(stateOf(wrapper).loading).toBe(true)
    expect(wrapper.text()).not.toContain('stale-time')
    await wrapper.setProps({ modelValue: false })
    latest.reject(new Error('closed failure'))
    await flushPromises()
    expect(stateOf(wrapper).error).toBe('')
    expect(stateOf(wrapper).times).toEqual([])
  })
  it('非法表达式错误可重试，同一原字符串不被归一化，无结果使用草稿文案', async () => {
    api.queryNextExecutionTime.mockRejectedValueOnce(new Error('invalid cron'))
    const wrapper = mount(NextExecutionTimeDialog, {
      modelValue: true,
      scheduleConf: ' invalid raw ',
      emptyDescription: '当前表达式没有可预览的执行时间'
    })
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toContain('查询执行时间失败')
    api.queryNextExecutionTime.mockResolvedValueOnce({ data: [] })
    await button(wrapper, '重试').trigger('click')
    await flushPromises()
    expect(api.queryNextExecutionTime).toHaveBeenNthCalledWith(1, ' invalid raw ')
    expect(api.queryNextExecutionTime).toHaveBeenNthCalledWith(2, ' invalid raw ')
    expect(wrapper.text()).toContain('当前表达式没有可预览的执行时间')
    expect(wrapper.text()).not.toContain('禁用')
  })
  it('空表达式不请求，列表原空结果文案保持，卸载忽略错误', async () => {
    const wrapper = mount(NextExecutionTimeDialog, { modelValue: true, scheduleConf: '   ' })
    await flushPromises()
    expect(api.queryNextExecutionTime).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('该任务没有执行计划，是否已禁用？')
    const pending = deferred()
    api.queryNextExecutionTime.mockReturnValueOnce(pending.promise)
    await wrapper.setProps({ scheduleConf: cron })
    wrapper.unmount()
    pending.reject(new Error('unmounted'))
    await flushPromises()
    expect(stateOf(wrapper).error).toBe('')
  })
})
