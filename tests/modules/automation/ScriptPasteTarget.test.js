import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import Page from '@/modules/automation/views/script/ScriptFileListPage.vue'

const api = vi.hoisted(() => ({ listFiles: vi.fn(), moveFiles: vi.fn() }))
vi.mock('@/modules/automation/api/gfs', () => api)
vi.mock('@/modules/automation/components/script/dialogs', () =>
  Object.fromEntries(
    [
      'AddScriptDialog',
      'AddFolderDialog',
      'UploadFileDialog',
      'SyncFileDialog',
      'FileContentDialog',
      'GitRepoListDialog',
      'JgitManageDialog',
      'FileApproveDialog',
      'ApprovalHistoryDialog',
      'FileChangeStatusDialog',
      'FileRevisionDialog'
    ].map(name => [name, { template: '<div />' }])
  )
)

const Dropdown = { emits: ['command'], template: '<div><slot /><slot name="dropdown" /></div>' }
let wrapper
const state = () => wrapper.vm.$.setupState
const directory = path => ({ name: path.split('/').at(-1), path, directory: true })
async function open() {
  wrapper = shallowMount(Page, {
    props: { repo: 'real-repo-id' },
    global: {
      stubs: {
        'el-table': {
          methods: { clearSelection() {} },
          template: '<div><div class="el-table__body-wrapper"></div></div>'
        },
        'el-table-column': true,
        'el-pagination': true,
        'el-tag': true,
        'el-alert': true,
        'el-popover': true,
        'el-dropdown': Dropdown,
        'el-dropdown-menu': { template: '<div><slot /></div>' },
        'el-dropdown-item': {
          props: ['command', 'disabled'],
          template: '<button :data-command="command" :disabled="disabled"><slot /></button>'
        }
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
async function cut(files) {
  state().handleSelectionChange(files)
  wrapper.findComponent(Dropdown).vm.$emit('command', 'cut')
  await flushPromises()
}
async function go(path) {
  state().goDir(path)
  await flushPromises()
}
const pasteDisabled = () =>
  wrapper.get('[data-command="paste"]').attributes('disabled') !== undefined
beforeEach(() => {
  vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
  api.listFiles.mockReset().mockResolvedValue([])
  api.moveFiles.mockReset()
})
afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
})

describe('脚本库剪切目标路径', () => {
  it('剪切scripts后允许粘贴到同前缀的scripts-old目录，保留真实路径且不执行移动', async () => {
    await open()
    await cut([directory('scripts')])
    await go('scripts-old')
    expect(pasteDisabled()).toBe(false)
    expect(state().clipboard.map(file => file.path)).toEqual(['scripts'])
    expect(api.moveFiles).not.toHaveBeenCalled()
  })

  it('原目录、被剪切目录自身及其后代仍禁止粘贴', async () => {
    await open()
    await cut([directory('scripts')])
    expect(pasteDisabled()).toBe(true)
    await go('scripts')
    expect(pasteDisabled()).toBe(true)
    await go('scripts/subfolder')
    expect(pasteDisabled()).toBe(true)
    await go('other/scripts')
    expect(pasteDisabled()).toBe(false)
  })

  it('多条剪切时任一目录的后代都禁用，兄弟目录允许，空剪贴板禁用', async () => {
    await open()
    expect(pasteDisabled()).toBe(true)
    await cut([directory('scripts'), directory('reports')])
    await go('reports/daily')
    expect(pasteDisabled()).toBe(true)
    await go('reports-archive')
    expect(pasteDisabled()).toBe(false)
    expect(state().clipboard).toHaveLength(2)
    expect(api.moveFiles).not.toHaveBeenCalled()
  })

  it('目录路径尾分隔符仍保护自身/子目录，无有效路径的条目不开放粘贴', async () => {
    await open()
    await cut([directory('scripts/')])
    await go('scripts')
    expect(pasteDisabled()).toBe(true)
    await go('scripts/sub')
    expect(pasteDisabled()).toBe(true)
    await cut([{ name: '无路径', directory: true, path: '' }])
    await go('other')
    expect(pasteDisabled()).toBe(true)
    expect(api.moveFiles).not.toHaveBeenCalled()
  })

  it('翻页只复位自身表格滚动，不影响其他脚本列表', async () => {
    const otherList = document.createElement('div')
    otherList.className = 'file-table-container'
    otherList.innerHTML = '<div class="el-table__body-wrapper"></div>'
    document.body.appendChild(otherList)
    try {
      const otherBody = otherList.firstElementChild
      otherBody.scrollTop = 120
      api.listFiles.mockResolvedValueOnce([directory('sample')])
      await open()
      const ownBody = wrapper.get('.el-table__body-wrapper').element
      ownBody.scrollTop = 80
      state().handleCurrentChange()
      expect(ownBody.scrollTop).toBe(0)
      expect(otherBody.scrollTop).toBe(120)
    } finally {
      otherList.remove()
    }
  })
})
