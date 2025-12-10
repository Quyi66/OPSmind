<template>
  <ModulePageLayout
    :title="moduleTitle"
    :description="moduleDescription"
    :hide-header="isDesignMode || isHistoryMode"
  >
    <!-- 设计器视图（全屏） -->
    <div v-if="isDesignMode" class="design-container">
      <FlowDesignView
        :flow-id="designFlowId"
        :detail-id="designDetailId"
        @back="handleDesignBack"
        @saved="handleDesignSaved"
      />
    </div>

    <!-- 执行视图（全屏） -->
    <div v-else-if="isExecMode" class="exec-container">
      <FlowExecView
        :process-id="execFlowId"
        @back="handleExecBack"
        @executed="handleExecDone"
      />
    </div>

    <!-- 历史版本视图（全屏） -->
    <div v-else-if="isHistoryMode" class="history-container">
      <FlowHistoryView
        :process-id="historyProcessId"
        @back="handleHistoryBack"
        @view-version="handleViewHistoryVersion"
      />
    </div>

    <!-- 常规视图 -->
    <div v-else class="flow-module">
      <aside class="flow-module__nav">
        <div
          v-for="item in navItems"
          :key="item.key"
          class="nav-item"
          :class="{ 'is-active': activeView === item.key }"
          @click="setActiveView(item.key)"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </div>
      </aside>

      <section class="flow-module__content">
        <FlowListView
          v-if="activeView === 'list'"
          @create="handleCreate"
          @design="handleDesign"
          @execute="handleExecute"
          @history="handleHistory"
        />
        <ExecutionListView v-else-if="activeView === 'execution'" />
      </section>
    </div>
  </ModulePageLayout>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'
import FlowListView from '@/modules/flow/components/FlowListView.vue'
import ExecutionListView from '@/modules/flow/components/ExecutionListView.vue'
import FlowDesignView from '@/modules/flow/components/FlowDesignView.vue'
import FlowExecView from '@/modules/flow/components/FlowExecView.vue'
import FlowHistoryView from '@/modules/flow/components/FlowHistoryView.vue'

const route = useRoute()
const router = useRouter()

const moduleTitle = '流程管理'
const moduleDescription = ''

const navItems = [
  { key: 'list', label: '流程列表', icon: 'fa fa-list-alt' },
  { key: 'execution', label: '执行列表', icon: 'fa fa-play-circle' }
]

const subViews = ['list', 'execution']
const activeView = ref('list')

// 设计器模式
const isDesignMode = ref(false)
const designFlowId = ref('')
const designDetailId = ref('')  // 用于查看历史版本时指定版本ID

// 执行模式
const isExecMode = ref(false)
const execFlowId = ref('')

// 历史版本模式
const isHistoryMode = ref(false)
const historyProcessId = ref('')

// 导航历史（用于返回时决定回到哪个页面）
const previousMode = ref('')

function getBasePath() {
  const path = route.path || ''
  const match = path.match(/^\/([^/]+)/)
  return match ? `/${match[1]}` : '/flow'
}

function parseCurrentView() {
  const path = route.path || ''
  const basePath = getBasePath()

  if (path === basePath || path === basePath + '/') {
    return 'list'
  }

  const subPath = path.slice(basePath.length).replace(/^\//, '')

  if (subViews.includes(subPath)) {
    return subPath
  }

  const params = route.params || {}
  const pathMatch = Array.isArray(params.pathMatch)
    ? params.pathMatch
    : params.pathMatch ? [params.pathMatch] : []

  for (const seg of pathMatch) {
    if (subViews.includes(seg)) {
      return seg
    }
  }

  return 'list'
}

function setActiveView(viewKey) {
  activeView.value = viewKey

  const basePath = getBasePath()
  const targetPath = viewKey === 'list' ? basePath : `${basePath}/${viewKey}`

  if (route.path !== targetPath) {
    router.replace(targetPath).catch(() => {})
  }
}

// 创建新流程
function handleCreate() {
  designFlowId.value = ''
  isDesignMode.value = true
}

// 设计现有流程
function handleDesign(flowId) {
  designFlowId.value = flowId
  previousMode.value = 'list'
  isDesignMode.value = true
}

// 返回（从设计视图）
function handleDesignBack() {
  isDesignMode.value = false
  designFlowId.value = ''
  designDetailId.value = ''

  // 根据上一个模式决定返回哪里
  if (previousMode.value === 'history') {
    isHistoryMode.value = true
  }
  previousMode.value = ''
}

// 设计保存成功
function handleDesignSaved() {
  isDesignMode.value = false
  designFlowId.value = ''
  designDetailId.value = ''
  previousMode.value = ''
}

// 执行流程
function handleExecute(flowId) {
  execFlowId.value = flowId
  isExecMode.value = true
}

// 返回列表（从执行视图）
function handleExecBack() {
  isExecMode.value = false
  execFlowId.value = ''
}

// 执行完成
function handleExecDone() {
  isExecMode.value = false
  execFlowId.value = ''
}

// 查看历史版本
function handleHistory(processId) {
  historyProcessId.value = processId
  isHistoryMode.value = true
}

// 返回列表（从历史视图）
function handleHistoryBack() {
  isHistoryMode.value = false
  historyProcessId.value = ''
}

// 从历史版本跳转到设计页查看
function handleViewHistoryVersion(data) {
  // 记住来自历史页面
  previousMode.value = 'history'
  // 使用 processId 和 detailId 打开设计页
  designFlowId.value = data.processId
  designDetailId.value = data.detailId
  isDesignMode.value = true
}

watch(
  () => route.path,
  () => {
    const parsed = parseCurrentView()
    if (parsed !== activeView.value) {
      activeView.value = parsed
    }
  }
)

onMounted(() => {
  activeView.value = parseCurrentView()
})
</script>

<style scoped lang="scss">
.flow-module {
  display: flex;
  height: 100%;
  min-height: 0;
}

.flow-module__nav {
  width: 140px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e2e8f0;
  padding: 8px 0;
  overflow-y: auto;

  .nav-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    cursor: pointer;
    color: #333;
    font-size: 13px;
    transition: all 0.2s;
    position: relative;

    i {
      width: 16px;
      text-align: center;
      color: #666;
    }

    &:hover {
      background: #f5f7fa;
    }

    &.is-active {
      background: #e6f7ff;
      color: #1890ff;

      i {
        color: #1890ff;
      }

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: #1890ff;
      }
    }
  }
}

.flow-module__content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  padding: 16px;

  > * {
    flex: 1;
    min-height: 0;
  }
}

.design-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.exec-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.history-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
