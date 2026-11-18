import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { setLocale, t } from '@/core/i18n'
import Tasks from '@/modules/patches/components/PackageInstallTasks.vue'
import FailedHosts from '@/modules/patches/components/patch-task/dialogs/PatchTaskFailedHostsDialog.vue'

const api = vi.hoisted(() => ({ listTasks: vi.fn(), approveTask: vi.fn() }))
vi.mock('@/modules/patches/api', () => ({ patchInstallApi: api }))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() }
}))
vi.mock('@/modules/patches/components/patch-task/dialogs/PatchTaskFailedHostsDialog.vue', () => ({
  default: { props: ['modelValue', 'taskId'], template: '<aside />' }
}))
vi.mock('@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue', () => ({
  default: { name: 'AcmDeviceSelector', props: ['modelValue', 'ciTypes', 'options'], template: '<aside />' }
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
const actionWidth = () => wrapper.get(`section[aria-label="${t('common.actions')}"]`).attributes('data-width')
const reviewDialog = () => wrapper.get('.patch-approval-dialog')
const deviceSelector = () => wrapper.findComponent({ name: 'AcmDeviceSelector' })
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
          props: ['label', 'width'],
          inject: ['taskRows'],
          template:
            '<section :aria-label="label" :data-width="width"><template v-for="row in taskRows()"><slot :row="row" /></template></section>'
        },
        'el-button': Button,
        'el-dialog': {
          props: ['modelValue'],
          template: '<section v-if="modelValue"><slot /><slot name="footer" /></section>'
        },
        'el-form': Slot,
        'el-form-item': Slot,
        'el-input': {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
        },
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
  api.approveTask.mockResolvedValue({})
})
afterEach(async () => {
  wrapper?.unmount()
  await setLocale('zh-CN', { persist: false })
})

describe('compact package task actions', () => {
  it('shows the implementation plan for an ordinary application and approves it with the existing payload', async () => {
    api.listTasks.mockResolvedValue({ data: { content: [{
      ...rows[0],
      scheduledTime: null,
      planStartTime: '2099-01-01 22:00:00',
      planEndTime: '2099-01-01 23:00:00'
    }] } })
    await open()
    expect(wrapper.find(`section[aria-label="${t('patches.linux.scheduledTime')}"]`).exists()).toBe(false)
    await button(actions(0), 'Approve').trigger('click')
    expect(reviewDialog().text()).toContain(t('patches.changeControl.plan'))
    expect(reviewDialog().text()).not.toContain(t('patches.linux.scheduledTimeLabel'))
    await button(reviewDialog(), t('patches.linux.confirmApprove')).trigger('click')
    await flushPromises()
    expect(api.approveTask).toHaveBeenCalledExactlyOnceWith('future-task', { approved: true, comment: '' })
  })

  it('shows detail and approval actions without failed hosts on pending applications', async () => {
    await open()
    await button(actions(0), 'Details').trigger('click')
    expect(wrapper.emitted('detail')[0][0].id).toBe('future-task')
    expect(button(wrapper, 'Failed hosts')).toBeUndefined()
    expect(actionWidth()).toBe('184')
    expect(button(actions(1), 'Approve').attributes('disabled')).toBeDefined()
    await button(actions(0), 'Approve').trigger('click')
    expect(deviceSelector().props()).toMatchObject({
      ciTypes: 'linux',
      options: { selectMode: 'host', selector: 'multiple' },
      modelValue: []
    })
    deviceSelector().vm.$emit('update:modelValue', [
      { key: 'asset-1', value: '192.0.2.1' },
      { key: 'asset-2', value: '192.0.2.2' },
      { key: 'asset-1', value: '192.0.2.1' }
    ])
    await reviewDialog().get('textarea').setValue('原审批备注')
    expect(api.approveTask).not.toHaveBeenCalled()
    await button(reviewDialog(), t('patches.linux.confirmApprove')).trigger('click')
    await flushPromises()
    expect(api.approveTask).toHaveBeenCalledExactlyOnceWith('future-task', {
      approved: true,
      comment: '原审批备注',
      inspectionHostIds: ['asset-1', 'asset-2']
    })
    await button(actions(1), 'Reject').trigger('click')
    expect(deviceSelector().exists()).toBe(false)
    await reviewDialog().get('textarea').setValue('驳回原因')
    await button(reviewDialog(), t('patches.linux.confirmReject')).trigger('click')
    await flushPromises()
    expect(api.approveTask).toHaveBeenLastCalledWith('past-task', {
      approved: false,
      comment: '驳回原因'
    })
  })

  it.each(['Linux', 'Windows'])('supports approving a %s task without preset hosts', async osType => {
    api.listTasks.mockResolvedValue({ data: { content: [{ ...rows[0], osType }] } })
    await open()
    await button(actions(0), 'Approve').trigger('click')
    expect(deviceSelector().exists()).toBe(osType === 'Linux')
    if (osType === 'Linux') {
      deviceSelector().vm.$emit('update:modelValue', [{ key: 'discarded-asset' }])
      await button(reviewDialog(), t('common.cancel')).trigger('click')
      expect(api.approveTask).not.toHaveBeenCalled()
      await button(actions(0), 'Approve').trigger('click')
      expect(deviceSelector().props('modelValue')).toEqual([])
    }
    await button(reviewDialog(), t('patches.linux.confirmApprove')).trigger('click')
    await flushPromises()
    expect(api.approveTask).toHaveBeenCalledExactlyOnceWith('future-task', { approved: true, comment: '' })
  })

  it('shows only details to a non-admin viewing pending applications in either language', async () => {
    await open(false)
    expect(button(actions(0), 'Approve')).toBeUndefined()
    expect(button(actions(0), 'Reject')).toBeUndefined()
    expect(button(actions(0), 'More')).toBeUndefined()
    expect(actionWidth()).toBe('88')
    await setLocale('zh-CN', { persist: false })
    await flushPromises()
    expect(actions(0).findAll('button').map(item => item.text())).toEqual(['详情'])
    expect(button(wrapper, '失败主机')).toBeUndefined()
    expect(actionWidth()).toBe('72')
    expect(api.listTasks).toHaveBeenCalledTimes(1)
    expect(api.approveTask).not.toHaveBeenCalled()
  })

  it('keeps the same inline actions on the same application when switching languages', async () => {
    await open()
    expect(actions(0).findAll('button').map(item => item.text())).toEqual(['Details', 'Approve', 'Reject'])
    await setLocale('zh-CN', { persist: false })
    await flushPromises()
    expect(actionWidth()).toBe('136')
    expect(actions(0).findAll('button').map(item => item.text())).toEqual(['详情', '通过', '驳回'])
    expect(api.listTasks).toHaveBeenCalledTimes(1)
  })

  it('opens failed hosts for an executed installation and not for queued or closed applications', async () => {
    const resultRows = ['CREATED', 'REJECTED', 'EXPIRED', 'PRE_CHECK_DONE'].map(status => ({
      id: status, status, taskType: 'install'
    }))
    api.listTasks.mockResolvedValue({ data: { content: resultRows } })
    await open()
    expect(wrapper.findAll('button').filter(item => item.text() === 'Failed hosts')).toHaveLength(1)
    await button(actions(3), 'Failed hosts').trigger('click')
    expect(wrapper.findComponent(FailedHosts).props()).toMatchObject({
      modelValue: true,
      taskId: 'PRE_CHECK_DONE'
    })
  })
})
