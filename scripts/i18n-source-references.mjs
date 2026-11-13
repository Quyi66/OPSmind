import ts from 'typescript'

// Only calls bound to this application's i18n helpers are checked. Legacy
// translateText/translateI18nKey and dynamic backend keys retain their fallback rules.
export function collectI18nReferences(source, filename) {
  const isVue = filename.endsWith('.vue')
  const scriptMatch = isVue ? /<script\b[^>]*>([\s\S]*?)<\/script>/.exec(source) : null
  const script = isVue ? scriptMatch?.[1] || '' : source
  const offset = scriptMatch ? scriptMatch.index + scriptMatch[0].indexOf('>') + 1 : 0
  const ast = ts.createSourceFile(filename, script, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const helpers = new Set()
  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    const moduleName = statement.moduleSpecifier.text
    const allowed =
      moduleName === '@/core/i18n'
        ? ['t']
        : moduleName === '@/core/i18n/feedback'
          ? ['message']
          : []
    const bindings = statement.importClause?.namedBindings
    if (!bindings || !ts.isNamedImports(bindings)) continue
    for (const binding of bindings.elements) {
      if (allowed.includes(binding.propertyName?.text || binding.name.text))
        helpers.add(binding.name.text)
    }
  }
  if (!helpers.size) return []
  const references = []
  const record = (key, position) =>
    references.push({ key, line: source.slice(0, position).split('\n').length })
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      helpers.has(node.expression.text)
    ) {
      const key = node.arguments[0]
      if (key && (ts.isStringLiteral(key) || ts.isNoSubstitutionTemplateLiteral(key)))
        record(key.text, offset + key.getStart(ast))
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  if (isVue) {
    const templateMatch = /<template\b[^>]*>([\s\S]*)<\/template>/.exec(source)
    if (templateMatch) {
      // Preserve positions when removing comments, so diagnostics refer to the source file.
      const template = templateMatch[1].replace(/<!--[\s\S]*?-->/g, value =>
        value.replace(/[^\n]/g, ' ')
      )
      const templateOffset = templateMatch.index + templateMatch[0].indexOf('>') + 1
      const calls = /\b([A-Za-z_$][\w$]*)\(\s*(['"])([^'"\r\n]+)\2/g
      for (const match of template.matchAll(calls)) {
        if (helpers.has(match[1])) record(match[3], templateOffset + match.index)
      }
    }
  }
  return references
}
