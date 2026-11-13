import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'
import Page from '@/modules/automation/views/job/JobSchedulePage.vue'
import Editor from '@/modules/automation/components/job/schedule/components/FlowEditor.vue'
import Viewer from '@/modules/automation/components/job/schedule/components/FlowInstanceViewer.vue'
import Selector from '@/modules/automation/components/job/schedule/components/GfsFileSelector.vue'
import * as api from '@/modules/automation/api/jao'
import * as gfs from '@/modules/automation/api/gfs'

vi.mock('@/modules/automation/api/jao', () => ({
  fetchFlows: vi.fn(),
  fetchFlowDetail: vi.fn(),
  fetchFlowInstances: vi.fn(),
  saveFlow: vi.fn(),
  createFlowInstance: vi.fn(),
  fetchFlowInstanceView: vi.fn(),
  fetchFlowHostResult: vi.fn()
}))
vi.mock('@/modules/automation/api/gfs', () => ({ listFiles: vi.fn() }))
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() },
  ElMessageBox: { confirm: vi.fn().mockResolvedValue('confirm') },
  useZIndex: () => ({ nextZIndex: () => 2000 })
}))
const wrappers = []
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const raw = value => JSON.parse(JSON.stringify(value))
const flow = {
  id: 'flow-id',
  name: '原始流程名',
  hosts: [{ key: 'host-id', value: '中文主机', assetType: 'linux' }],
  steps: [
    {
      id: 'step-id',
      name: '',
      type: 'script',
      autoNext: false,
      configJson:
        '{"tasks":[{"scripts":[{"location":"原目录/a.sh","argline":"--raw ${scope}"}]}],"verbosity":2,"taskTimeout":33}'
    }
  ],
  globalParamsJson:
    '[{"id":"param-id","name":"scope","label":"中文参数","defaultValue":"用户值","secret":true}]'
}
async function open(component, props = {}) {
  const wrapper = shallowMount(component, {
    props,
    global: {
      stubs: {
        ElDialog: Slot,
        ElDrawer: Slot,
        ElForm: Slot,
        ElFormItem: Slot,
        ElRow: Slot,
        ElCol: Slot,
        ElTable: true,
        ElTableColumn: true,
        ElTag: Slot,
        ElBreadcrumb: Slot,
        ElBreadcrumbItem: Slot
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
  api.fetchFlows.mockResolvedValue({ data: [flow, { id: 'unnamed-flow' }] })
  api.fetchFlowDetail.mockResolvedValue({ data: flow })
  api.fetchFlowInstances.mockResolvedValue({
    data: Array.from({ length: 35 }, (_, index) => ({
      id: `instance-${index}`,
      status: 'COMPLETED',
      updatedAt: `2026-11-12 10:${String(index).padStart(2, '0')}:00`
    }))
  })
  api.saveFlow.mockResolvedValue({ data: { id: 'flow-id' } })
  api.fetchFlowInstanceView.mockResolvedValue({
    data: {
      instance: { ...flow, status: 'COMPLETED' },
      statusView: [{ hostId: 'host-id', hostkey: '中文主机', 'step-id': 'ok' }]
    }
  })
  api.fetchFlowHostResult.mockResolvedValue({ data: { result: [] } })
  gfs.listFiles.mockResolvedValue([{ path: '原目录/a.sh', name: '原脚本.sh' }])
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  await setLocale('zh-CN', { persist: false })
})

describe('flow language state and raw execution configuration', () => {
  it('keeps applied fallback-title searches, sorting, status and pagination', async () => {
    const { vm } = await open(Page)
    vm.activeFlowId = 'flow-id'
    await flushPromises()
    vm.flowFilter = '未命名流程'
    vm.instanceKeyword = '未命名实例'
    vm.instanceStatusFilter = 'success'
    await flushPromises()
    vm.currentPage = 2
    const flows = vm.visibleFlows
    const instances = vm.filteredInstances
    const calls = api.fetchFlowInstances.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.visibleFlows).toBe(flows)
    expect(vm.visibleFlows[0].name).toBe('Unnamed flow')
    expect(vm.filteredInstances).toBe(instances)
    expect(vm.currentPage).toBe(2)
    expect(vm.getInstanceStatusLabel('COMPLETED')).toBe('Completed')
    expect(vm.instanceStatusFilter).toBe('success')
    expect(api.fetchFlowInstances).toHaveBeenCalledTimes(calls)
    expect(api.saveFlow).not.toHaveBeenCalled()
    expect(api.createFlowInstance).not.toHaveBeenCalled()
  })

  it('keeps an editor draft, folding and parameter values and saves source names and script syntax', async () => {
    const { wrapper, vm } = await open(Editor, {
      modelValue: false,
      flowId: 'flow-id',
      mode: 'edit'
    })
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    vm.flow.name = '编辑后的中文名'
    vm.flow.globalParams[0].defaultValue = '编辑后的值 ${scope}'
    vm.toggleStepFold(0)
    const draft = raw(vm.flow)
    const folded = raw(vm.stepFoldList)
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.headerTitle).toBe('Edit flow')
    expect(raw(vm.flow)).toEqual(draft)
    expect(raw(vm.stepFoldList)).toEqual(folded)
    expect(api.fetchFlowDetail).toHaveBeenCalledTimes(1)
    expect(api.saveFlow).not.toHaveBeenCalled()
    vm.handleSave()
    await flushPromises()
    const payload = api.saveFlow.mock.calls[0][0]
    expect(payload).toMatchObject({ id: 'flow-id', name: '编辑后的中文名', hosts: flow.hosts })
    expect(JSON.parse(payload.globalParamsJson)[0]).toMatchObject({
      name: 'scope',
      label: '中文参数',
      defaultValue: '编辑后的值 ${scope}',
      secret: true
    })
    expect(JSON.parse(payload.steps[0].configJson)).toMatchObject({
      tasks: [{ scripts: [{ location: '原目录/a.sh', argline: '--raw ${scope}' }] }],
      verbosity: '2',
      taskTimeout: 33
    })
    expect(payload.steps[0].name).toBe('')
  })

  it('updates an open host-output fallback step title without reloading instance or output', async () => {
    const { vm } = await open(Viewer, { modelValue: true, instanceId: 'raw-instance' })
    const step = vm.normalizedSteps[0]
    await vm.handleCellClick(step, vm.hostRows[0])
    expect(vm.currentCell.stepName).toBe('步骤 1')
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.currentCell.stepName).toBe('Step 1')
    expect(vm.currentCell).toMatchObject({
      stepId: 'step-id',
      hostId: 'host-id',
      hostKey: '中文主机'
    })
    expect(vm.hostOutputVisible).toBe(true)
    expect(api.fetchFlowInstanceView).toHaveBeenCalledExactlyOnceWith('raw-instance')
    expect(api.fetchFlowHostResult).toHaveBeenCalledExactlyOnceWith('step-id', 'host-id')
  })

  it('keeps script selection, current directory and argument syntax in the open selector', async () => {
    const files = [{ path: '原目录/a.sh', config: '--scope ${scope}', tag: '中文标签' }]
    const { vm, wrapper } = await open(Selector, {
      modelValue: files,
      multipleSelect: false,
      rememberDirectory: true
    })
    vm.handleOpenSelector()
    await flushPromises()
    await vm.loadGfsFiles('原目录')
    vm.selectedFiles = ['原目录/a.sh']
    const calls = gfs.listFiles.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.currentPath).toBe('原目录')
    expect(vm.selectedFiles).toEqual(['原目录/a.sh'])
    expect(vm.fileList).toEqual(files)
    expect(gfs.listFiles).toHaveBeenCalledTimes(calls)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
