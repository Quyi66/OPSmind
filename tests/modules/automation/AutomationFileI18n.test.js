import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'
import Viewer from '@/modules/automation/components/job/JobListView/FileContentViewer.vue'
import { getFileStatusText } from '@/modules/automation/utils/filePresentation'
import * as api from '@/modules/automation/api/gfs'

vi.mock('@/modules/automation/api/gfs', () => ({
  getFileInfo: vi.fn(),
  getFileDownloadUrl: vi.fn(),
  updateFileInfo: vi.fn()
}))
vi.mock('vue-codemirror', () => ({ Codemirror: { template: '<div />' } }))
vi.mock('element-plus', () => ({ ElMessage: { error: vi.fn(), success: vi.fn() } }))
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const raw = value => JSON.parse(JSON.stringify(value))
let wrapper
const file = {
  repo: 'raw-repo',
  path: '目录/数据.csv',
  name: '中文文件.csv',
  onlineStatus: 'PUBLISHED',
  _statusText: '后端中文状态',
  description: '后端描述',
  config: '{"原配置":true}',
  fileContent: {
    mime: 'text/csv',
    content: '主机,值\n原始主机,中文值',
    downloadUri: '/api/files/raw.csv'
  }
}
async function open() {
  wrapper = shallowMount(Viewer, {
    props: { path: file.path, repo: 'raw-repo' },
    global: {
      stubs: {
        ElDialog: Slot,
        ElForm: Slot,
        ElFormItem: Slot,
        ElTabs: Slot,
        ElTabPane: Slot,
        ElButton: Slot
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
  return wrapper.vm.$.setupState
}
beforeEach(async () => {
  vi.clearAllMocks()
  api.getFileInfo.mockResolvedValue({ data: file })
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrapper?.unmount()
  wrapper = undefined
  vi.restoreAllMocks()
  await setLocale('zh-CN', { persist: false })
})

describe('file preview language boundaries', () => {
  it('keeps CSV cells and an open editor draft and saves original file metadata', async () => {
    const vm = await open()
    expect(vm.excelData).toEqual([
      ['主机', '值'],
      ['原始主机', '中文值']
    ])
    vm.openEditInfo('config')
    vm.editForm.description = '正在编辑的中文'
    vm.editForm.config = '{"原配置":"{{raw}}"}'
    vm.editForm.scriptContent = '原始内容,中文\n{{raw}},值'
    const draft = raw(vm.editForm)
    const mode = vm.viewMode
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.editDialogVisible).toBe(true)
    expect(vm.editActiveTab).toBe('config')
    expect(vm.viewMode).toBe(mode)
    expect(vm.activeSheet).toBe('Sheet1')
    expect(vm.content).toBe(file.fileContent.content)
    expect(raw(vm.editForm)).toEqual(draft)
    expect(api.getFileInfo).toHaveBeenCalledTimes(1)
    expect(api.updateFileInfo).not.toHaveBeenCalled()
    await vm.saveFileInfo()
    expect(api.updateFileInfo).toHaveBeenCalledExactlyOnceWith('git', 'raw-repo', file.path, {
      ...file,
      ...draft,
      isContent: true
    })
  })

  it('translates a local read failure while leaving backend details and retries under user control', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    api.getFileInfo.mockRejectedValue(new Error('后端原始错误'))
    const vm = await open()
    const text = vm.content
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.content).not.toBe(text)
    expect(vm.content).toContain('后端原始错误')
    expect(vm.content).toMatch(/load/i)
    expect(api.getFileInfo).toHaveBeenCalledTimes(1)
  })

  it('localizes known status codes only and preserves enriched backend metadata', async () => {
    const before = raw(file)
    expect(getFileStatusText(file)).toBe('已启用')
    expect(getFileStatusText({ repoType: 'STAGE', onlineStatus: 'REJECTED' })).toBe('已拒绝')
    expect(getFileStatusText({ _stageStatus: 'NULL' }, true)).toBe('待审核')
    await setLocale('en-US', { persist: false })
    expect(getFileStatusText(file)).toBe('Enabled')
    expect(getFileStatusText({ repoType: 'STAGE', onlineStatus: 'REJECTED' })).toBe('Rejected')
    expect(getFileStatusText({ _stageStatus: 'NULL' }, true)).toBe('Pending review')
    expect(getFileStatusText({ onlineStatus: 'CUSTOM', _statusText: '自定义后端状态' })).toBe(
      '自定义后端状态'
    )
    expect(file).toEqual(before)
  })
})
