import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { ElMessage, ElMessageBox } from 'element-plus'
import ExecuteJobDialog from '@/modules/automation/components/job/JobListView/ExecuteJobDialog.vue'
import ExecuteHistoryDialog from '@/modules/automation/components/job/JobListView/ExecuteHistoryDialog.vue'
import JobRunLogsPage from '@/modules/automation/views/job/JobRunLogsPage.vue'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/core/api', () => ({ useApi: () => http }))
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
  ElMessageBox: { confirm: vi.fn() }
}))
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn() })
}))
vi.mock('@/modules/automation/stores/useJobStore', () => ({ JOB_TYPE_OPTIONS: [] }))
vi.mock('@/utils/i18n', () => ({
  initTranslations: vi.fn().mockResolvedValue(),
  translateText: value => value || ''
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { name: 'ExecuteResultDialog', template: '<div />' }
}))
vi.mock('@/modules/automation/views/job/JobStatisticsPage.vue', () => ({
  default: { name: 'JobStatisticsPage', template: '<div />' }
}))

const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const Button = {
  props: ['disabled', 'loading'],
  template: '<button :disabled="disabled || loading"><slot /></button>'
}
const Input = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
}
const wrappers = []
const stateOf = wrapper => wrapper.vm.$.setupState
const executeButton = wrapper =>
  wrapper.findAll('button').find(button => button.text() === '执行运维工具')
const toolId = 'real-script-tool'
const rawConfig = '{"scripts":[{"path":"/scripts/task.sh","argline":"--raw"}]}'
const row = Object.freeze({
  id: 'record-id',
  runId: 'real-run-id',
  job_id: toolId,
  job_title: '自定义工具',
  job_type: 'script',
  status: 'ERROR'
})
const errorBody = Object.freeze([
  Object.freeze({
    status: 'ERROR',
    error: '{"message":"执行目标不可用"}',
    runId: 'failed-run-id',
    data: null,
    detail: Object.freeze({ statusCode: 400 })
  })
])
const rejectedReceipt = { status: 200, data: errorBody }

function mount(component, props = {}) {
  const wrapper = shallowMount(component, {
    props,
    global: {
      directives: { loading() {} },
      stubs: {
        'el-dialog': Slot,
        'el-form': Slot,
        'el-form-item': Slot,
        'el-input': Input,
        'el-button': Button,
        'el-tabs': Slot,
        'el-tab-pane': Slot,
        'el-table': Slot,
        'el-table-column': true,
        'el-pagination': true,
        'el-select': Slot,
        'el-option': true,
        'el-icon': Slot,
        'el-tag': Slot
      }
    }
  })
  wrappers.push(wrapper)
  return wrapper
}

async function openExecution() {
  const wrapper = mount(ExecuteJobDialog, { visible: true, jobId: toolId, jobType: 'script' })
  await flushPromises()
  await wrapper.find('input').setValue('保留原参数 --host=raw-host-id')
  return wrapper
}

const rerunEntries = [
  {
    name: '单工具历史',
    component: ExecuteHistoryDialog,
    props: { visible: true, jobId: toolId, autoRefresh: false },
    getRow: wrapper => stateOf(wrapper).tableData[0],
    loading: wrapper => stateOf(wrapper).tableLoading,
    successMessage: '运维工具已提交执行',
    fallback: '执行失败'
  },
  {
    name: '运行记录页',
    component: JobRunLogsPage,
    props: {},
    getRow: wrapper => stateOf(wrapper).tableData[0],
    loading: wrapper => stateOf(wrapper).loading,
    successMessage: '运维工具已重新启动',
    fallback: '重新启动运维工具失败'
  }
]

beforeEach(() => {
  vi.resetAllMocks()
  http.get.mockImplementation(url => {
    if (url === `/workflow/api/workflow/jobs/${toolId}`) {
      return Promise.resolve({
        data: {
          type: 'script',
          title: '自定义工具',
          configJson: rawConfig,
          params: [{ name: 'hosts', defaultValue: 'raw-host-id' }]
        }
      })
    }
    return Promise.resolve({ data: { records: [row], total: 1 } })
  })
  http.post.mockResolvedValue(rejectedReceipt)
  ElMessageBox.confirm.mockResolvedValue('confirm')
})

afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
})

describe('运维工具执行回执', () => {
  it.each([
    ['HTTP200 ERROR数组带运行ID', rejectedReceipt, '执行目标不可用'],
    ['直接ERROR对象且error为空', { status: 'ERROR', error: null }, '执行运维工具失败'],
    ['混合成败数组', [{ status: 'COMPLETED', runId: 'ok-run' }, ...errorBody], '执行目标不可用'],
    [
      '完成状态但内层400',
      { data: { status: 'COMPLETED', detail: { statusCode: 400 }, message: '参数无效' } },
      '参数无效'
    ]
  ])('%s不成功提示、关闭或发送success，原输入保留', async (_name, receipt, message) => {
    http.post.mockResolvedValue(receipt)
    const wrapper = await openExecution()
    await executeButton(wrapper).trigger('click')
    await flushPromises()
    expect(ElMessage.error).toHaveBeenCalledExactlyOnceWith(message)
    expect(ElMessage.success).not.toHaveBeenCalled()
    expect(wrapper.emitted('success')).toBeUndefined()
    expect(wrapper.emitted('update:visible')).toBeUndefined()
    expect(wrapper.find('input').element.value).toBe('保留原参数 --host=raw-host-id')
    expect(stateOf(wrapper).submitLoading).toBe(false)
    expect(stateOf(wrapper).pollingTimer).toBeUndefined()
    expect(http.post).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(
        /^\/workflow\/api\/workflow\/jobs\/real-script-tool\/run\?cacheBuster=\d+$/
      ),
      {
        type: 'script',
        configJson: rawConfig,
        options: { secretParams: [], params: { hosts: '保留原参数 --host=raw-host-id' } }
      }
    )
  })

  it('失败后仅手动重试，WAITING回执沿原真实运行ID成功关闭', async () => {
    const wrapper = await openExecution()
    await executeButton(wrapper).trigger('click')
    await flushPromises()
    expect(http.post).toHaveBeenCalledTimes(1)
    http.post.mockResolvedValue({ data: [{ status: 'WAITING', runId: 'accepted-run-id' }] })
    await executeButton(wrapper).trigger('click')
    await flushPromises()
    expect(http.post).toHaveBeenCalledTimes(2)
    expect(http.post.mock.calls[1][0]).toMatch(
      /^\/workflow\/api\/workflow\/jobs\/real-script-tool\/run\?cacheBuster=\d+$/
    )
    expect(http.post.mock.calls[1][1]).toEqual(http.post.mock.calls[0][1])
    expect(wrapper.emitted('success')).toEqual([
      [
        {
          runId: 'accepted-run-id',
          status: 'WAITING',
          jobId: toolId,
          jobType: 'script',
          jobTitle: '自定义工具'
        }
      ]
    ])
    expect(ElMessage.success).toHaveBeenCalledExactlyOnceWith(
      '运维工具已提交执行，正在打开运行结果'
    )
    expect(wrapper.emitted('update:visible')).toEqual([[false]])
    expect(stateOf(wrapper).submitLoading).toBe(false)
    expect(stateOf(wrapper).pollingTimer).toBeUndefined()
  })

  it('业务data中的ERROR字段不作为回执失败', async () => {
    http.post.mockResolvedValue({
      data: {
        status: 'COMPLETED',
        runId: 'completed-run',
        data: { status: 'ERROR', error: '业务内容' }
      }
    })
    const wrapper = await openExecution()
    await executeButton(wrapper).trigger('click')
    await flushPromises()
    expect(ElMessage.error).not.toHaveBeenCalled()
    expect(wrapper.emitted('success')).toHaveLength(1)
  })
})

