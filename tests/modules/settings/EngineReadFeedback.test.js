import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, KeepAlive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElRadioButton,
  ElRadioGroup,
  ElSwitch
} from 'element-plus'
import Page from '@/modules/settings/views/SscEnginePage.vue'

const api = vi.hoisted(() =>
  Object.fromEntries(
    [
      'getParamByDomainAndName',
      'getParamsByDomain',
      'queryProjectBaseDir',
      'queryProjects',
      'queryOrganizations',
      'queryCredentials',
      'queryInstanceGroups',
      'queryExecutionEnvironments',
      'updateParam',
      'batchUpdateParams'
    ].map(name => [name, vi.fn()])
  )
)
vi.mock('@/modules/settings/api/engine', () => api)
const params = () => [
  { id: 'param-fork', domain: 'jao', name: 'is_fork', value: 'true' },
  { id: 'param-count', domain: 'jao', name: 'forks', value: '256' },
  { id: 'param-sync', domain: 'jao', name: 'sync_script_git', value: 'false' }
]
const aapParams = () => [
  { id: 'host', domain: 'ata', name: 'tower_host', value: 'https://aap.example.invalid' },
  { id: 'clear', domain: 'ata', name: 'tower_clear', value: 'false' },
  {
    id: 'login',
    domain: 'ata',
    name: 'tower_login_config',
    value: JSON.stringify({
      web_login_name: 'sample-login',
      web_login_pwd: 'sample-password',
      cluster_servers: [
        { host: 'sample-host', port: '22', username: 'sample-user', password: 'sample-secret' }
      ]
    })
  },
  {
    id: 'config',
    domain: 'ata',
    name: 'tower_config',
    value: JSON.stringify({
      git_project_id: 0,
      organization_id: 0,
      template_project_id: 2,
      template_credentials_id: [0],
      template_become: false
    })
  }
]
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
      { path: '/ssc/engine', component: Page },
      { path: '/other', component: { template: '<div />' } }
    ]
  })
  await router.push('/ssc/engine')
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
        'el-button': ElButton,
        'el-input': ElInput,
        'el-switch': ElSwitch,
        'el-radio-group': ElRadioGroup,
        'el-radio-button': ElRadioButton,
        'el-input-number': { props: ['modelValue'], template: '<span>{{ modelValue }}</span>' },
        'el-alert': { props: ['title'], template: '<div role="alert">{{ title }}<slot /></div>' },
        'el-card': Slot,
        'el-divider': Slot,
        'el-row': Slot,
        'el-col': Slot,
        'el-select': Slot,
        'el-option': true,
        'el-table': Slot,
        'el-table-column': true
      }
    }
  })
  await flushPromises()
}
beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset())
  api.getParamByDomainAndName.mockResolvedValue({
    id: 'engine-original',
    domain: 'jao',
    name: 'script_engine',
    value: 'ansible'
  })
  api.getParamsByDomain.mockResolvedValue(params())
  api.queryProjectBaseDir.mockResolvedValue({ project_base_dir: '/original-base' })
  api.queryProjects.mockResolvedValue({
    results: [
      { id: 0, name: 'git-original', scm_type: 'git' },
      { id: 2, name: 'manual-original', scm_type: '', local_path: 'original-path' }
    ]
  })
  for (const name of [
    'queryOrganizations',
    'queryCredentials',
    'queryInstanceGroups',
    'queryExecutionEnvironments'
  ])
    api[name].mockResolvedValue({ results: [{ id: 0, name: 'option-original' }] })
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
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

