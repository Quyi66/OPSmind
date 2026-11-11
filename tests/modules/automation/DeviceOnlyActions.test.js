import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { ElMessage, ElMessageBox } from 'element-plus'
import Selector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelectorDialog.vue'
import BaseHost from '@/modules/software/components/repo/SelectBaseHostDialog.vue'
import ConfigRepo from '@/modules/software/components/repo/ConfigRepoToHostDialog.vue'
import SoftwareHosts from '@/modules/software/components/overview/HostOverviewTable.vue'
import UserScan from '@/modules/user/components/dialogs/ScanHostDialog.vue'
import SudoScan from '@/modules/sudo/components/permission/ScanHostsDialog.vue'
import WindowsScan from '@/modules/patches/windows-patch/components/overview/WinPatchScanDialog.vue'
import RunCommand from '@/modules/automation/components/command/dialogs/RunCommandDialog.vue'

const api = vi.hoisted(() => ({
  base: vi.fn(),
  repo: vi.fn(),
  software: vi.fn(),
  user: vi.fn(),
  sudo: vi.fn(),
  windows: vi.fn(),
  command: vi.fn(),
  save: vi.fn(),
  track: vi.fn(),
  start: vi.fn(),
  stop: vi.fn()
}))
const scanCompletion = vi.hoisted(() => ({ notify: null }))
vi.mock('@/modules/patches/composables/usePatchScanCompletion', () => ({
  usePatchScanCompletion: notify => {
    scanCompletion.notify = notify
    return { trackScan: api.track }
  }
}))
vi.mock('@/modules/software/api', () => ({
  repoApi: { setBaseRepoHosts: api.base, configRepoToHosts: api.repo },
  softwareScanApi: { scan: api.software },
  hostOverviewApi: { getList: vi.fn().mockResolvedValue({ data: { records: [], total: 0 } }) }
}))
vi.mock('@/modules/sudo/api', () => ({ scanSudoHosts: api.sudo }))
vi.mock('@/modules/patches/windows-patch/api', () => ({
  winPatchApi: { createScanTask: api.windows }
}))
vi.mock('@/modules/automation/api/command', () => ({
  runJobByRequest: api.command,
  saveJob: api.save
}))
vi.mock('@/core/api', () => ({ apiService: { post: api.user } }))
vi.mock('@/composables/useJobPolling', () => ({
  useJobPolling: () => ({ startPolling: api.start, stopPolling: api.stop })
}))

const hosts = [
  {
    key: 'host/real-id',
    value: '192.0.2.17',
    assetType: 'linux',
    runType: 'group',
    total_hosts: 3
  }
]
const commands = [{ id: 'command/real-id', name: '查看负载' }]
const cases = [
  { name: '基准仓库主机', component: BaseHost, call: api.base, expected: { hosts } },
  {
    name: '自定义仓库配置',
    component: ConfigRepo,
    call: api.repo,
    props: { selectedRepos: [{ id: 'repo/config-A' }, { id: 'repo/config-B' }] },
    expected: { hosts, repoConfigIds: 'repo/config-A,repo/config-B', repoIds: null }
  },
  {
    name: '基准仓库配置',
    component: ConfigRepo,
    call: api.repo,
    props: { repoType: 'base', selectedRepos: [{ refid: 'base/A' }, { repo_id: 'base/B' }] },
    expected: { hosts, repoConfigIds: null, repoIds: 'base/A,base/B' }
  },
  {
    name: '软件包扫描',
    component: SoftwareHosts,
    call: api.software,
    expected: { hosts },
    open: state => state.handleRescan(),
    tracking: true
  },
  { name: 'sudo 扫描', component: SudoScan, call: api.sudo, expected: { hosts }, polling: true },
  {
    name: 'Windows 补丁扫描',
    component: WindowsScan,
    call: api.windows,
    expected: ['host/real-id']
  },
  {
    name: '主机用户扫描',
    component: UserScan,
    call: api.user,
    visibleProp: 'visible',
    expected: { params: { hosts } },
    polling: true,
    preventRetry: true
  },
  {
    name: '直接执行命令',
    component: RunCommand,
    call: api.command,
    visibleProp: 'visible',
    props: { command: commands },
    expected: {
      type: 'command',
      configJson: JSON.stringify({ tasks: [{ commands: [{ id: 'command/real-id' }], hosts }] }),
      options: { secretParams: [], params: {} }
    }
  }
]
const stubs = Object.fromEntries(
  [
    'ElDialog',
    'ElForm',
    'ElFormItem',
    'ElButton',
    'ElAlert',
    'ElInput',
    'ElSelect',
    'ElOption',
    'ElIcon',
    'ElTable',
    'ElTableColumn',
    'ElPagination',
    'ElTag',
    'ElTooltip',
    'ElProgress'
  ].map(name => [name, true])
)
let wrapper
const selector = () => wrapper.findComponent(Selector)
const state = () => wrapper.vm.$.setupState
async function open(testCase, props = {}) {
  const visibleProp = testCase.visibleProp || 'modelValue'
  wrapper = shallowMount(testCase.component, {
    props: {
      [visibleProp]: false,
      ...testCase.props,
      ...props,
      [`onUpdate:${visibleProp}`]: value => wrapper.setProps({ [visibleProp]: value })
    },
    global: {
      stubs: {
        ...stubs,
        'el-dialog': {
          props: ['modelValue'],
          template: '<section v-if="modelValue"><slot /></section>'
        },
        'el-form': { template: '<form><slot /></form>' },
        'el-form-item': { template: '<div><slot /></div>' }
      },
      directives: { loading() {} }
    }
  })
  if (testCase.open) testCase.open(state())
  else await wrapper.setProps({ [visibleProp]: true })
  await flushPromises()
}
beforeEach(() => {
  vi.clearAllMocks()
  for (const mock of Object.values(api)) mock.mockReset()
  for (const key of ['base', 'repo', 'software', 'user', 'sudo', 'windows', 'command', 'save']) {
    api[key].mockResolvedValue({ data: [{ status: 'RUNNING', runId: 'run/real-id' }] })
  }
  api.windows.mockResolvedValue({ data: { status: 'RUNNING', runId: 'run/real-id' } })
  vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
  vi.spyOn(ElMessage, 'warning').mockImplementation(() => {})
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
  vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  vi.restoreAllMocks()
})

