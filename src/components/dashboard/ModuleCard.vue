<template>
  <div
    class="module-card"
    :style="{ borderLeftColor: module.color }"
    @click="$emit('click', module)"
  >
    <div class="module-header">
      <div class="module-icon" :style="{ color: module.color }">
        <i :class="module.icon"></i>
      </div>
      <div class="module-info">
        <h3 class="module-title">{{ module.title }}</h3>
        <p class="module-description">{{ moduleDescription }}</p>
      </div>
    </div>

    <div class="module-footer">
      <div class="module-meta">
        <span class="module-type">{{ moduleTypeText }}</span>
        <span class="module-status" :class="statusClass">
          <i class="fa fa-circle"></i>
          {{ statusText }}
        </span>
      </div>
      <div class="module-actions">
        <el-button type="primary" size="small" @click.stop="$emit('click', module)">
          {{ getButtonText }}
        </el-button>
        <el-tag v-if="isEnhancedModule" size="small" type="success" class="enhanced-tag">
          增强版
        </el-tag>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ElTag } from 'element-plus'

const props = defineProps({
  module: {
    type: Object,
    required: true
  }
})

const _emit = defineEmits(['click'])

const moduleDescription = computed(() => {
  // 根据模块代码返回描述
  const descriptions = {
    __jao: '一键作业编排和执行平台，支持复杂作业流程管理',
    __gfs: '脚本文件管理系统，提供脚本版本控制和执行',
    __cmd: '命令管理工具，支持批量命令执行和管理',
    __acm: '资产配置管理，统一管理IT基础设施资产',
    __dts: '数据传输服务，提供数据源管理和数据同步',
    __cac: '配置审计与合规性检查，支持系统巡检和配置管理',
    cac: '配置审计与合规性检查，支持系统巡检和配置管理',
    __applets: '应用管理中心，管理和配置各种小应用',
    __search: '系统搜索中心，全局搜索各类资源',
    __ssc: '自助服务中心，提供用户自助服务功能'
  }

  return descriptions[props.module.code] || '暂无描述'
})

const moduleTypeText = computed(() => {
  const types = {
    Application: '应用',
    Library: '库',
    PrivateTool: '工具'
  }
  return types[props.module.type] || '应用'
})

const statusClass = computed(() => {
  // 模拟模块状态，实际应该从后端获取
  return 'status-active'
})

const statusText = computed(() => {
  return '正常'
})

// 增强模块（支持新容器的模块）
const enhancedModules = ['__cac', 'cac', '__jao', 'jao']

const isEnhancedModule = computed(() => {
  return enhancedModules.includes(props.module.code)
})

const getButtonText = computed(() => {
  if (isEnhancedModule.value) {
    return '启动'
  }
  return '打开'
})
</script>

<style scoped lang="scss">
.module-card {
  background: #fff;
  border-radius: 8px;
  border-left: 4px solid #1890ff;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }
}

.module-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.module-icon {
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  font-size: 20px;
}

.module-info {
  flex: 1;
  min-width: 0;
}

.module-title {
  font-size: 18px;
  font-weight: 600;
  color: #262626;
  margin: 0 0 8px 0;
  line-height: 1.3;
}

.module-description {
  font-size: 14px;
  color: #8c8c8c;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.module-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.module-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.module-type {
  font-size: 12px;
  color: #8c8c8c;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 4px;
}

.module-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;

  &.status-active {
    color: #52c41a;
  }

  &.status-inactive {
    color: #f5222d;
  }

  &.status-warning {
    color: #faad14;
  }
}

.module-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.enhanced-tag {
  font-size: 10px;
  padding: 2px 6px;
}

// 响应式设计
@media (max-width: 768px) {
  .module-card {
    padding: 16px;
    gap: 12px;
  }

  .module-header {
    gap: 12px;
  }

  .module-icon {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }

  .module-title {
    font-size: 16px;
  }

  .module-description {
    font-size: 13px;
  }

  .module-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .module-actions {
    width: 100%;

    .el-button {
      width: 100%;
    }
  }
}
</style>
