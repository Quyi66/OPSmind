import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, inject, provide } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import AllocateRoleDialog from '@/modules/settings/components/user/AllocateRoleDialog.vue'
import * as api from '@/modules/settings/api'
import { ElMessage } from 'element-plus'

vi.mock('@/modules/settings/api', () => ({
  getRoles: vi.fn(),
  getUsers: vi.fn(),
  updateUserRoles: vi.fn()
}))
vi.mock('@/core/auth', () => ({
  authService: { getCurrentUser: () => ({ tenantId: 'tenant-A' }) }
}))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() }
}))
const reader = { id: 'role-read', name: 'READ', description: '读取' }
const writer = { id: 'role-write', name: 'WRITE', description: '写入' }
const admin = { id: 'role-admin', name: 'ROLE_ADMIN', description: '管理员' }
const users = [
  {
    id: 'real-A',
    tenantUserId: 'tenant-user-A',
    login: 'alice',
    fullName: '同名',
    roles: [reader]
  },
  { id: 'real-B', tenantUserId: 'tenant-user-B', login: 'bob', fullName: '同名', roles: [writer] }
]
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const Table = defineComponent({
  props: ['data'],
  setup(props, { slots }) {
    provide(
      'rows',
      computed(() => props.data)
    )
    return () => h('div', slots.default?.())
  }
})
const Column = defineComponent({
  setup(_props, { slots }) {
    const rows = inject('rows')
    return () =>
      h(
        'div',
        rows.value.map(row => slots.default?.({ row }))
      )
  }
})
const Checkbox = {
  props: ['modelValue', 'disabled', 'ariaLabel'],
  emits: ['update:modelValue'],
  template:
    '<label><input type="checkbox" :aria-label="ariaLabel" :checked="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.checked)" /><slot /></label>'
}
let wrapper
const state = () => wrapper.vm.$.setupState
const button = text => wrapper.findAll('button').find(b => b.text() === text)
const choose = (login, role) => wrapper.find(`input[aria-label="同名（${login}）：${role}"]`)
const search = value => wrapper.find('input[type="text"]').setValue(value)
const summary = () => wrapper.find('[aria-label="角色变更摘要"]')
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
async function open() {
  wrapper = mount(AllocateRoleDialog, {
    props: { modelValue: true },
    global: {
      stubs: {
        'el-dialog': Slot,
        'el-icon': Slot,
        'el-alert': Slot,
        'el-table': Table,
        'el-table-column': Column,
        'el-checkbox': Checkbox,
        'el-button': {
          props: ['disabled'],
          template: '<button :disabled="disabled"><slot /></button>'
        },
        'el-input': {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<input type="text" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
        }
      },
      directives: { loading: () => {} }
    }
  })
  await flushPromises()
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  api.getRoles.mockResolvedValue({ data: [reader, writer, admin] })
  api.getUsers.mockResolvedValue({ data: structuredClone(users) })
  api.updateUserRoles.mockResolvedValue({})
})
afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
})