describe('引擎配置读取反馈与过期响应保护', () => {
  it('配置完整读取前禁用表单，成功后显示原参数且未写入', async () => {
    const pending = deferred()
    api.getParamsByDomain.mockReturnValueOnce(pending.promise)
    await open()
    expect(page().findComponent(ElForm).props('disabled')).toBe(true)
    expect(button('保存').attributes('disabled')).toBeDefined()
    pending.resolve(params())
    await flushPromises()
    expect(state().configReady).toBe(true)
    expect(state().jaoParamMap).toMatchObject({ is_fork: true, forks: 256, sync_script_git: false })
    expect(page().findComponent(ElForm).props('disabled')).toBe(false)
    expect(api.getParamByDomainAndName).toHaveBeenCalledWith('jao', 'script_engine')
    expect(api.getParamsByDomain).toHaveBeenCalledWith('jao')
    expect(api.updateParam).not.toHaveBeenCalled()
    expect(api.batchUpdateParams).not.toHaveBeenCalled()
  })

  it.each(['engine', 'params', 'parse', 'missing'])(
    '%s读取失败可见重试且禁止默认值保存/切引擎',
    async failure => {
      if (failure === 'engine')
        api.getParamByDomainAndName.mockRejectedValueOnce(new Error('engine-read'))
      if (failure === 'params')
        api.getParamsByDomain.mockRejectedValueOnce(new Error('params-read'))
      if (failure === 'parse')
        api.getParamsByDomain.mockResolvedValueOnce([{ name: 'forks', value: 'invalid-json' }])
      if (failure === 'missing') api.getParamByDomainAndName.mockResolvedValueOnce(null)
      await open()
      expect(page().get('[role="alert"]').text()).toContain('未完整读取')
      expect(state().configReady).toBe(false)
      expect(button('保存').attributes('disabled')).toBeDefined()
      await state().saveAnsibleConfig()
      await state().saveAapConfig()
      state().usedEngine = 'aap'
      await state().handleEngineChange()
      expect(state().usedEngine).toBe(state().scriptEngine)
      expect(ElMessageBox.confirm).not.toHaveBeenCalled()
      expect(api.updateParam).not.toHaveBeenCalled()
      expect(api.batchUpdateParams).not.toHaveBeenCalled()
      await button('重试读取').trigger('click')
      await flushPromises()
      expect(state().configReady).toBe(true)
      expect(page().find('[role="alert"]').exists()).toBe(false)
    }
  )

  it('无效JSON不把部分新参数套入旧表单，修正后原条件重试', async () => {
    await open()
    api.getParamsByDomain.mockResolvedValueOnce([
      { name: 'is_fork', value: 'false' },
      { name: 'forks', value: 'bad-json' }
    ])
    await state().loadScriptEngine()
    await flushPromises()
    expect(state().jaoParamMap.is_fork).toBe(true)
    expect(state().jaoParamMap.forks).toBe(256)
    expect(state().configReady).toBe(false)
    await button('重试读取').trigger('click')
    await flushPromises()
    expect(state().jaoParamMap.forks).toBe(256)
    expect(state().configReady).toBe(true)
  })

  it.each(['resolve', 'reject'])('旧引擎读取%s不覆盖新读取或提前结束加载', async method => {
    const old = deferred(),
      latest = deferred()
    api.getParamByDomainAndName.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    await open()
    const read = state().loadScriptEngine()
    old[method](method === 'resolve' ? { value: 'aap' } : new Error('old'))
    await flushPromises()
    expect(state().loading).toBe(true)
    expect(api.getParamsByDomain).not.toHaveBeenCalled()
    expect(ElMessage.error).not.toHaveBeenCalled()
    latest.resolve({ id: 'engine-original', value: 'ansible' })
    await read
    await flushPromises()
    expect(state().scriptEngine).toBe('ansible')
    expect(state().configReady).toBe(true)
  })

  it('AAP选项失败显示持久重试、不误报连接成功并保留原配置，重试恢复原ID0选项', async () => {
    api.getParamByDomainAndName.mockResolvedValue({ id: 'engine-original', value: 'aap' })
    api.getParamsByDomain.mockResolvedValue(aapParams())
    api.queryCredentials.mockRejectedValueOnce(new Error('option-read'))
    await open()
    expect(state().configReady).toBe(true)
    expect(state().isConnectAap).toBe(false)
    expect(state().towerConfig.git_project_id).toBe(0)
    expect(page().get('[role="alert"]').text()).toContain('执行选项读取失败')
    expect(ElMessage.success).not.toHaveBeenCalled()
    await button('重试连接').trigger('click')
    await flushPromises()
    expect(state().isConnectAap).toBe(true)
    expect(state().gitProjects[0].id).toBe(0)
    expect(state().credentials[0].id).toBe(0)
    expect(page().find('[role="alert"]').exists()).toBe(false)
    expect(ElMessage.success).toHaveBeenCalledTimes(1)
    expect(api.batchUpdateParams).not.toHaveBeenCalled()
  })

  it('旧AAP选项迟到不能覆盖新连接选项或显示过期成功提示', async () => {
    api.getParamByDomainAndName.mockResolvedValue({ id: 'engine-original', value: 'aap' })
    api.getParamsByDomain.mockResolvedValue(aapParams())
    const old = deferred()
    api.queryProjects.mockReturnValueOnce(old.promise)
    await open()
    api.queryProjects.mockResolvedValueOnce({
      results: [{ id: 7, name: 'latest', scm_type: 'git' }]
    })
    await state().connectAap()
    await flushPromises()
    old.resolve({ results: [{ id: 1, name: 'old', scm_type: 'git' }] })
    await flushPromises()
    expect(state().projects[0].id).toBe(7)
    expect(ElMessage.success).toHaveBeenCalledTimes(1)
    expect(state().connecting).toBe(false)
  })

  it('完成读取后缓存往返保留未保存编辑，未中断读取不重复GET', async () => {
    await open(true)
    const context = state()
    context.jaoParamMap.forks = 999
    await router.push('/other')
    await flushPromises()
    await router.push('/ssc/engine')
    await flushPromises()
    expect(state()).toBe(context)
    expect(state().jaoParamMap.forks).toBe(999)
    expect(api.getParamByDomainAndName).toHaveBeenCalledTimes(1)
    expect(api.batchUpdateParams).not.toHaveBeenCalled()
  })

  it('读取中离开缓存页忽略迟到结果，返回同实例重读', async () => {
    const pending = deferred()
    api.getParamsByDomain.mockReturnValueOnce(pending.promise)
    await open(true)
    const context = state()
    await router.push('/other')
    await flushPromises()
    pending.resolve(params())
    await flushPromises()
    expect(context.jaoParamMap.forks).toBe(100)
    expect(context.configReady).toBe(false)
    await router.push('/ssc/engine')
    await flushPromises()
    expect(state()).toBe(context)
    expect(state().jaoParamMap.forks).toBe(256)
    expect(api.getParamByDomainAndName).toHaveBeenCalledTimes(2)
  })

  it.each(['resolve', 'reject'])('卸载后迟到%s不改变表单或弹提示', async method => {
    const pending = deferred()
    api.getParamsByDomain.mockReturnValueOnce(pending.promise)
    await open()
    const context = state()
    wrapper.unmount()
    pending[method](method === 'resolve' ? params() : new Error('late'))
    await flushPromises()
    expect(context.jaoParamMap.forks).toBe(100)
    expect(ElMessage.error).not.toHaveBeenCalled()
  })

  it('原保存确认、参数ID和JSON值保持，表单不原生提交', async () => {
    await open()
    const event = new Event('submit', { bubbles: true, cancelable: true })
    page().get('form').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    state().jaoParamMap.forks = 512
    await button('保存').trigger('click')
    await flushPromises()
    expect(ElMessageBox.confirm).toHaveBeenCalledWith(
      '确定要保存 Ansible 配置吗？',
      '变更操作',
      expect.objectContaining({ closeOnClickModal: false, closeOnPressEscape: false })
    )
    expect(api.batchUpdateParams).toHaveBeenCalledWith([
      { id: 'param-fork', domain: 'jao', name: 'is_fork', value: 'true' },
      { id: 'param-count', domain: 'jao', name: 'forks', value: '512' },
      { id: 'param-sync', domain: 'jao', name: 'sync_script_git', value: 'false' }
    ])
    expect(api.updateParam).not.toHaveBeenCalled()
  })

  it('重新读取缺少AAP配置项时不沿用上次用户名、密码、执行ID或额外JSON字段', async () => {
    api.getParamByDomainAndName.mockResolvedValue({ id: 'engine-original', value: 'aap' })
    api.getParamsByDomain.mockResolvedValue(aapParams())
    await open()
    state().loginConfig.oldExtra = 'previous-server-field'
    state().towerConfig.oldExtra = 'previous-option-field'
    api.getParamsByDomain.mockResolvedValueOnce([
      { name: 'tower_host', value: 'https://new-aap.example.invalid' }
    ])
    const connections = api.queryProjectBaseDir.mock.calls.length
    await state().loadScriptEngine()
    await flushPromises()
    expect(state().configReady).toBe(true)
    expect(state().loginConfig.web_login_name).toBe('')
    expect(state().loginConfig.web_login_pwd).toBe('')
    expect(state().loginConfig.oldExtra).toBeUndefined()
    expect(state().towerConfig.git_project_id).toBeNull()
    expect(state().towerConfig.oldExtra).toBeUndefined()
    expect(api.queryProjectBaseDir).toHaveBeenCalledTimes(connections)
  })

  it('AAP选项结果格式无效时保留配置并进入错误态，不回填半份选项或误报成功', async () => {
    api.getParamByDomainAndName.mockResolvedValue({ id: 'engine-original', value: 'aap' })
    api.getParamsByDomain.mockResolvedValue(aapParams())
    api.queryCredentials.mockResolvedValueOnce({ results: { invalid: true } })
    await open()
    expect(state().configReady).toBe(true)
    expect(state().isConnectAap).toBe(false)
    expect(state().projects).toEqual([])
    expect(state().credentials).toEqual([])
    expect(state().aapReadError).toContain('执行选项读取失败')
    expect(ElMessage.success).not.toHaveBeenCalled()
    await button('重试连接').trigger('click')
    await flushPromises()
    expect(state().isConnectAap).toBe(true)
    expect(state().credentials[0].id).toBe(0)
  })
})
