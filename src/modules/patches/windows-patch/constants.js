import { t } from '@/core/i18n'
export const WIN_PATCH_PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export const WIN_PATCH_SCAN_MODE_OPTIONS = [
  {
    get label() { return t('patches.windows.automaticMode') },
    value: 'auto',
    get description() { return t('patches.windows.automaticModeHint') }
  },
  {
    get label() { return t('patches.windows.onlineMode') },
    value: 'online',
    get description() { return t('patches.windows.onlineModeHint') }
  },
  {
    get label() { return t('patches.windows.wsusMode') },
    value: 'wsus',
    get description() { return t('patches.windows.wsusModeHint') }
  }
]

export const WIN_PATCH_CATEGORY_OPTIONS = [
  { get label() { return t('patches.windows.securityUpdates') }, value: 'SecurityUpdates' },
  { get label() { return t('patches.windows.criticalUpdates') }, value: 'CriticalUpdates' },
  { get label() { return t('patches.windows.updateRollups') }, value: 'UpdateRollups' },
  { get label() { return t('patches.windows.updates') }, value: 'Updates' },
  { get label() { return t('patches.windows.definitionUpdates') }, value: 'DefinitionUpdates' },
  { get label() { return t('patches.windows.featurePacks') }, value: 'FeaturePacks' },
  { get label() { return t('patches.windows.servicePacks') }, value: 'ServicePacks' },
  { get label() { return t('patches.windows.tools') }, value: 'Tools' },
  { get label() { return t('patches.windows.upgrades') }, value: 'Upgrades' },
  { get label() { return t('patches.windows.application') }, value: 'Application' },
  { get label() { return t('patches.windows.connectors') }, value: 'Connectors' },
  { get label() { return t('patches.windows.developerKits') }, value: 'DeveloperKits' },
  { get label() { return t('patches.windows.guidance') }, value: 'Guidance' }
]

export const WIN_PATCH_SEVERITY_OPTIONS = [
  { get label() { return t('patches.catalog.critical') }, value: 'Critical' },
  { get label() { return t('patches.catalog.important') }, value: 'Important' },
  { get label() { return t('patches.catalog.moderate') }, value: 'Moderate' },
  { get label() { return t('patches.catalog.low') }, value: 'Low' },
  { get label() { return t('patches.windows.unclassified') }, value: 'Unspecified' }
]

export const WIN_PATCH_SEVERITY_LABELS = {
  get CRITICAL() { return t('patches.catalog.critical') },
  get IMPORTANT() { return t('patches.catalog.important') },
  get MODERATE() { return t('patches.catalog.moderate') },
  get MEDIUM() { return t('patches.catalog.moderate') },
  get LOW() { return t('patches.catalog.low') },
  get UNSPECIFIED() { return t('patches.windows.unclassified') },
  get NONE() { return t('patches.windows.unclassified') }
}

export const WIN_PATCH_STATUS_OPTIONS = [
  { get label() { return t('patches.windows.pendingRepair') }, value: 'no_repair' },
  { get label() { return t('patches.linux.fixed') }, value: 'is_repair' },
  { get label() { return t('patches.windows.manuallyFixed') }, value: 'is_repair_artificial' },
  { get label() { return t('patches.linux.fixing') }, value: 'repairing' },
  { get label() { return t('patches.windows.repairRebootPending') }, value: 'REPAIR_PENDING_REBOOT' },
  { get label() { return t('patches.linux.fixFailed') }, value: 'repair_faild' }
]

export const WIN_PATCH_TASK_TYPE_OPTIONS = [
  { get label() { return t('patches.windows.scanTask') }, value: 'SCAN' },
  { get label() { return t('patches.windows.installTask') }, value: 'INSTALL' },
  { get label() { return t('patches.windows.rollbackTask') }, value: 'ROLLBACK' }
]

export const WIN_PATCH_TASK_TYPE_LABELS = {
  get SCAN() { return t('patches.linux.scan') },
  get INSTALL() { return t('patches.windows.install') },
  get ROLLBACK() { return t('patches.linux.rollback') },
  get CONN_TEST() { return t('patches.windows.connectivityTest') },
  get CONNECTIVITY() { return t('patches.windows.connectivityTest') },
  get CONNECTIVITY_TEST() { return t('patches.windows.connectivityTest') }
}

