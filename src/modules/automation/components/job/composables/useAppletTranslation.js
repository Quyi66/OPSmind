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
        'cac.index.square': '系统巡检',
        'acm.title': '资产管理',
        'app_pms.title': '密码管理',
        'app_sudo.title': 'sudo权限管理',
        'app_vap.title': '补丁管理',
        'app_spm.title': '软件管理',
        'app_uim.name': '用户管理',
        'app_uim.menu.dashboard': '控制台',
        'app_vcm.menu.host_cluster': '主机集群',
        'app_vcm.menu.vm_template': '虚拟机模板',
        'applet.selector.all': '所有应用',
        'applet.selector.unsorted': '未分类'
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
        displayTitle: translateTitle(app.title)
      }))

      appletMap.value = applets.reduce((map, app) => {
        map[app.name] = translateTitle(app.title)
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
