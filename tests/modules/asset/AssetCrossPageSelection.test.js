import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, watch } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { ElTable, ElTableColumn, ElMessage } from 'element-plus'
import Page from '@/modules/asset/views/AssetInfoPage.vue'
import AddGroupDialog from '@/modules/asset/components/asset-info/AddGroupDialog.vue'

const api = vi.hoisted(() => ({
  getAssetTypes: vi.fn(),
  getAssetList: vi.fn(),
  getAttrValues: vi.fn(),
  getGroupList: vi.fn(),
  getTagList: vi.fn(),
  getGroupByCit: vi.fn(),
  post: vi.fn()
}))
vi.mock('@/modules/asset/api', () => ({
  assetApi: api,
  agentApi: {
    getHostAgentInfo: vi.fn(async hostIds => hostIds.map(hostId => ({ hostId, connectionType: 'ssh' })))
  },
  dataManageApi: { getCurrentTenantId: vi.fn().mockResolvedValue('tenant') }
}))
vi.mock('@/core/api', () => ({ apiService: { post: api.post } }))
vi.mock('@/core/auth', () => ({
  authService: { hasPermission: () => true, hasRole: () => true }
}))
vi.mock('@/composables/useJobPolling', () => ({ pollJobStatus: vi.fn() }))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }) }))

const rows = [
  { id: 'asset-a', HOSTNAME: 'host-a', IP: '192.0.2.1' },
  { id: 'asset-b', HOSTNAME: 'host-b', IP: '192.0.2.2' },
  { id: 'asset-c', HOSTNAME: 'host-c', IP: '192.0.2.3' }
]
const Layer = defineComponent({
  props: ['modelValue', 'title'],
  emits: ['update:modelValue', 'closed'],
  setup(props, { slots, emit }) {
    watch(
      () => props.modelValue,
      (value, previous) => {
        if (!value && previous) emit('closed')
      }
    )
    return () =>
      props.modelValue
        ? h('section', { 'aria-label': props.title }, [slots.default?.(), slots.footer?.()])
        : null
  }
})
const Form = defineComponent({
  setup(_props, { slots, expose }) {
    expose({ validate: async () => true, resetFields() {} })
    return () => h('div', slots.default?.())
  }
})
const Button = {
  props: ['disabled', 'loading'],
  template: '<button :disabled="disabled || loading"><slot /></button>'
}
let wrapper
const state = () => wrapper.vm.$.setupState
const groupDialog = () => wrapper.findComponent(AddGroupDialog)
const groupState = () => groupDialog().vm.$.setupState
const mainTable = () =>
  wrapper.findAllComponents(ElTable).find(table => table.props('height') === '100%')
