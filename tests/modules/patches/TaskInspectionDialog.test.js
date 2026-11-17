import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TaskInspectionDialog from '@/modules/patches/components/change-control/TaskInspectionDialog.vue'

const calls = vi.hoisted(() => ({ get: vi.fn(), execute: vi.fn() }))
vi.mock('@/modules/patches/api', () => ({
  patchInstallApi: { getInspection: calls.get, executeInspection: calls.execute }
}))

describe('task inspection', () => {
  let wrapper
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetAllMocks()
  })
  afterEach(() => {
    wrapper?.unmount()
    vi.useRealTimers()
  })

  it('selects the approver preset, polls while running and stops when closed', async () => {
    const hosts = [{ hostId: 'host-1', hostIp: '192.0.2.1' }, { hostId: 'host-2', hostIp: '192.0.2.2' }]
    const info = { inspectable: true, taskHosts: hosts, presetByApprover: true, defaultHosts: [hosts[1]] }
    calls.get.mockResolvedValueOnce({ data: info }).mockResolvedValue({
      data: { ...info, inspectable: false, inspectionStatus: 'RUNNING' }
    })
    calls.execute.mockResolvedValue({ data: { ...info, inspectionStatus: 'RUNNING' } })
    wrapper = shallowMount(TaskInspectionDialog, {
      props: { taskId: 'task-id', modelValue: true, isAdmin: false },
      global: { directives: { loading() {} } }
    })
    await flushPromises()
    const state = wrapper.vm.$.setupState
    expect(state.selectedHosts).toEqual(['host-2'])
    state.additionalHosts = '192.0.2.99'
    await Promise.all([state.execute(), state.execute()])
    expect(calls.execute).toHaveBeenCalledExactlyOnceWith('task-id', ['host-2'])
    await vi.advanceTimersByTimeAsync(6999)
    expect(calls.get).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(calls.get).toHaveBeenCalledTimes(2)
    await wrapper.setProps({ modelValue: false })
    await vi.advanceTimersByTimeAsync(15000)
    expect(calls.get).toHaveBeenCalledTimes(2)
  })
})