describe('平台用户角色净变更复核', () => {
  it('沿用租户读取并排除管理员角色，姓名相同仍显示login，初始禁止保存', async () => {
    await open()
    expect(api.getUsers).toHaveBeenCalledWith('tenant-A')
    expect(api.getRoles).toHaveBeenCalledWith(false)
    expect(wrapper.text()).toContain('alice')
    expect(wrapper.text()).toContain('bob')
    expect(wrapper.text()).not.toContain('管理员')
    expect(button('保存').attributes('disabled')).toBeDefined()
    expect(summary().exists()).toBe(false)
  })

  it('跨搜索保留两人净变更并集中显示增删摘要，原真实租户用户ID/完整角色对象提交', async () => {
    await open()
    await search('alice')
    await choose('alice', '写入').setValue(true)
    await search('bob')
    await choose('bob', '写入').setValue(false)
    expect(wrapper.text()).toContain('已变更 2 位用户')
    expect(summary().text()).toContain('alice')
    expect(summary().text()).toContain('bob')
    expect(summary().text()).toContain('新增：写入')
    expect(summary().text()).toContain('移除：写入')
    await search('不存在')
    expect(state().filteredUserData).toHaveLength(0)
    expect(summary().text()).toContain('alice')
    await button('保存').trigger('click')
    await flushPromises()
    expect(api.updateUserRoles).toHaveBeenCalledExactlyOnceWith([
      { tenantUserId: 'tenant-user-A', roles: [reader, writer] },
      { tenantUserId: 'tenant-user-B', roles: [] }
    ])
    expect(wrapper.emitted('saved')).toHaveLength(1)
  })

  it('仅看变更与搜索组合，清空搜索不清草稿，还原后不再计数或提交', async () => {
    await open()
    await choose('alice', '写入').setValue(true)
    await wrapper.find('input[type="checkbox"]').setValue(true)
    expect(state().filteredUserData.map(u => u.login)).toEqual(['alice'])
    await search('bob')
    expect(state().filteredUserData).toHaveLength(0)
    await search('')
    expect(choose('alice', '写入').element.checked).toBe(true)
    await choose('alice', '写入').setValue(false)
    expect(state().filteredUserData).toHaveLength(0)
    expect(summary().exists()).toBe(false)
    await state().handleSave()
    expect(api.updateUserRoles).not.toHaveBeenCalled()
  })

  it('保存失败保留草稿供手动重试，保存中不重复提交或改复选框', async () => {
    const pending = deferred()
    api.updateUserRoles.mockReturnValueOnce(pending.promise)
    await open()
    await choose('alice', '写入').setValue(true)
    await button('保存').trigger('click')
    expect(choose('alice', '写入').element.disabled).toBe(true)
    await state().handleSave()
    expect(api.updateUserRoles).toHaveBeenCalledTimes(1)
    pending.reject(new Error('save failed'))
    await flushPromises()
    expect(summary().text()).toContain('新增：写入')
    expect(wrapper.emitted('saved')).toBeUndefined()
    await button('保存').trigger('click')
    await flushPromises()
    expect(api.updateUserRoles).toHaveBeenCalledTimes(2)
  })

  it('加载失败禁保存，只读重试恢复，不沿用上次草稿', async () => {
    api.getUsers.mockRejectedValueOnce(new Error('read failed'))
    await open()
    expect(state().loadError).toBe(true)
    await state().handleSave()
    expect(api.updateUserRoles).not.toHaveBeenCalled()
    await button('重试').trigger('click')
    await flushPromises()
    expect(state().loadError).toBe(false)
    expect(state().userData).toHaveLength(2)
    expect(state().roleChanges).toHaveLength(0)
  })

  it('取消重开清空筛选和草稿，旧读取不能覆盖新会话', async () => {
    const old = deferred()
    api.getUsers.mockReturnValueOnce(old.promise)
    await open()
    await button('取消').trigger('click')
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    await choose('alice', '写入').setValue(true)
    old.resolve({ data: [] })
    await flushPromises()
    expect(state().userData).toHaveLength(2)
    expect(state().roleChanges).toHaveLength(1)
    await search('alice')
    await button('取消').trigger('click')
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    expect(state().searchKeyword).toBe('')
    expect(state().roleChanges).toHaveLength(0)
    expect(api.updateUserRoles).not.toHaveBeenCalled()
  })

  it('旧保存完成不关闭新草稿、不发新会话成功事件', async () => {
    const old = deferred()
    api.updateUserRoles.mockReturnValueOnce(old.promise)
    await open()
    await choose('alice', '写入').setValue(true)
    await button('保存').trigger('click')
    await button('取消').trigger('click')
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    old.resolve({})
    await flushPromises()
    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(ElMessage.success).not.toHaveBeenCalled()
    expect(state().saving).toBe(false)
  })

  it('卸载后迟到读取失败不提示错误', async () => {
    const old = deferred()
    api.getUsers.mockReturnValueOnce(old.promise)
    await open()
    wrapper.unmount()
    old.reject(new Error('late failure'))
    await flushPromises()
    expect(ElMessage.error).not.toHaveBeenCalled()
  })
})
