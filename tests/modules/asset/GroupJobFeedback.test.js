import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { ElMessage, ElMessageBox } from 'element-plus'
import DataAddGroupDialog from '@/modules/asset/components/data/DataAddGroupDialog.vue'
import DataEditGroupDialog from '@/modules/asset/components/data/DataEditGroupDialog.vue'
import AddGroupDialog from '@/modules/asset/components/asset-info/AddGroupDialog.vue'
import GroupAssetDialog from '@/modules/asset/components/data/GroupAssetDialog.vue'
import TagAssetDialog from '@/modules/asset/components/data/TagAssetDialog.vue'
import DataManagePage from '@/modules/asset/views/DataManagePage.vue'

const api = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  deleteGroup: vi.fn(),
  deleteTag: vi.fn(),
  groups: vi.fn(),
  tags: vi.fn()
}))
vi.mock('@/core/api', () => ({ apiService: { post: api.post, get: api.get } }))
vi.mock('@/modules/asset/api', () => ({
  dataManageApi: {
    getResourceTypes: vi
      .fn()
      .mockResolvedValue({ records: [{ code: 'windows', title: 'Windows' }] }),
    getAllGroups: api.groups,
    getAllTags: api.tags,
    deleteGroup: api.deleteGroup,
    deleteTag: api.deleteTag
  },
  assetApi: {
    getGroupByCit: vi.fn().mockResolvedValue({ records: [{ id: 'parent/a', path: '/' }] })
  }
}))
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn() })
}))
const Form = defineComponent({
  setup(_props, { slots, expose }) {
    expose({ validate: async () => true, resetFields() {} })
    return () => h('div', slots.default?.())
  }
})
const failure = () => [
  {
    status: 'ERROR',
    data: null,
    error: '{"message":"作业参数校验失败"}',
    detail: { statusCode: 400 }
  }
]
const success = () => [{ status: 'SUCCESS', error: null }]
const group = { id: 'group/a', ci_type: 'windows', path: '/old' }
const rows = [{ id: 'asset/a' }, { id: 'asset/b' }]
let wrapper
const state = () => wrapper.vm.$.setupState
async function open(component, props = {}) {
  wrapper = mount(component, {
    props: {
      modelValue: false,
      ...props,
      'onUpdate:modelValue': value => wrapper.setProps({ modelValue: value })
    },
    global: {
      directives: { loading: () => {} },
      stubs: {
        'el-dialog': {
          props: ['modelValue'],
          template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>'
        },
        'el-form': Form,
        'el-form-item': { template: '<div><slot /></div>' },
        ...Object.fromEntries(
          [
            'el-button',
            'el-input',
            'el-select',
            'el-option',
            'el-radio-group',
            'el-radio',
            'el-table',
            'el-table-column',
            'el-pagination',
            'el-tooltip',
            'el-tabs',
            'el-tab-pane',
            'el-tag',
            'DataAddGroupDialog',
            'DataEditGroupDialog',
            'AddGroupDialog',
            'DataAddTagDialog',
            'DataEditTagDialog',
            'GroupAssetDialog',
            'TagAssetDialog'
          ].map(name => [name, true])
        )
      }
    }
  })
  await wrapper.setProps({ modelValue: true })
  await flushPromises()
}
beforeEach(() => {
  vi.clearAllMocks()
  api.post.mockReset()
  api.get.mockResolvedValue({ data: { content: rows, totalElements: rows.length } })
  api.groups.mockResolvedValue({ records: [group] })
  api.tags.mockResolvedValue({ records: [{ id: 'tag/a', name: 'old' }] })
  api.deleteGroup.mockReset()
  api.deleteTag.mockReset()
  vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
  vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
})

