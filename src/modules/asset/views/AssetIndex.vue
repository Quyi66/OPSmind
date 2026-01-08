<template>
  <!-- 新布局下，侧边栏已由 OpsLayout 提供，模块只需输出内容 -->
  <div class="ops-module-content">
    <router-view />
  </div>
</template>

<script setup>
import { provide } from 'vue'
import { useRouter } from 'vue-router'

// 模块组件 - 资产管理
// 侧边栏导航已移至 OpsLayout，此组件仅作为路由容器

const router = useRouter()

// 处理编辑模型
function handleEditModel(modelId) {
  router.push({
    path: '/acm/model',
    query: { editor: 'model', modelId }
  })
}

// 处理查看资产类型
function handleViewAssetType(assetTypeCode) {
  router.push({
    path: '/acm/info',
    query: { type: assetTypeCode }
  })
}

// 提供给子组件使用
provide('handleEditModel', handleEditModel)
provide('handleViewAssetType', handleViewAssetType)
</script>

<style scoped lang="scss">
.ops-module-content {
  height: 100%;
  overflow: auto;
}
</style>
