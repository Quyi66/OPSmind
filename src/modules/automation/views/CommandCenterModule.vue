<template>
  <div class="ops-module__content">
    <div class="ops-page-layout">
      <el-tabs
      v-if="showWorkspaceTabs"
      :model-value="activeWorkspaceName"
      class="command-center-tabs"
      @tab-change="handleWorkspaceChange"
    >
      <el-tab-pane
        v-for="tab in workspaceTabs"
        :key="tab.name"
        :label="tab.label"
        :name="tab.name"
      >
        <div class="command-center-tab-pane">
          <component
            v-if="shouldRenderWorkspaceTab(tab.name)"
            :is="workspaceViewMap[tab.name]"
            v-show="activeWorkspaceName === tab.name"
            class="command-center-tab-page"
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <div v-else class="ops-module__view">
      <router-view v-slot="{ Component, route: currentRoute }">
        <transition name="fade-content" mode="out-in">
          <component
            :is="Component"
            :key="String(currentRoute.name || currentRoute.path)"
          />
        </transition>
      </router-view>
    </div>

    <!-- 执行命令对话框 -->
    <RunCommandDialog
      v-model:visible="runCommandDialogVisible"
      :command="selectedCommand"
      :mode="runCommandMode"
      @success="handleRunSuccess"
    />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, provide, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RunCommandDialog from '@/modules/automation/components/command/dialogs/RunCommandDialog.vue'
import CommandListPage from '@/modules/automation/views/command/CommandListPage.vue'
import CommandJobPage from '@/modules/automation/views/command/CommandJobPage.vue'

const router = useRouter()
const route = useRoute()

const workspaceTabs = [
  {
    name: 'list',
    label: '命令列表',
    to: {
      path: '/cmd/list'
    }
  },
  {
    name: 'job',
    label: '命令作业',
    to: {
      path: '/cmd/list',
      query: {
        tab: 'job'
      }
    }
  }
]

const workspaceViewMap = {
  list: CommandListPage,
  job: CommandJobPage
}

const showWorkspaceTabs = computed(() => String(route.name || '') === 'cmd-list')

const activeWorkspaceName = computed(() => (resolveTabQuery(route.query.tab) === 'job' ? 'job' : 'list'))

const renderedWorkspaceTabs = ref([activeWorkspaceName.value])

// 执行命令对话框状态
const runCommandDialogVisible = ref(false)
const selectedCommand = ref(null)
const runCommandMode = ref('run')

watch(
  activeWorkspaceName,
  (name) => {
    if (!renderedWorkspaceTabs.value.includes(name)) {
      renderedWorkspaceTabs.value = [...renderedWorkspaceTabs.value, name]
    }
  },
  { immediate: true }
)

function shouldRenderWorkspaceTab(name) {
  return renderedWorkspaceTabs.value.includes(name)
}

function resolveTabQuery(value) {
  if (Array.isArray(value)) {
    return value[0] || ''
  }

  return value || ''
}

function handleWorkspaceChange(name) {
  const targetTab = workspaceTabs.find(tab => tab.name === name)
  if (!targetTab) {
    return
  }

  const nextTab = targetTab.name === 'job' ? 'job' : ''
  const currentTab = resolveTabQuery(route.query.tab)

  if (currentTab === nextTab) {
    return
  }

  if (targetTab.name === 'job') {
    router.replace(targetTab.to)
    return
  }

  const nextQuery = { ...route.query }
  delete nextQuery.tab
  router.replace({
    path: '/cmd/list',
    query: nextQuery
  })
}

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
    router.push('/run-records/logs')
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
.ops-module__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  min-height: 0;
  width: 100%;
  max-width: 100%;
  background: var(--el-bg-color);
  border-radius: 12px;
  overflow: hidden;
}

.ops-module__content > .ops-page-layout {
  flex: 1;
  min-height: 0;
  min-width: 0;
}

.command-center-tabs {
  flex-shrink: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  background: var(--el-bg-color);
}

:deep(.command-center-tabs .el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

:deep(.command-center-tabs .el-tab-pane) {
  height: 100%;
}

.command-center-tab-pane,
.ops-module__view {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.command-center-tab-page {
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
}

:deep(.command-center-tabs .el-tabs__header) {
  margin: 0;
}

:deep(.fade-content-enter-active),
:deep(.fade-content-leave-active) {
  transition: opacity 0.12s ease;
}

:deep(.fade-content-enter-from),
:deep(.fade-content-leave-to) {
  opacity: 0;
}
</style>
