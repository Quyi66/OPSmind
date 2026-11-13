import { t } from '@/core/i18n'
import { ref, onMounted } from 'vue'
import * as jaoApi from '@/modules/automation/api/jao'

/**
 * 应用资源翻译管理
 * 处理应用列表的加载和标题翻译
 */
export function useAppletTranslation() {
  const appletMap = ref({})
  const appletsList = ref([])

  /**
   * 翻译 title，处理 #{key} 格式
   */
  function translateTitle(title) {
    if (!title) return ''

    // 如果是 #{...} 格式，提取最后一部分作为显示文本
    if (title.startsWith('#{') && title.endsWith('}')) {
      const key = title.slice(2, -1) // 移除 #{ 和 }
      const parts = key.split('.')

      // 应用翻译映射
      const translations = {
        'cac.index.square': t('automation.applets.cac'),
        'acm.title': t('automation.applets.acm'),
        'app_pms.title': t('automation.applets.pms'),
        'app_sudo.title': t('automation.applets.sudo'),
        'app_vap.title': t('automation.applets.vap'),
        'app_spm.title': t('automation.applets.spm'),
        'app_uim.name': t('automation.applets.uim'),
        'app_uim.menu.dashboard': t('automation.applets.dashboard'),
        'app_vcm.menu.host_cluster': t('automation.applets.cluster'),
        'app_vcm.menu.vm_template': t('automation.applets.vm'),
        'applet.selector.all': t('automation.applets.all'),
        'applet.selector.unsorted': t('automation.applets.unsorted')
      }

      return translations[key] || parts[parts.length - 1] || title
    }

    return title
  }

  /**
   * 获取应用资源列表
   */
  async function fetchApplets() {
    try {
      const response = await jaoApi.fetchApplets()
      const applets = response.data || response || []

      // 处理翻译 key，移除 #{} 包裹并提取实际文本
      appletsList.value = applets.map(app => ({
        ...app,
        get displayTitle() { return translateTitle(app.title) }
      }))

      appletMap.value = applets.reduce((map, app) => {
        Object.defineProperty(map, app.name, { enumerable: true, configurable: true, get: () => translateTitle(app.title) })
        return map
      }, {})
    } catch (error) {
      console.warn('获取应用列表失败:', error)
    }
  }

  /**
   * 根据 appCode 获取应用名称
   */
  function getAppName(appCode) {
    if (!appCode) return '-'
    return appletMap.value[appCode] || appCode
  }

  onMounted(() => {
    fetchApplets()
  })

  return {
    appletMap,
    appletsList,
    translateTitle,
    fetchApplets,
    getAppName
  }
}
