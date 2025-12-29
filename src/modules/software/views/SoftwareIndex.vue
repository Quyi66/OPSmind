<template>
  <ModulePageLayout
    :title="moduleTitle"
    :description="moduleDescription"
    :hide-header="true"
  >
    <div class="ops-module ops-module--with-sidebar">
      <ModuleSideMenu
        :menu-groups="menuGroups"
        :default-openeds="defaultOpeneds"
        @select="handleMenuSelect"
      />

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
import { ref, watch, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'
import ModuleSideMenu from '@/modules/shared/components/ModuleSideMenu.vue'
import SoftwareHome from './SoftwareHome.vue'
import RepoManagement from './RepoManagement.vue'
import LocalInstall from './LocalInstall.vue'
import LogReport from './LogReport.vue'
import { MENU_CONFIG } from '@/config/menu.config.js'
import { getGroupMenuConfig } from '@/config/module-nav.config.js'

const route = useRoute()
const router = useRouter()

// 模块信息
const moduleTitle = '软件管理'
const moduleDescription = ''

// 获取"补丁漏洞"分组下的所有模块菜单（补丁、软件）
const menuGroups = computed(() => getGroupMenuConfig('patch-testing', MENU_CONFIG))

// 默认展开软件菜单
const defaultOpeneds = ['software']

// 当前视图
const activeView = ref('packages')

// 子组件引用
const softwareHomeRef = ref(null)
const repoManagementRef = ref(null)
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

// 菜单选择处理
function handleMenuSelect(item) {
  activeView.value = item.key
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
