<template>
  <div class="dashboard">
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

    <!-- 主体布局 -->
    <div v-else class="dashboard-layout">
      <!-- 左侧边栏 -->
      <DashboardSidebar class="dashboard-sidebar" />

      <!-- 主内容区 -->
      <div class="dashboard-content">
        <div class="dashboard-main">
          <!-- 软件概览区域 -->
          <div class="software-section">
            <SoftwareOverview />
          </div>

          <!-- 中间区域：作业概览和巡检概览 -->
          <div class="middle-section">
            <div class="job-overview-container">
              <JobOverview />
            </div>
            <div class="inspection-overview-container">
              <InspectionOverview />
            </div>
          </div>

          <!-- 底部区域：资产概览和漏洞概览 -->
          <div class="bottom-section">
            <div class="asset-overview-container">
              <AssetOverview />
            </div>
            <div class="vulnerability-overview-container">
              <VulnerabilityOverview />
            </div>
          </div>
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
import DashboardSidebar from '@/components/DashboardSidebar.vue'
import SoftwareOverview from '@/components/SoftwareOverview.vue'
import JobOverview from '@/components/JobOverview.vue'
import InspectionOverview from '@/components/InspectionOverview.vue'
import AssetOverview from '@/components/AssetOverview.vue'
import VulnerabilityOverview from '@/components/VulnerabilityOverview.vue'
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
    console.log('🎯 Module route detected:', moduleCode)

    // 注意：不再在这里触发弹窗模式的iframe
    // iframe现在由MainLayout中的AngularModuleInlineFrame组件处理
    // 这里只是记录路由变化
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
  background-color: #f0f2f5;
}

.dashboard-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
  font-family: "PingFang SC", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.dashboard-sidebar {
  flex-shrink: 0;
}

.dashboard-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: #F5F6FA;
  height: 100vh;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100%;
}

.dashboard-main {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 40px); /* 减去padding */
  gap: 16px;
}

.software-section {
  flex: 1; /* 占1/3高度 */
  display: flex;
  flex-direction: column;
}

.middle-section,
.bottom-section {
  flex: 1; /* 各占1/3高度 */
  display: flex;
  gap: 16px;
}

.job-overview-container,
.inspection-overview-container,
.asset-overview-container,
.vulnerability-overview-container {
  flex: 1;
  height: 100%;
  overflow: hidden;
  position: relative;
}

// 响应式设计
@media (max-width: 1200px) {
  .dashboard-main {
    height: auto; /* 在小屏幕上允许滚动 */
  }

  .software-section,
  .middle-section,
  .bottom-section {
    flex: none; /* 取消flex比例 */
  }

  .middle-section,
  .bottom-section {
    flex-direction: column;
    gap: 16px;
  }

  .job-overview-container,
  .inspection-overview-container,
  .asset-overview-container,
  .vulnerability-overview-container {
    flex: none;
    height: 350px;
  }
}

@media (max-width: 768px) {
  .dashboard-layout {
    flex-direction: column;
  }

  .dashboard-sidebar {
    order: 2;
    height: auto;
  }

  .dashboard-content {
    order: 1;
    padding: 10px;
  }

  .dashboard-main {
    height: auto; /* 移动端允许滚动 */
    gap: 12px;
  }

  .software-section,
  .middle-section,
  .bottom-section {
    flex: none; /* 移动端取消flex比例 */
  }

  .middle-section,
  .bottom-section {
    gap: 12px;
  }

  .job-overview-container,
  .inspection-overview-container,
  .asset-overview-container,
  .vulnerability-overview-container {
    flex: none;
    height: 300px;
  }
}

@media (max-width: 576px) {
  .dashboard-content {
    padding: 8px;
  }

  .dashboard-main {
    gap: 12px;
  }

  .overview-left,
  .overview-right {
    height: 300px;
  }
}
</style>
