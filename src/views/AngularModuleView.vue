<template>
  <div class="angular-module-view">
    <!-- 面包屑导航 -->
    <div class="breadcrumb-nav">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/home' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item>{{ moduleConfig?.name }}</el-breadcrumb-item>
        <el-breadcrumb-item v-if="currentRoute !== 'main'">
          {{ getRouteLabel(currentRoute) }}
        </el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 模块内容 -->
    <div class="module-content">
      <AngularModuleFrame
        :key="`module-${moduleCode}-${refreshKey}`"
        :module-code="moduleCode"
        :route="routeParam"
        :show-header="true"
        :show-status-bar="true"
        @loaded="onModuleLoaded"
        @error="onModuleError"
        @route-change="onRouteChange"
        @message="onModuleMessage"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElBreadcrumb, ElBreadcrumbItem } from 'element-plus'
import AngularModuleFrame from '@/components/modules/AngularModuleFrame.vue'
import { angularModuleManager } from '@/services/AngularModuleManager.js'

const route = useRoute()
const router = useRouter()

// 响应式数据
const refreshKey = ref(0)
const currentRoute = ref('main')

// 计算属性
const moduleCode = computed(() => {
  // 优先从路由参数获取，如果没有则从 meta 信息获取
  return route.params.moduleCode || route.meta?.moduleCode
})
const routeParam = computed(() => route.query.route || null)

const moduleConfig = computed(() => {
  console.log('🔍 Getting module config for:', moduleCode.value)
  return angularModuleManager.getModule(moduleCode.value)
})

// 方法
const getRouteLabel = routeName => {
  const labels = {
    main: '主页面',
    template: '模板管理',
    rules: '规则管理',
    hosts: '主机管理',
    jobs: '作业管理',
    results: '结果查看',
    commands: '命令管理',
    flows: '流程管理',
    schedules: '调度管理',
    datasources: '数据源',
    datasets: '数据集',
    transfers: '传输任务',
    pages: '页面管理',
    widgets: '组件管理',
    themes: '主题管理',
    scripts: '脚本管理',
    versions: '版本管理',
    executions: '执行记录',
    assets: '资产管理',
    configs: '配置管理',
    monitoring: '监控告警',
    config: '系统配置',
    users: '用户管理',
    logs: '日志管理',
    list: '应用列表',
    translator: '翻译工具',
    components: '组件测试'
  }
  return labels[routeName] || routeName
}

// 事件处理
const onModuleLoaded = data => {
  console.log('✅ Module loaded:', data)
}

const onModuleError = data => {
  console.error('❌ Module error:', data)
}

const onRouteChange = data => {
  currentRoute.value = data.route
  console.log('🧭 Route changed:', data)
}

const onModuleMessage = data => {
  console.log('📨 Module message:', data)
}

// 生命周期
onMounted(() => {
  // 验证模块代码
  if (!moduleConfig.value) {
    console.error(`Module ${moduleCode.value} not found`)
    router.push('/home')
    return
  }

  // 设置页面标题
  document.title = `${moduleConfig.value.name} - OpsMind`

  // 设置初始路由
  if (routeParam.value) {
    currentRoute.value = routeParam.value
  }
})

// 监听路由变化
watch(
  () => route.params.moduleCode,
  (newCode, oldCode) => {
    if (newCode !== oldCode) {
      refreshKey.value++
      currentRoute.value = 'main'
    }
  }
)

watch(
  () => route.query.route,
  newRoute => {
    if (newRoute) {
      currentRoute.value = newRoute
    }
  }
)
</script>

<style scoped>
.angular-module-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f7fa;
}

.breadcrumb-nav {
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e4e7ed;
}

.module-content {
  flex: 1;
  padding: 1rem;
  overflow: hidden;
}
</style>
