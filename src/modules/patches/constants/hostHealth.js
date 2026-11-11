/**
 * 主机健康巡检常量与评分规则配置
 * 参照：本次更新-前端接口-主机健康巡检-20261103.md
 */

export const HEALTH_STATUS_LIST = [
  {
    value: 'CRITICAL',
    label: '严重',
    description: '存在严重检查项',
    tagType: 'danger',
    cardVariant: 'danger',
    icon: 'fas fa-times-circle'
  },
  {
    value: 'WARNING',
    label: '告警',
    description: '存在告警检查项',
    tagType: 'warning',
    cardVariant: 'warning',
    icon: 'fas fa-exclamation-triangle'
  },
  {
    value: 'HEALTHY',
    label: '健康',
    description: '全部检查项正常',
    tagType: 'success',
    cardVariant: 'success',
    icon: 'fas fa-check-circle'
  },
  {
    value: 'UNREACHABLE',
    label: '不可达',
    description: '不可达或脚本执行失败',
    tagType: 'info',
    cardVariant: 'info',
    icon: 'fas fa-unlink'
  },
  {
    value: 'UNCHECKED',
    label: '未巡检',
    description: '纳管后尚未巡检',
    tagType: 'info',
    cardVariant: 'muted',
    icon: 'fas fa-clock'
  }
]

export const HEALTH_STATUS_MAP = Object.fromEntries(
  HEALTH_STATUS_LIST.map(item => [item.value, item])
)

export const HEALTH_ITEM_LEVEL_MAP = {
  NORMAL: {
    value: 'NORMAL',
    label: '正常',
    tagType: 'success'
  },
  WARNING: {
    value: 'WARNING',
    label: '告警',
    tagType: 'warning'
  },
  CRITICAL: {
    value: 'CRITICAL',
    label: '严重',
    tagType: 'danger'
  }
}

export const LATEST_RUN_STATUS_MAP = {
  RUNNING: {
    value: 'RUNNING',
    label: '巡检中',
    tagType: 'primary'
  },
  COMPLETED: {
    value: 'COMPLETED',
    label: '已完成',
    tagType: 'success'
  },
  FAILED: {
    value: 'FAILED',
    label: '执行失败',
    tagType: 'danger'
  }
}

/**
 * 检查项与扣分标准表
 */
export const HEALTH_SCORING_RULES = [
  { name: 'CPU使用率', threshold: '≥80% / ≥95%', deduction: '10 / 20' },
  { name: 'CPU IO Wait', threshold: '≥20% / ≥50%', deduction: '5 / 10' },
  { name: '内存使用率', threshold: '≥80% / ≥95%', deduction: '10 / 20' },
  { name: 'Swap使用率', threshold: '≥20% / ≥80%', deduction: '5 / 10' },
  { name: '磁盘使用率（最高分区）', threshold: '≥80% / ≥90%', deduction: '10 / 25' },
  { name: 'inode使用率（最高分区）', threshold: '≥80% / ≥90%', deduction: '5 / 15' },
  { name: '磁盘IO利用率（最忙磁盘）', threshold: '≥80% / ≥95%', deduction: '5 / 10' },
  { name: '只读文件系统', threshold: '有即严重', deduction: '25' },
  { name: '系统负载（1 分钟 / 核数）', threshold: '≥1 / ≥2', deduction: '5 / 15' },
  { name: '文件描述符使用率', threshold: '≥80% / ≥95%', deduction: '5 / 15' },
  { name: 'TCP连接数', threshold: '≥10000 / ≥30000', deduction: '5 / 10' },
  { name: '时钟同步', threshold: '未同步为告警', deduction: '5' },
  { name: '僵尸进程', threshold: '≥1 / ≥50', deduction: '5 / 10' },
  { name: '失败的系统服务', threshold: '≥1 / ≥5', deduction: '5 / 15' },
  { name: 'SSH失败登录(24h)', threshold: '≥5 / ≥100', deduction: '5 / 10' },
  { name: '系统错误日志(24h)', threshold: '≥100 / ≥1000 条', deduction: '5 / 10' },
  { name: '内存溢出(OOM)', threshold: '有即严重', deduction: '20' },
  { name: '磁盘I/O/文件系统错误', threshold: '有即严重', deduction: '25' },
  { name: '内核异常（Call Trace / 软锁死 / 段错误 / 硬件错误）', threshold: '≥1 / ≥10', deduction: '10 / 20' }
]
