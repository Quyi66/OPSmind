import { createRequire } from 'node:module'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { setLocale, t } from '@/core/i18n'
import Restart from '@/modules/patches/windows-patch/components/install-wizard/WinPatchInstallWizardRestartStep.vue'
import Wsus from '@/modules/patches/windows-patch/components/wsus/WinPatchWsusConfigDialog.vue'
import { useWinPatchInstallWizard } from '@/modules/patches/windows-patch/composables/useWinPatchInstallWizard'
import { useWinPatchRollbackWizard } from '@/modules/patches/windows-patch/composables/useWinPatchRollbackWizard'
import { WIN_PATCH_SEVERITY_OPTIONS, WIN_PATCH_INSTALL_WIZARD_STEPS } from '@/modules/patches/windows-patch/constants'

const api = vi.hoisted(() => ({ createInstallTask: vi.fn(), createRollbackTask: vi.fn(), createScanTask: vi.fn(), getTaskDetail: vi.fn(), executeTaskStep: vi.fn(), skipTaskStep: vi.fn(), updateTaskScript: vi.fn(), uploadTaskScript: vi.fn(), saveWsusConfig: vi.fn() }))
vi.mock('@/modules/patches/windows-patch/api', () => ({ winPatchApi: api }))
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }))
const { ElForm, ElFormItem } = createRequire(import.meta.url)('element-plus/lib/components/form/index.js')
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const wrappers = []
function open(component, props = {}, extra = {}) {
  const wrapper = shallowMount(component, { props, global: { stubs: { 'el-dialog': Slot, 'el-form': Slot, 'el-form-item': Slot, 'el-button': Slot, I18nT: false, ...extra }, directives: { loading() {} } } })
  wrappers.push(wrapper)
  return { wrapper, vm: wrapper.vm.$.setupState }
}
function wizard(useWizard) {
  let result
  const wrapper = mount(defineComponent({ setup() {
    result = useWizard({ selectedRows: ref([{ patchStatusId: 'raw-patch', histUpdateId: 'raw-history', hostId: 'raw-host' }]) })
    return () => null
  } }))
  wrappers.push(wrapper)
  return result
}
beforeEach(async () => {
  vi.resetAllMocks()
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  await setLocale('zh-CN', { persist: false })
})

