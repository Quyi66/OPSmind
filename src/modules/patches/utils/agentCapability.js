import { ElMessage } from 'element-plus'
import { agentApi } from '@/modules/asset/api'

const AGENT_CONNECTION_TYPES = ['koreops_agent', 'agent', 'oplus_agent']

export function getAgentHostId(host) {
  if (!host || typeof host !== 'object') return ''
  return String(
    host.hostId ||
    host.host_id ||
    host.id ||
    host.hostsId ||
    host.hosts_id ||
    host.key ||
    ''
  ).trim()
}

function mergeAgentInfo(host, info) {
  if (!info) {
    return { ...host, agentInfoUnavailable: true }
  }

  return {
    ...host,
    connectionType: info.connectionType,
    agentStatus: info.agentStatus,
    capabilities: info.capabilities,
    agentClientId: info.agentClientId || info.clientId || host.agentClientId,
    agentVersion: info.agentVersion || host.agentVersion,
    agentMode: info.agentMode || host.agentMode,
    targetIp: info.targetIp || host.targetIp,
    lastSeenAt: info.lastSeenAt || host.lastSeenAt,
    agentInfoUnavailable: false
  }
}

/**
 * 以 host-info 的实时结果富化目标主机。返回顺序与输入主机顺序一致。
 */
export async function resolveAgentCapabilityHosts(hosts) {
  const hostList = extractHostList(hosts).map(host =>
    typeof host === 'object' && host !== null ? { ...host } : { value: String(host || '') }
  )
  const hostIds = [...new Set(hostList.map(getAgentHostId).filter(Boolean))]

  if (hostIds.length === 0) {
    throw new Error('目标主机缺少资产 ID，无法确认 Agent 状态')
  }

  const infoByHostId = new Map()
  for (let index = 0; index < hostIds.length; index += 100) {
    const response = await agentApi.getHostAgentInfo(hostIds.slice(index, index + 100))
    if (!Array.isArray(response)) {
      throw new Error('主机 Agent 状态接口返回格式异常')
    }
    response.forEach(info => {
      if (info?.hostId) infoByHostId.set(String(info.hostId), info)
    })
  }

  return hostList.map(host => mergeAgentInfo(host, infoByHostId.get(getAgentHostId(host))))
}

/**
 * 从多形态的 host 数据结构中提取归一化主机列表
 * @param {Array|Object} input 
 * @returns {Array} 归一化后的主机/简略主机对象列表
 */
function extractHostList(input) {
  if (!input) return []
  const rawList = Array.isArray(input) ? input : [input]
  const result = []

  rawList.forEach(item => {
    if (!item) return

    // 适配数组类型的受影响/目标主机字段（包含驼峰与蛇形）
    const affectedArr = item.affectedHosts || item.affected_hosts || item.targetHosts || item.target_hosts
    const hostsStr = typeof item.affected_hosts_str === 'string'
      ? item.affected_hosts_str
      : typeof item.affected_hosts === 'string'
        ? item.affected_hosts
        : typeof item.target_hosts === 'string'
          ? item.target_hosts
          : null

    if (Array.isArray(affectedArr) && affectedArr.length > 0) {
      result.push(...affectedArr)
    } else if (hostsStr) {
      hostsStr.split(',').map(s => s.trim()).filter(Boolean).forEach(h => {
        result.push({ key: '', value: h })
      })
    } else if (Array.isArray(item.hosts) && item.hosts.length > 0) {
      item.hosts.forEach(h => {
        if (typeof h === 'object') result.push(h)
        else result.push({ key: '', value: String(h).trim() })
      })
    } else {
      result.push(item)
    }
  })

  return result
}

/**
 * 从 availableHosts 寻找匹配的完整主机记录
 */
function findMatchedHost(target, availableHosts = []) {
  if (!availableHosts || availableHosts.length === 0) return null
  const targetKey = typeof target === 'string'
    ? target.trim()
    : String(target.hostId || target.host_id || target.id || target.ip || target.hostKey || target.host_key || target.key || target.value || '').trim()

  if (!targetKey) return null

  return availableHosts.find(h => {
    if (!h) return false
    const hIds = [
      h.id, h.host_id, h.hostId, h.ip, h.host_key, h.hostKey, h.hostname, h.key, h.value
    ].filter(Boolean).map(String)
    return hIds.some(id => id.trim() === targetKey)
  })
}

