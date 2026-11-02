import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { defineComponent, h, KeepAlive, ref } from 'vue'
import { ElInput, ElMessage, ElPagination, ElTable, ElTableColumn } from 'element-plus'
import Page from '@/modules/automation/views/script/ScriptFileListPage.vue'

const api = vi.hoisted(() => ({ listFiles: vi.fn(), loadCurrentRepo: vi.fn() }))
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

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const file = (name, dir = '') => ({ name, path: dir ? `${dir}/${name}` : name, directory: false })
let wrapper, cachedVisibility
const state = () => wrapper.findComponent(Page).vm.$.setupState
async function open(props = {}, realTable = false, cached = false) {
  cachedVisibility = ref(true)
  const pageProps = { repo: 'real-repo', ...props }
  const Host = defineComponent({
    setup: () => () =>
      h(KeepAlive, null, {
        default: () => (cachedVisibility.value ? h(Page, pageProps) : null)
      })
  })
  wrapper = (realTable || cached ? mount : shallowMount)(cached ? Host : Page, {
    props: cached ? {} : pageProps,
    global: {
      stubs: {
        'el-table': realTable
          ? ElTable
          : {
              props: ['data'],
              methods: { clearSelection() {} },
              template: '<div />'
            },
        'el-table-column': realTable ? ElTableColumn : true,
        'el-pagination': realTable ? ElPagination : true,
        'el-input': realTable ? ElInput : true,
        'el-tag': true,
        'el-popover': true,
        'el-dropdown': true,
        'el-dropdown-menu': true,
        'el-dropdown-item': true,
        'el-button': { template: '<button><slot /></button>' },
        'el-alert': { props: ['title'], template: '<div role="alert">{{ title }}<slot /></div>' }
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
beforeEach(() => {
  api.listFiles.mockReset().mockResolvedValue([file('initial.sh')])
  api.loadCurrentRepo.mockReset().mockResolvedValue({ id: 'resolved-repo' })
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
  vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})
afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('脚本库目录读取与刷新反馈', () => {
  it.each(['resolve', 'reject'])('切目录后旧%s不会覆盖当前目录或结束新加载', async method => {
    const old = deferred(),
      latest = deferred()
    api.listFiles.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    await open()
    state().goDir('scripts')
    await flushPromises()
    old[method](method === 'resolve' ? [file('old.sh')] : new Error('old'))
    await flushPromises()
    expect(state().loading).toBe(true)
    expect(state().fileList).toEqual([])
    expect(ElMessage.error).not.toHaveBeenCalled()
    latest.resolve([file('new.sh', 'scripts')])
    await flushPromises()
    expect(state().fileList.map(row => row.name)).toEqual(['..', 'new.sh'])
    expect(state().fileList[0].path).toBe('')
    expect(api.listFiles.mock.calls).toEqual([
      ['real-repo', '', 'git'],
      ['real-repo', 'scripts', 'git']
    ])
  })

  it('刷新等待真实读取成功，失败没有成功提示且可在原目录重试', async () => {
    await open({ initialDir: 'scripts' })
    state().handleSelectionChange([file('initial.sh', 'scripts')])
    const pending = deferred()
    api.listFiles.mockReturnValueOnce(pending.promise)
    const refresh = state().refresh()
    await flushPromises()
    expect(ElMessage.success).not.toHaveBeenCalled()
    expect(state().fileList).toEqual([])
    expect(state().selectedFiles).toEqual([])
    pending.reject(new Error('network'))
    await refresh
    await flushPromises()
    expect(ElMessage.success).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('文件列表读取失败')
    expect(wrapper.find('.empty-state__actions').exists()).toBe(false)
    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(api.listFiles).toHaveBeenLastCalledWith('real-repo', 'scripts', 'git')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(state().fileList.map(row => row.name)).toEqual(['..', 'initial.sh'])
    await state().refresh()
    expect(ElMessage.success).toHaveBeenCalledExactlyOnceWith('刷新成功')
  })

  it('同目录连续刷新只有最新成功可提示成功', async () => {
    await open()
    const old = deferred(),
      latest = deferred()
    api.listFiles.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    const first = state().refresh()
    const second = state().refresh()
    old.resolve([file('old.sh')])
    await first
    expect(ElMessage.success).not.toHaveBeenCalled()
    expect(state().loading).toBe(true)
    latest.resolve([file('latest.sh')])
    await second
    expect(state().fileList.map(row => row.name)).toEqual(['latest.sh'])
    expect(ElMessage.success).toHaveBeenCalledTimes(1)
  })

  it('仓库和类型切换重读新上下文，旧租户仓库解析不能串入', async () => {
    const repo = deferred(),
      old = deferred()
    api.loadCurrentRepo.mockReturnValueOnce(repo.promise)
    api.listFiles.mockReturnValueOnce(old.promise)
    await open({ repo: '$tnt' })
    await wrapper.setProps({ repo: 'other-repo', repoType: 'staticfs' })
    await flushPromises()
    repo.resolve({ id: 'old-repo' })
    old.resolve([file('old.sh')])
    await flushPromises()
    expect(state().currentRepo).toBe('other-repo')
    expect(state().fileList.map(row => row.name)).toEqual(['initial.sh'])
    expect(api.listFiles).toHaveBeenLastCalledWith('other-repo', '', 'staticfs')
  })

  it('刷新保留有效页码，缩量约束末页，切目录回首页', async () => {
    const rows = Array.from({ length: 45 }, (_, i) => file(`file-${i}.sh`))
    api.listFiles.mockResolvedValue(rows)
    await open()
    state().currentPage = 3
    await state().refresh()
    expect(state().currentPage).toBe(3)
    expect(state().paginatedFiles).toHaveLength(5)
    api.listFiles.mockResolvedValueOnce(rows.slice(0, 21))
    await state().refresh()
    expect(state().currentPage).toBe(2)
    expect(state().paginatedFiles).toHaveLength(1)
    state().goDir('scripts')
    await flushPromises()
    expect(state().currentPage).toBe(1)
  })

  it('实时搜索忽略首尾空格与大小写并回首页，不新增读取', async () => {
    api.listFiles.mockResolvedValue([file('Deploy.SH'), file('other.sh')])
    await open()
    state().currentPage = 2
    state().searchText = '  DEPLOY  '
    await flushPromises()
    expect(state().currentPage).toBe(1)
    expect(state().paginatedFiles.map(row => row.path)).toEqual(['Deploy.SH'])
    expect(api.listFiles).toHaveBeenCalledTimes(1)
  })

  it.each(['resolve', 'reject'])('卸载后忽略迟到%s和刷新成功通知', async method => {
    await open()
    const pending = deferred()
    api.listFiles.mockReturnValueOnce(pending.promise)
    const context = state()
    const read = context.refresh()
    wrapper.unmount()
    pending[method](method === 'resolve' ? [file('late.sh')] : new Error('late'))
    await read
    await flushPromises()
    expect(context.fileList).toEqual([])
    expect(ElMessage.error).not.toHaveBeenCalled()
    expect(ElMessage.success).not.toHaveBeenCalled()
  })

  it('真实表头先排完整目录再分页，切页保持排序和选择且不重复读取', async () => {
    api.listFiles.mockResolvedValue(
      Array.from({ length: 25 }, (_, i) => ({
        ...file(`file-${i}.sh`),
        size: i
      }))
    )
    await open({}, true)
    await wrapper.get('.el-table__body-wrapper tbody tr input[type="checkbox"]').setValue(true)
    const selected = state().selectedFiles[0].path
    await wrapper
      .findAll('th')
      .find(item => item.text() === '大小')
      .get('.sort-caret.descending')
      .trigger('click')
    await flushPromises()
    expect(state().paginatedFiles.map(row => row.size)).toEqual(
      Array.from({ length: 20 }, (_, i) => 24 - i)
    )
    expect(wrapper.get('.el-table__body-wrapper tbody tr').text()).toContain('file-24.sh')
    await wrapper.get('.el-pagination .btn-next').trigger('click')
    await flushPromises()
    expect(state().paginatedFiles.map(row => row.size)).toEqual([4, 3, 2, 1, 0])
    expect(state().selectedFiles.map(row => row.path)).toEqual([selected])
    await wrapper
      .findAll('th')
      .find(item => item.text() === '大小')
      .get('.sort-caret.descending')
      .trigger('click')
    await flushPromises()
    expect(state().currentPage).toBe(1)
    expect(state().sortState.order).toBe(null)
    expect(state().paginatedFiles.map(row => row.path)).toEqual(
      state()
        .fileList.slice(0, 20)
        .map(row => row.path)
    )
    expect(api.listFiles).toHaveBeenCalledTimes(1)
  })

  it('父目录固定在前，目录优先，零大小和数值字符串正常且未知值不冒充零', async () => {
    api.listFiles.mockResolvedValue([
      { ...file('zero', 'scripts'), size: 0 },
      { ...file('two', 'scripts'), size: '2' },
      { ...file('missing', 'scripts'), size: null },
      { ...file('invalid', 'scripts'), size: 'invalid' },
      { name: 'folder', path: 'scripts/folder', directory: true }
    ])
    await open({ initialDir: 'scripts' }, true)
    await wrapper
      .findAll('th')
      .find(item => item.text() === '大小')
      .get('.sort-caret.ascending')
      .trigger('click')
    await flushPromises()
    expect(state().paginatedFiles.map(row => row.name)).toEqual([
      '..',
      'folder',
      'zero',
      'two',
      'invalid',
      'missing'
    ])
    const cells = wrapper
      .findAll('.el-table__body-wrapper tbody tr')
      .map(row => row.findAll('td')[3].text())
    expect(cells).toEqual(['-', '-', '0 B', '2 B', '-', '-'])
    expect(state().fileList.find(row => row.name === 'two').size).toBe('2')
  })

  it('真实搜索过滤为空再清除后，表头和内容保持原排序', async () => {
    api.listFiles.mockResolvedValue([
      { ...file('a.sh'), size: 1 },
      { ...file('b.sh'), size: 2 }
    ])
    await open({}, true)
    await wrapper
      .findAll('th')
      .find(item => item.text() === '大小')
      .get('.sort-caret.descending')
      .trigger('click')
    await wrapper.get('input[placeholder="搜索名称或说明"]').setValue('no-match')
    expect(wrapper.find('.empty-state').exists()).toBe(true)
    await wrapper.get('input[placeholder="搜索名称或说明"]').setValue('')
    await flushPromises()
    expect(state().paginatedFiles.map(row => row.name)).toEqual(['b.sh', 'a.sh'])
    expect(
      wrapper
        .findAll('th')
        .find(item => item.text() === '大小')
        .classes()
    ).toContain('descending')
  })

  it('真实分页器在刷新途中不退首页，完成后恢复同一有效页', async () => {
    const rows = Array.from({ length: 45 }, (_, i) => ({ ...file(`file-${i}.sh`), size: i }))
    api.listFiles.mockResolvedValue(rows)
    await open({}, true)
    await wrapper.get('.el-pagination .btn-next').trigger('click')
    await wrapper.get('.el-pagination .btn-next').trigger('click')
    expect(state().currentPage).toBe(3)
    const pending = deferred()
    api.listFiles.mockReturnValueOnce(pending.promise)
    const refresh = state().refresh()
    await flushPromises()
    expect(state().currentPage).toBe(3)
    pending.resolve(rows)
    await refresh
    await flushPromises()
    expect(state().currentPage).toBe(3)
    expect(state().paginatedFiles).toHaveLength(5)
    expect(wrapper.get('.el-pagination .btn-next').attributes('disabled')).toBeDefined()
  })

  it('名称按自然顺序排完整目录，日期按真实时间排序且两方向都将未知后置', async () => {
    api.listFiles.mockResolvedValue([
      { ...file('script10'), lastModified: '2026-10-30T02:00:00Z' },
      { ...file('script2'), lastModified: '2026-10-30T09:00:00+08:00' },
      { ...file('script1'), lastModified: 'not-a-date' },
      { ...file('script3'), lastModified: null }
    ])
    await open({}, true)
    await wrapper
      .findAll('th')
      .find(item => item.text() === '名称')
      .get('.sort-caret.ascending')
      .trigger('click')
    await flushPromises()
    expect(state().paginatedFiles.map(row => row.name)).toEqual([
      'script1',
      'script2',
      'script3',
      'script10'
    ])
    await wrapper
      .findAll('th')
      .find(item => item.text() === '修改日期')
      .get('.sort-caret.ascending')
      .trigger('click')
    await flushPromises()
    expect(state().paginatedFiles.map(row => row.name)).toEqual([
      'script2',
      'script10',
      'script1',
      'script3'
    ])
    await wrapper
      .findAll('th')
      .find(item => item.text() === '修改日期')
      .get('.sort-caret.descending')
      .trigger('click')
    await flushPromises()
    expect(state().paginatedFiles.map(row => row.name)).toEqual([
      'script10',
      'script2',
      'script1',
      'script3'
    ])
    expect(api.listFiles).toHaveBeenCalledTimes(1)
  })

  it('KeepAlive失活后丢弃旧读取，返回同一缓存窗口可显式重试', async () => {
    const pending = deferred()
    api.listFiles.mockReturnValueOnce(pending.promise)
    await open({}, false, true)
    const context = state()
    cachedVisibility.value = false
    await flushPromises()
    pending.resolve([file('late.sh')])
    await flushPromises()
    expect(context.fileList).toEqual([])
    expect(context.loading).toBe(false)
    cachedVisibility.value = true
    await flushPromises()
    expect(state()).toBe(context)
    expect(wrapper.get('[role="alert"]').text()).toContain('读取已中断')
    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(context.fileList.map(row => row.name)).toEqual(['initial.sh'])
    expect(api.listFiles).toHaveBeenCalledTimes(2)
  })
})
