import { describe, expect, it } from 'vitest'
import {
  AGENT_TARGET_OS,
  getEnrollmentInstallCommand,
  isEnrollmentTokenUsable
} from '@/modules/asset/utils/agentInstallCommand'

describe('Agent enrollment contract', () => {
  it('supports Linux and Windows only', () => {
    expect(AGENT_TARGET_OS).toEqual({ LINUX: 'linux', WINDOWS: 'windows' })
  })
  it('preserves the single server command and ignores removed command fields', () => {
    const command = 'powershell -Command "iex(\'https://platform/agent/i/token\')"'
    expect(getEnrollmentInstallCommand({ installCommand: command })).toBe(command)
    expect(getEnrollmentInstallCommand({ installCommandLinuxCa: 'old' })).toBe('')
  })
  it('keeps polling unlimited credentials but stops on inactive or exhausted tokens', () => {
    expect(isEnrollmentTokenUsable({ status: 'active', remainingUses: null })).toBe(true)
    expect(isEnrollmentTokenUsable({ status: 'active', remainingUses: 1 })).toBe(true)
    expect(isEnrollmentTokenUsable({ status: 'active', remainingUses: 0 })).toBe(false)
    for (const status of ['expired', 'exhausted', 'revoked']) {
      expect(isEnrollmentTokenUsable({ status, remainingUses: 1 })).toBe(false)
    }
    expect(isEnrollmentTokenUsable(null)).toBe(false)
  })
})
