import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'
import PatchInstallWizard from '@/modules/patches/components/patch-task/wizard/PatchInstallWizard.vue'

vi.mock('@/modules/patches/api', () => ({ patchInstallApi: {} }))
vi.mock('@/modules/asset/api', () => ({ dataManageApi: {}, agentApi: {} }))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { template: '<div />' }
}))

const wrappers = []
function mountWizard(props = {}) {
  const wrapper = shallowMount(PatchInstallWizard, {
    props: { visible: true, ...props },
    global: {
      stubs: {
        'el-dialog': { template: '<div><slot /><slot name="footer" /></div>' },
        'el-button': {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')"><slot /></button>'
        },
        ElTable: true,
        ElTableColumn: true,
        ElInput: true,
        ElIcon: true,
        ElSelect: true,
        ElOption: true,
        ElPagination: true,
        ElAlert: true,
        PatchTaskFailedHostsDialog: {
          name: 'PatchTaskFailedHostsDialog',
          props: ['modelValue', 'taskId'],
          template: '<div />'
        }
      }
    }
  })
  wrappers.push(wrapper)
  return wrapper
}
const failedHostsButton = wrapper =>
  wrapper.findAll('button').find(button => button.text() === '查看失败主机')
const failedHostsDialog = wrapper => wrapper.findComponent({ name: 'PatchTaskFailedHostsDialog' })

afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()))

describe('PatchInstallWizard failed host entry', () => {
  it.each(['patch', 'package', 'vulnerability'])(
    'opens failures for the active %s task after pre-check failure',
    async operationType => {
      const wrapper = mountWizard({ operationType })
      expect(failedHostsButton(wrapper)).toBeUndefined()

      wrapper.vm.installStep = 4
      await nextTick()
      expect(failedHostsButton(wrapper)).toBeUndefined()

      wrapper.vm.createdTaskId = 'active-task'
      wrapper.vm.pipelineStatus = 'failed'
      wrapper.vm.stepStates[1] = 'failed'
      await nextTick()
      await failedHostsButton(wrapper).trigger('click')

      expect(failedHostsDialog(wrapper).props()).toMatchObject({
        modelValue: true,
        taskId: 'active-task'
      })
    }
  )

  it('keeps the entry available after execution and closes it on task replacement or wizard close', async () => {
    const wrapper = mountWizard()
    wrapper.vm.installStep = 4
    wrapper.vm.createdTaskId = 'task-1'
    wrapper.vm.pipelineStatus = 'success'
    await nextTick()
    await failedHostsButton(wrapper).trigger('click')
    expect(failedHostsDialog(wrapper).props('modelValue')).toBe(true)

    wrapper.vm.createdTaskId = 'task-2'
    await nextTick()
    expect(failedHostsDialog(wrapper).props()).toMatchObject({
      modelValue: false,
      taskId: 'task-2'
    })
    await failedHostsButton(wrapper).trigger('click')
    await wrapper.setProps({ visible: false })
    expect(failedHostsDialog(wrapper).props('modelValue')).toBe(false)
    expect(failedHostsDialog(wrapper).props('taskId')).toBe('')
  })

  it('does not offer the install failure endpoint for rollback tasks', async () => {
    const wrapper = mountWizard({ taskMode: 'rollback' })
    wrapper.vm.installStep = 4
    wrapper.vm.createdTaskId = 'rollback-task'
    await nextTick()
    expect(failedHostsButton(wrapper)).toBeUndefined()
  })
})
