<template>
  <div class="angular-module-view">
    <!-- 模块内容 -->
    <div class="module-content">
      <AngularModuleFrame
        :key="`module-${moduleCode}-${refreshKey}`"
        :module-code="moduleCode"
        :route="routeParam"
        :show-header="false"
        :show-status-bar="true"
        @loaded="onModuleLoaded"
        @error="onModuleError"
        @route-change="onRouteChange"
        @message="onModuleMessage"
        @close="onModuleClose"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AngularModuleFrame from '@/components/angular/modules/AngularModuleFrame.vue'
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

const onModuleClose = data => {
  console.log('🚪 Module closed:', data)
  // 跳转回首页
  router.push('/home')
}

// 生命周期
onMounted(() => {
  // 验证模块代码
  if (!moduleConfig.value) {
    console.error(`Module ${moduleCode.value} not found`)
    router.push('/home')
    return
  }

  // 固定页面标题
  document.title = 'OPSmind'

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
  height: 100%;
  background: #f5f7fa;
}

.module-content {
  flex: 1;
  overflow: hidden;
}
</style>
