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
  '0g3GfW': { title: '【VAP2】补丁扫描', label: '补丁扫描' }
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
  const title = getAutomationToolTitle(record, fallback)
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
