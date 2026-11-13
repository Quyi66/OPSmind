import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createRequire } from 'node:module'
import ProfileSettingsPage from '@/views/settings/ProfileSettingsPage.vue'
import { setLocale } from '@/core/i18n'

// Use the package's Node entry so its CommonJS validator resolves as it does in the browser bundle.
const { ElForm, ElFormItem } = createRequire(import.meta.url)(
  'element-plus/lib/components/form/index.js'
)

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  refresh: vi.fn(),
  push: vi.fn(),
  success: vi.fn(),
  error: vi.fn()
}))
vi.mock('@/core/api', () => ({ apiService: { get: api.get, post: api.post, put: api.put } }))
vi.mock('@/core/account', () => ({ accountService: { getAccount: api.refresh } }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: api.push }) }))
vi.mock('element-plus', () => ({
  ElMessage: { success: api.success, error: api.error, warning: vi.fn() }
}))

const Slot = { template: '<div><slot /></div>' }
const Input = {
  props: ['modelValue', 'placeholder'],
  emits: ['update:modelValue'],
  template:
    '<input :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />'
}
const Pane = {
  props: ['label', 'disabled'],
  template: '<section :data-disabled="disabled"><h2>{{ label }}</h2><slot /></section>'
}
const account = Object.freeze({
  login: '中文账号',
  fullName: '后端昵称',
  department: '原始中文部门',
  email: 'raw@example.com',
  mobile: '123',
  langKey: 'zh-tw',
  createdDate: '2026-11-12T08:30:00Z',
  roles: Object.freeze([{ name: 'ROLE_CUSTOM', description: '后端角色中文' }])
})
let wrapper
const state = () => wrapper.vm.$.setupState
async function open(overrides = {}) {
  api.get.mockResolvedValue({ data: { ...account, ...overrides } })
  wrapper = mount(ProfileSettingsPage, {
    global: {
      stubs: {
        'el-form': ElForm,
        'el-form-item': ElFormItem,
        'el-input': Input,
        'el-row': Slot,
        'el-col': Slot,
        'el-tabs': Slot,
        'el-tab-pane': Pane,
        'el-upload': Slot,
        'el-icon': Slot
      },
      directives: { loading: () => {} }
    }
  })
  await flushPromises()
}
beforeEach(async () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  Object.values(api).forEach(mock => mock.mockReset())
  api.refresh.mockResolvedValue(account)
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrapper?.unmount()
  wrapper = undefined
  await setLocale('zh-CN', { persist: false })
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('profile language changes preserve account operations', () => {
  it('updates visible validation without losing drafts, credentials, upload state or refetching', async () => {
    await open()
    const vm = state()
    vm.form.fullName = '未保存昵称 #{raw}'
    vm.passwordForm.password = 'RawPassword123!'
    vm.passwordForm.confirmPassword = 'different'
    vm.activeTab = 'password'
    vm.tempAvatarFileId = 'pending-upload'
    vm.tempAvatarPath = '/临时头像.png'
    await flushPromises()
    await vm.passwordFormRef.validateField('confirmPassword').catch(() => {})
    await vi.waitFor(() => expect(wrapper.text()).toContain('两次输入的密码不一致'))
    await setLocale('en-US', { persist: false })
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.text()).toContain('Passwords do not match'))
    expect(wrapper.text()).not.toContain('两次输入的密码不一致')
    expect(wrapper.text()).toContain('Personal information')
    expect(wrapper.text()).toContain('后端角色中文')
    expect(wrapper.text()).toContain('原始中文部门')
    expect(vm.form.fullName).toBe('未保存昵称 #{raw}')
    expect(vm.form.langKey).toBe('zh-tw')
    expect(vm.passwordForm.password).toBe('RawPassword123!')
    expect(vm.passwordForm.confirmPassword).toBe('different')
    expect(vm.activeTab).toBe('password')
    expect(vm.tempAvatarFileId).toBe('pending-upload')
    expect(vm.tempAvatarPath).toBe('/临时头像.png')
    expect(vm.rules.fullName[0].message).toBe('Enter a nickname')
    expect(vm.formRef.fields.every(field => field.validateState !== 'error')).toBe(true)
    expect(api.get).toHaveBeenCalledExactlyOnceWith('/api/account')
    expect(api.post).not.toHaveBeenCalled()
    expect(api.put).not.toHaveBeenCalled()
    expect(api.refresh).not.toHaveBeenCalled()
    await setLocale('zh-CN', { persist: false })
    await vi.waitFor(() => expect(wrapper.text()).toContain('两次输入的密码不一致'))
    expect(vm.form.fullName).toBe('未保存昵称 #{raw}')
  })
  it('keeps avatar confirmation, saved account fields and backend language protocol unchanged', async () => {
    await open()
    const vm = state(),
      file = new File(['image'], '中文头像.png', { type: 'image/png' })
    api.post
      .mockResolvedValueOnce({
        data: { status: 'success', data: [{ id: 'upload-17', path: '/头像.png' }] }
      })
      .mockResolvedValue({})
    api.put.mockResolvedValue({ data: { status: 'success', data: [{ path: '/confirmed.png' }] } })
    await vm.handleAvatarChange({ raw: file })
    vm.form.fullName = '保存的中文昵称'
    await setLocale('en-US', { persist: false })
    const events = vi.fn()
    window.addEventListener('account-updated', events)
    try {
      await vm.handleSave()
      await flushPromises()
      const upload = api.post.mock.calls[0]
      expect(upload[0]).toBe('/api/upload')
      expect(upload[1].get('module')).toBe('portal')
      expect(upload[1].get('category')).toBe('avatar')
      expect(upload[1].get('params[0]').name).toBe(file.name)
      expect(api.put).toHaveBeenCalledExactlyOnceWith('/api/upload/confirm', {
        module: 'portal',
        category: 'avatar',
        params: ['upload-17']
      })
      expect(api.post).toHaveBeenLastCalledWith('/api/account', {
        fullName: '保存的中文昵称',
        department: account.department,
        email: account.email,
        mobile: account.mobile,
        langKey: 'zh-tw',
        imageUrl: '/confirmed.png',
        login: account.login
      })
      expect(api.refresh).toHaveBeenCalledExactlyOnceWith({ forceRefresh: true })
      expect(events).toHaveBeenCalledTimes(1)
      expect(api.success).toHaveBeenLastCalledWith('Saved successfully')
    } finally {
      window.removeEventListener('account-updated', events)
    }
  })
  it('preserves AD restrictions and sends the raw password with the existing text protocol', async () => {
    await open({ authMode: 'AD' })
    await setLocale('en-US', { persist: false })
    expect(wrapper.find('[data-disabled="true"]').text()).toContain('Change password')
    const vm = state()
    vm.authMode = ''
    vm.passwordForm.password = '中文Password123!'
    vm.passwordForm.confirmPassword = '中文Password123!'
    api.post.mockResolvedValue({})
    await vm.handleChangePassword()
    const [url, raw, options] = api.post.mock.calls[0]
    expect(url).toBe('/api/account/change-password')
    expect(raw).toBe('中文Password123!')
    expect(options.headers['Content-Type']).toBe('text/plain')
    expect(options.transformRequest[0](raw)).toBe(raw)
    expect(api.success).toHaveBeenLastCalledWith('Password changed successfully')
    expect(vm.passwordForm.password).toBe('')
  })
})
