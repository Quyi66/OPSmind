<template>
  <ModulePageLayout
    :title="moduleTitle"
    :description="moduleDescription"
    :hide-header="true"
  >
    <div class="ops-module">
      <aside class="ops-sidebar-nav ops-sidebar-nav--narrow">
        <div
          v-for="item in navItems"
          :key="item.key"
          class="ops-sidebar-item"
          :class="{ 'is-active': activeView === item.key }"
          @click="handleNavClick(item)"
        >
          <i :class="item.icon" />
          <span>{{ item.label }}</span>
        </div>
      </aside>

      <section class="ops-module__content">
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
      </section>
    </div>
  </ModulePageLayout>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'
import SoftwareHome from './SoftwareHome.vue'
import RepoManagement from './RepoManagement.vue'
import LocalInstall from './LocalInstall.vue'
import LogReport from './LogReport.vue'

const route = useRoute()
const router = useRouter()

// 模块信息
const moduleTitle = '软件管理'
const moduleDescription = ''

// 当前视图
const activeView = ref('packages')

// 导航项（与源系统一致）
const navItems = [
  { key: 'packages', label: '软件包', icon: 'fa fa-cube' },
  { key: 'repos', label: '仓库', icon: 'fa fa-database' },
  { key: 'localInstall', label: '本地安装', icon: 'fa fa-map-marker' },
  { key: 'logs', label: '日志报告', icon: 'fa fa-file-text-o' }
]

// 子组件引用
const softwareHomeRef = ref(null)
const repoManagementRef = ref(null)
const localInstallRef = ref(null)
const logReportRef = ref(null)

// 获取当前模块的基础路径
function getBasePath() {
  const path = route.path
  const match = path.match(/^\/([^/]+)/)
  return match ? `/${match[1]}` : '/software'
}

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

// 导航点击
function handleNavClick(item) {
  activeView.value = item.key
  const basePath = getBasePath()
  const targetPath = item.key === 'packages' ? basePath : `${basePath}/${item.key}`
  router.push(targetPath)
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
// 样式已统一至 opsmind.scss

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

