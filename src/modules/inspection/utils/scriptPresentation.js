/** 展示名称不写回脚本对象，执行和保存继续使用原始名称与路径。 */
export function getInspectionScriptLabel(script = {}) {
  const name = typeof script.scriptName === 'string' ? script.scriptName.trim() : ''
  const path = typeof script.scriptPath === 'string' ? script.scriptPath.trim() : ''
  if (name && name !== path) return name
  const source = name || path
  if (!source) return '未命名脚本'
  return source.split(/[/\\]/).filter(Boolean).pop() || '未命名脚本'
}
