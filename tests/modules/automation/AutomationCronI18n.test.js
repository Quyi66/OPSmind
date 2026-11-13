import { createRequire } from 'node:module'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { defineComponent, h, reactive } from 'vue'
import { setLocale } from '@/core/i18n'
import { useCronJobForm } from '@/modules/automation/components/job/composables/useCronJobForm'
import NextExecutionTimeDialog from '@/modules/automation/components/job/components/NextExecutionTimeDialog.vue'
import CronGenerator from '@/modules/automation/components/job/CronGeneratorDialog.vue'
import CronField from '@/modules/automation/components/job/CronField.vue'
import * as api from '@/modules/automation/api/jao'

const { ElForm, ElFormItem } = createRequire(import.meta.url)(
  'element-plus/lib/components/form/index.js'
)
vi.mock('@/modules/automation/api/jao', () => ({
  fetchJobsByType: vi.fn(),
  fetchJobById: vi.fn(),
  fetchCronJobById: vi.fn(),
  createCronJob: vi.fn(),
  updateCronJob: vi.fn(),
  queryNextExecutionTime: vi.fn()
}))
vi.mock('@/utils/i18n', () => ({ translateText: value => value || '' }))
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), warning: vi.fn(), success: vi.fn() }
}))
const wrappers = []
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const original = { id: 'raw-tool', type: 'script', title: '原工具名' }
const raw = value => JSON.parse(JSON.stringify(value))
async function formHarness(props = {}) {
  let form
  const context = reactive({ modelValue: false, editingId: null, initialJob: null, ...props })
  const wrapper = mount(
    defineComponent({
      setup() {
        form = useCronJobForm(context, vi.fn())
        return () =>
          h(
            ElForm,
            {
              ref: form.formRef,
              model: form.formData.value,
              rules: form.formRules.value,
              validateOnRuleChange: false
            },
            () => ['jobDesc', 'scheduleConf'].map(prop => h(ElFormItem, { prop }, () => h('input')))
          )
      }
    }),
    { global: { stubs: { 'el-form': false, 'el-form-item': false } } }
  )
  wrappers.push(wrapper)
  await flushPromises()
  return { form, wrapper }
}
async function open(component, props) {
  const wrapper = shallowMount(component, {
    props,
    global: {
      stubs: {
        ElDialog: Slot,
        ElForm: Slot,
        ElFormItem: Slot,
        ElTabs: Slot,
        ElTabPane: Slot,
        ElRadioGroup: Slot,
        ElRadio: Slot,
        ElCheckboxGroup: Slot,
        ElCheckbox: Slot
      },
      directives: { loading() {} }
    }
  })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, vm: wrapper.vm.$.setupState }
}
beforeEach(async () => {
  vi.clearAllMocks()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  api.fetchJobsByType.mockResolvedValue({ data: [original] })
  api.fetchJobById.mockResolvedValue({
    data: {
      ...original,
      params: [{ name: 'raw', label: '后端参数', defaultValue: '原值', secret: true }]
    }
  })
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.unstubAllGlobals()
  await setLocale('zh-CN', { persist: false })
})

describe('scheduled task language changes', () => {
  it('refreshes only an existing validation error and preserves cron and parameter drafts', async () => {
    const { form } = await formHarness()
    Object.assign(form.formData.value, {
      jobId: 'raw-tool',
      jobType: 'script',
      appCode: 'raw-app',
      scheduleConf: '0 0 12 * * ?',
      triggerStatus: '0',
      logOutput: '0',
      isEncrypt: '1'
    })
    form.jobParams.value = [
      {
        name: '中文参数',
        label: '后端中文',
        defaultValue: '用户填入值 {{raw}}',
        type: 'string',
        secret: true
      }
    ]
    await expect(form.formRef.value.validateField('jobDesc')).rejects.toBeTruthy()
    const fields = form.formRef.value.fields
    expect(fields[0].validateMessage).toContain('描述')
    expect(fields[1].validateState).toBe('')
    const draft = raw(form.formData.value)
    const params = raw(form.jobParams.value)
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(fields[0].validateMessage).toBe('Enter a task description')
    expect(fields[1].validateState).toBe('')
    expect(raw(form.formData.value)).toEqual(draft)
    expect(raw(form.jobParams.value)).toEqual(params)
    expect(api.fetchJobsByType).not.toHaveBeenCalled()
    form.formData.value.jobDesc = '中文调度名称'
    await form.handleSubmit()
    expect(api.createCronJob).toHaveBeenCalledExactlyOnceWith({
      ...draft,
      jobDesc: '中文调度名称',
      logOutput: true,
      isEncrypt: false,
      jobParam: { 中文参数: '用户填入值 {{raw}}' }
    })
  })

  it('updates an existing initialization error without retrying or changing a draft', async () => {
    api.fetchJobsByType.mockResolvedValue({ data: [] })
    const { form } = await formHarness({ modelValue: true, initialJob: original })
    const error = form.initializationError.value
    form.formData.value.jobDesc = '用户草稿'
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(form.initializationError.value).not.toBe(error)
    expect(form.initializationError.value).toMatch(/tool/i)
    expect(form.formData.value.jobDesc).toBe('用户草稿')
    expect(api.fetchJobsByType).toHaveBeenCalledTimes(1)
    expect(api.fetchJobById).not.toHaveBeenCalled()
    await form.handleSubmit()
    expect(api.createCronJob).not.toHaveBeenCalled()
  })

  it('keeps the Quartz expression, selected tab and field values without extra preview requests', async () => {
    const expression = '0 15 9 ? * 2-6'
    const { vm, wrapper } = await open(CronGenerator, {
      modelValue: true,
      initialValue: expression
    })
    const field = await open(CronField, {
      fieldType: 'week',
      modelValue: '2-6',
      minValue: 1,
      maxValue: 7
    })
    vm.activeTab = 'week'
    await flushPromises()
    const parts = raw(vm.cronParts)
    const events = raw(field.wrapper.emitted())
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.cronExpression).toBe(expression)
    expect(vm.activeTab).toBe('week')
    expect(raw(vm.cronParts)).toEqual(parts)
    expect(field.vm.generateValue()).toBe('2-6')
    expect(field.vm.formatValue(2)).toBe('Monday')
    expect(field.vm.getFieldUnit()).toBe('weeks')
    expect(field.wrapper.emitted()).toEqual(events)
    expect(wrapper.emitted('confirm')).toBeUndefined()
    expect(api.queryNextExecutionTime).not.toHaveBeenCalled()
  })

  it('translates a persisted preview failure without issuing another request', async () => {
    api.queryNextExecutionTime.mockRejectedValue(new Error('backend unavailable'))
    const { vm } = await open(NextExecutionTimeDialog, {
      modelValue: true,
      scheduleConf: '0 0 12 * * ?'
    })
    const error = vm.error
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.error).not.toBe(error)
    expect(vm.error).toMatch(/retry/i)
    expect(api.queryNextExecutionTime).toHaveBeenCalledExactlyOnceWith('0 0 12 * * ?')
  })
})
