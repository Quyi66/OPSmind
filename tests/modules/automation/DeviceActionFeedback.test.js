import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import {
  formatDeviceSelection,
  summarizeDeviceSelection
} from '@/modules/automation/components/job/schedule/components/deviceSelectionSummary'
import DeviceSelectionSummary from '@/modules/automation/components/job/schedule/components/DeviceSelectionSummary.vue'
import CommandExecutionPreview from '@/modules/automation/components/command/dialogs/CommandExecutionPreview.vue'

const wrappers = []
const open = (component, props) => {
  const wrapper = mount(component, {
    props,
    global: { stubs: { 'el-button': { template: '<button><slot /></button>' } } }
  })
  wrappers.push(wrapper)
  return wrapper
}
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('执行前目标摘要与命令预览', () => {
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
})
