import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import Panel from '@/modules/asset/components/asset-info/AgentBatchPanel.vue'
import CreateDialog from '@/modules/asset/components/asset-info/AgentBatchCreateDialog.vue'
import {
  buildBatchCredentials,
  createBatchCredentials,
  getBatchHostOs
} from '@/modules/asset/utils/agentBatch'

const api = vi.hoisted(() => ({
  createBatch: vi.fn(),
  getBatches: vi.fn(),
  getBatch: vi.fn(),
  retryBatch: vi.fn(),
  getBatchScript: vi.fn(),
  closeBatch: vi.fn(),
  getAllGroups: vi.fn()
}))
const messages = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), confirm: vi.fn() }))
const auth = vi.hoisted(() => ({ allowed: true }))
vi.mock('@/modules/asset/api', async () => ({
  agentApi: api,
  dataManageApi: api,
  getAgentErrorMessage: (await import('@/modules/asset/utils/agentErrors')).getAgentErrorMessage
}))
vi.mock('@/core/auth', () => ({
  authService: { hasPermission: () => auth.allowed, hasRole: () => false }
}))
vi.mock('element-plus', () => ({
  ElMessage: messages,
  ElMessageBox: { confirm: messages.confirm }
}))

const stubs = Object.fromEntries(
  [
    'ElDialog',
    'ElButton',
    'ElAlert',
    'ElTable',
    'ElTableColumn',
    'ElTag',
    'ElProgress',
    'ElSelect',
    'ElOption',
    'ElDropdown',
    'ElDropdownMenu',
    'ElDropdownItem',
    'ElForm',
    'ElFormItem',
    'ElInput',
    'ElRadio',
    'ElRadioGroup',
    'ElSwitch',
    'ElInputNumber'
  ].map(name => [name, true])
)
const wrappers = []
stubs.ElTable = { template: '<div />', methods: { clearSelection() {} } }
const state = wrapper => wrapper.vm.$.setupState
const item = (id, status, targetOs = 'linux') => ({
  id,
  status,
  targetOs,
  ip: '10.0.0.1',
  hostname: id,
  channel: 'push'
})
function batch(counts = {}, items = [], id = 'b1') {
  return {
    batch: { id, name: id, status: 'open', expiresAt: '2026-11-17 12:00:00', keepCredentials: 0 },
    counts: { total: items.length, ...counts },
    scriptOs: ['linux', 'windows'],
    items
  }
}
function deferred() {
  let resolve
  const promise = new Promise(done => {
    resolve = done
  })
  return { promise, resolve }
}
async function openPage(id = 'b1') {
  const wrapper = shallowMount(Panel, {
    props: { batchId: id, active: true },
    global: { stubs, directives: { loading() {} } }
  })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, vm: state(wrapper) }
}
async function openCreate(props = {}) {
  const wrapper = shallowMount(CreateDialog, {
    props: { modelValue: true, ...props },
    global: { stubs }
  })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, vm: state(wrapper) }
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-16T12:00:00'))
  Object.values(api).forEach(mock => mock.mockReset())
  Object.values(messages).forEach(mock => mock.mockReset())
  auth.allowed = true
  api.getBatch.mockResolvedValue(batch())
  api.getBatches.mockResolvedValue([])
  api.getAllGroups.mockResolvedValue({ records: [] })
  messages.confirm.mockResolvedValue('confirm')
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('batch creation and credentials', () => {
  it('submits text ranges and grouping unchanged for server validation, with optional credentials', async () => {
    api.createBatch.mockResolvedValue(batch())
    const { vm, wrapper } = await openCreate()
    vm.form.targetText = '10.0.0.10-20, 10.0.0.0/28\n10.0.1.5'
    vm.form.groupId = 'group-id'
    await vm.submit()
    expect(api.createBatch).toHaveBeenCalledWith({
      name: undefined,
      targetText: vm.form.targetText,
      targetOs: 'linux',
      groupId: 'group-id',
      credentials: [],
      keepCredentials: false
    })
    expect(wrapper.emitted('created')[0][0].batch.id).toBe('b1')
  })

  it('derives OS groups from selected hosts and never sends a password for SSH key authentication', async () => {
    const { vm } = await openCreate({
      hosts: [
        { id: 'linux-id', ci_type: 'linux' },
        { hostId: 'windows-id', ciType: 'windows' }
      ]
    })
    expect(vm.operatingSystems).toEqual(['linux', 'windows'])
    Object.assign(vm.credentials.linux, {
      enabled: true,
      authType: 'key',
      password: 'stale-secret'
    })
    Object.assign(vm.credentials.windows, { enabled: true, password: 'win-secret', port: 5986 })
    vm.form.keepCredentials = true
    api.createBatch.mockResolvedValue(batch())
    await vm.submit()
    expect(api.createBatch).toHaveBeenCalledWith({
      name: undefined,
      hostIds: ['linux-id', 'windows-id'],
      keepCredentials: true,
      credentials: [
        { os: 'linux', user: 'root', authType: 'key', port: 22 },
        {
          os: 'windows',
          user: 'Administrator',
          authType: 'password',
          password: 'win-secret',
          port: 5986,
          winrmTransport: 'ntlm'
        }
      ]
    })
    expect(vm.credentials.windows.password).toBe('')
    expect(getBatchHostOs({ ciType: 'Windows Server 2022' })).toBe('windows')
  })

  it('rejects over 2000 hosts and preserves the original HTTP 400 message', async () => {
    const { vm, wrapper } = await openCreate({
      hosts: Array.from({ length: 2001 }, (_, id) => ({ id: String(id + 1) }))
    })
    await vm.submit()
    expect(api.createBatch).not.toHaveBeenCalled()
    expect(vm.errorMessage).toContain('2000')
    await wrapper.setProps({ hosts: [] })
    vm.form.targetText = 'invalid-ip'
    api.createBatch.mockRejectedValue({
      response: { status: 400, data: { message: 'IP 不合法：invalid-ip' } }
    })
    await vm.submit()
    expect(vm.errorMessage).toBe('IP 不合法：invalid-ip')
  })

  it('blocks duplicate submission and clears credentials when closed', async () => {
    const pending = deferred()
    const { vm, wrapper } = await openCreate()
    vm.form.targetText = '10.0.0.1'
    Object.assign(vm.credentials.linux, { enabled: true, password: 'secret' })
    api.createBatch.mockReturnValue(pending.promise)
    const submission = vm.submit()
    await vm.submit()
    vm.visible = false
    expect(api.createBatch).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    pending.resolve(batch())
    await submission
    await wrapper.setProps({ modelValue: false })
    expect(vm.credentials.linux.password).toBe('')
  })

  it('validates only enabled OS credentials and does not trim passwords', () => {
    const values = createBatchCredentials()
    Object.assign(values.linux, { enabled: true, password: ' secret ', becomePassword: ' sudo ' })
    expect(buildBatchCredentials(values, ['linux', 'linux'])).toEqual([
      {
        os: 'linux',
        user: 'root',
        authType: 'password',
        password: ' secret ',
        becomePassword: ' sudo ',
        port: 22
      }
    ])
    values.linux.port = 0
    expect(() => buildBatchCredentials(values, ['linux'])).toThrow('端口')
    expect(buildBatchCredentials(values, ['windows'])).toEqual([])
  })
})

