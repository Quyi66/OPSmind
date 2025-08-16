import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { angularBridge } from '@/services/angularjs-bridge'

export const useDashboardStore = defineStore('dashboard', () => {
  // 状态
  const currentUser = ref(null)
  const availableModules = ref([])
  const systemStats = ref([])
  const loading = ref(false)
  const error = ref(null)
  
  // 计算属性
  const desktopModules = computed(() => {
    return availableModules.value
      .filter(module => module.showIn && module.showIn.desktop)
      .sort((a, b) => a.showIn.desktop - b.showIn.desktop)
  })
  
  const dockModules = computed(() => {
    return availableModules.value
      .filter(module => module.showIn && module.showIn.dock)
      .sort((a, b) => a.showIn.dock - b.showIn.dock)
  })
  
  // 操作方法
  const loadDashboardData = async () => {
    loading.value = true
    error.value = null

    try {
      // 首先检查用户认证状态
      const user = await angularBridge.getCurrentUser()

      if (!user) {
        // 用户未登录，抛出认证错误
        throw new Error('AUTHENTICATION_REQUIRED')
      }

      // 并行加载其他数据
      const [modules, stats] = await Promise.all([
        angularBridge.getAvailableModules(),
        angularBridge.getSystemStats()
      ])

      currentUser.value = user
      availableModules.value = modules
      systemStats.value = stats

      console.log('✅ Dashboard data loaded successfully')
    } catch (err) {
      console.error('❌ Failed to load dashboard data:', err)

      // 如果是认证错误，触发重新认证
      if (err.message === 'AUTHENTICATION_REQUIRED') {
        console.log('🔒 Authentication required, redirecting to login')
        // 清除可能存在的无效认证信息
        try {
          const { authService } = await import('@/services/auth.js')
          await authService.logout()
        } catch (logoutError) {
          console.error('Failed to logout:', logoutError)
        }

        // 不设置 error，让路由守卫处理跳转
        error.value = null

        // 强制跳转到登录页
        window.location.href = '/opsmind/base/#/login'
      } else {
        error.value = err.message
      }
    } finally {
      loading.value = false
    }
  }
  
  const openModule = async (moduleCode) => {
    try {
      console.log('🚀 Opening module from dashboard:', moduleCode)

      // 清理模块代码（移除前缀下划线）
      const cleanModuleCode = moduleCode.replace(/^__/, '')

      // 使用iframe方式打开模块
      const event = new CustomEvent('showAngularModuleContainer', {
        detail: {
          moduleCode: cleanModuleCode,
          title: getModuleTitle(cleanModuleCode)
        }
      })
      window.dispatchEvent(event)
      console.log('📱 Triggered module modal for:', cleanModuleCode)

    } catch (err) {
      console.error('Failed to open module:', err)
      error.value = `无法打开模块: ${moduleCode}`
    }
  }
  
  // 获取模块标题的辅助函数
  const getModuleTitle = (moduleCode) => {
    const titles = {
      'cac': 'CAC 配置管理',
      'jao': 'JAO 作业编排',
      'gfs': 'GFS 脚本管理',
      'dts': 'DTS 数据传输',
      'udp': 'UDP 统一开发平台',
      'acm': 'ACM 资产配置管理',
      'adm': 'ADM 系统管理',
      'app': 'APP 应用管理',
      'search': 'SEARCH 搜索中心',
      'dev': 'DEV 开发工具'
    }
    return titles[moduleCode] || moduleCode.toUpperCase()
  }
  
  const refreshStats = async () => {
    try {
      systemStats.value = await angularBridge.getSystemStats()
    } catch (err) {
      console.error('Failed to refresh stats:', err)
    }
  }
  
  // 重置状态
  const reset = () => {
    currentUser.value = null
    availableModules.value = []
    systemStats.value = []
    loading.value = false
    error.value = null
  }
  
  return {
    // 状态
    currentUser,
    availableModules,
    systemStats,
    loading,
    error,
    
    // 计算属性
    desktopModules,
    dockModules,
    
    // 方法
    loadDashboardData,
    openModule,
    refreshStats,
    reset
  }
})
