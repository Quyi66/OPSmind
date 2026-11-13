import { t } from '@/core/i18n'

/**
 * 主机健康巡检常量与评分规则配置
 * 参照：本次更新-前端接口-主机健康巡检-20261103.md
 */

export const HEALTH_STATUS_LIST = [
  {
    value: 'CRITICAL',
    get label() { return t('asset.health.critical') },
    get description() { return t('asset.health.criticalDescription') },
    tagType: 'danger',
    cardVariant: 'danger',
    icon: 'fas fa-times-circle'
  },
  {
    value: 'WARNING',
    get label() { return t('asset.health.warning') },
    get description() { return t('asset.health.warningDescription') },
    tagType: 'warning',
    cardVariant: 'warning',
    icon: 'fas fa-exclamation-triangle'
  },
  {
    value: 'HEALTHY',
    get label() { return t('asset.health.healthy') },
    get description() { return t('asset.health.healthyDescription') },
    tagType: 'success',
    cardVariant: 'success',
    icon: 'fas fa-check-circle'
  },
  {
    value: 'UNREACHABLE',
    get label() { return t('asset.health.unreachable') },
    get description() { return t('asset.health.unreachableDescription') },
    tagType: 'info',
    cardVariant: 'info',
    icon: 'fas fa-unlink'
  },
  {
    value: 'UNCHECKED',
    get label() { return t('asset.health.unchecked') },
    get description() { return t('asset.health.uncheckedDescription') },
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
    get label() { return t('asset.health.normal') },
    tagType: 'success'
  },
  WARNING: {
    value: 'WARNING',
    get label() { return t('asset.health.warning') },
    tagType: 'warning'
  },
  CRITICAL: {
    value: 'CRITICAL',
    get label() { return t('asset.health.critical') },
    tagType: 'danger'
  }
}

export const LATEST_RUN_STATUS_MAP = {
  RUNNING: {
    value: 'RUNNING',
    get label() { return t('asset.health.inspecting') },
    tagType: 'primary'
  },
  COMPLETED: {
    value: 'COMPLETED',
    get label() { return t('asset.health.completed') },
    tagType: 'success'
  },
  FAILED: {
    value: 'FAILED',
    get label() { return t('asset.health.failed') },
    tagType: 'danger'
  }
}

/**
 * 检查项与扣分标准表
 */
export const HEALTH_SCORING_RULES = [
  { name: 'CPU使用率', get label() { return t('asset.health.rules.cpu') }, threshold: '≥80% / ≥95%', deduction: '10 / 20' },
  { name: 'CPU IO Wait', get label() { return t('asset.health.rules.ioWait') }, threshold: '≥20% / ≥50%', deduction: '5 / 10' },
  { name: '内存使用率', get label() { return t('asset.health.rules.memory') }, threshold: '≥80% / ≥95%', deduction: '10 / 20' },
  { name: 'Swap使用率', get label() { return t('asset.health.rules.swap') }, threshold: '≥20% / ≥80%', deduction: '5 / 10' },
  { name: '磁盘使用率（最高分区）', get label() { return t('asset.health.rules.disk') }, threshold: '≥80% / ≥90%', deduction: '10 / 25' },
  { name: 'inode使用率（最高分区）', get label() { return t('asset.health.rules.inode') }, threshold: '≥80% / ≥90%', deduction: '5 / 15' },
  { name: '磁盘IO利用率（最忙磁盘）', get label() { return t('asset.health.rules.diskIo') }, threshold: '≥80% / ≥95%', deduction: '5 / 10' },
  { name: '只读文件系统', get label() { return t('asset.health.rules.readonly') }, get threshold() { return t('asset.health.rules.criticalIfAny') }, deduction: '25' },
  { name: '系统负载（1 分钟 / 核数）', get label() { return t('asset.health.rules.load') }, threshold: '≥1 / ≥2', deduction: '5 / 15' },
  { name: '文件描述符使用率', get label() { return t('asset.health.rules.fd') }, threshold: '≥80% / ≥95%', deduction: '5 / 15' },
  { name: 'TCP连接数', get label() { return t('asset.health.rules.tcp') }, threshold: '≥10000 / ≥30000', deduction: '5 / 10' },
  { name: '时钟同步', get label() { return t('asset.health.rules.clock') }, get threshold() { return t('asset.health.rules.unsynchronizedWarning') }, deduction: '5' },
  { name: '僵尸进程', get label() { return t('asset.health.rules.zombie') }, threshold: '≥1 / ≥50', deduction: '5 / 10' },
  { name: '失败的系统服务', get label() { return t('asset.health.rules.services') }, threshold: '≥1 / ≥5', deduction: '5 / 15' },
  { name: 'SSH失败登录(24h)', get label() { return t('asset.health.rules.ssh') }, threshold: '≥5 / ≥100', deduction: '5 / 10' },
  { name: '系统错误日志(24h)', get label() { return t('asset.health.rules.logs') }, get threshold() { return t('asset.health.rules.errorLogs') }, deduction: '5 / 10' },
  { name: '内存溢出(OOM)', get label() { return t('asset.health.rules.oom') }, get threshold() { return t('asset.health.rules.criticalIfAny') }, deduction: '20' },
  { name: '磁盘I/O/文件系统错误', get label() { return t('asset.health.rules.ioErrors') }, get threshold() { return t('asset.health.rules.criticalIfAny') }, deduction: '25' },
  { name: '内核异常（Call Trace / 软锁死 / 段错误 / 硬件错误）', get label() { return t('asset.health.rules.kernel') }, threshold: '≥1 / ≥10', deduction: '10 / 20' }
]
