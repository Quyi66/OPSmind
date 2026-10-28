import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import RepoManagementPage from '@/modules/software/views/RepoManagementPage.vue'
import RepoDetailDialog from '@/modules/software/components/repo/RepoDetailDialog.vue'

const mocks = vi.hoisted(() => ({
  repoApi: {
    getRepoList: vi.fn(),
    getRepoDefaultHosts: vi.fn(),
    getRepoInfoByRefid: vi.fn(),
    getPackageMachineList: vi.fn(),
    removeRepoFromHost: vi.fn(),
    configRepoToHosts: vi.fn()
  },
  startRepoScan: vi.fn(),
  confirm: vi.fn(),
  success: vi.fn(),
  warning: vi.fn()
}))
vi.mock('@/modules/software/api', () => ({
  repoApi: mocks.repoApi,
  scanApi: { startRepoScan: mocks.startRepoScan }
}))
vi.mock('element-plus', () => ({
  ElMessage: { success: mocks.success, warning: mocks.warning },
  ElMessageBox: { confirm: mocks.confirm }
}))

const wrappers = []
const global = {
  renderStubDefaultSlot: true,
  stubs: {
    'el-button': {
      name: 'ElButton',
      props: ['disabled'],
      emits: ['click'],
      template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
    },
    ElTooltip: {
      name: 'ElTooltip',
      props: ['content'],
      template: '<div :title="content"><slot /></div>'
    },
    ElTable: { name: 'ElTable', emits: ['selection-change'], template: '<div><slot /></div>' },
    ElPagination: { template: '<div />' },
    ElLink: { template: '<span><slot /></span>' },
    ElTableColumn: { template: '<div />' },
    ElAlert: { template: '<div><slot name="title" /><slot /></div>' },
    ElForm: { template: '<div><slot /></div>' },
    ElFormItem: { template: '<div><slot /></div>' },
    'el-form': { template: '<div><slot /></div>' },
    'el-form-item': { template: '<div><slot /></div>' },
    ElIcon: { template: '<span><slot /></span>' },
    ElCheckboxGroup: { template: '<div><slot /></div>' },
    ElCheckbox: { template: '<div><slot /></div>' },
    ElTag: { template: '<span><slot /></span>' },
    ConfigRepoToHostDialog: {
      name: 'ConfigRepoToHostDialog',
      props: ['modelValue', 'selectedRepos'],
      template: '<div />'
    },
    RepoDetailDialog: { template: '<div />' }
  },
  directives: { loading: () => {} }
}
function mount(component, props = {}) {
  const wrapper = shallowMount(component, { props, global })
  wrappers.push(wrapper)
  return wrapper
}
function button(wrapper, text) {
  return wrapper.findAllComponents({ name: 'ElButton' }).find(item => item.text().includes(text))
}
async function openDetail() {
  const wrapper = mount(RepoDetailDialog, { refid: 'repo-ref-1', repoId: 'display-repo' })
  await wrapper.setProps({ modelValue: true })
  await flushPromises()
  return wrapper
}
function expectNoExecution() {
  expect(mocks.confirm).not.toHaveBeenCalled()
  expect(mocks.success).not.toHaveBeenCalled()
  expect(mocks.startRepoScan).not.toHaveBeenCalled()
  expect(mocks.repoApi.removeRepoFromHost).not.toHaveBeenCalled()
  expect(mocks.repoApi.configRepoToHosts).not.toHaveBeenCalled()
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.confirm.mockResolvedValue('confirm')
  mocks.repoApi.getRepoList.mockResolvedValue({ data: { records: [], total: 0 } })
  mocks.repoApi.getRepoDefaultHosts.mockResolvedValue({
    data: { records: [{ hostIds: 'base-host-1' }] }
  })
  mocks.repoApi.getRepoInfoByRefid.mockResolvedValue({
    data: { records: [{ refid: 'repo-ref-1', repo_file: 'existing.repo' }] }
  })
  mocks.repoApi.getPackageMachineList.mockResolvedValue({
    data: { records: [{ host_id: 'host-1', host_key: '192.0.2.1' }], total: 1 }
  })
})
afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()))

describe('仓库未接通操作的反馈真实性', () => {
  it.each(['base-host-1', ''])(
    'keeps rescan unavailable with default hosts %j and explains why',
    async hosts => {
      mocks.repoApi.getRepoDefaultHosts.mockResolvedValueOnce({
        data: { records: [{ hostIds: hosts }] }
      })
      const wrapper = mount(RepoManagementPage)
      await flushPromises()
      expect(button(wrapper, '重新扫描仓库信息').element.disabled).toBe(true)
      expect(
        wrapper
          .findAllComponents({ name: 'ElTooltip' })
          .some(item => item.props('content').includes('暂不支持重新扫描仓库信息'))
      ).toBe(true)
      expectNoExecution()
    }
  )

  it('rejects direct rescan invocation without confirming, reporting success or refreshing data', async () => {
    const wrapper = mount(RepoManagementPage)
    await flushPromises()
    wrapper.vm.handleRescanRepoInfo()
    await flushPromises()
    expect(mocks.warning).toHaveBeenCalledWith('当前页面暂不支持重新扫描仓库信息，未提交扫描任务')
    expect(mocks.repoApi.getRepoList).toHaveBeenCalledTimes(1)
    expectNoExecution()
  })

  it('keeps removal unavailable after selecting actual host IDs and provides an explanation', async () => {
    const wrapper = await openDetail()
    wrapper
      .findComponent({ name: 'ElTable' })
      .vm.$emit('selection-change', [{ host_id: 'host-1', host_key: '192.0.2.1' }])
    await flushPromises()
    expect(button(wrapper, '移除主机配置').element.disabled).toBe(true)
    expect(wrapper.findComponent({ name: 'ElTooltip' }).props('content')).toContain(
      '暂不支持移除主机配置'
    )
    expect(mocks.repoApi.getPackageMachineList).toHaveBeenCalledWith({
      refid: 'repo-ref-1',
      page: 1,
      size: 10
    })
    expectNoExecution()
  })

  it('rejects direct removal invocation without refreshing, emitting success or changing selection', async () => {
    const wrapper = await openDetail()
    const hosts = [{ host_id: 'host-1', host_key: '192.0.2.1' }]
    wrapper.findComponent({ name: 'ElTable' }).vm.$emit('selection-change', hosts)
    await flushPromises()
    wrapper.vm.handleRemoveRepoFromHost()
    await flushPromises()
    expect(mocks.warning).toHaveBeenCalledWith('当前页面暂不支持移除主机配置，未移除任何配置')
    expect(wrapper.vm.selectedRows).toEqual(hosts)
    expect(wrapper.emitted('refresh')).toBeUndefined()
    expect(mocks.repoApi.getPackageMachineList).toHaveBeenCalledTimes(1)
    expectNoExecution()
  })

  it('preserves the existing configure-to-host selection and manual dialog entry', async () => {
    const wrapper = mount(RepoManagementPage)
    await flushPromises()
    expect(button(wrapper, '配置到主机').element.disabled).toBe(true)
    const repos = [{ refid: 'repo-ref-1', repo_id: 'display-repo' }]
    wrapper.findComponent({ name: 'ElTable' }).vm.$emit('selection-change', repos)
    await flushPromises()
    await button(wrapper, '配置到主机').trigger('click')
    const dialog = wrapper.findComponent({ name: 'ConfigRepoToHostDialog' })
    expect(dialog.props()).toMatchObject({ modelValue: true, selectedRepos: repos })
    expectNoExecution()
  })
})
