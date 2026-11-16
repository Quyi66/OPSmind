import { createRequire } from 'node:module'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'
import PackageSet from '@/modules/patches/views/PackageSetPage.vue'
import Schedule from '@/modules/patches/components/patch-task/schedule/PatchScheduleInstallDialog.vue'
import LocalInstall from '@/modules/patches/views/LocalInstallPage.vue'
import TaskDetail from '@/modules/patches/components/InstallTaskDetailDialog.vue'
import FailedHosts from '@/modules/patches/components/patch-task/dialogs/PatchTaskFailedHostsDialog.vue'
import Rollback from '@/modules/patches/views/LinuxPatchRollbackPage.vue'
const { ElForm, ElFormItem } = createRequire(import.meta.url)(
  'element-plus/lib/components/form/index.js'
)
const api = vi.hoisted(() => ({
  list: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  createAndRunTask: vi.fn(),
  startInstall: vi.fn(),
  getTask: vi.fn(),
  getFailedHosts: vi.fn(),
  getHistUpdatePkgs: vi.fn(),
  deleteHistUpdatePkgs: vi.fn(),
  getAllGroups: vi.fn(),
  getAllTags: vi.fn(),
  getMachinesByPatch: vi.fn(),
  getAffectedPackages: vi.fn(),
  confirm: vi.fn(),
  startPolling: vi.fn(),
  success: vi.fn(),
  error: vi.fn()
}))
vi.mock('@/modules/patches/api', () => ({
  packageSetApi: api,
  patchInstallApi: api,
  localInstallApi: api,
  patchRollbackApi: api
}))
vi.mock('@/modules/asset/api', () => ({ dataManageApi: api, agentApi: {} }))
vi.mock('@/core/auth', () => ({ useAuth: () => ({ user: { value: { login: 'admin' } } }) }))
vi.mock('element-plus', () => ({
  ElMessage: { success: api.success, error: api.error, warning: vi.fn() },
  ElMessageBox: { confirm: api.confirm }
}))
vi.mock('@/composables/useJobPolling', () => ({
  useJobPolling: () => ({ startPolling: api.startPolling })
}))
vi.mock('@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { template: '<div />' }
}))
const wrappers = []
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const Table = { methods: { clearSelection() {}, toggleRowSelection() {} }, template: '<div />' }
async function open(component, props = {}, realForm = false) {
  const wrapper = (realForm ? mount : shallowMount)(component, {
    props,
    global: {
      stubs: {
        'el-dialog': Slot,
        ElTabs: Slot,
        ElTabPane: Slot,
        'el-form': realForm ? ElForm : Slot,
        'el-form-item': realForm ? ElFormItem : Slot,
        'el-input': true,
        ElSelect: Slot,
        ElOption: true,
        ElTable: Table,
        ElTableColumn: true,
        'el-button': Slot,
        ElTooltip: Slot,
        ElTag: Slot,
        ElInputNumber: true,
        ElDatePicker: true,
        ElRadioGroup: Slot,
        ElRadio: Slot,
        ElAlert: { props: ['title'], template: '<div>{{ title }}</div>' },
        ElCollapse: true,
        ElCollapseItem: true,
        ElIcon: true,
        ElPagination: true,
        PatchInstallWizard: true,
        FileSelectorDialog: true
      },
      directives: { loading() {} }
    }
  })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, vm: wrapper.vm.$.setupState }
}
const host = { key: 'host-id', value: '192.0.2.10', assetType: 'linux' }
const history = {
  id: 'history-id',
  hosts: '192.0.2.10',
  hosts_id: 'host-id',
  patch_id: 'raw-patch',
  update_id: 'CVE-2026-1234',
  update_time: '2026-11-12T12:00:00Z',
  update_pkgs: '[{"old_pkg":"pkg-1","new_pkg":"pkg-2"}]'
}
beforeEach(async () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  vi.clearAllMocks()
  api.list.mockResolvedValue([
    {
      id: 'raw-set',
      name: '后端中文包集',
      packages: '["openssl==1.0.2"]',
      description: '后端中文说明'
    }
  ])
  api.createAndRunTask.mockResolvedValue({ data: { id: 'scheduled-id', status: 'CREATED' } })
  api.startInstall.mockResolvedValue([{ runId: 'raw-run' }])
  api.getTask.mockResolvedValue({
    data: {
      id: 'raw-task',
      status: 'COMPLETED',
      errorMessage: '后端中文原因',
      packages: '[]',
      hostIds: '[]'
    }
  })
  api.getFailedHosts.mockResolvedValue({
    data: {
      failedHostIds: ['host-id'],
      preCheckFailed: [{ hostId: 'host-id', hostKey: '192.0.2.10', reason: '后端中文原因' }],
      installFailed: [],
      skipped: []
    }
  })
  api.getHistUpdatePkgs.mockResolvedValue({ data: { records: [history] } })
  api.getAllGroups.mockResolvedValue({ records: [] })
  api.getAllTags.mockResolvedValue({ records: [] })
  api.confirm.mockResolvedValue('confirm')
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.useRealTimers()
  vi.unstubAllGlobals()
  await setLocale('zh-CN', { persist: false })
})