describe.each([
  {
    label: '新增分组',
    component: DataAddGroupDialog,
    props: {},
    fields: { ciType: 'windows', name: 'new', parentId: 'parent/a' },
    job: 'a17VXM',
    payload: {
      operate: 'new',
      ciIds: null,
      id: null,
      name: 'new',
      parentId: 'parent/a',
      ciType: 'windows'
    }
  },
  {
    label: '编辑分组',
    component: DataEditGroupDialog,
    props: { groupData: group },
    fields: { name: 'new', parentId: 'parent/a' },
    job: 'BAzNVq',
    payload: {
      id: group.id,
      name: 'new',
      operate: 'modify',
      parentId: 'parent/a',
      ciType: 'windows',
      ciIds: null,
      path: ''
    }
  },
  {
    label: '资产关联已有分组',
    component: AddGroupDialog,
    props: { ciIds: rows.map(row => row.id), assetType: 'windows' },
    fields: { id: 'group/a' },
    job: 'a17VXM',
    payload: {
      operate: 'new',
      ciIds: 'asset/a,asset/b',
      ciType: 'windows',
      id: 'group/a',
      name: ''
    }
  }
])('$label 失败反馈', testCase => {
  it('HTTP成功内含ERROR时留窗留输入不发saved；成功重试保留原参数和回调', async () => {
    api.post.mockResolvedValueOnce({ data: failure() }).mockResolvedValueOnce({ data: success() })
    await open(testCase.component, testCase.props)
    Object.assign(state().formData, testCase.fields)
    await state().handleSave()
    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining(`/jobs/${testCase.job}/run?`),
      { params: testCase.payload }
    )
    expect(ElMessage.success).not.toHaveBeenCalled()
    expect(ElMessage.error).toHaveBeenCalledWith(expect.stringContaining('作业参数校验失败'))
    expect(wrapper.props('modelValue')).toBe(true)
    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(state().formData).toMatchObject(testCase.fields)
    expect(state().saving).toBe(false)
    await state().handleSave()
    expect(wrapper.emitted('saved')).toEqual([[]])
    expect(wrapper.props('modelValue')).toBe(false)
    expect(ElMessage.success).toHaveBeenCalledOnce()
  })
})

describe.each([
  {
    component: GroupAssetDialog,
    props: { groupData: group },
    job: 'oJXQFK',
    payload: { groupId: group.id, ciId: 'asset/a,asset/b' }
  },
  {
    component: TagAssetDialog,
    props: { tagData: { id: 'tag/a' } },
    job: 'dosxGT',
    payload: { tagId: 'tag/a', ciId: 'asset/a,asset/b' }
  }
])('关联移除 $job', testCase => {
  it('失败不提示成功或刷新/清选择，成功才刷新，确认约束保持', async () => {
    api.post.mockResolvedValueOnce({ data: failure() }).mockResolvedValueOnce({ data: success() })
    await open(testCase.component, testCase.props)
    state().handleSelectionChange(rows)
    const reads = api.get.mock.calls.length
    state().handleRemoveAsset()
    await flushPromises()
    expect(ElMessageBox.confirm).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ closeOnClickModal: false, closeOnPressEscape: false })
    )
    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining(`/jobs/${testCase.job}/run?`),
      { params: testCase.payload }
    )
    expect(ElMessage.success).not.toHaveBeenCalled()
    expect(ElMessage.error).toHaveBeenCalledWith(expect.stringContaining('作业参数校验失败'))
    expect(state().selectedRows).toEqual(rows)
    expect(api.get).toHaveBeenCalledTimes(reads)
    state().handleRemoveAsset()
    await flushPromises()
    expect(ElMessage.success).toHaveBeenCalledExactlyOnceWith('移除成功')
    expect(api.get).toHaveBeenCalledTimes(reads + 1)
  })
})

describe.each([
  { method: 'handleDeleteGroup', request: 'deleteGroup', read: 'groups' },
  { method: 'handleDeleteTag', request: 'deleteTag', read: 'tags' }
])('数据管理删除 $request', testCase => {
  it('原始ERROR数组不成功/不刷新；取消无请求，成功才刷新', async () => {
    await open(DataManagePage)
    const reads = api[testCase.read].mock.calls.length
    api[testCase.request].mockResolvedValueOnce(failure()).mockResolvedValueOnce(success())
    state()[testCase.method]({ id: 'actual-id/a' })
    await flushPromises()
    expect(api[testCase.request]).toHaveBeenCalledExactlyOnceWith('actual-id/a')
    expect(ElMessage.success).not.toHaveBeenCalled()
    expect(ElMessage.error).toHaveBeenCalledWith(expect.stringContaining('作业参数校验失败'))
    expect(api[testCase.read]).toHaveBeenCalledTimes(reads)
    vi.mocked(ElMessageBox.confirm).mockRejectedValueOnce('cancel')
    state()[testCase.method]({ id: 'actual-id/a' })
    await flushPromises()
    expect(api[testCase.request]).toHaveBeenCalledTimes(1)
    state()[testCase.method]({ id: 'actual-id/a' })
    await flushPromises()
    expect(ElMessage.success).toHaveBeenCalledExactlyOnceWith('删除成功')
    expect(api[testCase.read]).toHaveBeenCalledTimes(reads + 1)
  })
})
