import { afterEach, describe, expect, it } from 'vitest'
import { effectScope, ref } from 'vue'
import { useLazyDisplayList } from '@/modules/patches/composables/useLazyDisplayList'

const scopes = []
function create(source, options) {
  const scope = effectScope()
  scopes.push(scope)
  return scope.run(() => useLazyDisplayList(source, options))
}
afterEach(() => scopes.splice(0).forEach(scope => scope.stop()))

describe('lazy display list reactive search', () => {
  it('returns current matches synchronously after each query change and whitespace clear', () => {
    const source = ref(['pending', 'done'])
    const list = create(source)
    list.searchText.value = ' PENDING '
    expect(list.filteredList.value).toEqual(['pending'])
    list.searchText.value = 'done'
    expect(list.filteredList.value).toEqual(['done'])
    list.searchText.value = 'missing'
    expect(list.filteredList.value).toEqual([])
    list.searchText.value = '  '
    expect(list.filteredList.value).toBe(source.value)
  })

  it('adds and removes matches immediately when item fields change in place', () => {
    const source = ref([{ id: 'a', state: 'pending' }, { id: 'b', state: 'done' }])
    const list = create(source, { searchFn: (item, query) => item.state === query })
    list.searchText.value = 'done'
    expect(list.filteredList.value.map(item => item.id)).toEqual(['b'])
    source.value[0].state = 'done'
    expect(list.filteredList.value.map(item => item.id)).toEqual(['a', 'b'])
    source.value[1].state = 'failed'
    expect(list.filteredList.value.map(item => item.id)).toEqual(['a'])
  })

  it('tracks the default string conversion of reactive items', () => {
    const source = ref([{ name: 'old', toString() { return this.name } }])
    const list = create(source)
    list.searchText.value = 'new'
    expect(list.filteredList.value).toEqual([])
    source.value[0].name = 'new'
    expect(list.filteredList.value).toEqual(source.value)
  })

  it('tracks push, splice, replacement and order changes without stale intermediate reads', () => {
    const source = ref(['raw-a'])
    const list = create(source)
    list.searchText.value = 'raw'
    source.value.push('raw-b')
    expect(list.filteredList.value).toEqual(['raw-a', 'raw-b'])
    source.value.reverse()
    expect(list.filteredList.value).toEqual(['raw-b', 'raw-a'])
    source.value.splice(0, 1)
    expect(list.filteredList.value).toEqual(['raw-a'])
    source.value = ['raw-c']
    expect(list.filteredList.value).toEqual(['raw-c'])
  })

  it('preserves loaded pages for item edits and resets them for query or collection changes', () => {
    const source = ref(Array.from({ length: 6 }, (_, id) => ({ id, state: 'done' })))
    const list = create(source, { initialCount: 2, stepCount: 2, searchFn: (item, query) => item.state === query })
    list.searchText.value = 'done'
    list.loadMore()
    expect(list.displayedList.value).toHaveLength(4)
    source.value[0].state = 'pending'
    expect(list.displayedList.value).toHaveLength(4)
    source.value.push({ id: 6, state: 'done' })
    expect(list.displayedList.value).toHaveLength(2)
    list.loadMore()
    list.searchText.value = 'pending'
    expect(list.displayedList.value.map(item => item.id)).toEqual([0])
  })

  it('captures explicit search context without ignoring simultaneous data edits', () => {
    const language = ref('zh')
    const source = ref([{ count: 1 }])
    const list = create(source, {
      getSearchContext: () => language.value,
      searchFn: (item, query, locale) => `${item.count} ${locale === 'zh' ? '台主机' : 'hosts'}`.includes(query)
    })
    list.searchText.value = '1 台主机'
    expect(list.filteredList.value).toHaveLength(1)
    language.value = 'en'
    source.value[0].count = 2
    expect(list.filteredList.value).toHaveLength(0)
    source.value[0].count = 1
    expect(list.filteredList.value).toHaveLength(1)
    list.searchText.value = '1 hosts'
    expect(list.filteredList.value).toHaveLength(1)
    language.value = 'zh'
    expect(list.filteredList.value).toHaveLength(1)
  })
})
