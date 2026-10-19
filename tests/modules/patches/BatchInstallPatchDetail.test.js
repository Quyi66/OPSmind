import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { ElTable, ElTableColumn } from 'element-plus'
import Drawer from '@/modules/patches/components/host-detail/dialogs/BatchInstallPatchDrawer.vue'
import Detail from '@/modules/patches/components/common/PatchDetailContent.vue'

const api = vi.hoisted(() => ({ getPatchesOfMachine: vi.fn(), getPatchDetail: vi.fn() }))
vi.mock('@/modules/patches/api', () => ({ patchScanApi: api }))
vi.mock('@/modules/patches/components/patch-task/wizard/PatchInstallWizard.vue', () => ({
  default: {
    name: 'PatchInstallWizard',
    props: ['visible', 'patchesToInstall', 'fixedHosts', 'selectionSummaryItems'],
    template: '<div />'
  }
}))
vi.mock('@/modules/patches/components/common/CveLinkList.vue', () => ({
  default: { template: '<div />' }
}))

const host = Object.freeze({
  host_id: 'host-a',
  host_key: '192.0.2.1',
  os_distro: 'kylin',
  os_version: 'V10'
})
const rows = Object.freeze([
  Object.freeze({
    patch_id: 'patch-A',
    patch_status_id: 'status-A',
    title: 'first',
    severity: 'Critical'
  }),
  Object.freeze({
    patch_id: 'patch-B',
    patch_status_id: 'status-B',
    title: 'second',
    severity: 'Important'
  })
])
const detail = id => ({
  data: {
    records: [{ patch_id: id, description: `description-${id}`, related_vuls: 'CVE-2026-1000' }]
  }
})
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const Dialog = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<section v-if="modelValue"><slot /></section>'
}
let wrapper
const state = () => wrapper.vm.$.setupState
const findButton = text => wrapper.findAll('button').find(button => button.text() === text)
async function open() {
  wrapper = mount(Drawer, {
    props: { visible: false, hosts: [host] },
    global: {
      components: { ElTable, ElTableColumn },
      stubs: {
        'el-table': false,
        'el-table-column': false,
        'el-drawer': {
          props: ['modelValue'],
          template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>'
        },
        'el-dialog': Dialog,
        'el-button': {
          props: ['disabled'],
          template: '<button :disabled="disabled"><slot /></button>'
        },
        'el-alert': { props: ['title'], template: '<div>{{ title }}<slot /></div>' },
        ...Object.fromEntries(
          ['ElIcon', 'ElInput', 'ElSelect', 'ElOption', 'ElTag', 'ElPagination', 'ElEmpty'].map(
            name => [name, true]
          )
        )
      },
      directives: { loading() {} }
    }
  })
  await wrapper.setProps({ visible: true })
  await flushPromises()
}
async function closeDetail() {
  wrapper.findComponent(Dialog).vm.$emit('update:modelValue', false)
  await flushPromises()
}
beforeEach(() => {
  api.getPatchesOfMachine.mockReset().mockResolvedValue({ data: { records: rows } })
  api.getPatchDetail.mockReset().mockImplementation(async ({ patch_id }) => detail(patch_id))
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    }
  )
})
afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
})

