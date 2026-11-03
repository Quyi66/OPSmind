/**
 * 主机健康巡检数据归一化与格式化工具函数
 */

import {
  HEALTH_STATUS_MAP,
  HEALTH_ITEM_LEVEL_MAP,
  LATEST_RUN_STATUS_MAP,
  HEALTH_SCORING_RULES
} from '../constants/hostHealth'

const LEVEL_SORT_ORDER = {
  CRITICAL: 0,
  WARNING: 1,
  NORMAL: 2
}

const SCORING_RULE_MAP = Object.fromEntries(
  HEALTH_SCORING_RULES.map(rule => [rule.name, rule])
)

/**
 * 归一化健康概览响应
 * - counts 里没有出现的状态即为 0
 * - 从未巡检过时 latestRun 为 null
 */
export function normalizeHealthSummary(raw = {}) {
  const payload = raw?.data ?? raw ?? {}
  const rawCounts = payload.counts || {}

  const counts = {
    HEALTHY: Number(rawCounts.HEALTHY) || 0,
    WARNING: Number(rawCounts.WARNING) || 0,
    CRITICAL: Number(rawCounts.CRITICAL) || 0,
    UNREACHABLE: Number(rawCounts.UNREACHABLE) || 0,
    UNCHECKED: Number(rawCounts.UNCHECKED) || 0
  }

  const totalHosts =
    counts.HEALTHY +
    counts.WARNING +
    counts.CRITICAL +
    counts.UNREACHABLE +
    counts.UNCHECKED

  const avgScore =
    payload.avgScore === null || payload.avgScore === undefined
      ? null
      : Number(payload.avgScore)

  const latestRun = payload.latestRun
    ? {
        runId: payload.latestRun.runId || '',
        status: payload.latestRun.status || '',
        hostTotal: Number(payload.latestRun.hostTotal) || 0,
        hostChecked: Number(payload.latestRun.hostChecked) || 0,
        message: payload.latestRun.message || null,
        startedAt: payload.latestRun.startedAt || null,
        finishedAt: payload.latestRun.finishedAt || null
      }
    : null

  return {
    counts,
    totalHosts,
    avgScore,
    latestRun
  }
}

/**
 * 归一化单台主机健康巡检记录
 * - UNCHECKED 主机的 score / risks / items / checkTime 为 null
 */
export function normalizeHealthHostRecord(item = {}) {
  const status = item.status || 'UNCHECKED'
  const isUnchecked = status === 'UNCHECKED'

  const score =
    isUnchecked || item.score === null || item.score === undefined
      ? null
      : Number(item.score)

  const risks = Array.isArray(item.risks) ? item.risks.filter(Boolean) : []
  const items = Array.isArray(item.items)
    ? item.items.map(sub => ({
        name: sub.name || '',
        value: sub.value ?? '—',
        level: sub.level || 'NORMAL'
      }))
    : []

  return {
    hostId: item.hostId || '',
    hostIp: item.hostIp || '',
    hostname: item.hostname || '',
    os: item.os || '',
    score,
    status,
    checkTime: item.checkTime || null,
    risks,
    items
  }
}

/**
 * 归一化主机健康分页列表响应
 */
export function normalizeHealthHostsResponse(raw = {}) {
  const payload = raw?.data ?? raw ?? {}
  const rawList = Array.isArray(payload.list)
    ? payload.list
    : Array.isArray(payload.records)
      ? payload.records
      : Array.isArray(payload)
        ? payload
        : []

  const list = rawList.map(normalizeHealthHostRecord)
  const total = Number(payload.total ?? list.length) || 0

  return {
    total,
    list
  }
}

/**
 * 获取主机健康状态元数据
 */
export function getHealthStatusMeta(status) {
  return (
    HEALTH_STATUS_MAP[status] || {
      value: status || 'UNCHECKED',
      label: status || '未知',
      description: '',
      tagType: 'info',
      cardVariant: 'info',
      icon: 'fas fa-question-circle'
    }
  )
}

/**
 * 获取检查项等级元数据
 */
export function getHealthItemLevelMeta(level) {
  return (
    HEALTH_ITEM_LEVEL_MAP[level] || {
      value: level || 'NORMAL',
      label: level || '正常',
      tagType: 'info'
    }
  )
}

/**
 * 获取最近巡检运行状态元数据
 */
export function getLatestRunStatusMeta(status) {
  return (
    LATEST_RUN_STATUS_MAP[status] || {
      value: status || '',
      label: status || '未知',
      tagType: 'info'
    }
  )
}

/**
 * 格式化健康巡检时间
 */
export function formatHealthDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value).replace('T', ' ')
  }
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/**
 * 对检查项按异常程度优先排序（CRITICAL -> WARNING -> NORMAL），并补充扣分规则说明
 */
export function enrichAndSortCheckItems(items = []) {
  if (!Array.isArray(items)) return []
  return [...items]
    .map(item => {
      const rule = findScoringRuleForItem(item.name)
      return {
        ...item,
        threshold: rule?.threshold || '—',
        deduction: rule?.deduction || '—'
      }
    })
    .sort((a, b) => {
      const orderA = LEVEL_SORT_ORDER[a.level] ?? 9
      const orderB = LEVEL_SORT_ORDER[b.level] ?? 9
      return orderA - orderB
    })
}

/**
 * 根据检查项名称匹配评分规则
 */
export function findScoringRuleForItem(name = '') {
  if (!name) return null
  if (SCORING_RULE_MAP[name]) return SCORING_RULE_MAP[name]
  return (
    HEALTH_SCORING_RULES.find(
      rule => rule.name.startsWith(name) || name.startsWith(rule.name.split('（')[0])
    ) || null
  )
}

/**
 * 格式化主机评分展示文本
 */
export function formatHostScore(row) {
  if (!row || row.status === 'UNCHECKED' || row.score === null || row.score === undefined) {
    return '—'
  }
  return `${row.score} 分`
}

/**
 * 格式化主机风险提示摘要
 */
export function formatHostRiskSummary(row) {
  if (!row || row.status === 'UNCHECKED') {
    return '暂未执行过巡检'
  }
  const risks = Array.isArray(row.risks) ? row.risks : []
  if (!risks.length) {
    if (row.status === 'UNREACHABLE') {
      return '主机不可达或巡检脚本执行失败'
    }
    return '全部检查项正常，无风险提示'
  }
  if (risks.length === 1) {
    return risks[0]
  }
  return `共 ${risks.length} 项风险：${risks.join('；')}`
}
