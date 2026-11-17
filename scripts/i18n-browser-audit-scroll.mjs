// Scrolling the rendered table does not click controls or change business state.
export async function auditHorizontalTables(page, captureState, scope = '.group-content__view') {
  const wrappers = page.locator(`${scope} .el-table__body-wrapper .el-scrollbar__wrap:visible`)
  const total = await wrappers.count()
  const states = []
  for (let index = 0; index < total; index++) {
    const wrapper = wrappers.nth(index)
    const original = await wrapper.evaluate(element => {
      const bounds = element.getBoundingClientRect()
      const table = element.closest('.el-table')
      const fixedInset = side => {
        const cells = table?.querySelectorAll(`.el-table-fixed-column--${side}`) || []
        return Math.max(
          0,
          ...[...cells]
            .filter(cell => cell.closest('.el-table') === table)
            .map(cell => {
              const rect = cell.getBoundingClientRect()
              if (rect.width <= 0 || rect.height <= 0) return 0
              return side === 'left' ? rect.right - bounds.left : bounds.right - rect.left
            })
        )
      }
      return {
        left: element.scrollLeft,
        width: element.clientWidth,
        fullWidth: element.scrollWidth,
        fixedLeft: fixedInset('left'),
        fixedRight: fixedInset('right')
      }
    })
    const max = original.fullWidth - original.width
    if (original.width <= 0 || max <= 2) continue
    // Sticky columns conceal part of each viewport. Step by the uncovered width
    // so intermediate columns cannot fall into a gap between screenshots.
    const step = Math.floor(original.width - original.fixedLeft - original.fixedRight)
    if (step <= 2) throw new Error(`Table ${index + 1}: fixed columns cover the scroll viewport`)
    const positions = []
    if (original.left > 2) positions.push({ left: 0, label: 'left' })
    for (let left = step; left < max; left += step) {
      positions.push({ left, label: `part-${positions.length + 1}` })
    }
    positions.push({ left: max, label: 'right' })
    try {
      for (const position of positions) {
        await wrapper.evaluate((element, left) => {
          element.scrollLeft = left
          element.dispatchEvent(new Event('scroll', { bubbles: true }))
        }, position.left)
        await page.waitForTimeout(100)
        const captured = await captureState({
          index,
          label: `Table ${index + 1}: ${position.label}`,
          suffix: `table-${index}-${position.label}`
        })
        states.push({
          ...captured,
          tableIndex: index,
          scrollLeft: await wrapper.evaluate(element => element.scrollLeft),
          fullWidth: original.fullWidth,
          viewportWidth: original.width,
          visibleStep: step
        })
      }
    } finally {
      await wrapper.evaluate((element, left) => {
        element.scrollLeft = left
        element.dispatchEvent(new Event('scroll', { bubbles: true }))
      }, original.left)
    }
  }
  return { totalTables: total, states }
}
