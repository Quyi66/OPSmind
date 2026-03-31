const PATCH_TASK_DISPLAY_CONFIG = {
  patch: {
    dialogTitle: '补丁安装向导',
    selectionTitle: '更新补丁',
    executeTitle: '补丁安装',
    selectionSummaryLabel: '待安装补丁',
    packageSummaryLabel: '待更新软件包',
    packageCardTitle: '待更新软件包',
    hostCardTitle: '更新主机',
    successDescription: '补丁安装及其后续脚本配置已全部在目标设备上成功执行完毕。',
    preScriptPlaceholder: '#!/bin/bash\n# 在此输入升级前需要执行的命令或脚本',
    postScriptPlaceholder: '#!/bin/bash\n# 在此输入系统升级完成后的校验脚本',
    finalStepTitle: '安装与执行'
  },
  package: {
    dialogTitle: '软件包更新向导',
    selectionTitle: '待更新软件包',
    executeTitle: '软件包更新',
    selectionSummaryLabel: '待更新软件包',
    packageSummaryLabel: '更新涉及软件包',
    packageCardTitle: '待更新软件包',
    hostCardTitle: '更新主机',
    successDescription: '软件包更新及其后续脚本配置已全部在目标设备上成功执行完毕。',
    preScriptPlaceholder: '#!/bin/bash\n# 在此输入升级前需要执行的命令或脚本',
    postScriptPlaceholder: '#!/bin/bash\n# 在此输入系统升级完成后的校验脚本',
    finalStepTitle: '安装与执行'
  },
  vulnerability: {
    dialogTitle: '漏洞修复向导',
    selectionTitle: '待修复漏洞',
    executeTitle: '漏洞修复',
    selectionSummaryLabel: '待修复漏洞',
    packageSummaryLabel: '受影响软件包',
    packageCardTitle: '受影响软件包',
    hostCardTitle: '更新主机',
    successDescription: '漏洞修复及其后续脚本配置已全部在目标设备上成功执行完毕。',
    preScriptPlaceholder: '#!/bin/bash\n# 在此输入升级前需要执行的命令或脚本',
    postScriptPlaceholder: '#!/bin/bash\n# 在此输入系统升级完成后的校验脚本',
    finalStepTitle: '安装与执行'
  },
  rollback: {
    dialogTitle: '变更回滚向导',
    selectionTitle: '待回滚记录',
    executeTitle: '变更回滚',
    selectionSummaryLabel: '待回滚记录',
    packageSummaryLabel: '待回滚软件包',
    packageCardTitle: '待回滚软件包',
    hostCardTitle: '回滚主机',
    successDescription: '变更回滚及其后续脚本配置已全部在目标设备上成功执行完毕。',
    preScriptPlaceholder: '#!/bin/bash\n# 在此输入回滚前需要执行的命令或脚本',
    postScriptPlaceholder: '#!/bin/bash\n# 在此输入系统回滚完成后的校验脚本',
    finalStepTitle: '回滚与执行'
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
    { key: 'select', title: '选择目标主机' },
    { key: 'pre', title: '预执行脚本配置' },
    { key: 'validate', title: '脚本校验配置' },
    { key: 'restart', title: '重启策略配置' },
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
