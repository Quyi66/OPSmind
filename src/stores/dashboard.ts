import { defineStore } from 'pinia'
import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { angularJSBridge } from '@/services/angularjs-bridge'
import { hybridModuleManager } from '@/core/modules/HybridModuleManager.js'
import { authService } from '@/core/auth'
import type { User } from '@/types/auth'
import type { DashboardFullData } from '@/types/dashboard'

interface ModuleShowIn {
  desktop?: number
  dock?: number
}

interface Module {
  code: string
  name: string
  title: string
  icon?: string
  color?: string
  showIn?: ModuleShowIn
  enabled?: boolean
}

interface SystemStat {
  name: string
  value: number | string
  unit?: string
  trend?: 'up' | 'down' | 'stable'
}

interface ModuleStats {
  total: number
  vue: number
  angular: number
  hybrid: number
  migrationProgress: {
    percentage: number
    completed: number
    inProgress: number
    remaining: number
  }
}

interface DashboardState {
  currentUser: Ref<User | null>
  availableModules: Ref<Module[]>
  systemStats: Ref<SystemStat[]>
  dashboardFullData: Ref<DashboardFullData | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  lastUpdated: Ref<number | null>
}

interface DashboardGetters {
  desktopModules: ComputedRef<Module[]>
  dockModules: ComputedRef<Module[]>
  moduleStats: ComputedRef<ModuleStats>
  needsRefresh: ComputedRef<boolean>
}

interface DashboardActions {
  loadDashboardData(): Promise<void>
  openModule(moduleCode: string): Promise<void>
  refreshStats(): Promise<void>
  reset(): void
}

export const useDashboardStore = defineStore('dashboard', () => {
  // 状态
  const currentUser: Ref<User | null> = ref(null)
  const availableModules: Ref<Module[]> = ref([])
  const systemStats: Ref<SystemStat[]> = ref([])
  const dashboardFullData: Ref<DashboardFullData | null> = ref(null)
  const loading: Ref<boolean> = ref(false)
  const error: Ref<string | null> = ref(null)
  const lastUpdated: Ref<number | null> = ref(null)

  // 计算属性
  const desktopModules: ComputedRef<Module[]> = computed(() => {
    return availableModules.value
      .filter(module => module.showIn?.desktop !== undefined)
      .sort((a, b) => (a.showIn?.desktop || 0) - (b.showIn?.desktop || 0))
  })

  const dockModules: ComputedRef<Module[]> = computed(() => {
    return availableModules.value
      .filter(module => module.showIn?.dock !== undefined)
      .sort((a, b) => (a.showIn?.dock || 0) - (b.showIn?.dock || 0))
  })

  // 混合模块统计
  const moduleStats: ComputedRef<ModuleStats> = computed(() => {
    const stats = hybridModuleManager.getMigrationStats()
    return {
      total: availableModules.value.length,
      vue: stats.vue,
      angular: stats.angular,
      hybrid: stats.hybrid,
      migrationProgress: stats.migrationProgress
    }
  })

  // 是否需要刷新数据
  const needsRefresh: ComputedRef<boolean> = computed(() => {
    if (!lastUpdated.value) return true
    const fiveMinutes = 5 * 60 * 1000
    return Date.now() - lastUpdated.value > fiveMinutes
  })

  // 操作方法
  const loadDashboardData = async (): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      // 首先检查用户认证状态
      const user = await angularJSBridge.getUserInfo()

      if (!user) {
        // 用户未登录，抛出认证错误
        throw new Error('AUTHENTICATION_REQUIRED')
      }

      // 并行加载其他数据
      const [modules, stats, fullData] = await Promise.all([
        angularJSBridge.getMenus(), // 获取真实的模块列表
        getSystemStats(), // 获取系统统计信息（历史兼容）
        getDashboardFullData() // 获取仪表盘全量数据
      ])

      currentUser.value = user as User
      availableModules.value = modules || []
      systemStats.value = stats
      dashboardFullData.value = fullData
      lastUpdated.value = Date.now()

      console.log('✅ Dashboard data loaded successfully')
    } catch (err) {
      console.error('❌ Failed to load dashboard data:', err)

      // 如果是认证错误，触发重新认证
      if (err instanceof Error && err.message === 'AUTHENTICATION_REQUIRED') {
        console.log('🔒 Authentication required, redirecting to login')
        // 清除可能存在的无效认证信息
        try {
          await authService.logout()
        } catch (logoutError) {
          console.error('Failed to logout:', logoutError)
        }

        // 不设置 error，让路由守卫处理跳转
        error.value = null

        // 强制跳转到登录页
        window.location.href = '/login'
      } else {
        error.value = err instanceof Error ? err.message : String(err)
      }
    } finally {
      loading.value = false
    }
  }

  const openModule = async (moduleCode: string): Promise<void> => {
    // 这个方法现在只是一个占位符
    // 实际的导航逻辑在 Dashboard 组件中处理
    console.log('🚀 openModule called for:', moduleCode)
  }

  // 获取模块标题的辅助函数
  const getModuleTitle = (moduleCode: string): string => {
    const titles: Record<string, string> = {
      cac: 'CAC 配置管理',
      jao: 'JAO 作业编排',
      gfs: 'GFS 脚本管理',
      dts: 'DTS 数据传输',
      udp: 'UDP 统一开发平台',
      acm: 'ACM 资产配置管理',
      adm: 'ADM 系统管理',
      app: 'APP 应用管理',
      search: 'SEARCH 搜索中心',
      dev: 'DEV 开发工具'
    }
    return titles[moduleCode] || moduleCode.toUpperCase()
  }

  const getSystemStats = async (): Promise<SystemStat[]> => {
    try {
      const { apiService } = await import('@/core/api')
      return await apiService.getSystemStats()
    } catch (err) {
      console.error('Failed to get system stats:', err)
      return []
    }
  }

  const getDashboardFullData = async (): Promise<DashboardFullData> => {
    try {
      const { apiService } = await import('@/core/api')
      const data = await apiService.getDashboardFullData()
      return data as DashboardFullData
    } catch (err) {
      console.error('Failed to get dashboard full data:', err)
      // 使用 API 内置的 mock 已处理，这里确保有返回
      const { apiService } = await import('@/core/api')
      return apiService.getMockDashboardFullData()
    }
  }

  const refreshStats = async (): Promise<void> => {
    try {
      systemStats.value = await getSystemStats()
      lastUpdated.value = Date.now()
    } catch (err) {
      console.error('Failed to refresh stats:', err)
    }
  }

  // 重置状态
  const reset = (): void => {
    currentUser.value = null
    availableModules.value = []
    systemStats.value = []
    dashboardFullData.value = null
    loading.value = false
    error.value = null
    lastUpdated.value = null
  }

  return {
    // 状态
    currentUser,
    availableModules,
    systemStats,
    dashboardFullData,
    loading,
    error,
    lastUpdated,

    // 计算属性
    desktopModules,
    dockModules,
    moduleStats,
    needsRefresh,

    // 方法
    loadDashboardData,
    openModule,
    refreshStats,
    reset
  }
})

// 导出类型
export type {
  Module,
  SystemStat,
  ModuleStats,
  DashboardState,
  DashboardGetters,
  DashboardActions
}
