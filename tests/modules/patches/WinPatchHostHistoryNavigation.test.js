import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, KeepAlive } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { flushPromises, mount } from '@vue/test-utils'
import Overview from '@/modules/patches/windows-patch/views/WindowsPatchOverviewPage.vue'
import HostDrawer from '@/modules/patches/windows-patch/components/overview/WinPatchHostPatchesDrawer.vue'
import History from '@/modules/patches/windows-patch/views/WinPatchInstallHistoryPage.vue'
import { PATCHES_ROUTE_DEFS } from '@/modules/patches/routes'

const api = vi.hoisted(() => ({
  getHosts: vi.fn(),
  getHostPatches: vi.fn(),
  getInstallLogs: vi.fn()
}))
vi.mock('@/modules/patches/windows-patch/api', () => ({ winPatchApi: api }))
vi.mock('@/modules/asset/api', () => ({
  dataManageApi: { getAllTags: vi.fn().mockResolvedValue({ records: [] }) }
}))
vi.mock(
  '@/modules/patches/windows-patch/components/overview/WinPatchBatchInstallDrawer.vue',
  () => ({ default: { template: '<div />' } })
)
vi.mock('@/modules/patches/windows-patch/components/overview/WinPatchReportDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/windows-patch/components/overview/WinPatchScanDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/windows-patch/components/tasks/WinPatchTaskDetailDrawer.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock(
  '@/modules/patches/windows-patch/components/install-wizard/WinPatchInstallWizard.vue',
  () => ({ default: { template: '<div />' } })
)
vi.mock('@/modules/patches/windows-patch/components/kb/WindowsKbDetailDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/windows-patch/components/kb/WindowsKbLinkList.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/components/common/CveLinkList.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/windows-patch/components/tasks/WinPatchRollbackDialog.vue', () => ({
  default: {
    name: 'WinPatchRollbackDialog',
    props: ['modelValue', 'selectedRows'],
    template: '<div />'
  }
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { name: 'ExecuteResultDialog', props: ['visible', 'runId'], template: '<div />' }
}))

