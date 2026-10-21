import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'
import { templateApi, jobApi } from '@/modules/inspection/api'
import TemplateEditDialog from '@/modules/inspection/components/template/TemplateEditDialog.vue'
import RunTemplateDialog from '@/modules/inspection/components/template/RunTemplateDialog.vue'
import ScriptSelectorDialog from '@/modules/inspection/components/template/ScriptSelectorDialog.vue'

vi.mock('@/core/api', () => ({ apiService: { get: vi.fn() } }))
vi.mock('@/modules/inspection/api', () => ({
  templateApi: { getTemplateById: vi.fn(), createTemplate: vi.fn() },
  jobApi: { runJob: vi.fn() }
}))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() }
}))
vi.mock('@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue', () => ({
  default: { template: '<div />' }
}))

const original = {
  scriptPath: 'dir/site.yml',
  scriptName: '/original/name/site.yml',
  scriptParams: '--keep original'
}
const fixture = {
  id: 'template-A',
  templateName: 'original template',
  description: 'original description',
  icon: 'fa-server',
  appletCode: 'original-app',
  auditParams: JSON.stringify([
    {
      scripts: [original],
      hosts: [{ key: 'host-A', value: 'host-A', assetType: 'linux' }],
      ruleExpressions: []
    }
  ])
}
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const Button = {
  props: ['disabled'],
  template: '<button :disabled="disabled"><slot /></button>'
}
const options = {
  global: {
    stubs: {
      ScriptSelectorDialog: false,
      'el-dialog': Slot,
      'el-button': Button,
      'el-form': { ...Slot, methods: { validate: () => Promise.resolve(), resetFields: () => {} } },
      'el-form-item': Slot,
      'el-popover': true,
      'el-table': true,
      'el-table-column': true,
      'el-tag': true,
      'el-empty': true,
      'el-pagination': true,
      'el-tooltip': true
    },
    directives: { loading: () => {} }
  }
}
const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
let wrapper
let state
const child = () => wrapper.findComponent(ScriptSelectorDialog)
const selectorState = () => child().vm.$.setupState
const confirm = async () => {
  await child()
    .findAll('button')
    .find(b => b.text() === '确定')
    .trigger('click')
  await nextTick()
}
async function open(component = TemplateEditDialog) {
  wrapper = shallowMount(component, {
    ...options,
    props: { visible: false, templateId: 'template-A' }
  })
  await wrapper.setProps({ visible: true })
  await flushPromises()
  state = wrapper.vm.$.setupState
  state.openScriptSelector()
  await flushPromises()
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  templateApi.getTemplateById.mockResolvedValue({ data: structuredClone(fixture) })
  templateApi.createTemplate.mockResolvedValue({})
  jobApi.runJob.mockResolvedValue({ data: { runId: 'run-A', status: 'WAITING' } })
  apiService.get.mockResolvedValue({
    data: [
      { name: 'site.yml', path: 'dir/site.yml', size: 1 },
      { name: 'site.yml', path: 'other/site.yml', size: 2 }
    ]
  })
})
afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
})

describe.each([
  ['编辑', TemplateEditDialog, 'handleSave'],
  ['执行前配置', RunTemplateDialog, 'handleRun']
])('%s脚本选择保留原参数', (_name, component, submit) => {
  it('真实父子选择器重开直接确认保留参数和名称，原提交载荷不变', async () => {
    await open(component)
    await confirm()
    expect(state.formData.scripts).toEqual([original])
    await state[submit]()
    const payload = (submit === 'handleSave' ? templateApi.createTemplate : jobApi.runJob).mock
      .calls[0][0]
    expect(JSON.parse(payload.auditParams)).toEqual(JSON.parse(fixture.auditParams))
    if (submit === 'handleSave') {
      expect(payload).toEqual({ ...fixture, auditParams: expect.any(String) })
    } else {
      expect(payload).toEqual({
        templateId: fixture.id,
        templateName: fixture.templateName,
        auditParams: expect.any(String)
      })
    }
    expect(apiService.get).toHaveBeenCalledWith('/gfs/api/gfs/v2/git/r/$tnt/dir/', {
      params: { useStage: true }
    })
  })

  it('取消勾选再选回同路径，参数仍保留', async () => {
    await open(component)
    const radio = child().findAll('input[type="radio"]')[0]
    await radio.trigger('click')
    await radio.trigger('click')
    await confirm()
    expect(state.formData.scripts).toEqual([original])
  })

  it('同名不同路径仍为新脚本，不串用原参数；单选替换保持', async () => {
    await open(component)
    await child().findAll('input[type="radio"]')[1].trigger('click')
    await confirm()
    expect(state.formData.scripts).toEqual([
      {
        scriptPath: 'other/site.yml',
        scriptName: 'site.yml',
        scriptParams: ''
      }
    ])
  })

  it('选择其他脚本后取消不改草稿，再打开恢复原配置', async () => {
    await open(component)
    await child().findAll('input[type="radio"]')[1].trigger('click')
    await child()
      .findAll('button')
      .find(b => b.text() === '取消')
      .trigger('click')
    expect(state.formData.scripts).toEqual([original])
    state.openScriptSelector()
    await flushPromises()
    await confirm()
    expect(state.formData.scripts).toEqual([original])
  })

  it.each(['close', 'template'])('%s使旧确认失效', async change => {
    await open(component)
    const stale = selectorState()
    if (change === 'close') state.handleClose()
    else await wrapper.setProps({ templateId: 'template-B' })
    await nextTick()
    const before = structuredClone(JSON.parse(JSON.stringify(state.formData.scripts)))
    stale.handleConfirm()
    state.handleScriptConfirm([{ scriptPath: 'wrong', scriptParams: '--wrong' }])
    expect(state.formData.scripts).toEqual(before)
    expect(state.scriptSelectorVisible).toBe(false)
  })
})

