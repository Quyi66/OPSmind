import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, reactive } from 'vue'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { useCronJobForm } from '@/modules/automation/components/job/composables/useCronJobForm'
import * as api from '@/modules/automation/api/jao'

vi.mock('@/modules/automation/api/jao', () => ({
  fetchJobsByType: vi.fn(),
  fetchJobById: vi.fn(),
  fetchCronJobById: vi.fn(),
  createCronJob: vi.fn(),
  updateCronJob: vi.fn()
}))
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), warning: vi.fn(), success: vi.fn() }
}))
vi.mock('@/utils/i18n', () => ({ translateText: value => value || '' }))

const original = { id: 'raw-script-id', type: 'script', title: '同名工具' }
const wrappers = []
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
function open(props = {}) {
  const context = reactive({ modelValue: true, editingId: null, initialJob: original, ...props })
  let form
  const wrapper = shallowMount(
    defineComponent({
      setup() {
        form = useCronJobForm(context, vi.fn())
        return () => null
      }
    })
  )
  wrappers.push(wrapper)
  form.formRef.value = { validate: vi.fn().mockResolvedValue(true), clearValidate: vi.fn() }
  return { form, context, wrapper }
}
beforeEach(() => {
  vi.resetAllMocks()
  api.fetchJobsByType.mockResolvedValue({ data: [original] })
  api.fetchJobById.mockResolvedValue({
    data: { ...original, params: [{ name: 'raw', defaultValue: '#{unchanged}' }] }
  })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => {
    if (wrapper.exists()) wrapper.unmount()
  })
  vi.restoreAllMocks()
})

