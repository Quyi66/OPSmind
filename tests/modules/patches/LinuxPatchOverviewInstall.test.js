import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { ElTable, ElTableColumn } from 'element-plus'
import Overview from '@/modules/patches/views/LinuxPatchScanPage.vue'
import Workbench from '@/modules/patches/components/LinuxPatchInstallWorkbench.vue'
import DeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'

const api = vi.hoisted(() => ({
  hosts: vi.fn(),
  patches: vi.fn(),
  affectedHosts: vi.fn(),
  stats: vi.fn(),
  vulnerabilities: vi.fn(),
  execute: vi.fn(),
  route: { name: 'patches-machineScan', query: {} },
  push: vi.fn(),
  replace: vi.fn()
}))
vi.mock('vue-echarts', () => ({ default: { template: '<div />' } }))
vi.mock('vue-router', () => ({
  useRoute: () => api.route,
  useRouter: () => ({ push: api.push, replace: api.replace })
}))
vi.mock('element-plus', async importOriginal => ({
  ...(await importOriginal()),
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() }
}))
vi.mock('@/modules/automation/api/jao', () => ({
  executeJob: api.execute,
  getExecuteResult: vi.fn()
}))
vi.mock('@/modules/patches/api', () => ({
  patchScanApi: { getScanResults: api.hosts },
  patchInstallApi: { getAvailablePatches: api.patches, getMachinesByPatch: api.affectedHosts },
  patchOverviewApi: { getIndexStats: api.stats },
  rpmInfoApi: {},
  vulnerabilityApi: {
    getVulnerabilityList: api.vulnerabilities,
    getOsDistroList: vi.fn().mockResolvedValue({}),
    getOsVersionList: vi.fn().mockResolvedValue({})
  }
}))
vi.mock('@/modules/asset/api', () => ({
  assetApi: {
    getAssetList: vi.fn().mockResolvedValue({ records: [{ IP: '192.0.2.1', needReboot: 1 }] })
  },
  dataManageApi: { getAllTags: vi.fn().mockResolvedValue({ records: [] }) }
}))
vi.mock('@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue', () => ({
  default: { name: 'AcmDeviceSelector', props: ['modelValue', 'disabled'], template: '<div />' }
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteHistoryDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/components/logs/OperationLogsDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/components/host-detail/dialogs/BatchInstallPatchDrawer.vue', () => ({
  default: { name: 'BatchInstallPatchDrawer', props: ['visible', 'hosts'], template: '<div />' }
}))
vi.mock('@/modules/patches/components/patch-task/wizard/PatchInstallWizard.vue', () => ({
  default: {
    name: 'PatchInstallWizard',
    props: ['visible', 'patchesToInstall'],
    template: '<div />'
  }
}))
vi.mock('@/modules/patches/components/patch-task/schedule/PatchScheduleInstallDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/components/host-detail/dialogs/HostSeverityPatchDialog.vue', () => ({
  default: {
    name: 'HostSeverityPatchDialog',
    props: ['visible', 'host', 'severity'],
    template: '<div />'
  }
}))

