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
import { ref, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'
import RunCommandDialog from '@/modules/automation/components/command/dialogs/RunCommandDialog.vue'

const route = useRoute()
const router = useRouter()

const moduleTitle = '命令管理'
const moduleDescription = ''

const navItems = [
  { key: 'list', label: '命令列表', icon: 'fas fa-list', path: '/cmd/list' },
  { key: 'job', label: '命令作业', icon: 'fas fa-tasks', path: '/cmd/job' },
  { key: 'review', label: '命令审核', icon: 'fas fa-clipboard-check', path: '/cmd/review' },
  { key: 'logs', label: '运行记录', icon: 'fas fa-file-alt', path: '/cmd/logs' },
  { key: 'console', label: 'Console', icon: 'fas fa-terminal', path: '/cmd/console' }
]

function isActiveRoute(key) {
  return route.path.includes(`/cmd/${key}`)
}

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
// 样式已统一至 opsmind.scss
</style>

