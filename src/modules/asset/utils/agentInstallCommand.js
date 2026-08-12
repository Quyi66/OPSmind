export const AGENT_TARGET_OS = Object.freeze({
  LINUX: 'linux',
  UBUNTU: 'ubuntu',
  DEBIAN: 'debian',
  WINDOWS: 'windows'
})

const trimTrailingSlash = value => String(value || '').trim().replace(/\/+$/, '')

function appendPath(baseUrl, path) {
  return `${trimTrailingSlash(baseUrl)}/${String(path || '').replace(/^\/+/, '')}`
}

export function resolveAgentConsoleBaseUrl({ backendUrl, apiBaseUrl, locationOrigin } = {}) {
  const configuredBackend = trimTrailingSlash(backendUrl)
  const origin = configuredBackend || trimTrailingSlash(locationOrigin)
  const apiBase = String(apiBaseUrl || '/sjxy-console').trim()

  if (/^https?:\/\//i.test(apiBase)) return trimTrailingSlash(apiBase)
  if (!origin) return trimTrailingSlash(apiBase)
  return appendPath(origin, apiBase)
}

export function getAgentArtifactUrls(baseUrl) {
  const artifactBaseUrl = appendPath(baseUrl, 'agent')
  return {
    windowsInstaller: appendPath(artifactBaseUrl, 'install.ps1'),
    windowsAgent: appendPath(artifactBaseUrl, 'koreops-agent.exe'),
    windowsAgentSha256: appendPath(artifactBaseUrl, 'koreops-agent.exe.sha256')
  }
}

/**
 * 安装命令由服务端生成，前端只能按返回字段原样展示，不能重拼或修改参数。
 */
export function getEnrollmentInstallCommand(enrollmentToken) {
  return typeof enrollmentToken?.installCommand === 'string'
    ? enrollmentToken.installCommand
    : ''
}

export function getEnrollmentCaInstallCommand(enrollmentToken) {
  return typeof enrollmentToken?.installCommandLinuxCa === 'string'
    ? enrollmentToken.installCommandLinuxCa
    : ''
}

export function getAgentTargetOsLabel(targetOs) {
  return {
    [AGENT_TARGET_OS.LINUX]: '麒麟 / RHEL 系',
    [AGENT_TARGET_OS.UBUNTU]: 'Ubuntu',
    [AGENT_TARGET_OS.DEBIAN]: 'Debian',
    [AGENT_TARGET_OS.WINDOWS]: 'Windows'
  }[targetOs] || '未知平台'
}
