import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElInput, ElOption, ElPagination, ElSelect, ElTable, ElTableColumn } from 'element-plus'
import Requests from '@/modules/automation/views/job/JobMyRequestsPage.vue'
import Approvals from '@/modules/automation/views/job/JobApprovalsPage.vue'
import { setLocale } from '@/core/i18n'

const api = vi.hoisted(() => ({ fetchMyApproveList: vi.fn(), fetchApproveList: vi.fn() }))
vi.mock('@/modules/automation/api/jao', () => api)
vi.mock('@/stores/useReviewCountStore.js', () => ({
  useReviewCountStore: () => ({ approvalCount: 0 })
}))
vi.mock('@/modules/automation/components/job/JobApproveDetailDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/automation/components/job/JobApprovalDetailDialog.vue', () => ({
  default: { template: '<div />' }
}))

const rows = [0, 1, 2, 3].map(status => ({
  id: `approve-${status}`,
  jobId: `job-${status}`,
  jobName: `工具${status}`,
  status
}))
let wrapper, host
const state = () => wrapper.vm.$.setupState
async function open(component) {
  host = document.createElement('div')
  document.body.appendChild(host)
  wrapper = mount(component, {
    attachTo: host,
    global: {
      components: { ElSelect, ElOption, ElTable, ElTableColumn },
      stubs: {
        'el-form': { template: '<form @submit.prevent><slot /></form>' },
        'el-form-item': { template: '<div><slot /></div>' },
        'el-input': ElInput,
        'el-button': { template: '<button><slot /></button>' },
        'el-icon': true,
        'el-tag': { template: '<span><slot /></span>' },
        'el-pagination': ElPagination
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
async function selectStatus(status) {
  const select = wrapper.findComponent(ElSelect)
  select.vm.$emit('update:modelValue', status)
  select.vm.$emit('change', status)
  await flushPromises()
}
async function clearStatus() {
  await wrapper.get('.el-select').trigger('mouseenter')
  await flushPromises()
  await wrapper.get('.el-select__clear').trigger('click')
  await flushPromises()
}
beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset().mockResolvedValue({ data: rows }))
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})
afterEach(async () => {
  wrapper?.unmount()
  host?.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  await setLocale('zh-CN', { persist: false })
})

describe.each([
  ['我的申请', Requests, 'fetchMyApproveList'],
  ['待我审批', Approvals, 'fetchApproveList']
])('%s状态清除', (_, component, query) => {
  it('normalizes English duration counts without changing backend rows or the original Chinese display', async () => {
    const records = ['02', '0', 1, 'invalid', null, 'Infinity'].map((validHour, index) => ({
      id: `duration-${index}`, jobId: `tool-${index}`, jobName: `Tool ${index}`,
      status: 0, approveMode: 'unlimitedParams', validHour
    }))
    api[query].mockResolvedValueOnce({ data: records })
    await setLocale('en-US', { persist: false })
    await open(component)
    const durations = () => wrapper.findAll('.el-table__body-wrapper tbody tr').map(row => row.findAll('td')[4].text())
    expect(durations()).toEqual(['2 hours', '0 hours', '1 hour', '-', '-', '-'])
    await setLocale('zh-CN', { persist: false })
    await flushPromises()
    expect(durations()).toEqual(['02 小时', '0 小时', '1 小时', 'invalid 小时', '-', 'Infinity 小时'])
    expect(state().tableData).toEqual(records)
    expect(api[query]).toHaveBeenCalledTimes(1)
  })

  it('数值0正常筛出审批中，点击状态清除恢复全部状态', async () => {
    await open(component)
    await selectStatus(0)
    expect(state().filteredData.map(row => row.id)).toEqual(['approve-0'])
    await clearStatus()
    expect(state().filters.status).toBe('')
    expect(state().filteredData).toEqual(rows)
    expect(api[query]).toHaveBeenCalledTimes(1)
  })

  it('清除状态保留关键词并回首页，不修改审批数据或发业务请求', async () => {
    await open(component)
    state().filters.keyword = '工具1'
    await selectStatus(2)
    expect(state().filteredData).toEqual([])
    state().currentPage = 3
    await clearStatus()
    expect(state().filters.keyword).toBe('工具1')
    expect(state().currentPage).toBe(1)
    expect(state().filteredData.map(row => row.id)).toEqual(['approve-1'])
    expect(state().tableData).toEqual(rows)
    expect(api[query]).toHaveBeenCalledTimes(1)
  })

  it('第3页实时输入带空格关键词回首页，清除恢复原数据，不额外查询', async () => {
    const records = Array.from({ length: 45 }, (_, index) => ({
      id: `approval-${index}`,
      jobId: `tool-${index}`,
      jobName: `${index < 35 ? '例行工具' : '手工工具'}${index}`,
      status: index % 4
    }))
    api[query].mockResolvedValueOnce({ data: records })
    await open(component)
    wrapper.findComponent(ElPagination).vm.$emit('update:current-page', 3)
    await flushPromises()
    expect(state().currentPage).toBe(3)
    const input = wrapper.get('input[placeholder="搜索运维工具名称"]')
    await input.setValue(' 例行工具 ')
    await flushPromises()
    expect(state().currentPage).toBe(1)
    expect(state().filteredData).toHaveLength(35)
    expect(state().filters.keyword).toBe(' 例行工具 ')
    await input.setValue('')
    await flushPromises()
    expect(state().filteredData).toEqual(records)
    expect(api[query]).toHaveBeenCalledTimes(1)
  })
})
