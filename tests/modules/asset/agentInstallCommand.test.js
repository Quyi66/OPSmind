import { describe, expect, it } from 'vitest'
import {
  AGENT_TARGET_OS,
  getAgentArtifactUrls,
  getEnrollmentCaInstallCommand,
  getEnrollmentInstallCommand,
  resolveAgentConsoleBaseUrl
} from '@/modules/asset/utils/agentInstallCommand'

describe('agentInstallCommand', () => {
  it('uses the targetOs values defined by the backend contract', () => {
    expect(AGENT_TARGET_OS).toEqual({
      LINUX: 'linux',
      UBUNTU: 'ubuntu',
      DEBIAN: 'debian',
      WINDOWS: 'windows'
    })
  })

  it('returns the backend-selected command without rewriting it', () => {
    const command = "curl -fsSLk -o /tmp/install.sh 'https://platform/agent/install.sh'"
    expect(getEnrollmentInstallCommand({ installCommand: command })).toBe(command)
  })

  it('keeps the backend CA command as a separate optional command', () => {
    const command = 'curl --cacert /tmp/koreops-ca.crt ...'
    expect(getEnrollmentCaInstallCommand({ installCommandLinuxCa: command })).toBe(command)
  })

  it('resolves runtime URLs for optional Windows artifact links', () => {
    const baseUrl = resolveAgentConsoleBaseUrl({
      backendUrl: 'https://192.168.1.219/',
      apiBaseUrl: '/sjxy-console',
      locationOrigin: 'http://localhost:5573'
    })
    const artifacts = getAgentArtifactUrls(baseUrl)

    expect(baseUrl).toBe('https://192.168.1.219/sjxy-console')
    expect(artifacts.windowsAgent).toBe(
      'https://192.168.1.219/sjxy-console/agent/koreops-agent.exe'
    )
    expect(artifacts.windowsAgentSha256).toContain('koreops-agent.exe.sha256')
  })
})
