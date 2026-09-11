export const AGENT_ERROR_MESSAGES = {
  AGENT_OFFLINE: 'Agent 离线，暂不可执行',
  AGENT_AUTH_FAILED: 'Agent 认证失败',
  NEED_REENROLL: '该主机凭证已失效，需要重新纳管',
  ENROLL_TOKEN_INVALID: '纳管凭证已失效，请重新生成',
  DISPATCH_TIMEOUT: '下发/执行超时',
  COMMAND_FAILED: '主机命令执行失败',
  RELAY_UNAVAILABLE: '通道不可达',
  CLIENT_ALREADY_BOUND: '该 Agent 已绑定其他资产',
  HOST_ALREADY_BOUND: '该资产已绑定 Agent，请先解绑',
  HOST_NOT_FOUND: '资产不存在或没有有效的 Agent 绑定',
  PLATFORM_SELF: '平台节点不能作为被纳管对象'
}

export function getAgentErrorMessage(error, fallback = 'Agent 操作失败') {
  if (typeof error === 'string') return AGENT_ERROR_MESSAGES[error] || error
  const data = error?.response?.data || error?.data || {}
  // 下发错误含逐台原因，必须优先保留服务端原文及换行。
  const code = data.errorCode ?? error?.errorCode
  return data.message || AGENT_ERROR_MESSAGES[code] || data.detail || error?.message || fallback
}
