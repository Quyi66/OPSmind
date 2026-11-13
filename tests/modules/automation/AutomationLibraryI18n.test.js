import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'
import Page from '@/modules/automation/views/script/ScriptFileListPage.vue'
import Upload from '@/modules/automation/components/script/dialogs/UploadFileDialog.vue'
import AddScript from '@/modules/automation/components/script/dialogs/AddScriptDialog.vue'
import Sync from '@/modules/automation/components/script/dialogs/SyncFileDialog.vue'
import Settings from '@/modules/automation/components/script/dialogs/GitRepoSettingsDialog.vue'
import Review from '@/modules/automation/components/script/dialogs/FileApproveDialog.vue'
import History from '@/modules/automation/components/script/dialogs/ApprovalHistoryDialog.vue'
import * as api from '@/modules/automation/api/gfs'

vi.mock('@/modules/automation/api/gfs', () => ({
  listFiles: vi.fn(),
  loadCurrentRepo: vi.fn(),
  uploadFile: vi.fn(),
  syncFile: vi.fn(),
  initGitRepo: vi.fn(),
  changeFileStatus: vi.fn(),
  getAllApproveHistory: vi.fn(),
  getApprovalDetail: vi.fn()
}))
vi.mock('@/stores/useReviewCountStore.js', () => ({
  useReviewCountStore: () => ({ fetchScriptCount: vi.fn() })
}))
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
  ElMessageBox: { confirm: vi.fn().mockResolvedValue('confirm') }
}))
const wrappers = []
const Slot = { template: '<div><slot /><slot name="footer" /></div>' }
const raw = value => JSON.parse(JSON.stringify(value))
async function open(component, props = {}) {
  const wrapper = shallowMount(component, {
    props,
    global: {
      stubs: {
        ElDialog: Slot,
        ElForm: Slot,
        ElFormItem: Slot,
        ElTag: Slot,
        ElTable: { template: '<div />', methods: { clearSelection() {} } },
        ElTableColumn: true,
        ElPopover: true,
        ElDropdown: true,
        ElDropdownMenu: true,
        ElDropdownItem: true
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
  api.listFiles.mockResolvedValue(
    Array.from({ length: 45 }, (_, index) => ({
      name: `业务文件${index}.sh`,
      path: `目录/业务文件${index}.sh`,
      directory: false,
      repo: 'raw-repo',
      onlineStatus: 'PUBLISHED',
      _statusText: '已启用'
    }))
  )
  api.loadCurrentRepo.mockResolvedValue({ data: { id: 'raw-repo' } })
  api.getAllApproveHistory.mockResolvedValue({
    result: [{ id: 'history-id', onlineStatus: 'PUBLISHED', comment: '原始中文备注' }]
  })
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  await setLocale('zh-CN', { persist: false })
})

describe('script library language and raw data boundaries', () => {
  it.each(['git', 'staticfs', 'stage'])(
    'keeps %s file selection, clipboard, filters and page without reloading',
    async repoType => {
      const { vm } = await open(Page, { repoType, repo: 'raw-repo' })
      vm.searchText = '业务文件'
      vm.sortState = { prop: 'name', order: 'descending' }
      await flushPromises()
      vm.currentPage = 2
      vm.selectedFiles = [vm.fileList[0]]
      vm.clipboard = [vm.fileList[1]]
      vm.clipboardDir = '原始来源目录'
      const list = vm.filteredFiles
      const selected = raw(vm.selectedFiles)
      const banner = vm.selectionBannerDescription
      await setLocale('en-US', { persist: false })
      await flushPromises()
      expect(vm.selectionBannerDescription).not.toBe(banner)
      expect(vm.filteredFiles).toBe(list)
      expect(vm.currentPage).toBe(2)
      expect(vm.searchText).toBe('业务文件')
      expect(raw(vm.selectedFiles)).toEqual(selected)
      expect(vm.clipboardDir).toBe('原始来源目录')
      expect(api.listFiles).toHaveBeenCalledTimes(1)
      expect(api.uploadFile).not.toHaveBeenCalled()
      expect(api.changeFileStatus).not.toHaveBeenCalled()
    }
  )

  it('keeps selected upload File objects, extraction mode and metadata until submission', async () => {
    const { vm } = await open(Upload, {
      modelValue: true,
      repoType: 'git',
      repo: 'raw-repo',
      dir: '原目录'
    })
    const file = new File(['原始字节内容'], '文件.zip', { type: 'application/zip' })
    vm.form = {
      fileList: [{ name: file.name, raw: file }],
      unzipMode: 'ExtractWithoutDir',
      config: '{{原参数}}',
      description: '中文描述'
    }
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.form.fileList[0].raw).toBe(file)
    expect(vm.hasZipFile).toBe(true)
    expect(vm.form.unzipMode).toBe('ExtractWithoutDir')
    expect(api.uploadFile).not.toHaveBeenCalled()
    await vm.handleSubmit()
    expect(api.uploadFile).toHaveBeenCalledExactlyOnceWith('git', 'raw-repo', {
      file,
      dir: '原目录',
      unzipMode: 'ExtractWithoutDir',
      config: '{{原参数}}',
      description: '中文描述'
    })
  })

  it('keeps script source and creates an original text file after switching language', async () => {
    const { vm } = await open(AddScript, {
      modelValue: true,
      repoType: 'git',
      repo: 'raw-repo',
      dir: '脚本目录'
    })
    const source = '#!/bin/sh\necho 中文 {{scope}}'
    vm.form = {
      name: '原始脚本.sh',
      content: source,
      config: '--scope {{scope}}',
      description: '原始说明'
    }
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.form.content).toBe(source)
    expect(api.uploadFile).not.toHaveBeenCalled()
    await vm.handleSubmit()
    const [repoType, repo, payload] = api.uploadFile.mock.calls[0]
    expect([repoType, repo]).toEqual(['git', 'raw-repo'])
    expect(payload).toMatchObject({
      dir: '脚本目录',
      config: '--scope {{scope}}',
      description: '原始说明'
    })
    expect(payload.file.name).toBe('原始脚本.sh')
    const contents = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsText(payload.file)
    })
    expect(contents).toBe(source)
  })

  it('keeps the server path and sync mode in the request', async () => {
    const { vm } = await open(Sync, {
      modelValue: true,
      repoType: 'git',
      repo: 'raw-repo',
      dir: '目标目录'
    })
    vm.form = { path: '/原始/服务器路径', syncMode: 'copy' }
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.form.path).toBe('/原始/服务器路径')
    expect(api.syncFile).not.toHaveBeenCalled()
    await vm.handleSubmit()
    expect(api.syncFile).toHaveBeenCalledExactlyOnceWith('git', 'raw-repo', {
      path: '/原始/服务器路径',
      dir: '目标目录',
      syncMode: 'copy'
    })
  })

  it.each(['https', 'ssh'])(
    'keeps %s authentication and repository draft in FormData',
    async authType => {
      const { wrapper, vm } = await open(Settings, { modelValue: false, repo: 'raw-repo' })
      await wrapper.setProps({ modelValue: true })
      const key = new File(['raw-private-key'], '原始私钥', { type: 'text/plain' })
      Object.assign(vm.form, {
        authType,
        repoName: '中文仓库名',
        repoUrl: 'ssh://example.test/原始地址',
        jobInterval: 17,
        authName: '原始账号',
        authPass: '原始密码',
        authFile: key
      })
      await setLocale('en-US', { persist: false })
      await flushPromises()
      expect(vm.rules.repoUrl[0].message).toBe('Enter a Git repository URL')
      expect(vm.form.authFile).toBe(key)
      expect(vm.form.authPass).toBe('原始密码')
      expect(api.initGitRepo).not.toHaveBeenCalled()
      await vm.handleSave()
      const [repo, data] = api.initGitRepo.mock.calls[0]
      expect(repo).toBe('raw-repo')
      expect(data.get('authType')).toBe(authType)
      expect(data.get('repoUrl')).toBe('ssh://example.test/原始地址')
      expect(data.get('repoName')).toBe('中文仓库名')
      expect(data.get('jobInterval')).toBe('17')
      if (authType === 'https')
        expect([data.get('authName'), data.get('authPass')]).toEqual(['原始账号', '原始密码'])
      else expect(data.get('authFile').name).toBe(key.name)
    }
  )

  it('keeps a file review action, notes and raw status value', async () => {
    const files = [{ path: '目录/原脚本.sh', onlineStatus: 'REJECTED' }]
    const { vm } = await open(Review, { modelValue: true, repo: 'raw-repo', files })
    vm.form = { action: 'PUBLISHED', comment: '用户填写的中文说明' }
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.form).toEqual({ action: 'PUBLISHED', comment: '用户填写的中文说明' })
    expect(api.changeFileStatus).not.toHaveBeenCalled()
    await vm.handleSubmit()
    expect(api.changeFileStatus).toHaveBeenCalledExactlyOnceWith(
      'stage',
      'raw-repo',
      files,
      'PUBLISHED',
      '用户填写的中文说明'
    )
  })

  it('updates approval actions and local history errors without refetching', async () => {
    const { wrapper, vm } = await open(History, { modelValue: false, repo: 'raw-repo' })
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    expect(vm.historyList[0].action).toBe('通过')
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(vm.historyList[0].action).toBe('Approve')
    expect(vm.historyList[0].comment).toBe('原始中文备注')
    expect(api.getAllApproveHistory).toHaveBeenCalledTimes(1)
    api.getAllApproveHistory.mockResolvedValue({ result: { invalid: true } })
    await vm.loadHistory()
    await setLocale('zh-CN', { persist: false })
    await flushPromises()
    expect(vm.loadError).toBe('审批历史响应不是列表，请重试')
    expect(api.getAllApproveHistory).toHaveBeenCalledTimes(2)
  })
})
