<template>
  <ModulePageLayout
    :title="moduleTitle"
    :description="moduleDescription"
    :hide-header="true"
  >
    <!-- 模型编辑器全屏显示 -->
    <div v-if="isModelEditorView" class="model-editor-container">
      <ModelEditor
        :model-id="modelEditorId"
        @back="handleEditorBack"
        @saved="handleEditorSaved"
      />
    </div>

    <!-- 常规模块视图 -->
    <div v-else class="asset-module">
      <aside class="asset-module__nav">
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

      <section class="asset-module__content">
        <!-- 资产总览（默认页面） -->
        <div v-if="activeView === 'overview'" class="view-container">
          <div class="view-card">
            <AssetOverview ref="overviewRef" />
          </div>
        </div>

        <!-- 资产信息 -->
        <div v-else-if="activeView === 'info'" class="view-container">
          <div class="view-card">
            <AssetInfo ref="infoRef" />
          </div>
        </div>

        <!-- 数据管理 -->
        <div v-else-if="activeView === 'data'" class="view-container">
          <div class="view-card">
            <DataManage ref="dataRef" />
          </div>
        </div>

        <!-- 资产模型 -->
        <div v-else-if="activeView === 'model'" class="view-container">
          <div class="view-card">
            <AssetModel ref="modelRef" @edit-model="handleEditModel" />
          </div>
        </div>

        <!-- 异常设备 -->
        <div v-else-if="activeView === 'exception'" class="view-container">
          <div class="view-card">
            <ExceptionDevice ref="exceptionRef" />
          </div>
        </div>

        <!-- 自动化配置 -->
        <div v-else-if="activeView === 'automation'" class="view-container">
          <div class="view-card">
            <AutomationConfig ref="automationRef" />
          </div>
        </div>

        <!-- 资源权限 -->
        <div v-else-if="activeView === 'permission'" class="view-container">
          <div class="view-card">
            <ResourcePermission ref="permissionRef" />
          </div>
        </div>

        <!-- 操作记录 -->
        <div v-else-if="activeView === 'log'" class="view-container">
          <div class="view-card">
            <OperationLog ref="logRef" />
          </div>
        </div>
      </section>
    </div>
  </ModulePageLayout>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'
import AssetOverview from './AssetOverview.vue'
import AssetInfo from './AssetInfo.vue'
import DataManage from './DataManage.vue'
import AssetModel from './AssetModel.vue'
import ExceptionDevice from './ExceptionDevice.vue'
import AutomationConfig from './AutomationConfig.vue'
import ResourcePermission from './ResourcePermission.vue'
import OperationLog from './OperationLog.vue'
import ModelEditor from './ModelEditor.vue'

// 模块信息
const moduleTitle = '资产管理'
const moduleDescription = ''

const route = useRoute()
const router = useRouter()

// 当前视图
const activeView = ref('overview')

// 模型编辑器状态
const isModelEditorView = computed(() => {
  return route.query.editor === 'model' && route.query.modelId
})

const modelEditorId = computed(() => {
  return route.query.modelId || null
})

// 导航项（与源系统左侧菜单一致）
const navItems = [
  { key: 'overview', label: '资产总览', icon: 'fad fa-fw fa-chart-pie' },
  { key: 'info', label: '资产信息', icon: 'fad fa-fw fa-server' },
  { key: 'data', label: '数据管理', icon: 'fad fa-fw fa-database' },
  { key: 'model', label: '资产模型', icon: 'fad fa-fw fa-project-diagram' },
  { key: 'exception', label: '异常设备', icon: 'fad fa-fw fa-exclamation-triangle' },
  { key: 'automation', label: '自动化配置', icon: 'fad fa-fw fa-cogs' },
  { key: 'permission', label: '资源权限', icon: 'fad fa-fw fa-user-lock' },
  { key: 'log', label: '操作记录', icon: 'fad fa-fw fa-history' }
]

// 子组件引用
const overviewRef = ref(null)
const infoRef = ref(null)
const dataRef = ref(null)
const modelRef = ref(null)
const exceptionRef = ref(null)
const automationRef = ref(null)
const permissionRef = ref(null)
const logRef = ref(null)

// 获取当前模块的基础路径
function getBasePath() {
  const path = route.path
  const match = path.match(/^\/([^/]+)/)
  return match ? `/${match[1]}` : '/acm'
}

/**
 * 解析路由路径，确定当前视图
 */
function parseRouteView() {
  const path = route.path
  const params = route.params
  const pathMatch = Array.isArray(params.pathMatch)
    ? params.pathMatch.join('/')
    : params.pathMatch || ''

  // 检查各种子路由
  if (path.includes('/info') || pathMatch.includes('info')) {
    return 'info'
  }
  if (path.includes('/data') || pathMatch.includes('data')) {
    return 'data'
  }
  if (path.includes('/model') || pathMatch.includes('model')) {
    return 'model'
  }
  if (path.includes('/exception') || pathMatch.includes('exception')) {
    return 'exception'
  }
  if (path.includes('/automation') || pathMatch.includes('automation')) {
    return 'automation'
  }
  if (path.includes('/permission') || pathMatch.includes('permission')) {
    return 'permission'
  }
  if (path.includes('/log') || pathMatch.includes('log')) {
    return 'log'
  }

  return 'overview'
}

// 导航点击
function handleNavClick(item) {
  activeView.value = item.key
  const basePath = getBasePath()
  const targetPath = item.key === 'overview' ? basePath : `${basePath}/${item.key}`
  router.push(targetPath)
}

// 处理编辑模型（从 AssetModel 子组件发出）
function handleEditModel(modelId) {
  const basePath = getBasePath()
  router.push({
    path: `${basePath}/model`,
    query: { editor: 'model', modelId }
  })
}

// 模型编辑器返回
function handleEditorBack() {
  const basePath = getBasePath()
  router.push(`${basePath}/model`)
}

// 模型编辑器保存成功
function handleEditorSaved() {
  const basePath = getBasePath()
  router.push(`${basePath}/model`)
  // 刷新模型列表
  if (modelRef.value?.loadModelList) {
    modelRef.value.loadModelList()
  }
}

// 监听路由变化
watch(
  () => route.path,
  () => {
    activeView.value = parseRouteView()
  },
  { immediate: true }
)

onMounted(() => {
  activeView.value = parseRouteView()
})
</script>

<style scoped lang="scss">
.asset-module {
  display: flex;
  height: 100%;
  min-height: 0;
}

.asset-module__nav {
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

.asset-module__content {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.view-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.view-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.model-editor-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
