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

    <!-- 安装补丁对话框 -->
    <InstallPatchDialog
      v-model:visible="installDialogVisible"
      :patches="selectedPatches"
      @success="handleInstallSuccess"
    />
  </ModulePageLayout>
</template>

<script setup>
import { ref, provide, computed } from 'vue'
import { useRouter } from 'vue-router'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'
import ModuleSideMenu from '@/modules/shared/components/ModuleSideMenu.vue'
import InstallPatchDialog from '../components/dialogs/InstallPatchDialog.vue'
import { MENU_CONFIG } from '@/config/menu.config.js'
import { getGroupMenuConfig } from '@/config/module-nav.config.js'

const router = useRouter()

const moduleTitle = '补丁管理'
const moduleDescription = ''

// 获取"补丁漏洞"分组下的所有模块菜单（补丁、软件）
const menuGroups = computed(() => getGroupMenuConfig('patch-testing', MENU_CONFIG))

// 默认展开补丁菜单
const defaultOpeneds = ['patches']

// 安装对话框状态
const installDialogVisible = ref(false)
const selectedPatches = ref([])

// 处理安装补丁
function handleInstallPatch(patches) {
  selectedPatches.value = patches
  installDialogVisible.value = true
}

// 安装成功回调
function handleInstallSuccess() {
  router.push('/patches/logs')
}

// 处理导航事件
function handleNavigate(nav) {
  console.log('Navigate to:', nav)
}

// 提供给子组件使用
provide('handleInstallPatch', handleInstallPatch)
provide('handleNavigate', handleNavigate)

defineExpose({
  handleInstallPatch
})
</script>

<style scoped lang="scss">
// 样式已统一至公共样式文件
</style>
