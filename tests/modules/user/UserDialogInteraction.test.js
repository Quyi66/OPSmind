import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, KeepAlive, ref } from 'vue'
import { ElRadio, ElRadioGroup } from 'element-plus/es/components/radio/index.mjs'
import { ElDialog } from 'element-plus/es/components/dialog/index.mjs'
import CreateUserDialog from '@/modules/user/components/dialogs/CreateUserDialog.vue'
import EditUserDialog from '@/modules/user/components/dialogs/EditUserDialog.vue'
import DeleteUserDialog from '@/modules/user/components/dialogs/DeleteUserDialog.vue'
import ScanHostDialog from '@/modules/user/components/dialogs/ScanHostDialog.vue'
import CreateGroupDialog from '@/modules/user/components/dialogs/CreateGroupDialog.vue'
import DeleteGroupDialog from '@/modules/user/components/dialogs/DeleteGroupDialog.vue'

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  validate: vi.fn()
}))
vi.mock('@/core/api', () => ({
  apiService: { get: api.get, post: api.post },
  getJaoOperationLogs: vi.fn()
}))
vi.mock('element-plus', () => ({ ElMessage: { success: api.success, warning: api.warning } }))
vi.mock('@/composables/useJobPolling', () => ({
  useJobPolling: () => ({ startPolling: api.start, stopPolling: api.stop })
}))
vi.mock('@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue', () => ({
  default: { name: 'AcmDeviceSelector', props: ['modelValue', 'disabled'], template: '<div />' }
}))
const Slot = { template: '<div><slot /></div>' }
const Form = defineComponent({
  name: 'ElForm',
  props: ['disabled'],
  setup(_props, { expose }) {
    expose({ validate: api.validate, resetFields: () => {} })
  },
  template: '<form @submit.prevent><slot /></form>'
})
const stubs = {
  'el-dialog': {
    props: ['modelValue'],
    template: '<section v-if="modelValue"><slot /><slot name="footer" /></section>'
  },
  'el-form': Form,
  'el-form-item': Slot,
  'el-button': {
    props: ['disabled', 'loading'],
    template: '<button :disabled="disabled || loading"><slot /></button>'
  },
  'el-input': {
    props: ['modelValue', 'disabled'],
    emits: ['update:modelValue'],
    template:
      '<input :disabled="disabled" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  },
  ElSelect: {
    name: 'ElSelect',
    props: ['modelValue', 'loading'],
    emits: ['update:modelValue'],
    template: '<div><slot /></div>'
  },
  ElOption: { props: ['label', 'value'], template: '<span>{{ label }}</span>' },
  ElTable: { props: ['data'], template: '<div><slot /></div>' },
  ElTableColumn: { name: 'ElTableColumn', props: ['type'], template: '<div />' },
  ElRadioGroup: Slot,
  ElRadio: Slot,
  ElDatePicker: true,
  ElDescriptions: Slot,
  ElDescriptionsItem: Slot,
  ElAlert: {
    props: ['title', 'description', 'type'],
    template: '<aside role="alert">{{ title }} {{ description }}</aside>'
  }
}
const wrappers = []
let templates, commands, getOverride
const hosts = [
  { key: 'asset-17', value: '192.0.2.17', assetType: 'linux', runType: 'group', total_hosts: 3 }
]
const account = {
  id: 'account-A',
  host_id: 'asset-A',
  host_key: '192.0.2.1',
  username: 'alice',
  lock_status: 1,
  secondary_group: 'ops',
  home: '/home/alice',
  shell: '/bin/sh',
  comment: 'original',
  expired_date: '2027-01-01'
}
const raw = records => ({ data: { data: records } })
const state = wrapper => wrapper.vm.$.setupState
const button = (wrapper, text) => wrapper.findAll('button').find(item => item.text() === text)
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
async function open(component, props = {}, extra = {}) {
  const wrapper = mount(component, {
    props: {
      visible: true,
      user: { ...account },
      'onUpdate:visible': value => wrapper.setProps({ visible: value }),
      ...props
    },
    global: { stubs: { ...stubs, ...extra }, directives: { loading: () => {} } }
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}
function prepare(wrapper, name) {
  const setup = state(wrapper)
  if (['创建', '扫描'].includes(name)) setup.selectedHosts = hosts.map(item => ({ ...item }))
  if (name === '创建')
    Object.assign(setup.formData, {
      username: 'newuser',
      password: 'draft-secret',
      group: 'primary',
      groups: 'ops',
      home: '/home/newuser',
      shell: '/bin/bash',
      expiredDate: '2027-01-01',
      comment: 'new'
    })
}
async function submit(wrapper, name) {
  prepare(wrapper, name)
  state(wrapper)[name === '扫描' ? 'handleExecute' : 'handleSubmit']()
  await flushPromises()
}
beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset())
  api.validate.mockResolvedValue(true)
  templates = Array.from({ length: 15 }, (_, i) => ({ id: `t${i}`, name: `Template ${i}` }))
  commands = new Map(
    templates.map(item => [
      item.id,
      Array.from({ length: 12 }, (_, i) => ({
        command: `${item.id}-cmd-${i}`,
        description: 'original'
      }))
    ])
  )
  getOverride = null
  api.get.mockImplementation((url, options) => {
    const overridden = getOverride?.(url, options)
    if (overridden) return overridden
    return Promise.resolve(
      raw(
        url.endsWith('/lupm-sudo-templates')
          ? templates
          : commands.get(options?.params?.templateId) || []
      )
    )
  })
  api.post.mockResolvedValue({
    data: { status: 'FAILED', error: 'original failure', runId: 'run-original' }
  })
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('sudo原API前端截取与提交一致性', () => {
  it('通过真实API包装补齐超过10条模板和超过1000条命令，提交全部原命令且没有假勾选', async () => {
    commands.set(
      't14',
      Array.from({ length: 1201 }, (_, i) => ({ command: `command-${i}` }))
    )
    const wrapper = await open(CreateUserDialog)
    expect(state(wrapper).sudoTemplates).toHaveLength(15)
    expect(api.get.mock.calls.filter(([url]) => url.endsWith('/lupm-sudo-templates'))).toHaveLength(
      2
    )
    state(wrapper).formData.templateId = 't14'
    await flushPromises()
    expect(state(wrapper).sudoCommands).toHaveLength(1201)
    expect(state(wrapper).canSubmitSudo).toBe(true)
    expect(
      wrapper
        .findAllComponents({ name: 'ElTableColumn' })
        .some(column => column.props('type') === 'selection')
    ).toBe(false)
    await submit(wrapper, '创建')
    const [url, { params }] = api.post.mock.lastCall
    expect(url).toMatch(/jobs\/6snZO9\/run\?cacheBuster=/)
    expect(params).toEqual({
      user_name: 'newuser',
      user_password: 'draft-secret',
      user_group: 'primary',
      groups: 'ops',
      user_home: '/home/newuser',
      user_shell: '/bin/bash',
      user_expires: '2027-01-01',
      user_sudo_command: commands
        .get('t14')
        .map(item => item.command)
        .join(','),
      user_comment: 'new',
      hosts: JSON.stringify(hosts)
    })
    expect(state(wrapper).formData.password).toBe('')
    expect(
      api.get.mock.calls.filter(([url]) => url.endsWith('/lupm-sudo-command-by-template-id'))
    ).toHaveLength(2)
  })
  it('未打开不读模板；明确N/A沿原空命令参数提交，不被模板读取失败误阻断', async () => {
    const wrapper = await open(CreateUserDialog, { visible: false })
    expect(api.get).not.toHaveBeenCalled()
    getOverride = () => Promise.reject(new Error('read failed'))
    await wrapper.setProps({ visible: true })
    await flushPromises()
    expect(state(wrapper).templatesError).toContain('读取失败')
    await submit(wrapper, '创建')
    expect(api.post.mock.lastCall[1].params.user_sudo_command).toBe('')
  })
  it('读取中阻止提交，选择N/A立即清命令且不接受旧模板响应', async () => {
    const wrapper = await open(CreateUserDialog)
    const pending = deferred()
    getOverride = url => (url.endsWith('by-template-id') ? pending.promise : null)
    state(wrapper).formData.templateId = 't0'
    await flushPromises()
    await submit(wrapper, '创建')
    expect(api.post).not.toHaveBeenCalled()
    state(wrapper).formData.templateId = 'N/A'
    await flushPromises()
    pending.resolve(raw([{ command: 'late-command' }]))
    await flushPromises()
    expect(state(wrapper).sudoCommands).toEqual([])
    expect(state(wrapper).canSubmitSudo).toBe(true)
  })
  it('模板切换隔离旧成功/失败，重试仅读取当前模板', async () => {
    const wrapper = await open(EditUserDialog, { initialOperate: 'sudo' })
    const old = deferred()
    getOverride = (_url, options) =>
      options?.params?.templateId === 't0'
        ? old.promise
        : options?.params?.templateId === 't1'
          ? Promise.reject(new Error('current read failure'))
          : null
    state(wrapper).formData.templateId = 't0'
    await flushPromises()
    state(wrapper).formData.templateId = 't1'
    await flushPromises()
    old.resolve(raw([{ command: 't0-late' }]))
    await flushPromises()
    expect(state(wrapper).sudoCommands).toEqual([])
    expect(state(wrapper).commandsError).toContain('读取失败')
    getOverride = null
    await button(wrapper, '重试命令读取').trigger('click')
    await flushPromises()
    expect(state(wrapper).sudoCommands).toEqual(commands.get('t1'))
  })
  it('补齐期间集合增长则标记不完整，禁止提交而不猜大size', async () => {
    const wrapper = await open(CreateUserDialog)
    let calls = 0
    getOverride = url =>
      url.endsWith('by-template-id')
        ? Promise.resolve(
            raw(Array.from({ length: ++calls === 1 ? 11 : 12 }, (_, i) => ({ command: `c${i}` })))
          )
        : null
    state(wrapper).formData.templateId = 't0'
    await flushPromises()
    expect(state(wrapper).commandsError).toContain('不完整')
    expect(state(wrapper).sudoCommands).toEqual([])
    await submit(wrapper, '创建')
    expect(api.post).not.toHaveBeenCalled()
    expect(calls).toBe(2)
  })
  it('真实空模板与读取失败区分，空命令沿原参数，缺失模板不得提交', async () => {
    const wrapper = await open(EditUserDialog, { initialOperate: 'sudo' })
    commands.set('t0', [])
    state(wrapper).formData.templateId = 't0'
    await flushPromises()
    expect(state(wrapper).canSubmitSudo).toBe(true)
    expect(wrapper.text()).toContain('全部 0 条命令')
    state(wrapper).handleSubmit()
    await flushPromises()
    expect(api.post.mock.lastCall[1].params).toEqual({
      user_name: 'alice',
      hosts: 'asset-A',
      user_sudo_command: ''
    })
    await wrapper.setProps({ visible: false })
    await wrapper.setProps({ visible: true })
    state(wrapper).formData.templateId = 'missing'
    await flushPromises()
    state(wrapper).handleSubmit()
    await flushPromises()
    expect(state(wrapper).canSubmitSudo).toBe(false)
    expect(api.post).toHaveBeenCalledTimes(1)
  })
  it('关闭重开后旧模板响应不能覆盖新窗口', async () => {
    const wrapper = await open(CreateUserDialog)
    const old = deferred()
    getOverride = url => (url.endsWith('by-template-id') ? old.promise : null)
    state(wrapper).formData.templateId = 't0'
    await flushPromises()
    state(wrapper).handleClose()
    await flushPromises()
    getOverride = null
    await wrapper.setProps({ visible: true })
    await flushPromises()
    state(wrapper).formData.templateId = 't1'
    await flushPromises()
    old.reject(new Error('late read failed'))
    await flushPromises()
    expect(state(wrapper).sudoCommands).toEqual(commands.get('t1'))
    expect(state(wrapper).commandsError).toBe('')
  })
  it('非N/A模板必须来自可信模板集合，模板失败可重试恢复而不执行任务', async () => {
    getOverride = url =>
      url.endsWith('/lupm-sudo-templates')
        ? Promise.reject(new Error('templates unavailable'))
        : null
    const wrapper = await open(EditUserDialog, { initialOperate: 'sudo' })
    state(wrapper).formData.templateId = 't0'
    await flushPromises()
    expect(state(wrapper).sudoCommands).toHaveLength(12)
    expect(state(wrapper).canSubmitSudo).toBe(false)
    state(wrapper).handleSubmit()
    expect(api.post).not.toHaveBeenCalled()
    getOverride = null
    await button(wrapper, '重试模板读取').trigger('click')
    await flushPromises()
    expect(state(wrapper).canSubmitSudo).toBe(true)
    expect(api.post).not.toHaveBeenCalled()
  })
  it.each([{ records: [{ command: '' }] }, { records: [{ description: 'missing command' }] }])(
    '非法命令集合不当空命令提交 %j',
    async ({ records }) => {
      commands.set('t0', records)
      const wrapper = await open(CreateUserDialog)
      state(wrapper).formData.templateId = 't0'
      await flushPromises()
      expect(state(wrapper).commandsError).toContain('读取失败或不完整')
      await submit(wrapper, '创建')
      expect(api.post).not.toHaveBeenCalled()
    }
  )
  it('sudo缓存失活丢弃旧读取，返回需重读模板与命令而非自动恢复授权草稿', async () => {
    const shown = ref(true)
    const pending = deferred()
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(KeepAlive, null, () =>
            shown.value
              ? h(EditUserDialog, { visible: true, user: account, initialOperate: 'sudo' })
              : null
          )
      }),
      {
        global: { stubs, directives: { loading: () => {} } }
      }
    )
    wrappers.push(wrapper)
    await flushPromises()
    const dialog = wrapper.findComponent(EditUserDialog)
    getOverride = url => (url.endsWith('by-template-id') ? pending.promise : null)
    state(dialog).formData.templateId = 't0'
    await flushPromises()
    shown.value = false
    await flushPromises()
    pending.resolve(raw([{ command: 'late-cache' }]))
    await flushPromises()
    getOverride = null
    shown.value = true
    await flushPromises()
    expect(wrapper.text()).toContain('读取已中断')
    expect(state(dialog).sudoCommands).toEqual([])
    expect(state(dialog).canSubmitSudo).toBe(false)
    await button(wrapper, '重试模板读取').trigger('click')
    await button(wrapper, '重试命令读取').trigger('click')
    await flushPromises()
    expect(state(dialog).sudoCommands).toEqual(commands.get('t0'))
    expect(state(dialog).canSubmitSudo).toBe(true)
    expect(api.post).not.toHaveBeenCalled()
  })
})

