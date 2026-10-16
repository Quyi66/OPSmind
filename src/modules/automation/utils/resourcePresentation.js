import { translateText } from '@/utils/i18n'

// Only aliases backed by existing execution call sites. Match both identity and
// original title so renamed/custom resources and historical names remain intact.
// This is presentation-only: never use these labels to construct API payloads.
const BUILTIN_TOOL_LABELS = {
  M1x855: { title: '【ACM】设备连通性检测', label: '设备连通性检测' },
  mjedwe: { title: '【ACM】资产信息采集', label: '资产信息采集' },
  '3TRE7d': { title: '【ACM】更新已纳管设备信息', label: '更新已纳管设备信息' },
  eGfsxb: { title: '【ACM】设备纳管', label: '设备纳管' },
  c7WN62: { title: '【ACM】保存ansible配置信息', label: '保存 Ansible 配置信息' },
  '0MKtcJ': { title: '【ACM】主机录入', label: '主机录入' },
  '0g3GfW': { title: '【VAP2】补丁扫描', label: '补丁扫描' },
  // 230 resource links cross-checked with the current fixed execution calls.
  OKPacN: { title: '【JAO】重新运行作业', label: '重新运行运维工具' },
  N4TqAN: { title: '【JAO】插入/更新数据模型数据', label: '插入/更新数据模型数据' },
  eNBw8A: { title: '【JAO】删除数据模型数据', label: '删除数据模型数据' },
  an2cRO: { title: '【VAP】移除补丁白名单', label: '移除补丁白名单' },
  sosZAJ: { title: '【VAP】添加补丁白名单', label: '添加补丁白名单' },
  '0QdW7u': { title: '【VAP2】导入最近补丁库', label: '导入最近补丁库' },
  QJb6B8: { title: '【VAP2】补丁安装（基于主机维度）', label: '补丁安装（基于主机维度）' },
  s1r8Hp: { title: '【VAP2】补丁安装（基于漏洞概览）', label: '补丁安装（基于漏洞概览）' },
  Uu3eb1: { title: '【VAP2】补丁回退（基于补丁安装记录）', label: '补丁回退（基于补丁安装记录）' },
  '3Fl7CJ': { title: '【VAP2】Linux删除历史更新记录（成功安装补丁）', label: 'Linux删除历史更新记录（成功安装补丁）' },
  Fteqeo: { title: '【VAP2】Windows补丁扫描', label: 'Windows补丁扫描' },
  EAsxlK: { title: '【VAP2】Windows补丁安装', label: 'Windows补丁安装' },
  S9eC0m: { title: '【VAP2】Windows补丁回滚', label: 'Windows补丁回滚' },
  HiuT3F: { title: '【VAP2】Windows补丁回滚', label: 'Windows补丁回滚' },
  aJlha6: { title: '【VAP2】Windows删除历史更新记录（成功安装补丁）', label: 'Windows删除历史更新记录（成功安装补丁）' },
  IxL8nr: { title: '【VAP2】YUM源配置', label: 'YUM源配置' },
  CoKLZM: { title: '【ACM】批量更新资产信息', label: '批量更新资产信息' },
  QqUnBG: { title: '【ACM】资产上下线', label: '资产上下线' },
  CdPKGF: { title: '【ACM】资产信息删除', label: '资产信息删除' },
  p2AW5s: { title: '【ACM】SSH密钥纳管', label: 'SSH密钥纳管' },
  chq5Pe: { title: '【ACM】新增标签', label: '新增标签' },
  '8PJcRc': { title: '【ACM】删除资产模型', label: '删除资产模型' },
  oJXQFK: { title: '【ACM】移除分组内设备', label: '移除分组内设备' },
  dosxGT: { title: '【ACM】移除标签内设备', label: '移除标签内设备' },
  sKaBlB: { title: '【ACM】删除主机标签', label: '删除主机标签' },
  OApRjl: { title: '【ACM】删除ansible配置信息', label: '删除ansible配置信息' },
  BAzNVq: { title: '【ACM】新增主机分组', label: '新增主机分组' },
  r08zUN: { title: '【ACM】删除主机分组', label: '删除主机分组' },
  a17VXM: { title: '【ACM】新增分组', label: '新增分组' },
  hTzJfM: { title: '【UIM】扫描用户与用户组', label: '扫描用户与用户组' },
  J0PRi7: { title: '【UIM】删除用户组', label: '删除用户组' },
  zrYK7K: { title: '【UIM】创建用户组', label: '创建用户组' },
  OHlcdQ: { title: '【UIM】修改用户sudo', label: '修改用户sudo' },
  wSVnmq: { title: '【UIM】修改用户ssh登陆', label: '修改用户ssh登陆' },
  EOLAGR: { title: '【UIM】修改用户基本信息', label: '修改用户基本信息' },
  rbNP8M: { title: '【UIM】修改用户密码', label: '修改用户密码' },
  '1TKvLB': { title: '【UIM】修改用户锁定状态', label: '修改用户锁定状态' },
  '5XLCC1': { title: '【UIM】删除用户', label: '删除用户' },
  '6snZO9': { title: '【UIM】创建用户', label: '创建用户' },
  iDdpHA: { title: '【SUDO】sudoers列表', label: 'sudoers列表' },
  xObuPC: { title: '【SUDO】新增sudo配置', label: '新增sudo配置' },
  YUZz3m: { title: '【SUDO】重置密码', label: '重置密码' },
  y8D4V1: { title: '【SUDO】配置密码复杂度', label: '配置密码复杂度' },
  kJym3M: { title: '【UIM】新增sudo模板', label: '新增sudo模板' },
  yW3mhs: { title: '【UIM】删除sudo模板', label: '删除sudo模板' },
  c06cQz: { title: '【UIM】新增sudo命令', label: '新增sudo命令' },
  xr6PHd: { title: '【UIM】删除sudo命令', label: '删除sudo命令' },
  '3hSAVR': { title: '【SPM】软件包安装(仓库)', label: '软件包安装(仓库)' },
  aXEihQ: { title: '【SPM】软件升级', label: '软件升级' },
  B5KDp0: { title: '【SPM】软件降级', label: '软件降级' },
  gnLGFi: { title: '【SPM】仓库(禁用/启用)', label: '仓库(禁用/启用)' },
  foInBU: { title: '【SPM】仓库删除', label: '仓库删除' },
  wBFwHn: { title: '【SPM】仓库配置信息导入', label: '仓库配置信息导入' },
  dfApaC: { title: '【SPM】仓库配置信息保存', label: '仓库配置信息保存' },
  K6zNCC: { title: '【SPM】仓库配置信息删除', label: '仓库配置信息删除' },
  FB8oVl: { title: '【SPM】扫描基准仓库设定', label: '扫描基准仓库设定' },
  puc46x: { title: '【SPM】扫描基准仓库删除', label: '扫描基准仓库删除' },
  '3m2kbd': { title: '【SPM】主机配置仓库', label: '主机配置仓库' },
  ccZagK: { title: '【SPM】软件包扫描', label: '软件包扫描' },
  EKjwO7: { title: '【SPM】软件包安装(本地)', label: '软件包安装(本地)' },
  zYn2Is: { title: '【SPM】仓库扫描', label: '仓库扫描' },
  dchUqi: { title: '【SPM】仓库配置', label: '仓库配置' },
  '8jgzI0': { title: '【PMS2】删除系统参数', label: '删除系统参数' },
  zRQjPA: { title: '【PMS2】更新系统参数', label: '更新系统参数' },
  Su0G8O: { title: '【PMS2】申请临时密码', label: '申请临时密码' },
  hV5lB4: { title: '【PMS2】提交临时密码申请单', label: '提交临时密码申请单' },
  GqoyL7: { title: '【PMS2】复制临时密码申请单', label: '复制临时密码申请单' },
  iHSVgH: { title: '【PMS2】删除临时密码申请单', label: '删除临时密码申请单' },
  fk4rJ4: { title: '【PMS2】重置密码', label: '重置密码' },
  jBZm9w: { title: '【PMS2】密码导入', label: '密码导入' },
  v0KKtQ: { title: '【PMS2】扫描密码状态', label: '扫描密码状态' },
  u160sB: { title: '【PMS2】批量修改密码', label: '批量修改密码' }
}

