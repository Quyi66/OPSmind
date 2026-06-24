import { ref, computed, watch, nextTick } from 'vue'

/**
 * 表格全选逻辑 Composable
 *
 * 提供跨页全选、翻页自动恢复勾选、筛选/加载时自动重置的通用能力。
 *
 * @param {import('vue').Ref} tableRef       - el-table 的模板 ref
 * @param {Object}            options
 * @param {import('vue').Ref}  options.tableData      - 当前页表格数据 (ref)
 * @param {import('vue').Ref}  options.filteredData   - 筛选后的全量数据 (ref / computed)
 * @param {import('vue').Ref}  options.selectedItems  - 已选中项 (ref)，由外部定义以便复用
 * @param {Function}          [options.matchFn]       - (a, b) => boolean，默认引用相等
 * @param {Function}          [options.selectableFn]  - (row) => boolean，行是否可被选中，默认全部可选
 */
export function useTableSelectAll(
  tableRef,
  { tableData, filteredData, selectedItems, matchFn = (a, b) => a === b, selectableFn } = {}
) {
  const allSelected = ref(false)
  const isAllSelected = computed(() => allSelected.value)

  /**
   * 恢复当前页的视觉勾选（翻页后自动调用）
   */
  function restorePageSelection() {
    if (!tableRef.value) return
    tableRef.value.clearSelection()
    const selected = selectedItems.value
    if (!selected || selected.length === 0) return
    tableData.value.forEach(row => {
      if (selectableFn && !selectableFn(row)) return
      const isMatched = selected.some(item => matchFn(item, row))
      if (isMatched) {
        tableRef.value.toggleRowSelection(row, true)
      }
    })
  }

  /**
   * 一键全选 / 一键取消 切换
   */
  function handleToggleAllSelection() {
    if (!tableRef.value) return

    if (allSelected.value) {
      allSelected.value = false
      selectedItems.value = []
      tableRef.value.clearSelection()
    } else {
      allSelected.value = true
      selectedItems.value = [...filteredData.value]
      tableRef.value.clearSelection()
      tableData.value.forEach(row => {
        if (selectableFn && !selectableFn(row)) return
        const isMatched = filteredData.value.some(f => matchFn(f, row))
        if (isMatched) {
          tableRef.value.toggleRowSelection(row, true)
        }
      })
    }
  }

  /**
   * 表格手动勾选回调（绑定 @select 和 @select-all）
   *
   * 将当前页勾选结果与其他页已选记录合并，实现跨页勾选。
   */
  function handleTableSelect(selection) {
    allSelected.value = false

    const pageRows = tableData.value
    // 保留不在当前页的已选项
    const offPageSelections = selectedItems.value.filter(
      item => !pageRows.some(row => matchFn(item, row))
    )
    // 合并当前页新的勾选项与其他页已选项
    selectedItems.value = [...offPageSelections, ...selection]
  }

  /**
   * 重置全选标记（筛选条件变更 / 数据重新加载时调用）
   */
  function resetAllSelected() {
    allSelected.value = false
  }

  // 监听表格数据变化（翻页、筛选），自动恢复已选行的勾选状态
  watch(tableData, () => {
    nextTick(() => restorePageSelection())
  })

  return {
    allSelected,
    isAllSelected,
    handleToggleAllSelection,
    handleTableSelect,
    resetAllSelected,
    restorePageSelection
  }
}