describe('Windows patch workflow language changes', () => {
  it('updates imported metadata without changing severity values or wizard identities', async () => {
    const values = WIN_PATCH_SEVERITY_OPTIONS.map(option => option.value)
    const steps = WIN_PATCH_INSTALL_WIZARD_STEPS.map(step => step.key)
    expect(WIN_PATCH_SEVERITY_OPTIONS[0].label).toBe('严重')
    await setLocale('en-US', { persist: false })
    expect(WIN_PATCH_SEVERITY_OPTIONS[0].label).toBe('Critical')
    expect(WIN_PATCH_INSTALL_WIZARD_STEPS[0].title).toBe('Installation confirmation')
    expect(WIN_PATCH_SEVERITY_OPTIONS.map(option => option.value)).toEqual(values)
    expect(WIN_PATCH_INSTALL_WIZARD_STEPS.map(step => step.key)).toEqual(steps)
  })

  it('updates default restart prompts and preserves a partial draft without enabling restart', async () => {
    const { wrapper, vm } = open(Restart, { modelValue: { reboot: false, rescanAfter: false }, confirmMode: true })
    vm.updateConfirmField('reboot', '确认重')
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.text()).toContain('Restart and rescan policy')
    expect(vm.displayProps.rebootConfirmKeyword).toBe(t('patches.linux.confirmRestart'))
    expect(vm.rebootConfirmText).toBe('确认重')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    vm.updateConfirmField('reboot', vm.displayProps.rebootConfirmKeyword)
    expect(wrapper.emitted('update:modelValue').at(-1)[0]).toEqual({ reboot: true, rescanAfter: false })
  })

  it('preserves confirmed restart and rescan across a language change without emitting actions', async () => {
    const { wrapper, vm } = open(Restart, { modelValue: { reboot: true, rescanAfter: true }, confirmMode: true })
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.resolvedValue).toEqual({ reboot: true, rescanAfter: true })
    expect(vm.rebootConfirmText).toBe(vm.displayProps.rebootConfirmKeyword)
    expect(vm.rescanConfirmText).toBe('Confirm rescan')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('renders complete confirmation sentences and keeps rescan matching exact across locales', async () => {
    const { wrapper, vm } = open(Restart, { modelValue: { reboot: false, rescanAfter: false }, confirmMode: true })
    const labels = () => wrapper.findAll('.win-patch-restart-step__confirm-label').map(label => label.text().replace(/\s+/g, ' ').trim())
    expect(labels()).toEqual(['请输入 确认重启 进行确认', '请输入 确认重扫 进行确认'])
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(labels()).toEqual(['Enter "Confirm restart" to confirm', 'Enter "Confirm rescan" to confirm'])
    vm.updateConfirmField('rescanAfter', 'CONFIRM RESCAN')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    vm.updateConfirmField('rescanAfter', 'Confirm rescan')
    expect(wrapper.emitted('update:modelValue').at(-1)[0]).toEqual({ reboot: false, rescanAfter: true })
    await wrapper.setProps({ modelValue: { reboot: false, rescanAfter: true } })
    const events = wrapper.emitted('update:modelValue').length
    await setLocale('zh-CN', { persist: false })
    await flushPromises()
    expect(vm.rescanConfirmText).toBe('确认重扫')
    vm.updateConfirmField('rescanAfter', 'Confirm rescan')
    expect(wrapper.emitted('update:modelValue')).toHaveLength(events)
    await wrapper.setProps({ modelValue: { reboot: false, rescanAfter: false }, rescanConfirmKeyword: 'CONFIRM RESCAN' })
    vm.updateConfirmField('rescanAfter', 'CONFIRM RESCAN')
    expect(vm.rescanConfirmText).toBe('CONFIRM RESCAN')
    expect(wrapper.emitted('update:modelValue').at(-1)[0]).toEqual({ reboot: false, rescanAfter: true })
  })

  it('retains caller-provided restart copy', async () => {
    const { vm } = open(Restart, { title: '自定义标题', rebootConfirmKeyword: '用户确认' })
    await setLocale('en-US', { persist: false })
    expect(vm.displayProps.title).toBe('自定义标题')
    expect(vm.displayProps.rebootConfirmKeyword).toBe('用户确认')
  })

  it('retains a previously shown localized phrase but discards an obsolete custom keyword', async () => {
    const { wrapper, vm } = open(Restart, { modelValue: { reboot: false, rescanAfter: false }, confirmMode: true })
    const previous = vm.displayProps.rebootConfirmKeyword
    await setLocale('en-US', { persist: false })
    vm.updateConfirmField('reboot', previous)
    expect(wrapper.emitted('update:modelValue').at(-1)[0].reboot).toBe(true)
    await wrapper.setProps({ rebootConfirmKeyword: '自定义新确认词' })
    const emitted = wrapper.emitted('update:modelValue').length
    vm.updateConfirmField('reboot', previous)
    expect(wrapper.emitted('update:modelValue')).toHaveLength(emitted)
    vm.updateConfirmField('reboot', '自定义新确认词')
    expect(wrapper.emitted('update:modelValue').at(-1)[0].reboot).toBe(true)
  })

  it('revalidates only invalid WSUS fields and saves the same draft including false HTTPS', async () => {
    const { wrapper, vm } = open(Wsus, { modelValue: false }, { 'el-form': ElForm, 'el-form-item': ElFormItem })
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    vm.form.description = '后端原始描述'
    await vm.formRef.validateField('wsusUrl').catch(() => {})
    expect(vm.formRef.fields.find(field => field.prop === 'wsusUrl').validateMessage).toBe('请输入 WSUS 地址')
    const untouched = vm.formRef.fields.find(field => field.prop === 'wsusPort')
    expect(untouched.validateState).toBe('')
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.formRef.fields.find(field => field.prop === 'wsusUrl').validateMessage).toBe('Enter the WSUS address')
    expect(untouched.validateState).toBe('')
    expect(vm.form.description).toBe('后端原始描述')
    vm.form.wsusUrl = 'http://原始-wsus'
    api.saveWsusConfig.mockResolvedValue({ data: { id: 'saved' } })
    await vm.handleSubmit()
    expect(api.saveWsusConfig).toHaveBeenCalledExactlyOnceWith({ wsusUrl: 'http://原始-wsus', wsusPort: 8530, useSsl: false, description: '后端原始描述' })
  })

  it.each([
    ['INSTALL', useWinPatchInstallWizard, 'updateInstallOptions', 'createInstallTask'],
    ['ROLLBACK', useWinPatchRollbackWizard, 'updateRollbackOptions', 'createRollbackTask']
  ])('%s keeps scripts, file identity and backend restart confirmation after switching', async (kind, useWizard, updateOptions, createTask) => {
    let status = 'CREATED'
    const task = () => ({ id: 'raw-task', taskType: kind, status })
    api[createTask].mockImplementation(async () => ({ data: task() }))
    api.getTaskDetail.mockImplementation(async () => ({ data: { task: task(), steps: [] } }))
    const advance = async (_id, _task, { stepKey }) => {
      status = { PRE_CHECK: 'PRE_CHECK_DONE', INSTALL: 'INSTALL_DONE', ROLLBACK: 'ROLLBACK_DONE', RESTART: 'RESTART_DONE', VALIDATE: 'COMPLETED' }[stepKey]
      return { data: task() }
    }
    api.executeTaskStep.mockImplementation(advance)
    api.skipTaskStep.mockImplementation(advance)
    const state = wizard(useWizard)
    const content = "Write-Output '用户脚本 {原始参数}'"
    const file = new File(['原始校验'], '用户校验.ps1', { type: 'text/plain' })
    state.updatePreScriptConfig({ mode: 'edit', content })
    state.updateValidateScriptConfig({ mode: 'upload', file, fileName: file.name })
    state[updateOptions]({ reboot: true, rescanAfter: false })
    await setLocale('en-US', { persist: false })
    await state.startExecution()
    expect(state.pipelineStatus.value).toBe('success')
    expect(api.updateTaskScript).toHaveBeenCalledWith('raw-task', 'pre-check', content)
    expect(api.uploadTaskScript).toHaveBeenCalledWith('raw-task', 'validate', file)
    expect(api.uploadTaskScript.mock.calls[0][2]).toBe(file)
    expect(api.executeTaskStep.mock.calls.find(([, , options]) => options.stepKey === 'RESTART')[2]).toMatchObject({ stepKey: 'RESTART', taskType: kind, confirmText: '确认重启' })
    expect(api[createTask]).toHaveBeenCalledTimes(1)
    expect(state.validateScriptConfig.value.fileName).toBe('用户校验.ps1')
    state.openRunResult('raw-run', t('patches.windows.executeRollback'), 'ROLLBACK')
    await setLocale('zh-CN', { persist: false })
    expect(state.currentRunTitle.value).toBe('执行回滚')
    expect(state.currentRunId.value).toBe('raw-run')
  })

  it.each([
    [useWinPatchInstallWizard, 'createInstallTask', '创建安装任务失败，请稍后重试', 'Failed to create the installation task. Please try again later.'],
    [useWinPatchRollbackWizard, 'createRollbackTask', '创建回滚任务失败，请稍后重试', 'Failed to create the rollback task. Please try again later.']
  ])('updates a local task creation failure without recreating the task', async (useWizard, createTask, chinese, english) => {
    api[createTask].mockResolvedValue({ data: {} })
    const state = wizard(useWizard)
    await state.startExecution()
    expect(state.taskErrorMessage.value).toBe(chinese)
    await setLocale('en-US', { persist: false })
    expect(state.taskErrorMessage.value).toBe(english)
    expect(api[createTask]).toHaveBeenCalledTimes(1)
  })

  it('retains a backend task failure verbatim', async () => {
    api.createInstallTask.mockRejectedValue({ response: { data: { message: '后端中文原始错误' } } })
    const state = wizard(useWinPatchInstallWizard)
    await state.startExecution()
    await setLocale('en-US', { persist: false })
    expect(state.taskErrorMessage.value).toBe('后端中文原始错误')
  })

  it('uses the completion locale for an in-flight script error and retains its local key', async () => {
    let failUpload
    api.createInstallTask.mockResolvedValue({ data: { id: 'raw-task', taskType: 'INSTALL', status: 'CREATED' } })
    api.uploadTaskScript.mockImplementation(() => new Promise((_resolve, reject) => { failUpload = reject }))
    const state = wizard(useWinPatchInstallWizard)
    state.updatePreScriptConfig({ mode: 'upload', file: new File(['用户脚本'], '原始文件.ps1'), fileName: '原始文件.ps1' })
    const pending = state.startExecution()
    await flushPromises()
    await setLocale('en-US', { persist: false })
    failUpload({})
    await pending
    expect(state.taskErrorMessage.value).toBe('Failed to upload Pre-check script')
    await setLocale('zh-CN', { persist: false })
    expect(state.taskErrorMessage.value).toBe('预检查脚本上传失败')
    expect(api.createInstallTask).toHaveBeenCalledTimes(1)
  })

  it('keeps the current step name reactive in a locally generated execution failure', async () => {
    api.createInstallTask.mockResolvedValue({ data: { id: 'raw-task', taskType: 'INSTALL', status: 'CREATED' } })
    api.skipTaskStep.mockRejectedValue({})
    const state = wizard(useWinPatchInstallWizard)
    await state.startExecution()
    expect(state.taskErrorMessage.value).toBe('跳过预检查失败')
    await setLocale('en-US', { persist: false })
    expect(state.taskErrorMessage.value).toBe(`Skip ${t('patches.linux.precheck')} failed`)
    expect(api.createInstallTask).toHaveBeenCalledTimes(1)
  })

  it('retains a rescan submission failure as a local message after a completed rollback', async () => {
    let status = 'CREATED'
    const task = () => ({ id: 'raw-task', taskType: 'ROLLBACK', status })
    api.createRollbackTask.mockImplementation(async () => ({ data: task() }))
    api.getTaskDetail.mockImplementation(async () => ({ data: { task: task(), steps: [] } }))
    const advance = async (_id, _task, { stepKey }) => {
      status = { PRE_CHECK: 'PRE_CHECK_DONE', ROLLBACK: 'ROLLBACK_DONE', RESTART: 'RESTART_DONE', VALIDATE: 'COMPLETED' }[stepKey]
      return { data: task() }
    }
    api.executeTaskStep.mockImplementation(advance)
    api.skipTaskStep.mockImplementation(advance)
    api.createScanTask.mockRejectedValue({})
    const state = wizard(useWinPatchRollbackWizard)
    state.updateRollbackOptions({ reboot: false, rescanAfter: true })
    await state.startExecution()
    expect(state.taskErrorMessage.value).toBe('回滚已完成，但提交补丁重扫失败：请稍后重新扫描')
    await setLocale('en-US', { persist: false })
    expect(state.taskErrorMessage.value).toBe('Rollback completed, but the patch rescan could not be submitted: Rescan later')
    expect(api.createScanTask).toHaveBeenCalledExactlyOnceWith(['raw-host'])
    expect(api.createRollbackTask).toHaveBeenCalledTimes(1)
  })

  it('renders the PowerShell example with literal braces and quotes in both languages', async () => {
    const source = "Get-HotFix | Where-Object { $_.HotFixID -eq 'KB5031364' }"
    expect(t('patches.windows.validateScriptExample')).toBe(`例如：${source}`)
    await setLocale('en-US', { persist: false })
    expect(t('patches.windows.validateScriptExample')).toBe(`Example: ${source}`)
  })
})
