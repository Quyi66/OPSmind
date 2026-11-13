import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'
import RunDialog from '@/modules/automation/components/command/dialogs/RunCommandDialog.vue'
import EditDialog from '@/modules/automation/components/command/dialogs/CommandEditDialog.vue'
import ApproveDialog from '@/modules/automation/components/command/dialogs/CommandApproveDialog.vue'
import ConsolePage from '@/modules/automation/views/command/CommandConsolePage.vue'
import Center from '@/modules/automation/views/CommandCenterModule.vue'
import * as api from '@/modules/automation/api/command'
import {
  buildCommandJobConfig,
  buildDynamicCommandRunRequest
} from '@/modules/automation/components/command/commandJob.utils'

const post = vi.hoisted(() => vi.fn())
vi.mock('@/core/api', () => ({ useApi: () => ({ post }) }))
vi.mock('@/modules/automation/api/command', async original => ({
  ...(await original()),
  saveCommand: vi.fn(),
  findCommandById: vi.fn(),
  saveJob: vi.fn(),
  runJobByRequest: vi.fn(),
  approveCommand: vi.fn()
}))
vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'cmd-list', query: {} }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() })
}))
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn(), warning: vi.fn() }
}))
vi.mock('@/modules/automation/views/command/CommandListPage.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/automation/views/command/CommandJobPage.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock(
  '@/modules/automation/components/job/schedule/components/AcmDeviceSelectorDialog.vue',
  () => ({ default: { template: '<div />' } })
)
const wrappers = []
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const raw = value => JSON.parse(JSON.stringify(value))
const command = {
  id: 'cmd-id',
  name: '中文命令名',
  command: 'echo 原始中文',
  type: 'shell',
  status: 0
}
const hosts = [{ key: 'host-id', value: '原始主机', assetType: 'linux' }]
async function open(component, props = {}) {
  const wrapper = shallowMount(component, {
    props,
    global: {
      stubs: {
        ElDialog: Slot,
        ElForm: Slot,
        ElFormItem: Slot,
        ElCollapse: Slot,
        ElCollapseItem: Slot,
        ElTabs: Slot,
        ElTabPane: Slot,
        ElTable: true,
        ElTableColumn: true,
        ElTag: Slot
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
  api.findCommandById.mockResolvedValue({ data: { ...command } })
  api.saveJob.mockResolvedValue({ data: { id: 'saved-id' } })
  api.runJobByRequest.mockResolvedValue({ data: { runId: 'run-id' } })
  post.mockResolvedValue({ data: {} })
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  await setLocale('zh-CN', { persist: false })
})

describe('command workflows across languages', () => {
  it('preserves the command tool draft and saves original command and host identifiers', async () => {
    const { wrapper, vm } = await open(RunDialog, { visible: false, mode: 'createJob', command })
    await wrapper.setProps({ visible: true })
    vm.formData.title = '自定义工具中文标题'
    vm.formData.description = '自定义描述'
    vm.formData.hosts = hosts
    vm.formRef = { validate: vi.fn().mockResolvedValue(true), clearValidate: vi.fn() }
    const draft = raw(vm.formData)
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.dialogTitle).toBe('Create command tool')
    expect(raw(vm.formData)).toEqual(draft)
    expect(api.saveJob).not.toHaveBeenCalled()
    await vm.handleSaveJob()
    expect(api.saveJob).toHaveBeenCalledExactlyOnceWith({
      title: draft.title,
      description: draft.description,
      type: 'command',
      configJson: buildCommandJobConfig([command], hosts, 'linux')
    })
  })

  it('preserves selected execution hosts and sends the original dynamic run request', async () => {
    const { vm } = await open(RunDialog, { visible: true, command: [command] })
    vm.formData.hosts = hosts
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.executionDescription).toContain('中文命令名')
    expect(vm.executionDescription).toContain('Run command')
    expect(api.runJobByRequest).not.toHaveBeenCalled()
    await vm.handleRunCommand()
    expect(api.runJobByRequest).toHaveBeenCalledExactlyOnceWith(
      buildDynamicCommandRunRequest([command], hosts, 'linux')
    )
  })

  it('keeps command edits and the published source when submitting a review', async () => {
    const { wrapper, vm } = await open(EditDialog, { visible: false, mode: 'edit', command })
    await wrapper.setProps({ visible: true })
    await flushPromises()
    vm.formData.command = 'echo 中文草稿 {{raw}}'
    vm.formData.description = '正在修改的中文'
    vm.formRef = { validate: vi.fn().mockResolvedValue(true), clearValidate: vi.fn() }
    const draft = raw(vm.formData)
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.dialogTitle).toBe('Edit command')
    expect(vm.formRules.name[0].message).toBe('Enter a command name')
    expect(vm.getStatusText(0)).toBe('Published')
    expect(raw(vm.formData)).toEqual(draft)
    expect(api.findCommandById).toHaveBeenCalledTimes(1)
    await vm.handleSave()
    expect(api.saveCommand).toHaveBeenCalledExactlyOnceWith({
      ...draft,
      command: command.command,
      unapprovedCommand: draft.command,
      status: 1
    })
  })

  it('keeps a batch review reason and raw command bodies', async () => {
    const { vm } = await open(ApproveDialog, { visible: true, mode: 'batch', commands: [command] })
    vm.approveReason = '用户输入拒绝原因'
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.approveReason).toBe('用户输入拒绝原因')
    expect(api.approveCommand).not.toHaveBeenCalled()
    await vm.handleApprove(false)
    expect(api.approveCommand).toHaveBeenCalledExactlyOnceWith([
      { ...command, status: 2, unapprovedReason: '用户输入拒绝原因' }
    ])
  })

  it('keeps console source, syntax and hosts until explicit execution', async () => {
    const { vm } = await open(ConsolePage)
    vm.command = 'echo 中文\necho {{raw}}'
    vm.commandType = 'shell'
    vm.hosts = hosts
    vm.updateLineCount()
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.command).toBe('echo 中文\necho {{raw}}')
    expect(vm.lineCount).toBe(2)
    expect(post).not.toHaveBeenCalled()
    await vm.executeCommand()
    expect(post).toHaveBeenCalledExactlyOnceWith('/workflow/api/workflow/console-log/run', {
      commands: [],
      consoleCmd: [{ name: 'console', cmd: 'echo 中文\necho {{raw}}', type: 'shell' }],
      hosts
    })
  })

  it('updates an open batch result title without binding it to a later command selection', async () => {
    const { vm } = await open(Center)
    vm.handleRunCommand([command, { ...command, id: 'cmd-2' }])
    vm.handleRunSuccess({ runId: 'raw-run' })
    vm.handleRunCommand({ ...command, name: '后来选中的命令' })
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.commandResultMeta.jobTitle).toBe('Batch commands (2)')
    expect(vm.commandResultMeta.runId).toBe('raw-run')
    expect(vm.workspaceTabs[0].label).toBe('Command list')
  })
})
