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
  background: #fff;
  border-radius: 4px;
  padding: 12px 10px; /* 收紧左右内边距，给标题留空间 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: 60px;
  flex: 1;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }
}

.card-left {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  height: 100%;
}

.icon-container {
  width: 36px; /* 收窄以释放文本宽度 */
  height: 48px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  font-size: 24px;
  margin-top: 4px; // 让icon位于上半部分

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
  gap: 4px;
}

.type-name {
  font-size: 14px;
  color: #666;
  line-height: 1.2;
  white-space: nowrap; /* 保持单行显示 */
}

.type-count {
  font-size: 18px;
  font-weight: bold;
  color: #262626;
  line-height: 1.2;
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