describe('batch detail lifecycle', () => {
  it('keeps list, detail, creation and conflict navigation inside the host page', async () => {
    const { vm, wrapper } = await openPage('')
    vm.openBatch(batch())
    vm.backToList()
    vm.openPendingAgents()
    expect(wrapper.emitted('select-batch')).toEqual([['b1'], ['']])
    expect(wrapper.emitted('pending')).toHaveLength(1)
  })

  it('ignores pending detail and script responses after the drawer closes, then reloads on reopen', async () => {
    api.getBatch.mockResolvedValue(batch({ pushing: 1 }))
    const { vm, wrapper } = await openPage()
    const details = deferred(),
      script = deferred()
    api.getBatch.mockReturnValueOnce(details.promise)
    api.getBatchScript.mockReturnValueOnce(script.promise)
    const refreshing = vm.refresh()
    const issuing = vm.loadScript('linux')
    await wrapper.setProps({ active: false })
    details.resolve(batch({ pushing: 1 }))
    script.resolve({ os: 'linux', installCommand: 'late-command' })
    await Promise.all([refreshing, issuing])
    expect(vm.detail).toBeNull()
    expect(vm.script).toBeNull()
    expect(vm.scriptVisible).toBe(false)
    await vi.advanceTimersByTimeAsync(10000)
    expect(api.getBatch).toHaveBeenCalledTimes(2)
    api.getBatch.mockResolvedValue(batch({ online: 1 }))
    await wrapper.setProps({ active: true })
    await flushPromises()
    expect(api.getBatch).toHaveBeenCalledTimes(3)
    expect(vm.detail.counts.online).toBe(1)
  })
  it('polls every five seconds for pushing or installed and stops when both counts are absent', async () => {
    api.getBatch
      .mockResolvedValueOnce(batch({ pushing: 1 }))
      .mockResolvedValueOnce(batch({ installed: 1 }))
      .mockResolvedValue(batch({ online: 1 }))
    const { vm } = await openPage()
    await vi.advanceTimersByTimeAsync(4999)
    expect(api.getBatch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(api.getBatch).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(5000)
    expect(api.getBatch).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(15000)
    expect(api.getBatch).toHaveBeenCalledTimes(3)
    expect(api.getBatchScript).not.toHaveBeenCalled()
    expect(vm.detail.counts.online).toBe(1)
  })

  it('loads the latest batches without requesting a detail or issuing script credentials', async () => {
    api.getBatches.mockResolvedValue([batch({ total: 12, online: 8 })])
    const { vm } = await openPage('')
    expect(vm.batches[0].counts.total).toBe(12)
    expect(api.getBatch).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(10000)
    expect(api.getBatches).toHaveBeenCalledTimes(1)
    expect(api.getBatchScript).not.toHaveBeenCalled()
  })

  it('retries only selected failed items, then restarts polling from returned counts', async () => {
    api.getBatch.mockResolvedValue(
      batch({}, [
        item('failed', 'auth_failed'),
        item('done', 'online'),
        item('script', 'await_script', 'windows')
      ])
    )
    api.retryBatch.mockResolvedValue(batch({ pushing: 1 }, [item('failed', 'pushing')]))
    const { vm } = await openPage()
    vm.selectionChanged([item('failed', 'auth_failed'), item('done', 'online')])
    expect(vm.selectable(item('done', 'online'))).toBe(false)
    vm.openRetry(true)
    await vm.submitRetry()
    expect(api.retryBatch).toHaveBeenCalledWith('b1', { itemIds: ['failed'] })
    expect(vm.selectedIds).toEqual([])
    await vi.advanceTimersByTimeAsync(5000)
    expect(api.getBatch).toHaveBeenCalledTimes(2)
  })

  it('requires credentials for await_script items and sends an empty selection for retry all', async () => {
    api.getBatch.mockResolvedValue(batch({}, [item('script', 'await_script', 'windows')]))
    api.retryBatch.mockResolvedValue(batch({ installed: 1 }))
    const { vm } = await openPage()
    vm.openRetry(false)
    await vm.submitRetry()
    expect(api.retryBatch).not.toHaveBeenCalled()
    expect(vm.retryError).toContain('补充')
    Object.assign(vm.retryCredentials.windows, { enabled: true, password: 'secret' })
    await vm.submitRetry()
    await flushPromises()
    expect(api.retryBatch).toHaveBeenCalledWith('b1', {
      itemIds: [],
      credentials: [expect.objectContaining({ os: 'windows', password: 'secret' })]
    })
    expect(vm.retryCredentials.windows.password).toBe('')
  })

  it('issues scripts only on user action, copies and downloads the returned data without reissuing', async () => {
    const returned = {
      os: 'windows',
      installCommand: 'powershell "server-command"',
      fileName: 'install.cmd',
      fileContent: '@echo off\r\nserver-command',
      maxUses: 3
    }
    api.getBatchScript.mockResolvedValue(returned)
    const { vm } = await openPage()
    expect(api.getBatchScript).not.toHaveBeenCalled()
    await vm.loadScript('windows')
    expect(api.getBatchScript).toHaveBeenCalledWith('b1', 'windows')
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    })
    await vm.copyCommand()
    expect(writeText).toHaveBeenCalledWith(returned.installCommand)
    const createObjectURL = vi.fn().mockReturnValue('blob:script')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL
    })
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL
    })
    const click = vi
      .spyOn(window.HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function () {
        expect(this.download).toBe(returned.fileName)
        expect(this.href).toBe('blob:script')
      })
    const blob = vi.spyOn(window, 'Blob')
    vm.downloadScript()
    expect(click).toHaveBeenCalledTimes(1)
    expect(blob).toHaveBeenCalledWith([returned.fileContent], { type: 'text/plain;charset=utf-8' })
    expect(api.getBatchScript).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1000)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:script')
  })

  it('confirms closure, ignores a late script and detail response, and stops polling', async () => {
    api.getBatch.mockResolvedValue(batch({ pushing: 1 }))
    const { vm } = await openPage()
    const scriptRequest = deferred(),
      detailRequest = deferred()
    api.getBatchScript.mockReturnValue(scriptRequest.promise)
    api.getBatch.mockReturnValue(detailRequest.promise)
    const scriptLoading = vm.loadScript('linux')
    const refreshing = vm.refresh()
    api.closeBatch.mockResolvedValue({ ...batch(), batch: { ...batch().batch, status: 'closed' } })
    await vm.closeBatch()
    expect(messages.confirm).toHaveBeenCalledWith(
      '关闭后批次脚本立即失效，未上线的机器需新建批次',
      '关闭批次',
      { type: 'warning' }
    )
    scriptRequest.resolve({ os: 'linux', installCommand: 'expired-command' })
    detailRequest.resolve(batch({ pushing: 1 }))
    await Promise.all([scriptLoading, refreshing])
    expect(vm.detail.batch.status).toBe('closed')
    expect(vm.scriptVisible).toBe(false)
    expect(vm.script).toBeNull()
    await vi.advanceTimersByTimeAsync(15000)
    expect(api.getBatch).toHaveBeenCalledTimes(2)
    await vm.loadScript('linux')
    expect(api.getBatchScript).toHaveBeenCalledTimes(1)
  })

  it('preserves the batch when closure is cancelled or rejected', async () => {
    const { vm } = await openPage()
    messages.confirm.mockRejectedValueOnce('cancel')
    await vm.closeBatch()
    expect(api.closeBatch).not.toHaveBeenCalled()
    api.closeBatch.mockRejectedValue({ response: { data: { message: '批次已过期' } } })
    await vm.closeBatch()
    expect(vm.errorMessage).toBe('批次已过期')
    expect(vm.detail.batch.status).toBe('open')
  })

  it('ignores responses from the previous batch and stops polling when the drawer closes', async () => {
    const previous = deferred()
    api.getBatch
      .mockReturnValueOnce(previous.promise)
      .mockResolvedValue(batch({ pushing: 1 }, [], 'b2'))
    const { vm, wrapper } = await openPage()
    await wrapper.setProps({ batchId: 'b2' })
    await flushPromises()
    previous.resolve(batch({ pushing: 1 }, [], 'b1'))
    await flushPromises()
    expect(vm.detail.batch.id).toBe('b2')
    await wrapper.setProps({ active: false })
    await flushPromises()
    await vi.advanceTimersByTimeAsync(15000)
    expect(api.getBatch).toHaveBeenCalledTimes(2)
    expect(api.getBatches).not.toHaveBeenCalled()
  })

  it('disables mutations at expiration without needing another poll', async () => {
    api.getBatch.mockResolvedValue({
      ...batch(),
      batch: { ...batch().batch, expiresAt: '2026-11-16 12:00:01' }
    })
    const { vm } = await openPage()
    expect(vm.writable).toBe(true)
    await vi.advanceTimersByTimeAsync(1000)
    expect(vm.writable).toBe(false)
    await vm.loadScript('linux')
    await vm.submitRetry()
    await vm.closeBatch()
    expect(api.getBatchScript).not.toHaveBeenCalled()
    expect(api.retryBatch).not.toHaveBeenCalled()
    expect(api.closeBatch).not.toHaveBeenCalled()
  })

  it('keeps mutation actions unavailable without Agent management permission', async () => {
    auth.allowed = false
    const { vm } = await openPage()
    vm.openRetry(false)
    expect(vm.retryVisible).toBe(false)
    await vm.loadScript('linux')
    await vm.closeBatch()
    expect(api.getBatchScript).not.toHaveBeenCalled()
    expect(messages.confirm).not.toHaveBeenCalled()
  })
})
