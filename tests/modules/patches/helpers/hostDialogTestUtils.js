import { computed, defineComponent, h, inject, provide } from 'vue'

const TableStub = defineComponent({
  name: 'ElTable',
  props: ['data', 'emptyText'],
  setup(props, { slots }) {
    provide(
      'tableRows',
      computed(() => props.data)
    )
    return () => h('div', [slots.default?.(), props.data.length ? '' : props.emptyText])
  }
})
const ColumnStub = defineComponent({
  name: 'ElTableColumn',
  props: ['prop', 'label'],
  setup(props, { slots }) {
    const rows = inject('tableRows')
    return () =>
      h('div', { 'data-column': props.prop }, [
        props.label,
        ...rows.value.map(row =>
          h('div', slots.default?.({ row }) || String(row[props.prop] ?? ''))
        )
      ])
  }
})
export const hostDialogTestOptions = {
  renderStubDefaultSlot: true,
  stubs: {
    ElTable: TableStub,
    ElTableColumn: ColumnStub,
    ElTag: { template: '<span><slot /></span>' },
    ElIcon: { template: '<span><slot /></span>' },
    ElPopover: { template: '<div><slot name="reference" /><slot /></div>' },
    ElAlert: { props: ['title'], template: '<div role="alert">{{ title }}</div>' }
  },
  directives: { loading: () => {} }
}

export function deferred() {
  let resolve
  const promise = new Promise(done => {
    resolve = done
  })
  return { promise, resolve }
}
