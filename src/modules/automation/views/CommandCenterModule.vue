<template>
  <ModulePageLayout
    :title="moduleTitle"
    :description="moduleDescription"
  >
    <div class="cmd-module">
      <aside class="cmd-module__nav">
        <div
          v-for="item in navItems"
          :key="item.key"
          class="nav-item"
          :class="{ 'is-active': activeView === item.key }"
          @click="handleNavClick(item)"
        >
          <i :class="item.icon" />
          <span>{{ item.label }}</span>
        </div>
      </aside>

      <section class="cmd-module__content">
        <!-- 命令列表 -->
        <div v-if="activeView === 'commandList'" class="view-container">
          <div class="view-card">
            <CommandList
              ref="commandListRef"
              @run-command="handleRunCommand"
              @create-job="handleCreateJob"
            />
          </div>
        </div>

        <!-- 命令作业 -->
        <div v-else-if="activeView === 'commandJob'" class="view-container">
          <div class="view-card">
            <CommandJobList
              ref="commandJobRef"
              job-type="command"
            />
          </div>
        </div>

        <!-- 命令审核 -->
        <div v-else-if="activeView === 'commandReview'" class="view-container">
          <div class="view-card">
            <CommandApproveList ref="commandApproveRef" />
          </div>
        </div>

        <!-- 日志 -->
        <div v-else-if="activeView === 'logs'" class="view-container">
          <div class="view-card">
            <CommandLogs ref="commandLogsRef" />
          </div>
        </div>

        <!-- Console（仅管理员） -->
        <div v-else-if="activeView === 'console'" class="view-container">
          <div class="view-card">
            <CommandConsole ref="commandConsoleRef" @back="activeView = 'commandList'" />
          </div>
        </div>

        <!-- 欢迎页 -->
        <div v-else class="welcome-view">
          <div class="feature-cards">
            <div
              class="feature-card"
              @click="activeView = 'commandList'"
            >
              <div class="feature-card__icon">
                <i class="fas fa-terminal fa-3x" />
              </div>
              <div class="feature-card__body">
                <h3>命令列表</h3>
                <p>管理和维护可复用的命令模板，支持多种脚本类型。</p>
              </div>
            </div>

            <div
              class="feature-card"
              @click="activeView = 'commandJob'"
            >
              <div class="feature-card__icon">
                <i class="fas fa-tasks fa-3x" />
              </div>
              <div class="feature-card__body">
                <h3>命令作业</h3>
                <p>将命令组织成可重复执行的作业，支持批量主机操作。</p>
              </div>
            </div>
          </div>
        </div>
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
import { ref } from 'vue'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'
import CommandList from '@/modules/automation/components/command/CommandList.vue'
import CommandJobList from '@/modules/automation/components/command/CommandJobList.vue'
import CommandApproveList from '@/modules/automation/components/command/CommandApproveList.vue'
import CommandLogs from '@/modules/automation/components/command/CommandLogs.vue'
import CommandConsole from '@/modules/automation/components/command/CommandConsole.vue'
import RunCommandDialog from '@/modules/automation/components/command/dialogs/RunCommandDialog.vue'

// 导航项配置
const navItems = [
  { key: 'commandList', label: '命令列表', icon: 'fas fa-list' },
  { key: 'commandJob', label: '命令作业', icon: 'fas fa-tasks' },
  { key: 'commandReview', label: '命令审核', icon: 'fas fa-clipboard-check' },
  { key: 'logs', label: '日志', icon: 'fas fa-file-alt' },
  { key: 'console', label: 'Console', icon: 'fas fa-terminal', adminOnly: true }
]

// 当前激活的视图
const activeView = ref('commandList')

// 组件引用
const commandListRef = ref(null)
const commandJobRef = ref(null)
const commandApproveRef = ref(null)
const commandLogsRef = ref(null)
const commandConsoleRef = ref(null)

// 执行命令对话框状态
const runCommandDialogVisible = ref(false)
const selectedCommand = ref(null)
const runCommandMode = ref('run') // 'run' 或 'createJob'

// 处理导航点击
function handleNavClick(item) {
  // TODO: 检查 adminOnly 权限
  activeView.value = item.key
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
  if (runCommandMode.value === 'createJob' && commandJobRef.value?.refresh) {
    commandJobRef.value.refresh()
  }
  // 如果是执行命令，可以跳转到日志页面
  if (runCommandMode.value === 'run') {
    activeView.value = 'logs'
  }
}

// 模块信息
const moduleTitle = '命令管理'
const moduleDescription = '管理和执行命令，支持作业编排'

// 暴露方法供外部调用
defineExpose({
  activeView,
  commandListRef,
  commandJobRef
})
</script>

<style scoped lang="scss">
.cmd-module {
  display: grid;
  grid-template-columns: 140px 1fr;
  min-height: 600px;
  height: 100%;
}

.cmd-module__nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 8px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.3);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 8px;
  border-radius: 10px;
  color: #334155;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
  font-size: 13px;
}

.nav-item i {
  width: 18px;
  text-align: center;
}

.nav-item:hover {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}

.nav-item.is-active {
  background-color: rgba(173, 181, 189, 0.25);
  color: #1e40af;
}

.cmd-module__content {
  min-height: 100%;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.view-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.view-card {
  flex: 1;
  min-height: 0;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.welcome-view {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #f8fafc;
  padding: 40px;
}

.feature-cards {
  display: flex;
  gap: 24px;
}

.feature-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  width: 280px;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.feature-card__icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 20px;
  color: #fff;
  margin-bottom: 20px;
}

.feature-card__body {
  text-align: center;
}

.feature-card__body h3 {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.feature-card__body p {
  margin: 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
}

@media (max-width: 1024px) {
  .cmd-module {
    grid-template-columns: 1fr;
  }

  .cmd-module__nav {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }

  .nav-item {
    flex: 1 0 100px;
  }

  .feature-cards {
    flex-direction: column;
  }

  .feature-card {
    width: 100%;
    max-width: 320px;
  }
}
</style>
