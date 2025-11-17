<template>
  <ModulePageLayout
    :title="title"
    :description="description"
  >
    <div class="module-placeholder">
      <el-result
        icon="info"
        :title="placeholderTitle"
        :sub-title="placeholderSubtitle"
      >
        <template #extra>
          <el-tag round type="info" size="large">{{ moduleCode.toUpperCase() }}</el-tag>
        </template>
      </el-result>

      <el-alert
        title="重构计划"
        type="info"
        show-icon
        class="module-placeholder__alert"
      >
        <p>当前模块正从 Angular iframe 迁移到 Vue 原生实现。我们正在：</p>
        <ul>
          <li>梳理原有模块的业务流程和交互细节</li>
          <li>对接现有接口，统一 API 调用方式</li>
          <li>按照新的设计语言重建组件与页面布局</li>
        </ul>
      </el-alert>

      <div class="module-placeholder__progress">
        <el-progress :percentage="progress" status="active" />
        <p class="module-placeholder__progress-text">{{ progressText }}</p>
      </div>

      <slot />
    </div>
  </ModulePageLayout>
</template>

<script setup>
import { computed } from 'vue'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'

const props = defineProps({
  moduleCode: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  progress: {
    type: Number,
    default: 15
  },
  progressText: {
    type: String,
    default: '正在梳理现有 Angular 模块的业务流程'
  }
})

const placeholderTitle = computed(() => `${props.title || '模块'} 正在重构中`)
const placeholderSubtitle = computed(() => {
  if (props.description) return props.description
  return '我们将逐步用 Vue 3 重写该模块，以提升性能与一致的用户体验。'
})
</script>

<style scoped lang="scss">
.module-placeholder {
  max-width: 960px;
  margin: 48px auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.module-placeholder__alert ul {
  margin: 8px 0 0;
  padding-left: 18px;
  color: #475569;
}

.module-placeholder__progress {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 420px;
}

.module-placeholder__progress-text {
  font-size: 13px;
  color: #475569;
  margin: 0;
}

@media (max-width: 768px) {
  .module-placeholder {
    margin: 32px auto;
    padding: 0 8px;
  }
}
</style>
