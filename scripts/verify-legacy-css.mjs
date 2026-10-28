import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import postcss from 'postcss'
import * as sass from 'sass-embedded'
import { parse as parseVueSfc } from '@vue/compiler-sfc'
import postcssConfig from '../postcss.config.js'
import legacyColorMixFallback from './postcss-legacy-colors.js'

const srcPath = fileURLToPath(new URL('../src', import.meta.url))
const unsupportedFeatures = [
  /\d(?:cqw|cqh|cqi|cqb|cqmin|cqmax)\b/,
  /@container\b/,
  /container-type\s*:/,
  /:has\(/,
  /\b(?:oklch|oklab|light-dark)\(/,
  /@(?:property|starting-style|scope)\b/,
  /grid-template-(?:columns|rows)\s*:\s*subgrid/
]
const unsupportedJavaScript = [
  /\.at\(/,
  /\.(?:findLast|findLastIndex|toSorted|toReversed|toSpliced)\(/,
  /\bObject\.hasOwn\(/,
  /\bstructuredClone\(/,
  /\bPromise\.withResolvers\(/,
  /\bAbortSignal\.(?:timeout|any)\(/
]
const colorMixes = []

function checkStyles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      checkStyles(path)
    } else if (/\.(?:vue|css|scss|sass|less)$/.test(entry.name)) {
      const content = readFileSync(path, 'utf8')
      if (entry.name.endsWith('.vue')) {
        const { descriptor, errors } = parseVueSfc(content, { filename: path })
        assert.equal(errors.length, 0, `${path} has invalid Vue SFC syntax`)
        for (const style of descriptor.styles) {
          if (style.lang && style.lang !== 'css') continue
          const sheet = postcss.parse(style.content, { from: path })
          sheet.walk(node => {
            if (node.type !== 'rule' && node.type !== 'atrule') return
            assert.notEqual(
              node.parent.type,
              'rule',
              `${path} uses native CSS nesting, which Chromium 89 does not support`
            )
          })
        }
      }
      for (const feature of unsupportedFeatures) {
        assert.doesNotMatch(
          content,
          feature,
          `${path} uses a CSS feature unsupported by Chromium 89`
        )
      }
      let cursor = 0
      while ((cursor = content.indexOf('color-mix(', cursor)) !== -1) {
        let depth = 1
        let end = cursor + 'color-mix('.length
        while (end < content.length && depth > 0) {
          if (content[end] === '(') depth++
          if (content[end] === ')') depth--
          end++
        }
        assert.equal(depth, 0, `${path} has an unclosed color-mix()`)
        colorMixes.push(content.slice(cursor, end))
        cursor = end
      }
    }
    if (/\.(?:vue|js|ts)$/.test(entry.name)) {
      const content = readFileSync(path, 'utf8')
      for (const feature of unsupportedJavaScript) {
        assert.doesNotMatch(
          content,
          feature,
          `${path} uses an API unsupported by Chromium 89 without a local fallback`
        )
      }
    }
  }
}

checkStyles(srcPath)

const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8')
for (const module of [
  'object/has-own',
  'array/at',
  'array/to-sorted',
  'array/to-reversed',
  'array/to-spliced',
  'structured-clone'
]) {
  const importLine = `import 'core-js/actual/${module}'`
  const position = mainSource.indexOf(importLine)
  assert.ok(position >= 0 && position < mainSource.indexOf("import { createApp } from 'vue'"))
}

for (const mix of colorMixes) {
  const result = await postcss([legacyColorMixFallback()]).process(`.sample { color: ${mix}; }`, {
    from: undefined
  })
  const fallback = result.root.first.first.value
  assert.doesNotMatch(fallback, /color-mix\(/, `No Chromium 89 fallback for ${mix}`)
  result.root.walkDecls(decl => {
    if (!decl.value.includes('color-mix(')) return
    let ancestor = decl.parent
    while (ancestor && !(ancestor.type === 'atrule' && ancestor.name === 'supports' &&
      ancestor.params === '(color: color-mix(in srgb, red, blue))')) {
      ancestor = ancestor.parent
    }
    assert.ok(ancestor, `Unguarded modern declaration overrides the fallback for ${mix}`)
  })
}

const mainPath = fileURLToPath(new URL('../src/styles/main.scss', import.meta.url))
const sassResult = sass.compile(mainPath, { quietDeps: true })
const { css } = await postcss(postcssConfig.plugins).process(sassResult.css, { from: mainPath })

assert.doesNotMatch(css, /@tailwind\b/)
assert.match(css, /\.absolute\s*\{[^}]*position:\s*absolute/)
assert.match(css, /\.flex\s*\{[^}]*display:\s*flex/)
assert.match(css, /\.h-screen\s*\{[^}]*height:\s*100vh/)
assert.doesNotMatch(css, /@property\b/)
assert.doesNotMatch(css, /@layer\b/)

console.log('Chromium 89 source compatibility checks passed')
