import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { ElMessage, ElTable, ElTableColumn, ElCheckbox } from 'element-plus'
import CreateJobDialog from '@/modules/automation/components/job/JobListView/CreateJobDialog.vue'
import FileSelectorDialog from '@/modules/automation/components/job/JobListView/FileSelectorDialog.vue'
import * as jao from '@/modules/automation/api/jao'
import * as gfs from '@/modules/automation/api/gfs'

vi.mock('element-plus', async importOriginal => ({
  ...(await importOriginal()),
  ElMessage: { warning: vi.fn(), error: vi.fn(), success: vi.fn(), info: vi.fn() }
}))
vi.mock('@/modules/automation/api/jao', () => ({
  getJobDetail: vi.fn(),
  getScriptPath: vi.fn(),
  createJob: vi.fn(),
  updateJob: vi.fn(),
  executeJob: vi.fn()
}))
vi.mock('@/modules/automation/api/gfs', () => ({ listFiles: vi.fn(), checkFileExist: vi.fn() }))
vi.mock('@/modules/automation/components/job/JobListView/CommandSelectorDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/automation/components/job/JobListView/FileContentViewer.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/utils/i18n', () => ({ translateText: value => value || '' }))

const slots = { template: '<div><slot /><slot name="footer" /></div>' }
// Match destroy-on-close so each actual table starts with an empty selection store.
const dialog = {
  props: ['modelValue'],
  template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>'
}
const options = {
  global: {
    plugins: [
      {
        install(app) {
          app.component('ElTable', ElTable)
          app.component('ElTableColumn', ElTableColumn)
          app.component('ElCheckbox', ElCheckbox)
        }
      }
    ],
    stubs: {
      ElDrawer: slots,
      ElScrollbar: slots,
      'el-dialog': dialog,
      'el-form': slots,
      'el-form-item': slots,
      ElTable: false,
      ElTableColumn: false,
      FileSelectorDialog: false,
      ElRadioButton: true,
      ElRadioGroup: slots,
      ElIcon: slots,
      ElInputNumber: true,
      ElOption: true,
      ElSelect: slots,
      ElCollapseItem: slots,
      ElCollapse: slots,
      ElCheckbox: false,
      ElBreadcrumbItem: slots,
      ElBreadcrumb: slots,
      ElRadio: true,
      ElEmpty: true,
      ElTag: slots
    },
    directives: { loading: () => {} }
  }
}
const wrappers = []
const raw = value => JSON.parse(JSON.stringify(value))
const a = { location: 'a.sh', argline: '--scope a', tag: 'tag-a' }
const b = { location: 'b.sh', argline: '--scope b', tag: 'tag-b' }
const row = path => ({ path, name: path.split('/').at(-1), directory: false })
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
async function mountJob(scripts = [a], props = {}, realTable = false) {
  const wrapper = (realTable ? mount : shallowMount)(CreateJobDialog, {
    ...options,
    props: { modelValue: true, jobType: 'script', ...props }
  })
  wrappers.push(wrapper)
  await flushPromises()
  const state = wrapper.vm.$.setupState
  state.job.title = 'draft'
  state.jobConfig.tasks[0].scripts = raw(scripts)
  return { wrapper, state }
}
async function open(state) {
  state.openFileSelector(0)
  await flushPromises()
  return state.fileSelectorListeners.confirm
}
async function choose(state, paths) {
  const confirm = await open(state)
  confirm(paths.map(row))
  await flushPromises()
}
async function mountFiles(props = {}) {
  const wrapper = mount(FileSelectorDialog, { ...options, props: { modelValue: false, ...props } })
  wrappers.push(wrapper)
  await wrapper.setProps({ modelValue: true })
  await flushPromises()
  return { wrapper, state: wrapper.vm.$.setupState }
}
beforeEach(() => {
  vi.resetAllMocks()
  // resetAllMocks resets tests/setup.js's mocked observer implementation.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  jao.getScriptPath.mockResolvedValue([])
  gfs.listFiles.mockImplementation(async () => ['a.sh', 'b.sh', 'c.sh'].map(row))
  gfs.checkFileExist.mockResolvedValue({ data: {} })
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.unstubAllGlobals()
})

