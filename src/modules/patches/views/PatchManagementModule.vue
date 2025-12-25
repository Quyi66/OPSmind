<template>
  <ModulePageLayout
    :title="moduleTitle"
    :description="moduleDescription"
    :hide-header="true"
  >
    <div class="ops-module">
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
import { ref, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'
import InstallPatchDialog from '../components/dialogs/InstallPatchDialog.vue'

const route = useRoute()
const router = useRouter()

const moduleTitle = '补丁管理'
const moduleDescription = ''

const navItems = [
  { key: 'linuxPatchScan', label: 'Linux补丁扫描', icon: 'fas fa-search', path: '/patches/linuxPatchScan' },
  { key: 'linuxPatchInstall', label: 'Linux补丁安装', icon: 'fas fa-download', path: '/patches/linuxPatchInstall' },
  { key: 'linuxPatchRollback', label: 'Linux补丁回退', icon: 'fas fa-undo', path: '/patches/linuxPatchRollback' },
  { key: 'linuxYumManage', label: 'LinuxYUM管理', icon: 'fas fa-cogs', path: '/patches/linuxYumManage' },
  { key: 'linuxPatchLibrary', label: 'Linux补丁仓库', icon: 'fas fa-database', path: '/patches/linuxPatchLibrary' },
  { key: 'linuxVulnerability', label: 'Linux漏洞概览', icon: 'fas fa-shield-alt', path: '/patches/linuxVulnerability' },
  { key: 'windowsVulnerability', label: 'Windows漏洞', icon: 'fab fa-windows', path: '/patches/windowsVulnerability' },
  { key: 'windowsUpdate', label: 'Windows更新', icon: 'fas fa-sync', path: '/patches/windowsUpdate' },
  { key: 'windowsRollback', label: 'Windows回滚', icon: 'fas fa-history', path: '/patches/windowsRollback' },
  { key: 'windowsView', label: 'Windows View', icon: 'fas fa-desktop', path: '/patches/windowsView' },
  { key: 'logs', label: '操作日志报告', icon: 'fas fa-file-alt', path: '/patches/logs' }
]

function isActiveRoute(key) {
  return route.path.includes(`/patches/${key}`)
}

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
// 样式已统一至 opsmind.scss
</style>

