import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElTable, ElTableColumn } from 'element-plus'
import { nextTick } from 'vue'

const mocks = vi.hoisted(() => ({
  getHostPatches: vi.fn(),
  getKbDetail: vi.fn(),
  getAffectedHosts: vi.fn()
}))
vi.mock('@/modules/patches/windows-patch/api', () => ({ winPatchApi: mocks }))
vi.mock('@/modules/patches/api', () => ({
  winKbApi: { getKbDetail: mocks.getKbDetail, getAffectedHosts: mocks.getAffectedHosts }
}))
vi.mock(
  '@/modules/patches/windows-patch/components/install-wizard/WinPatchInstallWizard.vue',
  () => ({
    default: {
      name: 'WinPatchInstallWizard',
      props: ['modelValue', 'selectedRows', 'hostSummaries'],
      emits: ['success', 'update:modelValue'],
      template: '<div />'
    }
  })
)

import WinPatchBatchInstallDrawer from '@/modules/patches/windows-patch/components/overview/WinPatchBatchInstallDrawer.vue'
import WindowsKbDetailDialog from '@/modules/patches/windows-patch/components/kb/WindowsKbDetailDialog.vue'

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
          'el-select': {
            name: 'ElSelect',
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<div><slot /></div>'
          },
          'el-icon': true,
          'el-dialog': {
            props: ['modelValue', 'title', 'closeOnClickModal'],
            template:
              '<section v-if="modelValue"><h2>{{ title }}</h2><slot /><slot name="footer" /></section>'
          },
          'el-tabs': { template: '<div><slot /></div>' },
          'el-tab-pane': { template: '<div><slot /></div>' },
          'el-empty': true,
          CveLinkList: true,
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
    mocks.getKbDetail
      .mockReset()
      .mockImplementation(kbNumber =>
        Promise.resolve({ data: { kbNumber, title: `detail-${kbNumber}` } })
      )
    mocks.getAffectedHosts.mockReset().mockResolvedValue({ data: { content: [] } })
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

  it('关键词A选中后切换B累计选择，搜索/空结果/重置均保留，回到A可取消', async () => {
    mocks.getHostPatches.mockImplementation(hostId =>
      Promise.resolve(response([patch(`${hostId}-1`, hostId)]))
    )
    mountDrawer()
    await flushPromises()
    const table = wrapper.findComponent(ElTable)
    const input = wrapper.findComponent({ name: 'ElInput' })
    input.vm.$emit('update:modelValue', 'a-1')
    await nextTick()
    await wrapper.get('.el-table__body tbody tr input[type="checkbox"]').setValue(true)
    input.vm.$emit('update:modelValue', 'b-1')
    await nextTick()
    expect(table.props('data').map(row => row.id)).toEqual(['b-1'])
    expect(table.vm.$.exposed.getSelectionRows().map(row => row.id)).toEqual(['a-1'])
    expect(wrapper.text()).toContain('已选 1 条可安装补丁')
    expect(installButton().element.disabled).toBe(false)
    await wrapper.get('.el-table__body tbody tr input[type="checkbox"]').setValue(true)
    await wrapper
      .findAll('button')
      .find(button => button.text() === '搜索')
      .trigger('click')
    await nextTick()
    expect(table.vm.$.exposed.getSelectionRows().map(row => row.id)).toEqual(['a-1', 'b-1'])
    expect(wrapper.text()).toContain('已选 2 条可安装补丁')
    await installButton().trigger('click')
    expect(
      wizard()
        .props('selectedRows')
        .map(row => row.id)
    ).toEqual(['a-1', 'b-1'])
    expect(wizard().props('hostSummaries')).toEqual(hosts)

    wizard().vm.$emit('update:modelValue', false)
    await nextTick()
    input.vm.$emit('update:modelValue', 'no-results')
    await nextTick()
    expect(table.props('data')).toEqual([])
    expect(table.vm.$.exposed.getSelectionRows()).toHaveLength(2)
    await wrapper
      .findAll('button')
      .find(button => button.text() === '重置')
      .trigger('click')
    await nextTick()
    expect(table.vm.$.exposed.getSelectionRows()).toHaveLength(2)
    input.vm.$emit('update:modelValue', 'a-1')
    await nextTick()
    const checkbox = wrapper.get('.el-table__body tbody tr input[type="checkbox"]')
    expect(checkbox.element.checked).toBe(true)
    await checkbox.setValue(false)
    expect(table.vm.$.exposed.getSelectionRows().map(row => row.id)).toEqual(['b-1'])
    // 已打开向导的本次快照不跟随后续列表选择变化；下次打开使用新集合。
    expect(
      wizard()
        .props('selectedRows')
        .map(row => row.id)
    ).toEqual(['a-1', 'b-1'])
    await installButton().trigger('click')
    expect(
      wizard()
        .props('selectedRows')
        .map(row => row.id)
    ).toEqual(['b-1'])
    expect(wizard().props('hostSummaries')).toEqual([hosts[1]])
    expect(mocks.getHostPatches).toHaveBeenCalledTimes(2)
  })

  it.each([
    { index: 0, first: 'Critical', second: 'Important', field: 'severity' },
    { index: 1, first: 'no_repair', second: 'repair_faild', field: 'patchStatus' }
  ])('$field筛选切换保留其他筛选结果的选择', async ({ index, first, second, field }) => {
    mocks.getHostPatches.mockImplementation(hostId =>
      Promise.resolve(
        response([{ ...patch(`${hostId}-1`, hostId), [field]: hostId === 'a' ? first : second }])
      )
    )
    mountDrawer()
    await flushPromises()
    const table = wrapper.findComponent(ElTable)
    const select = wrapper.findAllComponents({ name: 'ElSelect' })[index]
    select.vm.$emit('update:modelValue', first)
    await nextTick()
    await wrapper.get('.el-table__body tbody tr input[type="checkbox"]').setValue(true)
    select.vm.$emit('update:modelValue', second)
    await nextTick()
    expect(table.props('data').map(row => row.id)).toEqual(['b-1'])
    expect(table.vm.$.exposed.getSelectionRows().map(row => row.id)).toEqual(['a-1'])
    await wrapper.get('.el-table__body tbody tr input[type="checkbox"]').setValue(true)
    await installButton().trigger('click')
    expect(
      wizard()
        .props('selectedRows')
        .map(row => row.id)
    ).toEqual(['a-1', 'b-1'])
    expect(wizard().props('hostSummaries')).toEqual(hosts)
    expect(mocks.getHostPatches).toHaveBeenCalledTimes(2)
  })

  it('查看和关闭KB详情保留筛选、分页及跨页选择，仅主动安装时打开向导', async () => {
    mocks.getHostPatches.mockImplementation(hostId =>
      Promise.resolve(
        response(
          hostId === 'a'
            ? Array.from({ length: 50 }, (_, index) => ({
                ...patch(`a-${index}`, 'a'),
                title: `candidate-${index}`
              }))
            : [
                {
                  ...patch('b-1', 'b'),
                  title: 'candidate-b',
                  kb_number: '5035857',
                  cve_ids: 'CVE-2026-1'
                }
              ]
        )
      )
    )
    mountDrawer()
    await flushPromises()
    const input = wrapper.findComponent({ name: 'ElInput' })
    input.vm.$emit('update:modelValue', 'candidate')
    await nextTick()
    const table = wrapper.findComponent(ElTable)
    table.vm.$.exposed.toggleRowSelection(table.props('data')[0], true)
    const pagination = wrapper.findComponent({ name: 'ElPagination' })
    pagination.vm.$emit('update:currentPage', 2)
    pagination.vm.$emit('current-change', 2)
    await nextTick()
    table.vm.$.exposed.toggleRowSelection(table.props('data')[0], true)
    await nextTick()
    expect(mocks.getKbDetail).not.toHaveBeenCalled()

    await wrapper.get('button.win-kb-link').trigger('click')
    await flushPromises()
    expect(mocks.getKbDetail).toHaveBeenCalledExactlyOnceWith('KB5035857')
    expect(mocks.getAffectedHosts).toHaveBeenCalledExactlyOnceWith('KB5035857')
    const detailDialog = wrapper.findComponent(WindowsKbDetailDialog)
    expect(detailDialog.text()).toContain('detail-KB5035857')
    expect(wizard().props('modelValue')).toBe(false)
    await detailDialog
      .findAll('button')
      .find(button => button.text() === '关闭')
      .trigger('click')
    await nextTick()

    expect(wrapper.findComponent(WindowsKbDetailDialog).exists()).toBe(false)
    expect(input.props('modelValue')).toBe('candidate')
    expect(pagination.props('currentPage')).toBe(2)
    expect(table.vm.$.exposed.getSelectionRows().map(row => row.id)).toEqual(['a-0', 'b-1'])
    expect(mocks.getHostPatches).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('task-submitted')).toBeUndefined()
    await installButton().trigger('click')
    expect(
      wizard()
        .props('selectedRows')
        .map(row => row.id)
    ).toEqual(['a-0', 'b-1'])
    expect(wizard().props('hostSummaries')).toEqual(hosts)
  })

  it('复用多KB编号、无CVE微软链接和缺编号占位，不把缺失CVE当内部详情', async () => {
    mocks.getHostPatches.mockResolvedValue(
      response([
        {
          ...patch('multi', 'a'),
          update_kb_numbers: ['5035857', 'KB5035857', 'kb5035858'],
          cveIds: ['CVE-2026-1']
        },
        { ...patch('external', 'a'), kbNumber: '5035859', cve_ids: ' , ; ' },
        { ...patch('empty-array', 'a'), kb_article: '5035860', cveIds: ['', ' '] },
        patch('missing', 'a')
      ])
    )
    mountDrawer([hosts[0]])
    await flushPromises()
    expect(wrapper.findAll('button.win-kb-link').map(button => button.text())).toEqual([
      'KB5035857',
      'KB5035858'
    ])
    const externalLinks = wrapper.findAll('a.win-kb-link')
    expect(externalLinks.map(link => link.text())).toEqual(['KB5035859', 'KB5035860'])
    expect(externalLinks[0].attributes('href')).toBe('https://support.microsoft.com/help/5035859')
    expect(externalLinks[0].attributes('target')).toBe('_blank')
    expect(externalLinks[0].attributes('rel')).toBe('noopener noreferrer')
    expect(wrapper.get('.win-kb-link-list__empty').text()).toBe('-')
    expect(mocks.getKbDetail).not.toHaveBeenCalled()
    expect(wrapper.findComponent(WindowsKbDetailDialog).exists()).toBe(false)
  })

  it('连续选择不同KB时隔离旧详情的迟到结果', async () => {
    mocks.getHostPatches.mockResolvedValue(
      response([
        { ...patch('first', 'a'), kbNumber: 'KB5035857', cveIds: 'CVE-2026-1' },
        { ...patch('second', 'a'), kbNumber: 'KB5035858', cveIds: 'CVE-2026-2' }
      ])
    )
    const oldDetail = deferred()
    const currentDetail = deferred()
    mocks.getKbDetail
      .mockReturnValueOnce(oldDetail.promise)
      .mockReturnValueOnce(currentDetail.promise)
    mountDrawer([hosts[0]])
    await flushPromises()
    const buttons = wrapper.findAll('button.win-kb-link')
    await buttons[0].trigger('click')
    const previousDialog = wrapper.findComponent(WindowsKbDetailDialog).vm
    await buttons[1].trigger('click')
    expect(wrapper.findComponent(WindowsKbDetailDialog).vm).not.toBe(previousDialog)
    currentDetail.resolve({ data: { kbNumber: 'KB5035858', title: 'current-detail' } })
    await flushPromises()
    oldDetail.resolve({ data: { kbNumber: 'KB5035857', title: 'obsolete-detail' } })
    await flushPromises()
    expect(wrapper.findComponent(WindowsKbDetailDialog).text()).toContain('current-detail')
    expect(wrapper.text()).not.toContain('obsolete-detail')
    expect(mocks.getKbDetail.mock.calls.map(([kb]) => kb)).toEqual(['KB5035857', 'KB5035858'])
    expect(wizard().props('modelValue')).toBe(false)
  })

  it.each(['close', 'switch'])('%s主机上下文时卸载KB详情，迟到结果不打开旧弹窗', async mode => {
    mocks.getHostPatches.mockResolvedValue(
      response([{ ...patch('first', 'a'), kbNumber: 'KB5035857', cveIds: 'CVE-2026-1' }])
    )
    const pending = deferred()
    mocks.getKbDetail.mockReturnValueOnce(pending.promise)
    mountDrawer([hosts[0]])
    await flushPromises()
    await wrapper.get('button.win-kb-link').trigger('click')
    expect(wrapper.findComponent(WindowsKbDetailDialog).exists()).toBe(true)
    await wrapper.setProps(mode === 'close' ? { modelValue: false } : { hostSummaries: [hosts[1]] })
    await flushPromises()
    expect(wrapper.findComponent(WindowsKbDetailDialog).exists()).toBe(false)
    pending.resolve({ data: { kbNumber: 'KB5035857', title: 'obsolete-detail' } })
    await flushPromises()
    expect(wrapper.findComponent(WindowsKbDetailDialog).exists()).toBe(false)
    expect(wrapper.text()).not.toContain('obsolete-detail')
    expect(wizard().props('modelValue')).toBe(false)
  })
})
