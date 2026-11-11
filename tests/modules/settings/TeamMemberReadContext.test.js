import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, KeepAlive, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { ElButton, ElCheckbox, ElForm, ElFormItem, ElInput, ElMessage } from 'element-plus'
import Dialog from '@/modules/settings/components/team/TeamEditDialog.vue'

const api = vi.hoisted(() => ({ getTeamDetail: vi.fn(), createTeam: vi.fn(), updateTeam: vi.fn() }))
const getBasicUsers = vi.hoisted(() => vi.fn())
vi.mock('@/modules/settings/api/team', () => api)
vi.mock('@/modules/settings/api', () => ({ getBasicUsers }))
vi.mock('@/core/auth', () => ({
  authService: { getCurrentUser: () => ({ tenantId: 'original-tenant' }) }
}))
const team = id => ({
  id,
  name: `Team-${id}`,
  code: `code-${id}`,
  description: 'original-description',
  tenantName: 'original-tenant',
  updatedAt: 'original-time'
})
const users = () => [
  {
    id: 0,
    tenantUserId: 'tenant-user-0',
    login: 'first',
    fullName: 'First',
    originalMetadata: 'keep'
  },
  { id: 1, login: 'second', fullName: 'Second' }
]
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
let wrapper, visible, cachedHost
const dialog = () => (cachedHost ? wrapper.findComponent(Dialog) : wrapper)
const state = () => dialog().vm.$.setupState
const button = text =>
  dialog()
    .findAll('button')
    .find(item => item.text() === text)
