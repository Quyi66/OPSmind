import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, reactive, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { ElDialog } from 'element-plus/es/components/dialog/index.mjs'
import { ElInput } from 'element-plus/es/components/input/index.mjs'
import { ElForm, ElFormItem } from 'element-plus/es/components/form/index.mjs'
import CommandEditDialog from '@/modules/automation/components/command/dialogs/CommandEditDialog.vue'
import GroupAssetDialog from '@/modules/asset/components/data/GroupAssetDialog.vue'
import TagAssetDialog from '@/modules/asset/components/data/TagAssetDialog.vue'
import RepoDetailDialog from '@/modules/software/components/repo/RepoDetailDialog.vue'
import HostDetailDialog from '@/modules/software/components/overview/HostDetailDialog.vue'
import CheckItemDetailDialog from '@/modules/inspection/components/result-detail/CheckItemDetailDialog.vue'
import HostSeverityPatchDialog from '@/modules/patches/components/host-detail/dialogs/HostSeverityPatchDialog.vue'

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  saveCommand: vi.fn(),
  findCommandById: vi.fn(),
  confirm: vi.fn(),
  saveWhitelist: vi.fn(),
  stopPolling: vi.fn()
}))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), info: vi.fn() },
  ElMessageBox: { confirm: api.confirm }
}))
vi.mock('@/core/api', () => ({ apiService: { get: api.get, post: api.post } }))
vi.mock('@/modules/software/api', () => ({ repoApi: {}, hostOverviewApi: {} }))
vi.mock('@/modules/inspection/api', () => ({ whitelistApi: { saveWhitelist: api.saveWhitelist } }))
vi.mock('@/modules/automation/api/command', () => ({
  saveCommand: api.saveCommand,
  findCommandById: api.findCommandById,
  COMMAND_TYPES: ['shell'],
  getCommandStatusInfo: () => ({ type: 'success', text: '已发布' })
}))
vi.mock('@/composables/useJobPolling', () => ({
  useJobPolling: () => ({ startPolling: vi.fn(), stopPolling: api.stopPolling })
}))
vi.mock('@/modules/patches/components/patch-task/wizard/PatchInstallWizard.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/components/common/CveLinkList.vue', () => ({
  default: { template: '<span />' }
}))
vi.mock('@/modules/patches/components/host-detail/RepoCheckStatus.vue', () => ({
  default: { template: '<span />' }
}))
let patchSelection, selectAll
vi.mock('@/modules/patches/composables/usePatchList', () => ({
  usePatchList: () => {
    patchSelection = ref([])
    return {
      patchLoading: ref(false),
      patchTableData: ref([]),
      patchFilteredData: ref([]),
      selectedPatches: patchSelection,
      selectedSeverities: ref([]),
      patchKeyword: ref(''),
      patchPagination: reactive({ page: 1, size: 10, total: 0 }),
      ...Object.fromEntries(
        [
          'applyClientPaging',
          'loadPatchList',
          'handleFilterChange',
          'handlePatchKeywordChange',
          'handlePageChange',
          'handleSizeChange'
        ].map(key => [key, vi.fn()])
      )
    }
  }
}))
vi.mock('@/modules/patches/composables/useTableSelectAll', () => ({
  useTableSelectAll: () => {
    selectAll = ref(false)
    return {
      allSelected: selectAll,
      isAllSelected: ref(false),
      handleToggleAllSelection: vi.fn(),
      handleTableSelect: vi.fn(),
      resetAllSelected: () => {
        selectAll.value = false
      }
    }
  }
}))