describe('script selection retains the current task draft', () => {
  it('uses the real file selector and Element Plus table to re-confirm and add/remove files', async () => {
    const { wrapper, state } = await mountJob([a, b], {}, true)
    await open(state)
    let selector = wrapper.findComponent(FileSelectorDialog).vm.$.setupState
    expect(selector.tableRef.getSelectionRows().map(file => file.path)).toEqual(['a.sh', 'b.sh'])
    selector.handleConfirm()
    await flushPromises()
    expect(raw(state.jobConfig.tasks[0].scripts)).toEqual([a, b])
    await open(state)
    selector = wrapper.findComponent(FileSelectorDialog).vm.$.setupState
    // Actual checkbox change, not a synthetic parent confirm event.
    const cRow = wrapper
      .findComponent(FileSelectorDialog)
      .findAll('.el-table__body tr')
      .find(tr => tr.text().includes('c.sh'))
    await cRow.find('input[type="checkbox"]').setValue(true)
    selector.handleConfirm()
    await flushPromises()
    expect(raw(state.jobConfig.tasks[0].scripts)).toEqual([
      a,
      b,
      { location: 'c.sh', argline: '', tag: '' }
    ])
    await open(state)
    selector = wrapper.findComponent(FileSelectorDialog).vm.$.setupState
    const aRow = wrapper
      .findComponent(FileSelectorDialog)
      .findAll('.el-table__body tr')
      .find(tr => tr.text().includes('a.sh'))
    await aRow.find('input[type="checkbox"]').setValue(false)
    selector.handleConfirm()
    await flushPromises()
    expect(raw(state.jobConfig.tasks[0].scripts)).toEqual([
      b,
      { location: 'c.sh', argline: '', tag: '' }
    ])
    expect(gfs.listFiles).toHaveBeenCalledWith(null, '', 'git', { includeStage: true })
    expect(jao.createJob).not.toHaveBeenCalled()
    expect(jao.updateJob).not.toHaveBeenCalled()
    expect(jao.executeJob).not.toHaveBeenCalled()
  })

  it('matches exact paths, keeps confirm order and retains hidden fields and empty/falsy values', async () => {
    const entries = [
      { location: 'one/run.sh', argline: null, tag: false, hidden: { n: 0, empty: '' } },
      { location: 'two/run.sh', argline: 0, tag: '', legacy: [null, false] },
      { location: 'empty.sh' }
    ]
    const { state } = await mountJob(entries)
    await choose(state, ['two/run.sh', 'one/run.sh', 'empty.sh', 'three/run.sh'])
    expect(raw(state.jobConfig.tasks[0].scripts)).toEqual([
      entries[1],
      entries[0],
      entries[2],
      { location: 'three/run.sh', argline: '', tag: '' }
    ])
    expect(gfs.checkFileExist).toHaveBeenCalledWith([
      'two/run.sh',
      'one/run.sh',
      'empty.sh',
      'three/run.sh'
    ])
  })

  it('keeps original new-file config/tag defaults and removes only explicitly omitted entries', async () => {
    const { state } = await mountJob([a, b])
    const confirm = await open(state)
    confirm([
      { path: 'b.sh', config: 'ignored', tag: 'ignored' },
      { path: 'c.sh', config: '--new', tag: 'new' }
    ])
    expect(raw(state.jobConfig.tasks[0].scripts)).toEqual([
      b,
      { location: 'c.sh', argline: '--new', tag: 'new' }
    ])
  })

  it('does not pick a configuration when the same old path is ambiguous', async () => {
    const entries = [a, { ...a, argline: '--another' }, b]
    const { state } = await mountJob(entries)
    await choose(state, ['a.sh', 'c.sh'])
    expect(raw(state.jobConfig.tasks[0].scripts)).toEqual(entries)
    expect(ElMessage.warning).toHaveBeenCalledWith(expect.stringContaining('同一路径'))
    expect(gfs.checkFileExist).not.toHaveBeenCalled()
    // Explicitly removing the ambiguous path remains possible.
    await choose(state, ['b.sh'])
    expect(raw(state.jobConfig.tasks[0].scripts)).toEqual([b])
  })

  it('cancel changes neither the task nor persistence and ignores an old confirmation', async () => {
    const { state } = await mountJob([a])
    const oldConfirm = await open(state)
    state.showFileSelector = false
    oldConfirm([row('c.sh')])
    await open(state)
    oldConfirm([row('b.sh')])
    expect(raw(state.jobConfig.tasks[0].scripts)).toEqual([a])
    expect(gfs.checkFileExist).not.toHaveBeenCalled()
    expect(jao.createJob).not.toHaveBeenCalled()
  })

  it('retains configurations only within the selected task and rejects stale task callbacks', async () => {
    const { state } = await mountJob([a])
    state.jobConfig.tasks.push({
      ...state.jobConfig.tasks[0],
      scripts: [{ ...a, argline: '--task-two' }]
    })
    const oldConfirm = await open(state)
    state.openFileSelector(1)
    const currentConfirm = state.fileSelectorListeners.confirm
    oldConfirm([row('c.sh')])
    currentConfirm([row('a.sh'), row('b.sh')])
    expect(raw(state.jobConfig.tasks[0].scripts)).toEqual([a])
    expect(raw(state.jobConfig.tasks[1].scripts)).toEqual([
      { ...a, argline: '--task-two' },
      { location: 'b.sh', argline: '', tag: '' }
    ])
  })

  it.each(['jobId', 'jobType', 'viewMode', 'modelValue', 'task', 'type'])(
    'isolates old confirmation after %s changes',
    async key => {
      const { wrapper, state } = await mountJob([a])
      const confirm = await open(state)
      if (key === 'task') state.jobConfig.tasks[0] = { ...state.jobConfig.tasks[0], scripts: [b] }
      else if (key === 'type') state.job.type = 'rest'
      else
        await wrapper.setProps({
          [key]: { jobId: 'other', jobType: 'rest', viewMode: true, modelValue: false }[key]
        })
      const before = raw(state.jobConfig.tasks)
      confirm([row('c.sh')])
      expect(raw(state.jobConfig.tasks)).toEqual(before)
      expect(gfs.checkFileExist).not.toHaveBeenCalled()
      expect(state.showFileSelector).toBe(false)
    }
  )

  it('only manual save uses the original create payload, defaults, association and approvals', async () => {
    const { state } = await mountJob([a], { appletCode: 'raw-scope' })
    state.job.needApprove = true
    state.job.needReview = true
    state.job.needDelayed = true
    await choose(state, ['a.sh', 'c.sh'])
    expect(jao.createJob).not.toHaveBeenCalled()
    await state.save()
    expect(jao.createJob).toHaveBeenCalledExactlyOnceWith({
      title: 'draft',
      type: 'script',
      appletCode: 'raw-scope',
      description: '',
      params: [],
      needApprove: true,
      needReview: true,
      needDelayed: true,
      configJson: JSON.stringify({
        audit: { enabled: false, module: '', action: '' },
        scriptType: 'playbook',
        callback: '',
        taskTimeout: -1,
        verbosity: 0,
        tasks: [
          {
            scripts: [a, { location: 'c.sh', argline: '', tag: '' }],
            hostsMode: 'param',
            hostsParam: 'hosts',
            hosts: []
          }
        ]
      })
    })
    expect(jao.executeJob).not.toHaveBeenCalled()
  })

  it('manual edit save keeps raw script fields, target configuration and the original job ID', async () => {
    const scripts = [{ ...a, hidden: { empty: '', nil: null, zero: 0 } }]
    const config = {
      audit: { enabled: true, module: 'original', action: 'run' },
      scriptType: 'script',
      callback: null,
      taskTimeout: 0,
      verbosity: 2,
      tasks: [{ scripts, hostsMode: 'param', hostsParam: 'raw_targets', hosts: [] }]
    }
    const detail = {
      id: 'original-tool-id',
      title: 'original',
      type: 'script',
      appletCode: 'original-app',
      description: '',
      params: [],
      needApprove: true,
      needReview: true,
      needDelayed: false,
      configJson: JSON.stringify(config)
    }
    jao.getJobDetail.mockResolvedValue({ data: detail })
    const { state } = await mountJob(scripts, { jobId: detail.id })
    // Existing loader normalizes callback null to ''; this change must not alter that contract.
    state.job.title = detail.title
    await choose(state, ['a.sh'])
    await state.save()
    expect(jao.updateJob).toHaveBeenCalledExactlyOnceWith(detail.id, {
      ...detail,
      configJson: JSON.stringify({ ...config, callback: '' })
    })
    expect(jao.createJob).not.toHaveBeenCalled()
  })
})