async function open(props = {}, cached = false) {
  cachedHost = cached
  const options = {
    global: {
      directives: { loading() {} },
      stubs: {
        'el-dialog': {
          props: ['modelValue'],
          template: '<aside v-if="modelValue"><slot /><slot name="footer" /></aside>'
        },
        'el-form': ElForm,
        'el-form-item': ElFormItem,
        'el-input': ElInput,
        'el-button': ElButton,
        'el-checkbox': ElCheckbox,
        'el-tabs': { template: '<div><slot /></div>' },
        'el-tab-pane': { template: '<div><slot /></div>' },
        'el-alert': { props: ['title'], template: '<div role="alert">{{title}}<slot /></div>' }
      }
    }
  }
  if (cached) {
    visible = ref(true)
    const Host = defineComponent({
      setup: () => () =>
        h(KeepAlive, null, {
          default: () =>
            visible.value ? h(Dialog, { modelValue: true, team: team('A'), ...props }) : h('div')
        })
    })
    wrapper = mount(Host, options)
  } else
    wrapper = mount(Dialog, { ...options, props: { modelValue: true, team: team('A'), ...props } })
  await flushPromises()
}
beforeEach(() => {
  getBasicUsers.mockReset().mockResolvedValue({ data: users() })
  Object.values(api).forEach(mock => mock.mockReset())
  api.getTeamDetail.mockResolvedValue({ data: { users: [{ id: 0 }] } })
  api.createTeam.mockResolvedValue({})
  api.updateTeam.mockResolvedValue({})
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
  vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
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
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('团队成员读取与保存保护', () => {
  it('首次已打开窗口也加载成员，读取中禁止保存，原租户/团队ID保持', async () => {
    const pending = deferred()
    api.getTeamDetail.mockReturnValueOnce(pending.promise)
    await open()
    expect(state().usersLoading).toBe(true)
    expect(button('保存').attributes('disabled')).toBeDefined()
    await state().handleSave()
    expect(api.updateTeam).not.toHaveBeenCalled()
    expect(getBasicUsers).toHaveBeenCalledWith('original-tenant')
    expect(api.getTeamDetail).toHaveBeenCalledWith('A')
    pending.resolve({ data: { users: [{ id: 0 }] } })
    await flushPromises()
    expect(state().usersLoading).toBe(false)
    expect(state().allUsers[0].isChecked).toBe(true)
    expect(button('保存').attributes('disabled')).toBeUndefined()
  })

  it('团队详情失败不能当空成员保存，重试保留基本信息编辑并恢复成员', async () => {
    api.getTeamDetail.mockRejectedValueOnce(new Error('detail-read'))
    await open()
    state().form.description = 'unsaved-description'
    expect(dialog().get('[role="alert"]').text()).toContain('未完整读取')
    expect(dialog().text()).not.toContain('暂无可选用户')
    await state().handleSave()
    expect(api.updateTeam).not.toHaveBeenCalled()
    await button('重试读取').trigger('click')
    await flushPromises()
    expect(state().form.description).toBe('unsaved-description')
    expect(state().allUsers[0].isChecked).toBe(true)
    expect(state().usersError).toBe('')
    expect(api.getTeamDetail).toHaveBeenCalledTimes(2)
  })

  it('基础用户失败时明确提示且不继续读取详情，空集合成功才显示暂无可选用户', async () => {
    getBasicUsers.mockRejectedValueOnce(new Error('users-read'))
    await open()
    expect(api.getTeamDetail).not.toHaveBeenCalled()
    expect(state().usersError).toContain('暂不可保存')
    getBasicUsers.mockResolvedValueOnce({ data: [] })
    api.getTeamDetail.mockResolvedValueOnce({ data: { users: [] } })
    await button('重试读取').trigger('click')
    await flushPromises()
    expect(state().usersError).toBe('')
    expect(dialog().text()).toContain('暂无可选用户')
    expect(button('保存').attributes('disabled')).toBeUndefined()
  })

  it('关闭A再开B时，A基础用户迟到不使用B的ID继续查详情', async () => {
    const pending = deferred()
    getBasicUsers.mockReturnValueOnce(pending.promise)
    await open()
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ team: team('B'), modelValue: true })
    await flushPromises()
    pending.resolve({ data: users() })
    await flushPromises()
    expect(api.getTeamDetail.mock.calls).toEqual([['B']])
    expect(state().form.id).toBe('B')
    expect(state().usersLoading).toBe(false)
  })

  it.each(['resolve', 'reject'])('A详情迟到%s不能覆盖已打开B成员/错误', async method => {
    const pending = deferred()
    api.getTeamDetail.mockReturnValueOnce(pending.promise)
    await open()
    await wrapper.setProps({ modelValue: false })
    api.getTeamDetail.mockResolvedValueOnce({ data: { users: [{ id: 1 }] } })
    await wrapper.setProps({ team: team('B'), modelValue: true })
    await flushPromises()
    pending[method](method === 'resolve' ? { data: { users: [{ id: 0 }] } } : new Error('old'))
    await flushPromises()
    expect(state().form.id).toBe('B')
    expect(state().allUsers.map(user => user.isChecked)).toEqual([false, true])
    expect(state().usersError).toBe('')
    expect(state().usersLoading).toBe(false)
  })

  it('窗口保持打开但换团队时重读原新ID，成员不会沿用', async () => {
    await open()
    api.getTeamDetail.mockResolvedValueOnce({ data: { users: [{ userId: 1 }] } })
    await wrapper.setProps({ team: team('B') })
    await flushPromises()
    expect(state().form.id).toBe('B')
    expect(api.getTeamDetail).toHaveBeenLastCalledWith('B')
    expect(state().allUsers.map(user => user.isChecked)).toEqual([false, true])
  })

  it('团队ID0及原用户ID别名中的0保持有效，不改原匹配类型', async () => {
    api.getTeamDetail.mockResolvedValueOnce({ data: { users: [{ tenantUserId: 0 }] } })
    await open({ team: team(0) })
    expect(api.getTeamDetail).toHaveBeenCalledWith(0)
    expect(state().allUsers[0].isChecked).toBe(true)
    expect(state().allUsers[1].isChecked).toBe(false)
  })

  it('保存更新载荷保留原字段、ID和完整已选对象，不生成权限字段', async () => {
    await open()
    await button('保存').trigger('click')
    await flushPromises()
    expect(api.updateTeam).toHaveBeenCalledWith({
      id: 'A',
      name: 'Team-A',
      code: 'code-A',
      description: 'original-description',
      tenantName: 'original-tenant',
      updatedAt: 'original-time',
      users: [{ ...users()[0], isChecked: true }]
    })
    expect(api.createTeam).not.toHaveBeenCalled()
    expect(dialog().emitted('saved')).toHaveLength(1)
  })

  it('创建仍不读取团队详情，保留原创建载荷', async () => {
    await open({ team: null, mode: 'create' })
    expect(api.getTeamDetail).not.toHaveBeenCalled()
    state().form.name = 'New team'
    state().form.description = 'New description'
    state().allUsers[1].isChecked = true
    await button('保存').trigger('click')
    await flushPromises()
    expect(api.createTeam).toHaveBeenCalledWith({
      name: 'New team',
      tenantId: null,
      description: 'New description',
      code: null,
      id: null,
      users: [{ ...users()[1], isChecked: true }]
    })
  })

  it('缓存失活忽略在途成员读取，返回重试且不丢基本信息编辑', async () => {
    const pending = deferred()
    api.getTeamDetail.mockReturnValueOnce(pending.promise)
    await open({}, true)
    const context = state()
    context.form.description = 'unsaved'
    visible.value = false
    await flushPromises()
    pending.resolve({ data: { users: [{ id: 1 }] } })
    await flushPromises()
    expect(context.allUsers).toEqual([])
    expect(context.usersError).toContain('中断')
    visible.value = true
    await flushPromises()
    expect(state()).toBe(context)
    expect(state().form.description).toBe('unsaved')
    expect(state().allUsers[0].isChecked).toBe(true)
  })

  it.each(['resolve', 'reject'])('关闭窗口后%s不回填成员或改加载状态', async method => {
    const pending = deferred()
    api.getTeamDetail.mockReturnValueOnce(pending.promise)
    await open()
    await wrapper.setProps({ modelValue: false })
    pending[method](method === 'resolve' ? { data: { users: [{ id: 0 }] } } : new Error('late'))
    await flushPromises()
    expect(state().allUsers).toEqual([])
    expect(state().usersLoading).toBe(false)
  })

  it('基本信息表单阻止原生提交，未触发真实保存或发送', async () => {
    await open()
    const event = new Event('submit', { bubbles: true, cancelable: true })
    dialog().get('form').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(api.createTeam).not.toHaveBeenCalled()
    expect(api.updateTeam).not.toHaveBeenCalled()
  })
})
