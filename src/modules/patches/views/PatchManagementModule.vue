<template>
  <div class="ops-module__content">
    <router-view />

    <!-- 安装补丁对话框 -->
    <InstallPatchDialog
      v-model:visible="installDialogVisible"
      :patches="selectedPatches"
      @success="handleInstallSuccess"
    />
  </div>
</template>

<script setup>
import { ref, provide, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import InstallPatchDialog from '../components/dialogs/InstallPatchDialog.vue'

const router = useRouter()

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

// 当前检测到的平台
const currentPlatform = ref(detectPlatform())

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
.ops-module__content {
  flex: 1;
  overflow: auto;
  min-height: 0;
}
</style>
