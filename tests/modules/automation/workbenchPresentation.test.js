import { describe, expect, it } from 'vitest'
import {
  formatRunDuration,
  getRunHostStats,
  getRunNodes,
  getWorkbenchCardLayout,
  getWorkbenchJobType,
  getWorkbenchJobDate,
  formatWorkbenchJobDate,
  selectWorkbenchJobs
} from '@/modules/automation/utils/workbenchPresentation'

describe('自动化工作台业务数据展示', () => {
  it('优先识别运行记录的 job_type，并支持调度任务类型及未知类型', () => {
    expect(getWorkbenchJobType({ job_type: 'SCRIPT', type: 'rest' }).label).toBe('脚本运维工具')
    expect(getWorkbenchJobType({ jobType: 'audit' }).label).toBe('巡检任务')
    expect(getWorkbenchJobType({}).label).toBe('类型未知')
    expect(getWorkbenchJobType({ type: 'custom' }).label).toBe('custom')
  })

  it('展示真实的零和独立上报的主机统计，不将缺失值补零或修正不一致的统计', () => {
    expect(
      getRunHostStats(
        '{"totalHosts":100,"okHosts":101,"failedHosts":100,"unreachableHosts":0}'
      ).map(item => item.count)
    ).toEqual([100, 101, 100, 0])
    expect(
      getRunHostStats({ totalHosts: '2', okHosts: 0, failedHosts: null }).map(item => item.count)
    ).toEqual([2, 0])
    for (const input of [
      undefined,
      'bad json',
      [],
      { totalHosts: true, okHosts: '', failedHosts: -1 }
    ]) {
      expect(getRunHostStats(input)).toEqual([])
    }
  })

  it('使用当前接口的执行节点字段，并兼容旧 ata_url 字段', () => {
    expect(getRunNodes({ executor_url: ' 10.0.0.1,10.0.0.2, ', ata_url: 'old' })).toEqual([
      '10.0.0.1',
      '10.0.0.2'
    ])
    expect(getRunNodes({ ata_url: '10.0.0.3' })).toEqual(['10.0.0.3'])
    expect(getRunNodes({})).toEqual([])
  })

  it('耗时区分零秒、运行中、缺失及无效时间顺序', () => {
    const start = '2026-10-15T01:00:00Z'
    expect(formatRunDuration({ start_time: start, end_time: start })).toBe('0秒')
    expect(formatRunDuration({ start_time: start, end_time: '2026-10-15T01:01:05Z' })).toBe(
      '1分 5秒'
    )
    expect(formatRunDuration({ start_time: start, status: 'RUNNING' })).toBe('进行中')
    expect(formatRunDuration({ start_time: start, end_time: '2026-10-14T01:00:00Z' })).toBe('—')
    expect(formatRunDuration({})).toBe('—')
  })

  it('按实际容器容量增加完整行，同时保证窄屏和低高度下的内容下限', () => {
    expect(getWorkbenchCardLayout(1380, 600)).toMatchObject({ columns: 5, rows: 4, limit: 20 })
    expect(getWorkbenchCardLayout(1380, 900)).toMatchObject({ columns: 5, rows: 6, limit: 30 })
    expect(getWorkbenchCardLayout(200, 100)).toMatchObject({ columns: 1, rows: 1, limit: 1 })
    expect(getWorkbenchCardLayout(0, 0).limit).toBe(0)
    for (let height = 112; height < 1400; height++) {
      const layout = getWorkbenchCardLayout(1100, height)
      expect((height - (layout.rows - 1) * layout.gap) / layout.rows).toBeGreaterThanOrEqual(
        layout.minHeight - 1e-6
      )
    }
  })

  it('类型筛选先于容量截取，排序不改变接口数据和同一时间下的原有顺序', () => {
    const rows = [
      { id: 'old', type: 'script', updatedAt: '2025-07-08T12:00:00Z' },
      { id: 'rest', type: 'rest', updatedAt: '2026-10-15T12:00:00Z' },
      { id: 'command-a', type: 'command', updatedAt: '2026-10-14T12:00:00Z' },
      { id: 'command-b', type: 'command', updatedAt: '2026-10-14T12:00:00Z' },
      { id: 'unknown', type: 'command' }
    ]
    expect(selectWorkbenchJobs(rows, 'command').map(row => row.id)).toEqual([
      'command-a',
      'command-b',
      'unknown'
    ])
    expect(selectWorkbenchJobs(rows).map(row => row.id)).toEqual([
      'rest',
      'command-a',
      'command-b',
      'old',
      'unknown'
    ])
    expect(selectWorkbenchJobs(rows, 'process')).toEqual([])
    expect(rows.map(row => row.id)).toEqual(['old', 'rest', 'command-a', 'command-b', 'unknown'])
  })

  it('无效更新时间回退到创建时间，支持毫秒时间戳字符串，不将缺失时间当成 1970 年', () => {
    const createdAt = new Date(2026, 9, 15, 12, 0)
    expect(getWorkbenchJobDate({ updatedAt: 'N/A', createdAt })).toEqual({
      timestamp: createdAt.getTime(),
      source: '创建'
    })
    expect(getWorkbenchJobDate({ updatedAt: String(createdAt.getTime()) }).timestamp).toBe(
      createdAt.getTime()
    )
    expect(getWorkbenchJobDate({ updatedAt: false, createdAt: ' ' })).toEqual({
      timestamp: null,
      source: ''
    })
  })

  it('跨年日期展示年份，并使用与排序一致的有效时间和来源', () => {
    const now = new Date(2026, 9, 15)
    expect(formatWorkbenchJobDate({ updatedAt: new Date(2025, 6, 8, 14, 2) }, now)).toEqual({
      label: '更新 2025-07-08 14:02',
      title: '更新时间：2025-07-08 14:02:00'
    })
    expect(
      formatWorkbenchJobDate({ updatedAt: 'invalid', createdAt: new Date(2026, 9, 1, 9, 5) }, now)
        .label
    ).toBe('创建 10-01 09:05')
    expect(formatWorkbenchJobDate({}, now).label).toBe('时间未提供')
  })
})
