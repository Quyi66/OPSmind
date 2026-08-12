import { describe, expect, it } from 'vitest'
import {
  AGENT_PLATFORM,
  formatAgentTimestamp,
  getAgentPlatform,
  hasAgentIpMismatch
} from '@/modules/asset/utils/agentInfo'
import {
  AGENT_ROUTE_MISMATCH_PREFIX,
  extractAgentRouteMismatchMessage
} from '@/modules/asset/utils/agentRouteMismatch'

describe('agent host-info presentation', () => {
  it('uses agentPlatform instead of parsing the raw os string', () => {
    expect(getAgentPlatform({ agentPlatform: 'windows', os: 'Linux 4.19' })).toBe(
      AGENT_PLATFORM.WINDOWS
    )
    expect(getAgentPlatform({ os: 'Windows 10' })).toBe(AGENT_PLATFORM.UNKNOWN)
  })

  it('trusts the backend ipMismatch flag and formats timestamp fractions', () => {
    expect(hasAgentIpMismatch({ cmdbIp: '10.0.0.1', lastReportedIp: '10.0.0.2' })).toBe(false)
    expect(hasAgentIpMismatch({ ipMismatch: true })).toBe(true)
    expect(formatAgentTimestamp('2026-08-12 09:50:12.0')).toBe('2026-08-12 09:50:12')
  })
})

describe('AgentRouteMismatch error extraction', () => {
  it('preserves the backend multiline message', () => {
    const message = `${AGENT_ROUTE_MISMATCH_PREFIX} 已阻断。\n- [IP_MISMATCH] ciId=ci-1\n请先核对。`
    expect(extractAgentRouteMismatchMessage({ error: { message } })).toBe(message)
  })

  it('finds the marker after an Ansible host prefix', () => {
    expect(extractAgentRouteMismatchMessage('[host-a] [AgentRouteMismatch] blocked')).toBe(
      '[AgentRouteMismatch] blocked'
    )
  })

  it('decodes a JSON-formatted error before extracting the message', () => {
    const encoded = JSON.stringify({
      message: '[AgentRouteMismatch] 已阻断。\n- [PLATFORM_SELF] ciId=ci-2'
    })
    expect(extractAgentRouteMismatchMessage(encoded)).toContain('\n- [PLATFORM_SELF]')
  })
})
