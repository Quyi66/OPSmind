import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

test('restores APIs used by dependencies when Chromium 89 does not provide them', () => {
  const script = `
    import assert from 'node:assert/strict'
    Object.hasOwn = undefined
    Array.prototype.at = undefined
    Array.prototype.toSorted = undefined
    Array.prototype.toReversed = undefined
    Array.prototype.toSpliced = undefined
    globalThis.structuredClone = undefined

    await import('core-js/actual/object/has-own.js')
    await import('core-js/actual/array/at.js')
    await import('core-js/actual/array/to-sorted.js')
    await import('core-js/actual/array/to-reversed.js')
    await import('core-js/actual/array/to-spliced.js')
    await import('core-js/actual/structured-clone.js')

    assert.equal(Object.hasOwn({ key: 1 }, 'key'), true)
    assert.equal([1, 2, 3].at(-1), 3)
    assert.deepEqual([3, 1, 2].toSorted(), [1, 2, 3])
    assert.deepEqual([1, 2, 3].toReversed(), [3, 2, 1])
    assert.deepEqual([1, 2, 3].toSpliced(1, 1), [1, 3])
    const value = { nested: { count: 1 } }
    const cloned = structuredClone(value)
    assert.deepEqual(cloned, value)
    assert.notEqual(cloned.nested, value.nested)
  `

  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: process.cwd(),
    encoding: 'utf8'
  })

  assert.equal(child.status, 0, child.stderr)
})