describe('编辑本次动作与原身份/参数', () => {
  it('锁定快捷入口保留反向预选；未知状态不猜动作', async () => {
    const wrapper = await open(EditUserDialog, { initialOperate: 'lock' })
    expect(state(wrapper).formData.user_lock).toBe('no')
    expect(button(wrapper, '解锁用户')).toBeDefined()
    state(wrapper).handleSubmit()
    await flushPromises()
    expect(api.post.mock.lastCall[0]).toContain('/jobs/1TKvLB/run?')
    expect(api.post.mock.lastCall[1].params).toEqual({
      user_name: 'alice',
      hosts: 'asset-A',
      user_lock: 'no'
    })
    await wrapper.setProps({
      user: { ...account, id: 'account-B', host_id: 'asset-B', lock_status: 0 }
    })
    await flushPromises()
    expect(state(wrapper).formData.user_lock).toBe('')
    expect(button(wrapper, '请选择锁定动作').attributes('disabled')).toBeDefined()
  })
  it('真实Radio切入锁定/SSH需明确选择，确认文字与本次yes/no参数一致', async () => {
    const wrapper = await open(EditUserDialog, {}, { ElRadio, ElRadioGroup })
    const clickRadio = async label => {
      await wrapper
        .findAll('label.el-radio')
        .find(item => item.text() === label)
        .find('input[type="radio"]')
        .setValue(true)
      await flushPromises()
    }
    await clickRadio('锁定/解锁')
    expect(state(wrapper).formData.user_lock).toBe('')
    await clickRadio('锁定')
    expect(button(wrapper, '锁定用户')).toBeDefined()
    await clickRadio('SSH登录')
    expect(state(wrapper).formData.user_login).toBe('')
    expect(wrapper.text()).toContain('不表示已读取')
    await clickRadio('否')
    await button(wrapper, '禁止SSH登录').trigger('click')
    await flushPromises()
    expect(api.post.mock.lastCall[0]).toContain('/jobs/wSVnmq/run?')
    expect(api.post.mock.lastCall[1].params).toEqual({
      user_name: 'alice',
      hosts: 'asset-A',
      user_login: 'no'
    })
  })
  it('重开/换账号恢复基本信息并清空旧动作、密码和sudo草稿', async () => {
    const wrapper = await open(EditUserDialog)
    Object.assign(state(wrapper).formData, {
      user_home: '/draft',
      user_password: 'secret',
      user_lock: 'yes',
      user_login: 'no',
      templateId: 't0'
    })
    state(wrapper).handleClose()
    await flushPromises()
    await wrapper.setProps({
      visible: true,
      user: { ...account, id: 'account-B', username: 'bob', host_id: 'asset-B', home: '/home/bob' }
    })
    await flushPromises()
    expect(state(wrapper).formData).toMatchObject({
      username: 'bob',
      user_home: '/home/bob',
      user_groups: 'ops',
      user_expires: '2027-01-01',
      user_lock: '',
      user_login: '',
      user_password: '',
      templateId: 'N/A'
    })
  })
  it.each([
    [
      'modify_base',
      'EOLAGR',
      {
        user_groups: 'ops',
        user_home: '/home/alice',
        user_shell: '/bin/sh',
        user_comment: 'original',
        user_expires: '2027-01-01'
      }
    ],
    ['modify_password', 'rbNP8M', { user_password: 'new-secret' }]
  ])('%s保持原作业与参数', async (operate, jobId, params) => {
    const wrapper = await open(EditUserDialog, { initialOperate: operate })
    if (operate === 'modify_password') state(wrapper).formData.user_password = 'new-secret'
    state(wrapper).handleSubmit()
    await flushPromises()
    expect(api.post.mock.lastCall[0]).toContain(`/jobs/${jobId}/run?`)
    expect(api.post.mock.lastCall[1].params).toEqual({
      user_name: 'alice',
      hosts: 'asset-A',
      ...params
    })
    if (operate === 'modify_password') expect(state(wrapper).formData.user_password).toBe('')
  })
  it('密码空值及缺失目标保持阻止提交', async () => {
    const wrapper = await open(EditUserDialog, { initialOperate: 'modify_password' })
    state(wrapper).handleSubmit()
    expect(api.post).not.toHaveBeenCalled()
    expect(api.warning).toHaveBeenLastCalledWith('请输入新密码')
    await wrapper.setProps({ user: { username: 'no-id' } })
    await flushPromises()
    state(wrapper).formData.user_password = 'secret'
    state(wrapper).handleSubmit()
    expect(api.post).not.toHaveBeenCalled()
  })
})

