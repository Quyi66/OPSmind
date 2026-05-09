export const YUM_REPO_PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

// value 须与 vap2_patch.vendor 一致（导入 JSON 顶层 type 字段，全小写）
// SUSE 场景：若副表 affected_pkg.os 实际为 sles/opensuse，需手动在此处输入对应值后提交
export const YUM_REPO_OS_FAMILY_OPTIONS = [
  { label: 'Red Hat Enterprise Linux', value: 'redhat' },
  { label: 'CentOS', value: 'centos' },
  { label: 'Ubuntu', value: 'ubuntu' },
  { label: 'SUSE', value: 'suse' },
  { label: 'IBM AIX', value: 'aix' },
  { label: '麒麟 KylinOS', value: 'kylinos' },
  { label: '统信 UOS（Uniontech）', value: 'uniontech' },
  { label: '龙蜥 Anolis', value: 'anolis' },
  { label: 'Oracle Linux', value: 'oracle' }
]

export const YUM_REPO_ARCH_OPTIONS = [
  { label: 'x86_64', value: 'x86_64' },
  { label: 'aarch64', value: 'aarch64' },
  { label: 'loongarch64', value: 'loongarch64' },
  { label: 'mips64el', value: 'mips64el' },
  { label: 'ppc64le', value: 'ppc64le' },
  { label: 's390x', value: 's390x' }
]

export const YUM_REPO_COLLECT_STATUS_LABELS = {
  UNCOLLECTED: '未采集',
  NOT_COLLECTED: '未采集',
  PENDING: '待执行',
  RUNNING: '采集中',
  SUCCESS: '采集成功',
  SUCCEEDED: '采集成功',
  FAILED: '采集失败'
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
