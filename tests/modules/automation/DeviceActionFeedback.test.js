import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import {
  formatDeviceSelection,
  summarizeDeviceSelection
} from '@/modules/automation/components/job/schedule/components/deviceSelectionSummary'
import DeviceSelectionSummary from '@/modules/automation/components/job/schedule/components/DeviceSelectionSummary.vue'
import CommandExecutionPreview from '@/modules/automation/components/command/dialogs/CommandExecutionPreview.vue'
import ExecutionFailureDetails from '@/modules/automation/components/job/JobListView/ExecutionFailureDetails.vue'
import { extractExecutionFailures } from '@/modules/automation/components/job/JobListView/executionFailures'

vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn(), error: vi.fn() } }))
const wrappers = []
const open = (component, props) => {
  const wrapper = mount(component, {
    props,
    global: { stubs: { 'el-button': { template: '<button><slot /></button>' } } }
  })
  wrappers.push(wrapper)
  return wrapper
}
const contents = hosts => [
  { plays: [{ tasks: [{ task: { name: 'Check Windows updates' }, hosts }] }] }
]
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('执行前后反馈', () => {
  it('分开统计设备、分组、标签和其他选择，不将分组成员数累加为设备数', () => {
    const selection = [
      { key: 'host-1', value: '192.0.2.1' },
      { key: 'group-1', value: '生产组', runType: 'group', total_hosts: 300 },
      { key: '#tag-1', value: '标签' },
      { key: 'rule-1', value: '规则', runType: 'future-type' }
    ]
    expect(summarizeDeviceSelection(selection)).toEqual({
      devices: 1,
      groups: 1,
      tags: 1,
      other: 1
    })
    const wrapper = open(DeviceSelectionSummary, { selection, showTargets: true })
    expect(wrapper.text()).toContain('已选 1 台设备、1 个分组、1 个标签、1 项其他选择')
    expect(wrapper.text()).toContain('按执行时的成员展开')
    expect(wrapper.findAll('li').map(item => item.text())).toEqual([
      '192.0.2.1',
      '生产组',
      '标签',
      '规则'
    ])
    expect(formatDeviceSelection([])).toBe('未选择目标')
  })

  it('命令预览展示真正执行的 command 字段，长命令可展开，缺失内容明确提示', () => {
    const longCommand = 'echo "$HOME"\n'.repeat(30)
    const wrapper = open(CommandExecutionPreview, {
      commands: [
        { id: 'a', name: '查看用户', command: 'whoami', unapprovedCommand: 'do-not-preview' },
        { id: 'b', name: '长命令', command: longCommand },
        { id: 'c', name: '缺失内容' }
      ]
    })
    expect(wrapper.findAll('pre')[0].text()).toBe('whoami')
    expect(wrapper.find('details pre').element.textContent).toBe(longCommand)
    expect(wrapper.find('details').attributes('open')).toBeUndefined()
    expect(wrapper.text()).toContain('未提供命令内容')
    expect(wrapper.text()).not.toContain('do-not-preview')
  })

  it('未知错误逐字保留，明确展示失败主机、执行步骤，可复制全部字段', async () => {
    const message = 'Transport error: opaque-code-Z9\n  backend detail <script>unsafe()</script>'
    const host = {
      hostKey: '192.0.2.93',
      unreachable: true,
      msg: message,
      rc: 7,
      stderr: 'second detail'
    }
    const rawError = '{"error":"backend private format", "details":"原文"}\n'
    const writeText = vi.fn().mockResolvedValue()
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const wrapper = open(ExecutionFailureDetails, {
      error: rawError,
      contents: contents([host]),
      hasLog: true
    })
    expect(wrapper.get('.failure-message').element.textContent).toBe(message)
    expect(wrapper.text()).toContain('192.0.2.93 · 不可达')
    expect(wrapper.text()).toContain('执行步骤：Check Windows updates')
    expect(wrapper.get('.raw-task-error pre').element.textContent).toBe(rawError)
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('防火墙')
    expect(wrapper.text()).not.toContain('密码错误')
    await wrapper
      .findAll('button')
      .find(item => item.text() === '复制原始错误')
      .trigger('click')
    expect(writeText).toHaveBeenCalledExactlyOnceWith(JSON.stringify(host, null, 2))
    await wrapper
      .findAll('button')
      .find(item => item.text() === '查看完整日志')
      .trigger('click')
    expect(wrapper.emitted('view-log')).toHaveLength(1)
  })

  it('没有失败标记的普通输出不会被判断为失败，字符串零退出码也不误判', () => {
    expect(
      extractExecutionFailures(
        contents([
          { hostKey: 'a', msg: 'failed to parse optional metadata', rc: '0' },
          { hostKey: 'b', stdout: 'diagnostic: error', rc: null },
          { hostKey: 'c', rc: 2, stderr: 'raw stderr' }
        ])
      ).map(item => item.host)
    ).toEqual(['c'])
  })

  it('剪贴板不可用时保留原文并明确提示手动复制', async () => {
    vi.stubGlobal('navigator', {})
    const wrapper = open(ExecutionFailureDetails, { error: 'raw error' })
    await wrapper.get('button').trigger('click')
    expect(ElMessage.error).toHaveBeenCalledWith('复制失败，请选中原文手动复制')
    expect(wrapper.get('pre').text()).toBe('raw error')
  })
})
