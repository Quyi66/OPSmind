<template>
  <ModulePageLayout
    :title="moduleTitle"
    :description="moduleDescription"
    :hide-header="true"
  >
    <!-- 管理员面板模式 -->
    <AdminPanelView v-if="showAdminPanel" @back="showAdminPanel = false" />

    <!-- 普通模式 -->
    <div v-else class="ops-module ops-module--with-sidebar">
      <ModuleSideMenu
        :menu-groups="menuGroups"
        :default-openeds="defaultOpeneds"
      />

      <section class="ops-module__content">
        <router-view />
      </section>
    </div>
  </ModulePageLayout>
</template>

<script setup>
import { ref, provide, computed } from 'vue'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'
import ModuleSideMenu from '@/modules/shared/components/ModuleSideMenu.vue'
import AdminPanelView from '../components/AdminPanelView.vue'
import { MENU_CONFIG } from '@/config/menu.config.js'
import { getGroupMenuConfig } from '@/config/module-nav.config.js'

const moduleTitle = '密码管理'
const moduleDescription = ''

const showAdminPanel = ref(false)

// 获取"用户管理"分组下的所有模块菜单（用户、流程、sudo权限、密码）
const menuGroups = computed(() => getGroupMenuConfig('user-management', MENU_CONFIG))

// 默认展开密码菜单
const defaultOpeneds = ['password']

// 提供打开管理员面板方法给子组件使用
function goToAdminPanel() {
  showAdminPanel.value = true
}

provide('goToAdminPanel', goToAdminPanel)
</script>

<style scoped lang="scss">
// 样式已统一至公共样式文件
</style>
