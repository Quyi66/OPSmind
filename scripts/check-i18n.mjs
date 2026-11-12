import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { baseCompile } from '@intlify/message-compiler'
import ts from 'typescript'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../src/core/i18n/locales.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const languages = SUPPORTED_LOCALES
const messages = new Map()
const errors = []
function checkDuplicateKeys(raw, filename) {
  const source = ts.parseJsonText(filename, raw)
  function visit(node, prefix = '') {
    if (ts.isObjectLiteralExpression(node)) {
      const keys = new Set()
      for (const property of node.properties) {
        const key = property.name?.text
        if (keys.has(key)) errors.push(`${filename}:${prefix}${key}: duplicate key`)
        keys.add(key)
        if (property.initializer) visit(property.initializer, `${prefix}${key}.`)
      }
    }
  }
  for (const statement of source.statements) {
    if (ts.isExpressionStatement(statement)) visit(statement.expression)
  }
}
function flatten(data, prefix = '', result = {}) {
  for (const [key, value] of Object.entries(data)) {
    const full = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') result[full] = value
    else if (value && typeof value === 'object' && !Array.isArray(value))
      flatten(value, full, result)
    else errors.push(`${full}: messages must contain strings or objects`)
  }
  return result
}
for (const locale of languages) {
  const directory = path.join(root, 'src/locales', locale)
  const entries = {}
  for (const name of fs.readdirSync(directory).filter(name => name.endsWith('.json'))) {
    const namespace = path.basename(name, '.json')
    const filename = path.join(directory, name)
    const raw = fs.readFileSync(filename, 'utf8')
    checkDuplicateKeys(raw, filename)
    const data = JSON.parse(raw)
    Object.assign(entries, flatten(data, namespace))
  }
  messages.set(locale, entries)
  for (const [key, text] of Object.entries(entries)) {
    if (key.startsWith('legacy.')) continue
    baseCompile(text, { onError: error => errors.push(`${locale}:${key}: ${error.message}`) })
  }
}
const source = messages.get(DEFAULT_LOCALE)
for (const locale of languages.filter(locale => locale !== DEFAULT_LOCALE)) {
  const target = messages.get(locale)
  for (const key of new Set([...Object.keys(source), ...Object.keys(target)])) {
    if (!(key in source) || !(key in target)) errors.push(`${locale}: key mismatch: ${key}`)
    else {
      const params = text =>
        [...text.matchAll(/\{(\w+)\}/g)]
          .map(match => match[1])
          .sort()
          .join(',')
      if (params(source[key]) !== params(target[key]))
        errors.push(`${locale}: parameter mismatch: ${key}`)
    }
  }
}
if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  console.log(
    `i18n: ${languages.length} languages, ${Object.keys(source).length} messages each; keys, parameters and message syntax passed.`
  )
}
