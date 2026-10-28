import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElTable, ElTableColumn } from 'element-plus'
import { nextTick } from 'vue'

const mocks = vi.hoisted(() => ({ getHostPatches: vi.fn() }))
vi.mock('@/modules/patches/windows-patch/api', () => ({ winPatchApi: mocks }))
vi.mock(
  '@/modules/patches/windows-patch/components/install-wizard/WinPatchInstallWizard.vue',
  () => ({
    default: {
      name: 'WinPatchInstallWizard',
      props: ['modelValue', 'selectedRows', 'hostSummaries'],
      emits: ['success'],
      template: '<div />'
    }
  })
)

import WinPatchBatchInstallDrawer from '@/modules/patches/windows-patch/components/overview/WinPatchBatchInstallDrawer.vue'

const hosts = [
  { hostId: 'a', hostKey: 'host-a' },
  { hostId: 'b', hostKey: 'host-b' }
]
const patch = (id, hostId) => ({ id, hostId, patchStatus: 'no_repair', title: id })
const response = rows => ({ data: { content: rows, totalElements: rows.length } })
const deferred = () => {
  let resolve
  const promise = new Promise(done => {
    resolve = done
  })
  return { promise, resolve }
}

describe('Windows batch patch installation', () => {
  let wrapper

  function mountDrawer(hostSummaries = hosts) {
    wrapper = mount(WinPatchBatchInstallDrawer, {
      props: { modelValue: true, hostSummaries },
      global: {
        components: { ElTable, ElTableColumn },
        renderStubDefaultSlot: true,
        directives: { loading: () => {} },
        stubs: {
          'el-tag': true,
          'el-descriptions-item': true,
          'el-descriptions': true,
          'el-option': true,
          'el-select': true,
          'el-icon': true,
          ElTable: false,
          ElTableColumn: false,
          'el-drawer': { template: '<div><slot /></div>' },
          'el-button': {
            props: ['disabled'],
            template: '<button :disabled="disabled"><slot /></button>'
          },
          'el-input': {
            name: 'ElInput',
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<input />'
          },
          'el-pagination': {
            name: 'ElPagination',
            props: ['currentPage', 'pageSize'],
            emits: ['update:currentPage', 'current-change'],
            template: '<div />'
          }
        }
      }
    })
  }

  function installButton() {
    return wrapper.findAll('button').find(button => button.text() === '安装选中补丁')
  }

  function wizard() {
    return wrapper.findComponent({ name: 'WinPatchInstallWizard' })
  }

  beforeEach(() => {
    mocks.getHostPatches.mockReset()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.unstubAllGlobals()
  })

  it('ignores an old host response even when it finishes after the new request', async () => {
    const oldRequest = deferred()
    const newRequest = deferred()
    mocks.getHostPatches
      .mockReturnValueOnce(oldRequest.promise)
      .mockReturnValueOnce(newRequest.promise)
    mountDrawer([hosts[0]])
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true, hostSummaries: [hosts[1]] })
    const currentPatch = patch('b-1', 'b')
    newRequest.resolve(response([currentPatch]))
    await flushPromises()
    const table = wrapper.findComponent(ElTable)
    table.vm.$.exposed.toggleRowSelection(table.props('data')[0], true)
    await nextTick()

    oldRequest.resolve(response([patch('a-1', 'a')]))
    await flushPromises()
    expect(table.props('data').map(row => row.id)).toEqual(['b-1'])
    await installButton().trigger('click')
    expect(
      wizard()
        .props('selectedRows')
        .map(row => row.id)
    ).toEqual(['b-1'])
    expect(wizard().props('hostSummaries')).toEqual([hosts[1]])
  })

  it('keeps selections from different pages and clears them on refresh', async () => {
    mocks.getHostPatches.mockImplementation(hostId =>
      Promise.resolve(
        response(
          hostId === 'a'
            ? Array.from({ length: 50 }, (_, index) => patch(`a-${index}`, 'a'))
            : [patch('b-1', 'b')]
        )
      )
    )
    mountDrawer()
    await flushPromises()
    const table = wrapper.findComponent(ElTable)
    table.vm.$.exposed.toggleRowSelection(table.props('data')[0], true)
    const pagination = wrapper.findComponent({ name: 'ElPagination' })
    pagination.vm.$emit('update:currentPage', 2)
    pagination.vm.$emit('current-change', 2)
    await nextTick()
    table.vm.$.exposed.toggleRowSelection(table.props('data')[0], true)
    await nextTick()
    await installButton().trigger('click')
    expect(
      wizard()
        .props('selectedRows')
        .map(row => row.id)
    ).toEqual(['a-0', 'b-1'])
    expect(wizard().props('hostSummaries')).toEqual(hosts)

    wizard().vm.$emit('success')
    await flushPromises()
    expect(table.vm.$.exposed.getSelectionRows()).toEqual([])
    expect(installButton().element.disabled).toBe(true)
    // 刷新清除列表选择，但完成页仍保留本次任务的目标。
    expect(
      wizard()
        .props('selectedRows')
        .map(row => row.id)
    ).toEqual(['a-0', 'b-1'])
    expect(wizard().props('hostSummaries')).toEqual(hosts)
  })

  it('only shows hosts with selected patches and clears selection on close', async () => {
    mocks.getHostPatches.mockImplementation(hostId =>
      Promise.resolve(response([patch(`${hostId}-1`, hostId)]))
    )
    mountDrawer()
    await flushPromises()
    const table = wrapper.findComponent(ElTable)
    table.vm.$.exposed.toggleRowSelection(table.props('data')[0], true)
    await nextTick()
    await installButton().trigger('click')
    expect(wizard().props('hostSummaries')).toEqual([hosts[0]])
    await wrapper.setProps({ modelValue: false })
    expect(table.vm.$.exposed.getSelectionRows()).toEqual([])
    expect(table.props('data')).toEqual([])
    expect(wizard().props('modelValue')).toBe(false)
  })

  it('clears reserved selection when filtering so hidden patches are not installed', async () => {
    mocks.getHostPatches.mockImplementation(hostId =>
      Promise.resolve(response([patch(`${hostId}-1`, hostId)]))
    )
    mountDrawer()
    await flushPromises()
    const table = wrapper.findComponent(ElTable)
    table.vm.$.exposed.toggleRowSelection(table.props('data')[0], true)
    await nextTick()
    wrapper.findComponent({ name: 'ElInput' }).vm.$emit('update:modelValue', 'b-1')
    await nextTick()
    expect(table.vm.$.exposed.getSelectionRows()).toEqual([])
    expect(table.props('data').map(row => row.id)).toEqual(['b-1'])
    expect(installButton().element.disabled).toBe(true)
  })
})
