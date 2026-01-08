<template>
  <!-- 新布局下，侧边栏已由 OpsLayout 提供，模块只需输出内容 -->
  <div class="ops-module-content">
    <router-view />
  </div>
</template>

<script setup>
import { provide } from 'vue'
import { useRouter } from 'vue-router'

// 模块组件 - 系统巡检
// 侧边栏导航已移至 OpsLayout，此组件仅作为路由容器

const router = useRouter()

/**
 * 处理子组件的导航请求
 */
function handleNavigate(payload) {
  const { view, params } = payload

  if (view === 'results' && params?.templateId) {
    router.push({ path: '/cac/results', query: { templateId: params.templateId } })
  } else if (view === 'structural-diagram' && params?.jobId) {
    router.push(`/cac/structural-diagram/${params.jobId}`)
  } else if (view === 'result-detail' && params?.jobId) {
    router.push(`/cac/results/${params.jobId}`)
  }
}

// 提供给子组件使用
provide('handleNavigate', handleNavigate)
</script>

<style scoped lang="scss">
.ops-module-content {
  height: 100%;
  overflow: auto;
}
</style>
