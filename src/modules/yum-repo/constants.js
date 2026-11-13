import { t } from '@/core/i18n'
export const YUM_REPO_PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

// value 须与 vap2_patch.vendor 一致（导入 JSON 顶层 type 字段，全小写）
// SUSE 场景：若副表 affected_pkg.os 实际为 sles/opensuse，需手动在此处输入对应值后提交
export const YUM_REPO_OS_FAMILY_OPTIONS = [
  { label: 'Red Hat Enterprise Linux', value: 'redhat' },
  { label: 'CentOS', value: 'centos' },
  { label: 'Ubuntu', value: 'ubuntu' },
  { label: 'SUSE', value: 'suse' },
  { label: 'IBM AIX', value: 'aix' },
  { get label() { return t('yumRepo.kylin') }, value: 'kylinos' },
  { get label() { return t('yumRepo.uos') }, value: 'uniontech' },
  { get label() { return t('yumRepo.anolis') }, value: 'anolis' },
  { label: 'Oracle Linux', value: 'oracle' }
]

export const YUM_REPO_ARCH_OPTIONS = [
  { label: 'x86_64', value: 'x86_64' },
  { label: 'aarch64', value: 'aarch64' },
  { label: 'loongarch64', value: 'loongarch64' },
  { label: 'mips64el', value: 'mips64el' },
  { label: 'ppc64le', value: 'ppc64le' },
  { label: 's390x', value: 's390x' },
  { label: 'amd64', value: 'amd64' }
]

export const YUM_REPO_COLLECT_STATUS_LABELS = {
  get UNCOLLECTED() { return t('yumRepo.notCollected') },
  get NOT_COLLECTED() { return t('yumRepo.notCollected') },
  get PENDING() { return t('yumRepo.pending') },
  get RUNNING() { return t('yumRepo.collecting') },
  get SUCCESS() { return t('yumRepo.collected') },
  get SUCCEEDED() { return t('yumRepo.collected') },
  get FAILED() { return t('yumRepo.collectionFailed') }
}

export const YUM_REPO_COLLECT_STATUS_TAG_TYPES = {
  UNCOLLECTED: 'info',
  NOT_COLLECTED: 'info',
  PENDING: 'info',
  RUNNING: 'warning',
  SUCCESS: 'success',
  SUCCEEDED: 'success',
  FAILED: 'danger'
}

export const YUM_REPO_DIFF_TYPE_LABELS = {
  get AVAILABLE() { return t('yumRepo.requirementMet') },
  get MISSING() { return t('yumRepo.missing') },
  get OUTDATED() { return t('yumRepo.outdated') },
  get RELEASE_MISMATCH() { return t('yumRepo.releaseMismatch') },
  get AHEAD() { return t('yumRepo.ahead') }
}

export const YUM_REPO_DIFF_TYPE_TAG_TYPES = {
  AVAILABLE: 'success',
  MISSING: 'danger',
  OUTDATED: 'warning',
  RELEASE_MISMATCH: 'danger',
  AHEAD: 'info'
}

export const SQL_IMPORT_STATUS_LABELS = {
  PENDING: '待执行',
  RUNNING: '执行中',
  SUCCESS: '执行成功',
  FAILED: '执行失败'
}

export const SQL_IMPORT_STATUS_TAG_TYPES = {
  PENDING: 'info',
  RUNNING: 'warning',
  SUCCESS: 'success',
  FAILED: 'danger'
}
