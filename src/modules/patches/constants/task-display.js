import { t } from '@/core/i18n'
const PATCH_TASK_DISPLAY_CONFIG = {
  patch: {
    get dialogTitle() { return t('patches.linux.installWizard') },
    get selectionTitle() { return t('patches.linux.updatePatches') },
    get executeTitle() { return t('patches.linux.patchInstall') },
    get selectionSummaryLabel() { return t('patches.linux.patchesToInstall') },
    get packageSummaryLabel() { return t('patches.linux.packagesToUpdate') },
    get packageCardTitle() { return t('patches.linux.packagesToUpdate') },
    get hostCardTitle() { return t('patches.linux.updateHosts') },
    get successDescription() { return t('patches.linux.installSuccessDescription') },
    get preScriptPlaceholder() { return t('patches.linux.preScriptPlaceholder') },
    get postScriptPlaceholder() { return t('patches.linux.postScriptPlaceholder') },
    get finalStepTitle() { return t('patches.linux.installAndExecute') }
  },
  package: {
    get dialogTitle() { return t('patches.linux.packageWizard') },
    get selectionTitle() { return t('patches.linux.packagesToUpdate') },
    get executeTitle() { return t('patches.linux.packageUpdate') },
    get selectionSummaryLabel() { return t('patches.linux.packagesToUpdate') },
    get packageSummaryLabel() { return t('patches.linux.updateRelatedPackages') },
    get packageCardTitle() { return t('patches.linux.packagesToUpdate') },
    get hostCardTitle() { return t('patches.linux.updateHosts') },
    get successDescription() { return t('patches.linux.packageSuccessDescription') },
    get preScriptPlaceholder() { return t('patches.linux.preScriptPlaceholder') },
    get postScriptPlaceholder() { return t('patches.linux.postScriptPlaceholder') },
    get finalStepTitle() { return t('patches.linux.installAndExecute') }
  },
  vulnerability: {
    get dialogTitle() { return t('patches.linux.vulnWizard') },
    get selectionTitle() { return t('patches.linux.vulnsToFix') },
    get executeTitle() { return t('patches.linux.vulnFix') },
    get selectionSummaryLabel() { return t('patches.linux.vulnsToFix') },
    get packageSummaryLabel() { return t('patches.linux.affectedPackagesTitle') },
    get packageCardTitle() { return t('patches.linux.affectedPackagesTitle') },
    get hostCardTitle() { return t('patches.linux.updateHosts') },
    get successDescription() { return t('patches.linux.vulnSuccessDescription') },
    get preScriptPlaceholder() { return t('patches.linux.preScriptPlaceholder') },
    get postScriptPlaceholder() { return t('patches.linux.postScriptPlaceholder') },
    get finalStepTitle() { return t('patches.linux.installAndExecute') }
  },
  rollback: {
    get dialogTitle() { return t('patches.linux.rollbackWizard') },
    get selectionTitle() { return t('patches.linux.rollbackRecords') },
    get executeTitle() { return t('patches.linux.changeRollback') },
    get selectionSummaryLabel() { return t('patches.linux.rollbackRecords') },
    get packageSummaryLabel() { return t('patches.linux.rollbackPackages') },
    get packageCardTitle() { return t('patches.linux.rollbackPackages') },
    get hostCardTitle() { return t('patches.linux.rollbackHosts') },
    get successDescription() { return t('patches.linux.rollbackSuccessDescription') },
    get preScriptPlaceholder() { return t('patches.linux.rollbackPreScriptPlaceholder') },
    get postScriptPlaceholder() { return t('patches.linux.rollbackPostScriptPlaceholder') },
    get finalStepTitle() { return t('patches.linux.rollbackAndExecute') }
  }
}

function normalizeOperationType(input) {
  const rawValue = String(input || '')
    .trim()
    .toLowerCase()

  if (!rawValue || rawValue === 'install' || rawValue === 'patch') {
    return 'patch'
  }

  if (rawValue === 'package' || rawValue === 'pkg_update') {
    return 'package'
  }

  if (rawValue === 'vulnerability' || rawValue === 'vuln_fix') {
    return 'vulnerability'
  }

  if (rawValue === 'rollback') {
    return 'rollback'
  }

  return 'patch'
}

export function getPatchTaskDisplayConfig(operationType) {
  const normalizedType = normalizeOperationType(operationType)
  return PATCH_TASK_DISPLAY_CONFIG[normalizedType] || PATCH_TASK_DISPLAY_CONFIG.patch
}

export function getPatchTaskWizardSteps(operationType) {
  const config = getPatchTaskDisplayConfig(operationType)

  return [
    { key: 'select', get title() { return t('patches.linux.selectTargetHosts') } },
    { key: 'pre', get title() { return t('patches.linux.configurePreScript') } },
    { key: 'validate', get title() { return t('patches.linux.configureValidation') } },
    { key: 'restart', get title() { return t('patches.linux.configureRestart') } },
    { key: 'execute', title: config.finalStepTitle }
  ]
}

export function resolvePatchTaskDisplayType({ taskMode, operationType, taskType } = {}) {
  if (
    String(taskMode || '')
      .trim()
      .toLowerCase() === 'rollback'
  ) {
    return 'rollback'
  }

  if (taskType) {
    return normalizeOperationType(taskType)
  }

  return normalizeOperationType(operationType)
}
