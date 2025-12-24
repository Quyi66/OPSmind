<template>
  <ModulePageLayout
    :title="moduleTitle"
    :description="moduleDescription"
    :hide-header="true"
  >
    <!-- 管理员面板模式 -->
    <AdminPanelView v-if="showAdminPanel" @back="showAdminPanel = false" />

    <!-- 普通模式 -->
    <div v-else class="password-module">
      <aside class="ops-sidebar-nav ops-sidebar-nav--narrow">
        <router-link
          v-for="item in navItems"
          :key="item.key"
          :to="item.path"
          class="ops-sidebar-item"
          :class="{ 'is-active': isActiveRoute(item.key) }"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </router-link>
      </aside>

      <section class="password-module__content">
        <router-view />
      </section>
    </div>
  </ModulePageLayout>
</template>

<script setup>
import { ref, provide } from 'vue'
import { useRoute } from 'vue-router'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'
import AdminPanelView from '../components/AdminPanelView.vue'

const route = useRoute()

const moduleTitle = '密码管理'
const moduleDescription = ''

const showAdminPanel = ref(false)

const navItems = [
  { key: 'application', label: '申请审批', icon: 'fa fa-clipboard-check', path: '/password/application' },
  { key: 'settings', label: '参数配置', icon: 'fa fa-cog', path: '/password/settings' },
  { key: 'logs', label: '操作记录', icon: 'fa fa-history', path: '/password/logs' }
]

function isActiveRoute(key) {
  return route.path.includes(`/password/${key}`)
}

// 提供打开管理员面板方法给子组件使用
function goToAdminPanel() {
  showAdminPanel.value = true
}

provide('goToAdminPanel', goToAdminPanel)
</script>

<style scoped lang="scss">
.password-module {
  height: 100%;
  display: flex;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.password-module__content {
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
  }
}

a.ops-sidebar-item {
  text-decoration: none;
  color: inherit;
}
</style>
