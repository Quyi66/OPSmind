import { describe, expect, it, vi } from 'vitest'
import {
  getAutomationRunTitle,
  getAutomationToolDescription,
  getAutomationToolTitle
} from '@/modules/automation/utils/resourcePresentation'

vi.mock('@/utils/i18n', () => ({ translateText: value => value || '' }))

// Visible 230 catalog links and names, 2026-10-16. Only IDs cross-checked with
// current fixed execution calls are included. This is evidence, not a generic
// production prefix-removal rule. Free-form descriptions are never rewritten.
const confirmedCatalog = [
  ['OKPacN', '【JAO】重新运行作业', '重新运行运维工具'],
  ['N4TqAN', '【JAO】插入/更新数据模型数据'],
  ['eNBw8A', '【JAO】删除数据模型数据'],
  ['an2cRO', '【VAP】移除补丁白名单'],
  ['sosZAJ', '【VAP】添加补丁白名单'],
  ['0QdW7u', '【VAP2】导入最近补丁库'],
  ['QJb6B8', '【VAP2】补丁安装（基于主机维度）'],
  ['s1r8Hp', '【VAP2】补丁安装（基于漏洞概览）'],
  ['Uu3eb1', '【VAP2】补丁回退（基于补丁安装记录）'],
  ['3Fl7CJ', '【VAP2】Linux删除历史更新记录（成功安装补丁）'],
  ['Fteqeo', '【VAP2】Windows补丁扫描'],
  ['EAsxlK', '【VAP2】Windows补丁安装'],
  ['S9eC0m', '【VAP2】Windows补丁回滚'],
  ['HiuT3F', '【VAP2】Windows补丁回滚'],
  ['aJlha6', '【VAP2】Windows删除历史更新记录（成功安装补丁）'],
  ['IxL8nr', '【VAP2】YUM源配置'],
  ['CoKLZM', '【ACM】批量更新资产信息'],
  ['QqUnBG', '【ACM】资产上下线'],
  ['CdPKGF', '【ACM】 资产信息删除'],
  ['p2AW5s', '【ACM】SSH密钥纳管'],
  ['chq5Pe', '【ACM】新增标签'],
  ['8PJcRc', '【ACM】删除资产模型'],
  ['oJXQFK', '【ACM】移除分组内设备'],
  ['dosxGT', '【ACM】移除标签内设备'],
  ['sKaBlB', '【ACM】 删除主机标签'],
  ['OApRjl', '【ACM】 删除ansible配置信息'],
  ['BAzNVq', '【ACM】 新增主机分组'],
  ['r08zUN', '【ACM】 删除主机分组'],
  ['a17VXM', '【ACM】 新增分组'],
  ['hTzJfM', '【UIM】扫描用户与用户组'],
  ['J0PRi7', '【UIM】删除用户组'],
  ['zrYK7K', '【UIM】创建用户组'],
  ['OHlcdQ', '【UIM】修改用户sudo'],
  ['wSVnmq', '【UIM】修改用户ssh登陆'],
  ['EOLAGR', '【UIM】修改用户基本信息'],
  ['rbNP8M', '【UIM】修改用户密码'],
  ['1TKvLB', '【UIM】修改用户锁定状态'],
  ['5XLCC1', '【UIM】删除用户'],
  ['6snZO9', '【UIM】创建用户'],
  ['iDdpHA', '【SUDO】sudoers列表'],
  ['xObuPC', '【SUDO】新增sudo配置'],
  ['YUZz3m', '【SUDO】重置密码'],
  ['y8D4V1', '【SUDO】配置密码复杂度'],
  ['kJym3M', '【UIM】新增sudo模板'],
  ['yW3mhs', '【UIM】删除sudo模板'],
  ['c06cQz', '【UIM】新增sudo命令'],
  ['xr6PHd', '【UIM】删除sudo命令'],
  ['3hSAVR', '【SPM】软件包安装(仓库)'],
  ['aXEihQ', '【SPM】软件升级'],
  ['B5KDp0', '【SPM】软件降级'],
  ['gnLGFi', '【SPM】仓库(禁用/启用)'],
  ['foInBU', '【SPM】仓库删除'],
  ['wBFwHn', '【SPM】仓库配置信息导入'],
  ['dfApaC', '【SPM】仓库配置信息保存'],
  ['K6zNCC', '【SPM】仓库配置信息删除'],
  ['FB8oVl', '【SPM】扫描基准仓库设定'],
  ['puc46x', '【SPM】扫描基准仓库删除'],
  ['3m2kbd', '【SPM】主机配置仓库'],
  ['ccZagK', '【SPM】软件包扫描'],
  ['EKjwO7', '【SPM】软件包安装(本地)'],
  ['zYn2Is', '【SPM】仓库扫描'],
  ['dchUqi', '【SPM】仓库配置'],
  ['8jgzI0', '【PMS2】删除系统参数'],
  ['zRQjPA', '【PMS2】更新系统参数'],
  ['Su0G8O', '【PMS2】申请临时密码'],
  ['hV5lB4', '【PMS2】提交临时密码申请单'],
  ['GqoyL7', '【PMS2】复制临时密码申请单'],
  ['iHSVgH', '【PMS2】删除临时密码申请单'],
  ['fk4rJ4', '【PMS2】重置密码'],
  ['jBZm9w', '【PMS2】密码导入'],
  ['v0KKtQ', '【PMS2】扫描密码状态'],
  ['u160sB', '【PMS2】批量修改密码']
]

describe('已核实目录的展示边界', () => {
  it.each(confirmedCatalog)('%s 只在 ID 与原名匹配时使用展示名', (id, title, display) => {
    const label = display || title.replace(/^【[^】]+】\s*/, '')
    const record = Object.freeze({ id, title, description: title, appletCode: 'original' })
    expect(getAutomationToolTitle(record)).toBe(label)
    expect(getAutomationToolDescription(record)).toBe(label)
    expect(getAutomationToolTitle({ ...record, id: 'custom' })).toBe(title)
    expect(getAutomationToolTitle({ ...record, title: `${title} 自定义` })).toBe(`${title} 自定义`)
    expect(getAutomationToolDescription({ ...record, description: `${title} 使用说明` })).toBe(`${title} 使用说明`)
    expect(getAutomationRunTitle({ id: 'run-id', jobId: id, job_title: title })).toBe(label)
    expect(getAutomationRunTitle({ id, job_title: title })).toBe(title)
    expect(record).toEqual({ id, title, description: title, appletCode: 'original' })
  })

  it.each([
    ['XTyrWp', '【SUDO-V2】回收sudo权限'],
    ['kzkM5M', '【SUDO-V2】新增sudo权限'],
    ['k21Btn', '【FLOW】流程列表'],
    ['K7OcJz', '【JAO】更新数据模型中指定的属性的值'],
    ['nU1obv', '【CAC】新增黑名单']
  ])('目录存在但未核实固定用途的 %s 保留原名', (id, title) => {
    expect(getAutomationToolTitle({ id, title })).toBe(title)
  })
})
