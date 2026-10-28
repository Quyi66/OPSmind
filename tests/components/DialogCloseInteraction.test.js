import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElDialog } from 'element-plus/es/components/dialog/index.mjs'
import { ElInput } from 'element-plus/es/components/input/index.mjs'
import { ElDrawer } from 'element-plus/es/components/drawer/index.mjs'
import JobApproveDetailDialog from '@/modules/automation/components/job/JobApproveDetailDialog.vue'
import FileSelectorDialog from '@/modules/automation/components/job/JobListView/FileSelectorDialog.vue'
import WbReviewDrawer from '@/modules/automation/components/workbench/WbReviewDrawer.vue'
import RpmPackageDetailDialog from '@/modules/patches/components/rpm/RpmPackageDetailDialog.vue'

const api = vi.hoisted(() => ({ submitApprove: vi.fn(), listFiles: vi.fn() }))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() }
}))
vi.mock('@/modules/automation/api/jao', () => ({ submitApprove: api.submitApprove }))
vi.mock('@/modules/automation/api/gfs', () => ({ listFiles: api.listFiles }))
vi.mock('@/modules/automation/components/job/JobListView/CreateJobDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/automation/components/job/JobListView/FileContentViewer.vue', () => ({
  default: { template: '<div class="preview-content">只读预览</div>' }
}))

const Slot = { template: '<div><slot /></div>' }
const Button = {
  props: ['disabled'],
  template: '<button :disabled="disabled"><slot /></button>'
}
const global = {
  components: { ElDialog, ElInput, ElDrawer },
  stubs: {
    'el-dialog': false,
    'el-input': false,
    'el-drawer': false,
    'el-button': Button,
    'el-form': Slot,
    'el-form-item': Slot,
    'el-tooltip': Slot,
    'el-tag': Slot,
    'el-input-number': true,
    'el-table': true,
    'el-table-column': true,
    'el-checkbox': true,
    'el-radio': true,
    'el-icon': true,
    'el-breadcrumb': Slot,
    'el-breadcrumb-item': Slot,
    'el-empty': true,
    'el-descriptions': Slot,
    'el-descriptions-item': Slot,
    'el-pagination': true,
    teleport: true,
    transition: false
  },
  directives: { loading() {} }
}
const wrappers = []
const state = wrapper => wrapper.vm.$.setupState
async function settle() {
  await flushPromises()
  await new Promise(resolve => setTimeout(resolve, 60))
  await flushPromises()
}
async function click(target) {
  await target.trigger('mousedown')
  await target.trigger('mouseup')
  await target.trigger('click')
  await settle()
}
async function escape() {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })
  )
  await settle()
}
async function openApplication(status) {
  const wrapper = mount(JobApproveDetailDialog, {
    attachTo: document.body,
    props: {
      visible: true,
      approveData: {
        status,
        jobId: 'mock-job',
        approveMode: 'noLimitParams',
        description: '原说明'
      }
    },
    global
  })
  wrappers.push(wrapper)
  await settle()
  return wrapper
}
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  vi.clearAllMocks()
  api.submitApprove.mockResolvedValue({})
  api.listFiles.mockResolvedValue([])
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('真实 Dialog 的模式与嵌套关闭边界', () => {
  it('查看模式正文与跨正文拖拽不关闭，完整遮罩点击才关闭', async () => {
    const wrapper = await openApplication(1)
    await click(wrapper.find('.el-dialog__body'))
    expect(state(wrapper).dialogVisible).toBe(true)
    await wrapper.find('.el-dialog__body').trigger('mousedown')
    await wrapper.find('.el-overlay-dialog').trigger('mouseup')
    await wrapper.find('.el-overlay-dialog').trigger('click')
    await settle()
    expect(state(wrapper).dialogVisible).toBe(true)
    await click(wrapper.find('.el-overlay-dialog'))
    expect(state(wrapper).dialogVisible).toBe(false)
    expect(api.submitApprove).not.toHaveBeenCalled()
  })

  it('可重新申请时遮罩和 Esc 保留草稿，右上角仍可显式关闭', async () => {
    const wrapper = await openApplication(2)
    await wrapper.find('textarea').setValue('尚未保存的申请说明')
    await click(wrapper.find('.el-overlay-dialog'))
    await escape()
    expect(state(wrapper).dialogVisible).toBe(true)
    expect(state(wrapper).formData.description).toBe('尚未保存的申请说明')
    expect(api.submitApprove).not.toHaveBeenCalled()
    await click(wrapper.find('.el-dialog__headerbtn'))
    expect(state(wrapper).dialogVisible).toBe(false)
  })

  it('同一组件切换为查看状态后保留 Esc 关闭能力', async () => {
    const wrapper = await openApplication(2)
    await escape()
    expect(state(wrapper).dialogVisible).toBe(true)
    await wrapper.setProps({ approveData: { ...wrapper.props('approveData'), status: 1 } })
    await escape()
    expect(state(wrapper).dialogVisible).toBe(false)
    expect(api.submitApprove).not.toHaveBeenCalled()
  })

  it('原有成功后的受控自动关闭仍生效（仅调用 mock）', async () => {
    const wrapper = await openApplication(2)
    await wrapper.find('textarea').setValue('mock 提交说明')
    const submit = wrapper.findAll('button').find(button => button.text() === '提交申请')
    await submit.trigger('click')
    await settle()
    expect(api.submitApprove).toHaveBeenCalledOnce()
    expect(api.submitApprove.mock.calls[0][0].description).toBe('mock 提交说明')
    expect(state(wrapper).dialogVisible).toBe(false)
  })

  it.each(['遮罩', 'Esc'])(
    '只读子预览通过%s关闭时不关闭父选择器、不提交或丢失选择',
    async closeWith => {
      const selected = { name: 'draft.sh', path: 'draft.sh', repo: 'mock-repo' }
      const wrapper = mount(FileSelectorDialog, {
        attachTo: document.body,
        props: { modelValue: false, preSelected: [selected] },
        global
      })
      wrappers.push(wrapper)
      await wrapper.setProps({ modelValue: true })
      await settle()
      state(wrapper).previewFile = selected
      state(wrapper).previewVisible = true
      await settle()
      const preview = wrapper.findAll('.el-overlay-dialog').at(-1)
      if (closeWith === '遮罩') await click(preview)
      else await escape()
      expect(state(wrapper).previewVisible).toBe(false)
      await escape()
      expect(wrapper.props('modelValue')).toBe(true)
      expect(state(wrapper).selectedFiles).toEqual([selected])
      expect(wrapper.emitted('confirm')).toBeUndefined()
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    }
  )

  it('查看抽屉正文不关闭，点击遮罩沿原 model 事件关闭', async () => {
    const wrapper = mount(RpmPackageDetailDialog, {
      attachTo: document.body,
      props: { modelValue: true },
      global
    })
    wrappers.push(wrapper)
    await settle()
    await click(wrapper.find('.el-drawer__body'))
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await click(wrapper.find('.el-overlay'))
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('待审核列表遮罩关闭不触发审批或拒绝', async () => {
    const wrapper = mount(WbReviewDrawer, {
      attachTo: document.body,
      props: { visible: true },
      global
    })
    wrappers.push(wrapper)
    await settle()
    await click(wrapper.find('.el-overlay'))
    expect(wrapper.emitted('update:visible')).toEqual([[false]])
    expect(wrapper.emitted('approve')).toBeUndefined()
    expect(wrapper.emitted('reject')).toBeUndefined()
  })
})
