<template>
  <div class="ops-module__content">
    <router-view />
  </div>
</template>

<script setup>
import { provide } from 'vue'
import { useRouter } from 'vue-router'

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
.ops-module__content {
  flex: 1;
  overflow: auto;
  min-height: 0;
}
</style>
