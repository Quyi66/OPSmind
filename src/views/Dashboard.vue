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
          <!-- 顶部软件概览区域 -->
          <div class="dashboard-row dashboard-row-top">
            <div class="dashboard-card dashboard-card-full">
              <SoftwareOverview />
            </div>
          </div>

          <!-- 中间区域：作业概览和巡检概览 -->
          <div class="dashboard-row dashboard-row-middle">
            <div class="dashboard-card dashboard-card-half">
              <JobOverview />
            </div>
            <div class="dashboard-card dashboard-card-half">
              <InspectionOverview />
            </div>
          </div>

          <!-- 底部区域：资产概览和漏洞概览 -->
          <div class="dashboard-row dashboard-row-bottom">
            <div class="dashboard-card dashboard-card-half">
              <AssetOverview />
            </div>
            <div class="dashboard-card dashboard-card-half">
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
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #f0f2f5;
  min-height: 0;
}

// Dashboard主布局
.dashboard-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
  font-family: "PingFang SC", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background: #f5f6fa;
}

// 左侧边栏
.dashboard-sidebar {
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e8eaed;
}

// 主内容区域
.dashboard-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
  background-color: #f5f6fa;
  min-height: 0;

  // 自定义滚动条
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;

    &:hover {
      background: #a8a8a8;
    }
  }
}

// 加载和错误状态
.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  min-height: 400px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

// Dashboard主容器
.dashboard-main {
  max-width: 1600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: calc(100vh - 200px);
  width: 100%;
}

// Dashboard行布局
.dashboard-row {
  display: flex;
  gap: 24px;
  width: 100%;

  &.dashboard-row-top {
    flex: 0 0 auto;
    min-height: 280px;
  }

  &.dashboard-row-middle,
  &.dashboard-row-bottom {
    flex: 1;
    min-height: 320px;
  }
}

// Dashboard卡片
.dashboard-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid #e8eaed;

  &:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
  }

  &.dashboard-card-full {
    flex: 1;
    width: 100%;
  }

  &.dashboard-card-half {
    flex: 1;
    min-width: 0; // 防止flex子元素溢出
  }
}

// 响应式设计
@media (max-width: 1400px) {
  .dashboard-main {
    max-width: 100%;
    padding: 0 12px;
  }

  .dashboard-row {
    gap: 20px;
  }

  .dashboard-card {
    border-radius: 10px;
  }
}

@media (max-width: 1200px) {
  .dashboard-content {
    padding: 20px;
  }

  .dashboard-main {
    gap: 20px;
    min-height: auto;
  }

  .dashboard-row {
    gap: 16px;

    &.dashboard-row-top {
      min-height: 240px;
    }

    &.dashboard-row-middle,
    &.dashboard-row-bottom {
      min-height: 280px;
    }
  }
}

@media (max-width: 992px) {
  .dashboard-row {
    &.dashboard-row-middle,
    &.dashboard-row-bottom {
      flex-direction: column;
      gap: 16px;
    }
  }

  .dashboard-card {
    &.dashboard-card-half {
      flex: none;
      width: 100%;
      min-height: 280px;
    }
  }
}

@media (max-width: 768px) {
  .dashboard-content {
    padding: 16px;
  }

  .dashboard-main {
    gap: 16px;
  }

  .dashboard-row {
    gap: 12px;

    &.dashboard-row-top {
      min-height: 200px;
    }

    &.dashboard-row-middle,
    &.dashboard-row-bottom {
      min-height: 240px;
    }
  }

  .dashboard-card {
    border-radius: 8px;
    box-shadow: 0 1px 8px rgba(0, 0, 0, 0.06);

    &:hover {
      transform: none;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    }

    &.dashboard-card-half {
      min-height: 240px;
    }
  }
}

@media (max-width: 576px) {
  .dashboard-content {
    padding: 12px;
  }

  .dashboard-main {
    gap: 12px;
  }

  .dashboard-row {
    gap: 8px;

    &.dashboard-row-top {
      min-height: 180px;
    }

    &.dashboard-row-middle,
    &.dashboard-row-bottom {
      min-height: 200px;
    }
  }

  .dashboard-card {
    border-radius: 6px;

    &.dashboard-card-half {
      min-height: 200px;
    }
  }
}

// 横屏移动端优化
@media (max-width: 768px) and (orientation: landscape) {
  .dashboard-content {
    padding: 12px;
  }

  .dashboard-row {
    &.dashboard-row-middle,
    &.dashboard-row-bottom {
      flex-direction: row;
    }
  }

  .dashboard-card {
    &.dashboard-card-half {
      flex: 1;
      min-height: 200px;
    }
  }
}

// 高分辨率屏幕优化
@media (min-width: 1600px) {
  .dashboard-main {
    max-width: 1800px;
  }

  .dashboard-row {
    gap: 32px;

    &.dashboard-row-top {
      min-height: 320px;
    }

    &.dashboard-row-middle,
    &.dashboard-row-bottom {
      min-height: 360px;
    }
  }

  .dashboard-card {
    border-radius: 16px;
  }
}
</style>
