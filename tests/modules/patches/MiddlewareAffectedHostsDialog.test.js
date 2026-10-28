import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import MiddlewareAffectedHostsDialog from '@/modules/patches/components/cve/MiddlewareAffectedHostsDialog.vue'
import { hostDialogTestOptions, deferred } from './helpers/hostDialogTestUtils'

const api = vi.hoisted(() => ({ getAffectedHosts: vi.fn() }))
vi.mock('@/modules/patches/api', () => ({
  middlewareCveApi: { getAffectedHosts: api.getAffectedHosts }
}))

const wrappers = []
function mount(component, props) {
  const wrapper = shallowMount(component, { props, global: hostDialogTestOptions })
  wrappers.push(wrapper)
  return wrapper
}

beforeEach(() => {
  api.getAffectedHosts.mockReset()
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
})

describe('中间件 CVE 受影响主机', () => {
  it('displays package details and uses a dash when fixed version or OS scan status is absent', async () => {
    api.getAffectedHosts.mockResolvedValue({
      data: [
        {
          hostId: 'h1',
          hostKey: '192.168.1.236',
          middlewareType: 'nginx',
          pkgName: 'nginx',
          installedVersion: '1.21.5',
          installedPkg: 'nginx-1.21.5.rpm',
          affectedRange: 'f5:nginx (>=1.1.3, <=1.22.0)',
          fixedVersion: '',
          osScanStatus: null
        }
      ]
    })
    const wrapper = mount(MiddlewareAffectedHostsDialog, {
      modelValue: true,
      cveId: 'CVE-2022-41742',
      middlewareType: 'nginx'
    })
    await flushPromises()
    expect(api.getAffectedHosts).toHaveBeenCalledWith('CVE-2022-41742', 'nginx')
    expect(wrapper.text()).toContain('192.168.1.236')
    expect(wrapper.text()).toContain('nginx-1.21.5.rpm')
    expect(wrapper.text()).toContain('f5:nginx (>=1.1.3, <=1.22.0)')
    expect(wrapper.find('[data-column="fixedVersion"]').text()).toBe('修复版本-')
    expect(wrapper.find('[data-column="osScanStatus"]').text()).toBe('OS 补丁扫描状态-')
  })

  it('ignores stale results when middleware type changes', async () => {
    const oldRequest = deferred()
    api.getAffectedHosts.mockReturnValueOnce(oldRequest.promise)
    api.getAffectedHosts.mockResolvedValue({
      data: [{ hostKey: 'tomcat-host', osScanStatus: 'affected' }]
    })
    const wrapper = mount(MiddlewareAffectedHostsDialog, {
      modelValue: true,
      cveId: 'CVE-2022-41742',
      middlewareType: 'nginx'
    })
    await wrapper.setProps({ middlewareType: 'tomcat' })
    await flushPromises()
    oldRequest.resolve({ data: [{ hostKey: 'nginx-host' }] })
    await flushPromises()
    expect(api.getAffectedHosts).toHaveBeenLastCalledWith('CVE-2022-41742', 'tomcat')
    expect(wrapper.text()).toContain('tomcat-host')
    expect(wrapper.text()).toContain('affected')
    expect(wrapper.text()).not.toContain('nginx-host')
  })

  it('discards in-flight results on close and fetches fresh data on reopen', async () => {
    const oldRequest = deferred()
    api.getAffectedHosts.mockReturnValueOnce(oldRequest.promise)
    api.getAffectedHosts.mockResolvedValue({ data: [] })
    const wrapper = mount(MiddlewareAffectedHostsDialog, { modelValue: true, cveId: 'CVE-1' })
    await wrapper.setProps({ modelValue: false })
    oldRequest.resolve({ data: [{ hostKey: 'stale-host' }] })
    await flushPromises()
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    expect(api.getAffectedHosts).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('暂无受影响主机')
    expect(wrapper.text()).not.toContain('stale-host')
  })
})
