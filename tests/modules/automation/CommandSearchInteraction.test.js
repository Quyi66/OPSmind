import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElForm, ElInput, ElPagination, ElTable, ElTableColumn } from 'element-plus'
import Page from '@/modules/automation/views/command/CommandListPage.vue'
import ReviewPage from '@/modules/automation/views/command/CommandReviewPage.vue'

const api = vi.hoisted(() => ({
  findByTenantIdAndCreatedBy: vi.fn(),
  findAllUnapprovedCommand: vi.fn(),
  deleteCommand: vi.fn(),
  saveCommand: vi.fn(),
  getCommandStatusInfo: vi.fn()
}))
vi.mock('@/modules/automation/api/command', () => api)
vi.mock('@/stores/useReviewCountStore.js', () => ({
  useReviewCountStore: () => ({ commandCount: 0 })
}))
vi.mock('@/modules/automation/components/command/dialogs/CommandApproveDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/automation/components/command/dialogs/CommandEditDialog.vue', () => ({
  default: { name: 'CommandEditDialog', props: ['mode', 'command'], template: '<div />' }
}))
vi.mock('@/modules/automation/components/command/dialogs/CommandApproveInfoDialog.vue', () => ({
  default: { template: '<div />' }
}))

const records = [
  { id: 'released', name: '已发布命令', command: 'printf published', status: 0 },
  {
    id: 'pending',
    name: '待审核命令',
    command: 'printf obsolete',
    unapprovedCommand: 'printf pending-new',
    status: 1
  },
  {
    id: 'rejected',
    name: '审核拒绝命令',
    command: 'printf obsolete2',
    unapprovedCommand: 'printf rejected-new',
    status: 2
  },
  {
    id: 'draft',
    name: '新建未发布命令',
    command: null,
    unapprovedCommand: 'printf first-draft',
    status: 0
  },
  ...Array.from({ length: 35 }, (_, i) => ({
    id: `ops-${i}`,
    name: `例行命令${i + 1}`,
    command: 'printf running',
    status: 0
  }))
]
let wrapper
const state = () => wrapper.vm.$.setupState
async function open(component = Page) {
  wrapper = mount(component, {
    global: {
      components: { ElTable, ElTableColumn, ElPagination },
      stubs: {
        'el-input': ElInput,
        'el-form': ElForm,
        'el-form-item': { template: '<div><slot /></div>' },
        'el-button': {
          props: ['disabled'],
          template: '<button :disabled="disabled"><slot /></button>'
        },
        'el-icon': true,
        'el-tag': { template: '<span><slot /></span>' }
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset())
  api.getCommandStatusInfo.mockReturnValue({ text: '模拟状态' })
  api.findByTenantIdAndCreatedBy.mockResolvedValue({ data: records })
  api.findAllUnapprovedCommand.mockResolvedValue({ data: records })
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})

async function sortColumn(label, direction) {
  const heading = wrapper.findAll('th').find(item => item.text() === label)
  await heading.get(`.sort-caret.${direction}`).trigger('click')
  await flushPromises()
}

describe.each([
  ['命令列表', Page, 'findByTenantIdAndCreatedBy'],
  ['待审核命令', ReviewPage, 'findAllUnapprovedCommand']
])('%s排序覆盖完整匹配集', (_, component, query) => {
  it('真实表头跨页排序、排序回首页并清旧勾选，清除排序恢复服务端顺序', async () => {
    const shuffled = Array.from({ length: 25 }, (_, i) => ({
      id: `sort-${i}`,
      name: `C${((i * 7 + 12) % 25) + 1}`,
      status: 0,
      command: 'echo example',
      unapprovedCommand: 'echo example'
    }))
    api[query].mockResolvedValueOnce({ data: shuffled })
    await open(component)
    wrapper.findComponent(ElPagination).vm.$emit('update:current-page', 3)
    await flushPromises()
    await wrapper.find('.el-table__body-wrapper input[type="checkbox"]').setValue(true)
    expect(state().selectedCommands).toHaveLength(1)
    await sortColumn('名称', 'ascending')
    expect(state().currentPage).toBe(1)
    expect(state().selectedCommands).toEqual([])
    expect(state().pagedCommands.map(row => row.name)).toEqual(
      Array.from({ length: 10 }, (_, i) => `C${i + 1}`)
    )
    wrapper.findComponent(ElPagination).vm.$emit('update:current-page', 2)
    await flushPromises()
    expect(state().pagedCommands[0].name).toBe('C11')
    await sortColumn('名称', 'descending')
    expect(state().currentPage).toBe(1)
    expect(state().pagedCommands[0].name).toBe('C25')
    await sortColumn('名称', 'descending')
    expect(state().pagedCommands[0].name).toBe('C13')
    expect(state().commands).toEqual(shuffled)
    expect(api[query]).toHaveBeenCalledTimes(1)
    expect(api.saveCommand).not.toHaveBeenCalled()
    expect(api.deleteCommand).not.toHaveBeenCalled()
  })

  it('时间按实际先后排序，空值和非法时间在两个方向均居后', async () => {
    const data = [
      { id: 'unknown', name: '无时间', createdAt: null },
      { id: 'later', name: '较晚', createdAt: '2026-01-02T00:00:00Z' },
      { id: 'earlier', name: '较早', createdAt: '2026-01-01T23:00:00+08:00' },
      { id: 'invalid', name: '非法时间', createdAt: 'invalid' }
    ]
    api[query].mockResolvedValueOnce({ data })
    await open(component)
    await sortColumn('创建时间', 'ascending')
    expect(state().pagedCommands.map(row => row.id)).toEqual([
      'earlier',
      'later',
      'unknown',
      'invalid'
    ])
    await sortColumn('创建时间', 'descending')
    expect(state().pagedCommands.map(row => row.id)).toEqual([
      'later',
      'earlier',
      'unknown',
      'invalid'
    ])
    expect(state().commands).toEqual(data)
  })
})

it('命令状态排序保留真实数值0，并将缺失状态放在已知状态后', async () => {
  const data = [
    { id: 'missing', status: null },
    { id: 'two', status: 2 },
    { id: 'zero', status: 0 },
    { id: 'one', status: 1 }
  ]
  api.findByTenantIdAndCreatedBy.mockResolvedValueOnce({ data })
  await open()
  await sortColumn('状态', 'ascending')
  expect(state().pagedCommands.map(row => row.id)).toEqual(['zero', 'one', 'two', 'missing'])
  await sortColumn('状态', 'descending')
  expect(state().pagedCommands.map(row => row.id)).toEqual(['two', 'one', 'zero', 'missing'])
})
afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('命令列表搜索与可见内容一致', () => {
  it.each([
    ['pending-new', 'pending'],
    ['rejected-new', 'rejected'],
    ['first-draft', 'draft']
  ])('搜索当前显示命令%s得到原记录%s，不修改原命令或审核状态', async (keyword, id) => {
    await open()
    await wrapper.get('input').setValue(`  ${keyword.toUpperCase()}  `)
    await flushPromises()
    expect(state().filteredCommands.map(row => row.id)).toEqual([id])
    expect(wrapper.text()).toContain(keyword)
    expect(state().commands).toEqual(records)
    expect(api.findByTenantIdAndCreatedBy).toHaveBeenCalledTimes(1)
    expect(api.saveCommand).not.toHaveBeenCalled()
  })

  it('第3页输入实时回首页，清除恢复全部；隐藏的旧版本内容不误匹配', async () => {
    await open()
    wrapper.findComponent(ElPagination).vm.$emit('update:current-page', 3)
    await flushPromises()
    await wrapper.get('input').setValue('running')
    await flushPromises()
    expect(state().currentPage).toBe(1)
    expect(state().filteredCommands).toHaveLength(35)
    await wrapper.get('input').setValue('obsolete')
    await flushPromises()
    expect(state().filteredCommands).toEqual([])
    await wrapper.get('input').setValue('')
    await flushPromises()
    expect(state().filteredCommands).toEqual(records)
    expect(api.findByTenantIdAndCreatedBy).toHaveBeenCalledTimes(1)
  })

  it('查到待审核命令后仍不能勾选执行，查看保留真实ID和只读模式', async () => {
    await open()
    await wrapper.get('input').setValue('pending-new')
    await flushPromises()
    const row = wrapper.find('.el-table__body-wrapper tbody tr')
    expect(row.find('input[type="checkbox"]').attributes('disabled')).toBeDefined()
    await row
      .findAll('button')
      .find(item => item.text() === '待审核命令')
      .trigger('click')
    const dialog = wrapper.findComponent({ name: 'CommandEditDialog' })
    expect(dialog.props('mode')).toBe('view')
    expect(dialog.props('command').id).toBe('pending')
    expect(api.saveCommand).not.toHaveBeenCalled()
    expect(api.deleteCommand).not.toHaveBeenCalled()
  })
})

it('搜索表单阻止原生提交，Enter保留原本地搜索且不发业务请求', async () => {
  await open()
  const submit = new Event('submit', { bubbles: true, cancelable: true })
  wrapper.get('form').element.dispatchEvent(submit)
  expect(submit.defaultPrevented).toBe(true)
  expect(api.findByTenantIdAndCreatedBy).toHaveBeenCalledTimes(1)
  state().currentPage = 3
  await wrapper.get('input').trigger('keyup', { key: 'Enter' })
  expect(state().currentPage).toBe(1)
  expect(api.findByTenantIdAndCreatedBy).toHaveBeenCalledTimes(1)
  expect(api.saveCommand).not.toHaveBeenCalled()
})
