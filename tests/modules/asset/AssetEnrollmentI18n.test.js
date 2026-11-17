import { createRequire } from 'node:module'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'
import AutoEntryDialog from '@/modules/asset/components/asset-info/AutoEntryDialog.vue'
import DeviceManageDialog from '@/modules/asset/components/automation/DeviceManageDialog.vue'

const { ElForm, ElFormItem } = createRequire(import.meta.url)(
  'element-plus/lib/components/form/index.js'
)
const api = vi.hoisted(() => ({
  groups: vi.fn(),
  model: vi.fn(),
  instances: vi.fn(),
  engine: vi.fn(),
  configs: vi.fn(),
  get: vi.fn(),
  post: vi.fn()
}))
vi.mock('@/core/api', () => ({ apiService: { get: api.get, post: api.post } }))
vi.mock('@/modules/asset/api', () => ({
  assetApi: { getGroupByCit: api.groups, getModel: api.model },
  automationApi: {
    getInstanceGroupList: api.instances,
    getScriptEngine: api.engine,
    getAllAssetAutoConfigOptions: api.configs
  }
}))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() }
}))
const wrappers = []
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
async function open(component, props = {}) {
  const wrapper = mount(component, {
    props: { modelValue: false, ...props },
    global: {
      stubs: {
        'el-dialog': Slot,
        'el-form': ElForm,
        'el-form-item': ElFormItem,
        'el-tabs': Slot,
        'el-tab-pane': Slot,
        AcmDeviceSelector: true
      },
      directives: { loading() {} }
    }
  })
  wrappers.push(wrapper)
  await wrapper.setProps({ modelValue: true })
  await flushPromises()
  return wrapper
}
beforeEach(async () => {
  vi.clearAllMocks()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  api.groups.mockResolvedValue({ records: [{ id: 'raw-group-id', path: '/后端中文分组' }] })
  api.model.mockResolvedValue({
    records: [{ code: '负责人', title: '后端中文属性', editable: true, type: 'string' }]
  })
  api.instances.mockResolvedValue(['原始执行节点'])
  api.engine.mockResolvedValue({ value: 'ansible' })
  api.configs.mockResolvedValue([{ id: 'raw-template-id', name: '后台模板名称' }])
  api.get.mockResolvedValue({ data: [{ code: 'linux', title: '后台类型名称' }] })
  api.post.mockResolvedValue({})
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(w => w.unmount())
  vi.unstubAllGlobals()
  await setLocale('zh-CN', { persist: false })
})
describe('asset enrollment localization preserves execution input', () => {
  it('keeps IP text, raw attribute keys and execution node codes while updating an existing validation error', async () => {
    const wrapper = await open(AutoEntryDialog, { assetType: 'custom-ci-type' })
    const vm = wrapper.vm.$.setupState
    vm.formData.groupId = 'raw-group-id'
    vm.formData.attr = '负责人'
    vm.formData.value = '原始中文负责人'
    vm.formData.instanceGroup = '原始执行节点'
    await vm.formRef.validateField('hostKeys').catch(() => {})
    await setLocale('en-US', { persist: false })
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.text()).toContain('Enter IP addresses'))
    expect(vm.instanceGroupOptions[0].label).toBe('Unspecified (none)')
    expect(vm.instanceGroupOptions[0].value).toBe('none')
    expect(vm.formData.groupId).toBe('raw-group-id')
    expect(api.groups).toHaveBeenCalledExactlyOnceWith('custom-ci-type')
    expect(api.model).toHaveBeenCalledExactlyOnceWith('custom-ci-type')
    expect(api.instances).toHaveBeenCalledTimes(1)
    expect(api.post).not.toHaveBeenCalled()
    vm.formData.hostKeys = '192.0.2.1\n192.0.2.2'
    await vm.handleSave()
    expect(api.post.mock.calls[0][0]).toMatch(
      /\/workflow\/api\/workflow\/jobs\/0MKtcJ\/run\?cacheBuster=/
    )
    expect(api.post.mock.calls[0][1]).toEqual({
      params: {
        hostKeys: '192.0.2.1\\n192.0.2.2',
        ciType: 'custom-ci-type',
        instanceGroup: '原始执行节点',
        groupId: 'raw-group-id',
        code: '负责人',
        value: '原始中文负责人',
        aapInstanceGroup: ''
      }
    })
    expect(wrapper.emitted('saved')).toHaveLength(1)
  })
  it('retains selected hosts, credential drafts and backend template IDs for password enrollment', async () => {
    const wrapper = await open(DeviceManageDialog),
      vm = wrapper.vm.$.setupState
    const host = {
      key: 'raw-host-id',
      value: '192.0.2.1',
      assetType: 'custom-ci-type',
      runType: 'all'
    }
    Object.assign(vm.passwordForm, {
      hosts: [host],
      instanceGroup: '原始执行节点',
      ansibleVarsSetId: 'raw-template-id',
      loginUser: '中文登录用户',
      loginPasswd: '原始密码@#{raw}',
      runUser: '原始执行用户',
      runPasswd: '原始执行密码',
      aapInstanceGroup: ''
    })
    const draft = vm.passwordForm
    for (const locale of ['en-US', 'zh-CN', 'en-US']) {
      await setLocale(locale, { persist: false })
      await flushPromises()
      expect(vm.activeTab).toBe('password')
      expect(vm.passwordForm).toBe(draft)
      expect(vm.passwordForm.hosts[0]).toEqual(host)
      expect(api.engine).toHaveBeenCalledTimes(1)
      expect(api.configs).toHaveBeenCalledTimes(1)
      expect(api.post).not.toHaveBeenCalled()
    }
    await vm.handlePasswordSubmit()
    expect(api.post.mock.calls[0][0]).toMatch(/\/jobs\/eGfsxb\/run\?cacheBuster=/)
    expect(api.post.mock.calls[0][1]).toEqual({
      params: {
        hostKeys: [{ key: 'raw-host-id', value: '192.0.2.1', assetType: 'custom-ci-type' }],
        ansibleVarsSetId: 'raw-template-id',
        runUser: '原始执行用户',
        runPasswd: '原始执行密码',
        loginUser: '中文登录用户',
        loginPasswd: '原始密码@#{raw}',
        instanceGroup: '原始执行节点',
        aapInstanceGroup: ''
      }
    })
  })

  it('translates the AAP instance group label and keeps the selected backend name', async () => {
    api.engine.mockResolvedValueOnce({ value: 'aap' })
    api.get.mockResolvedValueOnce({ data: { records: [{ name: '原始 AAP 实例组' }] } })
    const wrapper = await open(DeviceManageDialog)
    const vm = wrapper.vm.$.setupState
    vm.passwordForm.aapInstanceGroup = '原始 AAP 实例组'
    expect(wrapper.text()).toContain('AAP 实例组')
    expect(vm.aapInstanceGroupOptions).toEqual([{ name: '原始 AAP 实例组' }])

    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.text()).toContain('AAP instance group')
    expect(vm.passwordForm.aapInstanceGroup).toBe('原始 AAP 实例组')
    expect(api.get.mock.calls.filter(([path]) => path.endsWith('/aap/instance_group'))).toHaveLength(1)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('preserves SSH tab, original host IDs and unmodified public key contents', async () => {
    const wrapper = await open(DeviceManageDialog),
      vm = wrapper.vm.$.setupState
    vm.activeTab = 'ssh'
    Object.assign(vm.sshForm, {
      hosts: [{ key: 'original-host-id', value: '192.0.2.2' }],
      oplus_ansible_ssh_user: '原始目标用户',
      ansible_ssh_user: '原始登录用户',
      ansible_ssh_pass: '原始密码',
      oplus_ssh_pub_key: 'ssh-ed25519 RAW-PUBLIC-KEY 中文注释'
    })
    const draft = vm.sshForm
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.activeTab).toBe('ssh')
    expect(vm.sshForm).toBe(draft)
    expect(api.post).not.toHaveBeenCalled()
    await vm.handleSSHSubmit()
    expect(api.post.mock.calls[0][0]).toMatch(/\/jobs\/p2AW5s\/run\?cacheBuster=/)
    expect(api.post.mock.calls[0][1]).toEqual({
      params: {
        hosts: ['original-host-id'],
        oplus_ansible_ssh_user: '原始目标用户',
        ansible_ssh_user: '原始登录用户',
        ansible_ssh_pass: '原始密码',
        oplus_ssh_pub_key: 'ssh-ed25519 RAW-PUBLIC-KEY 中文注释'
      }
    })
  })
})
