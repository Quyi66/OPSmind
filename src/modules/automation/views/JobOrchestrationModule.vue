<template>
  <ModulePageLayout
    title="自动化作业编排"
    description="集中管理批量作业、作业模板和执行计划，逐步替换原 Angular JAO 模块。"
  >
    <section class="module-section">
      <el-card shadow="hover" class="module-card">
        <template #header>
          <div class="module-card__header">
            <span>重构路线图</span>
            <el-tag type="warning" size="small">Phase 1</el-tag>
          </div>
        </template>
        <ul class="module-checklist">
          <li>梳理作业列表、模板管理、执行详情等核心页面</li>
          <li>统一封装作业相关的 API 请求与数据模型</li>
          <li>复刻原有筛选器、状态展示与执行流程交互</li>
        </ul>
      </el-card>

      <el-card shadow="never" class="module-card module-card--placeholder">
        <el-empty
          description="新的作业编排工作台开发中"
        />
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

.module-checklist {
  margin: 0;
  padding-left: 18px;
  color: #475569;
  line-height: 1.7;
}

.module-card--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 260px;
}
</style>
