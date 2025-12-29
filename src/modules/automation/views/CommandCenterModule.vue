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

    <!-- 执行命令对话框 -->
    <RunCommandDialog
      v-model:visible="runCommandDialogVisible"
      :command="selectedCommand"
      :mode="runCommandMode"
      @success="handleRunSuccess"
    />
  </ModulePageLayout>
</template>

<script setup>
import { ref, provide, computed } from 'vue'
import { useRouter } from 'vue-router'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'
import ModuleSideMenu from '@/modules/shared/components/ModuleSideMenu.vue'
import RunCommandDialog from '@/modules/automation/components/command/dialogs/RunCommandDialog.vue'
import { MENU_CONFIG } from '@/config/menu.config.js'
import { getGroupMenuConfig } from '@/config/module-nav.config.js'

const router = useRouter()

const moduleTitle = '命令管理'
const moduleDescription = ''

// 获取"自动化管理"分组下的所有模块菜单（作业、脚本、命令）
const menuGroups = computed(() => getGroupMenuConfig('automation', MENU_CONFIG))

// 默认展开命令菜单
const defaultOpeneds = ['cmd']

// 执行命令对话框状态
const runCommandDialogVisible = ref(false)
const selectedCommand = ref(null)
const runCommandMode = ref('run')

// 执行命令
function handleRunCommand(command) {
  selectedCommand.value = command
  runCommandMode.value = 'run'
  runCommandDialogVisible.value = true
}

// 创建作业
function handleCreateJob(command) {
  selectedCommand.value = command
  runCommandMode.value = 'createJob'
  runCommandDialogVisible.value = true
}

// 执行成功回调
function handleRunSuccess(result) {
  if (runCommandMode.value === 'run') {
    router.push('/cmd/logs')
  }
}

// 提供给子组件使用
provide('handleRunCommand', handleRunCommand)
provide('handleCreateJob', handleCreateJob)

defineExpose({
  handleRunCommand,
  handleCreateJob
})
</script>

<style scoped lang="scss">
// 样式已统一至公共样式文件
</style>
