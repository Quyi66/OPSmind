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

const moduleTitle = '系统巡检'
const moduleDescription = ''

// 获取"系统巡检"分组下的所有模块菜单（当前只有巡检一个模块）
const menuGroups = computed(() => getGroupMenuConfig('system-inspection', MENU_CONFIG))

// 默认展开巡检菜单
const defaultOpeneds = ['cac']

/**
 * 处理子组件的导航请求
 */
function handleNavigate(payload) {
  const { view, params } = payload

  if (view === 'results' && params?.templateId) {
    router.push({ path: '/cac/results', query: { templateId: params.templateId } })
  } else if (view === 'structural-diagram' && params?.jobId) {
    router.push(`/cac/structural-diagram/${params.jobId}`)
  } else if (view === 'result-detail' && params?.jobId) {
    router.push(`/cac/results/${params.jobId}`)
  }
}

// 提供给子组件使用
provide('handleNavigate', handleNavigate)
</script>

<style scoped lang="scss">
// 样式已统一至公共样式文件
</style>
