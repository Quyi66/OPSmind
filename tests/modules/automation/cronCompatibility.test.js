import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, reactive } from 'vue'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { useCronJobForm } from '@/modules/automation/components/job/composables/useCronJobForm'
import { useCronJobActions } from '@/modules/automation/components/job/composables/useCronJobActions'
import * as api from '@/modules/automation/api/jao'
import { ElMessageBox } from 'element-plus'

vi.mock('@/modules/automation/api/jao', () => ({
  fetchCronJobById: vi.fn(),
  fetchJobsByType: vi.fn(),
  fetchCacJobs: vi.fn(),
  fetchCmdJobs: vi.fn(),
  fetchFlowJobs: vi.fn(),
  fetchJobById: vi.fn(),
  createCronJob: vi.fn(),
  updateCronJob: vi.fn(),
  queryNextExecutionTime: vi.fn(),
  stopCronJob: vi.fn(),
  startCronJob: vi.fn(),
  batchToggleCronJobs: vi.fn(),
  executeCronJob: vi.fn(),
  copyCronJob: vi.fn(),
  deleteCronJob: vi.fn()
}))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn() }
}))
vi.mock('@/utils/i18n', () => ({ translateText: value => value || '' }))

let wrapper
beforeEach(() => {
  vi.resetAllMocks()
  api.fetchJobsByType.mockResolvedValue({ data: [] })
  api.fetchCacJobs.mockResolvedValue({ data: [] })
  api.fetchCmdJobs.mockResolvedValue({ data: [] })
  api.fetchFlowJobs.mockResolvedValue({ data: [] })
  api.fetchJobById.mockResolvedValue({ data: { params: [] } })
  ElMessageBox.confirm.mockResolvedValue('confirm')
})
afterEach(() => wrapper?.unmount())

function openForm(props) {
  let form
  wrapper = shallowMount(
    defineComponent({
      setup() {
        form = useCronJobForm(reactive(props), vi.fn())
        return () => null
      }
    })
  )
  form.formRef.value = { validate: vi.fn().mockResolvedValue(true) }
  return form
}

describe('定时任务去除应用展示后的接口兼容', () => {
  it.each(['script', 'rest', 'audit', 'cac', 'cmd', 'flows'])(
    '编辑 %s 保留旧关联、目标、布尔值和参数结构',
    async type => {
      const isMultiple = ['audit', 'cac', 'cmd', 'flows'].includes(type)
      const fixture = {
        id: 42,
        appCode: 'legacy-app',
        jobType: type,
        jobDesc: '定时检查',
        scheduleConf: '0 0 12 * * ?',
        triggerStatus: '0',
        jobId: isMultiple ? 'a,b' : 'a',
        logOutput: true,
        isEncrypt: false,
        jobParam:
          type === 'cmd'
            ? { hosts: [{ key: 'host-1', value: 'server-1', assetType: 'linux' }] }
            : {}
      }
      api.fetchCronJobById.mockResolvedValue({ data: fixture })
      const form = openForm({ editingId: 42, modelValue: true })
      await flushPromises()
      await form.handleSubmit()
      expect(api.updateCronJob).toHaveBeenCalledWith({
        ...fixture,
        jobType: type === 'cac' ? 'audit' : type,
        jobParam: ['audit', 'cac'].includes(type) ? { annex_name: '' } : fixture.jobParam
      })
      expect(api.createCronJob).not.toHaveBeenCalled()
    }
  )

  it('新增沿用原来的空应用默认值，不根据工具归属推断或改写参数', async () => {
    const form = openForm({ editingId: null, modelValue: true })
    Object.assign(form.formData.value, {
      jobDesc: '巡检',
      jobType: 'script',
      jobId: 'a',
      scheduleConf: '0 0 12 * * ?'
    })
    await form.handleSubmit()
    expect(api.createCronJob).toHaveBeenCalledWith({
      jobDesc: '巡检',
      jobType: 'script',
      jobId: 'a',
      scheduleConf: '0 0 12 * * ?',
      triggerStatus: '1',
      appCode: '',
      logOutput: false,
      isEncrypt: false,
      jobParam: {}
    })
  })
})

describe('操作确认身份与真实标识调用接口', () => {
  it('批量启停保留后端要求的当前状态字典', async () => {
    const actions = useCronJobActions(vi.fn())
    await actions.handleBatchToggle([
      { id: 'task-a', triggerStatus: '1' },
      { id: 'task-b', triggerStatus: '0' }
    ])
    expect(api.batchToggleCronJobs).toHaveBeenCalledWith({ 'task-a': '1', 'task-b': '0' })
    expect(ElMessageBox.confirm.mock.calls[0][0]).toContain('task-a')
  })

  it('执行、复制和删除继续传任务 ID，确认提示使用名称', async () => {
    const actions = useCronJobActions(vi.fn())
    const row = { id: 'internal-id', jobDesc: '每日检查' }
    await actions.handleExecuteOnce(row)
    await actions.handleCopy(row)
    await actions.handleDelete(row)
    for (const method of [api.executeCronJob, api.copyCronJob, api.deleteCronJob]) {
      expect(method).toHaveBeenCalledWith('internal-id')
    }
    expect(ElMessageBox.confirm.mock.calls[0][0]).toContain('每日检查')
    expect(ElMessageBox.confirm.mock.calls[0][0]).toContain('internal-id')
  })
})
