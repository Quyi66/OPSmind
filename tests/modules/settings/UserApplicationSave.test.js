import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { authService } from '@/core/auth'
import UserEditDialog from '@/modules/settings/components/user/UserEditDialog.vue'
import * as api from '@/modules/settings/api'

vi.mock('@/modules/settings/api', () => ({
  getUserDetail: vi.fn(),
  getRoles: vi.fn(),
  getUserApplets: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  saveUserApplets: vi.fn()
}))
vi.mock('@/core/auth', () => ({
  authService: { getCurrentUser: vi.fn() }
}))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }
}))

const user = {
  id: 'real-user-fixture',
  tenantUserId: 'tenant-user-fixture',
  login: 'fixture-login',
  fullName: '测试用户',
  activated: true,
  authMode: 'LOCAL',
  roles: []
}
const applets = [{ id: 'applet-fixture', name: 'fixture', title: '测试应用', _user_applet: false }]
const createdRows = [
  { ...user, tenantId: '$default', tenantUserId: 'default-tenant-user' },
  { ...user, tenantId: 'tenant-fixture' }
]
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const validate = vi.fn()
const button = text => wrapper.findAll('button').find(item => item.text() === text)
let wrapper
async function open(mode) {
  wrapper = shallowMount(UserEditDialog, {
    props: { modelValue: false, mode, user: mode === 'create' ? null : user },
    global: {
      stubs: {
        'el-dialog': Slot,
        'el-tabs': Slot,
        'el-tab-pane': Slot,
        'el-button': {
          props: ['disabled'],
          template: '<button :disabled="disabled"><slot /></button>'
        },
        'el-form': { ...Slot, methods: { validate: () => validate() } }
      },
      directives: { loading: () => {} }
    }
  })
  await wrapper.setProps({ modelValue: true })
  await flushPromises()
  const state = wrapper.vm.$.setupState
  if (state.allApplets[0]) state.allApplets[0]._user_applet = true
  return state
}

beforeEach(() => {
  vi.resetAllMocks()
  validate.mockResolvedValue()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  authService.getCurrentUser.mockReturnValue({ tenantId: 'tenant-fixture' })
  api.getUserDetail.mockResolvedValue({ data: structuredClone(user) })
  api.getRoles.mockResolvedValue({ data: [] })
  api.getUserApplets.mockResolvedValue({ data: structuredClone(applets) })
  api.createUser.mockResolvedValue({ data: structuredClone(createdRows) })
  api.updateUser.mockResolvedValue({})
  api.saveUserApplets.mockResolvedValue({})
})
afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
})

const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

