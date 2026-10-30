import { afterEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElMessage, ElUpload } from 'element-plus'
import Dialog from '@/modules/asset/components/model/ImportModelDialog.vue'

const post = vi.hoisted(() => vi.fn())
vi.mock('@/core/api', () => ({ apiService: { post } }))
let wrapper
afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
})

it('移除已选模型文件后禁用导入并清除提交对象，再选择新文件只保留新对象', async () => {
  post.mockReset()
  vi.spyOn(ElMessage, 'warning').mockImplementation(() => {})
  wrapper = mount(Dialog, {
    props: { modelValue: true },
    global: {
      components: { ElUpload },
      stubs: {
        'el-dialog': { template: '<div><slot /><slot name="footer" /></div>' },
        'el-button': {
          props: ['disabled'],
          template: '<button :disabled="disabled"><slot /></button>'
        }
      }
    }
  })
  const state = wrapper.vm.$.setupState
  const input = wrapper.get('input[type="file"]')
  const selectFile = async file => {
    Object.defineProperty(input.element, 'files', { configurable: true, value: [file] })
    await input.trigger('change')
    await flushPromises()
  }
  const original = new File(['mock model'], 'model.xlsx')
  await selectFile(original)
  expect(state.selectedFile).toBe(original)
  const submit = () => wrapper.findAll('button').find(item => item.text() === '导入')
  expect(submit().attributes('disabled')).toBeUndefined()
  await wrapper.get('.el-upload-list__item .el-icon--close').trigger('click')
  await flushPromises()
  expect(state.selectedFile).toBeNull()
  expect(submit().attributes('disabled')).toBeDefined()
  await state.handleUpload()
  expect(ElMessage.warning).toHaveBeenCalledWith('请选择要上传的文件')
  expect(post).not.toHaveBeenCalled()
  const replacement = new File(['another mock model'], 'replacement.xls')
  await selectFile(replacement)
  expect(state.selectedFile).toBe(replacement)
  expect(submit().attributes('disabled')).toBeUndefined()
  expect(post).not.toHaveBeenCalled()
})
