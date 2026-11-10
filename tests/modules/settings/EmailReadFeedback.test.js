import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, KeepAlive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { ElButton, ElForm, ElFormItem, ElInput, ElMessage, ElMessageBox } from 'element-plus'
import Page from '@/modules/settings/views/SscEmailPage.vue'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/core/api', () => ({ apiService: api }))
const config = () => ({
  username: 'sample@example.invalid',
  password: 'sample-password',
  host: 'smtp.example.invalid',
  port: '465',
  from: 'sample@example.invalid',
  debug_on_off: 'no',
  ssl_on_off: 'yes',
  recipient_type: 'to'
})
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
let wrapper, router
const page = () => wrapper.findComponent(Page)
const state = () => page().vm.$.setupState
const button = text =>
  page()
    .findAll('button')
    .find(item => item.text() === text)
async function open(routed = false) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/ssc/email', component: Page },
      { path: '/other', component: { template: '<div />' } }
    ]
  })
  await router.push('/ssc/email')
  await router.isReady()
  const Host = defineComponent({
    setup: () => () =>
      h(RouterView, null, {
        default: ({ Component, route }) =>
          h(KeepAlive, null, { default: () => h(Component, { key: route.path }) })
      })
  })
  const Slot = { template: '<div><slot /></div>' }
  wrapper = mount(routed ? Host : Page, {
    global: {
      plugins: [router],
      directives: { loading() {} },
      stubs: {
        'router-view': false,
        'el-form': ElForm,
        'el-form-item': ElFormItem,
        'el-input': ElInput,
        'el-button': ElButton,
        'el-card': Slot,
        'el-row': Slot,
        'el-col': Slot,
        'el-switch': true,
        'el-select': Slot,
        'el-option': true,
        'el-input-number': true,
        'el-dialog': {
          props: ['modelValue'],
          template: '<aside v-if="modelValue"><slot /><slot name="footer" /></aside>'
        },
        'el-alert': { props: ['title'], template: '<div role="alert">{{title}}<slot /></div>' }
      }
    }
  })
  await flushPromises()
}
beforeEach(() => {
  api.get.mockReset().mockResolvedValue({ data: config() })
  api.post.mockReset().mockResolvedValue({ code: '200' })
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
  vi.spyOn(ElMessage, 'warning').mockImplementation(() => {})
  vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
  vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm')
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

describe('邮件配置读取反馈', () => {
  it('读取前禁用操作与编辑，成功后回填原配置且未发送/保存', async () => {
    const pending = deferred()
    api.get.mockReturnValueOnce(pending.promise)
    await open()
    expect(page().findComponent(ElForm).props('disabled')).toBe(true)
    expect(button('保存').attributes('disabled')).toBeDefined()
    expect(button('测试发送').attributes('disabled')).toBeDefined()
    pending.resolve({ data: config() })
    await flushPromises()
    expect(state().configReady).toBe(true)
    expect(state().form).toEqual(config())
    expect(state().hasUnsavedChanges()).toBe(false)
    expect(api.get).toHaveBeenCalledWith('/api/email-config')
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('读取失败保持持久提示，不能保存或发送，重试成功恢复', async () => {
    api.get.mockRejectedValueOnce(new Error('read-failed'))
    await open()
    expect(page().get('[role="alert"]').text()).toContain('暂不可保存或测试')
    await state().handleSave()
    state().handleTest()
    await state().handleSendTest()
    expect(ElMessageBox.confirm).not.toHaveBeenCalled()
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(api.post).not.toHaveBeenCalled()
    await button('重试读取').trigger('click')
    await flushPromises()
    expect(state().form).toEqual(config())
    expect(page().find('[role="alert"]').exists()).toBe(false)
    expect(page().findComponent(ElForm).props('disabled')).toBe(false)
  })

  it.each(['resolve', 'reject'])('旧%s不能覆盖最新配置或结束最新加载', async method => {
    const old = deferred(),
      latest = deferred()
    api.get.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    await open()
    const read = state().loadConfig()
    old[method](
      method === 'resolve' ? { data: { ...config(), host: 'old-host' } } : new Error('old')
    )
    await flushPromises()
    expect(state().loading).toBe(true)
    expect(state().form.host).toBe('')
    expect(ElMessage.error).not.toHaveBeenCalled()
    latest.resolve({ data: config() })
    await read
    await flushPromises()
    expect(state().form.host).toBe('smtp.example.invalid')
    expect(state().loading).toBe(false)
  })

  it('缓存往返保留已加载后的未保存编辑、不重复读取', async () => {
    await open(true)
    const context = state()
    context.form.host = 'unsaved-host'
    await router.push('/other')
    await flushPromises()
    await router.push('/ssc/email')
    await flushPromises()
    expect(state()).toBe(context)
    expect(state().form.host).toBe('unsaved-host')
    expect(state().hasUnsavedChanges()).toBe(true)
    expect(api.get).toHaveBeenCalledTimes(1)
    state().handleTest()
    expect(ElMessage.warning).toHaveBeenCalledWith('请先保存配置后再进行测试')
  })

  it('缓存读取中断忽略迟到回填，返回重试同一接口', async () => {
    const pending = deferred()
    api.get.mockReturnValueOnce(pending.promise)
    await open(true)
    const context = state()
    await router.push('/other')
    await flushPromises()
    pending.resolve({ data: { ...config(), host: 'old-host' } })
    await flushPromises()
    expect(context.form.host).toBe('')
    expect(context.configReady).toBe(false)
    await router.push('/ssc/email')
    await flushPromises()
    expect(state()).toBe(context)
    expect(state().form.host).toBe('smtp.example.invalid')
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it.each(['resolve', 'reject'])('卸载后%s不回填或弹错', async method => {
    const pending = deferred()
    api.get.mockReturnValueOnce(pending.promise)
    await open()
    const context = state()
    wrapper.unmount()
    pending[method](method === 'resolve' ? { data: config() } : new Error('late'))
    await flushPromises()
    expect(context.form.host).toBe('')
    expect(ElMessage.error).not.toHaveBeenCalled()
  })

  it('读取空配置成功后仍允许用户填写新配置，不误当读取失败', async () => {
    api.get.mockResolvedValueOnce({ data: {} })
    await open()
    expect(state().configReady).toBe(true)
    expect(page().find('[role="alert"]').exists()).toBe(false)
    expect(button('保存').attributes('disabled')).toBeUndefined()
  })

  it('原保存确认与载荷保持；主表单阻止原生提交', async () => {
    await open()
    const event = new Event('submit', { bubbles: true, cancelable: true })
    page().get('form').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    await button('保存').trigger('click')
    await flushPromises()
    expect(ElMessageBox.confirm).toHaveBeenCalledWith(
      '确定要保存邮件配置吗？',
      '变更操作',
      expect.objectContaining({ closeOnClickModal: false, closeOnPressEscape: false })
    )
    expect(api.post).toHaveBeenCalledWith('/api/email-config', config())
    expect(api.get).toHaveBeenCalledTimes(1)
  })

  it('原测试发送接口保持，发送期间Enter不能重复调用', async () => {
    await open()
    state().handleTest()
    await flushPromises()
    expect(state().testDialogVisible).toBe(true)
    state().testRecipient = 'recipient@example.invalid'
    const pending = deferred()
    api.get.mockReturnValueOnce(pending.promise)
    const send = state().handleSendTest()
    await state().handleSendTest()
    expect(api.get).toHaveBeenCalledTimes(2)
    expect(api.get).toHaveBeenLastCalledWith('/api/email-config/recipient%40example.invalid')
    pending.resolve({ code: '200' })
    await send
    await flushPromises()
    expect(state().sending).toBe(false)
    expect(state().testDialogVisible).toBe(false)
    expect(ElMessage.success).toHaveBeenCalledWith('测试邮件发送成功')
  })

  it('后端字段顺序不同或省略默认选项不误判未保存修改，编辑后仍阻止测试', async () => {
    const received = Object.fromEntries(Object.entries(config()).reverse())
    delete received.recipient_type
    api.get.mockResolvedValueOnce({ data: received })
    await open()
    expect(state().hasUnsavedChanges()).toBe(false)
    state().handleTest()
    await flushPromises()
    expect(state().testDialogVisible).toBe(true)
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(api.post).not.toHaveBeenCalled()
    state().testDialogVisible = false
    state().form.host = 'unsaved-host'
    state().handleTest()
    expect(state().testDialogVisible).toBe(false)
    expect(ElMessage.warning).toHaveBeenCalledWith('请先保存配置后再进行测试')
  })
})
