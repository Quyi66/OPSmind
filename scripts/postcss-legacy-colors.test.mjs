import assert from 'node:assert/strict'
import test from 'node:test'
import postcss from 'postcss'
import { compileStyle } from '@vue/compiler-sfc'
import legacyColorMixFallback from './postcss-legacy-colors.js'

test('keeps a usable Chromium 89 value for mixed colors and custom properties', async () => {
  const input = `
    .card {
      --surface: color-mix(in srgb, var(--accent) 10%, var(--base) 90%);
      background: linear-gradient(color-mix(in srgb, var(--accent) 20%, transparent), white);
    }
  `
  const { css } = await postcss([legacyColorMixFallback()]).process(input, { from: undefined })

  assert.match(css, /--surface:\s*var\(--base\)/)
  assert.match(css, /background:\s*linear-gradient\(rgba\(var\(--accent-legacy-rgb, 128, 128, 128\), 0\.2\), white\)/)
  assert.match(css, /@supports \(color: color-mix\(in srgb, red, blue\)\)/)
  assert.match(css, /--surface:\s*color-mix\(in srgb, var\(--accent\) 10%, var\(--base\) 90%\)/)
})

test('guards every original declaration, including ordinary properties containing var()', async () => {
  const input = `.card {
    --accent: #409eff;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 30%, white);
    box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 8%, transparent);
  }`
  const { root } = await postcss([legacyColorMixFallback()]).process(input, { from: undefined })
  const fallback = root.first
  assert.doesNotMatch(fallback.toString(), /color-mix\(/)
  assert.equal(root.last.name, 'supports')
  assert.equal(root.last.params, '(color: color-mix(in srgb, red, blue))')
  for (const prop of ['background', 'border', 'box-shadow']) {
    assert.match(root.last.first.nodes.find(node => node.prop === prop).value, /color-mix\(/)
  }
})

test('preserves alpha and theme aliases for status pill backgrounds', async () => {
  const input = `
    :root { --brand: #409eff; }
    .dark { --brand: #abc; }
    .card {
      --accent: var(--brand);
      --pill: color-mix(in srgb, var(--accent) 12%, transparent 88%);
      background: var(--pill);
    }
  `
  const { root } = await postcss([legacyColorMixFallback()]).process(input, { from: undefined })
  const declarations = root.nodes.filter(node => node.type === 'rule').flatMap(rule => rule.nodes)
  assert.deepEqual(declarations.filter(node => node.prop === '--brand-legacy-rgb').map(node => node.value), [
    '64, 158, 255', '170, 187, 204'
  ])
  assert.equal(declarations.find(node => node.prop === '--accent-legacy-rgb').value,
    'var(--brand-legacy-rgb, 128, 128, 128)')
  assert.equal(declarations.find(node => node.prop === '--pill').value,
    'rgba(var(--accent-legacy-rgb, 128, 128, 128), 0.12)')
})

test('handles omitted weights, normalization and unknown colors without opaque fallbacks', async () => {
  for (const [mix, expected] of [
    ['#123 20%, transparent', 'rgba(17, 34, 51, 0.2)'],
    ['transparent 88%, #409eff', 'rgba(64, 158, 255, 0.12)'],
    ['#123 20%, transparent 20%', 'rgba(17, 34, 51, 0.2)'],
    ['#123 80%, transparent 80%', 'rgba(17, 34, 51, 0.5)'],
    ['#123 0%, transparent 0%', 'rgba(17, 34, 51, 0)'],
    ['currentColor 10%, transparent', 'rgba(128, 128, 128, 0.1)'],
    ['transparent, transparent', 'transparent']
  ]) {
    const { root } = await postcss([legacyColorMixFallback()]).process(
      `.card { color: color-mix(in srgb, ${mix}); }`, { from: undefined })
    assert.equal(root.first.first.value, expected)
  }
})

test('retains later overrides and media scope in modern rules', async () => {
  const input = `@media (min-width: 800px) {
    .card {
      background: color-mix(in srgb, var(--accent) 20%, transparent);
      background: white;
      --surface: color-mix(in srgb, var(--accent) 10%, white);
      --surface: black;
    }
  }`
  const { root } = await postcss([legacyColorMixFallback()]).process(input, { from: undefined })
  const media = root.first
  assert.equal(media.last.name, 'supports')
  const modern = media.last.first
  assert.equal(modern.nodes.filter(node => node.prop === 'background').at(-1).value, 'white')
  assert.equal(modern.nodes.filter(node => node.prop === '--surface').at(-1).value, 'black')
})

test('preserves Vue scoped selectors around guarded custom properties', () => {
  const { code, errors } = compileStyle({
    source: '.card { --surface: color-mix(in srgb, var(--accent) 10%, white); }',
    filename: 'Card.vue',
    id: 'data-v-legacy-test',
    scoped: true,
    postcssPlugins: [legacyColorMixFallback()]
  })

  assert.deepEqual(errors, [])
  assert.match(code, /\.card\[data-v-legacy-test\]\s*\{\s*--surface:\s*white/)
  assert.match(code, /@supports[^{}]+\{\s*\.card\[data-v-legacy-test\]/)
})
