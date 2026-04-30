/**
 * 集中式 i18n 翻译工具
 * 处理 #{key} 格式的翻译字符串
 *
 * 翻译文件位于 public/i18n/zh-cn/ 目录下
 */

// 翻译缓存
let translationsCache = null
let loadingPromise = null
let isLoaded = false

/**
 * 加载所有翻译资源
 */
async function loadTranslations() {
  if (translationsCache && isLoaded) {
    return translationsCache
  }

  if (loadingPromise) {
    return loadingPromise
  }

  loadingPromise = (async () => {
    const translations = {}

    // 需要加载的翻译文件列表
    const modules = [
      'acm', 'adm', 'app', 'app_pms', 'app_spm', 'app_sudo', 'app_uim',
      'app_vap', 'app_vcm', 'cac', 'cmd', 'common', 'dts', 'flow',
      'gfs', 'jao', 'ssc', 'udp', 'global'
    ]

    try {
      // 从 public/i18n/zh-cn/ 目录加载翻译文件
      const importPromises = modules.map(async (module) => {
        try {
          // 使用 import.meta.env.BASE_URL 自动适应不同的 base 路径
          const basePath = import.meta.env.BASE_URL || '/'
          const response = await fetch(`${basePath}i18n/zh-cn/${module}.json`)
          if (response.ok) {
            const data = await response.json()
            Object.assign(translations, data)
          }
        } catch (e) {
          // 静默失败，使用硬编码的备用翻译
        }
      })

      await Promise.all(importPromises)
    } catch (error) {
      console.warn('Failed to load i18n translations, using static translations')
    }

    translationsCache = translations
    isLoaded = true
    return translations
  })()

  return loadingPromise
}

// 模块加载时自动触发翻译资源的预加载
loadTranslations()

/**
 * 硬编码的常用翻译映射（备用，用于翻译文件加载失败时）
 */
const STATIC_TRANSLATIONS = {
  // 应用标题
  'cac.index.square': '系统巡检',
  'cac.index.template': '巡检模板',
  'cac.index.job': '检查结果',
  'acm.title': '资产管理',
  'app_pms.title': '密码管理',
  'app_sudo.title': 'sudo权限管理',
  'app_vap.title': '补丁管理',
  'app_spm.title': 'Yum仓库管理',
  'app_uim.name': '用户管理',
  'app_vcm.title': '虚拟化管理',

  // CAC 巡检相关
  'cac.common.custom_content': '自定义内容',
  'cac.common.custom_title': '自定义标题',
  'cac.common.recipient_list': '收件人列表',
  'cac.common.save_recipient': '保存收件人',
  'cac.profile.inspection_results_profile': '巡检结果概览',
  'cac.profile.machine_profile': '主机概览',
  'cac.profile.host_details': '主机详情',
  'cac.profile.inspection_items': '巡检项',
  'cac.profile.inspection_items_profile': '巡检项概览',
  'cac.profile.inspection_items_details': '巡检项详情',
  'cac.profile.status_profile': '状态概览',
  'cac.profile.whitelist_list': '白名单列表',
  'cac.profile.host_key': '主机',
  'cac.profile.manual_inspection': '人工检查',
  'cac.result.status.error': '失败',
  'cac.job.inspect': '巡检任务',
  'cac3.navigation.inspection_results': '巡检结果',
  'dts.datasource.success': '成功',

  // ACM 作业相关
  'acm.job.assert_into': '主机录入',
  'acm.job.update_already_info': '更新已纳管设备信息',
  'acm.job.delete_model': '删除资产模型',
  'acm.job.add_group': '新增分组',
  'acm.job.add_host_group': '新增主机分组',
  'acm.job.save_ansible_config': '保存ansible配置信息',
  'acm.job.check_conn': '设备连通性检测',
  'acm.job.collect_assert_info': '资产信息采集',
  'acm.job.ssh_key_send': 'SSH密钥纳管',
  'acm.job.import_assert': '资产信息导入',
  'acm.job.add_tag': '新增标签',
  'acm.job.delete_tag': '删除主机标签',
  'acm.job.delete_group': '删除主机分组',
  'acm.job.delete_assert': '资产信息删除',
  'acm.job.batch_save_assert_attr': '批次更新资产属性',
  'acm.job.modify_status': '资产上下线',
  'acm.job.modify_ansible_user_password': '修改ansible用户密码',
  'acm.job.assert_blanklist': '资产黑名单',
  'acm.job.modify_team_permission': '修改团队资源组权限',
  'acm.job.remove_group_assert': '移除分组内设备',
  'acm.job.remove_tag_assert': '移除标签内设备',
  'acm.job.import_model': '资产模型导入',
  'acm.job.assert_controller': '设备纳管',
  'acm.job.delete_auto_config_info': '删除自动化配置信息',
  'acm.job.delete_ansible_config_info': '删除ansible配置信息',

  // 其他常见翻译
  'common.entity.action.view': '查看',
  'common.entity.action.edit': '编辑',
  'common.entity.action.delete': '删除',
  'common.entity.action.copy': '复制',
  'common.action.save': '保存',
  'common.action.cancel': '取消',
  'common.action.confirm': '确认',
  'common.action.close': '关闭',
  'common.action.delete': '删除',

  // 补丁管理 - 菜单
  'app_vap.menu.patch_scan.title': '补丁扫描',
  'app_vap.menu.patch_install.title': '补丁安装',
  'app_vap.menu.patch_rollback.title': '补丁回退',
  'app_vap.menu.win_patch_scan.title': 'Windows漏洞扫描',
  'app_vap.menu.import_patch_library.title': '导入补丁库',
  'app_vap.menu.import_patch_library_time': '定时导入补丁库',
  'app_vap.menu.vulnerability_rollback.title': 'Windows回滚',

  // 补丁管理 - Tab和操作
  'app_vap.common.tab.repo_list_scan': 'YUM源列表扫描',
  'app_vap.common.tab.custom_repo': '自定义YUM源',
  'app_vap.common.header.hosts': '主机',
  'app_vap.common.header.kb_number': 'KB编号',
  'app_vap.common.header.update_time': '更新时间',
  'app_vap.common.header.operate': '操作',
  'app_vap.common.header.reboot_machine': '重启机器',
  'app_vap.common.button.rollback': '回滚',
  'app_vap.common.button.batch_rollback': '批量回滚',

  // 流程
  'flow.index.list': '流程列表',
}

