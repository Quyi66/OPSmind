import { createRequire } from 'node:module'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { setLocale } from '@/core/i18n'
import { useSoftwareListRead } from '@/modules/software/composables/useSoftwareListRead'
import RepoManagement from '@/modules/software/views/RepoManagementPage.vue'
import RepoAdd from '@/modules/software/components/repo/RepoAddDialog.vue'
import ConfigHosts from '@/modules/software/components/repo/ConfigRepoToHostDialog.vue'
import Installed from '@/modules/software/views/InstalledPackagesPage.vue'
import SoftwareHome from '@/modules/software/views/SoftwareHomePage.vue'
import HostDetail from '@/modules/software/components/overview/HostDetailDialog.vue'

const { ElForm, ElFormItem } = createRequire(import.meta.url)(
  'element-plus/lib/components/form/index.js'
)
const mocks = vi.hoisted(() => ({
  repo: Object.fromEntries(
    [
      'getRepoList',
      'getRepoDefaultHosts',
      'getRepoInfoByRefid',
      'getPackageMachineList',
      'saveCustomRepo',
      'configRepoToHosts'
    ].map(key => [key, vi.fn()])
  ),
  host: Object.fromEntries(
    [
      'getMachineInfo',
      'getMachineRepos',
      'getMachineAvailablePackages',
      'getMachineInstalledPackages',
      'toggleRepoStatus'
    ].map(key => [key, vi.fn()])
  ),
  pkg: { getAllInstalledPackages: vi.fn(), getPackageMachineList: vi.fn() },
  stats: { getStats: vi.fn() },
  success: vi.fn(),
  startPolling: vi.fn(),
  stopPolling: vi.fn(),
  push: vi.fn()
}))
vi.mock('@/modules/software/api', () => ({
  repoApi: mocks.repo,
  hostOverviewApi: mocks.host,
  packageApi: mocks.pkg,
  softwareStatsApi: mocks.stats
}))
vi.mock('element-plus', () => ({
  ElMessage: { success: mocks.success, error: vi.fn(), warning: vi.fn(), info: vi.fn() },
  ElMessageBox: { confirm: vi.fn().mockResolvedValue('confirm') }
}))
vi.mock('@/composables/useJobPolling', () => ({
  useJobPolling: () => ({ startPolling: mocks.startPolling, stopPolling: mocks.stopPolling })
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('@/modules/software/components/overview/HostOverviewTable.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/software/components/overview/AvailablePackagesTable.vue', () => ({
  default: { template: '<div />' }
}))
const wrappers = []
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const raw = value => JSON.parse(JSON.stringify(value))
const baseRepo = {
  refid: 'repo-ref',
  repo_id: 'repo-id',
  repo_name: '后端中文仓库',
  repo_status: '启用',
  repo_file: 'original.repo'
}
const global = {
  stubs: {
    'el-dialog': Slot,
    'el-form': Slot,
    'el-form-item': Slot,
    'el-select': Slot,
    'el-option': {
      props: ['label', 'value'],
      template: '<option :value="value">{{label}}</option>'
    },
    'el-tabs': Slot,
    'el-tab-pane': Slot,
    'el-table': true,
    'el-table-column': true,
    'el-tag': Slot,
    'el-tooltip': Slot,
    'el-collapse': Slot,
    'el-collapse-item': Slot
  },
  directives: { loading() {} }
}
async function open(component, props = {}, realForm = false) {
  const wrapper = (realForm ? mount : shallowMount)(component, {
    props,
    global: realForm
      ? {
          ...global,
          stubs: {
            ...global.stubs,
            'el-form': ElForm,
            'el-form-item': ElFormItem,
            'el-input': true,
            'el-input-number': true,
            'el-switch': true
          }
        }
      : global
  })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, vm: wrapper.vm.$.setupState }
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
  mocks.repo.getRepoList.mockResolvedValue({ data: { records: [baseRepo], total: 21 } })
  mocks.repo.getRepoDefaultHosts.mockResolvedValue({ data: { records: [] } })
  mocks.repo.saveCustomRepo.mockResolvedValue({ data: [{ status: 'COMPLETED' }] })
  mocks.repo.configRepoToHosts.mockResolvedValue({ data: { status: 'COMPLETED' } })
  mocks.pkg.getAllInstalledPackages.mockResolvedValue({
    data: {
      records: [{ pkg_id: 'package-id', pkg_name: '中文包', available_pkg_version: '无' }],
      total: 21
    }
  })
  mocks.pkg.getPackageMachineList.mockResolvedValue({ data: { records: [], total: 0 } })
  mocks.stats.getStats.mockResolvedValue({
    data: {
      records: [
        { name: 'scan_count_host', value: 15 },
        { name: 'scan_count_repos', value: 6 }
      ]
    }
  })
  for (const key of [
    'getMachineInfo',
    'getMachineRepos',
    'getMachineAvailablePackages',
    'getMachineInstalledPackages'
  ])
    mocks.host[key].mockResolvedValue({ data: { records: [], total: 0 } })
  mocks.host.toggleRepoStatus.mockResolvedValue({ data: { runId: 'original-run' } })
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  await setLocale('zh-CN', { persist: false })
})

describe('Yum configuration and software i18n', () => {
  it('updates stale-read explanations without retrying or changing the successful query', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ records: [baseRepo], total: 1 })
      .mockRejectedValueOnce(new Error('后端原文'))
      .mockResolvedValue({ records: [baseRepo], total: 1 })
    let read
    const wrapper = shallowMount(
      defineComponent({
        setup() {
          read = useSoftwareListRead(fetch)
          return () => null
        }
      })
    )
    wrappers.push(wrapper)
    const params = { status: 'enabled', page: 2, size: 20 }
    await read.load(params)
    await read.load(params)
    expect(read.error.value).toBe('read')
    expect(read.rows.value).toEqual([baseRepo])
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(read.errorMessage.value).toContain('last successful results may be outdated')
    expect(read.canUseRows.value).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(2)
    await read.retry()
    expect(fetch).toHaveBeenLastCalledWith(params)
  })

  it('keeps baseline selection, active tab, page and backend status strings', async () => {
    const { vm } = await open(RepoManagement)
    vm.selectedBaseRepos = [baseRepo]
    vm.baseRepoPage = 2
    vm.activeTab = 'baseRepo'
    const calls = mocks.repo.getRepoList.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.tabs[0].label).toBe('Baseline repository')
    expect(vm.baseRepoPage).toBe(2)
    expect(vm.selectedBaseRepos).toEqual([baseRepo])
    expect(vm.baseRepoData[0].repo_status).toBe('启用')
    expect(mocks.repo.getRepoList).toHaveBeenCalledTimes(calls)
    expect(mocks.repo.configRepoToHosts).not.toHaveBeenCalled()
  })

  it('refreshes only existing repo-name validation and keeps channel drafts and original save payload', async () => {
    const { wrapper, vm } = await open(RepoAdd, { modelValue: false }, true)
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    await expect(vm.formRef.validateField('repoName')).rejects.toBeTruthy()
    const invalid = vm.formRef.fields.find(field => field.prop === 'repoName')
    const untouched = vm.formRef.fields.find(field => field.prop === 'repoFile')
    Object.assign(vm.channels[0], {
      name: 'os',
      baseurls: ['https://example.test/中文/$basearch'],
      enabled: false
    })
    vm.addChannel()
    Object.assign(vm.channels[1], { name: 'updates', baseurls: ['file:///原目录/updates'] })
    const channels = raw(vm.channels),
      expanded = raw(vm.activeKeys)
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(invalid.validateMessage).toBe('Enter a repository name')
    expect(untouched.validateState).toBe('')
    expect(raw(vm.channels)).toEqual(channels)
    expect(raw(vm.activeKeys)).toEqual(expanded)
    Object.assign(vm.formData, {
      repoName: 'raw-repo',
      repoFile: 'local.repo',
      repoDesc: '用户中文描述'
    })
    const payloadChannels = vm.buildChannels()
    expect(mocks.repo.saveCustomRepo).not.toHaveBeenCalled()
    await vm.handleSubmit()
    expect(mocks.repo.saveCustomRepo).toHaveBeenCalledExactlyOnceWith({
      id: null,
      repoName: 'raw-repo',
      repoFile: 'local',
      repoDesc: '用户中文描述',
      repoUrl: '',
      channels: JSON.stringify(payloadChannels)
    })
  })

  it.each(['base', 'custom'])(
    'keeps %s repository IDs and target hosts when configuring',
    async repoType => {
      const repos = [{ ...baseRepo, id: 'config-id' }]
      const { vm } = await open(ConfigHosts, { modelValue: true, repoType, selectedRepos: repos })
      const hosts = [{ key: 'raw-host', value: '原始主机', assetType: 'linux' }]
      await setLocale('en-US', { persist: false })
      await flushPromises()
      expect(vm.configDescription).toContain('1 repository configurations selected')
      expect(mocks.repo.configRepoToHosts).not.toHaveBeenCalled()
      await vm.handleSubmit(hosts)
      expect(mocks.repo.configRepoToHosts).toHaveBeenCalledExactlyOnceWith({
        hosts,
        repoIds: repoType === 'base' ? 'repo-ref' : null,
        repoConfigIds: repoType === 'base' ? null : 'config-id'
      })
    }
  )

  it('translates an upgrade filter label while retaining its Chinese API value and open detail identity', async () => {
    const { wrapper, vm } = await open(Installed)
    vm.filterParams.keyword = '中文包'
    vm.pagination.page = 2
    vm.openDetail(vm.tableData[0])
    await flushPromises()
    const calls = mocks.pkg.getAllInstalledPackages.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    const option = wrapper.findAll('option').find(option => option.text() === 'Upgradable')
    expect(option.element.value).toBe('可升级')
    expect(vm.filterParams.availablePkg).toEqual(['all', '可升级'])
    expect(vm.detailTitle).toBe('Target hosts - 中文包')
    expect(vm.currentDetailPkgId).toBe('package-id')
    expect(vm.pagination.page).toBe(2)
    expect(mocks.pkg.getAllInstalledPackages).toHaveBeenCalledTimes(calls)
    vm.handleReset()
    await flushPromises()
    expect(mocks.pkg.getAllInstalledPackages.mock.lastCall[0].availablePkg).toBe('all,可升级')
  })

  it('updates loaded KPI labels while keeping counts and original route targets', async () => {
    const { vm } = await open(SoftwareHome)
    vm.activeTab = 'packages'
    const values = vm.statsData.map(item => item.value)
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.statsData[0].name).toBe('Scanned hosts')
    expect(vm.statsData.map(item => item.value)).toEqual(values)
    expect(vm.activeTab).toBe('packages')
    expect(mocks.stats.getStats).toHaveBeenCalledTimes(1)
    vm.handleKpiClick(vm.statsData[1])
    expect(mocks.push).toHaveBeenCalledWith('/yum-repo/repos')
  })

  it('uses the current language when a previously started host operation finishes', async () => {
    const { wrapper, vm } = await open(HostDetail, {
      modelValue: false,
      hostId: 'raw-host',
      hostKey: '原始主机'
    })
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    await vm.handleEnableRepo(baseRepo, 0)
    expect(mocks.startPolling).toHaveBeenCalledTimes(1)
    const [runId, callbacks] = mocks.startPolling.mock.calls[0]
    expect(runId).toBe('original-run')
    await setLocale('en-US', { persist: false })
    await flushPromises()
    callbacks.onSuccess({ status: 'COMPLETED' })
    expect(mocks.success).toHaveBeenLastCalledWith('Enabled successfully')
    expect(mocks.host.toggleRepoStatus).toHaveBeenCalledTimes(1)
    expect(mocks.startPolling).toHaveBeenCalledTimes(1)
  })
})