export const WIN_PATCH_TASK_STATUS_LABELS = {
  get PENDING() { return t('automation.flow.pending') },
  get CREATED() { return t('automation.flow.pending') },
  get PRE_CHECK_DONE() { return t('automation.flow.pending') },
  get INSTALL_DONE() { return t('automation.flow.pending') },
  get ROLLBACK_DONE() { return t('automation.flow.pending') },
  get RESTART_PENDING() { return t('automation.flow.pending') },
  get RUNNING() { return t('patches.linux.running') },
  get IN_PROGRESS() { return t('patches.linux.running') },
  get PRE_CHECKING() { return t('patches.linux.running') },
  get INSTALLING() { return t('patches.linux.running') },
  get ROLLING_BACK() { return t('patches.linux.running') },
  get RESTARTING() { return t('patches.linux.running') },
  get VALIDATING() { return t('patches.linux.running') },
  get COMPLETED() { return t('automation.workbench.completed') },
  get RESTART_DONE() { return t('automation.workbench.completed') },
  get SUCCESS() { return t('execution.taskStatus.changed') },
  get PASS() { return t('patches.linux.pass') },
  get PRE_CHECK_FAILED() { return t('execution.taskStatus.failed') },
  get INSTALL_FAILED() { return t('execution.taskStatus.failed') },
  get ROLLBACK_FAILED() { return t('execution.taskStatus.failed') },
  get VALIDATE_FAILED() { return t('execution.taskStatus.failed') },
  get FAILED() { return t('execution.taskStatus.failed') },
  get ERROR() { return t('execution.taskStatus.failed') },
  get PARTIAL_SUCCESS() { return t('execution.jobStatus.PARTIAL_SUCCESS') }
}

export const WIN_PATCH_TASK_STATUS_TAG_TYPES = {
  PENDING: 'info',
  CREATED: 'info',
  PRE_CHECK_DONE: 'info',
  INSTALL_DONE: 'info',
  ROLLBACK_DONE: 'info',
  RESTART_PENDING: 'warning',
  RUNNING: 'warning',
  IN_PROGRESS: 'warning',
  PRE_CHECKING: 'warning',
  INSTALLING: 'warning',
  ROLLING_BACK: 'warning',
  RESTARTING: 'warning',
  VALIDATING: 'warning',
  COMPLETED: 'success',
  RESTART_DONE: 'success',
  SUCCESS: 'success',
  PASS: 'success',
  PRE_CHECK_FAILED: 'danger',
  INSTALL_FAILED: 'danger',
  ROLLBACK_FAILED: 'danger',
  VALIDATE_FAILED: 'danger',
  FAILED: 'danger',
  ERROR: 'danger',
  PARTIAL_SUCCESS: 'warning'
}

export const WIN_PATCH_TASK_STEP_LABELS = {
  get PRE_CHECK() { return t('patches.linux.precheck') },
  get EXECUTE() { return t('automation.workbench.execute') },
  get INSTALL() { return t('patches.windows.executeInstall') },
  get ROLLBACK() { return t('patches.windows.executeRollback') },
  get RESTART() { return t('patches.windows.restart') },
  get VALIDATE() { return t('patches.windows.verify') },
  get COMPLETED() { return t('automation.workbench.completed') }
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
  { key: 'summary', get title() { return t('patches.windows.installationConfirmation') } },
  { key: 'pre-check', get title() { return t('patches.windows.preCheckScript') } },
  { key: 'validate', get title() { return t('patches.linux.validationScript') } },
  { key: 'restart', get title() { return t('patches.windows.restartRescan') } },
  { key: 'execute', get title() { return t('patches.windows.executeInstall') } }
]

export const WIN_PATCH_ROLLBACK_WIZARD_STEPS = [
  { key: 'summary', get title() { return t('patches.windows.rollbackConfirmation') } },
  { key: 'pre-check', get title() { return t('patches.windows.preCheckScript') } },
  { key: 'validate', get title() { return t('patches.linux.validationScript') } },
  { key: 'restart', get title() { return t('patches.windows.restartRescan') } },
  { key: 'execute', get title() { return t('patches.windows.executeRollback') } }
]

