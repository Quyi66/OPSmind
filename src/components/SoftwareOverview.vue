<template>
  <div class="software-overview">
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-medium text-gray-900">作业概况</h3>
      <button class="text-gray-400 hover:text-gray-600">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
        </svg>
      </button>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <div v-for="stat in statsData" :key="stat.id" class="text-center">
        <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2" :class="stat.bgClass">
          <div class="w-4 h-4 rounded" :class="stat.colorClass"></div>
        </div>
        <div class="text-2xl font-bold text-gray-900">{{ stat.value }}</div>
        <div class="text-xs text-gray-500">{{ stat.label }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

// 统计数据
const statsData = ref([
  {
    id: 'rest-jobs',
    label: 'REST作业',
    value: '78',
    bgClass: 'bg-blue-100',
    colorClass: 'bg-blue-600'
  },
  {
    id: 'command-jobs',
    label: '合令作业',
    value: '2',
    bgClass: 'bg-orange-100',
    colorClass: 'bg-orange-600'
  },
  {
    id: 'script-jobs',
    label: '脚本作业',
    value: '56',
    bgClass: 'bg-green-100',
    colorClass: 'bg-green-600'
  }
])

// 事件处理
const handleStatClick = (stat) => {
  ElMessage.info(`查看${stat.label}详情`)
}
</script>

<style scoped lang="scss">
.software-overview {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.3s ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }
}

.section-header {
  margin-bottom: 8px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;

  i {
    color: #1890ff;
    font-size: 14px;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  flex: 1;
  align-items: center;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  }

  &.blue {
    border-left: 4px solid #2D8CF0;

    &:hover {
      box-shadow: 0 4px 20px rgba(45, 140, 240, 0.15);
    }
  }

  &.green {
    border-left: 4px solid #19BE6B;

    &:hover {
      box-shadow: 0 4px 20px rgba(25, 190, 107, 0.15);
    }
  }

  &.orange {
    border-left: 4px solid #FF9900;

    &:hover {
      box-shadow: 0 4px 20px rgba(255, 153, 0, 0.15);
    }
  }

  &.red {
    border-left: 4px solid #ED4014;

    &:hover {
      box-shadow: 0 4px 20px rgba(237, 64, 20, 0.15);
    }
  }
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 20px;
  flex-shrink: 0;

  .blue & {
    background: rgba(45, 140, 240, 0.1);
    color: #2d8cf0;
  }

  .green & {
    background: rgba(25, 190, 107, 0.1);
    color: #19be6b;
  }

  .orange & {
    background: rgba(255, 153, 0, 0.1);
    color: #ff9900;
  }

  .red & {
    background: rgba(237, 64, 20, 0.1);
    color: #ed4014;
  }
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #262626;
  line-height: 1.2;
  margin-bottom: 2px;
}

.stat-label {
  font-size: 14px;
  color: #8c8c8c;
  font-weight: 500;
}

// 响应式设计
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .software-overview {
    padding: 16px;
    margin-bottom: 16px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .stat-card {
    padding: 16px;
    gap: 12px;
  }

  .stat-icon {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }

  .stat-value {
    font-size: 24px;
  }
}

@media (max-width: 576px) {
  .stat-card {
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    font-size: 20px;
  }
}
</style>
