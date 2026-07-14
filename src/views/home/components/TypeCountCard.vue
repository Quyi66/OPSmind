<template>
  <div class="type-count-card" @click="$emit('click')">
    <div class="card-left">
      <div class="icon-container">
        <i v-if="iconType === 'font'" :class="icon" :style="{ color: iconColor }"></i>
        <img v-else-if="iconType === 'image'" :src="icon" :alt="typeName" class="icon-image" />
      </div>
    </div>
    <div class="card-right">
      <div class="type-name">{{ typeName }}</div>
      <div class="type-count">{{ formattedCount }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  typeName: {
    type: String,
    required: true
  },
  count: {
    type: [Number, String],
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  iconColor: {
    type: String,
    default: '#1890ff'
  },
  iconType: {
    type: String,
    default: 'font', // 'font' 或 'image'
    validator: value => ['font', 'image'].includes(value)
  }
})

const _emit = defineEmits(['click'])

const formattedCount = computed(() => {
  if (typeof props.count === 'number') {
    return props.count.toLocaleString()
  }
  return props.count
})
</script>

<style scoped lang="scss">
.type-count-card {
  background: var(--el-bg-color);
  border-radius: 8px;
  padding: 10px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-left: 3px solid #3b82f6;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: 60px;
  flex: 1;

  &:hover {
    transform: translateY(-2px);
    border-color: var(--el-color-primary-light-5);
    border-left-color: #2563eb;
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.1);
    background: linear-gradient(to right, rgba(219, 234, 254, 0.15), var(--el-bg-color));
  }
}

.card-left {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-container {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;

  .icon-image {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }
}

.card-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.type-name {
  font-size: 14px;
  color: var(--el-text-color-regular);
  line-height: 1.2;
  white-space: nowrap; /* 保持单行显示 */
}

.type-count {
  font-size: 18px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.3px;
}

// 响应式设计
@media (max-width: 768px) {
  .type-count-card {
    padding: 12px;
    gap: 6px;
    height: 52px; // 70px的3/4约为52px
  }

  .icon-container {
    width: 32px;
    height: 40px;
    font-size: 20px;
  }

  .type-name {
    font-size: 13px;
  }

  .type-count {
    font-size: 16px;
  }
}

@media (max-width: 576px) {
  .type-count-card {
    padding: 10px;
    gap: 4px;
    height: 45px; // 60px的3/4为45px
  }

  .icon-container {
    width: 28px;
    height: 36px;
    font-size: 18px;
  }

  .type-name {
    font-size: 12px;
  }

  .type-count {
    font-size: 15px;
  }
}
</style>
