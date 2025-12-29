<template>
  <div class="settings-module ops-module--with-sidebar">
    <ModuleSideMenu
      :menu-groups="menuGroups"
      :default-openeds="defaultOpeneds"
    />

    <!-- 右侧内容区 -->
    <section class="settings-content">
      <router-view />
    </section>
  </div>
</template>

<script setup>
import ModuleSideMenu from '@/modules/shared/components/ModuleSideMenu.vue'
import { SSC_NAV_ITEMS } from '@/config/module-nav.config.js'

const defaultOpeneds = ['ssc']

// 系统设置是独立模块，不属于任何分组，直接使用SSC_NAV_ITEMS
const menuGroups = [
  {
    code: 'ssc',
    name: '系统管理',
    icon: 'fas fa-cog',
    children: SSC_NAV_ITEMS
  }
]
</script>

<style scoped lang="scss">
.settings-module {
  display: flex;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

// 右侧内容区
.settings-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  background: #fff;

  :deep(> *) {
    height: 100%;
  }
}
</style>
