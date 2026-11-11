import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import InstallTaskDetailDialog from '@/modules/patches/components/InstallTaskDetailDialog.vue'

const api = vi.hoisted(() => ({ getTask: vi.fn() }))
vi.mock('@/modules/patches/api', () => ({ patchInstallApi: api }))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { name: 'ExecuteResultDialog', template: '<div />' }
}))

let wrapper
let task

function mountDialog() {
  wrapper = shallowMount(InstallTaskDetailDialog, {
    props: {
      visible: true,
      taskId: task.id,
      'onUpdate:visible': visible => wrapper.setProps({ visible })
    },
    global: {
      stubs: {
        'el-dialog': {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: `<section v-if="modelValue">
            <button data-testid="close" @click="$emit('update:modelValue', false)">关闭</button>
            <slot /><slot name="footer" />
          </section>`
        },
        'el-alert': { props: ['title'], template: '<div>{{ title }}<slot /></div>' },
        'el-tag': { template: '<span><slot /></span>' },
        'el-icon': true,
        'el-collapse': true,
        'el-collapse-item': true
      },
      directives: { loading() {} }
    }
  })
  return wrapper
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(new Date('2026-10-28T10:00:00+08:00'))
  task = {
    id: 'scheduled-task',
    status: 'CREATED',
    scheduledTime: new Date(Date.now() + 20000).toISOString()
  }
  api.getTask.mockReset().mockImplementation(async () => ({ data: { ...task } }))
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.useRealTimers()
})

describe('定时安装详情轮询', () => {
  it('首次读取未来计划任务后，计划时间前不重复请求详情', async () => {
    mountDialog()
    await flushPromises()
    expect(api.getTask).toHaveBeenCalledExactlyOnceWith(task.id)
    expect(wrapper.text()).toContain('等待定时执行')

    await vi.advanceTimersByTimeAsync(19999)
    expect(api.getTask).toHaveBeenCalledTimes(1)
  })

  it('到计划时间自动恢复查询，并持续更新执行状态', async () => {
    mountDialog()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(15000)
    expect(api.getTask).toHaveBeenCalledTimes(1)

    task.status = 'PRE_CHECKING'
    await vi.advanceTimersByTimeAsync(5000)
    expect(api.getTask).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('正在进行前置环境检查')

    task.status = 'INSTALLING'
    await vi.advanceTimersByTimeAsync(5000)
    expect(api.getTask).toHaveBeenCalledTimes(3)
    expect(wrapper.text()).toContain('正在分批执行安装')
  })

  it.each(['计划时间前', '恢复轮询后'])('%s关窗后停止请求', async phase => {
    mountDialog()
    await flushPromises()
    if (phase === '恢复轮询后') await vi.advanceTimersByTimeAsync(20000)
    const callsBeforeClose = api.getTask.mock.calls.length

    await wrapper.get('[data-testid="close"]').trigger('click')
    expect(wrapper.emitted('update:visible')).toEqual([[false]])
    await vi.advanceTimersByTimeAsync(60000)
    expect(api.getTask).toHaveBeenCalledTimes(callsBeforeClose)
  })

  it('卸载后不在计划时间恢复轮询', async () => {
    mountDialog()
    await flushPromises()
    wrapper.unmount()
    wrapper = null

    await vi.advanceTimersByTimeAsync(60000)
    expect(api.getTask).toHaveBeenCalledTimes(1)
  })
})
