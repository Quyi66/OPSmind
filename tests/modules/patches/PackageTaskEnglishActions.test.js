import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'
import Tasks from '@/modules/patches/components/PackageInstallTasks.vue'
import FailedHosts from '@/modules/patches/components/patch-task/dialogs/PatchTaskFailedHostsDialog.vue'

const api = vi.hoisted(() => ({ listTasks: vi.fn(), approveTask: vi.fn(), prompt: vi.fn() }))
vi.mock('@/modules/patches/api', () => ({ patchInstallApi: api }))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
  ElMessageBox: { prompt: api.prompt }
}))
vi.mock('@/modules/patches/components/patch-task/dialogs/PatchTaskFailedHostsDialog.vue', () => ({
  default: { props: ['modelValue', 'taskId'], template: '<aside />' }
}))
const Slot = { template: '<div><slot /><slot name="dropdown" /></div>' }
const Button = { props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' }
let wrapper
const rows = [
  {
    id: 'future-task',
    taskType: 'install',
    status: 'PENDING_APPROVAL',
    scheduledTime: '2099-01-01T00:00:00Z'
  },
  {
    id: 'past-task',
    taskType: 'install',
    status: 'PENDING_APPROVAL',
    scheduledTime: '2020-01-01T00:00:00Z'
  }
]
const actions = index => wrapper.findAll('.package-task-actions')[index]
const button = (root, text) => root.findAll('button').find(item => item.text() === text)
async function open(isAdmin = true) {
  wrapper = mount(Tasks, {
    props: { isAdmin },
    global: {
      stubs: {
        'el-table': {
          props: ['data'],
          provide() {
            return { taskRows: () => this.data }
          },
          template: '<div><slot /></div>'
        },
        'el-table-column': {
          inject: ['taskRows'],
          template:
            '<section><template v-for="row in taskRows()"><slot :row="row" /></template></section>'
        },
        'el-button': Button,
        'el-dropdown-item': Button,
        'el-dropdown': Slot,
        'el-dropdown-menu': Slot,
        'el-tag': Slot,
        'el-select': true,
        'el-option': true,
        'el-pagination': true,
        'el-icon': true
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
beforeEach(async () => {
  vi.clearAllMocks()
  await setLocale('en-US', { persist: false })
  api.listTasks.mockResolvedValue({ data: { content: rows, totalElements: rows.length } })
  api.prompt.mockResolvedValue({ value: '原审批备注' })
  api.approveTask.mockResolvedValue({})
})
afterEach(async () => {
  wrapper?.unmount()
  await setLocale('zh-CN', { persist: false })
})

describe('compact English package task actions', () => {
  it('retains original detail, failed-host and approval arguments and the expired schedule guard', async () => {
    await open()
    await button(actions(0), 'Details').trigger('click')
    expect(wrapper.emitted('detail')[0][0].id).toBe('future-task')
    await button(actions(0), 'Failed hosts').trigger('click')
    expect(wrapper.findComponent(FailedHosts).props()).toMatchObject({
      modelValue: true,
      taskId: 'future-task'
    })
    expect(button(actions(1), 'Approve').attributes('disabled')).toBeDefined()
    await button(actions(0), 'Approve').trigger('click')
    await flushPromises()
    expect(api.approveTask).toHaveBeenCalledExactlyOnceWith('future-task', {
      approved: true,
      comment: '原审批备注'
    })
    await button(actions(1), 'Reject').trigger('click')
    await flushPromises()
    expect(api.approveTask).toHaveBeenLastCalledWith('past-task', {
      approved: false,
      comment: '原审批备注'
    })
  })

  it('does not expose approval to non-admins and restores Chinese buttons without reloading', async () => {
    await open(false)
    expect(button(actions(0), 'Approve')).toBeUndefined()
    expect(button(actions(0), 'Reject')).toBeUndefined()
    await setLocale('zh-CN', { persist: false })
    await flushPromises()
    expect(wrapper.findAll('.package-task-actions')).toHaveLength(0)
    expect(button(wrapper, '失败主机')).toBeDefined()
    expect(api.listTasks).toHaveBeenCalledTimes(1)
    expect(api.approveTask).not.toHaveBeenCalled()
  })
})
