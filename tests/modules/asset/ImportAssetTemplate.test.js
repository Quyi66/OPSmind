import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { flushPromises, shallowMount } from '@vue/test-utils'
import ImportAssetDialog from '@/modules/asset/components/asset-info/ImportAssetDialog.vue'
import { ElMessage } from 'element-plus'
import { setLocale } from '@/core/i18n'

const api = vi.hoisted(() => ({ download: vi.fn(), post: vi.fn() }))
vi.mock('@/core/api', () => ({ apiService: api, getJaoOperationLogs: vi.fn() }))
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), warning: vi.fn(), success: vi.fn() }
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { template: '<div />' }
}))

const wrappers = []
function mountDialog(tenantId = 'tenant-1') {
  const wrapper = shallowMount(ImportAssetDialog, {
    props: { modelValue: true, tenantId },
    global: {
      stubs: {
        'el-dialog': { template: '<div><slot /><slot name="footer" /></div>' },
        'el-button': {
          name: 'ElButton',
          props: ['loading', 'disabled'],
          emits: ['click'],
          template:
            '<button :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>'
        },
        ElUpload: true
      }
    }
  })
  wrappers.push(wrapper)
  return wrapper
}
const downloadButton = wrapper =>
  wrapper
    .findAllComponents({ name: 'ElButton' })
    .find(button => button.text().includes('下载资产信息导入模板'))

beforeEach(() => {
  api.download.mockReset().mockResolvedValue({})
  vi.clearAllMocks()
  vi.spyOn(window, 'open').mockImplementation(() => null)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
  await setLocale('zh-CN', { persist: false })
})

describe('CMDB asset import template download', () => {
  it('keeps a selected file and tenant header through language changes, and localizes the downloaded filename', async () => {
    const wrapper = mountDialog('原始租户-ID')
    const vm = wrapper.vm.$.setupState
    const file = new File(['raw workbook'], '原始中文文件.xlsx')
    vm.handleFileChange({ raw: file })
    await setLocale('en-US', { persist: false }); await flushPromises()
    expect(vm.selectedFile).toBe(file)
    const button = wrapper.findAllComponents({ name: 'ElButton' }).find(item => item.text() === 'Download the asset import template')
    await button.trigger('click'); await flushPromises()
    expect(api.download).toHaveBeenCalledExactlyOnceWith('/cmdb/api/cmdb/cit/template2/%E5%8E%9F%E5%A7%8B%E7%A7%9F%E6%88%B7-ID', 'Asset import template.xlsx')
    api.post.mockResolvedValue({})
    await vm.handleUpload(); await flushPromises()
    const [url, body, config] = api.post.mock.calls[0]
    expect(url).toBe('/cmdb/api/cmdb/ci/import2')
    expect(body.get('file').name).toBe('原始中文文件.xlsx')
    expect(config.headers['Tenant-Id']).toBe('原始租户-ID')
    expect(config.headers['X-Run-Id']).toBe(vm.currentRunId)
    expect(vm.resultDialogVisible).toBe(true)
  })
  it('downloads the backend template using the current tenant instead of the static file', async () => {
    const wrapper = mountDialog('tenant/a b')
    await downloadButton(wrapper).trigger('click')
    await flushPromises()
    expect(api.download).toHaveBeenLastCalledWith(
      '/cmdb/api/cmdb/cit/template2/tenant%2Fa%20b',
      '资产信息导入模板.xlsx'
    )
    expect(window.open).not.toHaveBeenCalled()

    await wrapper.setProps({ tenantId: 'tenant-2' })
    await downloadButton(wrapper).trigger('click')
    await flushPromises()
    expect(api.download).toHaveBeenLastCalledWith(
      '/cmdb/api/cmdb/cit/template2/tenant-2',
      '资产信息导入模板.xlsx'
    )
  })

  it('blocks duplicate requests while the download is pending', async () => {
    let finishDownload
    api.download.mockReturnValue(
      new Promise(resolve => {
        finishDownload = resolve
      })
    )
    const wrapper = mountDialog()
    const button = downloadButton(wrapper)
    button.vm.$emit('click')
    await nextTick()
    expect(button.props('loading')).toBe(true)
    button.vm.$emit('click')
    expect(api.download).toHaveBeenCalledTimes(1)

    finishDownload({})
    await flushPromises()
    expect(button.props('loading')).toBe(false)
  })

  it('reports download errors and allows retry without falling back to the old template', async () => {
    api.download.mockRejectedValueOnce(new Error('network failure'))
    const wrapper = mountDialog()
    const button = downloadButton(wrapper)
    await button.trigger('click')
    await flushPromises()
    expect(ElMessage.error).toHaveBeenCalledWith('下载导入模板失败，请稍后重试')
    expect(button.props('loading')).toBe(false)
    expect(window.open).not.toHaveBeenCalled()

    await button.trigger('click')
    await flushPromises()
    expect(api.download).toHaveBeenCalledTimes(2)
  })

  it('disables template download when tenant information is missing', () => {
    const wrapper = mountDialog('')
    expect(downloadButton(wrapper).props('disabled')).toBe(true)
    expect(api.download).not.toHaveBeenCalled()
  })
})
