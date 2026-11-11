import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import {
  ElForm,
  ElFormItem,
  ElInput,
  ElSelect,
  ElOption,
  ElPagination,
  ElTable,
  ElTableColumn
} from 'element-plus'
import YumPage from '@/modules/patches/views/LinuxYumManagePage.vue'

const api = vi.hoisted(() => ({
  getHostYumList: vi.fn(),
  getHostRepoDetail: vi.fn(),
  runJob: vi.fn()
}))
vi.mock('@/modules/patches/api', () => ({ yumManageApi: api }))
vi.mock('@/modules/automation/api/command', () => ({ runJob: api.runJob }))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { name: 'ExecuteResultDialog', props: ['visible', 'runId'], template: '<div />' }
}))
vi.mock('@/composables/useJobPolling', () => ({ useJobPolling: () => ({ startPolling: vi.fn() }) }))
vi.mock('@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock(
  '@/modules/automation/components/job/schedule/components/AcmDeviceSelectorDialog.vue',
  () => ({
    default: {
      name: 'AcmDeviceSelectorDialog',
      props: ['modelValue', 'allowEmpty', 'closeOnConfirm', 'submitting'],
      template: '<div />'
    }
  })
)
let wrapper
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const state = () => wrapper.vm.$.setupState
const hostInput = () => wrapper.get('input[placeholder="搜索..."]')
const detailInput = () => wrapper.get('input[placeholder="搜索名称、地址..."]')
const button = text => wrapper.findAll('button').find(item => item.text() === text)
async function open() {
  wrapper = mount(YumPage, {
    global: {
      components: {
        ElForm,
        ElFormItem,
        ElInput,
        ElSelect,
        ElOption,
        ElPagination,
        ElTable,
        ElTableColumn
      },
      stubs: {
        'el-form': ElForm,
        'el-form-item': ElFormItem,
        'el-input': ElInput,
        'el-select': ElSelect,
        'el-option': ElOption,
        'el-button': { template: '<button type="button"><slot /></button>' },
        'el-link': { template: '<a href="#" @click.prevent><slot /></a>' },
        'el-tag': { template: '<span><slot /></span>' },
        'el-icon': true,
        'el-alert': { template: '<aside><slot name="title" /></aside>' },
        'el-dialog': {
          name: 'ElDialog',
          props: ['modelValue'],
          template: '<aside v-if="modelValue"><slot /><slot name="footer" /></aside>'
        }
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
async function detail() {
  await wrapper.findAll('a')[0].trigger('click')
  await flushPromises()
}
async function page(index, value) {
  wrapper.findAllComponents(ElPagination)[index].vm.$emit('update:current-page', value)
  await flushPromises()
}
async function status(value) {
  const select = wrapper.findAllComponents(ElForm)[1].findComponent(ElSelect)
  select.vm.$emit('update:modelValue', value)
  select.vm.$emit('change', value)
  await flushPromises()
}
beforeEach(() => {
  api.getHostYumList.mockReset().mockResolvedValue({
    data: {
      records: Array.from({ length: 65 }, (_, index) => ({
        $id: `real-host-id-${index}`,
        $data_owner: index < 35 ? `Alpha-${index}` : `Other-${index}`,
        os_distro: 'RedHat',
        os_version: '9',
        yum_count: index
      }))
    }
  })
  api.getHostRepoDetail.mockReset().mockImplementation(({ repo_status }) =>
    Promise.resolve({
      data: {
        records: Array.from({ length: 65 }, (_, index) => ({
          $data_owner: 'Alpha-0',
          'repo-name':
            index < 35 ? `Base-${repo_status}-${index}` : `Other-${repo_status}-${index}`,
          'repo-status': repo_status,
          'repo-baseurl': `https://repo.invalid/${repo_status}/${index}`,
          'repo-file': `/etc/yum.repos.d/source-${index}.repo`
        }))
      }
    })
  )
  api.runJob.mockReset()
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
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('YUM源清单现有筛选接线', () => {
  it('扫描 YUM 源直接选择设备，确认时保留原作业及分组参数', async () => {
    await open()
    state().handleScanRepoList()
    await flushPromises()
    const selector = wrapper.findComponent({ name: 'AcmDeviceSelectorDialog' })
    expect(selector.props()).toMatchObject({
      modelValue: true,
      allowEmpty: false,
      closeOnConfirm: false
    })
    expect(api.runJob).not.toHaveBeenCalled()
    const hosts = [
      { key: 'group/A', value: '/group', assetType: 'linux', runType: 'group', total_hosts: 3 }
    ]
    api.runJob.mockResolvedValueOnce({ data: [{ runId: 'yum/run-id' }] })
    selector.vm.$emit('confirm', hosts)
    selector.vm.$emit('confirm', hosts)
    await flushPromises()
    expect(api.runJob).toHaveBeenCalledExactlyOnceWith('IxL8nr', {
      params: { hosts, func: 'yum-list' }
    })
    expect(selector.props('modelValue')).toBe(false)
    expect(selector.props('submitting')).toBe(false)
    expect(wrapper.text()).toContain('最近提交的 YUM 源扫描任务')
    await button('查看进度与结果').trigger('click')
    const result = wrapper.findComponent({ name: 'ExecuteResultDialog' })
    expect(result.props()).toMatchObject({ visible: true, runId: 'yum/run-id' })
    result.vm.$emit('update:visible', false)
    await flushPromises()
    await button('查看进度与结果').trigger('click')
    expect(result.props('visible')).toBe(true)
    expect(api.runJob).toHaveBeenCalledTimes(1)
    state().handleScanRepoList()
    await flushPromises()
    expect(selector.props('modelValue')).toBe(true)
  })

  it('明确提交失败时保留选择器，不创建虚假的任务结果入口', async () => {
    await open()
    state().handleScanRepoList()
    await flushPromises()
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    api.runJob.mockResolvedValueOnce({
      data: { status: 'FAILED', runId: 'failed-id', error: '原始原因 X9' }
    })
    const selector = wrapper.findComponent({ name: 'AcmDeviceSelectorDialog' })
    selector.vm.$emit('confirm', [{ key: 'host/A', value: '192.0.2.1' }])
    await flushPromises()
    expect(selector.props('modelValue')).toBe(true)
    expect(selector.props('submitting')).toBe(false)
    expect(wrapper.text()).not.toContain('最近提交的 YUM 源扫描任务')
    error.mockRestore()
  })

  it('主机后页实时搜索回首页，trim/大小写匹配，清除恢复且不重复读取', async () => {
    await open()
    await page(0, 6)
    await hostInput().setValue(' ALPHA ')
    await flushPromises()
    expect(state().hostPagination.page).toBe(1)
    expect(state().filteredHostTableData).toHaveLength(35)
    expect(state().paginatedHostTableData[0].$id).toBe('real-host-id-0')
    await hostInput().setValue('')
    await flushPromises()
    expect(state().filteredHostTableData).toHaveLength(65)
    expect(api.getHostYumList).toHaveBeenCalledTimes(1)
    expect(api.getHostYumList).toHaveBeenCalledWith({ page: 1, size: 1000 })
  })

  it('详情后页按源名称/地址即时搜索回首页，不重新GET或改变主机', async () => {
    await open()
    await detail()
    await page(1, 3)
    await detailInput().setValue(' BASE ')
    await flushPromises()
    expect(state().detailPagination.page).toBe(1)
    expect(state().filteredRepoDetailData).toHaveLength(35)
    await detailInput().setValue('https://repo.invalid/enabled/64')
    await flushPromises()
    expect(state().filteredRepoDetailData.map(row => row['repo-name'])).toEqual([
      'Other-enabled-64'
    ])
    expect(state().currentHostDetail.$id).toBe('real-host-id-0')
    expect(api.getHostRepoDetail).toHaveBeenCalledTimes(1)
    expect(api.runJob).not.toHaveBeenCalled()
  })

  it('状态切换读取原repo_status契约，重置从禁用恢复启用并保留原主机', async () => {
    await open()
    await detail()
    await detailInput().setValue('base')
    await status('disabled')
    expect(api.getHostRepoDetail).toHaveBeenLastCalledWith({
      data_owner: 'Alpha-0',
      repo_status: 'disabled'
    })
    expect(state().paginatedRepoDetailData[0]['repo-status']).toBe('disabled')
    expect(detailInput().element.value).toBe('base')
    await button('重置').trigger('click')
    await flushPromises()
    expect(api.getHostRepoDetail).toHaveBeenLastCalledWith({
      data_owner: 'Alpha-0',
      repo_status: 'enabled'
    })
    expect(state().paginatedRepoDetailData[0]['repo-status']).toBe('enabled')
    expect(detailInput().element.value).toBe('')
    expect(api.getHostRepoDetail).toHaveBeenCalledTimes(3)
    expect(api.runJob).not.toHaveBeenCalled()
  })

  it('两筛选表单阻止原生提交，搜索与状态查看不执行扫描/源配置任务', async () => {
    await open()
    await detail()
    for (const form of wrapper.findAll('form')) {
      const event = new Event('submit', { bubbles: true, cancelable: true })
      form.element.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
    }
    expect(api.runJob).not.toHaveBeenCalled()
  })

  it('快速切状态后旧启用结果不能覆盖禁用查询或提前结束loading', async () => {
    await open()
    const old = deferred(),
      latest = deferred()
    api.getHostRepoDetail.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    await detail()
    await status('disabled')
    old.resolve({ data: [{ 'repo-name': '旧启用源', 'repo-status': 'enabled' }] })
    await flushPromises()
    expect(state().hostDetailLoading).toBe(true)
    expect(state().hostRepoDetailData).toEqual([])
    latest.resolve({ data: [{ 'repo-name': '新禁用源', 'repo-status': 'disabled' }] })
    await flushPromises()
    expect(state().hostRepoDetailData[0]['repo-name']).toBe('新禁用源')
    expect(state().hostDetailLoading).toBe(false)
    expect(api.runJob).not.toHaveBeenCalled()
  })

  it('关闭主机A后打开B清旧明细，A迟到错误不清B或结束B加载', async () => {
    await open()
    const old = deferred(),
      latest = deferred()
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    api.getHostRepoDetail.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    await detail()
    wrapper
      .findAllComponents({ name: 'ElDialog' })
      .find(item => item.props('modelValue'))
      .vm.$emit('update:modelValue', false)
    await flushPromises()
    await wrapper.findAll('a')[1].trigger('click')
    await flushPromises()
    old.reject(new Error('旧主机读取失败'))
    await flushPromises()
    expect(state().hostDetailLoading).toBe(true)
    expect(state().currentHostDetail.$id).toBe('real-host-id-1')
    expect(error).not.toHaveBeenCalled()
    latest.resolve({ data: [{ 'repo-name': 'B的源', 'repo-status': 'enabled' }] })
    await flushPromises()
    expect(state().hostRepoDetailData[0]['repo-name']).toBe('B的源')
    expect(api.getHostRepoDetail).toHaveBeenLastCalledWith({
      data_owner: 'Alpha-1',
      repo_status: 'enabled'
    })
    expect(api.runJob).not.toHaveBeenCalled()
  })

  it('卸载后详情不再记录过期错误，不执行任何任务', async () => {
    await open()
    const pending = deferred()
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    api.getHostRepoDetail.mockReturnValueOnce(pending.promise)
    await detail()
    wrapper.unmount()
    pending.reject(new Error('unmounted'))
    await flushPromises()
    expect(error).not.toHaveBeenCalled()
    expect(api.runJob).not.toHaveBeenCalled()
  })

  it('新主机加载前清除已展示的旧主机源，当前读取错误仍清空并结束加载', async () => {
    await open()
    await detail()
    expect(state().hostRepoDetailData).toHaveLength(65)
    wrapper
      .findAllComponents({ name: 'ElDialog' })
      .find(item => item.props('modelValue'))
      .vm.$emit('update:modelValue', false)
    await flushPromises()
    const next = deferred()
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    api.getHostRepoDetail.mockReturnValueOnce(next.promise)
    await wrapper.findAll('a')[1].trigger('click')
    await flushPromises()
    expect(state().hostRepoDetailData).toEqual([])
    expect(state().hostDetailLoading).toBe(true)
    next.reject(new Error('当前主机读取失败'))
    await flushPromises()
    expect(state().hostRepoDetailData).toEqual([])
    expect(state().hostDetailLoading).toBe(false)
    expect(state().hostDetailDialogVisible).toBe(true)
    expect(error).toHaveBeenCalledTimes(1)
    expect(api.runJob).not.toHaveBeenCalled()
  })
})
