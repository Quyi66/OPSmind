import { reactive } from 'vue'

export const fixtureState = reactive({ scenario: 'long', blockedWrites: 0 })
export function rejectWrite() {
  fixtureState.blockedWrites += 1
  return Promise.reject(new Error('隔离样例拒绝业务写操作'))
}
const longName = 'long-repository-package-name-'.repeat(6)
const rows = Array.from({ length: 25 }, (_, index) => ({
  id: `fixture-${index}`,
  host_id: `fixture-host-${index}`,
  host_key: `host-${index}.${longName}.example.invalid`,
  os_distro: 'Fixture Linux',
  os_version: `10.0-${'release-'.repeat(12)}`,
  repo_count: 25,
  installed_pkgs_count: 125000,
  scan_date: '2026-10-21T08:00:00Z',
  update_time: '2026-10-21T08:00:00Z',
  scan_timestamp: '2026-10-21T08:00:00Z',
  refid: `fixture-ref-${index}`,
  repo_id: `repo-${index}-${longName}`,
  repo_name: longName,
  repo_file: `${longName}.repo`,
  repo_desc: longName,
  repo_url: `https://example.invalid/${longName}`,
  repo_baseurl: `https://example.invalid/${longName}`,
  baseurl: `https://example.invalid/${longName}`,
  scan_server: `fixture-host-${index}`,
  repo_status: index % 2 ? '启用' : '未启用',
  repo_pkgs: 25000,
  repo_size: '125 GB',
  pkg_id: `fixture-package-${index}`,
  pkg_name: `package-${index}-${longName}`,
  pkg_envra: `${longName}.x86_64`,
  pkg_arch: 'x86_64',
  pkg_version: `1.0-${longName}`,
  pkg_release: longName,
  available_pkg_version: index % 2 ? '无' : `2.0-${longName}`,
  pkg_yumstate: '可用'
}))
async function read(records, params = {}) {
  const scenario = fixtureState.scenario
  if (scenario === 'loading') return new Promise(() => {})
  if (scenario === 'error') throw new Error('隔离样例读取失败')
  if (scenario === 'empty') return { data: { records: [], total: 0 } }
  const filtered = params.filter
    ? records.filter(row => JSON.stringify(row).toLowerCase().includes(params.filter.toLowerCase()))
    : records
  const page = params.page || 1,
    size = params.size || 10
  return {
    data: { records: filtered.slice((page - 1) * size, page * size), total: filtered.length }
  }
}
const collection = names =>
  new Proxy(Object.fromEntries(names.map(name => [name, params => read(rows, params)])), {
    get(target, name) {
      return target[name] || rejectWrite
    }
  })
export const softwareStatsApi = {
  getStats: () =>
    read(
      ['scan_count_host', 'scan_count_repos', 'scan_count_pkgs', 'scan_count_installed_pkgs'].map(
        (name, index) => ({
          name,
          value: 1234567890123 + index,
          updated_at: '2026-10-21T08:00:00Z'
        })
      )
    )
}
export const hostOverviewApi = collection([
  'getList',
  'getMachineInfo',
  'getMachineRepos',
  'getMachineAvailablePackages',
  'getMachineInstalledPackages'
])
export const packageApi = collection(['getAvailableList'])
export const repoApi = collection([
  'getRepoList',
  'getBaseHostList',
  'getCustomRepoList',
  'getConfiguredRepoList',
  'getRepoInfoByRefid',
  'getPackageMachineList'
])
repoApi.getRepoDefaultHosts = () => read([{ hostIds: 'fixture-host-0' }])
export const scanApi = { startRepoScan: rejectWrite }
export const softwareScanApi = { scan: rejectWrite }
