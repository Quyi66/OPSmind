<template>
  <div class="ops-module__content">
    <router-view />
  </div>
</template>

<script setup>
import { provide } from 'vue'
import { useRouter } from 'vue-router'

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
.ops-module__content {
  flex: 1;
  overflow: auto;
  min-height: 0;
}
</style>
