import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import * as api from '@/modules/automation/api/jao'
import { ElMessage } from 'element-plus'
import dictionary from '../../../public/i18n/zh-cn/jao.json'

vi.mock('@/modules/automation/api/jao', () => ({ getJobDetail: vi.fn(), executeJob: vi.fn() }))
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn(), warning: vi.fn() }
}))

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

const params = Object.freeze([
  Object.freeze({
    name: 'scope',
    label: '#{jao.title}',
    description: '说明：#{jao.title}',
    defaultValue: '#{raw.value}'
  }),
  Object.freeze({ name: 'zero', label: '', defaultValue: 0 })
])
const detail = { data: { type: 'rest', params, configJson: '{"original":true}' } }
let wrapper, translations, i18n
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  translations = deferred()
  vi.stubGlobal(
    'fetch',
    vi.fn(async url => {
      if (!String(url).endsWith('/jao.json')) return { ok: false }
      await translations.promise
      return { ok: true, json: async () => dictionary }
    })
  )
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  translations.resolve()
  vi.unstubAllGlobals()
})

async function open() {
  const { default: component } =
    await import('@/modules/automation/components/job/JobListView/ExecuteJobDialog.vue')
  i18n = await import('@/utils/i18n')
  const slots = { template: '<div><slot /><slot name="footer" /></div>' }
  wrapper = shallowMount(component, {
    props: { visible: true, jobId: 'tool-a' },
    global: {
      stubs: {
        'el-dialog': slots,
        'el-form': slots,
        'el-form-item': slots,
        'el-button': true,
        'el-input': true
      },
      directives: { loading: () => {} }
    }
  })
  return wrapper.vm.$.setupState
}

function expectForm(state) {
  expect(state.formSchema[0]).toMatchObject({
    name: 'scope',
    label: '一键作业',
    description: '说明：一键作业',
    defaultValue: '#{raw.value}'
  })
  expect(state.formSchema[1]).toMatchObject({ name: 'zero', label: 'zero', defaultValue: 0 })
  expect(state.formValues).toEqual({ scope: '#{raw.value}', zero: 0 })
  expect(state.buildPayload()).toEqual({
    jobId: 'tool-a',
    type: 'rest',
    configJson: '{"original":true}',
    options: { secretParams: [], params: { scope: '#{raw.value}', zero: 0 } }
  })
  expect(params[0].label).toBe('#{jao.title}')
  expect(params[0].description).toBe('说明：#{jao.title}')
}

describe('执行参数真实字典与详情竞态', () => {
  it('详情先到时等待字典；原参数、默认值、提交值保持', async () => {
    api.getJobDetail.mockResolvedValue(detail)
    const state = await open()
    await flushPromises()
    expect(state.formSchema).toEqual([])
    expect(state.detailLoading).toBe(true)
    await state.handleSubmit()
    expect(api.executeJob).not.toHaveBeenCalled()
    translations.resolve()
    await i18n.initTranslations()
    await flushPromises()
    expectForm(state)
    expect(state.detailLoading).toBe(false)
  })

  it('字典先到时等待详情再初始化', async () => {
    const pending = deferred()
    api.getJobDetail.mockReturnValue(pending.promise)
    const state = await open()
    translations.resolve()
    await i18n.initTranslations()
    await flushPromises()
    expect(state.formSchema).toEqual([])
    pending.resolve(detail)
    await flushPromises()
    expectForm(state)
  })

  it.each(['props', 'close', 'unmount'])('字典未就绪时 %s 关闭，不被迟到结果回填', async mode => {
    api.getJobDetail.mockResolvedValue(detail)
    const state = await open()
    await flushPromises()
    if (mode === 'props') await wrapper.setProps({ visible: false })
    if (mode === 'close') state.handleClose()
    if (mode === 'unmount') {
      wrapper.unmount()
      wrapper = undefined
    }
    translations.resolve()
    await i18n.initTranslations()
    await flushPromises()
    expect(state.formSchema).toEqual([])
    expect(state.jobDetail).toEqual({})
    expect(state.lastLoadedJobId).toBe('')
    expect(ElMessage.error).not.toHaveBeenCalled()
  })

  it.each(['resolve', 'reject'])('切换工具后旧详情 %s 不覆盖当前表单或报错', async outcome => {
    const pending = deferred()
    api.getJobDetail.mockReturnValueOnce(pending.promise).mockResolvedValueOnce({
      data: { type: 'cmd', params: [{ name: 'new', label: '#{jao.title}', defaultValue: 'B' }] }
    })
    const state = await open()
    await wrapper.setProps({ jobId: 'tool-b' })
    translations.resolve()
    await i18n.initTranslations()
    await flushPromises()
    expect(state.formValues).toEqual({ new: 'B' })
    expect(state.formSchema[0].label).toBe('一键作业')
    pending[outcome](outcome === 'resolve' ? detail : new Error('过期错误'))
    await flushPromises()
    expect(state.formValues).toEqual({ new: 'B' })
    expect(state.lastLoadedJobId).toBe('tool-b')
    expect(state.buildPayload().jobId).toBe('tool-b')
    expect(state.detailLoading).toBe(false)
    expect(ElMessage.error).not.toHaveBeenCalled()
  })
})
