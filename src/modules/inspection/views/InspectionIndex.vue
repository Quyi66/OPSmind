<template>
  <ModulePageLayout
    :title="moduleTitle"
    :description="moduleDescription"
    :hide-header="true"
  >
    <div class="inspection-module">
      <aside class="ops-sidebar-nav ops-sidebar-nav--narrow">
        <div
          v-for="item in navItems"
          :key="item.key"
          class="ops-sidebar-item"
          :class="{ 'is-active': activeView === item.key }"
          @click="handleNavClick(item)"
        >
          <i :class="item.icon" />
          <span>{{ item.label }}</span>
        </div>
      </aside>

      <section class="inspection-module__content">
        <!-- 巡检总览（默认页面） -->
        <div v-if="activeView === 'overview'" class="view-container">
          <div class="view-card">
            <InspectionOverview ref="overviewRef" />
          </div>
        </div>

        <!-- 巡检模板 -->
        <div v-else-if="activeView === 'templates'" class="view-container">
          <div class="view-card">
            <TemplateList ref="templateListRef" />
          </div>
        </div>

        <!-- 检查结果（包含架构图） -->
        <div v-else-if="activeView === 'results'" class="view-container">
          <div class="view-card">
            <ResultList ref="resultListRef" />
          </div>
        </div>

        <!-- 结果详情 -->
        <div v-else-if="activeView === 'result-detail'" class="view-container">
          <div class="view-card">
            <ResultDetail ref="resultDetailRef" />
          </div>
        </div>

        <!-- 架构图 -->
        <div v-else-if="activeView === 'structural-diagram'" class="view-container">
          <div class="view-card">
            <StructuralDiagram ref="structuralDiagramRef" />
          </div>
        </div>

        <!-- 巡检配置 -->
        <div v-else-if="activeView === 'config'" class="view-container">
          <div class="view-card">
            <AssetModelConfig ref="configRef" />
          </div>
        </div>

        <!-- 邮件配置 -->
        <div v-else-if="activeView === 'email'" class="view-container">
          <div class="view-card">
            <EmailConfig ref="emailRef" />
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
import InspectionOverview from './InspectionOverview.vue'
import TemplateList from './TemplateList.vue'
import ResultList from './ResultList.vue'
import ResultDetail from './ResultDetail.vue'
import StructuralDiagram from './StructuralDiagram.vue'
import AssetModelConfig from './AssetModelConfig.vue'
import EmailConfig from './EmailConfig.vue'

// 模块信息
const moduleTitle = '系统巡检'
const moduleDescription = ''

const route = useRoute()
const router = useRouter()

// 当前视图
const activeView = ref('overview')

// 导航项（与源系统一致）
const navItems = [
  { key: 'overview', label: '巡检总览', icon: 'fad fa-fw fa-th-large' },
  { key: 'templates', label: '巡检模板', icon: 'fad fa-fw fa-list-alt' },
  { key: 'results', label: '检查结果', icon: 'fad fa-fw fa-history' },
  { key: 'config', label: '巡检配置', icon: 'fad fa-fw fa-cog' },
  { key: 'email', label: '邮件配置', icon: 'fad fa-fw fa-envelope' }
]

// 子组件引用
const overviewRef = ref(null)
const templateListRef = ref(null)
const resultListRef = ref(null)
const resultDetailRef = ref(null)
const structuralDiagramRef = ref(null)
const configRef = ref(null)
const emailRef = ref(null)

// 获取当前模块的基础路径
const basePath = computed(() => {
  // 从当前路由中提取基础路径，支持 /cac 或 /inspection
  const path = route.path
  const match = path.match(/^\/([^/]+)/)
  return match ? `/${match[1]}` : '/cac'
})

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
  if (path.includes('/structural-diagram/') || pathMatch.includes('structural-diagram')) {
    return 'structural-diagram'
  }
  if (path.includes('/results/') || pathMatch.includes('results/')) {
    return 'result-detail'
  }
  if (path.includes('/templates') || pathMatch.includes('templates')) {
    return 'templates'
  }
  if (path.includes('/results') || pathMatch.includes('results')) {
    return 'results'
  }
  if (path.includes('/config') || pathMatch.includes('config')) {
    return 'config'
  }
  if (path.includes('/email') || pathMatch.includes('email')) {
    return 'email'
  }

  return 'overview'
}

// 导航点击
function handleNavClick(item) {
  activeView.value = item.key
  // 使用正确的基础路径
  const targetPath =
    item.key === 'overview' ? basePath.value : `${basePath.value}/${item.key}`
  router.push(targetPath)
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
.inspection-module {
  display: flex;
  height: 100%;
  min-height: 0;
}

.inspection-module__nav {
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

.inspection-module__content {
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
</style>
