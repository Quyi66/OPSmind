/**
 * 补丁管理模块常量定义
 */

/**
 * 补丁状态
 */
export const PATCH_STATUS = {
  UNFIXED: 'UNFIXED', // 未修复
  FIXED: 'FIXED', // 已修复
  FIXING: 'FIXING', // 修复中
  FIX_FAILED: 'FIX_FAILED', // 修复失败
  ROLLING_BACK: 'ROLLING_BACK', // 回滚中
  ROLLBACK_FAILED: 'ROLLBACK_FAILED', // 回滚失败
  ROLLBACK_SUCCESS: 'ROLLBACK_SUCCESS' // 回滚成功
}

/**
 * 补丁状态标签映射
 */
export const PATCH_STATUS_LABELS = {
  [PATCH_STATUS.UNFIXED]: '未修复',
  [PATCH_STATUS.FIXED]: '已修复',
  [PATCH_STATUS.FIXING]: '修复中',
  [PATCH_STATUS.FIX_FAILED]: '修复失败',
  [PATCH_STATUS.ROLLING_BACK]: '回滚中',
  [PATCH_STATUS.ROLLBACK_FAILED]: '回滚失败',
  [PATCH_STATUS.ROLLBACK_SUCCESS]: '回滚成功'
}

/**
 * 补丁状态样式映射
 */
export const PATCH_STATUS_STYLES = {
  [PATCH_STATUS.UNFIXED]: 'warning',
  [PATCH_STATUS.FIXED]: 'success',
  [PATCH_STATUS.FIXING]: 'primary',
  [PATCH_STATUS.FIX_FAILED]: 'danger',
  [PATCH_STATUS.ROLLING_BACK]: 'info',
  [PATCH_STATUS.ROLLBACK_FAILED]: 'danger',
  [PATCH_STATUS.ROLLBACK_SUCCESS]: 'success'
}

/**
 * 补丁严重程度
 */
export const PATCH_SEVERITY = {
  CRITICAL: 'CRITICAL', // 严重
  IMPORTANT: 'IMPORTANT', // 重要
  MODERATE: 'MODERATE', // 中等
  LOW: 'LOW' // 低
}

/**
 * 补丁严重程度标签映射
 */
export const PATCH_SEVERITY_LABELS = {
  [PATCH_SEVERITY.CRITICAL]: '严重',
  [PATCH_SEVERITY.IMPORTANT]: '重要',
  [PATCH_SEVERITY.MODERATE]: '中等',
  [PATCH_SEVERITY.LOW]: '低'
}

/**
 * 补丁严重程度样式映射
 */
export const PATCH_SEVERITY_STYLES = {
  [PATCH_SEVERITY.CRITICAL]: 'danger',
  [PATCH_SEVERITY.IMPORTANT]: 'warning',
  [PATCH_SEVERITY.MODERATE]: 'info',
  [PATCH_SEVERITY.LOW]: 'success'
}

/**
 * 任务状态
 */
export const TASK_STATUS = {
  WAITING: 'WAITING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  INTERRUPTED: 'INTERRUPTED'
}

/**
 * 任务状态标签映射
 */
export const TASK_STATUS_LABELS = {
  [TASK_STATUS.WAITING]: '等待中',
  [TASK_STATUS.RUNNING]: '运行中',
  [TASK_STATUS.COMPLETED]: '已完成',
  [TASK_STATUS.FAILED]: '失败',
  [TASK_STATUS.INTERRUPTED]: '已中断'
}

/**
 * 任务状态样式映射
 */
export const TASK_STATUS_STYLES = {
  [TASK_STATUS.WAITING]: 'info',
  [TASK_STATUS.RUNNING]: 'primary',
  [TASK_STATUS.COMPLETED]: 'success',
  [TASK_STATUS.FAILED]: 'danger',
  [TASK_STATUS.INTERRUPTED]: 'warning'
}

/**
 * 操作类型
 */
export const OPERATION_TYPE = {
  SCAN: 'scan',
  INSTALL: 'install',
  ROLLBACK: 'rollback',
  VULNERABILITY_SCAN: 'vulnerability_scan'
}

/**
 * 操作类型标签映射
 */
export const OPERATION_TYPE_LABELS = {
  [OPERATION_TYPE.SCAN]: '补丁扫描',
  [OPERATION_TYPE.INSTALL]: '补丁安装',
  [OPERATION_TYPE.ROLLBACK]: '补丁回退',
  [OPERATION_TYPE.VULNERABILITY_SCAN]: '漏洞扫描'
}

/**
 * 时间范围选项
 */
export const TIME_RANGE_OPTIONS = [
  { label: '今天', value: 1 },
  { label: '近3天', value: 3 },
  { label: '近7天', value: 7 },
  { label: '近30天', value: 30 },
  { label: '近90天', value: 90 }
]

/**
 * 默认分页配置
 */
export const DEFAULT_PAGINATION = {
  page: 1,
  pageSize: 20,
  pageSizes: [10, 20, 50, 100]
}

/**
 * 导航菜单配置
 */
export const NAV_ITEMS = [
  {
    key: 'machineScan',
    label: '机器扫描',
    icon: 'fas fa-search',
    description: '扫描机器上的可用补丁'
  },
  {
    key: 'patchInstall',
    label: '补丁安装',
    icon: 'fas fa-download',
    description: '安装补丁包'
  },
  {
    key: 'changeRollback',
    label: '变更回滚',
    icon: 'fas fa-undo',
    description: '回滚已安装的补丁'
  },
  {
    key: 'linuxYumManage',
    label: 'LinuxYUM管理',
    icon: 'fas fa-cogs',
    description: '管理YUM源和仓库配置'
  },
  {
    key: 'patchLibrary',
    label: '补丁仓库',
    icon: 'fas fa-database',
    description: '查看和管理补丁仓库'
  },
  {
    key: 'vulnerability',
    label: '漏洞概览',
    icon: 'fas fa-shield-alt',
    description: '系统漏洞概览和分析'
  },
  {
    key: 'windowsVulnerability',
    label: 'Windows漏洞',
    icon: 'fab fa-windows',
    description: 'Windows系统漏洞扫描和修复'
  },
  {
    key: 'windowsWsus',
    label: 'WSUS补丁管理',
    icon: 'fas fa-server',
    description: '基于 WSUS 的离线补丁扫描、安装与回滚'
  },
  {
    key: 'windowsUpdate',
    label: 'Windows更新',
    icon: 'fas fa-sync',
    description: 'Windows系统更新管理'
  },
  {
    key: 'windowsRollback',
    label: 'Windows回滚',
    icon: 'fas fa-history',
    description: 'Windows更新回滚'
  },
  {
    key: 'windowsView',
    label: 'Windows View',
    icon: 'fas fa-desktop',
    description: 'Windows视图管理'
  },
  {
    key: 'logs',
    label: '变更日志查询',
    icon: 'fas fa-file-alt',
    description: '查看补丁执行日志和报告'
  },
  {
    key: 'processLogs',
    label: '流程操作记录',
    icon: 'fas fa-stream',
    description: '查看补丁向导流程步骤记录'
  }
]
