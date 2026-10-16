import { describe, expect, it, vi } from 'vitest'
import {
  getAutomationToolTitle,
  getAutomationExecutionPresentation,
  getAutomationRunTitle
} from '@/modules/automation/utils/resourcePresentation'

vi.mock('@/utils/i18n', () => ({ translateText: value => value || '' }))

describe('资源名称只影响展示', () => {
  it.each([
    ['3TRE7d', '【ACM】更新已纳管设备信息', '更新已纳管设备信息'],
    ['eGfsxb', '【ACM】设备纳管', '设备纳管'],
    ['c7WN62', '【ACM】 保存ansible配置信息', '保存 Ansible 配置信息'],
    ['0MKtcJ', '【ACM】主机录入', '主机录入']
  ])('只清理已由旧页面及固定调用核实的资源 %s', (id, title, label) => {
    expect(getAutomationToolTitle({ id, title })).toBe(label)
    expect(getAutomationToolTitle({ id, title: '【ACM】用户自定义名称' })).toBe('【ACM】用户自定义名称')
    expect(getAutomationToolTitle({ id: 'custom', title })).toBe(title)
  })
  it('执行回调保留工具身份和原始名称，展示别名不覆盖真实参数', () => {
    const payload = Object.freeze({ runId: 'run-1', jobId: 'M1x855', jobTitle: '【ACM】设备连通性检测' })
    expect(getAutomationExecutionPresentation(payload)).toEqual({
      jobId: 'M1x855', rawJobTitle: payload.jobTitle, jobTitle: '设备连通性检测'
    })
    expect(getAutomationExecutionPresentation({ ...payload, jobId: 'custom' }).jobTitle).toBe(payload.jobTitle)
    expect(getAutomationExecutionPresentation({ ...payload, jobTitle: '自定义检测' }).jobTitle).toBe('自定义检测')
    expect(getAutomationExecutionPresentation({}, { id: 'M1x855', title: '设备连通性检测' }).jobTitle).toBe('设备连通性检测')
  })
  it('只给已确认 ID 和原名称同时匹配的内置工具使用业务名称', () => {
    const record = Object.freeze({
      id: 'M1x855',
      title: '【ACM】设备连通性检测',
      appletCode: 'acm'
    })
    expect(getAutomationToolTitle(record)).toBe('设备连通性检测')
    expect(record.title).toBe('【ACM】设备连通性检测')
    expect(record.appletCode).toBe('acm')
    expect(getAutomationToolTitle({ ...record, id: 'custom-tool' })).toBe(record.title)
    expect(getAutomationToolTitle({ ...record, title: '自定义连通性检查' })).toBe(
      '自定义连通性检查'
    )
    expect(getAutomationToolTitle({ id: 'unconfirmed', title: '【JAO】自定义工具' })).toBe(
      '【JAO】自定义工具'
    )
  })

  it('运行记录使用工具标识匹配，不能使用运行标识误匹配', () => {
    expect(
      getAutomationRunTitle({ id: 'run-1', job_id: '0g3GfW', job_title: '【VAP2】 补丁扫描' })
    ).toBe('补丁扫描')
    expect(
      getAutomationRunTitle({ id: 'M1x855', job_id: 'custom', job_title: '【ACM】设备连通性检测' })
    ).toBe('【ACM】设备连通性检测')
  })

  it('脚本运行显示文件名，保留记录中的真实路径，未命名资源不回退内部 ID', () => {
    const record = Object.freeze({ job_title: '[script]/sjxy/secops/check.yml' })
    expect(getAutomationRunTitle(record)).toBe('脚本执行：check.yml')
    expect(record.job_title).toBe('[script]/sjxy/secops/check.yml')
    expect(getAutomationToolTitle({ id: 'internal-id' })).toBe('未命名运维工具')
  })
})
