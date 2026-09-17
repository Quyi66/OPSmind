import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { shallowMount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({ useWizard: vi.fn() }))
vi.mock('@/modules/patches/windows-patch/composables/useWinPatchRollbackWizard', () => ({
  useWinPatchRollbackWizard: mocks.useWizard
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { template: '<div />' }
}))

import WinPatchRollbackDialog from '@/modules/patches/windows-patch/components/tasks/WinPatchRollbackDialog.vue'

describe('WinPatchRollbackDialog controls', () => {
  let wrapper
  let wizard

  beforeEach(() => {
    wizard = {
      activeStep: ref(4),
      currentStepKey: ref('execute'),
      pipelineStatus: ref('success'),
      currentTaskId: ref('task-123'),
      dialogBusy: ref(false),
      canGoBack: ref(false),
      canGoNext: ref(false),
      currentStepSkippable: ref(false),
      selectedHistUpdateIds: ref([]),
      selectedHostItems: ref([]),
      selectedRollbackItems: ref([]),
      availableRunItems: ref([]),
      pipelineItems: ref([]),
      pipelineItemMap: ref({}),
      wizardSteps: [],
      wizardStepStates: ref([]),
      rollbackOptions: ref({}),
      skippedSteps: ref({}),
      preScriptConfig: ref({}),
      validateScriptConfig: ref({}),
      showRunResultDialog: ref(false),
      currentRunId: ref(''),
      currentRunTitle: ref(''),
      taskErrorMessage: ref(''),
      startExecution: vi.fn(),
      resetState: vi.fn()
    }
    mocks.useWizard.mockReturnValue(wizard)
    wrapper = shallowMount(WinPatchRollbackDialog, {
      props: { modelValue: true, selectedRows: [] },
      global: {
        stubs: {
          'el-dialog': {
            name: 'ElDialog',
            props: ['modelValue', 'closeOnPressEscape', 'beforeClose'],
            template: '<div><slot /><slot name="footer" /></div>'
          },
          'el-button': {
            props: ['disabled'],
            template: '<button :disabled="disabled"><slot /></button>'
          }
        }
      }
    })
  })

  afterEach(() => wrapper.unmount())

  it.each(['success', 'failed'])(
    'allows closing a %s task after the selection is cleared',
    async status => {
      wizard.pipelineStatus.value = status
      await wrapper.vm.$nextTick()
      const button = wrapper.find('button')
      expect(button.element.disabled).toBe(false)
      expect(button.text()).toBe(status === 'success' ? '完成' : '关闭')
      await button.trigger('click')
      expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
      expect(wizard.startExecution).not.toHaveBeenCalled()
    }
  )

  it('blocks escape and close callbacks while execution is active', async () => {
    wizard.dialogBusy.value = true
    wizard.pipelineStatus.value = 'running'
    await wrapper.vm.$nextTick()
    const dialog = wrapper.findComponent({ name: 'ElDialog' })
    const props = dialog.props()
    expect(props.closeOnPressEscape).toBe(false)
    const done = vi.fn()
    props.beforeClose(done)
    expect(done).not.toHaveBeenCalled()
  })

  it('offers query recovery without requiring a table selection', async () => {
    wizard.pipelineStatus.value = 'paused'
    await wrapper.vm.$nextTick()
    const button = wrapper.find('button')
    expect(button.text()).toBe('继续查询')
    expect(button.element.disabled).toBe(false)
    await button.trigger('click')
    expect(wizard.startExecution).toHaveBeenCalledTimes(1)
  })
})
