import { translateText } from '@/utils/i18n'

// 已由现有操作日志核实的消息键，仅在展示时复用已有翻译。
const MESSAGE_KEYS = {
  'app_secops.log.exec_script_fail': 'app_vap.log.exec_script_fail',
  'app_secops.log.patch_is_update': 'app_vap.log.patch_is_update',
  'app_secops.log.win_scan_success': 'app_vap.log.win_scan_success',
  'app_secops.log.scan_success': 'app_vap.log.scan_success',
  'app_secops.log.rollback_success': 'app_vap.log.rollback_success',
  'app_secops.log.install_success': 'app_vap.log.install_success',
  'app_secops.log.exec_install_fail': 'app_vap.log.exec_install_fail'
}

const RESULT_MESSAGES = {
  'app_secops.log.pre_check_success': '预检查执行成功',
  'app_secops.log.pre_check_not_satisfied': '预检查不满足安装条件',
  'app_secops.log.restart_success': '重启执行成功',
  'app_secops.log.rollback_task_success': '补丁回滚执行完成',
  'app_secops.log.exec_rollback_task_fail': '补丁回滚任务失败'
}

function translateMessageKey(key) {
  if (Object.prototype.hasOwnProperty.call(RESULT_MESSAGES, key)) return RESULT_MESSAGES[key]
  const translationKey = Object.prototype.hasOwnProperty.call(MESSAGE_KEYS, key)
    ? MESSAGE_KEYS[key]
    : key
  return translateText(`#{${translationKey}}`)
}

function applyTemplateParams(template, params) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!Object.prototype.hasOwnProperty.call(params, key)) return ''
    const value = params[key]
    return value === null || value === undefined ? '' : String(value)
  })
}

export function formatPatchLogMessage(message) {
  if (!message) return ''

  // 先解析 JSON，防止原始说明中的翻译表达式使整个 JSON 直接显示。
  try {
    const record = JSON.parse(message)
    if (!record || !record.msg_id || typeof record.msg_id !== 'string') return message
    if (
      [
        'app_secops.log.exec_rollback_task_fail',
        'app_secops.log.pre_check_not_satisfied',
        'app_secops.log.rollback_task_success'
      ].includes(record.msg_id) &&
      typeof record.msg_info === 'string' &&
      record.msg_info.trim()
    ) {
      return record.msg_info
    }
    return applyTemplateParams(translateMessageKey(record.msg_id), record) || record.msg_id
  } catch {
    if (message.includes('#{')) {
      return message.replace(/#\{([^}]+)\}/g, (_, key) => translateMessageKey(key))
    }
    return translateMessageKey(message) || message
  }
}
