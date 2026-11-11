import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import Drawer from '@/modules/patches/windows-patch/components/overview/WinPatchHostPatchesDrawer.vue'

const api = vi.hoisted(() => ({ getHostPatches: vi.fn() }))
vi.mock('@/modules/patches/windows-patch/api', () => ({ winPatchApi: api }))
vi.mock(
  '@/modules/patches/windows-patch/components/install-wizard/WinPatchInstallWizard.vue',
  () => ({
    default: {
      name: 'WinPatchInstallWizard',
      props: ['modelValue', 'selectedRows', 'hostSummary'],
      emits: ['update:modelValue', 'submitted', 'success'],
      template: '<div />'
    }
  })
)
vi.mock('@/modules/patches/windows-patch/components/kb/WindowsKbDetailDialog.vue', () => ({
  default: {}
}))
vi.mock('@/modules/patches/windows-patch/components/kb/WindowsKbLinkList.vue', () => ({
  default: {}
}))
vi.mock('@/modules/patches/components/common/CveLinkList.vue', () => ({ default: {} }))

const response = rows => ({ data: { content: rows, totalElements: rows.length } })
const patch = Object.freeze({ id: 'patch-a', patchStatus: 'no_repair' })
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const Select = {
  props: ['modelValue'],
  emits: ['update:modelValue', 'change'],
  template: '<div />'
}
const Input = {
  props: ['modelValue'],
  emits: ['update:modelValue', 'clear'],
  template: '<input />'
}
let wrapper
const state = () => wrapper.vm.$.setupState
const installButton = () => wrapper.findAll('button').find(b => b.text() === '安装选中补丁')
async function changeFilter(index, value) {
  const select = wrapper.findAllComponents(Select)[index]
  select.vm.$emit('update:modelValue', value)
  select.vm.$emit('change', value)
  await flushPromises()
}
async function open(props = {}) {
  wrapper = shallowMount(Drawer, {
    props: { modelValue: true, hostSummary: { hostId: 'host-a' }, ...props },
    global: {
      stubs: {
        'el-drawer': { template: '<div><slot /></div>' },
        'el-form': { template: '<div><slot /></div>' },
        'el-form-item': { template: '<div><slot /></div>' },
        'el-select': Select,
        'el-input': Input,
        'el-button': {
          props: ['disabled'],
          template: '<button :disabled="disabled"><slot /></button>'
        },
        'el-alert': { props: ['title'], template: '<div>{{ title }}<slot /></div>' },
        ...Object.fromEntries(
          [
            'ElDescriptions',
            'ElDescriptionsItem',
            'ElOption',
            'ElTable',
            'ElTableColumn',
            'ElTag',
            'ElIcon',
            'ElPagination'
          ].map(name => [name, true])
        )
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
beforeEach(() => {
  api.getHostPatches.mockReset().mockResolvedValue(response([]))
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
})

describe('Windows 主机补丁详情筛选联动', () => {
  it('选择严重级别/补丁状态立即复用原查询，回到首页并保留每页大小及关键词', async () => {
    await open({ initialFilters: { keyword: 'KB123', patchStatus: 'no_repair' } })
    state().pagination.page = 4
    state().pagination.pageSize = 100
    state().selectedRows = [patch]
    await changeFilter(0, 'Critical')
    expect(api.getHostPatches).toHaveBeenLastCalledWith('host-a', {
      page: 0,
      size: 100,
      severity: 'Critical',
      patchStatus: 'no_repair',
      keyword: 'KB123'
    })
    expect(state().selectedRows).toEqual([])
    expect(installButton().attributes('disabled')).toBeDefined()
    await changeFilter(1, 'is_repair')
    expect(api.getHostPatches).toHaveBeenCalledTimes(3)
    expect(api.getHostPatches.mock.calls.at(-1)[1].patchStatus).toBe('is_repair')
    expect(wrapper.findComponent({ name: 'WinPatchInstallWizard' }).props('modelValue')).toBe(false)
  })

  it('清空关键词立即查询，清空选择仍发送原来的 undefined 而非新枚举', async () => {
    await open({ initialFilters: { keyword: 'KB123', severity: 'Critical' } })
    const input = wrapper.findComponent(Input)
    input.vm.$emit('update:modelValue', '')
    input.vm.$emit('clear')
    await flushPromises()
    expect(api.getHostPatches.mock.calls.at(-1)[1].keyword).toBeUndefined()
    await changeFilter(0, '')
    expect(api.getHostPatches.mock.calls.at(-1)[1].severity).toBeUndefined()
  })

  it('旧筛选响应晚到不会覆盖新结果、总数或新选择', async () => {
    await open()
    const old = deferred(),
      latest = deferred()
    api.getHostPatches.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    await changeFilter(0, 'Critical')
    await changeFilter(1, 'no_repair')
    expect(state().loading).toBe(true)
    expect(state().patchList).toEqual([])
    latest.resolve(response([patch]))
    await flushPromises()
    state().selectedRows = [patch]
    old.resolve(response([{ id: 'obsolete' }, { id: 'obsolete-2' }]))
    await flushPromises()
    expect(state().patchList).toEqual([patch])
    expect(state().pagination.total).toBe(1)
    expect(state().selectedRows).toEqual([patch])
    expect(state().loading).toBe(false)
  })

  it('旧请求失败不弹错，也不提前结束新请求的加载', async () => {
    await open()
    const old = deferred(),
      latest = deferred()
    api.getHostPatches.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    await changeFilter(0, 'Critical')
    await changeFilter(1, 'is_repair')
    old.reject(new Error('obsolete failure'))
    await flushPromises()
    expect(ElMessage.error).not.toHaveBeenCalled()
    expect(state().loadError).toBe('')
    expect(state().loading).toBe(true)
    latest.resolve(response([]))
    await flushPromises()
    expect(state().loading).toBe(false)
  })

  it('关闭再打开其他主机，旧响应不会污染新主机，关闭时不发请求', async () => {
    await open()
    const old = deferred()
    api.getHostPatches.mockReturnValueOnce(old.promise)
    await changeFilter(0, 'Critical')
    await wrapper.setProps({ modelValue: false })
    expect(api.getHostPatches).toHaveBeenCalledTimes(2)
    expect(state().patchList).toEqual([])
    await wrapper.setProps({ modelValue: true, hostSummary: { host_id: 'host-b' } })
    await flushPromises()
    old.resolve(response([{ id: 'host-a-patch' }]))
    await flushPromises()
    expect(api.getHostPatches.mock.calls.at(-1)[0]).toBe('host-b')
    expect(state().patchList).toEqual([])
    expect(state().loading).toBe(false)
  })

  it('最新查询失败清空旧结果/选择并可按相同条件重试，不打开安装向导', async () => {
    api.getHostPatches.mockResolvedValueOnce(response([patch]))
    await open()
    state().selectedRows = [patch]
    api.getHostPatches.mockRejectedValueOnce(new Error('read failed'))
    await changeFilter(0, 'Critical')
    expect(state().patchList).toEqual([])
    expect(state().pagination.total).toBe(0)
    expect(state().selectedRows).toEqual([])
    expect(wrapper.text()).toContain('加载主机补丁详情失败，请重试')
    expect(installButton().attributes('disabled')).toBeDefined()
    await wrapper
      .findAll('button')
      .find(b => b.text() === '重试')
      .trigger('click')
    await flushPromises()
    expect(state().loadError).toBe('')
    expect(api.getHostPatches.mock.calls.at(-1)[1].severity).toBe('Critical')
    expect(state().installWizardVisible).toBe(false)
  })

  it('缺主机 ID 或卸载时不接纳在途结果', async () => {
    await open({ hostSummary: {} })
    expect(api.getHostPatches).not.toHaveBeenCalled()
    const pending = deferred()
    api.getHostPatches.mockReturnValueOnce(pending.promise)
    await wrapper.setProps({ hostSummary: { hostId: 'host-a' } })
    const previousState = state()
    wrapper.unmount()
    wrapper = null
    pending.resolve(response([patch]))
    await flushPromises()
    expect(previousState.patchList).toEqual([])
  })

  it('安装成功刷新列表时保留向导的本次补丁，下一次打开使用新选择', async () => {
    api.getHostPatches.mockResolvedValueOnce(response([patch]))
    await open()
    state().selectedRows = [patch]
    await flushPromises()
    await installButton().trigger('click')
    const wizard = wrapper.findComponent({ name: 'WinPatchInstallWizard' })
    expect(wizard.props('modelValue')).toBe(true)
    expect(wizard.props('selectedRows')).toEqual([patch])
    expect(wizard.props('hostSummary')).toEqual({ hostId: 'host-a' })

    const refresh = deferred()
    api.getHostPatches.mockReturnValueOnce(refresh.promise)
    wizard.vm.$emit('success')
    await flushPromises()
    expect(state().selectedRows).toEqual([])
    expect(installButton().element.disabled).toBe(true)
    expect(wizard.props('modelValue')).toBe(true)
    expect(wizard.props('selectedRows')).toEqual([patch])

    const nextPatch = { id: 'patch-next', patchStatus: 'no_repair' }
    refresh.resolve(response([nextPatch]))
    await flushPromises()
    expect(state().patchList).toEqual([nextPatch])
    expect(wizard.props('selectedRows')).toEqual([patch])

    wizard.vm.$emit('update:modelValue', false)
    state().selectedRows = [nextPatch]
    await flushPromises()
    await installButton().trigger('click')
    expect(wizard.props('selectedRows')).toEqual([nextPatch])
    expect(api.getHostPatches).toHaveBeenCalledTimes(2)
  })

  it('关闭或切换主机清理旧安装向导，不把旧补丁带给新主机', async () => {
    await open()
    state().selectedRows = [patch]
    await flushPromises()
    await installButton().trigger('click')
    const wizard = wrapper.findComponent({ name: 'WinPatchInstallWizard' })
    await wrapper.setProps({ modelValue: false })
    expect(wizard.props('modelValue')).toBe(false)
    expect(wizard.props('selectedRows')).toEqual([])

    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    state().selectedRows = [patch]
    await flushPromises()
    await installButton().trigger('click')
    await wrapper.setProps({ hostSummary: { hostId: 'host-b' } })
    await flushPromises()
    expect(wizard.props('modelValue')).toBe(false)
    expect(wizard.props('selectedRows')).toEqual([])
    expect(installButton().element.disabled).toBe(true)
    expect(api.getHostPatches.mock.calls.at(-1)[0]).toBe('host-b')
  })
})
