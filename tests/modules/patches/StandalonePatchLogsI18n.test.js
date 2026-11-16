import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'
import { ElMessage } from 'element-plus'
import Logs from '@/modules/patches/views/OperationLogsPage.vue'
import ProcessLogs from '@/modules/patches/views/PatchProcessLogsPage.vue'
import Detail from '@/modules/patches/components/logs/PatchProcessLogDetailDialog.vue'

const api = vi.hoisted(() => ({ get: vi.fn(), getLogs: vi.fn(), getAuditLogs: vi.fn(), getAuditDetail: vi.fn(), getTask: vi.fn(), getTaskAuditHistoryAll: vi.fn() }))
vi.mock('@/modules/patches/api', () => ({ patchLogsApi: api, patchInstallApi: api }))
vi.mock('@/core/api', () => ({ useApi: () => ({ get: api.get }) }))
vi.mock('@/core/auth', () => ({ authService: { getTenantId: () => 'raw-tenant' } }))
vi.mock('@/utils/i18n', async original => ({ ...await original(), initTranslations: vi.fn().mockResolvedValue() }))
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({ default: { props: ['jobTitle', 'runId'], template: '<div />' } }))
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const wrappers = []
async function open(component, props = {}) {
  const wrapper = shallowMount(component, { props, global: { stubs: { 'el-dialog': Slot, 'el-form': Slot, 'el-form-item': Slot, 'el-button': Slot, 'el-table': Slot, 'el-table-column': { template: '<div />' }, 'el-alert': { props: ['title'], template: '<div>{{ title }}<slot /></div>' } }, directives: { loading() {} } } })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, vm: wrapper.vm.$.setupState }
}
const action = '#{app_vap.menu.patch_scan.title}'
const row = { run_id: 'raw-run', run_record: true, action, status: 'COMPLETED', message: '后端中文日志', target_hosts: '中文主机,raw-host' }
beforeEach(async () => {
  vi.resetAllMocks()
  api.getLogs.mockResolvedValue({ records: [row], total: 80 })
  api.getAuditLogs.mockResolvedValue({ data: { content: [{ id: 'raw-task', status: 'COMPLETED', taskType: 'rollback', createdBy: '原始操作人' }], totalElements: 80 } })
  api.getAuditDetail.mockResolvedValue({ data: { task: { id: 'raw-task', status: 'COMPLETED', taskType: 'rollback', errorMessage: '后端错误', preCheckScript: '用户脚本 {raw}', executeRunId: 'raw-run' }, steps: [{ step: 'ROLLBACK', status: 'SUCCESS', runId: 'raw-run' }], logs: [] } })
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  await setLocale('zh-CN', { persist: false })
})

describe('Standalone patch log language changes', () => {
  it.each([
    ['downloadReport', ['raw', 'xlsx'], 'Failed to download report: Unknown error'],
    ['downloadInstallReport', [], 'Failed to download installation report: Unknown error'],
    ['downloadRollbackReport', [], 'Failed to download rollback report: Unknown error']
  ])('%s translates a local fallback for an error without backend text', async (handler, args, expected) => {
    const { vm } = await open(Logs)
    api.get.mockRejectedValue({})
    await setLocale('en-US', { persist: false })
    await vm[handler](row, ...args)
    expect(ElMessage.error).toHaveBeenLastCalledWith(expected)
  })
  it('preserves Chinese action query values and report classification while updating an open run title', async () => {
    const { vm } = await open(Logs)
    vm.actionFilter = '#{app_vap.menu.patch_install.title}'
    vm.searchText = '用户日志'
    vm.handleFilterChange()
    await flushPromises()
    vm.pagination.page = 3
    vm.handleViewRunResult(row)
    const requests = api.getLogs.mock.calls.length
    expect(vm.canShowScanReport(row)).toBe(true)
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.translateAction(action)).toBe('Patch scan')
    expect(vm.selectedJobTitle).toBe('Patch scan')
    expect(vm.selectedRunId).toBe('raw-run')
    expect(vm.runResultDialogVisible).toBe(true)
    expect(vm.canShowScanReport(row)).toBe(true)
    expect(vm.buildQueryParams()).toMatchObject({ page: 3, action: '补丁安装', filter: 'message|username:*用户日志*' })
    expect(api.getLogs).toHaveBeenCalledTimes(requests)
    await vm.loadData()
    expect(api.getLogs.mock.calls.at(-1)[0].action).toBe('补丁安装')
    expect(vm.tableData[0].message).toBe('后端中文日志')
  })

  it('keeps rollback report availability for a legacy action key in English', async () => {
    const { vm } = await open(Logs)
    await setLocale('en-US', { persist: false })
    const rollback = { ...row, action: '#{app_vap.menu.patch_rollback.title}' }
    expect(vm.isPatchRollback(rollback)).toBe(true)
    expect(vm.canShowRollbackReport(rollback)).toBe(true)
    vm.actionFilter = rollback.action
    vm.handleFilterChange()
    await flushPromises()
    expect(api.getLogs.mock.calls.at(-1)[0].action).toBe('补丁回滚')
  })

  it('preserves process filters, pagination and the selected detail across locale changes', async () => {
    const { vm } = await open(ProcessLogs)
    vm.filters.taskType = 'rollback'
    vm.filters.operator = ' 原始操作人 '
    vm.handleSearch()
    await flushPromises()
    vm.pagination.page = 3
    vm.openDetail(vm.tableData[0])
    const query = vm.buildQueryParams()
    const requests = api.getAuditLogs.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.buildQueryParams()).toEqual(query)
    expect(vm.buildQueryParams()).toMatchObject({ taskType: 'rollback', operator: '原始操作人', page: 2 })
    expect(vm.detailVisible).toBe(true)
    expect(vm.selectedTask.id).toBe('raw-task')
    expect(api.getAuditLogs).toHaveBeenCalledTimes(requests)
  })

  it.each([[Logs, 'getLogs', 'Failed to load change logs. Please try again.'], [ProcessLogs, 'getAuditLogs', 'Failed to load process logs. Please try again.']])('updates a persistent loading failure without retrying automatically', async (component, request, english) => {
    api[request].mockRejectedValue(new Error('offline'))
    const { vm } = await open(component)
    expect(vm.loadError).toBeTruthy()
    await setLocale('en-US', { persist: false })
    expect(vm.loadError).toBe(english)
    expect(api[request]).toHaveBeenCalledTimes(1)
  })

  it('updates the open pipeline result title without resetting the chosen step or fetching again', async () => {
    const { vm } = await open(Detail, { modelValue: true, task: { id: 'raw-task', taskType: 'rollback' } })
    await vm.load()
    vm.currentStep = 4
    const item = vm.pipelineItems.find(item => item.key === 'rollback')
    vm.openExecuteResult('raw-run', item.label, item.key)
    await setLocale('en-US', { persist: false })
    expect(vm.executeJobTitle).toBe(vm.operationConfig.executeTitle)
    expect(vm.executeJobTitle).not.toContain('回滚')
    expect(vm.executeRunId).toBe('raw-run')
    expect(vm.currentStep).toBe(4)
    expect(vm.taskErrorMessage).toBe('后端错误')
    expect(vm.preCheckScript).toBe('用户脚本 {raw}')
    expect(api.getAuditDetail).toHaveBeenCalledTimes(1)
  })
})
