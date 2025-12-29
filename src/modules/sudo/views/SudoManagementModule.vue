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
      />

      <section class="ops-module__content">
        <router-view />
      </section>
    </div>
  </ModulePageLayout>
</template>

<script setup>
import { computed } from 'vue'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'
import ModuleSideMenu from '@/modules/shared/components/ModuleSideMenu.vue'
import { MENU_CONFIG } from '@/config/menu.config.js'
import { getGroupMenuConfig } from '@/config/module-nav.config.js'

const moduleTitle = 'sudo权限管理'
const moduleDescription = ''

// 获取"用户管理"分组下的所有模块菜单（用户、流程、sudo权限、密码）
const menuGroups = computed(() => getGroupMenuConfig('user-management', MENU_CONFIG))

// 默认展开sudo菜单
const defaultOpeneds = ['sudo']
</script>

<style scoped lang="scss">
// 样式已统一至公共样式文件
</style>
