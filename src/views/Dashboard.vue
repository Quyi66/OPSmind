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
      <aside class="dashboard-sidebar">
        <DashboardSidebar />
      </aside>

      <!-- 主内容区 -->
      <main class="dashboard-content">
        <div class="dashboard-main">
          <div class="grid grid-cols-12 gap-6">
            <!-- AI Assistant -->
            <div class="col-span-4 bg-white rounded-xl p-4 border border-gray-200">
              <AIAssistant />
            </div>

            <!-- Operations Overview -->
            <div class="col-span-4 bg-white rounded-xl p-4 border border-gray-200">
              <SoftwareOverview />
            </div>

            <!-- Inspection Overview -->
            <div class="col-span-4 bg-white rounded-xl p-4 border border-gray-200">
              <InspectionOverview />
            </div>

            <!-- Operations Chart -->
            <div class="col-span-6 bg-white rounded-xl p-4 border border-gray-200">
              <JobOverview />
            </div>

            <!-- Asset Overview -->
            <div class="col-span-6 bg-white rounded-xl p-4 border border-gray-200">
              <AssetOverview />
            </div>

            <!-- Monitoring Overview -->
            <div class="col-span-12 bg-white rounded-xl p-4 border border-gray-200">
              <VulnerabilityOverview />
            </div>
          </div>
        </div>
      </main>
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

import { getAllMenuItems } from '@/config/menu.config.js'
import DashboardSidebar from '@/components/DashboardSidebar.vue'
import SoftwareOverview from '@/components/SoftwareOverview.vue'
import JobOverview from '@/components/JobOverview.vue'
import InspectionOverview from '@/components/InspectionOverview.vue'
import AssetOverview from '@/components/AssetOverview.vue'
import VulnerabilityOverview from '@/components/VulnerabilityOverview.vue'
import AIAssistant from '@/components/AIAssistant.vue'
import AngularModuleContainerModal from '@/components/AngularModuleContainerModal.vue'
import { ModulePreloadManager } from '@/composables/useOptimizedModuleLoader'

const dashboardStore = useDashboardStore()
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

const handleRefresh = async () => {
  await loadDashboardData()
  ElMessage.success('数据已刷新')
}
</script>

<style scoped>
.dashboard {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #f0f2f5;
  min-height: 0;
}

/* Dashboard主布局 */
.dashboard-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
  font-family: "PingFang SC", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background: #f5f6fa;
}

/* 左侧边栏 */
.dashboard-sidebar {
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e8eaed;
}

/* 主内容区域 */
.dashboard-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
  background-color: #f5f6fa;
  min-height: 0;
}

/* Dashboard主容器 */
.dashboard-main {
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
}

/* 加载和错误状态 */
.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  min-height: 400px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dashboard-layout {
    flex-direction: column;
  }

  .dashboard-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e8eaed;
  }

  .dashboard-content {
    padding: 16px;
  }

  .grid {
    grid-template-columns: repeat(1, minmax(0, 1fr));
    gap: 1rem;
  }

  .col-span-4,
  .col-span-6,
  .col-span-12 {
    grid-column: span 1 / span 1;
  }
}

@media (max-width: 1024px) {
  .grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .col-span-4 {
    grid-column: span 6 / span 6;
  }
}
</style>