const cases = [
  { name: '创建', component: CreateUserDialog, job: '6snZO9', attempts: 120 },
  { name: '修改', component: EditUserDialog, job: 'EOLAGR', attempts: 60 },
  { name: '删除', component: DeleteUserDialog, job: '5XLCC1', attempts: 60 },
  { name: '扫描', component: ScanHostDialog, job: 'hTzJfM', attempts: 120 }
]
const closeCases = [
  ...cases,
  { name: '创建组', component: CreateGroupDialog },
  { name: '删除组', component: DeleteGroupDialog }
]
function setCloseDraft(wrapper, name) {
  const setup = state(wrapper)
  if (name === '创建') setup.formData.username = 'new-window'
  if (name === '修改') setup.formData.user_home = '/new-window'
  if (name === '删除') setup.formData.user_remove_home = 'no'
  if (name === '创建组') setup.formData.group_name = 'new-window'
  if (name === '删除组') setup.groupName = 'new-window'
  if (name === '扫描') setup.selectedHosts = hosts.map(item => ({ ...item }))
}
function expectCloseDraft(wrapper, name) {
  const setup = state(wrapper)
  if (name === '创建') expect(setup.formData.username).toBe('new-window')
  if (name === '修改') expect(setup.formData.user_home).toBe('/new-window')
  if (name === '删除') expect(setup.formData.user_remove_home).toBe('no')
  if (name === '创建组') expect(setup.formData.group_name).toBe('new-window')
  if (name === '删除组') expect(setup.groupName).toBe('new-window')
  if (name === '扫描') expect(setup.selectedHosts).toEqual(hosts)
}
describe.each(closeCases)('$name真实Dialog关闭边界', testCase => {
  it('取消仅请求关闭一次，重开后旧动画通知不得关闭或清空新草稿', async () => {
    const wrapper = await open(testCase.component, {}, { 'el-dialog': ElDialog, teleport: true })
    const dialog = wrapper.findComponent(ElDialog)
    await button(wrapper, '取消').trigger('click')
    await flushPromises()
    expect(wrapper.props('visible')).toBe(false)
    expect(wrapper.emitted('update:visible')).toEqual([[false]])
    await wrapper.setProps({ visible: true })
    await flushPromises()
    setCloseDraft(wrapper, testCase.name)
    // Element Dialog emits close before leave and update:modelValue after leave.
    dialog.vm.$emit('close')
    dialog.vm.$emit('update:modelValue', false)
    await flushPromises()
    expect(wrapper.props('visible')).toBe(true)
    expect(wrapper.emitted('update:visible')).toEqual([[false]])
    expectCloseDraft(wrapper, testCase.name)
    expect(api.post).not.toHaveBeenCalled()
  })
  it('右上角关闭立即清理本窗口并保留重新打开能力，不等待关闭动画', async () => {
    const wrapper = await open(testCase.component, {}, { 'el-dialog': ElDialog, teleport: true })
    if (testCase.name === '创建') state(wrapper).formData.password = 'draft-only'
    if (testCase.name === '修改') state(wrapper).formData.user_password = 'draft-only'
    await wrapper.find('.el-dialog__headerbtn').trigger('click')
    expect(wrapper.props('visible')).toBe(false)
    if (testCase.name === '创建') expect(state(wrapper).formData.password).toBe('')
    if (testCase.name === '修改') expect(state(wrapper).formData.user_password).toBe('')
    await flushPromises()
    expect(wrapper.emitted('update:visible')).toEqual([[false]])
    await wrapper.setProps({ visible: true })
    await flushPromises()
    expect(wrapper.findComponent(ElDialog).props('modelValue')).toBe(true)
    expect(api.post).not.toHaveBeenCalled()
  })
})
describe.each(cases)('$name任务结果与代次', testCase => {
  it.each(['SUCCESS', 'COMPLETED'])('%s才显示成功、刷新并正常关闭', async status => {
    api.post.mockResolvedValue({ data: [{ status, runId: 'real-run' }] })
    const wrapper = await open(testCase.component)
    await submit(wrapper, testCase.name)
    expect(api.post.mock.lastCall[0]).toContain(`/jobs/${testCase.job}/run?`)
    expect(api.success).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('success')).toHaveLength(1)
    expect(wrapper.props('visible')).toBe(false)
  })
  it('明确失败保留原因，未误报运行/成功或自动重提，仍允许关闭', async () => {
    const wrapper = await open(testCase.component)
    await submit(wrapper, testCase.name)
    expect(wrapper.text()).toContain('任务执行失败')
    expect(wrapper.text()).toContain('original failure')
    expect(wrapper.text()).toContain('run-original')
    expect(api.success).not.toHaveBeenCalled()
    expect(wrapper.props('visible')).toBe(true)
    state(wrapper)[testCase.name === '扫描' ? 'handleExecute' : 'handleSubmit']()
    await flushPromises()
    expect(api.post).toHaveBeenCalledTimes(1)
    await button(wrapper, '关闭窗口').trigger('click')
    await flushPromises()
    expect(wrapper.props('visible')).toBe(false)
  })
  it('WAITING沿原runId/轮询参数；查询失败/未知回调不等于执行成功', async () => {
    api.post.mockResolvedValue({ data: { status: 'WAITING', runId: 'run-identity' } })
    const wrapper = await open(testCase.component)
    await submit(wrapper, testCase.name)
    expect(wrapper.text()).toContain('等待执行')
    expect(wrapper.text()).toContain('不会取消')
    const [runId, callbacks] = api.start.mock.lastCall
    expect(runId).toBe('run-identity')
    expect(callbacks).toMatchObject({
      interval: 5000,
      maxAttempts: testCase.attempts,
      showMessage: false
    })
    callbacks.onSuccess({ status: 'CANCELLED' })
    await flushPromises()
    expect(wrapper.text()).toContain('结果尚未确定')
    expect(api.success).not.toHaveBeenCalled()
    expect(wrapper.props('visible')).toBe(true)
  })
  it('关闭重开后旧POST不启动轮询、不关闭新窗口或发成功消息', async () => {
    const pending = deferred()
    api.post.mockReturnValueOnce(pending.promise)
    const wrapper = await open(testCase.component)
    await submit(wrapper, testCase.name)
    await button(wrapper, '关闭窗口').trigger('click')
    await flushPromises()
    await wrapper.setProps({ visible: true })
    await flushPromises()
    pending.resolve({ data: { status: 'RUNNING', runId: 'late-run' } })
    await flushPromises()
    expect(api.start).not.toHaveBeenCalled()
    expect(api.success).not.toHaveBeenCalled()
    expect(wrapper.props('visible')).toBe(true)
    expect(state(wrapper).attempted).toBe(false)
    expect(wrapper.emitted('success')).toBeUndefined()
  })
})

