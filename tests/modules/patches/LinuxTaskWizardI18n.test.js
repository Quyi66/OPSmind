import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { defineComponent, nextTick, ref, toRaw } from 'vue'
import { setLocale, t, currentLocale, i18n } from '@/core/i18n'
import Wizard from '@/modules/patches/components/patch-task/wizard/PatchInstallWizard.vue'
import Summary from '@/modules/patches/components/patch-task/PatchTaskSummaryRow.vue'
import Precheck from '@/modules/patches/components/patch-task/PatchTaskPreCheckResult.vue'
import { useLazyDisplayList } from '@/modules/patches/composables/useLazyDisplayList'
import { usePatchTaskDisplay } from '@/modules/patches/components/patch-task/wizard/usePatchTaskDisplay'
import { getPatchTaskDisplayConfig } from '@/modules/patches/constants/task-display'

const api = vi.hoisted(() => ({
  getPatchRebootOnHost: vi.fn(),
  createTask: vi.fn(),
  createPkgUpdateTask: vi.fn(),
  getTask: vi.fn(),
  skipPreCheck: vi.fn(),
  updateScript: vi.fn(),
  getRestartOptions: vi.fn(),
  uploadScript: vi.fn(),
  confirmRestart: vi.fn(),
  getAllGroups: vi.fn(),
  getAllTags: vi.fn(),
  error: vi.fn()
}))
vi.mock('@/modules/patches/api', () => ({ patchInstallApi: api }))
vi.mock('@/modules/asset/api', () => ({ dataManageApi: api, agentApi: {} }))
vi.mock('element-plus', () => ({
  ElMessage: Object.assign(options => api.error(options), {
    success: vi.fn(),
    error: api.error,
    warning: vi.fn()
  }),
  ElMessageBox: { confirm: vi.fn() }
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { template: '<div />' }
}))
const wrappers = []
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
async function open(component = Wizard, props = {}) {
  const wrapper = shallowMount(component, {
    props: component === Wizard ? { visible: true, ...props } : props,
    global: {
      stubs: {
        ElDialog: Slot,
        ElInput: true,
        ElSelect: true,
        ElOption: true,
        ElTable: true,
        ElTableColumn: true,
        ElPagination: true,
        ElIcon: true,
        ElButton: Slot,
        ElCollapse: Slot,
        ElCollapseItem: Slot,
        ElTag: Slot
      },
      directives: { loading() {} }
    }
  })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, vm: wrapper.vm.$.setupState }
}
beforeEach(async () => {
  vi.clearAllMocks()
  api.getPatchRebootOnHost.mockResolvedValue({ data: { rebootStatus: 'system' } })
  api.getAllGroups.mockResolvedValue({ records: [] })
  api.getAllTags.mockResolvedValue({ records: [] })
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.useRealTimers()
  await setLocale('zh-CN', { persist: false })
})