/**
 * 格式化日期时间
 * 将 ISO 格式 (2023-08-04T16:38:23) 转换为友好格式 (2023-08-04 16:38:23)
 * @param {string|Date} dateStr 日期字符串或Date对象
 * @returns {string} 格式化后的日期时间字符串
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  // 处理 ISO 格式日期，将 T 替换为空格
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    return dateStr.replace('T', ' ').split('.')[0]
  }
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * 翻译 #{key} 格式的字符串
 * @param {string} text 需要翻译的文本
 * @returns {string} 翻译后的文本
 */
export function translateI18nKey(text) {
  if (!text) return ''

  // 检查是否是 #{...} 格式
  if (!text.startsWith('#{') || !text.endsWith('}')) {
    return text
  }

  const key = text.slice(2, -1) // 移除 #{ 和 }

  // 首先从缓存中查找
  if (translationsCache && translationsCache[key]) {
    return translationsCache[key]
  }

  // 然后从静态映射中查找
  if (STATIC_TRANSLATIONS[key]) {
    return STATIC_TRANSLATIONS[key]
  }

  // 如果没找到，提取 key 的最后一部分作为显示文本
  const parts = key.split('.')
  return parts[parts.length - 1] || text
}

/**
 * 翻译文本（支持 #{key} 格式和普通文本）
 * 如果文本包含 #{key} 格式，会替换所有匹配项
 * 例如: "【CAC】template__#{cac.common.custom_content}" -> "【CAC】template__自定义内容"
 */
export function translateText(text) {
  if (!text) return ''

  // 使用正则替换所有 #{...} 格式
  // 匹配 #{key} 格式，key 可以包含字母、数字、点和下划线
  return text.replace(/#\{([^}]+)\}/g, (match, key) => {
    // 首先从缓存中查找
    if (translationsCache && translationsCache[key]) {
      return translationsCache[key]
    }

    // 然后从静态映射中查找
    if (STATIC_TRANSLATIONS[key]) {
      return STATIC_TRANSLATIONS[key]
    }

    // 如果没找到，提取 key 的最后一部分作为显示文本
    const parts = key.split('.')
    return parts[parts.length - 1] || match
  })
}

/**
 * 批量翻译对象中的指定字段
 * @param {Object|Array} data 数据对象或数组
 * @param {string[]} fields 需要翻译的字段名
 * @returns {Object|Array} 翻译后的数据
 */
export function translateFields(data, fields = ['title', 'description']) {
  if (!data) return data

  if (Array.isArray(data)) {
    return data.map(item => translateFields(item, fields))
  }

  if (typeof data === 'object') {
    const result = { ...data }
    fields.forEach(field => {
      if (result[field]) {
        result[field] = translateText(result[field])
      }
    })
    return result
  }

  return data
}

/**
 * 初始化翻译资源（可选，用于预加载）
 */
export async function initTranslations() {
  await loadTranslations()
}

/**
 * 添加自定义翻译
 * @param {Object} translations 翻译键值对
 */
export function addTranslations(translations) {
  if (!translationsCache) {
    translationsCache = {}
  }
  Object.assign(translationsCache, translations)
}

export default {
  translateI18nKey,
  translateText,
  translateFields,
  formatDateTime,
  initTranslations,
  addTranslations,
  STATIC_TRANSLATIONS
}
