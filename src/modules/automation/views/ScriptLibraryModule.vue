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

const moduleTitle = '文件服务'
const moduleDescription = ''

// 获取"自动化管理"分组下的所有模块菜单（作业、脚本、命令）
const menuGroups = computed(() => getGroupMenuConfig('automation', MENU_CONFIG))

// 默认展开脚本菜单
const defaultOpeneds = ['gfs']
</script>

<style scoped lang="scss">
// 样式已统一至公共样式文件
</style>