const ids = () => state().selectedRows.map(row => row.id)
const button = (text, within = wrapper) => {
  const found = within.findAll('button').find(item => item.text() === text)
  if (!found)
    throw new Error(
      `Missing ${text}: ${within
        .findAll('button')
        .map(item => item.text())
        .join(', ')}; selected=${ids()}`
    )
  return found
}
async function selectRow(name, selected = true) {
  const row = mainTable()
    .findAll('tbody tr')
    .find(item => item.text().includes(name))
  await row.get('input[type="checkbox"]').setValue(selected)
  await flushPromises()
}
async function page(number) {
  state().handlePageChange(number)
  await flushPromises()
}
async function openPage() {
  wrapper = mount(Page, {
    global: {
      components: { ElTable, ElTableColumn },
      stubs: {
        transition: { template: '<div><slot /></div>' },
        ElTable: false,
        ElTableColumn: false,
        AddGroupDialog: false,
        'el-drawer': Layer,
        'el-dialog': Layer,
        'el-button': Button,
        'el-form': Form,
        'el-form-item': { template: '<div><slot /></div>' },
        'el-tooltip': { template: '<span><slot /></span>' },
        'el-alert': { props: ['title'], template: '<div>{{ title }}<slot /></div>' },
        'el-tag': { template: '<span><slot /></span>' },
        'el-link': { template: '<span><slot /></span>' },
        ...Object.fromEntries(
          [
            'ElTabs',
            'ElTabPane',
            'ElOption',
            'ElSelect',
            'ElIcon',
            'ElRadio',
            'ElRadioGroup',
            'ElDropdown',
            'ElDropdownMenu',
            'ElDropdownItem',
            'ElProgress',
            'ElAvatar',
            'ElPagination',
            'AssetSidebar',
            'AssetDetailDialog',
            'AssetEditDialog',
            'AssetHistoryDialog',
            'AutoEntryDialog',
            'ImportAssetDialog',
            'DeleteAssetImportDialog',
            'BatchEditDialog',
            'AddTagDialog',
            'AgentEnrollmentDialog',
            'AgentInstallDialog'
          ].map(name => [name, true])
        )
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
beforeEach(() => {
  vi.clearAllMocks()
  api.getAssetTypes.mockResolvedValue({ records: [{ code: 'linux' }, { code: 'windows' }] })
  api.getAssetList.mockImplementation(async (_params, options) => ({
    records: options.size >= 200 ? rows : [rows[(options.page || 1) - 1]].filter(Boolean),
    total: 3
  }))
  api.getAttrValues.mockResolvedValue({ records: [] })
  api.getGroupList.mockResolvedValue({ records: ['/existing'] })
  api.getTagList.mockResolvedValue({ records: [] })
  api.getGroupByCit.mockResolvedValue({ records: [{ id: 'group-original', path: '/existing' }] })
  api.post.mockResolvedValue({})
  vi.spyOn(ElMessage, 'info').mockImplementation(() => {})
  vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
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
  wrapper = undefined
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('设备清单跨页选择与原添加分组链路', () => {
  it('保留 Agent 接入、待处理和安装入口，不再挂载旧统一扫描弹窗', async () => {
    await openPage()
    await button('Agent 接入').trigger('click')
    expect(state().agentEnrollmentVisible).toBe(true)
    expect(state().agentEnrollmentMode).toBe('enroll')
    await button('待处理 Agent').trigger('click')
    expect(state().agentEnrollmentMode).toBe('pending')
    state().selectedRows = [rows[0]]
    await flushPromises()
    await button('安装 Agent').trigger('click')
    await flushPromises()
    expect(state().agentInstallVisible).toBe(true)
    expect(state().agentInstallHosts.map(host => host.id)).toEqual(['asset-a'])
    expect(wrapper.findAll('button').some(item => item.text() === '扫描')).toBe(false)
    expect(wrapper.findAll('button').some(item => item.text() === '一键全选')).toBe(false)
  })

  it('真实表格跨两页累计选择，当前页取消不影响其他页，返回及调整页大小恢复勾选', async () => {
    await openPage()
    await selectRow('host-a')
    await page(2)
    await selectRow('host-b')
    expect(ids()).toEqual(['asset-a', 'asset-b'])
    expect(state().selectedCount).toBe(2)
    await selectRow('host-b', false)
    expect(ids()).toEqual(['asset-a'])
    await page(1)
    expect(mainTable().get('tbody input').element.checked).toBe(true)
    state().pageSize = 50
    state().handlePageSizeChange()
    await flushPromises()
    expect(ids()).toEqual(['asset-a'])
    expect(mainTable().get('tbody input').element.checked).toBe(true)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('查看已选不额外查询手动选择，移除非当前页设备后只将剩余原 ID 带入分组', async () => {
    await openPage()
    await selectRow('host-a')
    await page(2)
    await selectRow('host-b')
    const reads = api.getAssetList.mock.calls.length
    await button('查看已选').trigger('click')
    await flushPromises()
    const review = wrapper.find('section[aria-label="已选设备"]')
    expect(review.text()).toContain('host-a')
    expect(review.text()).toContain('host-b')
    await button('移除', review).trigger('click')
    await flushPromises()
    expect(ids()).toEqual(['asset-b'])
    expect(api.getAssetList).toHaveBeenCalledTimes(reads)
    state().selectionReviewVisible = false
    await flushPromises()
    await button('添加分组').trigger('click')
    await flushPromises()
    expect(groupDialog().props()).toMatchObject({ ciIds: ['asset-b'], assetType: 'linux' })
    expect(api.post).not.toHaveBeenCalled()
  })

  it('两页设备进入原分组表单，取消和失败保留选择，重试只提交原作业及参数', async () => {
    await openPage()
    await selectRow('host-a')
    await page(2)
    await selectRow('host-b')
    await button('添加分组').trigger('click')
    await flushPromises()
    expect(groupDialog().text()).toContain('将为 2 台设备添加分组')
    expect(groupDialog().props('ciIds')).toEqual(['asset-a', 'asset-b'])
    await button('取消', groupDialog()).trigger('click')
    await flushPromises()
    expect(ids()).toEqual(['asset-a', 'asset-b'])
    expect(api.post).not.toHaveBeenCalled()
    await button('添加分组').trigger('click')
    await flushPromises()
    groupState().formData.id = 'group-original'
    api.post.mockRejectedValueOnce(new Error('mock save failure'))
    await button('保存', groupDialog()).trigger('click')
    await flushPromises()
    expect(groupDialog().props('modelValue')).toBe(true)
    expect(ids()).toEqual(['asset-a', 'asset-b'])
    const expected = {
      params: {
        operate: 'new',
        ciIds: 'asset-a,asset-b',
        ciType: 'linux',
        id: 'group-original',
        name: ''
      }
    }
    expect(api.post.mock.calls[0]).toEqual([
      expect.stringMatching(/^\/workflow\/api\/workflow\/jobs\/a17VXM\/run\?cacheBuster=\d+$/),
      expected
    ])
    await button('保存', groupDialog()).trigger('click')
    await flushPromises()
    expect(api.post.mock.calls[1][1]).toEqual(expected)
    expect(state().hasSelection).toBe(false)
    expect(state().currentPage).toBe(2)
  })

  it('分组目标是打开时快照，保存中禁止关闭和重复提交', async () => {
    await openPage()
    await selectRow('host-a')
    await state().handleAddGroup()
    await flushPromises()
    state().selectedRows = [rows[1]]
    await flushPromises()
    expect(groupDialog().props('ciIds')).toEqual(['asset-a'])
    groupState().formData.id = 'group-original'
    let finish
    api.post.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve
      })
    )
    const first = groupState().handleSave()
    await flushPromises()
    await groupState().handleSave()
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(api.post.mock.calls[0][1].params.ciIds).toBe('asset-a')
    expect(button('取消', groupDialog()).element.disabled).toBe(true)
    finish({})
    await first
    await flushPromises()
  })

  it.each(['search', 'type', 'group', 'tag'])(
    '改变 %s 条件时同类型保留选择，仅切换类型清空，不写后台',
    async kind => {
      await openPage()
      await selectRow('host-a')
      if (kind === 'search') {
        state().searchText = 'new'
        state().handleSearch()
      }
      if (kind === 'type') state().handleTypeChange('windows')
      if (kind === 'group') state().handleSelectGroup('/existing')
      if (kind === 'tag') state().handleSelectTag({ name: 'production' })
      await flushPromises()
      if (kind === 'type') {
        expect(state().hasSelection).toBe(false)
        expect(ElMessage.info).toHaveBeenCalledWith('资产类型已变更，已清空之前选择的设备')
      } else {
        expect(ids()).toEqual(['asset-a'])
        expect(ElMessage.info).not.toHaveBeenCalled()
      }
      expect(api.post).not.toHaveBeenCalled()
    }
  )

  it('同范围重复搜索/刷新保留选择，迟到的翻页响应不覆盖新页及累计选择', async () => {
    await openPage()
    await selectRow('host-a')
    state().handleSearch()
    await flushPromises()
    state().handleRefresh()
    await flushPromises()
    expect(ids()).toEqual(['asset-a'])
    let oldResponse
    api.getAssetList.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          oldResponse = resolve
        })
    )
    state().handlePageChange(2)
    await page(3)
    expect(state().tableData[0].id).toBe('asset-c')
    oldResponse({ records: [rows[1]], total: 999 })
    await flushPromises()
    expect(state().tableData[0].id).toBe('asset-c')
    expect(state().total).toBe(3)
    expect(ids()).toEqual(['asset-a'])
    expect(state().loading).toBe(false)
  })

  it('全部筛选结果保留排除项，使用已应用的原查询，不将未搜索的输入带入操作', async () => {
    await openPage()
    await state().handleToggleSelectAll()
    await selectRow('host-a', false)
    await page(2)
    expect(mainTable().get('tbody input').element.checked).toBe(true)
    state().searchText = 'draft-not-applied'
    await state().handleAddGroup()
    await flushPromises()
    expect(groupDialog().props('ciIds')).toEqual(['asset-b', 'asset-c'])
    expect(api.getAssetList.mock.calls.at(-1)).toEqual([
      expect.objectContaining({ assetType: 'linux', permission: 'r', hostKeys: '@@' }),
      { size: 200, page: 1, filter: '' }
    ])
    expect(api.post).not.toHaveBeenCalled()
  })

  it('全选解析中切换筛选，迟到响应不能打开旧范围分组弹窗', async () => {
    await openPage()
    await state().handleToggleSelectAll()
    let finish
    api.getAssetList.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve
        })
    )
    const opening = state().handleAddGroup()
    state().searchText = 'new-scope'
    state().handleSearch()
    await flushPromises()
    finish({ records: rows, total: 3 })
    await opening
    await flushPromises()
    expect(groupDialog().props('modelValue')).toBe(false)
    expect(ids()).toEqual(['asset-a', 'asset-b', 'asset-c'])
    expect(api.post).not.toHaveBeenCalled()
  })

  it('先筛选勾选再追加状态筛选，保留旧目标并累计新目标，原分组收到完整原 ID', async () => {
    api.getAssetList.mockImplementation(async params => ({
      records: params.status === '1' ? [rows[1]] : [rows[0]],
      total: 1
    }))
    await openPage()
    state().searchText = 'production'
    state().handleSearch()
    await flushPromises()
    await selectRow('host-a')
    state().filters.status = '1'
    state().handleSearch()
    await flushPromises()
    expect(ids()).toEqual(['asset-a'])
    expect(mainTable().get('tbody input').element.checked).toBe(false)
    await selectRow('host-b')
    expect(ids()).toEqual(['asset-a', 'asset-b'])
    expect(state().selectedCount).toBe(2)
    expect(api.getAssetList.mock.calls.at(-1)).toEqual([
      expect.objectContaining({ status: '1', assetType: 'linux', permission: 'r' }),
      { size: 10, page: 1, filter: 'production' }
    ])
    await state().handleAddGroup()
    await flushPromises()
    expect(groupDialog().props('ciIds')).toEqual(['asset-a', 'asset-b'])
    expect(api.post).not.toHaveBeenCalled()
  })

  it('新筛选无结果仍保留旧勾选，重置筛选也保留，只有明确取消才清空', async () => {
    await openPage()
    await selectRow('host-a')
    api.getAssetList.mockResolvedValueOnce({ records: [], total: 0 })
    state().searchText = 'empty-filter'
    state().handleSearch()
    await flushPromises()
    expect(state().total).toBe(0)
    expect(ids()).toEqual(['asset-a'])
    state().handleReset()
    await flushPromises()
    expect(ids()).toEqual(['asset-a'])
    expect(mainTable().get('tbody input').element.checked).toBe(true)
    state().resetSelectionState()
    await flushPromises()
    expect(state().hasSelection).toBe(false)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('全筛选选择先固定旧查询和排除项，再加载新筛选；新结果不会被自动全选', async () => {
    api.getAssetList.mockImplementation(async (_params, options) => ({
      records:
        options.filter === 'new-filter'
          ? [rows[2]]
          : options.size >= 200
            ? rows.slice(0, 2)
            : [rows[0]],
      total: options.filter === 'new-filter' ? 1 : 2
    }))
    await openPage()
    await state().handleToggleSelectAll()
    await selectRow('host-a', false)
    state().searchText = 'new-filter'
    state().handleSearch()
    await flushPromises()
    expect(state().allSelected).toBe(false)
    expect(ids()).toEqual(['asset-b'])
    expect(mainTable().get('tbody input').element.checked).toBe(false)
    expect(api.getAssetList.mock.calls.at(-2)[1]).toEqual({ size: 200, page: 1, filter: '' })
    await selectRow('host-c')
    expect(ids()).toEqual(['asset-b', 'asset-c'])
    await state().handleAddGroup()
    await flushPromises()
    expect(groupDialog().props('ciIds')).toEqual(['asset-b', 'asset-c'])
    expect(api.post).not.toHaveBeenCalled()
  })

  it('固定旧全选失败保留原列表和目标，重试成功后才应用新筛选', async () => {
    await openPage()
    await state().handleToggleSelectAll()
    api.getAssetList.mockRejectedValueOnce(new Error('old selection read failed'))
    state().searchText = 'new-filter'
    state().handleSearch()
    await flushPromises()
    expect(state().allSelected).toBe(true)
    expect(state().selectedCount).toBe(3)
    expect(state().tableData[0].id).toBe('asset-a')
    expect(ElMessage.error).toHaveBeenCalledWith('保留原筛选的已选设备失败，尚未应用新筛选，请重试')
    state().handleSearch()
    await flushPromises()
    expect(api.getAssetList.mock.calls.at(-2)[1].filter).toBe('')
    expect(api.getAssetList.mock.calls.at(-1)[1].filter).toBe('new-filter')
    expect(state().allSelected).toBe(false)
    expect(ids()).toEqual(['asset-a', 'asset-b', 'asset-c'])
  })

  it('固定全选期间明确取消选择，迟到结果不能重新勾选旧设备', async () => {
    await openPage()
    await state().handleToggleSelectAll()
    let finish
    api.getAssetList.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve
        })
    )
    state().searchText = 'new-filter'
    const searching = state().loadAssetList({ preserveSelection: true })
    state().resetSelectionState()
    finish({ records: rows, total: 3 })
    await searching
    await flushPromises()
    expect(state().hasSelection).toBe(false)
    expect(state().allSelected).toBe(false)
    expect(mainTable().get('tbody input').element.checked).toBe(false)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('全选查看失败可重试，移除只加入排除项，关闭后迟到的查看结果不写入', async () => {
    await openPage()
    await state().handleToggleSelectAll()
    api.getAssetList.mockRejectedValueOnce(new Error('read failed'))
    await state().handleReviewSelection()
    await flushPromises()
    expect(state().selectionReviewError).toContain('失败')
    expect(state().selectedCount).toBe(3)
    await state().handleReviewSelection()
    await flushPromises()
    await state().removeSelectedAsset(rows[2])
    expect(state().selectedCount).toBe(2)
    expect(state().excludedRowIds).toEqual(['asset-c'])
    let finish
    api.getAssetList.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve
        })
    )
    const reading = state().handleReviewSelection()
    state().selectionReviewVisible = false
    await flushPromises()
    finish({ records: rows, total: 3 })
    await reading
    expect(state().selectionReviewResolvedRows).toEqual([])
    expect(api.post).not.toHaveBeenCalled()
  })
})
