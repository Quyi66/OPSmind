import postcss from 'postcss'

const COLOR_MIX_SUPPORT = '(color: color-mix(in srgb, red, blue))'
const RGB_SUFFIX = '-legacy-rgb'

function colorChannels(value) {
  const hex = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1]
  if (hex) {
    const expanded = hex.length === 3 ? [...hex].map(char => char + char).join('') : hex
    return [0, 2, 4].map(index => parseInt(expanded.slice(index, index + 2), 16)).join(', ')
  }
  const variable = value.match(/^var\((--[\w-]+)\)$/)?.[1]
  if (variable) return `var(${variable}${RGB_SUFFIX}, 128, 128, 128)`
  return null
}

function splitTopLevel(value) {
  const parts = []
  let depth = 0
  let start = 0

  for (let index = 0; index < value.length; index++) {
    if (value[index] === '(') depth++
    if (value[index] === ')') depth--
    if (value[index] === ',' && depth === 0) {
      parts.push(value.slice(start, index).trim())
      start = index + 1
    }
  }

  parts.push(value.slice(start).trim())
  return parts
}

function fallbackColor(mix) {
  const parts = splitTopLevel(mix)
  if (parts.length !== 3 || !parts[0].startsWith('in ')) return null

  const colors = parts.slice(1).map(part => {
    const match = part.match(/\s+(\d+(?:\.\d+)?)%$/)
    return {
      value: match ? part.slice(0, match.index).trim() : part,
      weight: match ? Number(match[1]) : null
    }
  })

  if (colors[0].weight === null) colors[0].weight = 100 - (colors[1].weight ?? 50)
  if (colors[1].weight === null) colors[1].weight = 100 - colors[0].weight

  const visible = colors.filter(color => color.value !== 'transparent')
  if (visible.length === 0) return 'transparent'
  if (visible.length === 1) {
    const total = colors[0].weight + colors[1].weight
    const alpha = total ? visible[0].weight / total * Math.min(total / 100, 1) : 0
    // 颜色变量通过同一选择器内的 RGB companion 跟随主题切换。
    // 无法静态解析的外部颜色使用中性灰，但仍保留透明度，避免实色背景遮蔽文字。
    const channels = colorChannels(visible[0].value) || '128, 128, 128'
    return `rgba(${channels}, ${Number(alpha.toFixed(6))})`
  }
  return visible.sort((left, right) => right.weight - left.weight)[0].value
}

function replaceColorMix(value) {
  let result = ''
  let cursor = 0

  while (cursor < value.length) {
    const start = value.indexOf('color-mix(', cursor)
    if (start < 0) return result + value.slice(cursor)

    result += value.slice(cursor, start)
    let depth = 1
    let end = start + 'color-mix('.length
    while (end < value.length && depth > 0) {
      if (value[end] === '(') depth++
      if (value[end] === ')') depth--
      end++
    }

    if (depth !== 0) return null
    const mix = value.slice(start + 'color-mix('.length, end - 1)
    const fallback = fallbackColor(mix)
    if (!fallback) return null
    result += fallback
    cursor = end
  }

  return result
}

export default function legacyColorMixFallback() {
  return {
    postcssPlugin: 'legacy-color-mix-fallback',
    Once(root) {
      // 同时处理依赖样式中的主题变量和业务样式中的颜色别名。
      const colorVariables = []
      root.walkDecls(/^--/, decl => {
        if (decl.prop.endsWith(RGB_SUFFIX)) return
        const channels = colorChannels(decl.value.trim())
        if (channels) colorVariables.push({ decl, channels })
      })
      for (const { decl, channels } of colorVariables) {
        decl.cloneAfter({ prop: `${decl.prop}${RGB_SUFFIX}`, value: channels })
      }

      const modernRules = new Set()
      const declarations = []
      root.walkDecls(decl => {
        if (decl.value.includes('color-mix(')) declarations.push(decl)
      })

      for (const decl of declarations) {
        const fallback = replaceColorMix(decl.value)
        if (!fallback || fallback === decl.value) continue

        const parent = decl.parent
        if (!modernRules.has(parent)) {
          // 保留整条规则的声明顺序，避免现代覆盖改变后续 shorthand/重复声明的优先级。
          const modernRule = parent.clone()
          const supports = postcss.atRule({ name: 'supports', params: COLOR_MIX_SUPPORT })
          supports.append(modernRule)
          parent.after(supports)
          modernRules.add(parent)
        }
        decl.value = fallback
      }
    }
  }
}
