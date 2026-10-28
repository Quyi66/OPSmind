import { beforeEach, describe, expect, it } from 'vitest'
import {
  fixtureState,
  hostOverviewApi,
  repoApi,
  packageApi,
  softwareStatsApi,
  scanApi,
  softwareScanApi
} from '../../fixtures/software/mockApi'

beforeEach(() => {
  fixtureState.scenario = 'long'
  fixtureState.blockedWrites = 0
})
describe('隔离软件页面样例', () => {
  it('uses synthetic long fields with stable pagination and large statistics', async () => {
    const first = await hostOverviewApi.getList({ page: 1, size: 10 })
    const last = await hostOverviewApi.getList({ page: 3, size: 10 })
    expect(first.data.total).toBe(25)
    expect(first.data.records).toHaveLength(10)
    expect(last.data.records).toHaveLength(5)
    expect(last.data.records[0].host_id).toBe('fixture-host-20')
    expect(first.data.records[0].host_key).toContain('.example.invalid')
    expect(first.data.records[0].repo_file.length).toBeGreaterThan(150)
    expect((await softwareStatsApi.getStats()).data.records[0].value).toBeGreaterThan(1e12)
  })
  it('keeps empty, failing and pending reads distinct', async () => {
    fixtureState.scenario = 'empty'
    expect((await repoApi.getRepoList()).data).toEqual({ records: [], total: 0 })
    fixtureState.scenario = 'error'
    await expect(packageApi.getAvailableList()).rejects.toThrow('隔离样例读取失败')
    fixtureState.scenario = 'loading'
    let settled = false
    hostOverviewApi.getList().then(() => {
      settled = true
    })
    await Promise.resolve()
    expect(settled).toBe(false)
  })
  it('rejects every write capability used by the real page components', async () => {
    const writes = [
      [
        hostOverviewApi,
        [
          'toggleRepoStatus',
          'deleteHostRepo',
          'installPackages',
          'uninstallPackages',
          'upgradePackages',
          'rollbackPackages'
        ]
      ],
      [
        repoApi,
        [
          'removeRepoFromHost',
          'configRepoToHosts',
          'saveCustomRepo',
          'deleteCustomRepo',
          'deleteBaseHost',
          'setBaseRepoHosts',
          'importRepoFromExcel'
        ]
      ],
      [scanApi, ['startRepoScan']],
      [softwareScanApi, ['scan']]
    ]
    for (const [api, names] of writes) {
      for (const name of names)
        await expect(api[name]({})).rejects.toThrow('隔离样例拒绝业务写操作')
    }
    expect(fixtureState.blockedWrites).toBe(15)
  })
})
