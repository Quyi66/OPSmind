export const AGENT_TARGET_OS = Object.freeze({ LINUX: 'linux', WINDOWS: 'windows' })

// 命令包含凭证与引导地址，按服务端原文展示，不拼接或改写。
export function getEnrollmentInstallCommand(token) {
  return typeof token?.installCommand === 'string' ? token.installCommand : ''
}

export function isEnrollmentTokenUsable(token) {
  return Boolean(token && token.status === 'active' && token.remainingUses !== 0)
}