const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const Button = { props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' }
const Table = defineComponent({
  name: 'ReviewSelectionTable',
  emits: ['selection-change'],
  template: '<div />'
})
const ui = {
  plugins: [
    {
      install(app) {
        app.component('el-input', ElInput)
      }
    }
  ],
  components: { ElDialog, ElInput, ElForm, ElFormItem },
  stubs: {
    'el-dialog': false,
    'el-input': false,
    'el-form': false,
    'el-form-item': false,
    'el-button': Button,
    'el-table': Table,
    'el-table-column': true,
    'el-select': Slot,
    'el-option': true,
    'el-tag': Slot,
    'el-link': Slot,
    'el-tooltip': Slot,
    'el-pagination': true,
    'el-empty': true,
    'el-icon': true,
    'el-alert': true,
    'el-tabs': Slot,
    'el-tab-pane': Slot,
    'el-descriptions': Slot,
    'el-descriptions-item': Slot,
    'el-checkbox-group': Slot,
    'el-checkbox': true,
    'el-radio-group': Slot,
    'el-radio': true,
    teleport: false,
    transition: false
  },
  directives: { loading() {} }
}
const wrappers = []
const state = wrapper => wrapper.vm.$.setupState
async function settle() {
  await flushPromises()
  await new Promise(resolve => setTimeout(resolve, 60))
  await flushPromises()
}
async function click(target) {
  await target.trigger('mousedown')
  await target.trigger('mouseup')
  await target.trigger('click')
  await settle()
}
async function escape() {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })
  )
  await settle()
}
async function open(component, props, model = 'modelValue') {
  const wrapper = mount(component, {
    attachTo: document.body,
    props: {
      ...props,
      [model]: false,
      [`onUpdate:${model}`]: value => wrapper?.setProps({ [model]: value })
    },
    global: ui
  })
  wrappers.push(wrapper)
  await wrapper.setProps({ [model]: true })
  await settle()
  return wrapper
}
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  vi.clearAllMocks()
  api.get.mockResolvedValue({ data: { records: [] } })
  api.confirm.mockRejectedValue('cancel')
  api.findCommandById.mockResolvedValue({
    data: { id: 'mock-command', command: 'echo original', status: 0 }
  })
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('查看父层与业务草稿归属复核', () => {
  it('命令 view 模式允许遮罩关闭且不保存', async () => {
    const wrapper = await open(
      CommandEditDialog,
      { mode: 'view', command: { id: 'mock-command' } },
      'visible'
    )
    expect(wrapper.find('textarea').element.disabled).toBe(true)
    await click(wrapper.find('.el-dialog__body'))
    expect(wrapper.emitted('update:visible')).toBeUndefined()
    await click(wrapper.find('.el-overlay-dialog'))
    expect(wrapper.props('visible')).toBe(false)
    expect(api.saveCommand).not.toHaveBeenCalled()
  })

  it('命令详情切换编辑后遮罩和 Esc 保留草稿，取消仍正常关闭', async () => {
    const wrapper = await open(
      CommandEditDialog,
      { mode: 'view', command: { id: 'mock-command' } },
      'visible'
    )
    await wrapper
      .findAll('button')
      .find(button => button.text() === '编辑命令')
      .trigger('click')
    await wrapper.find('textarea').setValue('echo unsaved')
    await click(wrapper.find('.el-overlay-dialog'))
    await escape()
    expect(wrapper.emitted('update:visible')).toBeUndefined()
    expect(state(wrapper).formData.command).toBe('echo unsaved')
    await wrapper
      .findAll('button')
      .find(button => button.text() === '取消')
      .trigger('click')
    await settle()
    expect(wrapper.props('visible')).toBe(false)
    expect(api.saveCommand).not.toHaveBeenCalled()
  })

  describe.each([
    ['分组设备', GroupAssetDialog, { groupData: { id: 'mock-group', path: '/mock' } }],
    ['标签设备', TagAssetDialog, { tagData: { id: 'mock-tag' } }]
  ])('%s列表', (_label, component, props) => {
    it('没有待提交选择时允许遮罩关闭', async () => {
      const wrapper = await open(component, props)
      await click(wrapper.find('.el-overlay-dialog'))
      expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
      expect(api.post).not.toHaveBeenCalled()
    })
    it('勾选后保护业务选择，清空后恢复查看关闭', async () => {
      const wrapper = await open(component, props)
      const table = wrapper.findComponent(Table)
      table.vm.$emit('selection-change', [{ id: 'mock-device' }])
      await nextTick()
      await click(wrapper.find('.el-overlay-dialog'))
      await escape()
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
      expect(state(wrapper).selectedRows).toEqual([{ id: 'mock-device' }])
      wrapper.findComponent(Table).vm.$emit('selection-change', [])
      await nextTick()
      await click(wrapper.find('.el-overlay-dialog'))
      expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
      expect(api.post).not.toHaveBeenCalled()
    })
  })

  it('仓库详情不可用的移除入口不会把无实际用途的勾选变成业务草稿', async () => {
    const wrapper = await open(RepoDetailDialog, {})
    wrapper.findComponent(Table).vm.$emit('selection-change', [{ host_key: 'mock-host' }])
    await nextTick()
    expect(
      wrapper.findAll('button').find(button => button.text() === '移除主机配置').element.disabled
    ).toBe(true)
    await click(wrapper.find('.el-overlay-dialog'))
    expect(wrapper.props('modelValue')).toBe(false)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('软件主机详情只有在两种软件包选择都清空后才允许遮罩关闭', async () => {
    const wrapper = await open(HostDetailDialog, {})
    state(wrapper).activeTab = 'available'
    await nextTick()
    wrapper.findComponent(Table).vm.$emit('selection-change', [{ pkg_name: 'mock-available' }])
    state(wrapper).activeTab = 'installed'
    await nextTick()
    wrapper.findComponent(Table).vm.$emit('selection-change', [{ pkg_name: 'mock-installed' }])
    await nextTick()
    await click(wrapper.find('.el-overlay-dialog'))
    state(wrapper).activeTab = 'available'
    await nextTick()
    wrapper.findComponent(Table).vm.$emit('selection-change', [])
    await nextTick()
    await escape()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(state(wrapper).selectedInstalledPackages).toHaveLength(1)
    state(wrapper).activeTab = 'installed'
    await nextTick()
    wrapper.findComponent(Table).vm.$emit('selection-change', [])
    await nextTick()
    await click(wrapper.find('.el-overlay-dialog'))
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    expect(api.post).not.toHaveBeenCalled()
  })

  it('检查项查看父层的黑名单操作仍经独立禁止误关的确认，取消不写入', async () => {
    const wrapper = await open(
      CheckItemDetailDialog,
      { item: { name: 'mock-check', status: 'OK' } },
      'visible'
    )
    await wrapper
      .findAll('button')
      .find(button => button.text() === '添加黑名单')
      .trigger('click')
    await settle()
    expect(api.confirm).toHaveBeenCalledWith(expect.any(String), '确认', {
      closeOnClickModal: false,
      closeOnPressEscape: false
    })
    expect(api.saveWhitelist).not.toHaveBeenCalled()
    await click(wrapper.find('.el-overlay-dialog'))
    expect(wrapper.emitted('close')).toEqual([[]])
  })

  it.each(['loaded-row', 'virtual-all'])('包装父窗读取真实子组件的 %s 选择保护', async mode => {
    const wrapper = await open(
      HostSeverityPatchDialog,
      { host: { host_id: 'mock-host' } },
      'visible'
    )
    if (mode === 'loaded-row') patchSelection.value = [{ patch_id: 'mock-patch' }]
    else selectAll.value = true
    await nextTick()
    await click(wrapper.find('.el-overlay-dialog'))
    await escape()
    expect(wrapper.emitted('update:visible')).toBeUndefined()
    patchSelection.value = []
    selectAll.value = false
    await nextTick()
    await click(wrapper.find('.el-overlay-dialog'))
    expect(wrapper.emitted('update:visible')).toEqual([[false]])
    expect(api.post).not.toHaveBeenCalled()
  })
})
