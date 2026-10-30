import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import {
  ElCheckbox,
  ElForm,
  ElFormItem,
  ElInput,
  ElPagination,
  ElTable,
  ElTableColumn,
  ElMessage,
  ElMessageBox
} from 'element-plus'
import ResourcePermissionPage from '@/modules/asset/views/ResourcePermissionPage.vue'

const api = vi.hoisted(() => ({ getTablePermission: vi.fn(), saveTablePermission: vi.fn() }))
vi.mock('@/modules/asset/api', () => ({ permissionApi: api }))

const fixture = () => [
  {
    id: 'resource-a',
    groupInfo: '/a',
    extra_param: [{ name: 'assets_type', data: 'linux' }],
    resourceMetadata: { keep: 'original' },
    teamInfo: [{ teamName: 'Administrators', permission: ['r', 'audit'], teamId: 'team-original' }]
  },
  {
    id: 'resource-b',
    groupInfo: '/b',
    extra_param: [{ name: 'assets_type', data: 'custom-type' }],
    teamInfo: []
  }
]

let wrapper
const state = () => wrapper.vm.$.setupState
const button = text => wrapper.findAll('button').find(item => item.text().includes(text))
const group = (path = '/a') =>
  wrapper.find(`[role="group"][aria-label="Administrators 对 ${path} 的权限"]`)
const checkbox = (label, path) =>
  group(path)
    .findAllComponents(ElCheckbox)
    .find(item => item.text() === label)
const checked = (label, path) => checkbox(label, path).get('input').element.checked
const change = (label, value, path) => checkbox(label, path).get('input').setValue(value)