describe('Linux install and rollback language changes', () => {
  it('refreshes only existing real form errors, keeps package set drafts, and saves original values', async () => {
    const { vm } = await open(PackageSet, {}, true)
    vm.handleCreatePackageSet()
    await flushPromises()
    vm.editForm.description = '保留中文草稿'
    vm.editForm.packagesText = 'openssl==1.0.2'
    await expect(vm.editFormRef.validateField('name')).rejects.toBeTruthy()
    const nameField = vm.editFormRef.fields.find(field => field.prop === 'name')
    const untouched = vm.editFormRef.fields.filter(field => field.prop !== 'name')
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(nameField.validateMessage).toBe('Enter a package set name')
    expect(untouched.every(field => field.validateState === '')).toBe(true)
    expect(vm.editForm.description).toBe('保留中文草稿')
    expect(vm.editForm.packagesText).toBe('openssl==1.0.2')
    expect(api.list).toHaveBeenCalledTimes(1)
    vm.editForm.name = '原始包集名'
    await vm.submitEditForm()
    await flushPromises()
    expect(api.save).toHaveBeenCalledWith({
      id: null,
      name: '原始包集名',
      osType: 'linux',
      source: 'custom',
      description: '保留中文草稿',
      packages: '["openssl==1.0.2"]'
    })
  })

  it('preserves package set scheduling drafts and submits the original target and set IDs', async () => {
    const { vm } = await open(PackageSet)
    vm.selectedHosts = [host]
    vm.installForm.packageSetId = 'raw-set'
    vm.scheduleDate = '2099-12-31'
    vm.scheduleHour = '22'
    vm.scheduleMinute = '05'
    vm.installForm.batchSize = 17
    vm.activeTab = 'install'
    await flushPromises()
    const draft = { ...vm.installForm }
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.installForm).toEqual(draft)
    expect(vm.selectedHosts).toEqual([host])
    expect(vm.selectedPackageSet.name).toBe('后端中文包集')
    expect(api.createAndRunTask).not.toHaveBeenCalled()
    await vm.handleStartOneClickInstall()
    expect(api.confirm.mock.calls[0][0]).toContain('2099-12-31 22:05:00')
    expect(api.createAndRunTask).toHaveBeenCalledWith({
      targets: [host],
      scheduledTime: '2099-12-31 22:05:00',
      batchSize: 17,
      packageSetId: 'raw-set'
    })
  })

  it('keeps scheduled patch selections, step and package entries while translating loaded step titles', async () => {
    const { vm } = await open(Schedule, {
      visible: true,
      selectedPatches: [{ patch_id: 'raw-patch' }]
    })
    vm.selectedHosts = [{ hostId: 'host-id', hostKey: '192.0.2.10' }]
    vm.affectedPackagesRaw = [{ file_name: 'openssl-1.0.2.x86_64.rpm' }]
    vm.currentStep = 1
    vm.scheduleDate = '2099-12-31'
    vm.scheduleHour = '22'
    vm.scheduleMinute = '05'
    vm.batchSize = 3
    vm.packageSearchText = 'openssl'
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.currentStep).toBe(1)
    expect(vm.wizardSteps[1].title).toBe('2. Configure schedule and batches')
    expect(vm.packageSearchText).toBe('openssl')
    expect(vm.resolvedPackages).toEqual(['openssl-1.0.2.x86_64'])
    expect(api.getAffectedPackages).not.toHaveBeenCalled()
    await vm.handleSubmit()
    expect(api.createAndRunTask).toHaveBeenCalledWith({
      targets: [
        {
          hostId: 'host-id',
          hostKey: '192.0.2.10',
          key: 'host-id',
          value: '192.0.2.10',
          assetType: 'linux'
        }
      ],
      packages: ['openssl-1.0.2.x86_64'],
      scheduledTime: '2099-12-31 22:05:00',
      batchSize: 3
    })
  })

  it('preserves RPM paths and hosts and reads polling feedback in the language at completion', async () => {
    const { vm } = await open(LocalInstall)
    const files = [
      { name: '中文包.rpm', path: '原始目录/中文包.rpm' },
      { name: 'pkg.rpm', path: 'raw/pkg.rpm' }
    ]
    vm.handleFilesConfirm(files)
    vm.selectedHosts = [host]
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.selectedFiles).toEqual(files)
    expect(vm.selectedHosts).toEqual([host])
    expect(api.startInstall).not.toHaveBeenCalled()
    await vm.handleStartInstall()
    expect(api.startInstall).toHaveBeenCalledWith({
      hosts: '[{"host_id":"host-id","host_key":"192.0.2.10"}]',
      file_list: '["原始目录/中文包.rpm","raw/pkg.rpm"]'
    })
    const options = api.startPolling.mock.calls[0][1]
    expect(options.successMessage).toBe('Installation task succeeded')
    await setLocale('zh-CN', { persist: false })
    expect(options.successMessage).toBe('安装任务执行成功')
    expect(api.startPolling.mock.calls[0][0]).toBe('raw-run')
  })

  it('keeps loaded task details and raw errors without restarting task polling on a language change', async () => {
    const { vm, wrapper } = await open(TaskDetail, { visible: true, taskId: 'raw-task' })
    vm.activeCollapseNames = ['raw-host']
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.taskDetail.errorMessage).toBe('后端中文原因')
    expect(vm.activeCollapseNames).toEqual(['raw-host'])
    expect(wrapper.text()).toContain('Automatic batch installation completed')
    expect(api.getTask).toHaveBeenCalledExactlyOnceWith('raw-task')
  })

  it('translates persistent local load errors and leaves backend error text intact', async () => {
    api.getTask.mockResolvedValueOnce({ data: null })
    const { vm } = await open(TaskDetail, { visible: true, taskId: 'missing-task' })
    expect(vm.loadError).toBe('任务不存在或已无法访问')
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.loadError).toBe('Task not found or no longer accessible')
    expect(api.getTask).toHaveBeenCalledTimes(1)
    api.getTask.mockRejectedValueOnce(new Error('后端中文读取错误'))
    await vm.retryLoadTask()
    await setLocale('zh-CN', { persist: false })
    expect(vm.loadError).toBe('后端中文读取错误')
  })

  it('retains failure filters and matching backend records when group labels translate', async () => {
    const { vm } = await open(FailedHosts, { modelValue: true, taskId: 'raw-task' })
    vm.keyword = '中文原因'
    vm.selectedGroup = 'preCheckFailed'
    await flushPromises()
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.filteredGroups[0].label).toBe('Precheck failed')
    expect(vm.filteredGroups[0].rows[0].reason).toBe('后端中文原因')
    expect(vm.keyword).toBe('中文原因')
    expect(vm.selectedGroup).toBe('preCheckFailed')
    expect(api.getFailedHosts).toHaveBeenCalledExactlyOnceWith('raw-task')
  })

  it('keeps rollback history, selection and wizard identifiers while translating saved local summaries', async () => {
    const { vm } = await open(Rollback)
    vm.selectedRows = [vm.allData[0]]
    await vm.openRollbackWizard(vm.selectedRows)
    const ids = [...vm.rollbackHistUpdateIds]
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.rollbackSelectionSummary[0].secondary).toContain('1 hosts')
    expect(vm.rollbackSelectionSummary[0].secondary).toContain('1 packages')
    expect(vm.rollbackHistUpdateIds).toEqual(ids)
    expect(vm.selectedIds).toEqual(['history-id'])
    expect(vm.rollbackTaskPatches[0].patch_id).toBe('raw-patch')
    expect(api.getHistUpdatePkgs).toHaveBeenCalledTimes(1)
    vm.handleDelete(vm.selectedRows[0])
    await flushPromises()
    expect(api.deleteHistUpdatePkgs).toHaveBeenCalledExactlyOnceWith(['history-id'])
  })
})
