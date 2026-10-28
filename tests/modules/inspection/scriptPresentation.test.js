import { describe, expect, it } from 'vitest'
import { getInspectionScriptLabel } from '@/modules/inspection/utils/scriptPresentation'

describe('巡检脚本展示保留原始资源身份', () => {
  it('只在名称缺失或名称就是路径时回退文件名', () => {
    const script = Object.freeze({ scriptPath: '/sjxy/cac/check.yml', scriptParams: '--all' })
    expect(getInspectionScriptLabel(script)).toBe('check.yml')
    expect(getInspectionScriptLabel({ ...script, scriptName: script.scriptPath })).toBe('check.yml')
    expect(getInspectionScriptLabel({ scriptPath: 'C:\\checks\\disk.ps1' })).toBe('disk.ps1')
    expect(getInspectionScriptLabel({})).toBe('未命名脚本')
    expect(script.scriptPath).toBe('/sjxy/cac/check.yml')
    expect(script.scriptParams).toBe('--all')
  })

  it('保留自定义名称、旧前缀及同文件名不同目录的真实路径', () => {
    const scripts = [
      Object.freeze({ scriptName: '【CAC】数据库 / 磁盘检查', scriptPath: '/a/check.yml' }),
      Object.freeze({ scriptName: 'check.yml', scriptPath: '/b/check.yml' })
    ]
    expect(scripts.map(getInspectionScriptLabel)).toEqual(['【CAC】数据库 / 磁盘检查', 'check.yml'])
    expect(scripts.map(script => script.scriptPath)).toEqual(['/a/check.yml', '/b/check.yml'])
  })
})
