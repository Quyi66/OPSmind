<template>
  <ModulePageLayout
    :title="moduleTitle"
    :description="moduleDescription"
    :hide-header="true"
  >
    <div class="user-module">
      <aside class="ops-sidebar-nav ops-sidebar-nav--narrow">
        <div
          v-for="item in navItems"
          :key="item.key"
          class="ops-sidebar-item"
          :class="{ 'is-active': activeView === item.key }"
          @click="setActiveView(item.key)"
        >
          <i :class="['fa', item.icon]"></i>
          <span>{{ item.label }}</span>
        </div>
      </aside>

      <section class="user-module__content">
        <OverviewView v-if="activeView === 'overview'" @navigate="handleNavigate" />
        <UsersView v-else-if="activeView === 'users'" />
        <UserGroupsView v-else-if="activeView === 'groups'" />
        <OperationLogsView v-else-if="activeView === 'logs'" />
        <FeatureConfigView v-else-if="activeView === 'config'" />
      </section>
    </div>
  </ModulePageLayout>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'
import OverviewView from '@/modules/user/components/overview/OverviewView.vue'
import UsersView from '@/modules/user/components/users/UsersView.vue'
import UserGroupsView from '@/modules/user/components/groups/UserGroupsView.vue'
import OperationLogsView from '@/modules/user/components/operation/OperationLogsView.vue'
import FeatureConfigView from '@/modules/user/components/config/FeatureConfigView.vue'

const route = useRoute()
const router = useRouter()

const moduleTitle = '用户管理'
const moduleDescription = '管理系统用户、用户组及相关配置'

const navItems = [
  { key: 'overview', label: '总览', icon: 'fa-tachometer-alt' },
  { key: 'users', label: '用户', icon: 'fa-user' },
  { key: 'groups', label: '用户组', icon: 'fa-users' },
  { key: 'logs', label: '操作记录', icon: 'fa-history' },
  { key: 'config', label: '功能配置', icon: 'fa-cog' }
]

// 子视图键列表（不包含 overview，因为 overview 是默认值）
const subViews = ['users', 'groups', 'logs', 'config']

// 默认显示总览
const activeView = ref('overview')

// 获取基础路径（模块入口路径）
function getBasePath() {
  const path = route.path || ''
  // 获取第一个路径段
  const match = path.match(/^\/([^/]+)/)
  return match ? `/${match[1]}` : '/users'
}

// 解析当前应该显示的视图
function parseCurrentView() {
  const path = route.path || ''
  const basePath = getBasePath()

  // 如果就是基础路径，显示总览
  if (path === basePath || path === basePath + '/') {
    return 'overview'
  }

  // 获取基础路径之后的部分
  const subPath = path.slice(basePath.length).replace(/^\//, '')

  // 检查是否匹配子视图
  if (subViews.includes(subPath)) {
    return subPath
  }

  // 也检查 pathMatch 参数
  const params = route.params || {}
  const pathMatch = Array.isArray(params.pathMatch)
    ? params.pathMatch
    : params.pathMatch ? [params.pathMatch] : []

  for (const seg of pathMatch) {
    if (subViews.includes(seg)) {
      return seg
    }
  }

  // 默认总览
  return 'overview'
}

// 设置当前视图
function setActiveView(viewKey) {
  console.log('setActiveView called with:', viewKey, 'current:', activeView.value)

  activeView.value = viewKey

  // 更新 URL
  const basePath = getBasePath()
  const targetPath = viewKey === 'overview' ? basePath : `${basePath}/${viewKey}`

  console.log('Navigating to:', targetPath)

  if (route.path !== targetPath) {
    router.replace(targetPath).catch(err => {
      console.warn('Router replace failed:', err)
    })
  }
}

// OverviewView 发来的导航事件
function handleNavigate({ view }) {
  if (view) {
    setActiveView(view)
  }
}

// 监听路由变化，同步视图
watch(
  () => route.path,
  (newPath) => {
    console.log('Route changed to:', newPath)
    const parsed = parseCurrentView()
    console.log('Parsed view:', parsed)
    if (parsed !== activeView.value) {
      activeView.value = parsed
    }
  }
)

// 初始化
onMounted(() => {
  const initialView = parseCurrentView()
  console.log('Initial view:', initialView)
  activeView.value = initialView
})
</script>

<style scoped lang="scss">
@use '../styles/common.scss' as *;
</style>
