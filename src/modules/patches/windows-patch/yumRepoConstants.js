export const YUM_REPO_PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export const YUM_REPO_OS_FAMILY_OPTIONS = [
  { label: 'CentOS', value: 'centos' },
  { label: 'RHEL', value: 'rhel' },
  { label: 'Kylin', value: 'kylin' },
  { label: 'Anolis', value: 'anolis' },
  { label: 'OpenEuler', value: 'openeuler' }
]

export const YUM_REPO_COLLECT_STATUS_LABELS = {
  UNCOLLECTED: '未采集',
  PENDING: '待执行',
  RUNNING: '采集中',
  SUCCESS: '采集成功',
  FAILED: '采集失败'
}

export const YUM_REPO_COLLECT_STATUS_TAG_TYPES = {
  UNCOLLECTED: 'info',
  PENDING: 'info',
  RUNNING: 'warning',
  SUCCESS: 'success',
  FAILED: 'danger'
}

export const YUM_REPO_DIFF_TYPE_LABELS = {
  AVAILABLE: '满足要求',
  MISSING: '缺失',
  OUTDATED: '版本不足',
  RELEASE_MISMATCH: '发行版不匹配',
  AHEAD: '版本更高'
}

export const YUM_REPO_DIFF_TYPE_TAG_TYPES = {
  AVAILABLE: 'success',
  MISSING: 'danger',
  OUTDATED: 'warning',
  RELEASE_MISMATCH: 'danger',
  AHEAD: 'info'
}
