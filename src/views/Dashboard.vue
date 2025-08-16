<template>
  <div class="dashboard">
    <!-- 顶部导航栏 -->
    <DashboardHeader
      :user="dashboardStore.currentUser"
      :loading="dashboardStore.loading"
      @search="handleSearch"
      @refresh="handleRefresh"
    />

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

        <!-- 功能模块网格 -->
        <div class="modules-section">
          <h2 class="section-title">功能模块</h2>
          <div class="modules-grid">
            <ModuleCard
              v-for="module in dashboardStore.desktopModules"
              :key="module.code"
              :module="module"
              @click="handleModuleClick"
            />
          </div>
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
import { onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useDashboardStore } from '@/stores/dashboard'
import DashboardHeader from '@/components/DashboardHeader.vue'
import StatsCard from '@/components/StatsCard.vue'
import ModuleCard from '@/components/ModuleCard.vue'
import QuickActions from '@/components/QuickActions.vue'
import AngularModuleContainerModal from '@/components/AngularModuleContainerModal.vue'

const dashboardStore = useDashboardStore()

onMounted(async () => {
  await loadDashboardData()
})

const loadDashboardData = async () => {
  console.log('🔄 Starting to load dashboard data...')
  try {
    await dashboardStore.loadDashboardData()
    console.log('✅ Dashboard data loaded in component')
  } catch (error) {
    console.error('❌ Failed to load dashboard data:', error)
    ElMessage.error('加载仪表盘数据失败')
  }
}

const handleModuleClick = async module => {
  try {
    await dashboardStore.openModule(module.code)
  } catch (error) {
    ElMessage.error(`打开模块失败: ${module.title}`)
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
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.modules-section {
  margin-bottom: 40px;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 20px;
  border-bottom: 2px solid #1890ff;
  padding-bottom: 10px;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.quick-actions-section {
  margin-top: 40px;
}

// 响应式设计
@media (max-width: 768px) {
  .dashboard-content {
    padding: 10px;
  }

  .stats-section {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .modules-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>