describe('当前工具到原定时表单的读取边界', () => {
  it('加载中即便已有必填值也不能提交；成功仅带入ID/类型及原参数默认', async () => {
    const pending = deferred()
    api.fetchJobsByType.mockReturnValueOnce(pending.promise)
    const { form } = open()
    form.formData.value.jobDesc = '手动名称'
    form.formData.value.scheduleConf = '0 0 12 * * ?'
    await form.handleSubmit()
    expect(api.createCronJob).not.toHaveBeenCalled()
    expect(form.initializing.value).toBe(true)
    pending.resolve({ data: [original] })
    await flushPromises()
    expect(form.initializing.value).toBe(false)
    expect(form.formData.value).toMatchObject({
      jobId: original.id,
      jobType: 'script',
      jobDesc: '手动名称',
      appCode: ''
    })
    expect(form.jobParams.value[0].defaultValue).toBe('#{unchanged}')
    expect(api.createCronJob).not.toHaveBeenCalled()
  })
  it.each([
    { name: '缺少ID但同名', rows: [{ ...original, id: 'different-id' }] },
    { name: '同ID不同类型', rows: [{ ...original, type: 'rest' }] },
    { name: '需审批', rows: [{ ...original, needApprove: true }] },
    { name: '审批中', rows: [{ ...original, isApproving: true }] },
    { name: '异常列表', rows: { records: [original] } }
  ])('$name时不猜ID、不读详情、不允许保存', async ({ rows }) => {
    api.fetchJobsByType.mockResolvedValue({ data: rows })
    const { form } = open()
    await flushPromises()
    expect(form.initializationError.value).not.toBe('')
    expect(form.formData.value.jobId).toBe('')
    await form.handleSubmit()
    expect(api.fetchJobById).not.toHaveBeenCalled()
    expect(api.createCronJob).not.toHaveBeenCalled()
  })
  it.each([
    { name: '最新详情需审批', detail: { ...original, needApprove: true } },
    { name: '最新详情审批中', detail: { ...original, isApproving: true } },
    { name: '详情类型不符', detail: { ...original, type: 'rest' } },
    { name: '详情ID不符', detail: { ...original, id: 'other' } },
    { name: '详情空响应', detail: null },
    { name: '详情异常数组', detail: [] },
    { name: '详情异常字符串', detail: 'invalid' }
  ])('$name时禁快捷保存', async ({ detail }) => {
    api.fetchJobById.mockResolvedValue({ data: detail })
    const { form } = open()
    await flushPromises()
    expect(form.initializationError.value).not.toBe('')
    await form.handleSubmit()
    expect(api.createCronJob).not.toHaveBeenCalled()
  })
  it('参数失败不能当作无参数保存，重试保留手填名称/时间', async () => {
    api.fetchJobById.mockRejectedValueOnce(new Error('detail failed'))
    const { form } = open()
    form.formData.value.jobDesc = '保留名称'
    form.formData.value.scheduleConf = '0 0 12 * * ?'
    await flushPromises()
    expect(form.initializationError.value).toContain('参数')
    await form.handleSubmit()
    expect(api.createCronJob).not.toHaveBeenCalled()
    await form.initializeFromJob()
    expect(form.initializationError.value).toBe('')
    expect(form.formData.value.jobDesc).toBe('保留名称')
    expect(form.formData.value.scheduleConf).toBe('0 0 12 * * ?')
  })
  it('关闭后旧列表不接着读详情，重开另一工具只接纳新上下文', async () => {
    const pending = deferred()
    api.fetchJobsByType.mockReturnValueOnce(pending.promise)
    const { form, context } = open()
    context.modelValue = false
    await flushPromises()
    pending.resolve({ data: [original] })
    await flushPromises()
    expect(api.fetchJobById).not.toHaveBeenCalled()
    const next = { id: 'rest-id', type: 'rest' }
    api.fetchJobsByType.mockResolvedValue({ data: [next] })
    api.fetchJobById.mockResolvedValue({ data: { ...next, params: [] } })
    context.initialJob = next
    context.modelValue = true
    await flushPromises()
    expect(form.formData.value.jobId).toBe(next.id)
    expect(form.formData.value.jobType).toBe('rest')
  })
  it('换工具后的迟到详情不能覆盖新参数或结束新加载', async () => {
    const old = deferred(),
      latest = deferred()
    api.fetchJobById.mockReturnValueOnce(old.promise)
    const { form, context } = open()
    await flushPromises()
    const next = { id: 'next-id', type: 'rest' }
    api.fetchJobsByType.mockResolvedValue({ data: [next] })
    api.fetchJobById.mockReturnValueOnce(latest.promise)
    context.initialJob = next
    await flushPromises()
    old.resolve({ data: { ...original, params: [{ name: 'wrong', defaultValue: 'wrong' }] } })
    await flushPromises()
    expect(form.initializing.value).toBe(true)
    expect(form.jobParams.value).toEqual([])
    latest.resolve({ data: { ...next, params: [{ name: 'next', defaultValue: '' }] } })
    await flushPromises()
    expect(form.formData.value.jobId).toBe(next.id)
    expect(form.jobParams.value.map(param => param.name)).toEqual(['next'])
  })
  it('取消/卸载后迟到详情不复活或保存', async () => {
    const pending = deferred()
    api.fetchJobById.mockReturnValueOnce(pending.promise)
    const { form, wrapper } = open()
    await flushPromises()
    wrapper.unmount()
    pending.reject(new Error('late'))
    await flushPromises()
    expect(form.initializationError.value).toBe('')
    expect(api.createCronJob).not.toHaveBeenCalled()
  })
  it('预填完成后仍可按原表单改选另一类型/工具，不恢复旧预填', async () => {
    const { form } = open()
    await flushPromises()
    const next = { id: 'manual-rest', type: 'rest' }
    api.fetchJobsByType.mockResolvedValue({ data: [next] })
    await form.handleJobTypeChange('rest')
    form.formData.value.jobId = next.id
    api.fetchJobById.mockResolvedValue({ data: { ...next, params: [] } })
    await form.handleJobChange(next.id)
    expect(form.formData.value.jobId).toBe(next.id)
    expect(form.formData.value.jobType).toBe('rest')
    expect(form.initializationError.value).toBe('')
  })
  it('普通新建仍为空类型和原默认结构；编辑忽略快捷来源', async () => {
    const { form: empty } = open({ initialJob: null })
    await flushPromises()
    expect(empty.formData.value).toEqual({
      jobDesc: '',
      scheduleConf: '',
      triggerStatus: '1',
      jobId: '',
      jobParam: {},
      jobType: '',
      appCode: '',
      logOutput: '1',
      isEncrypt: '1'
    })
    expect(api.fetchJobsByType).not.toHaveBeenCalled()
    api.fetchCronJobById.mockResolvedValue({
      data: {
        id: 'cron-original',
        jobDesc: '编辑',
        scheduleConf: '0 0 12 * * ?',
        triggerStatus: '0',
        jobType: 'rest',
        jobId: 'existing',
        jobParam: {},
        appCode: 'keep-app',
        logOutput: false,
        isEncrypt: true
      }
    })
    api.fetchJobById.mockResolvedValue({ data: { params: [] } })
    const { form: edit } = open({ editingId: 'cron-original' })
    await flushPromises()
    expect(edit.formData.value).toMatchObject({
      jobId: 'existing',
      jobType: 'rest',
      appCode: 'keep-app',
      triggerStatus: '0'
    })
    expect(api.fetchJobsByType).toHaveBeenCalledExactlyOnceWith('rest')
  })
})
