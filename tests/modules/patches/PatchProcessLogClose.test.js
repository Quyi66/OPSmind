import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import PatchProcessLogDetailDialog from '@/modules/patches/components/logs/PatchProcessLogDetailDialog.vue'

vi.mock('@/modules/patches/api', () => ({
  patchInstallApi: {
    getAuditDetail: vi.fn().mockResolvedValue({
      data: {
        task: { id: 'task-1', taskType: 'install', status: 'COMPLETED' },
        history: [],
        steps: []
      }
    })
  }
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { template: '<div />' }
}))

const Layer = {
  props: ['modelValue'],
  emits: ['open'],
  template: '<section v-if="modelValue"><slot /><slot name="footer" /></section>'
}
let wrapper
afterEach(() => wrapper?.unmount())

describe('流程操作详情查看模式', () => {
  it('保留关闭入口，查看详情不会出现或发起旧一键执行', async () => {
    wrapper = shallowMount(PatchProcessLogDetailDialog, {
      props: { modelValue: true, task: { id: 'task-1', taskType: 'install', status: 'COMPLETED' } },
      global: {
        stubs: {
          'el-dialog': Layer,
          'el-button': {
            props: ['disabled'],
            template: '<button :disabled="disabled"><slot /></button>'
          }
        },
        directives: { loading() {} }
      }
    })
    wrapper.findComponent(Layer).vm.$emit('open')
    await flushPromises()
    expect(wrapper.text()).not.toContain('一键执行')
    const close = wrapper.findAll('button').find(button => button.text() === '关闭')
    expect(close.exists()).toBe(true)
    await close.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })
})
