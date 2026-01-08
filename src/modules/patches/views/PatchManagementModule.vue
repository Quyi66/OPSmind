<template>
  <ModulePageLayout
    :title="moduleTitle"
    :description="moduleDescription"
    :hide-header="true"
  >
    <div class="ops-module ops-module--with-sidebar">
      <ModuleSideMenu
        :menu-groups="filteredMenuGroups"
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
import { ref, provide, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'
import ModuleSideMenu from '@/modules/shared/components/ModuleSideMenu.vue'
import InstallPatchDialog from '../components/dialogs/InstallPatchDialog.vue'
import { MENU_CONFIG } from '@/config/menu.config.js'
import { getGroupMenuConfig } from '@/config/module-nav.config.js'
import { authService } from '@/core/auth'

const router = useRouter()

const moduleTitle = '补丁管理'
const moduleDescription = ''

/**
 * 检测当前客户端操作系统类型
 * @returns {'windows' | 'linux'} 操作系统类型
 */
function detectPlatform() {
  const userAgent = navigator.userAgent.toLowerCase()
  const platform = navigator.platform.toLowerCase()

  // 检测 Windows
  if (userAgent.includes('windows') || platform.includes('win')) {
    return 'windows'
  }

  // 检测 Linux (包括 Android 因为它基于 Linux)
  if (userAgent.includes('linux') || platform.includes('linux')) {
    return 'linux'
  }

  // 检测 macOS (归类为类 Unix/Linux)
  if (userAgent.includes('mac') || platform.includes('mac')) {
    return 'linux'
  }

  // 默认返回 Linux
  return 'linux'
}

/**
 * 判断当前用户是否是 admin
 */
function isAdmin() {
  const user = authService.getCurrentUser()
  return user?.name === 'admin' || user?.userId === 'admin' || user?.role === 'admin'
}

// 当前检测到的平台
const currentPlatform = ref(detectPlatform())

// 获取"补丁漏洞"分组下的所有模块菜单（补丁、软件）
const menuGroups = computed(() => getGroupMenuConfig('patch-testing', MENU_CONFIG))

// 根据平台过滤导航菜单（admin 用户显示所有）
const filteredMenuGroups = computed(() => {
  // 如果是 admin 用户，显示所有菜单
  if (isAdmin()) {
    return menuGroups.value
  }

  return menuGroups.value.map(group => {
    // 如果是 patches 模块，根据平台过滤子菜单
    if (group.code === 'patches' && group.children) {
      const filteredChildren = group.children.filter(item => {
        // 如果没有 platform 属性，默认显示
        if (!item.platform) return true
        // common 平台的菜单项始终显示
        if (item.platform === 'common') return true
        // 根据当前平台过滤
        return item.platform === currentPlatform.value
      })
      return { ...group, children: filteredChildren }
    }
    return group
  })
})

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

// 日志输出当前检测到的平台
onMounted(() => {
  console.log('[PatchManagementModule] 检测到的操作系统:', currentPlatform.value)
  console.log('[PatchManagementModule] User Agent:', navigator.userAgent)
})

// 提供给子组件使用
provide('handleInstallPatch', handleInstallPatch)
provide('handleNavigate', handleNavigate)
provide('currentPlatform', currentPlatform)

defineExpose({
  handleInstallPatch
})
</script>

<style scoped lang="scss">
// 样式已统一至公共样式文件
</style>
