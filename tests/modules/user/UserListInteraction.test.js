import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent, h, inject, KeepAlive, provide, ref } from 'vue'
import { ElTable, ElTableColumn } from 'element-plus/es/components/table/index.mjs'
import { ElPagination } from 'element-plus/es/components/pagination/index.mjs'
import { ElSelect, ElOption } from 'element-plus/es/components/select/index.mjs'
import ElTag from 'element-plus/es/components/tag/index.mjs'
import UserListPage from '@/modules/user/views/UserListPage.vue'
import LoginErrorDialog from '@/modules/user/components/dialogs/LoginErrorDialog.vue'

const api = vi.hoisted(() => ({ users: vi.fn(), login: vi.fn() }))
vi.mock('@/modules/user/api', () => ({
  getUsers: api.users,
  getUserLoginFailMessage: api.login
}))
vi.mock('@/modules/user/components/dialogs/ScanHostDialog.vue', () => ({
  default: { name: 'ScanHostDialog', props: ['visible'], template: '<div />' }
}))
vi.mock('@/modules/user/components/dialogs/CreateUserDialog.vue', () => ({
  default: { name: 'CreateUserDialog', props: ['visible'], template: '<div />' }
}))
vi.mock('@/modules/user/components/dialogs/EditUserDialog.vue', () => ({
  default: {
    name: 'EditUserDialog',
    props: ['visible', 'user', 'initialOperate'],
    template: '<div />'
  }
}))
vi.mock('@/modules/user/components/dialogs/DeleteUserDialog.vue', () => ({
  default: { name: 'DeleteUserDialog', props: ['visible', 'user'], template: '<div />' }
}))