describe.each(cases)('$name直接选择后执行', testCase => {
  it('打开即显示选择器，确认才调用原接口及参数，无额外确认弹窗', async () => {
    await open(testCase)
    expect(selector().props()).toMatchObject({
      modelValue: true,
      allowEmpty: false,
      closeOnConfirm: false
    })
    expect(testCase.call).not.toHaveBeenCalled()
    selector().vm.$emit('confirm', hosts)
    await flushPromises()
    const args = testCase.call.mock.calls[0]
    if (testCase.preventRetry) {
      expect(args[0]).toMatch(/^\/workflow\/api\/workflow\/jobs\/hTzJfM\/run\?cacheBuster=\d+$/)
      expect(args[1]).toEqual(testCase.expected)
    } else expect(args).toEqual([testCase.expected])
    expect(testCase.call).toHaveBeenCalledOnce()
    expect(ElMessageBox.confirm).not.toHaveBeenCalled()
    if (testCase.polling) {
      expect(api.start.mock.calls[0][0]).toBe('run/real-id')
    }
    if (testCase.tracking) {
      expect(api.track).toHaveBeenCalledExactlyOnceWith('run/real-id')
      expect(selector().props('submitting')).toBe(false)
    }
    if (testCase.name === '直接执行命令') {
      expect(selector().props('description')).toContain('查看负载')
      expect(api.save).not.toHaveBeenCalled()
    }
  })

  it('请求未返回时不重复下发，失败保留窗口；用户扫描保留原结果未知机制', async () => {
    let reject
    testCase.call.mockReturnValueOnce(
      new Promise((_resolve, no) => {
        reject = no
      })
    )
    await open(testCase)
    selector().vm.$emit('confirm', hosts)
    selector().vm.$emit('confirm', hosts)
    await flushPromises()
    expect(testCase.call).toHaveBeenCalledOnce()
    reject(new Error('request failed'))
    await flushPromises()
    if (testCase.preventRetry) {
      expect(state().attempted).toBe(true)
      expect(state().taskMessage).toContain('结果尚未确定')
      expect(state().selectedHosts).toEqual(hosts)
    } else {
      expect(selector().props('modelValue')).toBe(true)
      expect(selector().props('submitting')).toBe(false)
      selector().vm.$emit('confirm', hosts)
      await flushPromises()
      expect(testCase.call).toHaveBeenCalledTimes(2)
    }
  })

  it('取消不发请求，再打开从空选择开始', async () => {
    await open(testCase)
    selector().vm.$emit('update:modelValue', false)
    await flushPromises()
    expect(selector().props('modelValue')).toBe(false)
    if (testCase.open) testCase.open(state())
    else await wrapper.setProps({ [testCase.visibleProp || 'modelValue']: true })
    await flushPromises()
    expect(selector().props('modelValue')).toBe(true)
    expect(selector().props('initialSelection')).toEqual([])
    expect(testCase.call).not.toHaveBeenCalled()
  })
})

