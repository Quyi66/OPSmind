<template>
  <ModulePageLayout
    :title="moduleTitle"
    :description="moduleDescription"
    :hide-header="true"
  >
    <div class="asset-module">
      <aside class="ops-sidebar-nav ops-sidebar-nav--narrow">
        <router-link
          v-for="item in navItems"
          :key="item.key"
          :to="item.path"
          class="ops-sidebar-item"
          :class="{ 'is-active': isActiveRoute(item.key) }"
        >
          <i :class="item.icon" />
          <span>{{ item.label }}</span>
        </router-link>
      </aside>

      <section class="asset-module__content">
        <router-view />
      </section>
    </div>
  </ModulePageLayout>
</template>

<script setup>
import { provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'

const route = useRoute()
const router = useRouter()

const moduleTitle = '资产管理'
const moduleDescription = ''

const navItems = [
  { key: 'overview', label: '资产总览', icon: 'fad fa-fw fa-chart-pie', path: '/acm/overview' },
  { key: 'info', label: '资产信息', icon: 'fad fa-fw fa-server', path: '/acm/info' },
  { key: 'data', label: '数据管理', icon: 'fad fa-fw fa-database', path: '/acm/data' },
  { key: 'model', label: '资产模型', icon: 'fad fa-fw fa-project-diagram', path: '/acm/model' },
  { key: 'exception', label: '异常设备', icon: 'fad fa-fw fa-exclamation-triangle', path: '/acm/exception' },
  { key: 'automation', label: '自动化配置', icon: 'fad fa-fw fa-cogs', path: '/acm/automation' },
  { key: 'permission', label: '资源权限', icon: 'fad fa-fw fa-user-lock', path: '/acm/permission' },
  { key: 'log', label: '操作记录', icon: 'fad fa-fw fa-history', path: '/acm/log' }
]

function isActiveRoute(key) {
  return route.path.includes(`/acm/${key}`)
}

// 处理编辑模型
function handleEditModel(modelId) {
  router.push({
    path: '/acm/model',
    query: { editor: 'model', modelId }
  })
}

// 处理查看资产类型
function handleViewAssetType(assetTypeCode) {
  router.push({
    path: '/acm/info',
    query: { type: assetTypeCode }
  })
}

// 提供给子组件使用
provide('handleEditModel', handleEditModel)
provide('handleViewAssetType', handleViewAssetType)
</script>

<style scoped lang="scss">
.asset-module {
  display: flex;
  height: 100%;
  min-height: 0;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.asset-module__content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  padding: 16px;

  :deep(> *) {
    flex: 1;
    min-height: 0;
    height: 100%;
  }
}

a.ops-sidebar-item {
  text-decoration: none;
  color: inherit;
}

@media (max-width: 1024px) {
  .asset-module {
    flex-direction: column;
  }
}
</style>
