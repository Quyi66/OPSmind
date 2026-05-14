<template>
  <div class="ops-module__content">
    <router-view />

    <!-- 执行命令对话框 -->
    <RunCommandDialog
      v-model:visible="runCommandDialogVisible"
      :command="selectedCommand"
      :mode="runCommandMode"
      @success="handleRunSuccess"
    />
  </div>
</template>

<script setup>
import { ref, provide } from 'vue'
import { useRouter } from 'vue-router'
import RunCommandDialog from '@/modules/automation/components/command/dialogs/RunCommandDialog.vue'

const router = useRouter()

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
  overflow: auto;
  min-height: 0;
}
</style>
