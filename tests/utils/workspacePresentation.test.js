import { describe, expect, it } from 'vitest'
import {
  formatCvssScore,
  formatKnownCount,
  getAssetDisplayName
} from '@/utils/workspacePresentation'

describe('工作空间中的数据可信度', () => {
  it('保留真实的零分，接受数值字符串，不伪造缺失评分', () => {
    expect(formatCvssScore(0)).toBe('0.0')
    expect(formatCvssScore('9.8')).toBe('9.8')
    for (const value of [null, undefined, '', ' ', 'N/A', false, NaN, -1, 11]) {
      expect(formatCvssScore(value)).toBe('未评分')
    }
  })
  it('区分未知数量与真实零数量', () => {
    expect(formatKnownCount(0)).toBe('0')
    expect(formatKnownCount('1024')).toBe('1,024')
    for (const value of [null, '', undefined, 'unknown', -1, 1.5, true]) {
      expect(formatKnownCount(value)).toBe('待确认')
    }
  })
  it('主机名缺失时使用可识别的 IP，保留用户自定义名称', () => {
    expect(getAssetDisplayName({ hostname: 'N/A', IP: '192.168.1.144' })).toBe('192.168.1.144')
    expect(getAssetDisplayName({ hostname: ' null ', host_key: 'host-1' })).toBe('host-1')
    expect(getAssetDisplayName({ hostname: '【ACM】生产服务器', IP: '10.0.0.1' })).toBe(
      '【ACM】生产服务器'
    )
  })
})