describe('Linux 批量主机补丁原地查看详情', () => {
  it('真实编号按钮按原 patch_id 查询，关闭后保留筛选/分页/选择及原向导参数', async () => {
    await open()
    expect(api.getPatchDetail).not.toHaveBeenCalled()
    const table = state().tableRef
    table.clearSelection()
    table.toggleRowSelection(state().uniquePatches[0], true)
    await nextTick()
    state().searchKeyword = 'patch-'
    state().pageSize = 1
    state().currentPage = 2
    await nextTick()
    const expectedPatches = JSON.parse(JSON.stringify(state().patchesToInstall))
    const expectedHosts = JSON.parse(JSON.stringify(state().fixedHosts))
    await findButton('patch-B').trigger('click')
    await flushPromises()
    expect(api.getPatchDetail).toHaveBeenCalledExactlyOnceWith({ patch_id: 'patch-B' })
    expect(wrapper.findComponent(Detail).props('patch').description).toBe('description-patch-B')
    expect(state().installWizardVisible).toBe(false)
    await closeDetail()
    expect(state().searchKeyword).toBe('patch-')
    expect(state().currentPage).toBe(2)
    expect(state().pageSize).toBe(1)
    expect(state().patchesToInstall).toEqual(expectedPatches)
    expect(state().fixedHosts).toEqual(expectedHosts)
    expect(api.getPatchesOfMachine).toHaveBeenCalledExactlyOnceWith({
      host_id: host.host_id,
      host_key: host.host_key
    })
    state().handleStartInstall()
    await nextTick()
    const wizard = wrapper.findComponent({ name: 'PatchInstallWizard' })
    expect(wizard.props()).toMatchObject({
      visible: true,
      patchesToInstall: expectedPatches,
      fixedHosts: expectedHosts
    })
    expect(expectedPatches).toEqual([
      { patch_id: 'patch-A', patch_name: 'patch-A', patchStatusIds: ['status-A'] }
    ])
    expect(rows[0].patch_status_id).toBe('status-A')
  })

  it('快速切换补丁后，旧详情不覆盖新详情或加载状态', async () => {
    await open()
    const old = deferred(),
      latest = deferred()
    api.getPatchDetail.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    state().openPatchDetail(rows[0])
    state().openPatchDetail(rows[1])
    old.resolve(detail('patch-A'))
    await flushPromises()
    expect(state().patchDetailLoading).toBe(true)
    expect(state().patchDetailData).toEqual({})
    latest.resolve(detail('patch-B'))
    await flushPromises()
    expect(state().patchDetailData.patch_id).toBe('patch-B')
    expect(state().patchDetailLoading).toBe(false)
  })

  it('关闭后重新打开，旧错误不污染新详情', async () => {
    await open()
    const old = deferred()
    api.getPatchDetail.mockReturnValueOnce(old.promise)
    state().openPatchDetail(rows[0])
    await nextTick()
    await closeDetail()
    state().openPatchDetail(rows[1])
    await flushPromises()
    old.reject(new Error('obsolete'))
    await flushPromises()
    expect(state().patchDetailError).toBe('')
    expect(state().patchDetailData.patch_id).toBe('patch-B')
  })

  it('最新失败明确提示，按原 ID 重试，不能拿摘要冒充详情', async () => {
    await open()
    api.getPatchDetail.mockRejectedValueOnce(new Error('read failed'))
    state().openPatchDetail(rows[0])
    await flushPromises()
    expect(wrapper.text()).toContain('加载补丁详情失败，请重试')
    expect(state().patchDetailData).toEqual({})
    await findButton('重试').trigger('click')
    await flushPromises()
    expect(api.getPatchDetail.mock.calls).toEqual([
      [{ patch_id: 'patch-A' }],
      [{ patch_id: 'patch-A' }]
    ])
    expect(state().patchDetailData.patch_id).toBe('patch-A')
    expect(state().patchDetailError).toBe('')
  })

  it('空结果提示未找到，不自动打开安装向导；无 patch_id 不查询', async () => {
    await open()
    state().openPatchDetail({ title: 'no identity' })
    expect(api.getPatchDetail).not.toHaveBeenCalled()
    api.getPatchDetail.mockResolvedValueOnce({ records: [] })
    state().openPatchDetail(rows[0])
    await flushPromises()
    expect(wrapper.text()).toContain('未找到该补丁详情')
    expect(state().installWizardVisible).toBe(false)
  })

  it.each(['close', 'hosts', 'unmount'])('父上下文 %s 后不接纳在途详情', async action => {
    await open()
    const pending = deferred()
    api.getPatchDetail.mockReturnValueOnce(pending.promise)
    state().openPatchDetail(rows[0])
    const previousState = state()
    if (action === 'close') await wrapper.setProps({ visible: false })
    if (action === 'hosts') await wrapper.setProps({ hosts: [{ host_id: 'host-b' }] })
    if (action === 'unmount') {
      wrapper.unmount()
      wrapper = null
    }
    pending.resolve(detail('patch-A'))
    await flushPromises()
    expect(previousState.patchDetailData).toEqual({})
    if (action !== 'unmount') expect(previousState.patchDetailVisible).toBe(false)
  })
})
