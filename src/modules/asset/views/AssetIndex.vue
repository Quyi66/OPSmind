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
import { provide, computed } from 'vue'
import { useRouter } from 'vue-router'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'
import ModuleSideMenu from '@/modules/shared/components/ModuleSideMenu.vue'
import { MENU_CONFIG } from '@/config/menu.config.js'
import { getGroupMenuConfig } from '@/config/module-nav.config.js'

const router = useRouter()

const moduleTitle = '资产管理'
const moduleDescription = ''

// 获取"资产管理"分组下的所有模块菜单（当前只有资产一个模块）
const menuGroups = computed(() => getGroupMenuConfig('asset-management', MENU_CONFIG))

// 默认展开资产菜单
const defaultOpeneds = ['acm']

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
// 样式已统一至公共样式文件
</style>
