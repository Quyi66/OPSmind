import { createRequire } from 'node:module'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'
import CommandEdit from '@/modules/automation/components/command/dialogs/CommandEditDialog.vue'
import GitSettings from '@/modules/automation/components/script/dialogs/GitRepoSettingsDialog.vue'

const { ElForm, ElFormItem } = createRequire(import.meta.url)(
  'element-plus/lib/components/form/index.js'
)
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn() },
  ElMessageBox: { confirm: vi.fn() }
}))
vi.mock('@/modules/automation/api/command', () => ({
  COMMAND_TYPES: ['shell'],
  getCommandStatusInfo: () => ({ text: 'Published', type: 'success' }),
  saveCommand: vi.fn(),
  findCommandById: vi.fn()
}))
vi.mock('@/modules/automation/api/gfs', () => ({ initGitRepo: vi.fn() }))
const wrappers = []
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
beforeEach(async () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.unstubAllGlobals()
  await setLocale('zh-CN', { persist: false })
})

describe('real automation form validation across languages', () => {
  it.each([
    [
      CommandEdit,
      { visible: false, mode: 'create' },
      'visible',
      'formData',
      'name',
      'Enter a command name'
    ],
    [
      GitSettings,
      { modelValue: false, repo: 'raw-repo' },
      'modelValue',
      'form',
      'repoUrl',
      'Enter a Git repository URL'
    ]
  ])(
    'refreshes an existing error without validating untouched fields or resetting values',
    async (component, props, visibleKey, modelKey, field, english) => {
      const wrapper = mount(component, {
        props,
        global: {
          stubs: {
            'el-dialog': Slot,
            'el-form': ElForm,
            'el-form-item': ElFormItem,
            'el-input': true,
            'el-input-number': true,
            'el-select': Slot,
            'el-option': true,
            'el-radio-group': Slot,
            'el-radio': true,
            'el-tooltip': Slot,
            'el-tag': Slot,
            'el-upload': true
          }
        }
      })
      wrappers.push(wrapper)
      await wrapper.setProps({ [visibleKey]: true })
      await flushPromises()
      const vm = wrapper.vm.$.setupState
      vm[modelKey].description = '保留中文草稿'
      await expect(vm.formRef.validateField(field)).rejects.toBeTruthy()
      const invalid = vm.formRef.fields.find(item => item.prop === field)
      const untouched = vm.formRef.fields.filter(item => item.prop !== field)
      expect(invalid.validateState).toBe('error')
      expect(untouched.every(item => item.validateState === '')).toBe(true)
      await setLocale('en-US', { persist: false })
      await flushPromises()
      expect(invalid.validateMessage).toBe(english)
      expect(untouched.every(item => item.validateState === '')).toBe(true)
      expect(vm[modelKey].description).toBe('保留中文草稿')
      await setLocale('zh-CN', { persist: false })
      await flushPromises()
      expect(invalid.validateMessage).toMatch(/请输入/)
    }
  )
})
