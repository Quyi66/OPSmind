import { afterEach, describe, expect, it } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import RepoCheckStatus from '@/modules/patches/components/host-detail/RepoCheckStatus.vue'
import { hostDialogTestOptions } from './helpers/hostDialogTestUtils'

const wrappers = []
function mount(component, props) {
  const wrapper = shallowMount(component, { props, global: hostDialogTestOptions })
  wrappers.push(wrapper)
  return wrapper
}

afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
})

describe('仓库可安装', () => {
  it('shows a dash for absent repo checks and the installable label for INSTALLABLE', async () => {
    const wrapper = mount(RepoCheckStatus, { check: null })
    expect(wrapper.text()).toBe('-')
    await wrapper.setProps({ check: { status: 'INSTALLABLE' } })
    expect(wrapper.text()).toBe('可安装')
  })

  it('shows both missing packages and required/repository versions', () => {
    const wrapper = mount(RepoCheckStatus, {
      check: {
        status: 'NOT_INSTALLABLE',
        missingPkgs: ['nginx', 'openssl'],
        outdatedPkgs: [
          { pkgName: 'libxml2', requiredVersion: '2.9.10-43', repoVersion: '2.9.10-42' }
        ]
      }
    })
    expect(wrapper.text()).toContain('不可安装')
    expect(wrapper.find('.repo-check-details').text()).toBe('缺失 2 · 版本过低 1')
    expect(wrapper.findAll('.repo-check-package').map(item => item.text())).toEqual([
      'nginx',
      'openssl'
    ])
    expect(wrapper.findAll('tbody td').map(item => item.text())).toEqual([
      'libxml2',
      '2.9.10-43',
      '2.9.10-42'
    ])
  })

  it.each(['未匹配到本机所属仓库', '所属仓库尚未采集成功'])(
    'shows the server NO_REPO label: %s',
    label => {
      expect(mount(RepoCheckStatus, { check: { status: 'NO_REPO', label } }).text()).toBe(label)
    }
  )
})