const hosts = [
  { host_id: 'host/A', host_key: '192.0.2.1', num_critical: 2 },
  { host_id: 'host/B', host_key: '192.0.2.2' }
]
const patch = { patch_id: 'patch/A', effect_host_count: 1 }
const Dialog = {
  props: ['modelValue', 'title'],
  emits: ['update:modelValue'],
  template:
    '<section v-if="modelValue"><h2>{{ title }}</h2><slot /><slot name="footer" /></section>'
}
let wrapper
const button = text => wrapper.findAll('button').find(item => item.text() === text)
const workbench = () => wrapper.findComponent(Workbench)
const state = () => workbench().vm.$.setupState
async function open(component = Overview) {
  wrapper = mount(component, {
    global: {
      components: { ElTable, ElTableColumn },
      stubs: {
        'el-table': ElTable,
        'el-table-column': ElTableColumn,
        'el-dialog': Dialog,
        'el-form': { template: '<form><slot /></form>' },
        'el-form-item': { template: '<div><slot /></div>' },
        'el-button': {
          props: ['disabled'],
          template: '<button :disabled="disabled"><slot /></button>'
        },
        'el-link': { template: '<button><slot /></button>' },
        ...Object.fromEntries(
          ['ElForm', 'ElFormItem', 'ElIcon', 'ElTag'].map(name => [
            name,
            { template: '<div><slot /></div>' }
          ])
        ),
        ...Object.fromEntries(
          [
            'ElSelect',
            'ElInput',
            'ElOption',
            'ElPagination',
            'ElEmpty',
            'v-chart',
            'PatchDetailDialog',
            'RpmPackageDetailDialog',
            'CveLinkList',
            'ElPopover',
            'ElTooltip',
            'ElBadge'
          ].map(name => [name, true])
        )
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
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
  api.route.query = {}
  api.execute.mockReset().mockResolvedValue({ data: [{ runId: 'scan/run-1' }] })
  api.hosts.mockReset().mockResolvedValue({ data: { records: hosts.map(host => ({ ...host })) } })
  api.patches.mockReset().mockResolvedValue({ data: { records: [patch] } })
  api.affectedHosts
    .mockReset()
    .mockResolvedValue({ data: { records: [{ hostId: 'host/A', hostKey: '192.0.2.1' }] } })
  api.stats.mockResolvedValue({ data: { records: [] } })
  api.vulnerabilities.mockResolvedValue({ data: { content: [] } })
})
afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
})

describe('Linux 默认概览直接安装', () => {
  it('单台安装直接打开原抽屉并传原主机，不导航也不提交任务', async () => {
    await open()
    expect(wrapper.text()).not.toContain('前往安装补丁')
    expect(api.hosts).toHaveBeenCalledTimes(1)
    expect(api.hosts).toHaveBeenCalledWith({
      page: 0,
      size: 10000,
      os_distro: '',
      os_version: '',
      os_sp_version: '',
      tags: [],
      keyword: ''
    })
    expect(state().allHostData[0].need_reboot).toBe(1)
    await button('安装补丁').trigger('click')
    const drawer = workbench().findComponent({ name: 'BatchInstallPatchDrawer' })
    expect(drawer.props('visible')).toBe(true)
    expect(drawer.props('hosts').map(host => host.host_id)).toEqual(['host/A'])
    expect(api.push).not.toHaveBeenCalled()
    expect(api.replace).not.toHaveBeenCalled()
    expect(workbench().findComponent({ name: 'PatchInstallWizard' }).props('visible')).toBe(false)
  })

  it('批量安装保持目标快照；明细往返保留选择和安装视角', async () => {
    await open()
    const table = state().hostTableRef
    table.toggleRowSelection(state().allHostData[0], true)
    table.toggleRowSelection(state().allHostData[1], true)
    await nextTick()
    // Element Plus 的程序选择不发 select，模拟用户勾选的公开事件。
    workbench().findComponent(ElTable).vm.$emit('select', state().allHostData)
    await nextTick()
    await button('安装选中主机补丁 (2)').trigger('click')
    expect(state().installTargetHosts.map(host => host.host_id)).toEqual(['host/A', 'host/B'])
    state().batchInstallDrawerVisible = false
    await button('按补丁安装').trigger('click')
    await flushPromises()
    await button('漏洞明细').trigger('click')
    await flushPromises()
    expect(api.vulnerabilities).toHaveBeenCalled()
    await button('返回补丁安装').trigger('click')
    await nextTick()
    expect(state().activeTab).toBe('patch')
    expect(state().batchSelectedHosts).toHaveLength(2)
    expect(api.push).not.toHaveBeenCalled()
    expect(api.replace).not.toHaveBeenCalled()
  })

  it('严重级别沿用原主机弹窗，统计卡片直接展示', async () => {
    await open()
    expect(wrapper.find('.stats-dashboard').exists()).toBe(true)
    await wrapper.find('button[title="查看严重补丁"]').trigger('click')
    const dialog = workbench().findComponent({ name: 'HostSeverityPatchDialog' })
    expect(dialog.props()).toMatchObject({
      visible: true,
      host: { host_id: 'host/A' },
      severity: 'Critical'
    })
  })

  it('受影响主机仅查询，明确安装后才打开原补丁向导', async () => {
    await open()
    await button('按补丁安装').trigger('click')
    await flushPromises()
    await button('1').trigger('click')
    await flushPromises()
    expect(api.affectedHosts).toHaveBeenCalledWith({
      patch_ids: ['patch/A'],
      hostId: '@@(linux)',
      groupIds: []
    })
    const wizard = workbench().findComponent({ name: 'PatchInstallWizard' })
    expect(wizard.props('visible')).toBe(false)
    await button('安装此补丁').trigger('click')
    expect(wizard.props('visible')).toBe(true)
    expect(wizard.props('patchesToInstall')).toEqual([patch])
  })

  it('查看主机的旧响应不会污染新弹窗，最新失败可重试', async () => {
    await open()
    let resolveOld
    api.affectedHosts.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveOld = resolve
        })
    )
    state().handleViewAffectedHosts(patch)
    await nextTick()
    state().affectedHostsVisible = false
    state().handleViewAffectedHosts({ patch_id: 'patch/B' })
    await flushPromises()
    resolveOld({ data: { records: [{ hostId: 'old' }] } })
    await flushPromises()
    expect(state().affectedHosts[0].hostId).toBe('host/A')
    api.affectedHosts.mockRejectedValueOnce(new Error('offline'))
    state().handleViewAffectedHosts(patch)
    await flushPromises()
    expect(state().affectedHostsError).toContain('失败')
    expect(button('安装此补丁').attributes('disabled')).toBeDefined()
    await button('重试').trigger('click')
    await flushPromises()
    expect(state().affectedHostsError).toBe('')
  })

  it('旧安装链接的按补丁参数进入概览后仍落在补丁视角', async () => {
    api.route.query = { tab: ['patch'] }
    await open()
    expect(state().activeTab).toBe('patch')
    expect(api.hosts).not.toHaveBeenCalled()
    expect(api.patches).toHaveBeenCalledOnce()
  })

  it('列表多选预填扫描确认，取消不提交也不改变安装选择', async () => {
    await open()
    await button('一键全选').trigger('click')
    await button('扫描选中主机 (2)').trigger('click')
    const selector = wrapper.findComponent(DeviceSelector)
    expect(selector.props('modelValue').map(host => [host.key, host.value])).toEqual([
      ['host/A', '192.0.2.1'],
      ['host/B', '192.0.2.2']
    ])
    expect(api.execute).not.toHaveBeenCalled()
    await button('取消').trigger('click')
    expect(state().batchSelectedHosts).toHaveLength(2)
    await button('清空选择').trigger('click')
    await button('扫描补丁').trigger('click')
    expect(wrapper.findComponent(DeviceSelector).props('modelValue')).toEqual([])
    expect(button('开始扫描').attributes('disabled')).toBeDefined()
    expect(api.execute).not.toHaveBeenCalled()
  })

  it('行内扫描只预填当前主机，确认使用原任务和真实主机 ID', async () => {
    await open()
    await button('一键全选').trigger('click')
    await wrapper
      .findAll('button')
      .filter(item => item.text() === '扫描')[1]
      .trigger('click')
    const selector = wrapper.findComponent(DeviceSelector)
    expect(selector.props('modelValue')).toHaveLength(1)
    expect(selector.props('modelValue')[0]).toMatchObject({ key: 'host/B', value: '192.0.2.2' })
    expect(api.execute).not.toHaveBeenCalled()
    await button('开始扫描').trigger('click')
    await flushPromises()
    expect(api.execute).toHaveBeenCalledExactlyOnceWith({
      jobId: '0g3GfW',
      params: { hosts: [{ key: 'host/B', value: '192.0.2.2', assetType: 'linux' }] }
    })
    expect(state().batchSelectedHosts).toHaveLength(2)
  })

  it('批量扫描带全部已选 ID，进行中锁定入口，失败保留确认目标', async () => {
    await open()
    await button('一键全选').trigger('click')
    await button('扫描选中主机 (2)').trigger('click')
    let rejectScan
    api.execute.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectScan = reject
        })
    )
    await button('开始扫描').trigger('click')
    await flushPromises()
    expect(api.execute.mock.calls[0][0].params.hosts.map(host => host.key)).toEqual([
      'host/A',
      'host/B'
    ])
    expect(wrapper.findComponent(DeviceSelector).props('disabled')).toBe(true)
    expect(button('扫描选中主机 (2)').attributes('disabled')).toBeDefined()
    expect(
      wrapper
        .findAll('button')
        .filter(item => item.text() === '扫描')
        .every(item => item.attributes('disabled') !== undefined)
    ).toBe(true)
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    rejectScan(new Error('offline'))
    await flushPromises()
    expect(button('开始扫描').exists()).toBe(true)
    expect(wrapper.findComponent(DeviceSelector).props('modelValue')).toHaveLength(2)
    expect(wrapper.findComponent(DeviceSelector).props('disabled')).toBe(false)
    errorLog.mockRestore()
  })

  it('关闭后的旧失败不覆盖新查看；卸载后的请求不再写回', async () => {
    await open()
    let rejectOld
    api.affectedHosts.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectOld = reject
        })
    )
    state().handleViewAffectedHosts(patch)
    state().affectedHostsVisible = false
    state().handleViewAffectedHosts({ patch_id: 'patch/B' })
    await flushPromises()
    rejectOld(new Error('old failure'))
    await flushPromises()
    expect(state().affectedHostsError).toBe('')
    expect(state().affectedHosts[0].hostId).toBe('host/A')
    let resolveLast
    api.affectedHosts.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveLast = resolve
        })
    )
    const target = state()
    target.handleViewAffectedHosts(patch)
    wrapper.unmount()
    wrapper = null
    resolveLast({ data: { records: [{ hostId: 'late' }] } })
    await flushPromises()
    expect(target.affectedHosts).toEqual([])
  })
})
