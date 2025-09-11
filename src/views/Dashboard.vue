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
      <DashboardSidebar />

      <!-- 主内容区 -->
      <main class="dashboard-content">
        <div class="dashboard-main">
          <!-- 第一行：操作提示区域 -->
          <div class="dashboard-row">
            <div class="dashboard-card full-width">
              <AIAssistant />
            </div>
          </div>

          <!-- 第二行：作业概览 & 巡检概览 -->
          <div class="dashboard-row">
            <div class="dashboard-card half-width">
              <JobOverview />
            </div>
            <div class="dashboard-card half-width">
              <InspectionOverview />
            </div>
          </div>

          <!-- 第三行：资产概览 & 漏洞概览 -->
          <div class="dashboard-row">
            <div class="dashboard-card half-width">
              <AssetOverview />
            </div>
            <div class="dashboard-card half-width">
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
watch(
  () => route.path,
  newPath => {
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
  },
  { immediate: true }
)

onMounted(async () => {
  // 仅在首页（/home）加载仪表盘数据，避免在切换到其他应用时触发
  if (route.name === 'home' || route.path === '/home') {
    await loadDashboardData()
  } else {
    console.log('⏭️ Skip dashboard data load (not on /home):', route.path)
  }
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

    // 登录成功后（首页）获取 AI OPS URL 参数并打印
    await dashboardStore.fetchAiOpsUrl()
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
  background: linear-gradient(135deg, #f5f6fa 0%, #f0f2f5 100%);
  min-height: 0;
}

/* Dashboard主布局 */
.dashboard-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
  font-family:
    'PingFang SC',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    Arial,
    sans-serif;
  background: transparent;
}

/* 主内容区域 */
.dashboard-content {
  flex: 1;
  overflow: hidden;
  /* 更紧凑顶部间距：24px -> 16px；底部保持 16px；左侧 5px 保持 */
  padding: 16px 16px 16px 0;
  background: transparent;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* Dashboard主容器 */
.dashboard-main {
  max-width: var(--app-max-width);
  margin: 0 auto;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Dashboard行布局 */
.dashboard-row {
  display: flex;
  gap: 16px;
  width: 100%;
}

/* 第一行 - AI助手区域 */
.dashboard-row:nth-child(1) {
  flex: 0 0 60px;
  min-height: 60px;
}

/* 第二行 - 作业概览 & 巡检概览 */
.dashboard-row:nth-child(2) {
  flex: 6;
  min-height: 0;
}

/* 第三行 - 资产概览 & 漏洞概览 */
.dashboard-row:nth-child(3) {
  flex: 4;
  min-height: 0;
}

/* Dashboard卡片 */
.dashboard-card {
  background: white;
  border-radius: 4px; /* 进一步收窄圆角 */
  border: 1px solid #e8eaed;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.dashboard-card:hover {
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

.dashboard-card.full-width {
  width: 100%;
}

.dashboard-card.half-width {
  flex: 1;
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
  border-radius: 4px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .dashboard-main {
    gap: 16px;
  }

  .dashboard-row {
    gap: 16px;
  }

  /* 保持1:4:5的比例 */
  .dashboard-row:nth-child(1) {
    flex: 1;
  }

  .dashboard-row:nth-child(2) {
    flex: 4;
  }

  .dashboard-row:nth-child(3) {
    flex: 5;
  }
}

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
    padding: 12px;
    overflow-y: auto;
  }

  .dashboard-main {
    gap: 12px;
    height: auto;
  }

  .dashboard-row {
    flex-direction: column;
    gap: 12px;
    flex: none;
  }

  /* 移动端重置高度 */
  .dashboard-row:nth-child(1),
  .dashboard-row:nth-child(2),
  .dashboard-row:nth-child(3) {
    flex: none;
    min-height: auto;
  }

  .dashboard-card.half-width {
    width: 100%;
  }
}
</style>