describe.each(rerunEntries)('$name重新执行回执', entry => {
  it.each([
    ['HTTP200 ERROR数组', rejectedReceipt, '执行目标不可用'],
    ['直接ERROR对象且error为空', { status: 'ERROR', error: null }, null]
  ])('%s不提示成功、不刷新，保留原记录及确认', async (_name, receipt, message) => {
    http.post.mockResolvedValue(receipt)
    const wrapper = mount(entry.component, entry.props)
    await flushPromises()
    const originalRows = [...stateOf(wrapper).tableData]
    const readCount = http.get.mock.calls.length
    await stateOf(wrapper).handleRerun(entry.getRow(wrapper))
    await flushPromises()
    expect(ElMessage.error).toHaveBeenCalledExactlyOnceWith(message || entry.fallback)
    expect(ElMessage.success).not.toHaveBeenCalled()
    expect(http.get).toHaveBeenCalledTimes(readCount)
    expect(stateOf(wrapper).tableData).toEqual(originalRows)
    expect(wrapper.emitted('update:visible')).toBeUndefined()
    expect(entry.loading(wrapper)).toBe(false)
    expect(ElMessageBox.confirm).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('自定义工具'),
      expect.any(String),
      expect.objectContaining({ closeOnClickModal: false, closeOnPressEscape: false })
    )
    const [url, payload, config] = http.post.mock.calls[0]
    expect(url).toMatch(/^\/workflow\/api\/workflow\/jobs\/OKPacN\/run(?:\?cacheBuster=\d+)?$/)
    expect(payload).toEqual({ params: { runId: 'real-run-id' } })
    if (config) expect(config.params.cacheBuster).toEqual(expect.any(Number))
  })

  it('失败后手动重试成功才刷新，原筛选与真实runId保留', async () => {
    const wrapper = mount(entry.component, entry.props)
    await flushPromises()
    const state = stateOf(wrapper)
    if (entry.component === ExecuteHistoryDialog) {
      state.appliedKeyword = '已应用关键词'
    } else {
      state.filters.search = '已应用关键词'
    }
    const originalRow = entry.getRow(wrapper)
    await state.handleRerun(originalRow)
    const readCount = http.get.mock.calls.length
    http.post.mockResolvedValue({ data: [{ status: 'WAITING', runId: 'rerun-receipt-id' }] })
    await state.handleRerun(originalRow)
    await flushPromises()
    expect(ElMessage.success).toHaveBeenCalledExactlyOnceWith(entry.successMessage)
    expect(http.post).toHaveBeenCalledTimes(2)
    expect(http.post.mock.calls[1][1]).toEqual({ params: { runId: 'real-run-id' } })
    expect(http.get).toHaveBeenCalledTimes(readCount + 1)
    expect(http.get.mock.calls.at(-1)[1]).toMatchObject({
      params: { filter: expect.stringContaining('已应用关键词') }
    })
    expect(entry.loading(wrapper)).toBe(false)
  })

  it('取消确认不执行、不刷新或提示错误', async () => {
    const wrapper = mount(entry.component, entry.props)
    await flushPromises()
    const readCount = http.get.mock.calls.length
    ElMessageBox.confirm.mockRejectedValue('cancel')
    await stateOf(wrapper).handleRerun(entry.getRow(wrapper))
    expect(http.post).not.toHaveBeenCalled()
    expect(http.get).toHaveBeenCalledTimes(readCount)
    expect(ElMessage.success).not.toHaveBeenCalled()
    expect(ElMessage.error).not.toHaveBeenCalled()
    expect(entry.loading(wrapper)).toBe(false)
  })

  it('原脚本类型、运行中和step_聚合记录限制保持', async () => {
    const wrapper = mount(entry.component, entry.props)
    await flushPromises()
    const state = stateOf(wrapper)
    const originalRow = entry.getRow(wrapper)
    expect(state.canRerun(originalRow)).toBe(true)
    for (const status of ['WAITING', 'RUNNING', 'CALLBACK']) {
      expect(state.canRerun({ ...originalRow, status })).toBe(false)
    }
    expect(state.canRerun({ ...originalRow, job_type: 'rest', jobTypeKey: 'rest' })).toBe(false)
    const aggregateRow = { ...originalRow, runId: 'step_aggregate' }
    expect(state.canRerun(aggregateRow)).toBe(false)
    await state.handleRerun(aggregateRow)
    expect(http.post).not.toHaveBeenCalled()
    expect(ElMessageBox.confirm).not.toHaveBeenCalled()
    expect(ElMessage.warning).toHaveBeenCalledExactlyOnceWith(
      '聚合步骤视图不支持按运行 ID 重新执行，请切换到单个任务记录后重试'
    )
  })
})
