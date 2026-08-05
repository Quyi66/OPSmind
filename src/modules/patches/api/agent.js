/**
 * Agent 融合 CMDB 前端接口服务
 */
import { apiService } from '@/core/api'

const CMDB_AGENT_BASE = '/cmdb/api/cmdb/agent'

/**
 * 1.1 批量查询主机 Agent 信息 (富化接口)
 * @param {Array<string>|string} hostIds - 主机 ID 列表或逗号分隔的字符串
 */
export async function getHostAgentInfos(hostIds) {
  const idsParam = Array.isArray(hostIds) ? hostIds.join(',') : hostIds
  if (!idsParam) return []
  try {
    // 接口 /agent/host-info 返回 404，已注释掉调用
    // const response = await apiService.get(`${CMDB_AGENT_BASE}/host-info`, {
    //   params: { hostIds: idsParam }
    // })
    // return response.data || response || []
    return []
  } catch (error) {
    console.error('获取主机 Agent 信息失败:', error)
    return []
  }
}

/**
 * 2.1 生成 enrollment token
 * @param {Object} payload - { ttlMinutes, maxUses, remark }
 */
export async function generateEnrollmentToken(payload = {}) {
  const response = await apiService.post(`${CMDB_AGENT_BASE}/enrollment-token`, payload)
  return response.data || response
}

/**
 * 2.1.2 查询 token 状态
 * @param {string} tokenId
 */
export async function getEnrollmentTokenStatus(tokenId) {
  const response = await apiService.get(`${CMDB_AGENT_BASE}/enrollment-token/${tokenId}`)
  return response.data || response
}

/**
 * 2.1.3 撤销 token
 * @param {string} tokenId
 */
export async function revokeEnrollmentToken(tokenId) {
  const response = await apiService.delete(`${CMDB_AGENT_BASE}/enrollment-token/${tokenId}`)
  return response.data || response
}

/**
 * 2.2 查询待绑定候选 Agent 列表
 */
export async function getPendingAgents() {
  const response = await apiService.get(`${CMDB_AGENT_BASE}/pending`)
  return response.data || response || []
}

/**
 * 2.3 绑定 Agent 到已有/新资产
 * @param {Object} payload - { clientId, hostId }
 */
export async function bindAgent(payload) {
  const response = await apiService.post(`${CMDB_AGENT_BASE}/bind`, payload)
  return response.data || response
}

/**
 * 3. 绑定跳板 Agent (代管内网服务器)
 * @param {Object} payload - { clientId, hostId, targetIp }
 */
export async function bindAgentGateway(payload) {
  const response = await apiService.post(`${CMDB_AGENT_BASE}/bind-gateway`, payload)
  return response.data || response
}

/**
 * 4. 解绑 Agent
 * @param {Object} payload - { hostId }
 */
export async function unbindAgent(payload) {
  const response = await apiService.post(`${CMDB_AGENT_BASE}/unbind`, payload)
  return response.data || response
}

/**
 * Agent 错误码映射
 */
export const AGENT_ERROR_MESSAGES = {
  ENROLL_TOKEN_INVALID: '邀请码已失效，请重新生成',
  CLIENT_ALREADY_BOUND: '该 Agent 已绑定其他资产',
  HOST_ALREADY_BOUND: '该资产已绑定 Agent，请先解绑',
  AGENT_OFFLINE: 'Agent 未上线，请稍后重试',
  RELAY_UNAVAILABLE: '通道不可达',
  AGENT_AUTH_FAILED: 'Agent 认证失败',
  CAPABILITY_UNSUPPORTED: '该 Agent 不支持此操作',
  DISPATCH_TIMEOUT: '下发/执行超时',
  COMMAND_FAILED: '主机命令执行失败',
  RESULT_INGEST_FAILED: '结果回写失败',
  ROLLBACK_UNSUPPORTED: '该补丁不支持回滚',
  ROLLBACK_FAILED: '回滚失败'
}

/**
 * 解析 Agent 错误文案
 * @param {Error|Object|string} error
 */
export function getAgentErrorMessage(error) {
  if (typeof error === 'string' && AGENT_ERROR_MESSAGES[error]) {
    return AGENT_ERROR_MESSAGES[error]
  }
  const code = error?.response?.data?.errorCode || error?.errorCode || error?.code
  if (code && AGENT_ERROR_MESSAGES[code]) {
    return AGENT_ERROR_MESSAGES[code]
  }
  return error?.response?.data?.message || error?.message || '操作失败'
}
