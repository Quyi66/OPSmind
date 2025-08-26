<template>
  <div class="software-overview">
    <div class="section-header">
      <h3 class="section-title">
        <i class="fa fa-chart-line"></i>
        软件概览
      </h3>
    </div>

    <div class="stats-grid">
      <div
        v-for="stat in statsData"
        :key="stat.id"
        class="stat-card"
        :class="stat.type"
        @click="handleStatClick(stat)"
      >
        <div class="stat-icon">
          <i :class="stat.icon"></i>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
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
    id: 'scan-hosts',
    label: '扫描主机数',
    value: '3',
    icon: 'fa fa-server',
    type: 'blue',
    color: '#2D8CF0'
  },
  {
    id: 'key-indicator-1',
    label: '关键指标',
    value: '8',
    icon: 'fa fa-target',
    type: 'green',
    color: '#19BE6B'
  },
  {
    id: 'key-indicator-2',
    label: '关键指标',
    value: '29930',
    icon: 'fa fa-database',
    type: 'blue',
    color: '#2D8CF0'
  },
  {
    id: 'key-indicator-3',
    label: '关键指标',
    value: '1351',
    icon: 'fa fa-chart-line',
    type: 'green',
    color: '#19BE6B'
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
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.3s ease;

  &:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  }
}

.section-header {
  margin-bottom: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;

  i {
    color: #1890ff;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  flex: 1;
  align-items: center;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
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
