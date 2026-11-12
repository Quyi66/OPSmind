import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import JobUpgradeOverview from '@/modules/automation/components/job/JobListView/JobUpgradeOverview.vue'
import {
  JOB_HISTORY_STATUS_OPTIONS,
  JOB_STATUS_LABELS,
  JOB_STATUS_TAG_TYPES
} from '@/modules/automation/constants/jobStatus'

const api = vi.hoisted(() => ({ result: vi.fn(), channels: vi.fn() }))
vi.mock('@/modules/automation/api/jao', () => ({ getExecuteResult: api.result }))
vi.mock('@/modules/asset/api', () => ({
  AGENT_ERROR_MESSAGES: { AGENT_OFFLINE: 'Agent 当前离线，请检查服务和网络后重试' },
  agentApi: { getHostAgentInfo: api.channels }
}))
vi.mock('@/core/auth', () => ({ authService: { getAuthHeaders: () => ({}) } }))
vi.mock('@/utils/i18n', () => ({ translateText: value => value || '' }))

const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const stubs = {
  ElDialog: {
    props: ['modelValue', 'title'],
    template: '<section><h1>{{ title }}</h1><slot /></section>'
  },
  ElTabs: Slot,
  ElTabPane: { props: ['label'], template: '<article><h2>{{ label }}</h2><slot /></article>' },
  ElScrollbar: Slot,
  ElTag: Slot,
  ElForm: Slot,
  ElFormItem: Slot,
  ElInput: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  },
  ElSelect: Slot,
  ElOption: true,
  ElTable: Slot,
  ElTableColumn: true,
  ElPagination: true,
  ElButton: Slot,
  ElDropdown: Slot,
  ElDropdownMenu: Slot,
  ElDropdownItem: Slot,
  ElEmpty: true,
  ElAlert: true,
  ElTree: { props: ['data'], methods: { filter() {}, setCurrentKey() {} }, template: '<div />' },
  AnsibleLogViewer: true,
  JobUpgradeOverview: true
}
// Override the kebab-case defaults installed by the shared test setup too.
Object.entries(stubs).forEach(([name, stub]) => {
  stubs[name.replace(/[A-Z]/g, (letter, index) => `${index ? '-' : ''}${letter.toLowerCase()}`)] =
    stub
})
const wrappers = []
const state = wrapper => wrapper.vm.$.setupState
const rawOutput = '后端中文 stdout #{not-a-key} {{value}} <tag>'
const contents = {
  plays: [
    {
      play: { name: '后端剧本' },
      tasks: [
        {
          task: { name: '后端任务：核对配置' },
          hosts: [
            { hostKey: '主机甲', ok: true, stdout: rawOutput },
            { hostKey: '主机乙', failed: true, msg: '后端错误原文' }
          ]
        },
        {
          task: {},
          hosts: [
            {
              hostKey: '主机乙',
              ok: true,
              stdout: '第二段中文',
              ansible_facts: {
                update_full_info: [{ patch_id: 'KB-中文' }],
                target_nvr_pkgs: ['包名-1']
              }
            }
          ]
        }
      ]
    }
  ]
}
function body(status = 'COMPLETED') {
  return Object.freeze({
    status,
    jobType: 'command',
    job_id: 'M1x855',
    username: '原始用户名',
    connectionType: 'ssh',
    data: Object.freeze([
      Object.freeze({ output: JSON.stringify(contents), executorUrl: '原始执行节点' })
    ])
  })
}
async function open(status = 'COMPLETED') {
  api.result.mockResolvedValue({ data: body(status) })
  const wrapper = mount(ExecuteResultDialog, {
    props: {
      visible: true,
      runId: 'real-run-17',
      jobId: 'M1x855',
      jobTitle: '【ACM】设备连通性检测'
    },
    global: { stubs, directives: { loading: () => {} } }
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}
beforeEach(async () => {
  api.result.mockReset()
  api.channels.mockReset()
  await setLocale('en-US', { persist: false })
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.useRealTimers()
  await setLocale('zh-CN', { persist: false })
})

describe('execution result language changes preserve operational context', () => {
  it('updates UI and fallback names without rebuilding host rows, clearing filters or refetching results', async () => {
    const wrapper = await open(),
      vm = state(wrapper)
    vm.activeTab = 'hosts'
    await flushPromises()
    vm.handleTreeNodeClick(vm.ansibleTreeData[0].children[0].children[1])
    vm.hostTaskSearch = '后端任务'
    vm.hostStatusFilter = 'failed'
    vm.hostFilterText = '主机乙'
    vm.activeTab = 'list'
    await flushPromises()
    vm.selectedHostFilter = '主机乙'
    vm.listKeyword = '后端'
    vm.listPageSize = 1
    await flushPromises()
    vm.listCurrentPage = 2
    vm.treeExpandAll = false
    vm.showFullRawOutput = true
    const tree = vm.ansibleTreeData,
      rows = vm.ansibleHostRows,
      selected = vm.selectedHost,
      result = vm.result,
      raw = vm.ansibleRawOutput
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.find('h1').text()).toBe('Operations tool results · Device connectivity check')
    expect(wrapper.text()).toContain('By host')
    expect(vm.ansibleTreeData).toBe(tree)
    expect(vm.ansibleHostRows).toBe(rows)
    expect(vm.selectedHost).toBe(selected)
    expect(vm.result).toBe(result)
    expect(vm.ansibleRawOutput).toBe(raw)
    expect(raw).toContain(rawOutput)
    expect(vm.hostTaskSearch).toBe('后端任务')
    expect(vm.hostStatusFilter).toBe('failed')
    expect(vm.hostFilterText).toBe('主机乙')
    expect(vm.selectedHostFilter).toBe('主机乙')
    expect(vm.listKeyword).toBe('后端')
    expect(vm.activeTab).toBe('list')
    expect(vm.listCurrentPage).toBe(2)
    expect(vm.treeExpandAll).toBe(false)
    expect(vm.showFullRawOutput).toBe(true)
    expect(vm.taskTitle(selected.tasks[1])).toBe('Task 2')
    expect(vm.taskTitle(selected.tasks[0])).toBe('后端任务：核对配置')
    expect(api.result).toHaveBeenCalledExactlyOnceWith('real-run-17')
    expect(api.channels).not.toHaveBeenCalled()
    await setLocale('zh-CN', { persist: false })
    await flushPromises()
    expect(vm.taskTitle(selected.tasks[1])).toBe('任务 2')
    expect(vm.listCurrentPage).toBe(2)
  })
  it('keeps polling the same run on the same schedule while translating active-state text', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const wrapper = await open('RUNNING'),
      vm = state(wrapper)
    const timer = vm.pollTimer
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.pollTimer).toBe(timer)
    expect(api.result).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Task is running. Data refreshes every 3 seconds.')
    await vi.advanceTimersByTimeAsync(3000)
    expect(api.result).toHaveBeenCalledTimes(2)
    expect(api.result.mock.calls.every(([id]) => id === 'real-run-17')).toBe(true)
  })
  it('translates local error templates and coded Agent explanations, retaining backend error text', async () => {
    const wrapper = await open(),
      vm = state(wrapper)
    const error = `${JSON.stringify({
      msg_id: 'app_secops.log.exec_script_fail',
      msg_info: JSON.stringify(contents)
    })}\n${JSON.stringify({ FailedTask: 2 })}`
    const raw = body('FAILED')
    vm.result = { ...raw, error }
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.summary.errorTitle).toBe('Execution failed (2 tasks failed)')
    expect(vm.summary.errorList).toContain('Script execution failed')
    expect(vm.summary.errorList.join('\n')).toContain('后端错误原文')
    expect(vm.translateAgentErrorText('AGENT_OFFLINE 原始中文原因')).toContain('原始中文原因')
    expect(vm.translateAgentErrorText('AGENT_OFFLINE')).toBe(
      'The Agent is offline. Check its service and network, then retry.'
    )
    expect(vm.result.error).toBe(error)
    await wrapper.setProps({ jobTitle: '自定义中文名称', jobId: 'custom' })
    expect(wrapper.find('h1').text()).toBe('Operations tool results · 自定义中文名称')
  })
  it('updates upgrade overview labels while preserving aggregation, lazy host rendering and raw names', async () => {
    const wrapper = mount(JobUpgradeOverview, {
      props: { ansibleContents: [contents] },
      global: { stubs: { ElTag: Slot } }
    })
    wrappers.push(wrapper)
    const vm = state(wrapper),
      info = vm.patchOverviewInfo
    vm.hostRenderLimit = 1
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.text()).toContain('Updated patches (1)')
    expect(wrapper.text()).toContain('Updated packages (1)')
    expect(wrapper.text()).toContain('Target hosts (2)')
    expect(vm.patchOverviewInfo).toBe(info)
    expect(vm.hostRenderLimit).toBe(1)
    expect(info.patches).toEqual(['KB-中文'])
    expect(info.packages).toEqual(['包名-1'])
  })
  it('keeps status and option values stable while translating their display labels', async () => {
    const values = JOB_HISTORY_STATUS_OPTIONS.map(option => option.value)
    await setLocale('en-US', { persist: false })
    expect(JOB_STATUS_LABELS.COMPLETED).toBe('Completed')
    expect(JOB_STATUS_TAG_TYPES.FAILED).toBe('danger')
    expect(JOB_HISTORY_STATUS_OPTIONS.map(option => option.value)).toEqual(values)
    expect(JOB_HISTORY_STATUS_OPTIONS[0].label).toBe('All')
    await setLocale('zh-CN', { persist: false })
    expect(JOB_STATUS_LABELS.COMPLETED).toBe('完成')
  })
})