describe('late file queries cannot replace the current draft state', () => {
  it('keeps the original single-select file mapping and ignores cancelled confirmation', async () => {
    gfs.listFiles.mockResolvedValue([{ ...row('a.sh'), config: '--original-default' }])
    const { wrapper, state } = await mountFiles({
      multipleSelect: false,
      preSelected: [row('a.sh')]
    })
    state.handleConfirm()
    expect(wrapper.emitted('confirm')).toEqual([
      [[{ path: 'a.sh', name: 'a.sh', config: '--original-default', tag: '' }]]
    ])
    await wrapper.setProps({ modelValue: false })
    state.handleConfirm()
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('accepts the current existence check after the picker closes but ignores an older check', async () => {
    const old = deferred(),
      current = deferred()
    gfs.checkFileExist.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    const { state } = await mountJob([a])
    await choose(state, ['a.sh'])
    state.showFileSelector = false
    await choose(state, ['a.sh', 'c.sh'])
    state.showFileSelector = false
    current.resolve({ data: { 'a.sh': true, 'c.sh': true } })
    await flushPromises()
    old.resolve({ data: { 'a.sh': false } })
    await flushPromises()
    expect(raw(state.fileStatusMap)).toEqual({ 'a.sh': true, 'c.sh': true })
  })

  it.each(['close', 'task', 'unmount'])('ignores existence checks after %s', async change => {
    const pending = deferred()
    gfs.checkFileExist.mockReturnValue(pending.promise)
    const { wrapper, state } = await mountJob([a])
    await choose(state, ['a.sh'])
    if (change === 'close') state.handleClose()
    if (change === 'task') state.jobConfig.tasks[0] = { ...state.jobConfig.tasks[0], scripts: [b] }
    if (change === 'unmount') wrapper.unmount()
    pending.resolve({ data: { wrong: true } })
    await flushPromises()
    expect(raw(state.fileStatusMap)).toEqual({})
  })

  it('ignores a directory response after cancel and reopen, including stale errors/loading', async () => {
    const old = deferred(),
      current = deferred()
    gfs.listFiles.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    const { wrapper, state } = await mountFiles()
    await wrapper.setProps({ modelValue: false })
    state.handleConfirm()
    expect(wrapper.emitted('confirm')).toBeUndefined()
    await wrapper.setProps({ modelValue: true })
    old.reject(new Error('old directory'))
    await flushPromises()
    expect(state.loading).toBe(true)
    expect(ElMessage.error).not.toHaveBeenCalled()
    current.resolve([row('current.sh')])
    await flushPromises()
    expect(state.fileList.map(file => file.path)).toEqual(['current.sh'])
    expect(state.loading).toBe(false)
  })

  it('only restores selections from the latest directory and does not confirm while loading', async () => {
    const old = deferred(),
      current = deferred()
    gfs.listFiles.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    const { wrapper, state } = await mountFiles({ preSelected: [row('a.sh')] })
    state.handleConfirm()
    expect(wrapper.emitted('confirm')).toBeUndefined()
    state.navigateTo('next')
    current.resolve([row('next/b.sh')])
    await flushPromises()
    old.resolve([row('a.sh')])
    await flushPromises()
    expect(state.fileList.map(file => file.path)).toEqual(['', 'next/b.sh'])
    expect(state.tableRef.getSelectionRows()).toEqual([])
    expect(gfs.listFiles).toHaveBeenLastCalledWith(null, 'next', 'git', { includeStage: true })
  })

  it('does not restore a queued table selection after cancel', async () => {
    const { wrapper, state } = await mountFiles({ preSelected: [row('a.sh')] })
    state.refresh()
    await wrapper.setProps({ modelValue: false })
    await nextTick()
    await flushPromises()
    expect(state.loading).toBe(false)
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('ignores a late directory response after unmount', async () => {
    const pending = deferred()
    gfs.listFiles.mockReturnValue(pending.promise)
    const { wrapper, state } = await mountFiles()
    wrapper.unmount()
    pending.resolve([row('late.sh')])
    await flushPromises()
    expect(state.fileList).toEqual([])
  })
})