const Table = defineComponent({
  name: 'ElTable',
  props: ['data', 'emptyText'],
  setup(props) {
    provide(
      'userRows',
      computed(() => props.data)
    )
  },
  template: '<div><slot /><p v-if="!data.length">{{ emptyText }}</p></div>'
})
const Column = defineComponent({
  name: 'ElTableColumn',
  props: ['prop', 'label', 'sortable'],
  inheritAttrs: false,
  setup(props, { slots }) {
    const rows = inject('userRows')
    return () =>
      rows.value.map(row =>
        h(
          'div',
          {
            'data-row': row.id,
            'data-column': props.label
          },
          slots.default?.({ row }) || row[props.prop]
        )
      )
  }
})
const Slot = { template: '<div><slot /></div>' }
const stubs = {
  ElTable: Table,
  ElTableColumn: Column,
  ElPagination: {
    name: 'ElPagination',
    props: ['total', 'currentPage', 'pageSize'],
    template: '<nav />'
  },
  'el-form': { template: '<form><slot /></form>' },
  'el-form-item': Slot,
  'el-button': {
    props: ['disabled', 'loading'],
    template: '<button :disabled="disabled || loading"><slot /></button>'
  },
  ElSelect: {
    name: 'ElSelect',
    props: ['modelValue'],
    emits: ['update:modelValue', 'change'],
    template: '<div><slot /></div>'
  },
  ElOption: { template: '<span />' },
  'el-input': {
    name: 'ElInput',
    props: ['modelValue'],
    emits: ['update:modelValue', 'clear'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  },
  ElIcon: Slot,
  ElTag: { template: '<span><slot /></span>' },
  ElAlert: { props: ['title'], template: '<aside role="alert">{{ title }}</aside>' },
  'el-dialog': { template: '<div><slot /><slot name="footer" /></div>' }
}
const record = (id = 'account-1', extra = {}) => ({
  id,
  host_id: `host-${id}`,
  host_key: '192.0.2.7',
  hostname: `server-${id}`,
  username: `user-${id}`,
  uid: 1001,
  lock_status: 1,
  primary_group: 'users',
  secondary_group: 'ops',
  login_fail_message: 'present',
  ...extra
})
const result = records => ({ data: { records, total: records.length } })
const defaults = { types: '0,1', lockStatus: '1,2', filter: undefined }
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const wrappers = []
const state = wrapper => wrapper.vm.$.setupState
const button = (wrapper, text) => wrapper.findAll('button').find(item => item.text() === text)
const refresh = wrapper => wrapper.find('button[title="刷新"]')
async function openPage(options = {}) {
  const wrapper = mount(UserListPage, {
    global: {
      stubs: { ...stubs, LoginErrorDialog: true, ...options },
      directives: { loading: () => {} }
    }
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}
async function openLogin(props = {}) {
  const wrapper = mount(LoginErrorDialog, {
    props: { visible: true, userId: 'account-1', ...props },
    global: { stubs, directives: { loading: () => {} } }
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}
async function select(wrapper, index, values) {
  const control = wrapper.findAllComponents({ name: 'ElSelect' })[index]
  control.vm.$emit('update:modelValue', values)
  control.vm.$emit('change', values)
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
  api.users.mockReset().mockResolvedValue(result([record()]))
  api.login.mockReset().mockResolvedValue(result([{ message: 'account-1 error' }]))
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('主机用户列表查询与原操作入口', () => {
  it('首载与完整重置同条件，重置只读一次并恢复首页/10条', async () => {
    const wrapper = await openPage()
    expect(api.users).toHaveBeenLastCalledWith(defaults)
    await select(wrapper, 1, ['1'])
    state(wrapper).currentPage = 3
    state(wrapper).pageSize = 50
    await wrapper.find('input').setValue('draft')
    api.users.mockClear()
    await button(wrapper, '重置').trigger('click')
    await flushPromises()
    expect(api.users).toHaveBeenCalledExactlyOnceWith(defaults)
    expect(state(wrapper).currentPage).toBe(1)
    expect(state(wrapper).pageSize).toBe(10)
    expect(state(wrapper).filters.keyword).toBe('')
    expect(state(wrapper).filters.lockStatus).toEqual(['1', '2'])
    expect(wrapper.find('.ops-filter-bar').exists()).toBe(true)
    expect(wrapper.find('.ops-action-bar').exists()).toBe(true)
  })

  it('多选清空显式恢复全选，保持界面与发送参数一致', async () => {
    const wrapper = await openPage()
    await select(wrapper, 0, [])
    await select(wrapper, 1, [])
    expect(api.users).toHaveBeenLastCalledWith(defaults)
    expect(state(wrapper).filters.types).toEqual(['0', '1'])
    expect(state(wrapper).filters.lockStatus).toEqual(['1', '2'])
  })

  it('真实Element多选移除最后一项会恢复全选，重置仅触发一次读取', async () => {
    const wrapper = await openPage({ ElSelect, ElOption, ElTag })
    const typeSelect = wrapper.findAllComponents(ElSelect)[0]
    await typeSelect.findAll('.el-tag__close')[0].trigger('click')
    await flushPromises()
    expect(api.users.mock.lastCall[0].types).toBe('1')
    await typeSelect.find('.el-tag__close').trigger('click')
    await flushPromises()
    expect(api.users.mock.lastCall[0].types).toBe('0,1')
    expect(typeSelect.props('modelValue')).toEqual(['0', '1'])
    api.users.mockClear()
    await button(wrapper, '重置').trigger('click')
    await flushPromises()
    expect(api.users).toHaveBeenCalledExactlyOnceWith(defaults)
  })

  it('搜索/Enter/清空应用关键词，下拉和刷新均不提交未搜索草稿', async () => {
    const wrapper = await openPage()
    await wrapper.find('input').setValue('first')
    await button(wrapper, '搜索').trigger('click')
    await flushPromises()
    expect(api.users.mock.lastCall[0].filter).toContain('*first*')
    await wrapper.find('input').setValue('draft')
    await select(wrapper, 0, ['1'])
    expect(api.users.mock.lastCall[0]).toMatchObject({
      types: '1',
      filter: expect.stringContaining('*first*')
    })
    await refresh(wrapper).trigger('click')
    await flushPromises()
    expect(api.users.mock.lastCall[0].filter).toContain('*first*')
    await wrapper.find('input').trigger('keyup.enter')
    await flushPromises()
    expect(api.users.mock.lastCall[0].filter).toContain('*draft*')
    const input = wrapper.findComponent({ name: 'ElInput' })
    input.vm.$emit('update:modelValue', '')
    input.vm.$emit('clear')
    await flushPromises()
    expect(api.users.mock.lastCall[0].filter).toBeUndefined()
  })

  it('请求途中编辑草稿不改变响应后的原八字段本地匹配', async () => {
    const wrapper = await openPage()
    const pending = deferred()
    api.users.mockReturnValueOnce(pending.promise)
    await wrapper.find('input').setValue('match')
    await button(wrapper, '搜索').trigger('click')
    await wrapper.find('input').setValue('unsubmitted')
    pending.resolve(result([record('hit', { home: '/home/match' }), record('miss')]))
    await flushPromises()
    expect(state(wrapper).filteredData.map(row => row.id)).toEqual(['hit'])
    expect(state(wrapper).filters.keyword).toBe('unsubmitted')
  })

  it('刷新和原弹窗回调保留应用条件/有效页码，缩小时校正页码', async () => {
    const records = Array.from({ length: 24 }, (_, i) => record(`a${i}`))
    api.users.mockResolvedValue(result(records))
    const wrapper = await openPage()
    state(wrapper).currentPage = 3
    await wrapper.find('input').setValue('draft')
    await refresh(wrapper).trigger('click')
    await flushPromises()
    expect(state(wrapper).currentPage).toBe(3)
    expect(api.users).toHaveBeenLastCalledWith(defaults)
    api.users.mockResolvedValueOnce(result(records.slice(0, 11)))
    wrapper.findComponent({ name: 'EditUserDialog' }).vm.$emit('success')
    await flushPromises()
    expect(state(wrapper).currentPage).toBe(2)
    expect(api.users).toHaveBeenLastCalledWith(defaults)
  })

  it('切换页大小回首页，不额外请求或提交草稿', async () => {
    const wrapper = await openPage()
    api.users.mockClear()
    state(wrapper).currentPage = 2
    const pagination = wrapper.findComponent({ name: 'ElPagination' })
    pagination.vm.$emit('update:pageSize', 20)
    pagination.vm.$emit('size-change', 20)
    await flushPromises()
    expect(state(wrapper).pageSize).toBe(20)
    expect(state(wrapper).currentPage).toBe(1)
    expect(api.users).not.toHaveBeenCalled()
  })

  it('用户名/锁定/登录错误/修改/删除均携带原账号身份，扫描创建仍仅开原弹窗', async () => {
    const wrapper = await openPage()
    const name = wrapper.find('[data-column="用户名"] [role="button"]')
    await name.trigger('keydown.enter')
    const edit = wrapper.findComponent({ name: 'EditUserDialog' })
    expect(edit.props()).toMatchObject({
      visible: true,
      initialOperate: 'modify_base',
      user: record()
    })
    await wrapper.find('[data-column="锁定状态"] [role="button"]').trigger('click')
    expect(edit.props('initialOperate')).toBe('lock')
    await wrapper.find('[data-column="登录错误"] [role="button"]').trigger('click')
    expect(state(wrapper).loginErrorUserId).toBe('account-1')
    await button(wrapper, '删除').trigger('click')
    expect(wrapper.findComponent({ name: 'DeleteUserDialog' }).props()).toMatchObject({
      visible: true,
      user: record()
    })
    await button(wrapper, '修改').trigger('click')
    expect(edit.props('initialOperate')).toBe('modify_base')
    await button(wrapper, '扫描主机').trigger('click')
    await button(wrapper, '创建用户').trigger('click')
    expect(wrapper.findComponent({ name: 'ScanHostDialog' }).props('visible')).toBe(true)
    expect(wrapper.findComponent({ name: 'CreateUserDialog' }).props('visible')).toBe(true)
    expect(api.users).toHaveBeenCalledTimes(1)
    expect(api.login).not.toHaveBeenCalled()
  })

  it('真实Element表格/分页保留字段和原动作，更新时间无排序入口', async () => {
    api.users.mockResolvedValue(result(Array.from({ length: 12 }, (_, i) => record(`r${i}`))))
    const real = mount(UserListPage, {
      attachTo: document.body,
      global: {
        components: { ElTable, ElTableColumn, ElPagination },
        stubs: {
          ...stubs,
          ElTable,
          ElTableColumn,
          ElPagination,
          LoginErrorDialog: true
        },
        directives: { loading: () => {} }
      }
    })
    wrappers.push(real)
    await flushPromises()
    expect(real.findAll('th').map(th => th.text())).toEqual([
      'IP',
      '主机名',
      '用户名',
      '锁定状态',
      '主用户组',
      '附加用户组',
      'Shell',
      '最后登录',
      '登录错误',
      '更新时间',
      '操作'
    ])
    expect(real.find('th.is-sortable').exists()).toBe(false)
    expect(real.find('.caret-wrapper').exists()).toBe(false)
    await real
      .findAll('.el-pager li.number')
      .find(item => item.text() === '2')
      .trigger('click')
    await flushPromises()
    expect(state(real).currentPage).toBe(2)
    await button(real, '修改').trigger('click')
    expect(real.findComponent({ name: 'EditUserDialog' }).props('user').id).toBe('r10')
  })
})

describe('用户列表读取隔离', () => {
  it('零结果是空态；失败单列错误，重试复用应用条件而非草稿', async () => {
    api.users.mockRejectedValueOnce(new Error('network'))
    const wrapper = await openPage()
    expect(wrapper.text()).toContain('用户列表读取失败')
    await wrapper.find('input').setValue('draft')
    api.users.mockResolvedValueOnce(result([]))
    await button(wrapper, '重试读取').trigger('click')
    await flushPromises()
    expect(api.users).toHaveBeenLastCalledWith(defaults)
    expect(wrapper.text()).toContain('暂无符合条件的用户')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('同查询失败保留旧行/总数并禁用所有行入口，重试成功恢复', async () => {
    const wrapper = await openPage()
    api.users.mockRejectedValueOnce(new Error('network'))
    await refresh(wrapper).trigger('click')
    await flushPromises()
    expect(state(wrapper).total).toBe(1)
    expect(wrapper.text()).toContain('可能已过期')
    expect(button(wrapper, '修改').attributes('disabled')).toBeDefined()
    await wrapper.find('[data-column="用户名"] [role="button"]').trigger('click')
    state(wrapper).handleDeleteUser(state(wrapper).filteredData[0])
    expect(state(wrapper).showEditUserDialog).toBe(false)
    expect(state(wrapper).showDeleteUserDialog).toBe(false)
    await button(wrapper, '重试读取').trigger('click')
    await flushPromises()
    expect(button(wrapper, '修改').attributes('disabled')).toBeUndefined()
    expect(state(wrapper).readError).toBe('')
  })

  it('新查询读取中和失败都不混入上一查询的旧行', async () => {
    const wrapper = await openPage()
    const pending = deferred()
    api.users.mockReturnValueOnce(pending.promise)
    await wrapper.find('input').setValue('different')
    await button(wrapper, '搜索').trigger('click')
    expect(state(wrapper).filteredData).toEqual([])
    pending.reject(new Error('network'))
    await flushPromises()
    expect(state(wrapper).filteredData).toEqual([])
    expect(wrapper.text()).not.toContain('可能已过期')
  })

  it.each([
    { response: { status: 401 } },
    { response: { status: 403 } },
    new Error('Authentication expired'),
    new Error('Access denied')
  ])('认证/权限失败清行且不显示普通重试 %j', async error => {
    const wrapper = await openPage()
    api.users.mockRejectedValueOnce(error)
    await refresh(wrapper).trigger('click')
    await flushPromises()
    expect(state(wrapper).total).toBe(0)
    expect(wrapper.text()).toContain('登录已失效或无权访问')
    expect(button(wrapper, '重试读取')).toBeUndefined()
  })

  it('迟到成功、失败和finally均不覆盖最新查询或其loading', async () => {
    const wrapper = await openPage()
    const first = deferred(),
      second = deferred(),
      third = deferred()
    api.users
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockReturnValueOnce(third.promise)
    await select(wrapper, 0, ['0'])
    await select(wrapper, 0, ['1'])
    first.resolve(result([record('old')]))
    await flushPromises()
    expect(state(wrapper).loading).toBe(true)
    expect(state(wrapper).filteredData).toEqual([])
    await select(wrapper, 1, ['1'])
    third.resolve(result([record('latest')]))
    await flushPromises()
    second.reject(new Error('Access denied'))
    await flushPromises()
    expect(state(wrapper).filteredData[0].id).toBe('latest')
    expect(state(wrapper).readError).toBe('')
    expect(state(wrapper).loading).toBe(false)
  })

  it('卸载后忽略迟到响应', async () => {
    const pending = deferred()
    api.users.mockReturnValueOnce(pending.promise)
    const wrapper = await openPage()
    const setup = state(wrapper)
    wrapper.unmount()
    pending.resolve(result([record('late')]))
    await flushPromises()
    expect(setup.filteredData).toEqual([])
    expect(setup.loading).toBe(false)
  })

  it('KeepAlive失活中断读取，返回后由原快照手动重试', async () => {
    const visible = ref(true)
    const pending = deferred()
    api.users.mockReturnValueOnce(pending.promise)
    const wrapper = mount(
      defineComponent({
        setup: () => () => h(KeepAlive, null, () => (visible.value ? h(UserListPage) : null))
      }),
      {
        global: { stubs: { ...stubs, LoginErrorDialog: true }, directives: { loading: () => {} } }
      }
    )
    wrappers.push(wrapper)
    await flushPromises()
    visible.value = false
    await flushPromises()
    pending.resolve(result([record('late')]))
    await flushPromises()
    visible.value = true
    await flushPromises()
    expect(wrapper.text()).toContain('读取已中断')
    expect(api.users).toHaveBeenCalledTimes(1)
    await button(wrapper, '重试读取').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('user-account-1')
    expect(api.users).toHaveBeenLastCalledWith(defaults)
  })
})

describe('登录错误只读弹窗', () => {
  it('只在打开时按原账号记录id读取，失败不冒充无记录，重试恢复', async () => {
    const wrapper = await openLogin({ visible: false })
    expect(api.login).not.toHaveBeenCalled()
    api.login.mockRejectedValueOnce(new Error('network'))
    await wrapper.setProps({ visible: true })
    await flushPromises()
    expect(api.login).toHaveBeenLastCalledWith('account-1')
    expect(wrapper.text()).toContain('登录错误信息读取失败')
    expect(wrapper.text()).not.toContain('暂无登录错误信息')
    await button(wrapper, '重试读取').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('account-1 error')
  })

  it('换账号即清旧消息，旧成功/失败/finally不影响新账号', async () => {
    const wrapper = await openLogin()
    const old = deferred(),
      current = deferred()
    api.login.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    await wrapper.setProps({ userId: 'account-2' })
    expect(wrapper.text()).not.toContain('account-1 error')
    await wrapper.setProps({ userId: 'account-3' })
    old.reject(new Error('Access denied'))
    await flushPromises()
    expect(state(wrapper).loading).toBe(true)
    expect(state(wrapper).readError).toBe('')
    current.resolve(result([{ message: 'account-3 error' }]))
    await flushPromises()
    expect(wrapper.text()).toContain('account-3 error')
    expect(api.login).toHaveBeenLastCalledWith('account-3')
  })

  it('关闭重开同一账号也不接受上次打开的迟到结果', async () => {
    const first = deferred(),
      second = deferred()
    api.login.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const wrapper = await openLogin()
    await wrapper.setProps({ visible: false })
    await wrapper.setProps({ visible: true })
    first.resolve(result([{ message: 'old opening' }]))
    await flushPromises()
    expect(state(wrapper).loading).toBe(true)
    expect(wrapper.text()).not.toContain('old opening')
    second.resolve(result([]))
    await flushPromises()
    expect(wrapper.text()).toContain('暂无登录错误信息')
  })

  it('权限失败不提供普通重试，缺失账号标识也不请求', async () => {
    api.login.mockRejectedValueOnce(new Error('Access denied'))
    const wrapper = await openLogin()
    expect(wrapper.text()).toContain('登录已失效或无权访问')
    expect(button(wrapper, '重试读取')).toBeUndefined()
    await wrapper.setProps({ userId: '' })
    await flushPromises()
    expect(wrapper.text()).toContain('缺少账号记录标识')
    expect(api.login).toHaveBeenCalledTimes(1)
  })

  it('卸载后不显示迟到错误或重新结束其他读取', async () => {
    const pending = deferred()
    api.login.mockReturnValueOnce(pending.promise)
    const wrapper = await openLogin()
    const setup = state(wrapper)
    wrapper.unmount()
    pending.reject(new Error('late'))
    await flushPromises()
    expect(setup.errorMessages).toEqual([])
    expect(setup.loading).toBe(false)
    expect(setup.readError).not.toContain('读取失败')
  })

  it('KeepAlive失活中断登录错误读取，返回手动重试且再次缓存保留成功消息', async () => {
    const visible = ref(true)
    const pending = deferred()
    api.login.mockReturnValueOnce(pending.promise)
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(KeepAlive, null, () =>
            visible.value ? h(LoginErrorDialog, { visible: true, userId: 'account-1' }) : null
          )
      }),
      { global: { stubs, directives: { loading: () => {} } } }
    )
    wrappers.push(wrapper)
    await flushPromises()
    visible.value = false
    await flushPromises()
    pending.resolve(result([{ message: 'late cached message' }]))
    await flushPromises()
    visible.value = true
    await flushPromises()
    expect(wrapper.text()).toContain('读取已中断')
    expect(wrapper.text()).not.toContain('late cached message')
    expect(api.login).toHaveBeenCalledTimes(1)
    await button(wrapper, '重试读取').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('account-1 error')
    visible.value = false
    await flushPromises()
    visible.value = true
    await flushPromises()
    expect(wrapper.text()).toContain('account-1 error')
    expect(api.login).toHaveBeenCalledTimes(2)
  })
})