export const WIN_PATCH_INSTALL_PIPELINE_STEPS = [
  { key: 'PRE_CHECK', get label() { return t('patches.linux.precheck') } },
  { key: 'INSTALL', get label() { return t('patches.windows.executeInstall') } },
  { key: 'RESTART', get label() { return t('patches.windows.restart') } },
  { key: 'VALIDATE', get label() { return t('patches.windows.validation') } }
]

export const WIN_PATCH_ROLLBACK_PIPELINE_STEPS = [
  { key: 'PRE_CHECK', get label() { return t('patches.linux.precheck') } },
  { key: 'ROLLBACK', get label() { return t('patches.windows.executeRollback') } },
  { key: 'RESTART', get label() { return t('patches.windows.restart') } },
  { key: 'VALIDATE', get label() { return t('patches.windows.validation') } }
]

export const WIN_PATCH_TASK_SKIPPABLE_STEPS = ['PRE_CHECK', 'RESTART', 'VALIDATE']

export const WIN_PATCH_PATCH_STATUS_LABELS = {
  get NO_REPAIR() { return t('patches.windows.pendingRepair') },
  get IS_REPAIR() { return t('patches.linux.fixed') },
  get IS_REPAIR_ARTIFICIAL() { return t('patches.windows.manuallyFixed') },
  get REPAIRING() { return t('patches.linux.fixing') },
  get REPAIR_PENDING_REBOOT() { return t('patches.windows.repairRebootPending') },
  get REPAIRD() { return t('patches.linux.fixed') },
  get REPAIR_FAILD() { return t('patches.linux.fixFailed') },
  // 兼容旧枚举
  get MISSING() { return t('patches.windows.pendingInstall') },
  get INSTALLED() { return t('patches.windows.installed') },
  get INSTALLING() { return t('patches.windows.installing') },
  get INSTALL_FAILED() { return t('patches.linux.installFailed') },
  get ROLLING_BACK() { return t('patches.linux.rollingBack') },
  get ROLLBACK_PENDING_REBOOT() { return t('patches.windows.rollbackRebootPending') },
  get ROLLBACK_FAILED() { return t('patches.linux.rollbackFailed') },
  get ROLLBACK_SUCCESS() { return t('patches.windows.rolledBack') }
}

export const WIN_PATCH_PATCH_STATUS_TAG_TYPES = {
  NO_REPAIR: 'danger',
  IS_REPAIR: 'success',
  IS_REPAIR_ARTIFICIAL: 'success',
  REPAIRING: 'warning',
  REPAIR_PENDING_REBOOT: 'warning',
  REPAIRD: 'success',
  REPAIR_FAILD: 'danger',
  // 兼容旧枚举
  MISSING: 'danger',
  INSTALLED: 'success',
  INSTALLING: 'warning',
  INSTALL_FAILED: 'danger',
  ROLLING_BACK: 'warning',
  ROLLBACK_PENDING_REBOOT: 'warning',
  ROLLBACK_FAILED: 'danger',
  ROLLBACK_SUCCESS: 'success'
}

export const WIN_PATCH_INSTALL_ACTION_LABELS = {
  get INSTALL() { return t('patches.windows.install') },
  get ROLLBACK() { return t('patches.linux.rollback') }
}

export const WIN_PATCH_INSTALL_ACTION_TAG_TYPES = {
  INSTALL: 'primary',
  ROLLBACK: 'warning'
}

export const WIN_PATCH_INSTALL_RESULT_LABELS = {
  get SUCCESS() { return t('execution.taskStatus.changed') },
  get FAILED() { return t('execution.taskStatus.failed') },
  get RUNNING() { return t('patches.linux.running') },
  get PENDING() { return t('automation.flow.pending') }
}

export const WIN_PATCH_INSTALL_RESULT_TAG_TYPES = {
  SUCCESS: 'success',
  FAILED: 'danger',
  RUNNING: 'warning',
  PENDING: 'info'
}

// Keep the legacy exported filename stable; resolve the localized default at download time.
export const WIN_PATCH_EXPORT_DEFAULT_FILENAME = 'Windows补丁扫描报告.xlsx'
