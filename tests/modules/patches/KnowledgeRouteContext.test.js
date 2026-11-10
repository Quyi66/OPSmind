import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, KeepAlive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import CommonCve from '@/modules/patches/views/CveListPage.vue'
import MiddlewareCve from '@/modules/patches/views/MiddlewareCveListPage.vue'
import WindowsCve from '@/modules/patches/windows-patch/views/WindowsCveListPage.vue'
import WindowsKb from '@/modules/patches/windows-patch/views/WindowsKbListPage.vue'

const api = vi.hoisted(() => ({
  common: vi.fn(),
  middleware: vi.fn(),
  winCve: vi.fn(),
  winKb: vi.fn(),
  stats: vi.fn(),
  types: vi.fn(),
  detailMounted: vi.fn()
}))
vi.mock('@/modules/patches/api', () => ({
  cveApi: { getCveList: api.common, getStatistics: api.stats },
  middlewareCveApi: { getList: api.middleware, getMiddlewareTypes: api.types },
  winCveApi: { getCveList: api.winCve, getStatistics: api.stats },
  winKbApi: { getKbList: api.winKb, getStatistics: api.stats }
}))
vi.mock('@/modules/patches/components/cve/details/CveDetail.vue', () => ({
  default: {
    name: 'CveDetail',
    props: ['cveId'],
    template: '<aside>{{cveId}}</aside>',
    mounted() {
      api.detailMounted(this.cveId)
    }
  }
}))
vi.mock('@/modules/patches/components/cve/details/MiddlewareCveDetail.vue', () => ({
  default: {
    name: 'MiddlewareCveDetail',
    props: ['cveId'],
    template: '<aside>{{cveId}}</aside>',
    mounted() {
      api.detailMounted(this.cveId)
    }
  }
}))
vi.mock('@/modules/patches/windows-patch/components/cve/details/WindowsCveDetail.vue', () => ({
  default: {
    name: 'WindowsCveDetail',
    props: ['cveId'],
    template: '<aside>{{cveId}}</aside>',
    mounted() {
      api.detailMounted(this.cveId)
    }
  }
}))
vi.mock('@/modules/patches/windows-patch/components/kb/WindowsKbDetail.vue', () => ({
  default: {
    name: 'WindowsKbDetail',
    props: ['kbNumber'],
    template: '<aside>{{kbNumber}}</aside>',
    mounted() {
      api.detailMounted(this.kbNumber)
    }
  }
}))
vi.mock('@/modules/patches/components/cve/dialogs/ManualExportDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/components/cve/MiddlewareAffectedHostsDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/components/common/CveLinkList.vue', () => ({
  default: { template: '<div />' }
}))
const entries = [
  ['通用CVE', CommonCve, 'patches-cveList', 'cveId', 'selectedCveId', 'CveDetail', api.common],
  [
    '中间件CVE',
    MiddlewareCve,
    'patches-middlewareCveList',
    'cveId',
    'selectedCveId',
    'MiddlewareCveDetail',
    api.middleware
  ],
  [
    'Windows CVE',
    WindowsCve,
    'patches-windowsCveList',
    'cveId',
    'selectedCveId',
    'WindowsCveDetail',
    api.winCve
  ],
  [
    'Windows KB',
    WindowsKb,
    'patches-windowsKbList',
    'kbNumber',
    'selectedKbNumber',
    'WindowsKbDetail',
    api.winKb
  ]
]
let root, router, currentComponent
const page = () => root.findComponent(currentComponent)
const state = () => page().vm.$.setupState
async function open(component, name, query = {}) {
  currentComponent = component
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/knowledge', name, component },
      { path: '/other', name: 'other', component: { template: '<div>Other knowledge</div>' } }
    ]
  })
  await router.push({ name, query })
  await router.isReady()
  const Host = defineComponent({
    setup: () => () =>
      h(RouterView, null, {
        default: ({ Component, route }) =>
          h(KeepAlive, null, { default: () => h(Component, { key: route.path }) })
      })
  })
  const Slot = { template: '<div><slot /></div>' }
  root = mount(Host, {
    global: {
      plugins: [router],
      directives: { loading() {} },
      stubs: {
        'router-view': false,
        'el-form': Slot,
        'el-form-item': Slot,
        'el-button': { template: '<button><slot /></button>' },
        ...Object.fromEntries(
          [
            'ElInput',
            'ElSelect',
            'ElOption',
            'ElIcon',
            'ElTable',
            'ElTableColumn',
            'ElPagination',
            'ElTag',
            'ElDatePicker',
            'ElTooltip',
            'ElAlert',
            'ElLink'
          ].map(name => [name, true])
        )
      }
    }
  })
  await flushPromises()
}
beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset())
  for (const name of ['common', 'middleware', 'winCve', 'winKb'])
    api[name].mockResolvedValue({
      data: { content: [], totalElements: 0, totalPages: 0, number: 0 }
    })
  api.stats.mockResolvedValue({ data: { totalCves: 0, bySeverity: {} } })
  api.types.mockResolvedValue({ data: [] })
})
afterEach(() => root?.unmount())

describe.each(entries)(
  '%s详情只消费自身路由',
  (_label, component, name, queryKey, stateKey, detailName, getList) => {
    it('离开后不受他页详情参数影响，不在隐藏页创建错误详情，返回保持列表筛选/页码', async () => {
      await open(component, name)
      const context = state()
      context.searchParams.keyword = 'original-filter'
      context.searchParams.page = 3
      const reads = getList.mock.calls.length
      await router.push({ name: 'other', query: { view: 'detail', [queryKey]: 'foreign-id' } })
      await flushPromises()
      expect(context.currentView).toBe('list')
      expect(api.detailMounted).not.toHaveBeenCalled()
      expect(context.searchParams.keyword).toBe('original-filter')
      expect(context.searchParams.page).toBe(3)
      expect(getList).toHaveBeenCalledTimes(reads)
      await router.push({ name, query: { view: 'detail', [queryKey]: 'original-id' } })
      await flushPromises()
      expect(state()).toBe(context)
      expect(context.currentView).toBe('detail')
      expect(context[stateKey]).toBe('original-id')
      expect(api.detailMounted).toHaveBeenCalledExactlyOnceWith('original-id')
      await router.push({ name: 'other', query: {} })
      await flushPromises()
      expect(context.currentView).toBe('detail')
      expect(context[stateKey]).toBe('original-id')
      await router.push({ name, query: {} })
      await flushPromises()
      expect(context.currentView).toBe('list')
      expect(context.searchParams.keyword).toBe('original-filter')
      expect(context.searchParams.page).toBe(3)
    })
    it('初始深链接与本页换ID仍传原值，离开其他详情不重置缓存或串入新ID', async () => {
      await open(component, name, { view: 'detail', [queryKey]: 'original-id' })
      const context = state()
      expect(context.currentView).toBe('detail')
      expect(page().findComponent({ name: detailName }).props(queryKey)).toBe('original-id')
      await router.replace({ name, query: { view: 'detail', [queryKey]: 'next-id' } })
      await flushPromises()
      expect(context[stateKey]).toBe('next-id')
      expect(page().findComponent({ name: detailName }).props(queryKey)).toBe('next-id')
      await router.push({ name: 'other', query: { view: 'detail', [queryKey]: 'foreign-id' } })
      await flushPromises()
      expect(context[stateKey]).toBe('next-id')
      await router.push({ name, query: { view: 'detail', [queryKey]: 'next-id' } })
      await flushPromises()
      expect(context[stateKey]).toBe('next-id')
    })
  }
)