describe('保留预选主机、结果刷新与多参数模式', () => {
  it('Windows 请求返回即关闭选择器并解除加载，结果可关闭，后台完成仍通知刷新', async () => {
    await open(
      cases.find(item => item.component === WindowsScan),
      {
        preselectedHosts: [{ hostId: 'windows/real-id', hostKey: '192.0.2.99' }]
      }
    )
    expect(selector().props('initialSelection')).toEqual([
      { key: 'windows/real-id', value: '192.0.2.99', assetType: 'windows' }
    ])
    selector().vm.$emit('confirm', selector().props('initialSelection'))
    await flushPromises()
    expect(api.windows).toHaveBeenCalledExactlyOnceWith(['windows/real-id'])
    expect(selector().props('modelValue')).toBe(false)
    expect(selector().props('submitting')).toBe(false)
    expect(api.start).not.toHaveBeenCalled()
    expect(api.track).toHaveBeenCalledExactlyOnceWith('run/real-id')
    const result = wrapper.findComponent({ name: 'ExecuteResultDialog' })
    expect(result.props()).toMatchObject({ visible: true, runId: 'run/real-id' })
    result.vm.$emit('update:visible', false)
    await flushPromises()
    expect(wrapper.findComponent({ name: 'ExecuteResultDialog' }).exists()).toBe(false)
    scanCompletion.notify()
    expect(wrapper.emitted('completed')).toEqual([[]])
    expect(wrapper.emitted('submitted')[0][0]).toMatchObject({ refreshOverview: true })
  })

  it.each([
    { data: { status: 'ERROR', error: '扫描启动失败' } },
    { data: [{ status: 'FAILED', error: '扫描启动失败' }] }
  ])('Windows 明确启动失败留在选择器中供重试 %j', async response => {
    api.windows.mockResolvedValueOnce(response)
    await open(cases.find(item => item.component === WindowsScan))
    selector().vm.$emit('confirm', hosts)
    await flushPromises()
    expect(selector().props()).toMatchObject({ modelValue: true, submitting: false })
    expect(wrapper.emitted('submitted')).toBeUndefined()
    expect(api.track).not.toHaveBeenCalled()
    expect(ElMessage.error).toHaveBeenCalledWith('扫描启动失败')
  })

  it('sudo 扫描成功仍发 completed，失败仍展示结果', async () => {
    await open(cases.find(item => item.component === SudoScan))
    selector().vm.$emit('confirm', hosts)
    await flushPromises()
    expect(selector().props('modelValue')).toBe(false)
    api.start.mock.calls[0][1].onSuccess({ status: 'SUCCESS' })
    await flushPromises()
    expect(wrapper.emitted('completed')).toEqual([[]])
    expect(state().jobStatus).toBe('COMPLETED')
  })

  it('sudo 提交成功后不把后台执行当成提交中，进度窗口可以关闭', async () => {
    await open(cases.find(item => item.component === SudoScan))
    selector().vm.$emit('confirm', hosts)
    await flushPromises()
    expect(state().jobStatus).toBe('RUNNING')
    expect(state().submitting).toBe(false)
    state().handleClose()
    await flushPromises()
    expect(wrapper.props('modelValue')).toBe(false)
    expect(api.stop).toHaveBeenCalled()
  })

  it('仓库业务失败保留选择器，不误发成功事件', async () => {
    api.repo.mockResolvedValueOnce({ data: [{ status: 'ERROR', error: '配置失败原因' }] })
    await open(cases[1])
    selector().vm.$emit('confirm', hosts)
    await flushPromises()
    expect(selector().props('modelValue')).toBe(true)
    expect(wrapper.emitted('success')).toBeUndefined()
    expect(ElMessage.error).toHaveBeenCalledWith('配置失败原因')
  })

  it('创建命令运维工具仍保留标题、描述及表单设备选择，不自动执行', async () => {
    await open(
      cases.find(item => item.component === RunCommand),
      { mode: 'createJob' }
    )
    expect(selector().exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'AcmDeviceSelector' }).exists()).toBe(true)
    expect(state().formData.title).toBe('查看负载 运维工具')
    expect(api.command).not.toHaveBeenCalled()
    expect(api.save).not.toHaveBeenCalled()
  })

  it('仓库配置上下文同时显示仓库名称和当前选择的目标类型，不自动下发', () => {
    wrapper = mount(ConfigRepo, {
      props: {
        modelValue: true,
        selectedRepos: [
          { id: 'repo/A', repo_name: '仓库 A' },
          { id: 'repo/B', repo_name: '仓库 B' }
        ]
      },
      global: {
        stubs: {
          AcmDeviceSelectorDialog: {
            data: () => ({ selection: hosts }),
            template: '<div><slot name="context" :selection="selection" /></div>'
          }
        }
      }
    })
    expect(wrapper.text()).toContain('仓库 A')
    expect(wrapper.text()).toContain('仓库 B')
    expect(wrapper.text()).toContain('已选 1 个分组')
    expect(wrapper.text()).not.toContain('3 台设备')
    expect(api.repo).not.toHaveBeenCalled()
  })
})
