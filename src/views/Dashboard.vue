<template>
  <div class="dashboard">
    <!-- 主内容区 -->
    <div class="dashboard-content">
      <!-- 加载状态 -->
      <div
        v-if="dashboardStore.loading"
        class="loading-container"
        v-loading="true"
        element-loading-text="正在加载仪表盘数据..."
      ></div>

      <!-- 错误状态 -->
      <div v-else-if="dashboardStore.error" class="error-container">
        <el-alert :title="dashboardStore.error" type="error" show-icon :closable="false" />
        <el-button @click="handleRefresh" type="primary" class="mt-3">重新加载</el-button>
      </div>

      <!-- 正常内容 -->
      <div v-else class="dashboard-main">
        <!-- 统计卡片区域 -->
        <div class="stats-section">
          <StatsCard
            v-for="stat in dashboardStore.systemStats"
            :key="stat.id"
            :title="stat.title"
            :value="stat.value"
            :icon="stat.icon"
            @click="handleStatClick(stat)"
          />
        </div>

        <!-- 快速操作区域 -->
        <div class="quick-actions-section">
          <QuickActions />
        </div>
      </div>
    </div>

    <!-- AngularJS 模块容器 -->
    <AngularModuleContainerModal />
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useDashboardStore } from '@/stores/dashboard'
import { useModuleNavigation } from '@/composables/useModuleNavigation'
import { getAllMenuItems } from '@/config/menu.config.js'
import StatsCard from '@/components/StatsCard.vue'
import QuickActions from '@/components/QuickActions.vue'
import AngularModuleContainerModal from '@/components/AngularModuleContainerModal.vue'
import { ModulePreloadManager } from '@/composables/useOptimizedModuleLoader'

const dashboardStore = useDashboardStore()
const { navigateToModule } = useModuleNavigation()
const route = useRoute()

// 监听路由变化，自动显示对应的iframe
watch(() => route.path, (newPath) => {
  console.log('🧭 Route changed to:', newPath)

  // 如果是功能模块路由，自动显示iframe
  const moduleCode = newPath.substring(1) // 移除开头的 '/'
  const allMenuItems = getAllMenuItems()
  const moduleList = allMenuItems.map(item => item.code)

  if (moduleList.includes(moduleCode)) {
    console.log('🎯 Auto-showing iframe for module:', moduleCode)

    // 触发iframe显示
    const event = new CustomEvent('showAngularModuleContainer', {
      detail: {
        moduleCode: moduleCode,
        title: getModuleTitle(moduleCode)
      }
    })
    window.dispatchEvent(event)
  }
}, { immediate: true })

// 获取模块标题
const getModuleTitle = (moduleCode) => {
  const allMenuItems = getAllMenuItems()
  const menuItem = allMenuItems.find(item => item.code === moduleCode)
  return menuItem ? menuItem.name : moduleCode.toUpperCase()
}

onMounted(async () => {
  await loadDashboardData()
})

const loadDashboardData = async () => {
  console.log('🔄 Starting to load dashboard data...')
  try {
    await dashboardStore.loadDashboardData()
    console.log('✅ Dashboard data loaded in component')

    // 启动模块预加载（延迟执行，避免影响主要加载）
    setTimeout(() => {
      console.log('🚀 Starting module preloading...')
      ModulePreloadManager.preloadCommonModules()
    }, 2000) // 2秒后开始预加载
  } catch (error) {
    console.error('❌ Failed to load dashboard data:', error)
    ElMessage.error('加载仪表盘数据失败')
  }
}



const handleStatClick = stat => {
  // 根据统计项类型跳转到相应页面
  console.log('Stat clicked:', stat)
}

const handleSearch = query => {
  // 实现搜索功能
  console.log('Search:', query)
  ElMessage.info(`搜索: ${query}`)
}

const handleRefresh = async () => {
  await loadDashboardData()
  ElMessage.success('数据已刷新')
}
</script>

<style scoped lang="scss">
.dashboard {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.dashboard-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.dashboard-main {
  max-width: 1200px;
  margin: 0 auto;
  padding-top: 20px;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.quick-actions-section {
  margin-top: 40px;
}

// 响应式设计
@media (max-width: 768px) {
  .dashboard-content {
    padding: 10px;
  }

  .dashboard-main {
    padding-top: 10px;
  }

  .stats-section {
    grid-template-columns: 1fr;
    gap: 10px;
    margin-bottom: 24px;
  }
}
</style>
