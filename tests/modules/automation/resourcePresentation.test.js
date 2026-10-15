import { describe, expect, it, vi } from 'vitest'
import {
  getAutomationToolTitle,
  getAutomationRunTitle
} from '@/modules/automation/utils/resourcePresentation'

vi.mock('@/utils/i18n', () => ({ translateText: value => value || '' }))

describe('资源名称只影响展示', () => {
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
