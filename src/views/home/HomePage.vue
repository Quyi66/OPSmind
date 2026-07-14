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

          <!-- 第二行：主机漏洞概览 & 严重漏洞预警 -->
          <div class="dashboard-row">
            <div class="dashboard-card half-width">
              <!-- <JobOverview /> -->
              <HostVulnerabilityOverview />
            </div>
            <div class="dashboard-card half-width">
              <CriticalCveAlert />
            </div>
          </div>

          <!-- 第三行：资产概览 & 巡检概览 -->
          <div class="dashboard-row">
            <div class="dashboard-card half-width">
              <AssetOverview />
            </div>
            <div class="dashboard-card half-width">
              <InspectionOverview />
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { onMounted, watch, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useDashboardStore } from '@/stores/dashboard'

import { getAllMenuItems } from '@/config/menu.config.js'
// 非图表组件保持同步加载（关键 UI）
import DashboardSidebar from '@/views/home/components/DashboardSidebar.vue'
import AIAssistant from '@/components/ai/AIAssistant.vue'
import { ModulePreloadManager } from '@/composables/useOptimizedModuleLoader'

// 图表组件异步加载 - 延迟加载 ECharts 相关组件，优化首屏性能
// 配置加载状态和超时处理
const asyncComponentOptions = loader => ({
  loader,
  delay: 200, // 延迟 200ms 后才显示 loading
  timeout: 10000 // 10 秒超时
})

// const JobOverview = defineAsyncComponent(
//   asyncComponentOptions(() => import('@/views/home/components/JobOverview.vue'))
// )
const HostVulnerabilityOverview = defineAsyncComponent(
  asyncComponentOptions(() => import('@/views/home/components/HostVulnerabilityOverview.vue'))
)
const InspectionOverview = defineAsyncComponent(
  asyncComponentOptions(() => import('@/views/home/components/InspectionOverview.vue'))
)
const AssetOverview = defineAsyncComponent(
  asyncComponentOptions(() => import('@/views/home/components/AssetOverview.vue'))
)
const CriticalCveAlert = defineAsyncComponent(
  asyncComponentOptions(() => import('@/views/home/components/CriticalCveAlert.vue'))
)

const dashboardStore = useDashboardStore()
const route = useRoute()

// 函数定义必须在 watch 之前，因为 watch 使用 immediate: true
const loadDashboardData = async () => {
  try {
    await dashboardStore.loadDashboardData()

    // 启动模块预加载（延迟执行，避免影响主要加载）
    setTimeout(() => {
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

// 监听路由变化
watch(
  () => route.path,
  async newPath => {
    // 返回首页时，确保加载仪表盘数据（修复偶现返回首页后全是0的问题）
    if (newPath === '/home' || route.name === 'home') {
      // 避免重复请求：仅在未加载或需要刷新时触发
      const shouldLoad =
        !dashboardStore.loading &&
        (!dashboardStore.dashboardFullData || dashboardStore.needsRefresh)
      if (shouldLoad) {
        await loadDashboardData()
      }
    }
  },
  { immediate: true }
)

onMounted(async () => {
  // 仅在首页（/home）加载仪表盘数据，避免在切换到其他应用时触发
  if (route.name === 'home' || route.path === '/home') {
    await loadDashboardData()
  } else {
  }
})
</script>

<style scoped>
.dashboard {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color-page);
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
  gap: 14px;
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
  background: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 4px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.dashboard-card:hover {
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 8px 24px rgba(96, 165, 250, 0.08);
  transform: translateY(-2px);
  border-color: rgba(96, 165, 250, 0.15);
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
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
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
    border-bottom: 1px solid var(--el-border-color-light);
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
