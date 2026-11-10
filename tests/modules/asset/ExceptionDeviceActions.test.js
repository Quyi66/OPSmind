import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElMessage, ElMessageBox } from 'element-plus'
import Page from '@/modules/asset/views/ExceptionDevicePage.vue'
import Selector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelectorDialog.vue'

const api = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('@/core/api', () => ({ apiService: api }))
vi.mock('@/modules/asset/api', () => ({
  dataManageApi: { getResourceTypes: vi.fn().mockResolvedValue({ records: [] }) },
  exceptionApi: {
    getConnectionCount: vi.fn().mockResolvedValue({ records: [] }),
    getConnectException: vi.fn().mockResolvedValue({ records: [], total: 0 })
  }
}))
vi.mock('@/modules/automation/api/jao', () => ({
  getAcmCiTypesAuto: vi.fn().mockResolvedValue({
    linux: { title: 'Linux' },
    windows: { title: 'Windows' }
  }),
  getAcmCiTypes: vi.fn().mockResolvedValue({ linux: { title: 'Linux' } })
}))
vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/acm/exception', fullPath: '/acm/exception', query: {} }),
  useRouter: () => ({ push: vi.fn() })
}))

const hosts = [
  { key: 'linux-id', value: '192.0.2.1', assetType: 'linux', runType: 'host' },
  { key: 'windows-id', value: '192.0.2.2', assetType: 'windows', runType: 'host' }
]
const Layer = {
  props: ['modelValue', 'title', 'beforeClose', 'showClose'],
  template:
    '<section v-if="modelValue" :aria-label="title"><slot /><slot name="footer" /></section>'
}
const Slot = { template: '<div><slot /></div>' }
const Button = {
  props: ['disabled', 'loading'],
  template: '<button :disabled="disabled || loading"><slot /></button>'
}
const global = {
  directives: { loading() {} },
  stubs: {
    'el-dialog': Layer,
    'el-button': Button,
    'el-form': Slot,
    'el-form-item': Slot,
    'el-tabs': Slot,
    'el-tab-pane': Slot,
    'el-card': { template: '<div><slot name="header" /><slot /></div>' },
    'el-alert': { props: ['title'], template: '<p>{{ title }}</p>' },
    ...Object.fromEntries(
      [
        'el-input',
        'el-select',
        'el-option',
        'el-icon',
        'el-tooltip',
        'el-progress',
        'el-table',
        'el-table-column',
        'el-pagination',
        'el-badge',
        'el-tag',
        'InstanceSelector',
        'GroupSelector',
        'TagSelector',
        'InputFilter',
        'RecentlySelector',
        'ExecuteResultDialog'
      ].map(name => [name, true])
    )
  }
}
let wrapper
const selector = () => wrapper.findComponent(Selector)
const button = (label, within = wrapper) => {
  const found = within
    .findAll('button')
    .find(item => item.text().replace(/\s/g, '') === label.replace(/\s/g, ''))
  if (!found) throw new Error(`Missing button: ${label}`)
  return found
}
const selectHosts = async selection => {
  selector().findComponent({ name: 'InstanceSelector' }).vm.$emit('update:modelValue', selection)
  await flushPromises()
}
async function openPage(label = '连通性检测') {
  wrapper = mount(Page, { global })
  await flushPromises()
  await button(label).trigger('click')
  await flushPromises()
}
async function openSelector(props = {}) {
  wrapper = mount(Selector, {
    props: {
      modelValue: false,
      ...props,
      'onUpdate:modelValue': value => wrapper.setProps({ modelValue: value })
    },
    global
  })
  await wrapper.setProps({ modelValue: true })
  await flushPromises()
}
beforeEach(() => {
  vi.clearAllMocks()
  api.post.mockReset().mockResolvedValue({ data: { status: 'RUNNING', runId: 'run-1' } })
  vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm')
  vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
  vi.spyOn(ElMessage, 'warning').mockImplementation(() => {})
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  vi.restoreAllMocks()
})