describe('提交边界与其他结果', () => {
  it('删除主目录选择、真实主机及账号参数保持，确认前不发请求', async () => {
    const wrapper = await open(DeleteUserDialog)
    expect(wrapper.text()).toContain('不可恢复')
    expect(state(wrapper).formData.user_remove_home).toBe('yes')
    expect(api.post).not.toHaveBeenCalled()
    state(wrapper).formData.user_remove_home = 'no'
    await button(wrapper, '删除用户').trigger('click')
    await flushPromises()
    expect(api.post.mock.lastCall[1].params).toEqual({
      user_name: 'alice',
      hosts: 'asset-A',
      user_remove_home: 'no'
    })
  })
  it('扫描仍发送原主机对象数组，创建保持JSON字符串，不猜IP身份', async () => {
    const wrapper = await open(ScanHostDialog)
    await submit(wrapper, '扫描')
    expect(api.post.mock.lastCall[1].params).toEqual({ hosts })
  })
  it.each(['FAILED', 'ERROR'])('轮询%s保留真实失败原因', async status => {
    api.post.mockResolvedValue({ data: { status: 'RUNNING', runId: 'r1' } })
    const wrapper = await open(DeleteUserDialog)
    await submit(wrapper, '删除')
    api.start.mock.lastCall[1].onError({ status, error: 'terminal reason' })
    await flushPromises()
    expect(wrapper.text()).toContain('任务执行失败')
    expect(wrapper.text()).toContain('terminal reason')
    expect(wrapper.props('visible')).toBe(true)
  })
  it.each(['onError', 'onTimeout'])(
    '%s为结果未知，原轮询回调迟到也不能改已结束的本次结果',
    async callback => {
      api.post.mockResolvedValue({ data: { status: 'RUNNING', runId: 'r1' } })
      const wrapper = await open(DeleteUserDialog)
      await submit(wrapper, '删除')
      const callbacks = api.start.mock.lastCall[1]
      callbacks[callback](new Error('network'))
      await flushPromises()
      expect(wrapper.text()).toContain('结果尚未确定')
      expect(wrapper.text()).toContain(callback === 'onError' ? '结果读取失败' : '等待结果超时')
      callbacks.onSuccess({ status: 'SUCCESS' })
      await flushPromises()
      expect(api.success).not.toHaveBeenCalled()
      expect(api.post).toHaveBeenCalledTimes(1)
    }
  )
  it.each([{ status: 'RUNNING' }, { status: 'OTHER', runId: 'r' }, null])(
    '缺runId/未知响应不轮询、不假成功 %j',
    async result => {
      api.post.mockResolvedValue({ data: result })
      const wrapper = await open(DeleteUserDialog)
      await submit(wrapper, '删除')
      expect(wrapper.text()).toContain('结果尚未确定')
      expect(api.start).not.toHaveBeenCalled()
      expect(api.success).not.toHaveBeenCalled()
    }
  )
  it('POST异常不自动重试，明确未确认是否已下发', async () => {
    api.post.mockRejectedValue(new Error('network'))
    const wrapper = await open(DeleteUserDialog)
    await submit(wrapper, '删除')
    expect(wrapper.text()).toContain('提交结果未确认')
    expect(api.success).not.toHaveBeenCalled()
    expect(api.post).toHaveBeenCalledTimes(1)
  })
  it('创建校验等待中关闭重开，旧校验不能提交新窗口', async () => {
    const pending = deferred()
    api.validate.mockReturnValueOnce(pending.promise)
    const wrapper = await open(CreateUserDialog)
    await submit(wrapper, '创建')
    state(wrapper).handleClose()
    await flushPromises()
    await wrapper.setProps({ visible: true })
    await flushPromises()
    pending.resolve(true)
    await flushPromises()
    expect(api.post).not.toHaveBeenCalled()
    expect(state(wrapper).formData.password).toBe('')
    expect(state(wrapper).validating).toBe(false)
  })
  it('换账号隔离旧POST和旧轮询，保留新主机/账号草稿', async () => {
    api.post.mockResolvedValueOnce({ data: { status: 'RUNNING', runId: 'old-run' } })
    const wrapper = await open(EditUserDialog)
    await submit(wrapper, '修改')
    const callbacks = api.start.mock.lastCall[1]
    await wrapper.setProps({
      user: { ...account, id: 'account-B', host_id: 'asset-B', username: 'bob' }
    })
    await flushPromises()
    callbacks.onSuccess({ status: 'SUCCESS' })
    await flushPromises()
    expect(state(wrapper).formData.username).toBe('bob')
    expect(wrapper.props('visible')).toBe(true)
    expect(api.success).not.toHaveBeenCalled()
    state(wrapper).handleSubmit()
    await flushPromises()
    expect(api.post.mock.lastCall[1].params.hosts).toBe('asset-B')
  })
  it('卸载隔离迟到POST', async () => {
    const pending = deferred()
    api.post.mockReturnValueOnce(pending.promise)
    const wrapper = await open(DeleteUserDialog)
    await submit(wrapper, '删除')
    wrapper.unmount()
    pending.reject(new Error('late'))
    await flushPromises()
    expect(api.success).not.toHaveBeenCalled()
    expect(api.start).not.toHaveBeenCalled()
  })
  it('KeepAlive失活停止旧任务查询，返回显示未知且不重提', async () => {
    const shown = ref(true)
    api.post.mockResolvedValue({ data: { status: 'RUNNING', runId: 'r1' } })
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(KeepAlive, null, () =>
            shown.value ? h(DeleteUserDialog, { visible: true, user: account }) : null
          )
      }),
      {
        global: { stubs, directives: { loading: () => {} } }
      }
    )
    wrappers.push(wrapper)
    await flushPromises()
    const dialog = wrapper.findComponent(DeleteUserDialog)
    await submit(dialog, '删除')
    const callbacks = api.start.mock.lastCall[1]
    shown.value = false
    await flushPromises()
    callbacks.onSuccess({ status: 'SUCCESS' })
    await flushPromises()
    shown.value = true
    await flushPromises()
    expect(wrapper.text()).toContain('结果尚未确定')
    expect(wrapper.text()).toContain('窗口已离开')
    expect(api.success).not.toHaveBeenCalled()
    expect(api.post).toHaveBeenCalledTimes(1)
  })
})
