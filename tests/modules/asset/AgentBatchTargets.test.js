import { describe, expect, it } from 'vitest'
import {
  BATCH_MAX_TARGETS,
  countTargetText,
  hasAgentManagePermission,
  parseBatchTargetRows
} from '@/modules/asset/utils/agentBatch'

describe('countTargetText', () => {
  it('统计单个 IP、范围与 CIDR，支持多种分隔符', () => {
    expect(countTargetText('10.0.0.5')).toBe(1)
    expect(countTargetText('10.0.0.10-20')).toBe(11)
    expect(countTargetText('10.0.0.10-10.0.0.20')).toBe(11)
    expect(countTargetText('10.0.0.0/28')).toBe(16)
    expect(countTargetText('10.0.0.1, 10.0.0.2\n10.0.0.3 10.0.0.4;10.0.0.5')).toBe(5)
    expect(countTargetText('')).toBe(0)
  })

  it('/20 约 4096 台，超过单批上限', () => {
    expect(countTargetText('10.0.0.0/20')).toBeGreaterThan(BATCH_MAX_TARGETS)
  })

  it('不合法片段按 1 台计，交由后端校验', () => {
    expect(countTargetText('abc')).toBe(1)
    expect(countTargetText('10.0.0.20-10')).toBe(1)
  })
})

describe('parseBatchTargetRows', () => {
  it('按表头别名解析，去重并规范化 OS', () => {
    const targets = parseBatchTargetRows([
      ['IP地址', '主机名', '操作系统'],
      ['10.0.0.1', 'web-01', 'Windows Server'],
      ['10.0.0.2', '', 'linux'],
      ['10.0.0.1', 'dup', 'linux'],
      ['', 'empty', 'linux']
    ])
    expect(targets).toEqual([
      { ip: '10.0.0.1', os: 'windows', hostname: 'web-01' },
      { ip: '10.0.0.2', os: 'linux' }
    ])
  })

  it('只有 IP 列时使用默认 OS', () => {
    expect(parseBatchTargetRows([['ip'], ['10.0.0.1']], 'windows')).toEqual([
      { ip: '10.0.0.1', os: 'windows' }
    ])
  })

  it('缺少 IP 列、IP 不合法、无有效行、超过上限时报错', () => {
    expect(() => parseBatchTargetRows([['主机名'], ['a']])).toThrow('缺少“IP”列')
    expect(() => parseBatchTargetRows([['ip'], ['10.0.0.1'], ['300.1.1.1']])).toThrow('第 3 行')
    expect(() => parseBatchTargetRows([['ip']])).toThrow('没有有效的 IP')
    const rows = [['ip']]
    for (let i = 0; i <= BATCH_MAX_TARGETS; i++)
      rows.push([`10.${Math.floor(i / 65536)}.${Math.floor(i / 256) % 256}.${i % 256}`])
    expect(() => parseBatchTargetRows(rows)).toThrow('最多支持')
  })
})

describe('hasAgentManagePermission', () => {
  const service = (permission, roles = []) => ({
    hasPermission: key => permission && key === 'agent:manage',
    hasRole: role => roles.includes(role)
  })

  it('权限点或指定角色任一满足即可', () => {
    expect(hasAgentManagePermission(service(true))).toBe(true)
    expect(hasAgentManagePermission(service(false, ['role_admin']))).toBe(true)
    expect(hasAgentManagePermission(service(false, ['guest']))).toBe(false)
  })
})