describe('选择设备后直接执行资产操作', () => {
  it.each([
    ['连通性检测', '检查连通性', '立即检查连通性', 'M1x855'],
    ['信息数据采集', '采集信息', '立即采集资产数据', 'mjedwe']
  ])('%s 直接打开选择器，最终按钮只提交一次原作业和设备参数', async (label, title, submit, job) => {
    await openPage(label)
    expect(wrapper.findAllComponents(Layer)).toHaveLength(1)
    expect(wrapper.get('section').attributes('aria-label')).toBe(`选择设备 · ${title}`)
    expect(selector().text()).toContain(`点击“${submit}”`)
    expect(button(submit).element.disabled).toBe(true)
    expect(api.post).not.toHaveBeenCalled()
    await selectHosts([hosts[0]])
    expect(api.post).not.toHaveBeenCalled()
    expect(selector().get('.selection-summary').text()).toContain('1 台设备')
    await button(submit).trigger('click')
    await flushPromises()
    expect(ElMessageBox.confirm).not.toHaveBeenCalled()
    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(
        new RegExp(`^/workflow/api/workflow/jobs/${job}/run\\?cacheBuster=\\d+$`)
      ),
      { params: { hosts: [hosts[0]] } }
    )
    expect(selector().props('modelValue')).toBe(false)
    expect(wrapper.findComponent({ name: 'ExecuteResultDialog' }).props()).toMatchObject({
      visible: true,
      runId: 'run-1'
    })
  })

  it.each(['network', 'job'])('%s 失败保留弹窗及选择，重试成功才关闭', async kind => {
    if (kind === 'network') api.post.mockRejectedValueOnce(new Error('offline'))
    else api.post.mockResolvedValueOnce({ data: { status: 'ERROR', error: '启动失败' } })
    await openPage()
    await selectHosts([hosts[0]])
    await button('立即检查连通性').trigger('click')
    await flushPromises()
    expect(selector().props('modelValue')).toBe(true)
    expect(selector().props('submitting')).toBe(false)
    expect(selector().findComponent({ name: 'InstanceSelector' }).props('modelValue')).toEqual([
      hosts[0]
    ])
    expect(ElMessage.error).toHaveBeenCalled()
    await button('立即检查连通性').trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenCalledTimes(2)
    expect(api.post.mock.calls[1][1]).toEqual(api.post.mock.calls[0][1])
    expect(selector().props('modelValue')).toBe(false)
  })

  it('请求未返回时禁止关闭及重复提交，恢复后可以取消', async () => {
    let finish
    api.post.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve
      })
    )
    await openPage()
    await selectHosts([hosts[0]])
    await button('立即检查连通性').trigger('click')
    await flushPromises()
    expect(selector().props('submitting')).toBe(true)
    expect(button('取消', selector()).element.disabled).toBe(true)
    expect(selector().findComponent(Layer).props('showClose')).toBe(false)
    const done = vi.fn()
    selector().findComponent(Layer).props('beforeClose')(done)
    expect(done).not.toHaveBeenCalled()
    selector().vm.$emit('confirm', [hosts[0]])
    expect(api.post).toHaveBeenCalledOnce()
    finish({ data: { status: 'ERROR' } })
    await flushPromises()
    expect(selector().props('submitting')).toBe(false)
    await button('取消', selector()).trigger('click')
    await flushPromises()
    expect(selector().props('modelValue')).toBe(false)
  })

  it('跨设备类型选择后汇总提交，取消后换功能清空旧选择', async () => {
    await openPage()
    await selectHosts([hosts[0]])
    selector().findComponent({ name: 'ElSelect' }).vm.$emit('update:modelValue', 'windows')
    await flushPromises()
    await selectHosts([hosts[1]])
    expect(selector().get('.selection-summary').text()).toContain('2 台设备')
    await button('立即检查连通性').trigger('click')
    await flushPromises()
    expect(api.post.mock.calls[0][1].params.hosts).toEqual(hosts)
    await button('连通性检测').trigger('click')
    await flushPromises()
    await selectHosts([hosts[0]])
    await button('取消', selector()).trigger('click')
    await button('信息数据采集').trigger('click')
    await flushPromises()
    expect(selector().get('.selection-summary').text()).toContain('未选择目标')
    expect(button('立即采集资产数据').element.disabled).toBe(true)
    expect(api.post).toHaveBeenCalledOnce()
  })

  it('检测表格选中设备仍需原确认，取消不发请求且保留勾选', async () => {
    wrapper = mount(Page, { global })
    await flushPromises()
    wrapper
      .findComponent({ name: 'ElTable' })
      .vm.$emit('selection-change', [{ id: 'windows-id', IP: '192.0.2.2', ci_type: 'windows' }])
    await flushPromises()
    ElMessageBox.confirm.mockRejectedValueOnce('cancel')
    await button('检测选中设备（1）').trigger('click')
    await flushPromises()
    expect(ElMessageBox.confirm).toHaveBeenCalledOnce()
    expect(api.post).not.toHaveBeenCalled()
    expect(button('检测选中设备（1）').element.disabled).toBe(false)
    expect(selector().props('modelValue')).toBe(false)
  })
})

describe('通用选择器兼容现有表单', () => {
  it('默认允许确认空选择以清空表单，确认后关闭', async () => {
    await openSelector()
    expect(wrapper.props('title')).toBe('选择设备')
    expect(button('确定').element.disabled).toBe(false)
    await button('确定').trigger('click')
    expect(wrapper.emitted('confirm')).toEqual([[[]]])
    expect(wrapper.props('modelValue')).toBe(false)
  })

  it('直接执行模式即使程序调用也拒绝空选择，提交中拒绝确认及取消', async () => {
    await openSelector({ allowEmpty: false, closeOnConfirm: false })
    const state = wrapper.vm.$.setupState
    state.handleConfirm()
    expect(wrapper.emitted('confirm')).toBeUndefined()
    await wrapper.setProps({ submitting: true })
    state.handleConfirm()
    state.handleCancel()
    expect(wrapper.emitted('confirm')).toBeUndefined()
    expect(wrapper.props('modelValue')).toBe(true)
  })

  it('以已打开状态挂载时初始化原选择，保留原单选规则', async () => {
    wrapper = mount(Selector, {
      props: { modelValue: true, initialSelection: hosts, options: { selector: 'single' } },
      global
    })
    await flushPromises()
    await button('确定').trigger('click')
    expect(wrapper.emitted('confirm')).toEqual([[[hosts[0]]]])
  })
})
