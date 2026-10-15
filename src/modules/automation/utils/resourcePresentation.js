import { translateText } from '@/utils/i18n'

// Only aliases backed by existing execution call sites. Match both identity and
// original title so renamed/custom resources and historical names remain intact.
// This is presentation-only: never use these labels to construct API payloads.
const BUILTIN_TOOL_LABELS = {
  M1x855: { title: '【ACM】设备连通性检测', label: '设备连通性检测' },
  mjedwe: { title: '【ACM】资产信息采集', label: '资产信息采集' },
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