describe('Linux task wizard language changes', () => {
  it('sends unchanged script text and the original uploaded File after switching languages', async () => {
    const { vm } = await open()
    const content = '#!/bin/bash\n# 用户脚本 {{原始参数}} ${HOME}\necho 中文'
    const file = new File(['echo 原始校验'], '用户校验.sh', { type: 'text/plain' })
    Object.defineProperty(file, 'text', { value: async () => 'echo 原始校验' })
    vm.installConfig.preScript = content
    vm.scriptModes.post = 'upload'
    await vm.handleScriptUpload('post', { target: { files: [file], value: 'raw-input' } })
    await flushPromises()
    vm.createdTaskId = 'raw-task'
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.createdTaskId).toBe('raw-task')
    await vm.syncScriptConfig('pre')
    await vm.syncScriptConfig('post')
    expect(api.updateScript).toHaveBeenCalledExactlyOnceWith('raw-task', 'pre-check', content)
    expect(api.uploadScript).toHaveBeenCalledExactlyOnceWith('raw-task', 'validate', file)
    expect(api.uploadScript.mock.calls[0][2]).toBe(file)
    expect(vm.scriptFiles.post).toBe('用户校验.sh')
    expect(api.createTask).not.toHaveBeenCalled()
  })

  it('preserves scripts, the active step and valid typed restart confirmation without changing the backend token', async () => {
    const { vm } = await open(Wizard, {
      patchesToInstall: [{ patch_id: 'raw-patch', rebootStatus: 'system' }]
    })
    vm.installStep = 3
    vm.installConfig.preScript = '#!/bin/bash\n# 用户脚本 {{保留}} ${HOME}\necho 中文'
    vm.installConfig.postScript = 'echo 校验原文'
    vm.installConfig.restartPolicy = 'system'
    vm.restartConfirmText = vm.restartConfirmKeyword
    await nextTick()
    expect(vm.restartConfirmationValid).toBe(true)
    const draft = { ...vm.installConfig }
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.wizardDialogTitle).toBe('Patch installation wizard')
    expect(vm.wizardSteps[3].title).toBe('Configure restart policy')
    expect(vm.installConfig).toEqual(draft)
    expect(vm.installStep).toBe(3)
    expect(vm.restartConfirmKeyword).toBe('Confirm system restart')
    expect(vm.restartConfirmText).toBe('确认系统重启')
    expect(vm.restartConfirmationValid).toBe(true)
    expect(vm.restartConfirmSubmitText).toBe('确认重启')
    vm.installConfig.restartPolicy = 'service'
    await nextTick()
    expect(vm.restartConfirmationValid).toBe(false)
    vm.restartConfirmText = vm.restartConfirmKeyword
    await nextTick()
    expect(vm.restartConfirmationValid).toBe(true)
    expect(api.createTask).not.toHaveBeenCalled()
    expect(api.confirmRestart).not.toHaveBeenCalled()
    expect(api.getPatchRebootOnHost).not.toHaveBeenCalled()
  })

  it('translates cached restart advice without querying again or changing the selected host and patch', async () => {
    const { vm } = await open(Wizard, { patchesToInstall: [{ patch_id: 'raw-patch' }] })
    vm.confirmedHosts = [{ hostId: 'host-id', hostKey: '192.0.2.4', hostname: '后端主机名' }]
    await vm.loadRestartAdviceByHostPatch()
    expect(vm.restartOptions.restartLabel).toBe('系统重启')
    expect(vm.restartOptions.restartDescription).toContain('1 台目标主机')
    const key = vm.restartAdviceCacheKey
    const call = api.getPatchRebootOnHost.mock.calls[0][0]
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.restartOptions.restartLabel).toBe('System restart')
    expect(vm.restartOptions.restartDescription).toContain('1 target hosts')
    expect(vm.restartOptions.restartDescription).toContain('192.0.2.4')
    expect(vm.restartAdviceCacheKey).toBe(key)
    expect(vm.installConfig.restartPolicy).toBe('system')
    expect(api.getPatchRebootOnHost).toHaveBeenCalledTimes(1)
    expect(call).toMatchObject({ patchIds: ['raw-patch'], hostIp: '192.0.2.4' })
    expect(vm.confirmedHosts[0].hostId).toBe('host-id')
  })

  it('keeps open execution details on the same run while translating their local title', async () => {
    const { vm } = await open()
    vm.openPipelineResult('raw-run', '预检查', 'pre')
    expect(vm.currentExecuteJobTitle).toBe('预检查')
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.currentExecuteJobTitle).toBe('Precheck')
    expect(vm.currentExecuteRunId).toBe('raw-run')
    expect(vm.executeResultVisible).toBe(true)
  })

  it('renders backend restart errors as text and keeps fallback advice translatable without retrying', async () => {
    const rawError = '<img src=x onerror=alert(1)>后端错误'
    api.getPatchRebootOnHost.mockRejectedValueOnce({
      response: { status: 500, data: { message: rawError } }
    })
    const { vm } = await open(Wizard, {
      patchesToInstall: [{ patch_id: 'raw-patch', rebootStatus: 'system' }]
    })
    vm.confirmedHosts = [{ hostId: 'raw-host', hostKey: '192.0.2.4' }]
    await vm.loadRestartAdviceByHostPatch()
    const notice = api.error.mock.calls.at(-1)[0]
    expect(notice.dangerouslyUseHTMLString).toBeUndefined()
    const bubble = mount({ render: () => notice.message })
    wrappers.push(bubble)
    expect(bubble.find('img').exists()).toBe(false)
    expect(bubble.text()).toContain(rawError)
    await setLocale('en-US', { persist: false })
    expect(vm.restartOptions.restartDescription).toContain('No usable restart advice returned')
    expect(api.getPatchRebootOnHost).toHaveBeenCalledTimes(1)
  })

  it('translates a persistent local pipeline error while keeping its paused stage and dispatched action', async () => {
    const { vm } = await open()
    vi.useFakeTimers()
    vm.createdTaskId = 'raw-task'
    vm.isSkipped.pre = true
    api.skipPreCheck.mockResolvedValue({})
    api.getTask.mockResolvedValue({ data: {} })
    const execution = vm.startPipeline()
    await vi.advanceTimersByTimeAsync(6000)
    await execution
    expect(vm.pipelineStatus).toBe('paused')
    expect(vm.taskErrorMessage).toBe('未获取到任务状态')
    const requests = api.getTask.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.taskErrorMessage).toBe('Task status unavailable')
    expect(vm.pipelineStatus).toBe('paused')
    expect(api.getTask).toHaveBeenCalledTimes(requests)
    expect(api.skipPreCheck).toHaveBeenCalledExactlyOnceWith('raw-task')
    expect(api.createTask).not.toHaveBeenCalled()
  })

  it('renders local check labels in English while retaining expanded hosts and raw backend detail', async () => {
    const result = {
      results: [
        {
          host_id: 'raw-host',
          blockers: 1,
          checks: [{ id: 'disk', status: 'fail', detail: '后端中文磁盘原因' }]
        }
      ]
    }
    const { wrapper, vm } = await open(Precheck, { result })
    vm.activeCollapseNames = ['raw-host']
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.text()).toContain('Disk space')
    expect(wrapper.text()).toContain('后端中文磁盘原因')
    expect(vm.activeCollapseNames).toEqual(['raw-host'])
    expect(toRaw(wrapper.props('result'))).toBe(result)
  })

  it('updates omitted summary defaults after mounting and preserves the search value', async () => {
    const { wrapper } = await open(Summary, {
      label: '原始标题',
      items: [],
      total: 3,
      searchThreshold: 0,
      searchText: '用户查询'
    })
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.text()).toContain('No matching items')
    expect(wrapper.findComponent({ name: 'ElInput' }).attributes('placeholder')).toBe(
      'Search content...'
    )
    expect(wrapper.props('searchText')).toBe('用户查询')
    expect(wrapper.props('label')).toBe('原始标题')
  })

  it('preserves loaded summary pages and translated-name search matches until the user searches again', async () => {
    let display, list
    const summaries = Array.from({ length: 35 }, (_, index) => ({
      key: index,
      primary: `record-${index}`,
      get secondary() {
        return t('patches.linux.hostCount', { count: 1 })
      },
      getSearchText: locale => i18n.global.t('patches.linux.hostCount', { count: 1 }, { locale })
    }))
    wrappers.push(
      mount(
        defineComponent({
          setup() {
            display = usePatchTaskDisplay({
              taskMode: '',
              operationType: 'rollback',
              selectionSummaryItems: summaries,
              patchesToInstall: []
            })
            list = useLazyDisplayList(display.selectionDisplayItems, {
              initialCount: 20,
              stepCount: 20,
              getSearchContext: () => currentLocale.value,
              searchFn: (item, query, locale) => item.getSearchText(locale).includes(query)
            })
            return () => null
          }
        })
      )
    )
    list.searchText.value = '台主机'
    await nextTick()
    list.loadMore()
    expect(list.displayedList.value).toHaveLength(35)
    await setLocale('en-US', { persist: false })
    await nextTick()
    expect(display.selectionDisplayItems.value[0].secondary).toBe('1 hosts')
    expect(list.displayedList.value).toHaveLength(35)
    expect(list.searchText.value).toBe('台主机')
    list.searchText.value = 'missing'
    await nextTick()
    expect(list.displayedList.value).toHaveLength(0)
  })

  it('keeps task display configuration reactive for a previously obtained object', async () => {
    const config = getPatchTaskDisplayConfig('pkg_update')
    expect(config.dialogTitle).toBe('软件包更新向导')
    await setLocale('en-US', { persist: false })
    expect(config.dialogTitle).toBe('Package update wizard')
    expect(config.preScriptPlaceholder).toContain('#!/bin/bash')
  })

  it('refreshes an active search when the underlying collection is changed in place', async () => {
    let list
    const source = ref(['raw-first'])
    wrappers.push(
      mount(
        defineComponent({
          setup() {
            list = useLazyDisplayList(source)
            return () => null
          }
        })
      )
    )
    list.searchText.value = 'raw'
    await nextTick()
    expect(list.filteredList.value).toEqual(['raw-first'])
    source.value.push('raw-second')
    await nextTick()
    expect(list.filteredList.value).toEqual(['raw-first', 'raw-second'])
    source.value.splice(0, 1)
    await nextTick()
    expect(list.filteredList.value).toEqual(['raw-second'])
  })
})
