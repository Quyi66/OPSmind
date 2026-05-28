import { ref, computed, watch } from 'vue'

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
 */
export function useLazyDisplayList(source, { initialCount = 50, stepCount = 100, searchFn } = {}) {
  const searchText = ref('')
  const displayedCount = ref(initialCount)

  // 源数据或搜索关键词变化时，重置显示数量
  watch([source, searchText], () => {
    displayedCount.value = initialCount
  })

  const filteredList = computed(() => {
    if (!searchText.value) {
      return source.value
    }
    const keyword = searchText.value.toLowerCase().trim()
    if (!keyword) return source.value

    if (searchFn) {
      return source.value.filter(item => searchFn(item, keyword))
    }

    // 默认：对字符串类型的 item 做 includes 匹配
    return source.value.filter(item => item && String(item).toLowerCase().includes(keyword))
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
