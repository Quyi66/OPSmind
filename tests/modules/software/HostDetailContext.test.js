import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import HostDetailDialog from '@/modules/software/components/overview/HostDetailDialog.vue'

const mocks = vi.hoisted(() => ({
  api: Object.fromEntries(
    [
      'getMachineInfo',
      'getMachineRepos',
      'getMachineAvailablePackages',
      'getMachineInstalledPackages',
      'toggleRepoStatus',
      'deleteHostRepo',
      'installPackages',
      'uninstallPackages',
      'upgradePackages',
      'rollbackPackages'
    ].map(name => [name, vi.fn()])
  ),
  confirm: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  startPolling: vi.fn(),
  stopPolling: vi.fn()
}))
vi.mock('@/modules/software/api', () => ({ hostOverviewApi: mocks.api }))
vi.mock('element-plus', () => ({
  ElMessage: { success: mocks.success, error: mocks.error },
  ElMessageBox: { confirm: mocks.confirm }
}))
vi.mock('@/composables/useJobPolling', () => ({
  useJobPolling: () => ({ startPolling: mocks.startPolling, stopPolling: mocks.stopPolling })
}))
const wrappers = []
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const result = id => ({ data: { records: [{ refid: id, pkg_name: id, os_distro: id }], total: 1 } })
async function open() {
  const wrapper = shallowMount(HostDetailDialog, {
    props: { hostId: 'host-A', hostKey: 'display-A' },
    global: {
      renderStubDefaultSlot: true,
      stubs: Object.fromEntries(
        [
          'ElDialog',
          'ElTabs',
          'ElTabPane',
          'ElTag',
          'ElCheckbox',
          'ElCheckboxGroup',
          'ElTable',
          'ElTableColumn',
          'ElPagination',
          'ElButton'
        ].map(name => [
          name,
          { template: name === 'ElTableColumn' ? '<div />' : '<div><slot /></div>' }
        ])
      ),
      directives: { loading: () => {} }
    }
  })
  wrappers.push(wrapper)
  await wrapper.setProps({ modelValue: true })
  await flushPromises()
  return wrapper
}
const row = {
  refid: 'repo-ref',
  repo_name: 'repo-name',
  repo_file: 'source.repo',
  repo_baseurl: 'https://example.invalid/repo',
  pkg_name: 'package-A',
  pkg_id: 'package-id'
}
const actions = [
  ['handleEnableRepo', 'toggleRepoStatus'],
  ['handleDisableRepo', 'toggleRepoStatus'],
  ['handleDeleteRepo', 'deleteHostRepo'],
  ['handleInstallSelected', 'installPackages'],
  ['handleUninstallSelected', 'uninstallPackages'],
  ['handleUpgradeSelected', 'upgradePackages'],
  ['handleRollbackSelected', 'rollbackPackages'],
  ['handleUpgradePackage', 'upgradePackages'],
  ['handleRollbackPackage', 'rollbackPackages']
]
beforeEach(() => {
  vi.resetAllMocks()
  for (const api of Object.values(mocks.api)) api.mockResolvedValue(result('current'))
  mocks.confirm.mockResolvedValue('confirm')
})
afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()))

