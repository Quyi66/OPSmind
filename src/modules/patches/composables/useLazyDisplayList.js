import { ref, shallowRef, computed, watch } from 'vue'

/**
 * 懒加载分页显示列表 Composable
 *
 * 对大列表提供：搜索过滤 → 截断显示 → 加载更多 的通用能力，
 * 避免一次性渲染全量 DOM 导致页面卡顿。
 *
 * @param {import('vue').Ref | import('vue').ComputedRef} source - 原始数据源 (ref / computed)
 * @param {Object}  options
 * @param {number}  [options.initialCount=50]  - 初始显示条目数
 * @param {number}  [options.stepCount=100]    - 每次"加载更多"增加的条目数
 * @param {Function} [options.searchFn]         - (item, keyword) => boolean，自定义搜索匹配
 * @param {Function} [options.getSearchContext] - 搜索词变化时捕获上下文，作为 searchFn 第三个参数
 */
export function useLazyDisplayList(source, { initialCount = 50, stepCount = 100, searchFn, getSearchContext } = {}) {
  const searchText = ref('')
  const displayedCount = ref(initialCount)

  const searchContext = shallowRef()
  watch(searchText, () => {
    searchContext.value = getSearchContext?.()
    displayedCount.value = initialCount
  }, { immediate: true, flush: 'sync' })

  // Collection changes reset pagination; item field changes only update matches.
  watch(() => source.value.slice(), () => {
    displayedCount.value = initialCount
  }, { flush: 'sync' })

  const filteredList = computed(() => {
    const keyword = searchText.value.toLowerCase().trim()
    if (!keyword) return source.value
    return source.value.filter(item => searchFn
      ? searchFn(item, keyword, searchContext.value)
      : item && String(item).toLowerCase().includes(keyword))
  })

  const displayedList = computed(() => {
    return filteredList.value.slice(0, displayedCount.value)
  })

  const hasMore = computed(() => {
    return filteredList.value.length > displayedCount.value
  })

  function loadMore() {
    displayedCount.value += stepCount
  }

  return {
    searchText,
    filteredList,
    displayedList,
    hasMore,
    loadMore
  }
}