describe('用户创建与应用衔接（全部API为mock，不是真实授权验收）', () => {
  it('编辑先保存用户再以真实tenantUserId提交完整应用列表及勾选标记', async () => {
    const state = await open('edit')
    expect(api.getUserApplets).toHaveBeenCalledWith(user.login, user.tenantUserId)
    await state.handleSave()
    expect(api.updateUser).toHaveBeenCalledWith(expect.objectContaining({ id: user.id }))
    expect(api.saveUserApplets).toHaveBeenCalledExactlyOnceWith(user.tenantUserId, [
      { ...applets[0], _user_applet: true }
    ])
    expect(api.updateUser.mock.invocationCallOrder[0]).toBeLessThan(
      api.saveUserApplets.mock.invocationCallOrder[0]
    )
    expect(ElMessage.success).toHaveBeenCalledWith('保存成功')
  })

  it('新建匹配请求租户的tenantUserId，按创建→应用顺序提交，不取首行或真实用户id', async () => {
    const state = await open('create')
    state.form.login = 'fixture-new'
    state.form.fullName = '新建测试用户'
    expect(api.getUserApplets).toHaveBeenCalledWith('', '')
    await button('保存').trigger('click')
    await flushPromises()
    expect(api.createUser).toHaveBeenCalledOnce()
    const payload = api.createUser.mock.calls[0][0]
    expect(payload).toEqual({
      id: null,
      tenantId: 'tenant-fixture',
      login: 'fixture-new',
      fullName: '新建测试用户',
      email: '',
      authMode: 'LOCAL',
      activated: true,
      langKey: null,
      createdBy: null,
      createdDate: null,
      lastModifiedBy: null,
      lastModifiedDate: null,
      resetDate: null,
      resetKey: null,
      roles: [],
      department: '',
      mobile: '',
      telephoneNumber: '',
      password: '',
      tenantIds: []
    })
    expect(Object.values(payload).some(value => value === state.allApplets)).toBe(false)
    expect(payload).not.toHaveProperty('applets')
    expect(payload).not.toHaveProperty('_user_applet')
    expect(api.saveUserApplets).toHaveBeenCalledExactlyOnceWith(user.tenantUserId, [
      { ...applets[0], _user_applet: true }
    ])
    expect(api.createUser.mock.invocationCallOrder[0]).toBeLessThan(
      api.saveUserApplets.mock.invocationCallOrder[0]
    )
    expect(api.updateUser).not.toHaveBeenCalled()
    expect(ElMessage.success).toHaveBeenCalledWith('用户和应用配置保存成功')
    expect(wrapper.emitted('saved')).toHaveLength(1)
  })

  it.each(['axios', 'direct'])('请求$default时只匹配$default，兼容%s响应数组', async format => {
    authService.getCurrentUser.mockReturnValue({ tenantId: '$default' })
    api.createUser.mockResolvedValue(format === 'axios' ? { data: createdRows } : createdRows)
    const state = await open('create')
    await state.handleSave()
    expect(api.createUser.mock.calls[0][0].tenantId).toBe('$default')
    expect(api.saveUserApplets.mock.calls[0][0]).toBe('default-tenant-user')
  })

  it.each([
    ['空数组', []],
    ['仅其他租户', [createdRows[0]]],
    ['单对象而非数组', createdRows[1]],
    ['同租户两条', [createdRows[1], createdRows[1]]],
    ['tenantUserId缺失', [{ ...createdRows[1], tenantUserId: '' }]],
    ['tenantUserId只有空格', [{ ...createdRows[1], tenantUserId: ' ' }]],
    ['tenantUserId类型错误', [{ ...createdRows[1], tenantUserId: 123 }]]
  ])('%s不能猜身份或重发创建，明确已创建但应用未保存', async (_name, data) => {
    api.createUser.mockResolvedValue({ data })
    const state = await open('create')
    await state.handleSave()
    expect(api.saveUserApplets).not.toHaveBeenCalled()
    expect(state.saveIssue).toContain('用户已创建')
    expect(state.saveIssue).toContain('应用未保存')
    expect(state.saveDisabled).toBe(true)
    expect(wrapper.emitted('saved')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await state.handleSave()
    expect(api.createUser).toHaveBeenCalledOnce()
    expect(ElMessage.success).not.toHaveBeenCalled()
  })

  it('请求租户为空不向任意返回租户写入应用', async () => {
    authService.getCurrentUser.mockReturnValue({ tenantId: '' })
    const state = await open('create')
    await state.handleSave()
    expect(api.saveUserApplets).not.toHaveBeenCalled()
    expect(state.createdUser.tenantUserId).toBe('')
  })

  it('应用失败保留选择并清除凭据，手动重试只发应用请求', async () => {
    api.saveUserApplets.mockRejectedValueOnce(new Error('mock failure'))
    const state = await open('create')
    await state.handleSave()
    expect(state.saveIssue).toContain('用户已创建，应用保存失败')
    expect(state.form.password).toBe('')
    expect(state.form.confirmPassword).toBe('')
    expect(state.allApplets[0]._user_applet).toBe(true)
    expect(state.saving).toBe(false)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(ElMessage.success).not.toHaveBeenCalled()
    // 重试可以修改应用选择，但不能重提用户资料或角色。
    state.allApplets[0]._user_applet = false
    await button('仅重试应用保存').trigger('click')
    await flushPromises()
    expect(api.createUser).toHaveBeenCalledOnce()
    expect(api.updateUser).not.toHaveBeenCalled()
    expect(api.saveUserApplets.mock.calls[1]).toEqual([user.tenantUserId, [applets[0]]])
    expect(wrapper.emitted('saved')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')).toContainEqual([false])
  })

  it('连续应用重试失败保持部分成功状态，不重复创建', async () => {
    api.saveUserApplets.mockRejectedValue(new Error('mock failure'))
    const state = await open('create')
    await state.handleSave()
    await state.handleSave()
    expect(api.createUser).toHaveBeenCalledOnce()
    expect(api.saveUserApplets).toHaveBeenCalledTimes(2)
    expect(state.createdUser.tenantUserId).toBe(user.tenantUserId)
    expect(state.saveIssue).toContain('应用保存失败')
  })

  it('无可用应用列表直接完成创建，不生成额外授权请求', async () => {
    api.getUserApplets.mockResolvedValue({ data: [] })
    const state = await open('create')
    await state.handleSave()
    expect(api.saveUserApplets).not.toHaveBeenCalled()
    expect(ElMessage.success).toHaveBeenCalledWith('用户创建成功')
  })

  it('全部未选也提交完整应用列表及false标记', async () => {
    const state = await open('create')
    state.allApplets[0]._user_applet = false
    await state.handleSave()
    expect(api.saveUserApplets).toHaveBeenCalledWith(user.tenantUserId, applets)
  })

  it('创建失败允许原保存重试，不进入部分成功状态', async () => {
    api.createUser.mockRejectedValueOnce(new Error('create failure'))
    const state = await open('create')
    await state.handleSave()
    expect(state.createdUser).toBeNull()
    expect(api.saveUserApplets).not.toHaveBeenCalled()
    expect(wrapper.emitted('saved')).toBeUndefined()
    await state.handleSave()
    expect(api.createUser).toHaveBeenCalledTimes(2)
    expect(api.saveUserApplets).toHaveBeenCalledOnce()
  })

  it('创建在途阻止重复提交，应用载荷使用点击时快照', async () => {
    const wait = deferred()
    api.createUser.mockReturnValueOnce(wait.promise)
    const state = await open('create')
    const saving = state.handleSave()
    await flushPromises()
    await state.handleSave()
    state.allApplets[0]._user_applet = false
    wait.resolve({ data: createdRows })
    await saving
    expect(api.createUser).toHaveBeenCalledOnce()
    expect(api.saveUserApplets.mock.calls[0][1][0]._user_applet).toBe(true)
  })

  it('租户变化后迟到创建响应不触发应用授权', async () => {
    const wait = deferred()
    api.createUser.mockReturnValueOnce(wait.promise)
    const state = await open('create')
    const saving = state.handleSave()
    await flushPromises()
    authService.getCurrentUser.mockReturnValue({ tenantId: 'other-tenant' })
    wait.resolve({ data: createdRows })
    await saving
    expect(api.saveUserApplets).not.toHaveBeenCalled()
    expect(ElMessage.success).not.toHaveBeenCalled()
  })

  it('关闭重开后的旧创建响应不提交应用或覆盖新草稿', async () => {
    const wait = deferred()
    api.createUser.mockReturnValueOnce(wait.promise)
    const state = await open('create')
    const saving = state.handleSave()
    await flushPromises()
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    state.form.fullName = '新的草稿'
    wait.resolve({ data: createdRows })
    await saving
    expect(api.saveUserApplets).not.toHaveBeenCalled()
    expect(state.createdUser).toBeNull()
    expect(state.form.fullName).toBe('新的草稿')
  })

  it('旧应用响应不能关闭新草稿', async () => {
    const wait = deferred()
    api.saveUserApplets.mockReturnValueOnce(wait.promise)
    const state = await open('create')
    const saving = state.handleSave()
    await flushPromises()
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    wait.resolve({})
    await saving
    expect(ElMessage.success).not.toHaveBeenCalled()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('应用读取失败禁保存，重试加载成功后恢复，不当成无应用', async () => {
    const state = await open('create')
    api.getUserApplets.mockRejectedValueOnce(new Error('read failure'))
    await state.initDialog()
    await flushPromises()
    expect(state.loadFailed).toBe(true)
    state.form.fullName = '读取失败期间填写的姓名'
    await state.handleSave()
    expect(api.createUser).not.toHaveBeenCalled()
    await state.retryLoad()
    await flushPromises()
    expect(state.loadFailed).toBe(false)
    expect(state.saveDisabled).toBe(false)
    expect(state.form.fullName).toBe('读取失败期间填写的姓名')
  })

  it('角色读取失败不创建用户，仅读取失败部分并保留应用选择', async () => {
    api.getRoles.mockRejectedValueOnce(new Error('role read failure'))
    const state = await open('create')
    await state.handleSave()
    expect(api.createUser).not.toHaveBeenCalled()
    await state.retryLoad()
    expect(api.getUserApplets).toHaveBeenCalledOnce()
    expect(state.allApplets[0]._user_applet).toBe(true)
    expect(state.loadFailed).toBe(false)
  })

  it('应用读取未完成不创建用户', async () => {
    const state = await open('create')
    const wait = deferred()
    api.getUserApplets.mockReturnValueOnce(wait.promise)
    await state.initDialog()
    await state.handleSave()
    expect(api.createUser).not.toHaveBeenCalled()
    wait.resolve({ data: applets })
    await flushPromises()
  })

  it('表单校验未完成不能重复提交，校验失败不创建', async () => {
    const wait = deferred()
    validate.mockReturnValueOnce(wait.promise)
    const state = await open('create')
    const saving = state.handleSave()
    await state.handleSave()
    expect(validate).toHaveBeenCalledOnce()
    wait.reject(new Error('invalid form'))
    await saving
    expect(api.createUser).not.toHaveBeenCalled()
    expect(state.saving).toBe(false)
  })

  it('卸载后的创建结果不继续应用授权', async () => {
    const wait = deferred()
    api.createUser.mockReturnValueOnce(wait.promise)
    const state = await open('create')
    const saving = state.handleSave()
    await flushPromises()
    wrapper.unmount()
    wait.resolve({ data: createdRows })
    await saving
    expect(api.saveUserApplets).not.toHaveBeenCalled()
    expect(ElMessage.success).not.toHaveBeenCalled()
  })

  it('换用户后旧详情不能覆盖新建草稿，保存分支保持新建', async () => {
    const wait = deferred()
    api.getUserDetail.mockReturnValueOnce(wait.promise)
    const state = await open('edit')
    await wrapper.setProps({ mode: 'create', user: null })
    await flushPromises()
    state.form.fullName = '新建草稿'
    wait.resolve({ data: user })
    await flushPromises()
    expect(state.form.id).toBeNull()
    expect(state.form.fullName).toBe('新建草稿')
    await state.handleSave()
    expect(api.createUser).toHaveBeenCalledOnce()
    expect(api.updateUser).not.toHaveBeenCalled()
  })

  it('关闭重开后的旧应用列表不能覆盖新选择', async () => {
    const state = await open('create')
    const wait = deferred()
    api.getUserApplets.mockReturnValueOnce(wait.promise)
    await state.initDialog()
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    state.allApplets[0]._user_applet = true
    wait.resolve({ data: [] })
    await flushPromises()
    expect(state.allApplets[0]._user_applet).toBe(true)
  })

  it('现有编辑分支应用保存失败后仍提示成功并关闭，不能用成功提示证明应用保存成功', async () => {
    api.saveUserApplets.mockRejectedValue(new Error('mock application save failure'))
    const state = await open('edit')
    await state.handleSave()
    expect(api.saveUserApplets).toHaveBeenCalledOnce()
    expect(ElMessage.success).toHaveBeenCalledWith('保存成功')
    expect(wrapper.emitted('saved')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')).toContainEqual([false])
  })
})