describe('选择器读取与边界', () => {
  it('读取中不能确认；失败保留已选草稿，可重试后确认', async () => {
    const read = deferred()
    apiService.get.mockReturnValueOnce(read.promise)
    await open()
    selectorState().handleConfirm()
    expect(state.scriptSelectorVisible).toBe(true)
    read.reject(new Error('read failed'))
    await flushPromises()
    selectorState().handleConfirm()
    expect(state.formData.scripts).toEqual([original])
    expect(state.scriptSelectorVisible).toBe(true)
    expect(child().find('[role="alert"]').exists()).toBe(true)
    await child()
      .findAll('button')
      .find(b => b.text() === '重试')
      .trigger('click')
    await flushPromises()
    await confirm()
    expect(state.formData.scripts).toEqual([original])
    expect(state.scriptSelectorVisible).toBe(false)
  })

  it.each(['resolve', 'reject'])('关闭重开后旧读取%s不改变新列表或加载状态', async outcome => {
    const read = deferred()
    apiService.get.mockReturnValueOnce(read.promise)
    await open()
    state.scriptSelectorVisible = false
    await nextTick()
    state.openScriptSelector()
    await flushPromises()
    const currentFiles = [...selectorState().files]
    read[outcome](
      outcome === 'resolve' ? { data: [{ name: 'stale', path: 'stale' }] } : new Error('late')
    )
    await flushPromises()
    expect(selectorState().files).toEqual(currentFiles)
    expect(selectorState().loading).toBe(false)
    expect(selectorState().loadFailed).toBe(false)
  })

  it('切目录的迟到响应不混入当前目录，原目录API及路径保持', async () => {
    await open()
    const first = deferred()
    apiService.get.mockReturnValueOnce(first.promise)
    selectorState().handleRowDblClick({ isDirectory: true, path: 'first' })
    apiService.get.mockResolvedValueOnce({ data: [{ name: 'new.yml' }] })
    selectorState().handleRowDblClick({ isDirectory: true, path: 'second' })
    await flushPromises()
    first.resolve({ data: [{ name: 'old.yml' }] })
    await flushPromises()
    expect(selectorState().files[0].path).toBe('second/new.yml')
    expect(apiService.get).toHaveBeenLastCalledWith('/gfs/api/gfs/v2/git/r/$tnt/dir/second', {
      params: { useStage: true }
    })
  })

  it('重复路径原配置不重选猜测；不操作直接确认仍保留各项参数', async () => {
    await open()
    state.scriptSelectorVisible = false
    await nextTick()
    const originals = [original, { ...original, scriptParams: '--second' }]
    state.formData.scripts = originals
    state.openScriptSelector()
    await flushPromises()
    await confirm()
    expect(state.formData.scripts).toEqual(originals)
    state.openScriptSelector()
    await flushPromises()
    selectorState().selectedFiles = []
    await child().findAll('input[type="radio"]')[0].trigger('click')
    expect(ElMessage.warning).toHaveBeenCalledOnce()
    expect(selectorState().selectedFiles).toEqual([])
    expect(state.formData.scripts).toEqual(originals)
  })

  it('卸载后未完成的读取不写回，不再发出确认', async () => {
    const read = deferred()
    apiService.get.mockReturnValueOnce(read.promise)
    await open()
    const selector = child()
    const oldState = selectorState()
    wrapper.unmount()
    read.resolve({ data: [{ name: 'late', path: 'late' }] })
    await flushPromises()
    oldState.handleConfirm()
    expect(selector.emitted('confirm')).toBeUndefined()
    expect(oldState.files).toEqual([])
  })
})
