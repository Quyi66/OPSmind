<template>
  <div class="ops-module__content">
    <!-- 软件包（默认页面） -->
    <div v-if="activeView === 'packages'" class="view-container">
      <div class="view-card">
        <SoftwareHome ref="softwareHomeRef" />
      </div>
    </div>

    <!-- 仓库 -->
    <div v-else-if="activeView === 'repos'" class="view-container">
      <div class="view-card">
        <RepoManagement ref="repoManagementRef" />
      </div>
    </div>

    <!-- 已安装软件包 -->
    <div v-else-if="activeView === 'installed'" class="view-container">
      <div class="view-card">
        <InstalledPackages ref="installedPackagesRef" />
      </div>
    </div>

    <!-- 本地安装 -->
    <div v-else-if="activeView === 'localInstall'" class="view-container">
      <div class="view-card">
        <LocalInstall ref="localInstallRef" />
      </div>
    </div>

    <!-- 日志报告 -->
    <div v-else-if="activeView === 'logs'" class="view-container">
      <div class="view-card">
        <LogReport ref="logReportRef" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import SoftwareHome from './SoftwareHome.vue'
import RepoManagement from './RepoManagement.vue'
import InstalledPackages from './InstalledPackages.vue'
import LocalInstall from './LocalInstall.vue'
import LogReport from './LogReport.vue'

const route = useRoute()

// 当前视图
const activeView = ref('packages')

// 子组件引用
const softwareHomeRef = ref(null)
const repoManagementRef = ref(null)
const installedPackagesRef = ref(null)
const localInstallRef = ref(null)
const logReportRef = ref(null)

/**
 * 解析路由路径，确定当前视图
 */
function parseRouteView() {
  const path = route.path
  const params = route.params
  const pathMatch = Array.isArray(params.pathMatch)
    ? params.pathMatch.join('/')
    : params.pathMatch || ''

  if (path.includes('/repos') || pathMatch.includes('repos')) {
    return 'repos'
  }
  if (path.includes('/installed') || pathMatch.includes('installed')) {
    return 'installed'
  }
  if (path.includes('/localInstall') || pathMatch.includes('localInstall')) {
    return 'localInstall'
  }
  if (path.includes('/logs') || pathMatch.includes('logs')) {
    return 'logs'
  }
  if (path.includes('/packages') || pathMatch.includes('packages')) {
    return 'packages'
  }

  return 'packages'
}

// 监听路由变化
watch(
  () => route.path,
  () => {
    activeView.value = parseRouteView()
  },
  { immediate: true }
)

onMounted(() => {
  activeView.value = parseRouteView()
})
</script>

<style scoped lang="scss">
.ops-module__content {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

// 软件模块特定样式
.view-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.view-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
</style>