/**
 * 校验目标主机使用 Agent 通道时的在线状态与能力可用性 (F4)
 * @param {Array|Object} hosts 主机列表、单个主机或包含受影响主机的 CVE 记录
 * @param {string} requiredCap 必需的能力标识 ('scan' | 'patch' | 'rollback' | 'exec')
 * @param {Array} availableHosts 辅助查找的主机大表（如当前页 hostTableData）
 * @returns {Array<{host: string, reason: string}>} 不可执行的 Agent 主机及原因
 */
export function getAgentCapabilityIssues(hosts, requiredCap = 'scan', availableHosts = []) {
  const hostList = extractHostList(hosts)
  const issues = []
  
  for (const item of hostList) {
    // 尝试直接获取或在大表中反查完整主机对象
    let host = typeof item === 'object' ? { ...item } : { value: String(item) }
    const matched = findMatchedHost(host, availableHosts)
    if (matched) {
      // 用 host 中非空的真值覆盖 matched，保留 matched 中的真实 connectionType / agentStatus / capabilities
      const cleanHost = Object.fromEntries(
        Object.entries(host).filter(([_, v]) => v !== undefined && v !== null && v !== '')
      )
      host = { ...matched, ...cleanHost }
    }

    const hostDisplayName = host.ip || host.hostname || host.host_key || host.hostKey || host.hostId || host.value || '未知主机'
    if (host.agentInfoUnavailable) {
      issues.push({
        host: hostDisplayName,
        reason: '无法读取 Agent 实时状态'
      })
      continue
    }

    const connType = host.connectionType || host.connection_type
    if (connType === 'ssh') {
      continue
    }

    const isAgent = AGENT_CONNECTION_TYPES.includes(connType)
    if (!isAgent) {
      issues.push({
        host: hostDisplayName,
        reason: '无法确认接入方式或 Agent 实时状态'
      })
      continue
    }

    // 1. 检查在线状态
    const status = host.agentStatus || host.agent_status
    if (!status || status !== 'online') {
      issues.push({
        host: hostDisplayName,
        reason: `Agent 当前为${status === 'offline' ? '离线' : '离线/未报到'}状态`
      })
      continue
    }

    // 2. 检查能力集
    const rawCaps = host.capabilities
    const caps = Array.isArray(rawCaps)
      ? rawCaps
      : typeof rawCaps === 'string'
        ? rawCaps.split(',').map(s => s.trim())
        : []
    
    if (caps.length === 0 || !caps.includes(requiredCap)) {
      issues.push({
        host: hostDisplayName,
        reason: `Agent 缺失 [${requiredCap}] 能力`
      })
    }
  }

  return issues
}

export function formatAgentCapabilityIssues(issues = []) {
  if (!issues.length) return ''
  const details = issues.slice(0, 3).map(item => `[${item.host}] ${item.reason}`).join('；')
  const more = issues.length > 3 ? `；另有 ${issues.length - 3} 台不可执行` : ''
  return `已阻止操作：${issues.length} 台主机不可通过 Agent 执行。${details}${more}`
}

/**
 * 用于批量操作界面，明确展示可执行/不可执行数量，避免用户误以为系统会静默跳过失败主机。
 */
export function formatAgentCapabilitySummary(hosts, issues = []) {
  const total = extractHostList(hosts).length
  if (!total) return ''

  const executable = Math.max(total - issues.length, 0)
  if (!issues.length) return `可执行 ${executable} 台`

  const details = issues.slice(0, 3).map(item => `[${item.host}] ${item.reason}`).join('；')
  const more = issues.length > 3 ? `；另有 ${issues.length - 3} 台不可执行` : ''
  return `可执行 ${executable} 台 / 不可执行 ${issues.length} 台。${details}${more}`
}

export function validateAgentCapability(hosts, requiredCap = 'scan', availableHosts = []) {
  const issues = getAgentCapabilityIssues(hosts, requiredCap, availableHosts)
  if (issues.length === 0) return true

  ElMessage.warning({
    message: formatAgentCapabilityIssues(issues),
    duration: 5000
  })
  return false
}