export function getAutomationToolTitle(record, fallback = '未命名运维工具') {
  const raw = [
    record?.title,
    record?.job_title,
    record?.jobTitle,
    record?.jobName,
    record?.templateName,
    record?.name
  ].find(value => typeof value === 'string' && value.trim())
  if (!raw) return fallback

  const title = translateText(raw) || raw
  const id = record?.job_id ?? record?.jobId ?? record?.id
  const alias = BUILTIN_TOOL_LABELS[id]
  return alias && title.replace(/\s/g, '') === alias.title ? alias.label : title
}

export function getAutomationRunTitle(record, fallback = '未命名运行') {
  // In run records, id identifies the run, not the tool. Only explicit job IDs
  // may select an alias; missing identity must preserve the original name.
  const title = getAutomationToolTitle({ ...record, id: undefined }, fallback)
  // Some historical script runs have only a path, without a tool name.
  // Keep the real path on the record for diagnostics; show the file in the list.
  const scriptPath = title.match(/^\[script\](.+[/\\])([^/\\]+)$/i)
  return scriptPath ? `脚本执行：${scriptPath[2]}` : title
}

export function getAutomationToolDescription(record) {
  // A few built-in descriptions repeat the original tool name. Apply the same
  // identity + exact-name rule; leave free-form descriptions and custom tools intact.
  return getAutomationToolTitle(
    {
      id: record?.job_id ?? record?.jobId ?? record?.id,
      title: record?.description
    },
    ''
  )
}

export function getAutomationExecutionPresentation(payload, fallback = {}) {
  const jobId = payload?.jobId || fallback.id || ''
  const rawJobTitle = payload?.jobTitle || fallback.title || '运维工具执行'
  return { jobId, rawJobTitle, jobTitle: getAutomationRunTitle({ job_id: jobId, job_title: rawJobTitle }) }
}
