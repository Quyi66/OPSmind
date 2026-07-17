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
      <!-- 主内容区 -->
      <main class="dashboard-content">
        <div class="dashboard-main">
          <!-- 第一行：AI 智能助手 (100% 全宽) -->
          <div class="dashboard-row greeting-ai-row">
            <div class="dashboard-card full-width-card">
              <AIAssistant />
            </div>
          </div>

          <!-- 第二行：主机漏洞概览 (38% 紧凑) & 严重漏洞预警 (62% 扩展) -->
          <div class="dashboard-row core-data-row">
            <div class="dashboard-card host-vuln-card">
              <HostVulnerabilityOverview />
            </div>
            <div class="dashboard-card critical-cve-card">
              <CriticalCveAlert />
            </div>
          </div>

          <!-- 第三行：资产概览 & 巡检概览 -->
          <div class="dashboard-row overview-data-row">
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

import AIAssistant from '@/components/ai/AIAssistant.vue'
import { ModulePreloadManager } from '@/composables/useOptimizedModuleLoader'

// 图表组件异步加载 - 延迟加载 ECharts 相关组件，优化首屏性能
const asyncComponentOptions = loader => ({
  loader,
  delay: 200, // 延迟 200ms 后才显示 loading
  timeout: 10000 // 10 秒超时
})

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
    }, 2000)

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
    if (newPath === '/home' || route.name === 'home') {
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
  if (route.name === 'home' || route.path === '/home') {
    await loadDashboardData()
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
  padding: 16px;
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

/* 第一行 - 迎宾 & AI助手区域 */
.dashboard-row.greeting-ai-row {
  flex: 0 0 64px;
  min-height: 64px;
}

.full-width-card {
  width: 100%;
  flex: 1;
}

/* 第二行 - 主机漏洞概览(38%) & 严重漏洞预警(62%) */
.dashboard-row.core-data-row {
  flex: 6;
  min-height: 0;
}

.host-vuln-card {
  flex: 0 0 38%;
  width: 38%;
}

.critical-cve-card {
  flex: 0 0 calc(62% - 16px);
  width: calc(62% - 16px);
}

/* 第三行 - 资产概览 & 巡检概览 */
.dashboard-row.overview-data-row {
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
@media (max-width: 1200px) {
  .greeting-card,
  .host-vuln-card {
    flex: 0 0 42%;
    width: 42%;
  }

  .ai-card,
  .critical-cve-card {
    flex: 0 0 calc(58% - 16px);
    width: calc(58% - 16px);
  }
}

@media (max-width: 900px) {
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

  .dashboard-row.greeting-ai-row,
  .dashboard-row.core-data-row,
  .dashboard-row.overview-data-row {
    flex: none;
    min-height: auto;
  }

  .greeting-card,
  .ai-card,
  .host-vuln-card,
  .critical-cve-card,
  .dashboard-card.half-width {
    width: 100%;
    flex: none;
  }
}
</style>

