import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, inject, provide } from 'vue'
import { flushPromises, shallowMount } from '@vue/test-utils'
import LinuxPatchRollbackPage from '@/modules/patches/views/LinuxPatchRollbackPage.vue'
import CveLinkList from '@/modules/patches/components/common/CveLinkList.vue'
import { getCnnvdUrl } from '@/modules/patches/composables/useFormatters'

const api = vi.hoisted(() => ({ getHistUpdatePkgs: vi.fn() }))
vi.mock('@/modules/patches/api', () => ({ patchRollbackApi: api }))
vi.mock('@/modules/patches/components/patch-task/wizard/PatchInstallWizard.vue', () => ({
  default: { template: '<div />' }
}))

const TableStub = defineComponent({
  name: 'ElTable',
  props: ['data'],
  methods: { clearSelection() {}, toggleRowSelection() {} },
  setup(props, { slots }) {
    provide(
      'rows',
      computed(() => props.data)
    )
    return () => h('div', slots.default?.())
  }
})
const ColumnStub = defineComponent({
  name: 'ElTableColumn',
  props: ['prop'],
  setup(props, { slots }) {
    const rows = inject('rows')
    return () =>
      h(
        'div',
        props.prop === 'update_id'
          ? rows.value.map(row => h('div', { class: 'update-dimension' }, slots.default?.({ row })))
          : []
      )
  }
})
const wrappers = []
function mount(component, props = {}, extraStubs = {}) {
  const wrapper = shallowMount(component, {
    props,
    global: {
      renderStubDefaultSlot: true,
      stubs: {
        'el-dialog': {
          props: ['modelValue'],
          template: '<div v-if="modelValue"><slot /></div>'
        },
        ElIcon: true,
        ElTable: TableStub,
        ElTableColumn: ColumnStub,
        ElPopover: true,
        ElPagination: true,
        CveLinkList: false,
        ...extraStubs
      },
      directives: { loading: () => {} }
    }
  })
  wrappers.push(wrapper)
  return wrapper
}

beforeEach(() => api.getHistUpdatePkgs.mockReset())
afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()))

describe('rollback/install history update dimension', () => {
  it('构造回滚目标时保留已确认的 Agent 通道、状态和能力', async () => {
    api.getHistUpdatePkgs.mockResolvedValue({
      data: {
        records: [
          {
            id: 'hist-agent',
            patch_id: 'RHSA-1',
            hosts_id: 'agent-host',
            hosts: '192.0.2.1',
            connectionType: 'koreops_agent',
            agentStatus: 'offline',
            capabilities: ['scan']
          }
        ]
      }
    })
    const wrapper = mount(LinuxPatchRollbackPage)
    await flushPromises()
    const state = wrapper.vm.$.setupState
    await state.openRollbackWizard(state.allData)
    expect(state.rollbackTargetHosts[0]).toMatchObject({
      hostId: 'agent-host',
      connectionType: 'koreops_agent',
      agentStatus: 'offline',
      capabilities: ['scan']
    })
  })
  it('缺少旧 rollbackSupported 字段的普通历史记录仍能进入回滚向导，合并行保留全部原始 ID', async () => {
    api.getHistUpdatePkgs.mockResolvedValue({ data: { records: [
          {
            id: 'hist-a',
            patch_id: 'RHSA-1',
            hosts_id: 'host-a',
            hosts: '192.0.2.1',
            update_time: '2026-10-29'
          },
          {
            id: 'hist-b',
            patch_id: 'RHSA-1',
            hosts_id: 'host-b',
            hosts: '192.0.2.2',
            update_time: '2026-10-29'
          }
        ]
      }
    })
    const wrapper = mount(LinuxPatchRollbackPage)
    await flushPromises()
    const state = wrapper.vm.$.setupState
    expect(state.allData).toHaveLength(1)
    await state.openRollbackWizard(state.allData)
    expect(state.rollbackWizardVisible).toBe(true)
    expect(state.rollbackHistUpdateIds).toEqual(['hist-a', 'hist-b'])
    expect(state.rollbackTargetHosts.map(host => host.hostId)).toEqual(['host-a', 'host-b'])
  })

  it('renders every comma-separated CVE as a separate link while packages stays plain text', async () => {
    const cves = ['CVE-2024-30205', 'CVE-2024-39331', 'CVE-2025-1244']
    api.getHistUpdatePkgs.mockResolvedValue({
      data: {
        records: [
          {
            id: '1',
            patch_id: 'KYSA-202503-1125',
            update_id: cves.join(','),
            update_time: '2026-10-09'
          },
          { id: '2', patch_id: 'packages', update_id: 'packages', update_time: '2026-10-09' }
        ]
      }
    })
    const wrapper = mount(LinuxPatchRollbackPage)
    await flushPromises()

    const cells = wrapper.findAll('.update-dimension')
    expect(cells[0].findAll('a').map(link => link.text())).toEqual(cves)
    expect(cells[0].findAll('a').map(link => link.attributes('href'))).toEqual(
      cves.map(cve => `https://support.kylinos.cn/#/security/cveDetail?allTitle=${cve}`)
    )
    expect(cells[1].text()).toBe('packages')
    expect(cells[1].find('a').exists()).toBe(false)
  })

  it('does not turn non-CVE identifiers into vulnerability links, including mixed merged fields', async () => {
    api.getHistUpdatePkgs.mockResolvedValue({
      data: {
        records: [
          {
            id: '1',
            patch_id: 'RHSA-1',
            update_id: 'packages,nginx,CVE-2024-30205',
            update_time: '2026-10-09'
          }
        ]
      }
    })
    const wrapper = mount(LinuxPatchRollbackPage)
    await flushPromises()
    expect(wrapper.findAll('.cve-link-list__text').map(item => item.text())).toEqual([
      'packages',
      'nginx'
    ])
    expect(wrapper.findAll('a').map(link => link.text())).toEqual(['CVE-2024-30205'])
  })
})

describe('CveLinkList text fallback', () => {
  it('keeps non-link entries as text in the expanded list too', async () => {
    const wrapper = mount(CveLinkList, {
      cves: 'CVE-2024-30205,packages,CVE-2025-1244',
      max: 1,
      urlResolver: value => (value === 'packages' ? '' : `/cve/${value}`)
    })
    await wrapper.find('button').trigger('click')
    const expanded = wrapper.find('.cve-link-list--dialog')
    expect(expanded.find('.cve-link-list__text').text()).toBe('packages')
    expect(expanded.findAll('a').map(link => link.attributes('href'))).toEqual([
      '/cve/CVE-2024-30205',
      '/cve/CVE-2025-1244'
    ])
  })

  it('preserves CNNVD links supplied by other callers', () => {
    const wrapper = mount(CveLinkList, { cves: 'CNNVD-202410-001', urlResolver: getCnnvdUrl })
    expect(wrapper.find('a').attributes('href')).toBe(
      'https://www.cnnvd.org.cn/home/globalSearch?keyword=CNNVD-202410-001'
    )
  })

  it('shows a dash for empty history fields', () => {
    expect(mount(CveLinkList, { cves: '' }).text()).toBe('-')
  })
})