async function openPage() {
  wrapper = mount(ResourcePermissionPage, {
    attachTo: document.body,
    global: {
      components: { ElTable, ElTableColumn, ElCheckbox, ElForm, ElFormItem, ElInput, ElPagination },
      stubs: {
        'el-table': false,
        'el-table-column': false,
        'el-checkbox': false,
        'el-button': {
          props: ['disabled', 'loading'],
          template: '<button :disabled="disabled || loading"><slot /></button>'
        },
        'el-form': false,
        'el-form-item': false,
        'el-input': false,
        'el-tag': { template: '<span><slot /></span>' },
        'el-alert': { props: ['title'], template: '<div>{{ title }}<slot /></div>' },
        'el-icon': true,
        'el-pagination': false
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}

beforeEach(() => {
  vi.clearAllMocks()
  api.getTablePermission.mockResolvedValue(fixture())
  api.saveTablePermission.mockResolvedValue({})
  vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})

const sortBy = async (label, order) => {
  await wrapper
    .findAll('th')
    .find(item => item.text() === label)
    .get(`.sort-caret.${order}`)
    .trigger('click')
  await flushPromises()
}
const largeFixture = () =>
  Array.from({ length: 25 }, (_, index) => ({
    id: `resource-${index + 1}`,
    groupInfo: `/group-${index + 1}`,
    extra_param: [{ name: 'assets_type', data: index >= 20 ? 'windows' : 'linux' }],
    teamInfo: [{ teamName: 'Administrators', permission: ['r', 'audit'], teamId: 'original-team' }],
    resourceMetadata: { original: index }
  }))

describe('访问控制的完整记录排序和可见类型搜索', () => {
  it('路径排序覆盖其他页，回首页并保持未保存草稿，取消恢复接口顺序', async () => {
    api.getTablePermission.mockResolvedValueOnce(largeFixture())
    await openPage()
    await change('执行', true, '/group-1')
    await wrapper
      .findAll('.el-pager li')
      .find(item => item.text() === '2')
      .trigger('click')
    await sortBy('资源分组路径', 'descending')
    expect(wrapper.findComponent(ElPagination).props('currentPage')).toBe(1)
    expect(wrapper.findComponent(ElTable).props('data')[0].id).toBe('resource-25')
    expect(state().changedRowIds).toEqual(['resource-1'])
    expect(state().permissionData[0].teamInfo[0].permission).toEqual(['r', 'audit', 'x'])
    await sortBy('资源分组路径', 'descending')
    expect(wrapper.findComponent(ElTable).props('data')[0].id).toBe('resource-1')
    expect(checked('执行', '/group-1')).toBe(true)
    expect(api.getTablePermission).toHaveBeenCalledTimes(1)
    expect(api.saveTablePermission).not.toHaveBeenCalled()
  })

  it('类型排序覆盖全部记录，搜索支持可见中文类型与原类型code，搜索仍需显式应用', async () => {
    api.getTablePermission.mockResolvedValueOnce(largeFixture())
    await openPage()
    await sortBy('适用资产类型', 'descending')
    expect(wrapper.findComponent(ElTable).props('data')[0].id).toBe('resource-21')
    await wrapper.get('.ops-filter-bar input').setValue('  Linux 服务器  ')
    expect(wrapper.findComponent(ElPagination).props('total')).toBe(25)
    await button('搜索').trigger('click')
    await flushPromises()
    expect(wrapper.findComponent(ElPagination).props('total')).toBe(20)
    expect(wrapper.findComponent(ElTable).props('data')[0].id).toBe('resource-1')
    await wrapper.get('.ops-filter-bar input').setValue(' WINDOWS ')
    await wrapper.get('.ops-filter-bar input').trigger('keyup.enter')
    await flushPromises()
    expect(wrapper.findComponent(ElPagination).props('total')).toBe(5)
    expect(
      wrapper
        .findComponent(ElTable)
        .props('data')
        .every(row => row.assets_type === 'windows')
    ).toBe(true)
    expect(api.getTablePermission).toHaveBeenCalledTimes(1)
    expect(api.saveTablePermission).not.toHaveBeenCalled()
  })

  it('排序后保存仍提交真实ID/完整原始顺序和额外字段，不把展示类型写回', async () => {
    const source = largeFixture()
    api.getTablePermission.mockResolvedValueOnce(source)
    await openPage()
    await sortBy('资源分组路径', 'descending')
    await change('修改', true, '/group-25')
    await button('保存权限更改').trigger('click')
    await flushPromises()
    const expected = largeFixture()
    expected[24].teamInfo[0].permission.push('w')
    expect(api.saveTablePermission).toHaveBeenCalledExactlyOnceWith('ACM', expected)
    expect(source).toEqual(largeFixture())
  })

  it('筛选表单拦截原生提交，保留草稿且不触发权限保存', async () => {
    await openPage()
    await change('执行', true)
    const event = new Event('submit', { bubbles: true, cancelable: true })
    wrapper.get('form').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(state().changedRowIds).toEqual(['resource-a'])
    expect(api.saveTablePermission).not.toHaveBeenCalled()
  })
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('资源权限的中文授权交互', () => {
  it('真实表格/复选框展示原团队名、中文权限和授权摘要，读取不保存', async () => {
    await openPage()
    expect(wrapper.text()).toContain('Administrators')
    expect(wrapper.text()).toContain('Linux 服务器')
    expect(wrapper.text()).toContain('custom-type')
    expect(wrapper.text()).toContain('已授权：查看')
    expect(wrapper.text()).toContain('未授予查看、修改或执行权限')
    expect(checked('查看')).toBe(true)
    expect(checked('修改')).toBe(false)
    expect(checked('执行')).toBe(false)
    expect(button('保存权限更改').element.disabled).toBe(true)
    expect(api.saveTablePermission).not.toHaveBeenCalled()
  })

  it('保留原联动：修改/执行补查看，取消查看同时取消两者，保留未知权限', async () => {
    await openPage()
    await change('查看', false)
    await change('修改', true)
    expect(checked('查看')).toBe(true)
    expect(checked('修改')).toBe(true)
    expect(checked('执行')).toBe(false)
    await change('执行', true)
    expect(group().element.parentElement.textContent).toContain('待保存：查看、修改、执行')
    await change('修改', false)
    expect(checked('查看')).toBe(true)
    expect(checked('执行')).toBe(true)
    await change('查看', false)
    expect(checked('修改')).toBe(false)
    expect(checked('执行')).toBe(false)
    expect(state().permissionData[0].teamInfo[0].permission).toEqual(['audit'])
    expect(group().element.parentElement.textContent).toContain('未保存')
    expect(api.saveTablePermission).not.toHaveBeenCalled()
  })

  it('授权缺省团队后取消回到未变更状态，不把空团队当成待保存权限', async () => {
    await openPage()
    await change('执行', true, '/b')
    expect(checked('查看', '/b')).toBe(true)
    expect(checked('修改', '/b')).toBe(false)
    await change('查看', false, '/b')
    expect(state().hasPendingChanges).toBe(false)
    expect(button('保存权限更改').element.disabled).toBe(true)
    expect(group('/b').element.parentElement.textContent).not.toContain('未保存')
  })

  it('筛选和分页保留草稿，撤销恢复原权限与未知字段且不提交', async () => {
    await openPage()
    await change('执行', true)
    state().pageSize = 1
    state().currentPage = 2
    await flushPromises()
    expect(group('/b').exists()).toBe(true)
    state().searchKeyword = '/b'
    state().handleSearch()
    await flushPromises()
    expect(wrapper.text()).toContain('1 项资源的权限待保存（含其他页及筛选外的修改）')
    expect(state().permissionData[0].teamInfo[0].permission).toContain('x')
    await button('撤销修改').trigger('click')
    await flushPromises()
    expect(state().permissionData).toEqual(fixture())
    expect(state().appliedSearch).toBe('/b')
    expect(state().hasPendingChanges).toBe(false)
    expect(api.saveTablePermission).not.toHaveBeenCalled()
  })

  it('保存沿用 ACM 和完整原始结构，进行中阻止继续编辑、撤销、刷新和重复保存', async () => {
    let finishSave
    api.saveTablePermission.mockReturnValue(
      new Promise(resolve => {
        finishSave = resolve
      })
    )
    const source = fixture()
    api.getTablePermission.mockResolvedValue(source)
    await openPage()
    await change('修改', true)
    await button('保存权限更改').trigger('click')
    const expected = fixture()
    expected[0].teamInfo[0].permission.push('w')
    expect(api.saveTablePermission).toHaveBeenCalledExactlyOnceWith('ACM', expected)
    expect(source).toEqual(fixture())
    expect(checkbox('执行').get('input').element.disabled).toBe(true)
    state().togglePermission(state().tableData[0], 'Administrators', 'x')
    state().handleResetPending()
    await state().handleRefresh()
    await state().handleSave()
    expect(api.getTablePermission).toHaveBeenCalledTimes(1)
    expect(api.saveTablePermission).toHaveBeenCalledTimes(1)
    expect(state().permissionData).toEqual(expected)
    finishSave({})
    await flushPromises()
    expect(state().originalPermissionData).toEqual(expected)
    expect(state().hasPendingChanges).toBe(false)
    expect(checkbox('执行').get('input').element.disabled).toBe(false)
  })

  it('保存失败保留待保存范围和选择，可按原参数重试', async () => {
    api.saveTablePermission.mockRejectedValueOnce(new Error('save failed'))
    await openPage()
    await change('执行', true)
    await button('保存权限更改').trigger('click')
    await flushPromises()
    expect(state().hasPendingChanges).toBe(true)
    expect(checked('执行')).toBe(true)
    expect(checkbox('修改').get('input').element.disabled).toBe(false)
    expect(ElMessage.error).toHaveBeenCalledWith('保存权限失败')
    await button('保存权限更改').trigger('click')
    await flushPromises()
    expect(api.saveTablePermission.mock.calls[1]).toEqual(api.saveTablePermission.mock.calls[0])
    expect(state().hasPendingChanges).toBe(false)
  })

  it('刷新已有草稿仍须原确认，取消不会查询或清除修改', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockRejectedValue('cancel')
    await openPage()
    await change('修改', true)
    await state().handleRefresh()
    expect(ElMessageBox.confirm).toHaveBeenCalledTimes(1)
    expect(api.getTablePermission).toHaveBeenCalledTimes(1)
    expect(checked('修改')).toBe(true)
    expect(state().hasPendingChanges).toBe(true)
    expect(api.saveTablePermission).not.toHaveBeenCalled()
  })

  it('加载失败不显示已同步或开放编辑，原查询重试成功后恢复', async () => {
    api.getTablePermission.mockRejectedValueOnce(new Error('load failed'))
    await openPage()
    expect(wrapper.text()).toContain('权限加载失败')
    expect(wrapper.text()).not.toContain('当前权限已保存')
    expect(button('保存权限更改').element.disabled).toBe(true)
    await button('重新加载').trigger('click')
    await flushPromises()
    expect(api.getTablePermission).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('当前权限已保存')
    expect(checked('查看')).toBe(true)
    expect(api.saveTablePermission).not.toHaveBeenCalled()
  })
})
