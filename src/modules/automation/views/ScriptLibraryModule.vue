<template>
  <ModulePageLayout
    title="脚本库管理"
    description="脚本文件版本管理、分类维护及一键发布能力将在此模块中逐步落地。"
  >
    <section class="module-section">
      <el-card shadow="hover" class="module-card">
        <template #header>
          <div class="module-card__header">
            <span>当前进度</span>
            <el-tag type="success" size="small">分析中</el-tag>
          </div>
        </template>
        <p class="module-card__text">
          已完成脚本模块 API 列表梳理，正在抽象公共的脚本表格与文件预览组件。
        </p>
      </el-card>

      <el-card shadow="never" class="module-card module-card--placeholder">
        <el-empty description="脚本管理工作台重构进行中" />
      </el-card>
    </section>
  </ModulePageLayout>
</template>

<script setup>
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'

defineProps({
  moduleCode: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  moduleDefinition: {
    type: Object,
    default: null
  }
})
</script>

<style scoped lang="scss">
.module-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.module-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.module-card__text {
  margin: 0;
  color: #475569;
  line-height: 1.7;
}

.module-card--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
}
</style>
