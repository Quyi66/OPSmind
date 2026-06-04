export const WIN_PATCH_PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export const WIN_PATCH_SCAN_MODE_OPTIONS = [
  {
    label: '自动判断',
    value: 'auto',
    description: '默认模式，有 WSUS 配置时优先走 WSUS，否则走 Microsoft Update'
  },
  {
    label: '在线模式',
    value: 'online',
    description: '忽略 WSUS，强制走 Microsoft Windows Update 在线源'
  },
  {
    label: 'WSUS 模式',
    value: 'wsus',
    description: '强制使用 WSUS 扫描，没有配置时后端会返回错误'
  }
]

export const WIN_PATCH_CATEGORY_OPTIONS = [
  { label: '安全更新', value: 'SecurityUpdates' },
  { label: '关键更新', value: 'CriticalUpdates' },
  { label: '更新汇总', value: 'UpdateRollups' },
  { label: '常规更新', value: 'Updates' },
  { label: '定义更新', value: 'DefinitionUpdates' },
  { label: '功能包', value: 'FeaturePacks' },
  { label: '服务包', value: 'ServicePacks' },
  { label: '工具', value: 'Tools' },
  { label: '升级', value: 'Upgrades' },
  { label: '应用程序', value: 'Application' },
  { label: '连接器', value: 'Connectors' },
  { label: '开发工具包', value: 'DeveloperKits' },
  { label: '指南', value: 'Guidance' }
]

export const WIN_PATCH_SEVERITY_OPTIONS = [
  { label: '严重', value: 'Critical' },
  { label: '重要', value: 'Important' },
  { label: '中等', value: 'Moderate' },
  { label: '低危', value: 'Low' },
  { label: '未分级', value: 'Unspecified' }
]

export const WIN_PATCH_SEVERITY_LABELS = {
  CRITICAL: '严重',
  IMPORTANT: '重要',
  MODERATE: '中等',
  MEDIUM: '中等',
  LOW: '低危',
  UNSPECIFIED: '未分级',
  NONE: '未分级'
}

export const WIN_PATCH_STATUS_OPTIONS = [
  { label: '待修复', value: 'no_repair' },
  { label: '待安装', value: 'is_repair' },
  { label: '修复中', value: 'repairing' },
  { label: '已修复', value: 'repaird' },
  { label: '修复失败', value: 'repair_faild' }
]

export const WIN_PATCH_TASK_TYPE_OPTIONS = [
  { label: '扫描任务', value: 'SCAN' },
  { label: '安装任务', value: 'INSTALL' },
  { label: '回滚任务', value: 'ROLLBACK' }
]

export const WIN_PATCH_TASK_TYPE_LABELS = {
  SCAN: '扫描',
  INSTALL: '安装',
  ROLLBACK: '回滚',
  CONN_TEST: '连通性测试',
  CONNECTIVITY: '连通性测试',
  CONNECTIVITY_TEST: '连通性测试'
}

export const WIN_PATCH_TASK_STATUS_LABELS = {
  PENDING: '待执行',
  CREATED: '待执行',
  RUNNING: '执行中',
  IN_PROGRESS: '执行中',
  COMPLETED: '已完成',
  SUCCESS: '成功',
  PASS: '通过',
  FAILED: '失败',
  ERROR: '失败',
  PARTIAL_SUCCESS: '部分成功'
}

export const WIN_PATCH_TASK_STATUS_TAG_TYPES = {
  PENDING: 'info',
  CREATED: 'info',
  RUNNING: 'warning',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  SUCCESS: 'success',
  PASS: 'success',
  FAILED: 'danger',
  ERROR: 'danger',
  PARTIAL_SUCCESS: 'warning'
}

export const WIN_PATCH_TASK_STEP_LABELS = {
  PRE_CHECK: '预检查',
  EXECUTE: '执行',
  INSTALL: '执行安装',
  ROLLBACK: '执行回滚',
  RESTART: '重启',
  VALIDATE: '验证',
  COMPLETED: '已完成'
}

