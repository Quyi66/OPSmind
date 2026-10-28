import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { flushPromises, shallowMount } from '@vue/test-utils'
import ImportAssetDialog from '@/modules/asset/components/asset-info/ImportAssetDialog.vue'
import { ElMessage } from 'element-plus'

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
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
})

describe('CMDB asset import template download', () => {
  it('downloads the backend template using the current tenant instead of the static file', async () => {
    const wrapper = mountDialog('tenant/a b')
    await downloadButton(wrapper).trigger('click')
    await flushPromises()
    expect(api.download).toHaveBeenLastCalledWith(
      '/cmdb/api/cmdb/cit/template2/tenant%2Fa%20b',
      '资产信息导入模板.xlsx'
    )
    expect(window.open).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('网段区域')

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
