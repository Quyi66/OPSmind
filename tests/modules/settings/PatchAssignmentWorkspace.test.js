import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, reactive } from 'vue'
import { ElMessage, ElTable, ElTableColumn, ElCheckbox, ElCheckboxGroup } from 'element-plus'
import { apiService } from '@/core/api'
import { authService } from '@/core/auth'
import AssignPatchDialog from '@/modules/user/components/dialogs/AssignPatchDialog.vue'

vi.mock('@/core/api', () => ({ apiService: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@/core/auth', () => ({ authService: { getCurrentUser: vi.fn() } }))
vi.mock('element-plus', async importOriginal => ({
  ...(await importOriginal()),
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() }
}))

const baseUrl = '/secops/api/secops/v2/patch/assignment'
const hostNames = {
  'host-a': '192.0.2.11',
  'host-b': '192.0.2.12',
  'host-c': '192.0.2.13',
  'host-d': '192.0.2.14'
}
const host = (host_id, host_key = hostNames[host_id] || host_id) => ({ host_id, host_key })
const patch = (patch_id, hosts) => ({ patch_id, patch_name: patch_id, ...(hosts ? { hosts } : {}) })
const fixtures = () => [
  patch('patch-a', [host('host-a'), host('host-b'), host('host-c')]),
  patch('patch-b', [host('host-b'), host('host-c'), host('host-d')]),
  patch('patch-c', [host('host-a'), host('host-c')])
]
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const Button = { props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' }
// 状态用例使用表格外壳；另有真实Element表格/复选框事件用例。
const TableShell = defineComponent({
  props: ['data'],
  emits: ['selection-change'],
  setup(_props, { expose, emit }) {
    expose({ clearSelection: () => emit('selection-change', []), toggleRowSelection: () => {} })
    return () => h('div')
  }
})
let wrapper, tenant, rows, records
async function open({ realTables = false, username = 'platform-fixture' } = {}) {
  wrapper = mount(AssignPatchDialog, {
    props: { visible: true, username },
    global: {
      components: { ElTable, ElTableColumn, ElCheckbox, ElCheckboxGroup },
      stubs: {
        'el-drawer': { ...Slot, name: 'DrawerShell' },
        'el-button': Button,
        'el-form': Slot,
        'el-form-item': Slot,
        ElTag: Slot,
        'el-input': true,
        ElDatePicker: true,
        ElEmpty: true,
        ElAlert: Slot,
        ElPagination: true,
        ElTable: realTables ? false : TableShell,
        ElTableColumn: realTables ? false : true,
        ElCheckbox: false,
        ElCheckboxGroup: false
      },
      directives: { loading: () => {} }
    }
  })
  await flushPromises()
  return wrapper.vm.$.setupState
}
const button = text => wrapper.findAll('button').find(item => item.text() === text)
async function choose(state, patchIndex, hostIndexes) {
  await state.activatePatch(state.availablePatches[patchIndex])
  await flushPromises()
  state.onHostSelectionChange(hostIndexes.map(index => state.paginatedHosts[index]))
  await flushPromises()
}
async function preview(state, targets = ['patch-b']) {
  state.reuseTargetIds = targets
  await flushPromises()
  await button('预览复用结果').trigger('click')
  await flushPromises()
}
beforeEach(() => {
  vi.clearAllMocks()
  apiService.get.mockReset()
  apiService.post.mockReset()
  authService.getCurrentUser.mockReset()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  tenant = reactive({ tenantId: 'tenant-fixture' })
  authService.getCurrentUser.mockImplementation(() => tenant)
  rows = fixtures()
  records = []
  apiService.get.mockImplementation(async (url, { params } = {}) => {
    if (url.endsWith('/list')) return { data: { content: records, totalElements: records.length } }
    const content = params.patchId ? rows.filter(item => item.patch_id === params.patchId) : rows
    return { data: { content, totalElements: content.length } }
  })
  apiService.post.mockResolvedValue({ data: { count: 2 } })
})
afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('补丁分配工作区（API为mock，无真实授权写入）', () => {
  it('真实Element表格勾选补丁并就地配置机器，切换后回显选择，只有一个抽屉', async () => {
    rows[0].hosts.push({ host_id: 'opaque-hidden-host' })
    await open({ realTables: true })
    const patchPane = wrapper.find('[aria-label="选择补丁"]')
    await patchPane.findAll('tbody tr')[0].find('input[type="checkbox"]').setValue(true)
    await flushPromises()
    await patchPane.findAll('tbody tr')[0].find('button').trigger('click')
    await flushPromises()
    const hostPane = () => wrapper.find('[aria-label="配置当前补丁机器"]')
    expect(hostPane().text()).not.toContain('机器ID')
    expect(hostPane().text()).not.toContain('opaque-hidden-host')
    expect(hostPane().text()).toContain('未提供主机/IP')
    await hostPane().findAll('tbody tr')[0].find('input[type="checkbox"]').setValue(true)
    await flushPromises()
    expect(wrapper.find('[aria-label="已选补丁"]').text()).toContain('patch-a · 1 台')
    await patchPane.findAll('tbody tr')[1].find('button').trigger('click')
    await flushPromises()
    expect(hostPane().text()).toContain('patch-b')
    await button('patch-a · 1 台').trigger('click')
    await flushPromises()
    expect(hostPane().findAll('tbody tr')[0].find('input[type="checkbox"]').element.checked).toBe(
      true
    )
    expect(wrapper.findAllComponents({ name: 'DrawerShell' })).toHaveLength(1)
    expect(wrapper.findAll('.assignment-workspace')).toHaveLength(1)
    expect(apiService.post).not.toHaveBeenCalled()
  })

  it.each(['候选不同', '候选相同'])(
    '真实Element切换两个已配置补丁或再次修改当前补丁，不清空各自的机器草稿（%s）',
    async mode => {
      if (mode === '候选相同') rows[1].hosts = rows[0].hosts.map(item => ({ ...item }))
      const state = await open({ realTables: true })
      const patchRows = () => wrapper.find('.patch-pane').findAll('tbody tr')
      const hostRows = () => wrapper.find('.host-pane').findAll('tbody tr')
      const selected = () => state.selectedPatches.map(item => [item.patch_id, item.selectedHosts])
      await patchRows()[0].find('button').trigger('click')
      await flushPromises()
      await hostRows()[1].find('input[type="checkbox"]').setValue(true)
      await patchRows()[1].find('button').trigger('click')
      await flushPromises()
      await hostRows()[2].find('input[type="checkbox"]').setValue(true)
      const expected = [
        ['patch-a', [host('host-b')]],
        ['patch-b', [rows[1].hosts[2]]]
      ]
      expect(selected()).toEqual(expected)
      for (const index of [1, 0, 1, 0]) {
        await patchRows()[index].find('button').trigger('click')
        await flushPromises()
        expect(selected()).toEqual(expected)
        expect(hostRows()[index === 0 ? 1 : 2].find('input[type="checkbox"]').element.checked).toBe(
          true
        )
      }
      expect(apiService.post).not.toHaveBeenCalled()
    }
  )

  it('真实Element目标勾选→预览→追加仅匹配机器，保留目标原选择且不写后台', async () => {
    const state = await open({ realTables: true })
    await choose(state, 1, [2]) // patch-b原有host-d
    await choose(state, 0, [0, 1])
    await wrapper.find('.reuse-panel input[type="checkbox"]').setValue(true)
    await flushPromises()
    await button('预览复用结果').trigger('click')
    await flushPromises()
    expect(state.reusePreview[0].unavailable).toEqual([host('host-a')])
    expect(wrapper.text()).toContain('192.0.2.11')
    for (const hostId of ['host-a', 'host-b', 'host-c', 'host-d']) {
      expect(wrapper.text()).not.toContain(hostId)
    }
    expect(state.selectedPatches.find(item => item.patch_id === 'patch-b').selectedHosts).toEqual([
      host('host-d')
    ])
    await button('确认追加到所选补丁').trigger('click')
    await flushPromises()
    expect(state.selectedPatches.find(item => item.patch_id === 'patch-b').selectedHosts).toEqual([
      host('host-d'),
      host('host-b')
    ])
    await state.activatePatch(state.selectedPatches.find(item => item.patch_id === 'patch-b'))
    await flushPromises()
    expect(state.activePatch.selectedHosts).toEqual([host('host-d'), host('host-b')])
    const hostRows = wrapper.find('.host-pane').findAll('tbody tr')
    expect(hostRows[0].find('input[type="checkbox"]').element.checked).toBe(true)
    expect(hostRows[2].find('input[type="checkbox"]').element.checked).toBe(true)
    expect(apiService.post).not.toHaveBeenCalled()
  })

  it('真实Element筛选和分页回显不改变草稿，用户单选和全选取消仍生效', async () => {
    const state = await open({ realTables: true })
    await wrapper.find('.patch-pane tbody tr button').trigger('click')
    await flushPromises()
    const pane = () => wrapper.find('.host-pane')
    const bodyCheckbox = index => pane().findAll('tbody tr')[index].find('input[type="checkbox"]')
    const headerCheckbox = () => pane().find('thead input[type="checkbox"]')
    await headerCheckbox().setValue(true)
    // Element表头全选有10ms防抖，等待实际事件，不能只等Vue微任务。
    await vi.waitFor(() => expect(state.activePatch.selectedHosts).toEqual(rows[0].hosts))
    state.hostPagination.pageSize = 1
    state.hostPagination.page = 2
    await state.syncHostSelection()
    await flushPromises()
    expect(bodyCheckbox(0).element.checked).toBe(true)
    expect(state.activePatch.selectedHosts).toHaveLength(3)
    await bodyCheckbox(0).setValue(false)
    await flushPromises()
    expect(state.activePatch.selectedHosts).toEqual([host('host-a'), host('host-c')])
    state.hostFilters.keyword = '192.0.2.13'
    state.handleHostSearch()
    await flushPromises()
    expect(bodyCheckbox(0).element.checked).toBe(true)
    await headerCheckbox().setValue(false)
    await vi.waitFor(() => expect(state.activePatch.selectedHosts).toEqual([host('host-a')]))
    state.hostFilters.keyword = ''
    state.hostPagination.pageSize = 20
    state.handleHostSearch()
    await flushPromises()
    expect(bodyCheckbox(0).element.checked).toBe(true)
    await state.syncHostSelection()
    expect(state.activePatch.selectedHosts).toEqual([host('host-a')])
    await headerCheckbox().setValue(true)
    await vi.waitFor(() => expect(state.activePatch.selectedHosts).toEqual(rows[0].hosts))
    await headerCheckbox().setValue(false)
    await vi.waitFor(() => expect(state.activePatch.selectedHosts).toEqual([]))
    expect(apiService.post).not.toHaveBeenCalled()
  })

  it('不同补丁选择独立，取消后重开清空，默认次日过期保持', async () => {
    const state = await open()
    const nextDay = new Date()
    nextDay.setDate(nextDay.getDate() + 1)
    expect(new Date(state.assignForm.expireTime).getDate()).toBe(nextDay.getDate())
    await choose(state, 0, [0])
    await choose(state, 1, [2])
    expect(state.selectedPatches.map(item => item.selectedHosts)).toEqual([
      [host('host-a')],
      [host('host-d')]
    ])
    await button('取消').trigger('click')
    expect(wrapper.emitted('update:visible')).toContainEqual([false])
    expect(apiService.post).not.toHaveBeenCalled()
    await wrapper.setProps({ visible: false })
    await wrapper.setProps({ visible: true })
    await flushPromises()
    expect(state.selectedPatches).toEqual([])
  })

  it('补丁跨页/搜索保留机器映射，同页取消勾选只移除该补丁草稿', async () => {
    const state = await open()
    await choose(state, 0, [0])
    rows = [patch('patch-z', [host('host-z')])]
    state.patchPagination.page = 2
    await state.loadAvailablePatches()
    await flushPromises()
    state.onPatchSelectionChange(state.availablePatches)
    await flushPromises()
    expect(state.selectedPatches.map(item => item.patch_id)).toEqual(['patch-a', 'patch-z'])
    state.onPatchSelectionChange([])
    expect(state.selectedPatches).toHaveLength(1)
    expect(state.selectedPatches[0].selectedHosts).toEqual([host('host-a')])
  })

  it('机器跨筛选和分页保留选择，同页取消不影响隐藏机器', async () => {
    const state = await open()
    await choose(state, 0, [0])
    state.hostPagination.pageSize = 1
    state.hostPagination.page = 2
    await state.syncHostSelection()
    state.onHostSelectionChange([state.paginatedHosts[0]])
    expect(state.activePatch.selectedHosts).toEqual([host('host-a'), host('host-b')])
    state.hostFilters.keyword = '192.0.2.13'
    state.handleHostSearch()
    await flushPromises()
    state.onHostSelectionChange([state.paginatedHosts[0]])
    state.onHostSelectionChange([])
    expect(state.activePatch.selectedHosts).toEqual([host('host-a'), host('host-b')])
  })

  it('显式目标、交集追加、去重；一次预览支持多个目标，未选目标不变化', async () => {
    const state = await open()
    await choose(state, 1, [1, 2])
    await choose(state, 2, [])
    await choose(state, 0, [0, 1, 2])
    await preview(state, ['patch-b', 'patch-c'])
    expect(
      state.reusePreview.map(row => [row.matched.length, row.added.length, row.finalHosts.length])
    ).toEqual([
      [2, 1, 3],
      [2, 2, 2]
    ])
    await button('确认追加到所选补丁').trigger('click')
    expect(
      state.selectedPatches
        .find(item => item.patch_id === 'patch-b')
        .selectedHosts.map(item => item.host_id)
    ).toEqual(['host-c', 'host-d', 'host-b'])
    expect(
      state.selectedPatches
        .find(item => item.patch_id === 'patch-c')
        .selectedHosts.map(item => item.host_id)
    ).toEqual(['host-a', 'host-c'])
    await preview(state, ['patch-b'])
    expect(state.canApplyReuse).toBe(false) // 重复应用不会额外追加
    expect(apiService.post).not.toHaveBeenCalled()
  })

  it.each(['源机器', '目标机器', '目标集合', '当前补丁', '移除目标'])(
    '%s变化使预览失效，旧预览不可应用',
    async change => {
      const state = await open()
      await choose(state, 1, [])
      await choose(state, 0, [1])
      await preview(state)
      expect(state.canApplyReuse).toBe(true)
      const target = state.selectedPatches.find(item => item.patch_id === 'patch-b')
      if (change === '源机器') state.activePatch.selectedHosts = [host('host-c')]
      if (change === '目标机器') target.selectedHosts = [host('host-d')]
      if (change === '目标集合') state.reuseTargetIds = []
      if (change === '当前补丁') await state.activatePatch(target)
      if (change === '移除目标') state.removePatch('patch-b')
      state.applyReuse()
      expect(state.reusePreview).toEqual([])
      expect(target.selectedHosts).not.toContainEqual(host('host-b'))
    }
  )

  it('没有匹配机器时明确不适用并禁追加，取消预览保持原草稿', async () => {
    const state = await open()
    await choose(state, 1, [2])
    await choose(state, 0, [0])
    await preview(state)
    expect(state.reusePreview[0].unavailable).toEqual([host('host-a')])
    expect(state.canApplyReuse).toBe(false)
    await button('取消预览').trigger('click')
    expect(state.selectedPatches[0].selectedHosts).toEqual([host('host-d')])
  })

  it.each(['失败', '缺失', '重复', '无机器字段'])(
    '目标候选%s禁追加，不取模糊搜索首项，允许明确重试',
    async kind => {
      const state = await open()
      await choose(state, 1, [])
      await choose(state, 0, [1])
      const target = state.selectedPatches[0]
      target.hostsStatus = 'idle'
      state.availablePatches = []
      if (kind === '失败') apiService.get.mockRejectedValueOnce(new Error('read failure'))
      if (kind === '缺失')
        apiService.get.mockResolvedValueOnce({
          data: { content: [patch('patch-other', [host('host-b')])] }
        })
      if (kind === '重复')
        apiService.get.mockResolvedValueOnce({ data: { content: [rows[1], rows[1]] } })
      if (kind === '无机器字段')
        apiService.get.mockResolvedValueOnce({ data: { content: [patch('patch-b')] } })
      await preview(state)
      expect(state.canApplyReuse).toBe(false)
      expect(state.reusePreview[0].error).toContain('读取失败')
      expect(target.selectedHosts).toEqual([])
      await preview(state)
      expect(state.canApplyReuse).toBe(true)
    }
  )

  it('同IP不同ID不复用，不将分配记录id或hostKey猜为机器ID', async () => {
    records = [{ id: 'record-only', patchId: 'patch-b', hostKey: 'shared-address' }]
    rows[0].hosts = [host('id-a', 'shared-address')]
    rows[1].hosts = [host('id-b', 'shared-address')]
    const state = await open()
    expect(state.selectedPatches[0].selectedHosts[0].host_id).toBe('')
    await choose(state, 0, [0])
    await preview(state)
    expect(state.reusePreview[0].error).toContain('信息不完整')
    expect(state.reusePreview[0].matched).toEqual([])
    state.clearPreview()
    await state.submitAssign()
    expect(apiService.post).not.toHaveBeenCalled()
  })

  it('已有分配读取失败/不完整禁配置和提交，重试恢复', async () => {
    apiService.get.mockRejectedValueOnce(new Error('assigned read failure'))
    const state = await open()
    expect(state.locked).toBe(true)
    await state.activatePatch(state.availablePatches[0])
    await state.submitAssign()
    expect(state.selectedPatches).toEqual([])
    expect(apiService.post).not.toHaveBeenCalled()
    apiService.get.mockResolvedValueOnce({ data: { content: [], totalElements: 1001 } })
    await state.loadAssignedPatches()
    expect(state.assignedError).toContain('不完整')
    await state.loadAssignedPatches()
    expect(state.locked).toBe(false)
  })

  it('已有记录按补丁分组/真实机器ID去重，缺少候选不重写原ID', async () => {
    records = [
      { id: 'record-1', patchId: 'existing', hostId: 'real-host', hostKey: 'address' },
      { id: 'record-2', patchId: 'existing', hostId: 'real-host', hostKey: 'address' }
    ]
    const state = await open()
    expect(state.selectedPatches[0].selectedHosts).toEqual([host('real-host', 'address')])
    await state.submitAssign()
    expect(apiService.post.mock.calls[0][1].items).toEqual([
      { patchId: 'existing', hostIds: ['real-host'] }
    ])
  })

  it('原POST正文/手动保存保持，空过期与备注沿undefined语义，未选补丁不被提交', async () => {
    const state = await open()
    await choose(state, 0, [0, 1])
    await choose(state, 1, [2])
    state.assignForm = { expireTime: '', remark: '' }
    expect(apiService.post).not.toHaveBeenCalled()
    await button('确定分配').trigger('click')
    await flushPromises()
    expect(apiService.post).toHaveBeenCalledExactlyOnceWith(baseUrl, {
      userLogin: 'platform-fixture',
      items: [
        { patchId: 'patch-a', hostIds: ['host-a', 'host-b'] },
        { patchId: 'patch-b', hostIds: ['host-d'] }
      ],
      expireTime: undefined,
      remark: undefined
    })
    expect(wrapper.emitted('success')).toHaveLength(1)
    expect(wrapper.emitted('update:visible')).toContainEqual([false])
  })

  it('失败保留选择/过期/备注；在途阻止重复提交及关闭，载荷快照保持', async () => {
    const state = await open()
    await choose(state, 0, [0])
    state.assignForm.remark = 'fixture-remark'
    const wait = deferred()
    apiService.post.mockReturnValueOnce(wait.promise)
    const saving = state.submitAssign()
    await state.submitAssign()
    state.closeDialog()
    state.activePatch.selectedHosts.push(host('host-b'))
    expect(apiService.post.mock.calls[0][1].items[0].hostIds).toEqual(['host-a'])
    expect(wrapper.emitted('update:visible')).toBeUndefined()
    wait.reject(new Error('write failure'))
    await saving
    expect(ElMessage.error).toHaveBeenCalledWith('分配失败')
    expect(state.assignLoading).toBe(false)
    expect(state.assignForm.remark).toBe('fixture-remark')
    await state.submitAssign()
    expect(apiService.post).toHaveBeenCalledTimes(2)
  })

  it('缺机器及未处理预览不能提交', async () => {
    const state = await open()
    await choose(state, 1, [])
    await state.submitAssign()
    expect(apiService.post).not.toHaveBeenCalled()
    await choose(state, 0, [1])
    await preview(state)
    await state.submitAssign()
    expect(apiService.post).not.toHaveBeenCalled()
  })

  it('搜索旧响应不能覆盖新结果，列表读取失败可重试且草稿不丢', async () => {
    const state = await open()
    await choose(state, 0, [0])
    const old = deferred()
    apiService.get.mockReturnValueOnce(old.promise)
    const oldLoad = state.loadAvailablePatches()
    rows = [patch('new-result', [host('new-host')])]
    await state.loadAvailablePatches()
    old.resolve({ data: { content: fixtures() } })
    await oldLoad
    expect(state.availablePatches[0].patch_id).toBe('new-result')
    apiService.get.mockRejectedValueOnce(new Error('read failure'))
    await state.loadAvailablePatches()
    expect(state.patchListError).toBe(true)
    expect(state.selectedPatches[0].selectedHosts).toEqual([host('host-a')])
    await state.loadAvailablePatches()
    expect(state.patchListError).toBe(false)
  })

  it.each(['关闭重开', '换用户', '换租户', '卸载'])(
    '%s后旧复用候选不能覆盖新草稿或发写请求',
    async action => {
      const state = await open()
      await choose(state, 1, [])
      await choose(state, 0, [1])
      state.selectedPatches[0].hostsStatus = 'idle'
      state.availablePatches = []
      const old = deferred()
      apiService.get.mockReturnValueOnce(old.promise)
      state.reuseTargetIds = ['patch-b']
      await flushPromises()
      const reading = state.previewReuse()
      if (action === '关闭重开') {
        await wrapper.setProps({ visible: false })
        await wrapper.setProps({ visible: true })
      }
      if (action === '换用户') await wrapper.setProps({ username: 'other-user' })
      if (action === '换租户') tenant.tenantId = 'other-tenant'
      if (action === '卸载') wrapper.unmount()
      await flushPromises()
      old.resolve({ data: { content: fixtures() } })
      await reading
      expect(state.reusePreview).toEqual([])
      expect(apiService.post).not.toHaveBeenCalled()
      if (action !== '卸载') expect(state.selectedPatches).toEqual([])
    }
  )

  it('切补丁后迟到候选不覆盖当前机器；移除后不复活旧补丁', async () => {
    const state = await open()
    state.availablePatches[0].hostsStatus = 'idle'
    const wait = deferred()
    apiService.get.mockReturnValueOnce(wait.promise)
    const activating = state.activatePatch(state.availablePatches[0])
    await choose(state, 1, [2])
    state.removePatch('patch-a')
    wait.resolve({ data: { content: fixtures() } })
    await activating
    expect(state.activePatch.patch_id).toBe('patch-b')
    expect(state.activePatch.selectedHosts).toEqual([host('host-d')])
    expect(state.selectedPatches).toHaveLength(1)
  })

  it('旧分配成功不能关闭新用户草稿或发送成功事件', async () => {
    const state = await open()
    await choose(state, 0, [0])
    const wait = deferred()
    apiService.post.mockReturnValueOnce(wait.promise)
    const saving = state.submitAssign()
    await wrapper.setProps({ username: 'new-user' })
    await flushPromises()
    state.assignForm.remark = 'new-draft'
    wait.resolve({ data: { count: 1 } })
    await saving
    expect(wrapper.emitted('success')).toBeUndefined()
    expect(wrapper.emitted('update:visible')).toBeUndefined()
    expect(state.assignForm.remark).toBe('new-draft')
  })

  it('真实表格翻页/搜索返回后仍勾选原补丁，并保留机器草稿', async () => {
    const state = await open({ realTables: true })
    await choose(state, 0, [1])
    rows = [patch('page-two', [host('host-z')])]
    await state.loadAvailablePatches()
    await flushPromises()
    const pane = () => wrapper.find('[aria-label="选择补丁"]')
    await pane().findAll('tbody tr')[0].find('input[type="checkbox"]').setValue(true)
    await flushPromises()
    rows = fixtures()
    await state.loadAvailablePatches()
    await flushPromises()
    expect(pane().findAll('tbody tr')[0].find('input[type="checkbox"]').element.checked).toBe(true)
    expect(state.selectedPatches.find(item => item.patch_id === 'patch-a').selectedHosts).toEqual([
      host('host-b')
    ])
    expect(state.selectedPatches.some(item => item.patch_id === 'page-two')).toBe(true)
  })

  it('清空所选只清草稿，不发撤销或分配请求', async () => {
    const state = await open()
    await choose(state, 0, [0])
    await choose(state, 1, [2])
    await button('清空所选补丁').trigger('click')
    expect(state.selectedPatches).toEqual([])
    expect(state.activePatchId).toBe('')
    expect(apiService.post).not.toHaveBeenCalled()
  })

  it('同一补丁重复打开合并候选读取，预览在途中更改源选择后失效', async () => {
    const state = await open()
    await choose(state, 1, [])
    await choose(state, 0, [1])
    const target = state.selectedPatches.find(item => item.patch_id === 'patch-b')
    target.hostsStatus = 'idle'
    state.availablePatches = []
    const wait = deferred()
    apiService.get.mockReturnValueOnce(wait.promise)
    const readsBefore = apiService.get.mock.calls.length
    const first = state.ensureHosts(target)
    const second = state.ensureHosts(target)
    expect(apiService.get.mock.calls.length - readsBefore).toBe(1)
    state.reuseTargetIds = ['patch-b']
    const reading = state.previewReuse()
    state.activePatch.selectedHosts = [host('host-c')]
    wait.resolve({ data: { content: fixtures() } })
    await Promise.all([first, second, reading])
    expect(state.reusePreview).toEqual([])
    expect(target.selectedHosts).toEqual([])
    expect(state.previewLoading).toBe(false)
  })

  it('换用户后旧已有记录响应不污染新用户初始分配', async () => {
    const old = deferred()
    apiService.get.mockReturnValueOnce(old.promise)
    const state = await open()
    expect(state.loadingAssigned).toBe(true)
    records = [{ patchId: 'new-patch', hostId: 'new-host' }]
    await wrapper.setProps({ username: 'new-user' })
    await flushPromises()
    old.resolve({ data: { content: [{ patchId: 'old-patch', hostId: 'old-host' }] } })
    await flushPromises()
    expect(state.selectedPatches.map(item => item.patch_id)).toEqual(['new-patch'])
  })

  it.each([' ', {}, true])('机器身份%s不能作为可复用候选或提交ID', async invalidId => {
    rows[0].hosts = [{ host_id: invalidId, host_key: 'display-only' }]
    const state = await open()
    await state.activatePatch(state.availablePatches[0])
    expect(state.activePatch.hostsStatus).toBe('error')
    expect(state.canSelectHost()).toBe(false)
    await state.submitAssign()
    expect(apiService.post).not.toHaveBeenCalled()
  })
})