export const WIN_PATCH_TASK_STEP_TAG_TYPES = {
  PRE_CHECK: 'info',
  EXECUTE: 'warning',
  INSTALL: 'warning',
  ROLLBACK: 'warning',
  RESTART: 'danger',
  VALIDATE: 'success',
  COMPLETED: 'success'
}

export const WIN_PATCH_INSTALL_WIZARD_STEPS = [
  { key: 'summary', title: '安装确认' },
  { key: 'pre-check', title: '预检查脚本' },
  { key: 'validate', title: '校验脚本' },
  { key: 'restart', title: '重启与重扫' },
  { key: 'execute', title: '执行安装' }
]

export const WIN_PATCH_ROLLBACK_WIZARD_STEPS = [
  { key: 'summary', title: '回滚确认' },
  { key: 'pre-check', title: '预检查脚本' },
  { key: 'validate', title: '校验脚本' },
  { key: 'restart', title: '重启与重扫' },
  { key: 'execute', title: '执行回滚' }
]

export const WIN_PATCH_INSTALL_PIPELINE_STEPS = [
  { key: 'PRE_CHECK', label: '预检查' },
  { key: 'INSTALL', label: '执行安装' },
  { key: 'RESTART', label: '重启' },
  { key: 'VALIDATE', label: '校验' }
]

export const WIN_PATCH_ROLLBACK_PIPELINE_STEPS = [
  { key: 'PRE_CHECK', label: '预检查' },
  { key: 'ROLLBACK', label: '执行回滚' },
  { key: 'RESTART', label: '重启' },
  { key: 'VALIDATE', label: '校验' }
]

export const WIN_PATCH_TASK_SKIPPABLE_STEPS = ['PRE_CHECK', 'RESTART', 'VALIDATE']

export const WIN_PATCH_PATCH_STATUS_LABELS = {
  NO_REPAIR: '待修复',
  IS_REPAIR: '待安装',
  REPAIRING: '修复中',
  REPAIRD: '已修复',
  REPAIR_FAILD: '修复失败',
  // 兼容旧枚举
  MISSING: '待安装',
  INSTALLED: '已安装',
  INSTALLING: '安装中',
  INSTALL_FAILED: '安装失败',
  ROLLING_BACK: '回滚中',
  ROLLBACK_FAILED: '回滚失败',
  ROLLBACK_SUCCESS: '已回滚'
}

export const WIN_PATCH_PATCH_STATUS_TAG_TYPES = {
  NO_REPAIR: 'danger',
  IS_REPAIR: 'warning',
  REPAIRING: 'warning',
  REPAIRD: 'success',
  REPAIR_FAILD: 'danger',
  // 兼容旧枚举
  MISSING: 'danger',
  INSTALLED: 'success',
  INSTALLING: 'warning',
  INSTALL_FAILED: 'danger',
  ROLLING_BACK: 'warning',
  ROLLBACK_FAILED: 'danger',
  ROLLBACK_SUCCESS: 'success'
}

export const WIN_PATCH_INSTALL_ACTION_LABELS = {
  INSTALL: '安装',
  ROLLBACK: '回滚'
}

export const WIN_PATCH_INSTALL_ACTION_TAG_TYPES = {
  INSTALL: 'primary',
  ROLLBACK: 'warning'
}

export const WIN_PATCH_INSTALL_RESULT_LABELS = {
  SUCCESS: '成功',
  FAILED: '失败',
  RUNNING: '执行中',
  PENDING: '待执行'
}

export const WIN_PATCH_INSTALL_RESULT_TAG_TYPES = {
  SUCCESS: 'success',
  FAILED: 'danger',
  RUNNING: 'warning',
  PENDING: 'info'
}

export const WIN_PATCH_EXPORT_DEFAULT_FILENAME = 'Windows补丁扫描报告.xlsx'
