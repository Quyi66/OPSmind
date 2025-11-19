/**
 * 菜单状态管理 Store
 * 管理当前选中的一级菜单和二级菜单状态
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '@/core/auth'
// 避免循环依赖：通过全局暴露获取路由实例
function getRouter() {
  if (typeof window !== 'undefined' && window.__VUE_ROUTER__) return window.__VUE_ROUTER__
  return null
}
import {
  getMenuGroups,
  getMenuGroup,
  getMenuItemInfo,
  getHomeMenu,
  resolveGroupCode
} from '@/config/menu.config.js'

export const useMenuStore = defineStore('menu', () => {
  const BASE_RECENT_KEY = 'opsmind_recent_features'
  // 状态
  const activeGroup = ref('') // 当前激活的一级菜单分组
  const activeMenuItem = ref('') // 当前激活的二级菜单项
  const sideMenuCollapsed = ref(false) // 左侧菜单是否折叠
  const showSideMenu = ref(false) // 是否显示左侧菜单
  const recentItems = ref(loadRecent()) // 最近使用功能
  // 独立页面（不属于任何分组的内嵌页），打开时隐藏左侧二级菜单
  const STANDALONE_ITEMS = ['settings', 'ssc']

  // 计算属性
  const currentGroup = computed(() => {
    return activeGroup.value ? getMenuGroup(activeGroup.value) : null
  })

  const currentMenuItem = computed(() => {
    if (!activeMenuItem.value) return null
    const info = getMenuItemInfo(activeMenuItem.value)
    return info ? info.menuItem : null
  })

  const homeMenu = computed(() => {
    return getHomeMenu()
  })

  const menuGroups = computed(() => {
    return getMenuGroups()
  })

  const currentSubMenus = computed(() => {
    return currentGroup.value ? currentGroup.value.children : []
  })

  // 动作
  const setActiveGroup = groupCode => {
    //console.log('🎯 Setting active group:', groupCode)

    // 先清除当前选中的菜单项，避免冲突
    activeMenuItem.value = ''

    activeGroup.value = groupCode

    // 如果选择了分组，显示左侧菜单
    if (groupCode) {
      showSideMenu.value = true
      sideMenuCollapsed.value = false

      // 延迟自动选中第一个二级菜单项，确保前一个模块已卸载
      setTimeout(() => {
        const group = getMenuGroup(groupCode)
        if (group && group.children && group.children.length > 0) {
          const firstMenuItem = group.children[0]
          //console.log('🎯 Auto-selecting first menu item:', firstMenuItem.code)
          setActiveMenuItem(firstMenuItem.code)
        }
      }, 100) // 100ms延迟，确保状态更新完成
    } else {
      showSideMenu.value = false
      activeMenuItem.value = ''
    }
  }

  const setActiveMenuItem = menuCode => {
    //console.log('🎯 Setting active menu item:', menuCode)
    activeMenuItem.value = menuCode

    // 独立页面：隐藏左侧菜单，避免与之前分组的菜单混淆
    if (STANDALONE_ITEMS.includes(menuCode)) {
      showSideMenu.value = false
      // 不记录最近使用，且不改变当前激活分组
      return
    }

    // 根据菜单项自动设置对应的分组（但不触发自动选择逻辑）
    const info = getMenuItemInfo(menuCode)
    if (info && info.group.code !== activeGroup.value) {
      activeGroup.value = info.group.code
      showSideMenu.value = true
    }

    // 记录最近使用
    recordRecent(menuCode)

    // 同步URL：优先使用 #/一级功能/二级功能
    try {
      const r = getRouter()
      if (r) {
        // 核心路由采用短路径（/#/<moduleCode>），此处保持一致
        r.push(`/${menuCode}`)
      }
    } catch (e) {
      console.warn('Failed to push route for menu item:', menuCode, e)
    }
  }

  const clearActiveMenu = () => {
    //console.log('🧹 Clearing active menu')
    activeGroup.value = ''
    activeMenuItem.value = ''
    showSideMenu.value = false
  }

  const setHomeActive = () => {
    //console.log('🏠 Setting home active')
    activeGroup.value = 'home'
    activeMenuItem.value = ''
    showSideMenu.value = false
  }

  const toggleSideMenu = () => {
    showSideMenu.value = !showSideMenu.value
    //console.log('📱 Side menu visibility toggled:', showSideMenu.value)
  }

  const setSideMenuCollapsed = collapsed => {
    sideMenuCollapsed.value = collapsed
    //console.log('📱 Side menu collapsed state changed:', collapsed)
  }

  // 根据当前路由自动设置菜单状态
  const setMenuFromRoute = routePath => {
    // 规范化路径
    const clean = routePath.startsWith('/') ? routePath.slice(1) : routePath

    if (!clean || clean === 'home') {
      setHomeActive()
      return
    }

    const parts = clean.split('/').filter(Boolean)
    const moduleCode = parts.length >= 2 ? parts[1] : parts[0]
    const groupAlias = parts.length >= 2 ? parts[0] : null
    const groupCode = groupAlias ? resolveGroupCode(groupAlias) : null

    // 查找对应的菜单项
    const info = getMenuItemInfo(moduleCode)
    if (info) {
      // 直接设置状态，不触发自动选择逻辑
      activeGroup.value = groupCode || info.group.code
      activeMenuItem.value = moduleCode
      showSideMenu.value = true
      //console.log(
      //   '🧭 Menu state set from route:',
      //   routePath,
      //   '-> Group:',
      //   info.group.code,
      //   'Item:',
      //   moduleCode
      // )
      // 记录最近使用
      recordRecent(moduleCode)
    } else {
      console.warn('⚠️ No menu item found for route:', routePath)
    }
  }

  // 获取面包屑导航
  const getBreadcrumb = () => {
    const breadcrumb = []

    if (currentGroup.value) {
      breadcrumb.push({
        name: currentGroup.value.name,
        code: currentGroup.value.code,
        type: 'group'
      })
    }

    if (currentMenuItem.value) {
      breadcrumb.push({
        name: currentMenuItem.value.name,
        code: currentMenuItem.value.code,
        type: 'item'
      })
    }

    return breadcrumb
  }

  return {
    // 状态
    activeGroup,
    activeMenuItem,
    sideMenuCollapsed,
    showSideMenu,
    recentItems,

    // 计算属性
    currentGroup,
    currentMenuItem,
    homeMenu,
    menuGroups,
    currentSubMenus,

    // 动作
    setActiveGroup,
    setActiveMenuItem,
    clearActiveMenu,
    setHomeActive,
    toggleSideMenu,
    setSideMenuCollapsed,
    setMenuFromRoute,
    getBreadcrumb,
    recordRecent
  }

  // 最近使用相关
  function getRecentKey() {
    try {
      const user = authService.getCurrentUser()
      const login = user?.login || user?.name || 'guest'
      return `${BASE_RECENT_KEY}:${login}`
    } catch (e) {
      return `${BASE_RECENT_KEY}:guest`
    }
  }

  function loadRecent() {
    try {
      const userKey = getRecentKey()
      const raw = localStorage.getItem(userKey)
      const parsed = raw ? JSON.parse(raw) : []
      if (Array.isArray(parsed)) return parsed
    } catch {
      console.warn('Failed to load recent features')
    }
    // 兼容迁移：如果用户键下没有数据，尝试读取旧全局键一次
    try {
      const legacyRaw = localStorage.getItem(BASE_RECENT_KEY)
      const legacy = legacyRaw ? JSON.parse(legacyRaw) : []
      if (Array.isArray(legacy) && legacy.length) {
        // 将旧数据迁移到当前用户键下
        saveRecent(legacy)
        // 可选择清理旧键：保留以防他人用户使用同一浏览器，此处不清理
        return legacy
      }
    } catch {
      // ignore
    }
    return []
  }

  function saveRecent(list) {
    try {
      const userKey = getRecentKey()
      localStorage.setItem(userKey, JSON.stringify(list))
    } catch {
      console.warn('Failed to save recent features')
    }
  }

  function recordRecent(menuCode) {
    const info = getMenuItemInfo(menuCode)
    if (!info) return
    const item = {
      code: info.menuItem.code,
      name: info.menuItem.name,
      icon: info.menuItem.icon,
      group: info.group.code
    }

    // 去重并前置
    const filtered = recentItems.value.filter(i => i.code !== item.code)
    filtered.unshift(item)

    // 仅保留最近10个
    const limited = filtered.slice(0, 10)
    recentItems.value = limited
    saveRecent(limited)
  }
})