describe('主机详情上下文', () => {
  it('reloads a newly selected host while visible and ignores the previous host response', async () => {
    const wrapper = await open()
    const old = deferred()
    mocks.api.getMachineRepos
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce(result('host-B-repo'))
    const pending = wrapper.vm.loadRepos()
    wrapper.vm.selectedInstalledPackages = [row]
    wrapper.vm.installedPagination.page = 3
    await wrapper.setProps({ hostId: 'host-B' })
    await flushPromises()
    old.resolve(result('host-A-repo'))
    await pending
    expect(wrapper.vm.reposData[0].refid).toBe('host-B-repo')
    expect(mocks.api.getMachineInfo).toHaveBeenLastCalledWith('host-B')
    expect(wrapper.vm.selectedInstalledPackages).toEqual([])
    expect(wrapper.vm.installedPagination.page).toBe(1)
  })

  it('keeps the latest repository filter response and its loading state', async () => {
    const wrapper = await open()
    const older = deferred(),
      latest = deferred()
    mocks.api.getMachineRepos.mockReturnValueOnce(older.promise).mockReturnValueOnce(latest.promise)
    const first = wrapper.vm.loadRepos()
    wrapper.vm.repoStatus = ['disabled']
    const second = wrapper.vm.loadRepos()
    older.resolve(result('old-filter'))
    await first
    expect(wrapper.vm.reposLoading).toBe(true)
    latest.resolve(result('latest-filter'))
    await second
    expect(wrapper.vm.reposData[0].refid).toBe('latest-filter')
    expect(wrapper.vm.reposLoading).toBe(false)
  })

  it.each([
    ['loadMachineInfo', 'getMachineInfo', 'machineInfo'],
    ['loadRepos', 'getMachineRepos', 'reposData'],
    ['loadAvailablePackages', 'getMachineAvailablePackages', 'availableData'],
    ['loadInstalledPackages', 'getMachineInstalledPackages', 'installedData']
  ])('ignores %s from an earlier opening of the same host', async (load, api, state) => {
    const wrapper = await open(),
      old = deferred()
    mocks.api[api].mockReturnValueOnce(old.promise)
    const pending = wrapper.vm[load]()
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })
    await wrapper.vm[load]()
    old.resolve(result('stale'))
    await pending
    const value =
      state === 'machineInfo' ? wrapper.vm[state].os_distro : wrapper.vm[state][0].pkg_name
    expect(value).toBe('current')
  })

  it.each(actions)(
    'does not execute stale %s confirmation against a different host',
    async (handler, api) => {
      const wrapper = await open(),
        confirmation = deferred()
      wrapper.vm.selectedAvailablePackages = [row]
      wrapper.vm.selectedInstalledPackages = [row]
      mocks.confirm.mockReturnValueOnce(confirmation.promise)
      const pending = wrapper.vm[handler](row, 0)
      await wrapper.setProps({ hostId: 'host-B' })
      confirmation.resolve('confirm')
      await pending
      expect(mocks.api[api]).not.toHaveBeenCalled()
      expect(mocks.success).not.toHaveBeenCalled()
      expect(mocks.error).not.toHaveBeenCalled()
    }
  )

  it.each(actions)(
    'keeps the original %s payload despite changes while confirming',
    async (handler, api) => {
      const wrapper = await open(),
        confirmation = deferred()
      const target = { ...row }
      wrapper.vm.selectedAvailablePackages = [target]
      wrapper.vm.selectedInstalledPackages = [target]
      mocks.confirm.mockReturnValueOnce(confirmation.promise)
      const pending = wrapper.vm[handler](target, 0)
      target.pkg_name = 'changed-package'
      target.repo_file = 'changed.repo'
      wrapper.vm.selectedAvailablePackages = []
      wrapper.vm.selectedInstalledPackages = []
      confirmation.resolve('confirm')
      await pending
      const expected =
        handler.includes('Enable') || handler.includes('Disable')
          ? {
              hostId: 'host-A',
              repoName: 'repo-ref',
              repoStatus: handler.includes('Enable') ? 'yes' : 'no',
              repoUrl: row.repo_baseurl,
              repoDesc: 'repo-name',
              repoFile: 'source.repo'
            }
          : handler === 'handleDeleteRepo'
            ? { hostId: 'host-A', repoName: 'repo-ref', repoFile: 'source.repo' }
            : {
                hostId: 'host-A',
                [handler === 'handleInstallSelected'
                  ? 'installPkgs'
                  : handler === 'handleUninstallSelected'
                    ? 'pkgList'
                    : 'updatePkgs']: 'package-A'
              }
      expect(mocks.confirm).toHaveBeenCalledTimes(1)
      expect(mocks.api[api]).toHaveBeenCalledExactlyOnceWith(expected)
      expect(mocks.success).toHaveBeenCalledTimes(1)
    }
  )

  it.each(actions)(
    'ignores a late %s response after closing and reopening the same host',
    async (handler, api) => {
      const wrapper = await open(),
        response = deferred()
      wrapper.vm.selectedAvailablePackages = [row]
      wrapper.vm.selectedInstalledPackages = [row]
      mocks.api[api].mockReturnValueOnce(response.promise)
      const pending = wrapper.vm[handler](row, 0)
      await flushPromises()
      expect(mocks.api[api]).toHaveBeenCalledTimes(1)
      await wrapper.setProps({ modelValue: false })
      await wrapper.setProps({ modelValue: true })
      await flushPromises()
      mocks.api.getMachineRepos.mockClear()
      mocks.api.getMachineInstalledPackages.mockClear()
      mocks.api.getMachineAvailablePackages.mockClear()
      response.resolve({ data: { runId: 'old-run' } })
      await pending
      expect(mocks.startPolling).not.toHaveBeenCalled()
      expect(mocks.success).not.toHaveBeenCalled()
      expect(mocks.error).not.toHaveBeenCalled()
      expect(mocks.api.getMachineRepos).not.toHaveBeenCalled()
      expect(mocks.api.getMachineInstalledPackages).not.toHaveBeenCalled()
      expect(mocks.api.getMachineAvailablePackages).not.toHaveBeenCalled()
    }
  )

  it('invalidates confirmation immediately when the dialog closes before its parent updates', async () => {
    const wrapper = await open(),
      confirmation = deferred()
    mocks.confirm.mockReturnValueOnce(confirmation.promise)
    const pending = wrapper.vm.handleDeleteRepo(row)
    wrapper.vm.handleClose()
    confirmation.resolve('confirm')
    await pending
    expect(wrapper.emitted('update:modelValue').at(-1)).toEqual([false])
    expect(mocks.api.deleteHostRepo).not.toHaveBeenCalled()
  })

  it.each(['cancel', 'close'])(
    'does not submit or report failure when confirmation is dismissed with %s',
    async reason => {
      const wrapper = await open()
      mocks.confirm.mockRejectedValueOnce(reason)
      await wrapper.vm.handleEnableRepo(row, 0)
      expect(mocks.api.toggleRepoStatus).not.toHaveBeenCalled()
      expect(mocks.error).not.toHaveBeenCalled()
      expect(wrapper.vm.isRepoActionLoading(row, 0)).toBe(false)
    }
  )

  it('does not let a failed old read clear the new host data', async () => {
    const wrapper = await open(),
      response = deferred()
    mocks.api.getMachineRepos.mockReturnValueOnce(response.promise)
    const pending = wrapper.vm.loadRepos()
    await wrapper.setProps({ hostId: 'host-B' })
    await flushPromises()
    response.reject(new Error('old request failed'))
    await pending
    expect(wrapper.vm.reposData[0].refid).toBe('current')
    expect(wrapper.vm.reposPagination.total).toBe(1)
  })

  it('stops polling and ignores old callbacks after a host change', async () => {
    const wrapper = await open()
    mocks.api.toggleRepoStatus.mockResolvedValueOnce({ data: { runId: 'real-run-id' } })
    await wrapper.vm.handleEnableRepo(row, 0)
    const [runId, options] = mocks.startPolling.mock.calls[0]
    expect(runId).toBe('real-run-id')
    expect(options.showMessage).toBe(false)
    expect(wrapper.vm.isRepoActionLoading(row, 0)).toBe(true)
    options.onSuccess({ status: 'SUCCESS' })
    expect(mocks.success).toHaveBeenCalledWith('启用成功')
    await wrapper.setProps({ hostId: 'host-B' })
    await flushPromises()
    mocks.success.mockClear()
    mocks.api.getMachineRepos.mockClear()
    wrapper.vm.setRepoActionLoading('repo-ref', true)
    options.onSuccess({ status: 'SUCCESS' })
    options.onError({ error: 'old failure' })
    options.onComplete()
    expect(mocks.success).not.toHaveBeenCalled()
    expect(mocks.error).not.toHaveBeenCalled()
    expect(mocks.api.getMachineRepos).not.toHaveBeenCalled()
    expect(wrapper.vm.isRepoActionLoading(row, 0)).toBe(true)
    expect(mocks.stopPolling).toHaveBeenCalled()
  })

  it('invalidates a pending confirmation on unmount', async () => {
    const wrapper = await open(),
      confirmation = deferred()
    mocks.confirm.mockReturnValueOnce(confirmation.promise)
    const pending = wrapper.vm.handleDeleteRepo(row)
    wrapper.unmount()
    confirmation.resolve('confirm')
    await pending
    expect(mocks.api.deleteHostRepo).not.toHaveBeenCalled()
    expect(mocks.stopPolling).toHaveBeenCalled()
    wrappers.splice(wrappers.indexOf(wrapper), 1)
  })
})
