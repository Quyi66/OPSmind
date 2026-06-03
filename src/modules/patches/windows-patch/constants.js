/**
 * Windows 离线补丁模块常量
 * 已移除旧版向导步骤、任务管理、WSUS 等废弃常量
 */

export const WIN_PATCH_PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

// ─────────────────────────────────────────────
//  补丁分类
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
//  严重等级
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
//  补丁状态 — 适配新版 patchStatus 枚举
//  新增: no_repair / is_repair / repairing / repaird / repair_faild
//  保留旧值以兼容联网机器
// ─────────────────────────────────────────────

export const WIN_PATCH_STATUS_OPTIONS = [
  { label: '未修复', value: 'no_repair' },
  { label: '已修复', value: 'is_repair' },
  { label: '修复中', value: 'repairing' },
  { label: '已修复', value: 'repaird' },
  { label: '修复失败', value: 'repair_faild' },
  { label: '待安装', value: 'MISSING' },
  { label: '已安装', value: 'INSTALLED' },
  { label: '安装中', value: 'INSTALLING' },
  { label: '安装失败', value: 'INSTALL_FAILED' }
]

export const WIN_PATCH_PATCH_STATUS_LABELS = {
  // 新版离线状态
  NO_REPAIR: '未修复',
  IS_REPAIR: '已修复',
  REPAIRING: '修复中',
  REPAIRD: '已修复',
  REPAIR_FAILD: '修复失败',
  // 旧版联网状态（兼容）
  MISSING: '待安装',
  INSTALLED: '已安装',
  INSTALLING: '安装中',
  INSTALL_FAILED: '安装失败',
  ROLLING_BACK: '回滚中',
  ROLLBACK_FAILED: '回滚失败',
  ROLLBACK_SUCCESS: '已回滚'
}

export const WIN_PATCH_PATCH_STATUS_TAG_TYPES = {
  // 新版
  NO_REPAIR: 'danger',
  IS_REPAIR: 'success',
  REPAIRING: 'warning',
  REPAIRD: 'success',
  REPAIR_FAILD: 'danger',
  // 旧版（兼容）
  MISSING: 'danger',
  INSTALLED: 'success',
  INSTALLING: 'warning',
  INSTALL_FAILED: 'danger',
  ROLLING_BACK: 'warning',
  ROLLBACK_FAILED: 'danger',
  ROLLBACK_SUCCESS: 'success'
}

// ─────────────────────────────────────────────
//  安装/回滚历史 — 动作与结果标签
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
//  重启选项
// ─────────────────────────────────────────────

export const WIN_PATCH_REBOOT_OPTIONS = [
  { label: '安装后不重启', value: 'no' },
  { label: '安装后重启', value: 'yes' }
]

// ─────────────────────────────────────────────
//  导出
// ─────────────────────────────────────────────

export const WIN_PATCH_EXPORT_DEFAULT_FILENAME = 'Windows补丁扫描报告.xlsx'
