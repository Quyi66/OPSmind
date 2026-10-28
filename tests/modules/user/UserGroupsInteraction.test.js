import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { computed, defineComponent, h, inject, provide, KeepAlive, ref } from 'vue'
import { ElTable, ElTableColumn } from 'element-plus/es/components/table/index.mjs'
import { ElPagination } from 'element-plus/es/components/pagination/index.mjs'
import UserGroupsPage from '@/modules/user/views/UserGroupsPage.vue'
import CreateGroupDialog from '@/modules/user/components/dialogs/CreateGroupDialog.vue'
import DeleteGroupDialog from '@/modules/user/components/dialogs/DeleteGroupDialog.vue'

const api = vi.hoisted(() => ({
  groups: vi.fn(),
  post: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  poll: vi.fn(),
  stop: vi.fn(),
  validate: vi.fn()
}))
vi.mock('@/modules/user/api', () => ({ getUserGroups: api.groups }))
vi.mock('@/core/api', () => ({ apiService: { post: api.post } }))
vi.mock('element-plus', () => ({ ElMessage: { success: api.success, warning: api.warning } }))
vi.mock('@/composables/useJobPolling', () => ({
  useJobPolling: () => ({ startPolling: api.poll, stopPolling: api.stop })
}))
vi.mock('@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue', () => ({
  default: { name: 'AcmDeviceSelector', props: ['modelValue', 'disabled'], template: '<div />' }
}))
const Table = defineComponent({
  name: 'ElTable',
  props: ['data', 'emptyText'],
  setup(props) {
    provide(
      'groupRows',
      computed(() => props.data)
    )
  },
  template: '<div><slot /><p v-if="!data.length">{{ emptyText }}</p></div>'
})
const Column = defineComponent({
  name: 'ElTableColumn',
  props: ['prop', 'label'],
  inheritAttrs: false,
  setup(props, { slots }) {
    const rows = inject('groupRows')
    return () =>
      rows.value.map(row =>
        h(
          'div',
          { 'data-row': row.id, 'data-column': props.label },
          slots.default?.({ row }) || row[props.prop]
        )
      )
  }
})
const Form = defineComponent({
  name: 'ElForm',
  props: ['disabled'],
  setup(_props, { expose }) {
    expose({ validate: api.validate, resetFields: () => {} })
  },
  template: '<form><slot /></form>'
})
const Slot = { template: '<div><slot /></div>' }
const stubs = {
  'el-form': Form,
  'el-form-item': Slot,
  'el-input': {
    name: 'ElInput',
    props: ['modelValue'],
    emits: ['update:modelValue', 'clear'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  },
  'el-button': {
    props: ['disabled', 'loading'],
    template: '<button :disabled="disabled || loading"><slot /></button>'
  },
  'el-dialog': {
    props: ['modelValue'],
    template: '<section v-if="modelValue"><slot /><slot name="footer" /></section>'
  },
  ElIcon: Slot,
  ElAlert: {
    props: ['title', 'description'],
    template: '<aside role="alert">{{ title }}<slot name="title" />{{ description }}</aside>'
  },
  ElDescriptions: Slot,
  ElDescriptionsItem: Slot,
  ElTable: Table,
  ElTableColumn: Column,
  ElPagination: {
    name: 'ElPagination',
    props: ['currentPage', 'pageSize', 'total', 'disabled'],
    template: '<nav>{{ total }}</nav>'
  }
}
const row = (id = 'g1', extra = {}) => ({
  id,
  host_id: `asset-${id}`,
  host_key: '192.0.2.8',
  hostname: `server-${id}`,
  group_name: `group-${id}`,
  gid: 1001,
  users: 'alice,bob',
  created_at: '2026-10-22T08:00:00Z',
  ...extra
})
const result = (records = [row()], total = 35) => ({ data: { records, total } })
const query = (page = 1, size = 10, keyword = '') => ({
  hostObject: '@@(linux)',
  page,
  size,
  filter: keyword ? `hostname|host_key|group_name:*${keyword}*` : ''
})
const hosts = [
  { key: 'asset-7', value: '192.0.2.7', assetType: 'linux', runType: 'group', total_hosts: 3 }
]
const target = {
  hostId: 'asset-g1',
  host_key: '192.0.2.8',
  hostname: 'server-g1',
  group_name: 'group-g1'
}
const wrappers = []
const state = wrapper => wrapper.vm.$.setupState
const button = (wrapper, label) => wrapper.findAll('button').find(item => item.text() === label)
const refresh = wrapper => wrapper.find('button[title="刷新"]')
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
async function openPage(real = false) {
  const wrapper = mount(UserGroupsPage, {
    global: {
      stubs: { ...stubs, ...(real ? { ElTable, ElTableColumn, ElPagination } : {}) },
      directives: { loading: () => {} }
    }
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}
async function openDialog(component, props = {}) {
  const wrapper = mount(component, {
    props: {
      visible: true,
      'onUpdate:visible': value => wrapper.setProps({ visible: value }),
      ...props
    },
    global: { stubs, directives: { loading: () => {} } }
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}
beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset())
  api.groups.mockImplementation(params => Promise.resolve(result([row(`p${params.page}`)])))
  api.post.mockResolvedValue({
    data: { status: 'FAILED', error: 'original reason', runId: 'group-run' }
  })
  api.validate.mockResolvedValue(true)
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
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('用户组查询状态与分页', () => {
  it('保留原GET参数与独立分区；草稿不影响刷新/分页/弹窗回调', async () => {
    const wrapper = await openPage()
    expect(api.groups).toHaveBeenCalledExactlyOnceWith(query())
    expect(wrapper.find('.ops-filter-bar').exists()).toBe(true)
    expect(wrapper.find('.ops-action-bar').exists()).toBe(true)
    await wrapper.find('input').setValue('applied')
    await button(wrapper, '搜索').trigger('click')
    await flushPromises()
    await wrapper.find('input').setValue('draft')
    await refresh(wrapper).trigger('click')
    await flushPromises()
    expect(api.groups).toHaveBeenLastCalledWith(query(1, 10, 'applied'))
    state(wrapper).handleCurrentPageChange(2)
    await flushPromises()
    expect(api.groups).toHaveBeenLastCalledWith(query(2, 10, 'applied'))
    wrapper.findComponent(CreateGroupDialog).vm.$emit('success')
    await flushPromises()
    expect(api.groups).toHaveBeenLastCalledWith(query(2, 10, 'applied'))
    expect(state(wrapper).currentPage).toBe(2)
    expect(wrapper.find('input').element.value).toBe('draft')
  })
  it('Enter/清空应用；重置一次请求，清条件并回首页10条', async () => {
    const wrapper = await openPage()
    await wrapper.find('input').setValue('alpha')
    await wrapper.find('input').trigger('keyup.enter')
    await flushPromises()
    expect(api.groups).toHaveBeenLastCalledWith(query(1, 10, 'alpha'))
    const input = wrapper.findComponent({ name: 'ElInput' })
    input.vm.$emit('update:modelValue', '')
    input.vm.$emit('clear')
    await flushPromises()
    expect(api.groups).toHaveBeenLastCalledWith(query())
    state(wrapper).handlePageSizeChange(50)
    await flushPromises()
    api.groups.mockClear()
    await button(wrapper, '重置').trigger('click')
    await flushPromises()
    expect(api.groups).toHaveBeenCalledExactlyOnceWith(query())
    expect(state(wrapper).currentPage).toBe(1)
    expect(state(wrapper).pageSize).toBe(10)
  })
  it('读取途中搜索/重置不被加载锁丢弃，旧成功/失败/finally不覆盖最新读取', async () => {
    const wrapper = await openPage()
    const old = deferred(),
      current = deferred()
    api.groups.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    await wrapper.find('input').setValue('old')
    await wrapper.find('input').trigger('keyup.enter')
    await button(wrapper, '重置').trigger('click')
    expect(api.groups.mock.lastCall[0]).toEqual(query())
    old.resolve(result([row('old')], 99))
    await flushPromises()
    expect(state(wrapper).loading).toBe(true)
    expect(state(wrapper).tableData).toEqual([])
    current.resolve(result([row('current')], 1))
    await flushPromises()
    expect(state(wrapper).tableData[0].id).toBe('current')
    expect(state(wrapper).loading).toBe(false)
  })
  it('换页大小只发一次GET，随后原分页回首页事件不重复读取', async () => {
    const wrapper = await openPage()
    state(wrapper).handleCurrentPageChange(3)
    await flushPromises()
    api.groups.mockClear()
    const pagination = wrapper.findComponent({ name: 'ElPagination' })
    pagination.vm.$emit('update:page-size', 20)
    pagination.vm.$emit('update:current-page', 1)
    await flushPromises()
    expect(api.groups).toHaveBeenCalledExactlyOnceWith(query(1, 20))
    expect(state(wrapper).currentPage).toBe(1)
  })
  it('真实零总数不沿用旧值，缺总数不伪造可翻页', async () => {
    const wrapper = await openPage()
    api.groups.mockResolvedValueOnce(result([], 0))
    await refresh(wrapper).trigger('click')
    await flushPromises()
    expect(state(wrapper).total).toBe(0)
    expect(wrapper.text()).toContain('暂无符合条件的用户组')
    api.groups.mockResolvedValueOnce({ data: { records: [row()] } })
    await refresh(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('未返回可确认的用户组总数')
    expect(wrapper.findComponent({ name: 'ElPagination' }).exists()).toBe(false)
    expect(state(wrapper).tableData).toHaveLength(1)
  })
  it('真实Element分页切页、大小变化、刷新保留有效页码及收缩校正，无额外循环GET', async () => {
    const wrapper = await openPage(true)
    expect(wrapper.findAll('th').map(th => th.text())).toEqual([
      'IP',
      '主机名',
      '组名',
      'GID',
      '用户',
      '创建时间',
      '操作'
    ])
    expect(wrapper.find('th.is-sortable').exists()).toBe(false)
    await wrapper
      .findAll('.el-pager li.number')
      .find(item => item.text() === '3')
      .trigger('click')
    await flushPromises()
    expect(state(wrapper).currentPage).toBe(3)
    expect(api.groups).toHaveBeenLastCalledWith(query(3))
    api.groups
      .mockClear()
      .mockResolvedValueOnce(result([], 11))
      .mockResolvedValue(result([row('last')], 11))
    await refresh(wrapper).trigger('click')
    await flushPromises()
    expect(api.groups.mock.calls.map(([params]) => params.page)).toEqual([3, 2])
    expect(state(wrapper).currentPage).toBe(2)
    expect(state(wrapper).total).toBe(11)
    expect(state(wrapper).tableData[0].id).toBe('last')
    api.groups.mockClear()
    wrapper.findComponent(ElPagination).vm.$emit('update:page-size', 20)
    await flushPromises()
    expect(api.groups).toHaveBeenCalledExactlyOnceWith(query(1, 20))
  })
  it('收缩校正仍用原已应用关键词，最多补查一次，不跟随草稿', async () => {
    const wrapper = await openPage()
    await wrapper.find('input').setValue('key')
    await wrapper.find('input').trigger('keyup.enter')
    await flushPromises()
    state(wrapper).handleCurrentPageChange(4)
    await flushPromises()
    await wrapper.find('input').setValue('draft')
    api.groups
      .mockClear()
      .mockResolvedValueOnce(result([], 11))
      .mockResolvedValueOnce(result([], 0))
    await refresh(wrapper).trigger('click')
    await flushPromises()
    expect(api.groups.mock.calls.map(([params]) => params)).toEqual([
      query(4, 10, 'key'),
      query(2, 10, 'key')
    ])
    expect(state(wrapper).readError).toContain('读取失败')
    expect(state(wrapper).loading).toBe(false)
  })
  it('真实分页在删除回调后总数归零时补查首页一次，保留零而不沿旧total', async () => {
    const wrapper = await openPage(true)
    await wrapper
      .findAll('.el-pager li.number')
      .find(item => item.text() === '3')
      .trigger('click')
    await flushPromises()
    api.groups.mockClear().mockResolvedValue(result([], 0))
    wrapper.findComponent(DeleteGroupDialog).vm.$emit('success')
    await flushPromises()
    expect(api.groups.mock.calls.map(([params]) => params.page)).toEqual([3, 1])
    expect(state(wrapper).currentPage).toBe(1)
    expect(state(wrapper).total).toBe(0)
    expect(wrapper.findComponent(ElPagination).props('total')).toBe(0)
    expect(wrapper.text()).toContain('暂无符合条件的用户组')
  })
})

describe('用户组读取反馈与操作身份', () => {
  it('同查询失败保留并标记旧行/总数，禁止旧行删除；重试后恢复', async () => {
    const wrapper = await openPage()
    const oldRow = state(wrapper).tableData[0]
    api.groups.mockRejectedValueOnce(new Error('network'))
    await refresh(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('可能已过期')
    expect(state(wrapper).total).toBe(35)
    expect(button(wrapper, '删除').attributes('disabled')).toBeDefined()
    state(wrapper).handleDeleteSingleGroup(oldRow)
    expect(state(wrapper).showDeleteGroupDialog).toBe(false)
    await button(wrapper, '重试读取').trigger('click')
    await flushPromises()
    expect(button(wrapper, '删除').attributes('disabled')).toBeUndefined()
  })
  it('换关键词失败清旧行及旧总数，重试仍使用应用值', async () => {
    const wrapper = await openPage()
    api.groups.mockRejectedValueOnce(new Error('network'))
    await wrapper.find('input').setValue('new')
    await wrapper.find('input').trigger('keyup.enter')
    await flushPromises()
    expect(state(wrapper).tableData).toEqual([])
    expect(state(wrapper).total).toBe(0)
    await wrapper.find('input').setValue('draft')
    await button(wrapper, '重试读取').trigger('click')
    await flushPromises()
    expect(api.groups).toHaveBeenLastCalledWith(query(1, 10, 'new'))
  })
  it.each([
    { response: { status: 401 } },
    { response: { status: 403 } },
    new Error('Authentication expired'),
    new Error('Access denied')
  ])('认证/权限失败清行且无普通重试 %j', async error => {
    const wrapper = await openPage()
    api.groups.mockRejectedValueOnce(error)
    await refresh(wrapper).trigger('click')
    await flushPromises()
    expect(state(wrapper).tableData).toEqual([])
    expect(state(wrapper).total).toBe(0)
    expect(wrapper.text()).toContain('登录已失效或无权访问')
    expect(button(wrapper, '重试读取')).toBeUndefined()
  })
  it('迟到失败不覆盖新结果，非法总数不当可信空结果', async () => {
    const wrapper = await openPage()
    const old = deferred()
    api.groups.mockReturnValueOnce(old.promise).mockResolvedValueOnce(result([row('latest')], 2))
    state(wrapper).handleCurrentPageChange(2)
    await flushPromises()
    await button(wrapper, '重置').trigger('click')
    await flushPromises()
    old.reject(new Error('Access denied'))
    await flushPromises()
    expect(state(wrapper).tableData[0].id).toBe('latest')
    expect(state(wrapper).readError).toBe('')
    api.groups.mockResolvedValueOnce(result([row('bad')], 0))
    await refresh(wrapper).trigger('click')
    await flushPromises()
    expect(state(wrapper).readError).toContain('刷新失败')
    expect(state(wrapper).tableData[0].id).toBe('latest')
  })
  it('单行删除保留原host_id/组名和警告，不通过同名/IP猜主机', async () => {
    api.groups.mockResolvedValue(result([row('real'), row('missing', { host_id: '' })], 2))
    const wrapper = await openPage()
    const data = state(wrapper).tableData
    state(wrapper).handleDeleteSingleGroup(data[1])
    expect(state(wrapper).showDeleteGroupDialog).toBe(false)
    await wrapper.find('[data-row="real"][data-column="操作"] button').trigger('click')
    await flushPromises()
    const dialog = wrapper.findComponent(DeleteGroupDialog)
    expect(dialog.props('groupData')).toEqual({
      hostId: 'asset-real',
      group_name: 'group-real',
      host_key: '192.0.2.8',
      hostname: 'server-real'
    })
    expect(dialog.text()).toContain('不可逆')
    expect(api.post).not.toHaveBeenCalled()
    await button(dialog, '确认删除用户组').trigger('click')
    await flushPromises()
    expect(api.post.mock.lastCall[0]).toContain('/jobs/J0PRi7/run?')
    expect(api.post.mock.lastCall[1]).toEqual({
      params: { group_name: 'group-real', hosts: 'asset-real' }
    })
  })
  it('工具栏删除另选主机和组名，不隐式带入列表行', async () => {
    const wrapper = await openPage()
    await button(wrapper, '按主机批量删除').trigger('click')
    await flushPromises()
    const dialog = wrapper.findComponent(DeleteGroupDialog)
    expect(dialog.props('groupData')).toBe(null)
    expect(dialog.text()).toContain('不使用列表行选择')
    expect(state(dialog).selectedHosts).toEqual([])
    expect(state(dialog).groupName).toBe('')
    await button(dialog, '确认删除用户组').trigger('click')
    expect(api.post).not.toHaveBeenCalled()
  })
  it('卸载后不回填；无效日期显示横线', async () => {
    const pending = deferred()
    api.groups.mockReturnValueOnce(pending.promise)
    const wrapper = await openPage()
    const setup = state(wrapper)
    expect(setup.formatDateTime('invalid')).toBe('-')
    wrapper.unmount()
    pending.resolve(result([row('late')], 9))
    await flushPromises()
    expect(setup.tableData).toEqual([])
    expect(setup.loading).toBe(false)
  })
  it('KeepAlive中断在途读取，返回手动重试，无额外自动请求', async () => {
    const shown = ref(true),
      pending = deferred()
    api.groups.mockReturnValueOnce(pending.promise)
    const wrapper = mount(
      defineComponent({
        setup: () => () => h(KeepAlive, null, () => (shown.value ? h(UserGroupsPage) : null))
      }),
      {
        global: { stubs, directives: { loading: () => {} } }
      }
    )
    wrappers.push(wrapper)
    await flushPromises()
    shown.value = false
    await flushPromises()
    pending.resolve(result([row('late')], 9))
    await flushPromises()
    shown.value = true
    await flushPromises()
    expect(wrapper.text()).toContain('读取已中断')
    expect(api.groups).toHaveBeenCalledTimes(1)
    await button(wrapper, '重试读取').trigger('click')
    await flushPromises()
    expect(api.groups).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('group-p1')
  })
})

describe('创建/删除用户组原作业与任务反馈', () => {
  it('创建校验/原主机对象及组名保持，异步校验关闭后不得提交', async () => {
    const wrapper = await openDialog(CreateGroupDialog)
    state(wrapper).selectedHosts = hosts
    state(wrapper).formData.group_name = 'original-group'
    await flushPromises()
    await button(wrapper, '确认创建用户组').trigger('click')
    await flushPromises()
    expect(api.post.mock.lastCall[0]).toContain('/jobs/zrYK7K/run?')
    expect(api.post.mock.lastCall[1]).toEqual({ params: { hosts, group_name: 'original-group' } })
    expect(wrapper.text()).toContain('任务执行失败')
    const pending = deferred()
    state(wrapper).handleClose()
    await flushPromises()
    await wrapper.setProps({ visible: true })
    await flushPromises()
    state(wrapper).selectedHosts = hosts
    state(wrapper).formData.group_name = 'draft'
    api.validate.mockReturnValueOnce(pending.promise)
    state(wrapper).handleSubmit()
    await flushPromises()
    state(wrapper).handleClose()
    await flushPromises()
    await wrapper.setProps({ visible: true })
    await flushPromises()
    pending.resolve(true)
    await flushPromises()
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(state(wrapper).formData.group_name).toBe('')
  })
  it('批量删除保持key/id逗号参数，缺失任意主机标识则整体阻止', async () => {
    const wrapper = await openDialog(DeleteGroupDialog)
    state(wrapper).groupName = 'shared-group'
    state(wrapper).selectedHosts = [{ key: 'asset-one', value: 'same-ip' }, { value: 'same-ip' }]
    state(wrapper).handleSubmit()
    expect(api.post).not.toHaveBeenCalled()
    expect(api.warning).toHaveBeenLastCalledWith('所选主机缺少标识，请重新选择')
    state(wrapper).selectedHosts = [
      { key: 'asset-one', value: 'same-ip' },
      { id: 'asset-two', value: 'same-ip' }
    ]
    state(wrapper).handleSubmit()
    await flushPromises()
    expect(api.post.mock.lastCall[1]).toEqual({
      params: { group_name: 'shared-group', hosts: 'asset-one,asset-two' }
    })
  })
  it('切单个/批量目标与关闭重开清除旧主机、组名及回调', async () => {
    api.post.mockResolvedValueOnce({ data: { status: 'RUNNING', runId: 'old-run' } })
    const wrapper = await openDialog(DeleteGroupDialog, { groupData: { ...target } })
    state(wrapper).handleSubmit()
    await flushPromises()
    const callbacks = api.poll.mock.lastCall[1]
    await wrapper.setProps({ groupData: null })
    await flushPromises()
    expect(state(wrapper).selectedHosts).toEqual([])
    expect(state(wrapper).groupName).toBe('')
    callbacks.onSuccess({ status: 'SUCCESS' })
    await flushPromises()
    expect(wrapper.props('visible')).toBe(true)
    expect(api.success).not.toHaveBeenCalled()
    await wrapper.setProps({ groupData: { ...target, hostId: '' } })
    await flushPromises()
    state(wrapper).handleSubmit()
    expect(api.post).toHaveBeenCalledTimes(1)
  })
  for (const item of [
    { component: CreateGroupDialog, name: '创建' },
    { component: DeleteGroupDialog, name: '删除' }
  ]) {
    describe(item.name, () => {
      const start = async wrapper => {
        if (item.name === '创建') {
          state(wrapper).selectedHosts = hosts
          state(wrapper).formData.group_name = 'group'
        }
        state(wrapper).handleSubmit()
        await flushPromises()
      }
      it('明确完成才成功/刷新/关闭，未重复提交', async () => {
        api.post.mockResolvedValue({ data: { status: 'SUCCESS' } })
        const wrapper = await openDialog(item.component, { groupData: { ...target } })
        await start(wrapper)
        expect(api.success).toHaveBeenCalledTimes(1)
        expect(wrapper.emitted('success')).toHaveLength(1)
        expect(wrapper.props('visible')).toBe(false)
        expect(api.post).toHaveBeenCalledTimes(1)
      })
      it('已知运行沿原60次/5秒，超时留窗并说明不取消后台任务', async () => {
        api.post.mockResolvedValue({ data: { status: 'RUNNING', runId: 'group-run' } })
        const wrapper = await openDialog(item.component, { groupData: { ...target } })
        await start(wrapper)
        const [runId, options] = api.poll.mock.lastCall
        expect(runId).toBe('group-run')
        expect(options).toMatchObject({ interval: 5000, maxAttempts: 60, showMessage: false })
        options.onTimeout({ status: 'RUNNING' })
        await flushPromises()
        expect(wrapper.text()).toContain('结果尚未确定')
        expect(wrapper.text()).toContain('不会取消')
        expect(wrapper.text()).toContain('group-run')
        expect(wrapper.props('visible')).toBe(true)
        await start(wrapper)
        expect(api.post).toHaveBeenCalledTimes(1)
      })
      it('初始POST关闭重开后返回不复活旧轮询', async () => {
        const pending = deferred()
        api.post.mockReturnValueOnce(pending.promise)
        const wrapper = await openDialog(item.component, { groupData: { ...target } })
        await start(wrapper)
        await button(wrapper, '关闭窗口').trigger('click')
        await flushPromises()
        await wrapper.setProps({ visible: true })
        await flushPromises()
        pending.resolve({ data: { status: 'RUNNING', runId: 'old-run' } })
        await flushPromises()
        expect(api.poll).not.toHaveBeenCalled()
        expect(api.success).not.toHaveBeenCalled()
        expect(wrapper.props('visible')).toBe(true)
        expect(state(wrapper).attempted).toBe(false)
      })
    })
  }
})
