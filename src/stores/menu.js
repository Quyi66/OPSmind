/**
 * 菜单状态管理 Store
 * 管理当前选中的一级菜单和二级菜单状态
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getMenuGroups, getMenuGroup, getMenuItemInfo, getHomeMenu } from '@/config/menu.config.js'

export const useMenuStore = defineStore('menu', () => {
  // 状态
  const activeGroup = ref('') // 当前激活的一级菜单分组
  const activeMenuItem = ref('') // 当前激活的二级菜单项
  const sideMenuCollapsed = ref(false) // 左侧菜单是否折叠
  const showSideMenu = ref(false) // 是否显示左侧菜单

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
  const setActiveGroup = (groupCode) => {
    console.log('🎯 Setting active group:', groupCode)
    activeGroup.value = groupCode

    // 如果选择了分组，显示左侧菜单
    if (groupCode) {
      showSideMenu.value = true
      sideMenuCollapsed.value = false
    } else {
      showSideMenu.value = false
    }

    // 清除当前选中的菜单项（因为切换了分组）
    activeMenuItem.value = ''
  }

  const setActiveMenuItem = (menuCode) => {
    console.log('🎯 Setting active menu item:', menuCode)
    activeMenuItem.value = menuCode

    // 根据菜单项自动设置对应的分组
    const info = getMenuItemInfo(menuCode)
    if (info && info.group.code !== activeGroup.value) {
      activeGroup.value = info.group.code
      showSideMenu.value = true
    }
  }

  const clearActiveMenu = () => {
    console.log('🧹 Clearing active menu')
    activeGroup.value = ''
    activeMenuItem.value = ''
    showSideMenu.value = false
  }

  const setHomeActive = () => {
    console.log('🏠 Setting home active')
    activeGroup.value = 'home'
    activeMenuItem.value = ''
    showSideMenu.value = false
  }

  const toggleSideMenu = () => {
    showSideMenu.value = !showSideMenu.value
    console.log('📱 Side menu visibility toggled:', showSideMenu.value)
  }

  const setSideMenuCollapsed = (collapsed) => {
    sideMenuCollapsed.value = collapsed
    console.log('📱 Side menu collapsed state changed:', collapsed)
  }

  // 根据当前路由自动设置菜单状态
  const setMenuFromRoute = (routePath) => {
    // 移除开头的 '/'
    const moduleCode = routePath.substring(1)

    if (!moduleCode || moduleCode === 'home') {
      setHomeActive()
      return
    }

    // 查找对应的菜单项
    const info = getMenuItemInfo(moduleCode)
    if (info) {
      setActiveGroup(info.group.code)
      setActiveMenuItem(moduleCode)
      console.log('🧭 Menu state set from route:', routePath, '-> Group:', info.group.code, 'Item:', moduleCode)
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
    getBreadcrumb
  }
})
