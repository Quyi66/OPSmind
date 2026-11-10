import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { ElInput, ElSelect, ElOption, ElTable, ElTableColumn } from 'element-plus'
import WinPatchTaskDetailDrawer from '@/modules/patches/windows-patch/components/tasks/WinPatchTaskDetailDrawer.vue'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { winPatchApi } from '@/modules/patches/windows-patch/api'

const polling = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn() }))
vi.mock('@/modules/patches/windows-patch/api', () => ({
  winPatchApi: { getTaskDetail: vi.fn(), executeTaskStep: vi.fn(), skipTaskStep: vi.fn() }
}))
vi.mock('@/modules/patches/windows-patch/composables/useWinPatchPolling', () => ({
  useWinPatchPolling: () => ({ isPolling: ref(false), ...polling })
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { props: ['visible', 'runId', 'jobTitle'], template: '<div />' }
}))
vi.mock('@/modules/patches/windows-patch/components/tasks/WinPatchTaskScriptUploader.vue', () => ({
  default: { template: '<div />' }
}))

let wrapper
const slots = { template: '<div><slot /></div>' }
const task = Object.freeze({
  id: 'task-original',
  taskType: 'INSTALL',
  status: 'COMPLETED',
  run_id: 'run-original'
})
const hosts = Object.freeze([
  Object.freeze({
    id: 'row-a',
    hostKey: 'WIN-HOST-A',
    status: 'FAILED',
    errorMessage: 'WinRM Timeout'
  }),
  Object.freeze({
    id: 'row-b',
    host_key: '192.0.2.20',
    task_status: 'FAILED',
    error_message: 'ACCESS DENIED'
  }),
  Object.freeze({ id: 'row-c', hostKey: 'host-c', status: 'SUCCESS' }),
  Object.freeze({ id: 'row-d', hostKey: 'host-d', status: 'RUNNING' }),
  Object.freeze({ id: 'row-e', hostKey: 'host-e', status: 'CUSTOM_WAIT' }),
  Object.freeze({ id: 'row-f', hostKey: 'host-f' })
])
const response = (rows = hosts, overrides = {}) => ({
  data: { task: { ...task, hostCount: 99, ...overrides }, hosts: rows, steps: [], logs: [] }
})
const table = () => wrapper.findComponent(ElTable)
const input = () => wrapper.findComponent(ElInput)
const select = () => wrapper.findComponent(ElSelect)
const visibleIds = () =>
  table()
    .props('data')
    .map(row => row.id)
async function changeStatus(value) {
  select().vm.$emit('update:modelValue', value)
  await nextTick()
}
async function open(props = {}) {
  wrapper = mount(WinPatchTaskDetailDrawer, {
    props: { modelValue: true, taskId: task.id, ...props },
    global: {
      components: { ElInput, ElSelect, ElOption, ElTable, ElTableColumn },
      stubs: {
        'el-dialog': {
          props: ['modelValue', 'closeOnClickModal', 'closeOnPressEscape'],
          template: '<div><slot /></div>'
        },
        'el-descriptions': slots,
        'el-descriptions-item': slots,
        'el-form': slots,
        'el-form-item': slots,
        'el-input': false,
        'el-select': false,
        'el-option': false,
        'el-table': false,
        'el-table-column': false,
        'el-button': {
          props: ['disabled'],
          template: '<button :disabled="disabled"><slot /></button>'
        },
        'el-switch': true,
        'el-tag': { template: '<button><slot /></button>' },
        'el-icon': true
      },
      directives: { loading: () => {} }
    }
  })
  await flushPromises()
}
beforeEach(() => {
  vi.resetAllMocks()
  winPatchApi.getTaskDetail.mockResolvedValue(response())
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})
afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
})