const response = rows => ({ data: { content: rows, totalElements: rows.length } })
const row = Object.freeze({
  id: 'history-row',
  hostId: 'host-a',
  runId: 'real-run',
  kbNumber: 'KB123'
})
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const Slot = { template: '<div><slot /></div>' }
const Harness = defineComponent({
  setup() {
    return () =>
      h(RouterView, null, {
        default: ({ Component, route }) =>
          h(KeepAlive, null, {
            default: () => h(Component, { key: route.path })
          })
      })
  }
})
let wrapper, router
const state = component => wrapper.findComponent(component).vm.$.setupState
const button = (scope, text) => scope.findAll('button').find(b => b.text() === text)
async function open(target = { name: 'patches-windowsRollback' }) {
  const names = ['patches-windowsVulnerability', 'patches-windowsRollback']
  router = createRouter({
    history: createMemoryHistory(),
    routes: names.map(name => {
      const def = PATCHES_ROUTE_DEFS.find(item => item.name === name)
      return {
        path: `/patches/${def.path}`,
        name,
        meta: { menuCode: def.menuCode },
        component: name === names[0] ? Overview : History
      }
    })
  })
  await router.push(target)
  await router.isReady()
  wrapper = mount(Harness, {
    global: {
      plugins: [router],
      stubs: {
        'router-view': false,
        'el-drawer': { props: ['modelValue'], template: '<div v-if="modelValue"><slot /></div>' },
        'el-form': Slot,
        'el-form-item': Slot,
        'el-button': {
          props: ['disabled'],
          template: '<button :disabled="disabled"><slot /></button>'
        },
        'el-alert': { props: ['title'], template: '<div>{{ title }}<slot /></div>' },
        ...Object.fromEntries(
          [
            'ElIcon',
            'ElInput',
            'ElSelect',
            'ElOption',
            'ElTable',
            'ElTableColumn',
            'ElPagination',
            'ElDescriptions',
            'ElDescriptionsItem',
            'ElTag',
            'ElTooltip',
            'ElPopover'
          ].map(name => [name, true])
        )
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset().mockResolvedValue(response([])))
})
afterEach(() => wrapper?.unmount())

describe('Windows 主机详情到已有安装历史', () => {
  it('真实按钮经原路由携带主机 ID，目标自动查同一主机，保持同一权限码且不打开回滚', async () => {
    await open({ name: 'patches-windowsVulnerability' })
    const host = Object.freeze({ hostId: 'host/a b', hostKey: '192.0.2.1' })
    state(Overview).openHostDrawer(host)
    await flushPromises()
    expect(api.getInstallLogs).not.toHaveBeenCalled()
    await button(wrapper.findComponent(HostDrawer), '安装历史').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value).toMatchObject({
      name: 'patches-windowsRollback',
      query: { hostId: host.hostId },
      meta: { menuCode: 'windows-patches' }
    })
    expect(
      PATCHES_ROUTE_DEFS.find(item => item.name === 'patches-windowsVulnerability').menuCode
    ).toBe('windows-patches')
    expect(api.getInstallLogs).toHaveBeenCalledExactlyOnceWith({
      hostId: host.hostId,
      page: 0,
      size: 20
    })
    expect(state(History).filters.hostId).toBe(host.hostId)
    expect(state(History).rollbackDialogVisible).toBe(false)
    expect(state(History).runResultDialogVisible).toBe(false)
    expect(host.hostId).toBe('host/a b')
  })

  it('原无参数入口查询全部，数组查询取首值；手动搜索/重置继续复用原参数', async () => {
    await open()
    expect(api.getInstallLogs).toHaveBeenLastCalledWith({ hostId: undefined, page: 0, size: 20 })
    await router.push({ name: 'patches-windowsRollback', query: { hostId: ['host-a', 'host-b'] } })
    await flushPromises()
    expect(state(History).filters.hostId).toBe('host-a')
    state(History).filters.hostId = 'manual-host'
    state(History).pagination.pageSize = 50
    state(History).handleSearch()
    await flushPromises()
    expect(api.getInstallLogs).toHaveBeenLastCalledWith({
      hostId: 'manual-host',
      page: 0,
      size: 50
    })
    state(History).handleReset()
    await flushPromises()
    expect(api.getInstallLogs).toHaveBeenLastCalledWith({ hostId: undefined, page: 0, size: 20 })
  })

  it('缓存页面离开时不后台查历史，回到新主机后不接纳旧响应或选择', async () => {
    await open({ name: 'patches-windowsRollback', query: { hostId: 'host-a' } })
    const history = state(History)
    const pending = deferred()
    api.getInstallLogs.mockReturnValueOnce(pending.promise)
    history.loadLogs()
    await router.push({ name: 'patches-windowsVulnerability', query: { hostId: 'unrelated' } })
    await flushPromises()
    expect(api.getInstallLogs).toHaveBeenCalledTimes(2)
    await router.push({ name: 'patches-windowsRollback', query: { hostId: 'host-b' } })
    await flushPromises()
    pending.resolve(response([row]))
    await flushPromises()
    expect(state(History)).toBe(history)
    expect(history.filters.hostId).toBe('host-b')
    expect(history.logList).toEqual([])
    expect(history.selectedRows).toEqual([])
    expect(history.loading).toBe(false)
    expect(api.getInstallLogs.mock.calls.at(-1)[0].hostId).toBe('host-b')
  })

  it('连续搜索旧失败不会结束新加载，新失败清空选择且可按原条件重试', async () => {
    await open()
    const old = deferred(),
      latest = deferred()
    api.getInstallLogs.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    const history = state(History)
    history.selectedRows = [row]
    history.filters.hostId = 'host-a'
    history.handleSearch()
    history.filters.hostId = 'host-b'
    history.handleSearch()
    old.reject(new Error('old failure'))
    await flushPromises()
    expect(history.loading).toBe(true)
    expect(history.loadError).toBe('')
    latest.reject(new Error('current failure'))
    await flushPromises()
    expect(history.selectedRows).toEqual([])
    expect(history.pagination.total).toBe(0)
    expect(history.logList).toEqual([])
    expect(button(wrapper, '回滚选中记录').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('加载安装历史失败，请重试')
    await button(wrapper, '重试').trigger('click')
    await flushPromises()
    expect(api.getInstallLogs.mock.calls.at(-1)[0].hostId).toBe('host-b')
    expect(history.loadError).toBe('')
  })

  it('目标仍以原 runId 打开结果，路由切主机清空旧结果及回滚弹窗', async () => {
    await open({ name: 'patches-windowsRollback', query: { hostId: 'host-a' } })
    const history = state(History)
    history.openRunResult(row)
    history.rollbackDialogVisible = true
    await flushPromises()
    expect(wrapper.findComponent({ name: 'ExecuteResultDialog' }).props('runId')).toBe('real-run')
    await router.push({ name: 'patches-windowsRollback', query: { hostId: 'host-b' } })
    await flushPromises()
    expect(history.runResultDialogVisible).toBe(false)
    expect(history.rollbackDialogVisible).toBe(false)
    expect(history.filters.hostId).toBe('host-b')
  })
})