describe('Windows 补丁任务的主机筛选与执行结果', () => {
  it('移除技术信息展示，执行结果入口仍使用原真实运行标识', async () => {
    await open()
    expect(winPatchApi.getTaskDetail).toHaveBeenCalledWith(task.id)
    expect(wrapper.text()).not.toContain('技术信息')
    expect(wrapper.text()).not.toContain(task.run_id)
    const mainRun = wrapper
      .findAll('.win-patch-task-runs__actions button')
      .find(tag => tag.text() === '主任务执行')
    await mainRun.trigger('click')
    expect(wrapper.findComponent(ExecuteResultDialog).props()).toMatchObject({
      visible: true,
      runId: task.run_id,
      jobTitle: '主任务执行'
    })
    expect(task.run_id).toBe('run-original')
    expect(winPatchApi.executeTaskStep).not.toHaveBeenCalled()
    expect(winPatchApi.skipTaskStep).not.toHaveBeenCalled()
  })

  it('本地按主机/错误原因搜索，支持别名/空格/大小写，空态及重置不发查询', async () => {
    await open()
    expect(wrapper.text()).toContain('显示 6 / 已加载 6 条主机记录')
    await input().setValue('  win-host-a  ')
    expect(visibleIds()).toEqual(['row-a'])
    await input().setValue(' timeout ')
    expect(visibleIds()).toEqual(['row-a'])
    await input().setValue('192.0.2.20')
    expect(visibleIds()).toEqual(['row-b'])
    await input().setValue('access denied')
    expect(visibleIds()).toEqual(['row-b'])
    expect(wrapper.text()).toContain('显示 1 / 已加载 6 条主机记录')
    await input().setValue('not-a-host')
    expect(visibleIds()).toEqual([])
    expect(table().props('emptyText')).toBe('未匹配到主机或错误原因，请调整或重置筛选')
    expect(wrapper.text()).toContain('显示 0 / 已加载 6 条主机记录')
    await wrapper
      .findAll('button')
      .find(button => button.text() === '重置')
      .trigger('click')
    expect(visibleIds()).toEqual(hosts.map(row => row.id))
    expect(winPatchApi.getTaskDetail).toHaveBeenCalledTimes(1)
  })

  it('沿原状态展示过滤并保留未知/缺失状态，关键词与状态可组合', async () => {
    await open()
    const options = wrapper.findAllComponents(ElOption).map(option => option.props())
    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'CUSTOM_WAIT', label: 'CUSTOM_WAIT' }),
        expect.objectContaining({ value: '', label: '-' })
      ])
    )
    await changeStatus('FAILED')
    expect(visibleIds()).toEqual(['row-a', 'row-b'])
    await input().setValue('timeout')
    expect(visibleIds()).toEqual(['row-a'])
    await input().setValue('')
    await changeStatus('CUSTOM_WAIT')
    expect(visibleIds()).toEqual(['row-e'])
    await changeStatus('')
    expect(visibleIds()).toEqual(['row-f'])
    expect(winPatchApi.getTaskDetail).toHaveBeenCalledTimes(1)
    expect(hosts[0].status).toBe('FAILED')
  })

  it('自动轮询和手动刷新保留查看条件，已无匹配的选中状态仍可见', async () => {
    const running = [{ id: 'running', hostKey: 'host-running', status: 'RUNNING' }]
    winPatchApi.getTaskDetail.mockResolvedValueOnce(
      response(running, { taskType: 'SCAN', status: 'RUNNING' })
    )
    await open()
    const pollingTick = polling.start.mock.calls.at(-1)[0]
    await input().setValue('host-running')
    await changeStatus('RUNNING')
    const completed = [{ ...running[0], status: 'SUCCESS' }]
    winPatchApi.getTaskDetail.mockResolvedValue(response(completed, { taskType: 'SCAN' }))
    await pollingTick()
    await flushPromises()
    expect(input().props('modelValue')).toBe('host-running')
    expect(select().props('modelValue')).toBe('RUNNING')
    expect(visibleIds()).toEqual([])
    expect(wrapper.findAllComponents(ElOption).map(option => option.props('value'))).toContain(
      'RUNNING'
    )
    expect(wrapper.text()).toContain('显示 0 / 已加载 1 条主机记录')
    await wrapper.get('.win-patch-task-detail__actions button').trigger('click')
    await flushPromises()
    expect(select().props('modelValue')).toBe('RUNNING')
    expect(winPatchApi.getTaskDetail).toHaveBeenCalledTimes(3)
    expect(winPatchApi.getTaskDetail).toHaveBeenLastCalledWith(task.id)
    await changeStatus('all')
    expect(visibleIds()).toEqual(['running'])
  })

  it.each(['close', 'switch'])('%s任务上下文清除筛选且不执行任务', async mode => {
    await open()
    await input().setValue('timeout')
    await changeStatus('FAILED')
    await wrapper.setProps(mode === 'close' ? { modelValue: false } : { taskId: 'task-next' })
    await flushPromises()
    expect(input().props('modelValue')).toBe('')
    expect(select().props('modelValue')).toBe('all')
    if (mode === 'close') {
      expect(winPatchApi.getTaskDetail).toHaveBeenCalledTimes(1)
      await wrapper.setProps({ modelValue: true })
      await flushPromises()
    }
    expect(winPatchApi.getTaskDetail).toHaveBeenCalledTimes(2)
    expect(visibleIds()).toEqual(hosts.map(row => row.id))
    expect(winPatchApi.executeTaskStep).not.toHaveBeenCalled()
    expect(winPatchApi.skipTaskStep).not.toHaveBeenCalled()
  })

  it('无主机数据时保持真实空态，不以任务摘要的主机数充当已加载条数', async () => {
    winPatchApi.getTaskDetail.mockResolvedValue(response([]))
    await open()
    expect(wrapper.text()).toContain('显示 0 / 已加载 0 条主机记录')
    expect(table().props('emptyText')).toBe('暂无数据')
  })
})
