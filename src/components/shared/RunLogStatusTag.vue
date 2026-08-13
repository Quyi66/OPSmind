<template>
  <el-tag
    :type="type"
    :size="size"
    :effect="effect"
    :round="round"
    :class="{ 'run-log-status-tag--clickable': clickable }"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    :title="clickable ? tooltip : undefined"
    :aria-label="clickable ? tooltip : undefined"
    @click="handleClick"
    @keydown.enter="handleKeyboardActivate"
    @keydown.space.prevent="handleKeyboardActivate"
  >
    <slot />
    <el-icon v-if="clickable" class="run-log-status-tag__view-icon" aria-hidden="true">
      <View />
    </el-icon>
  </el-tag>
</template>

<script setup>
import { View } from '@element-plus/icons-vue'

const props = defineProps({
  type: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'small'
  },
  effect: {
    type: String,
    default: 'light'
  },
  round: {
    type: Boolean,
    default: false
  },
  clickable: {
    type: Boolean,
    default: true
  },
  tooltip: {
    type: String,
    default: '点击查看运行详情'
  }
})

const emit = defineEmits(['click'])

function handleClick(event) {
  if (props.clickable) {
    emit('click', event)
  }
}

function handleKeyboardActivate(event) {
  if (props.clickable) {
    emit('click', event)
  }
}
</script>

<style scoped lang="scss">
.run-log-status-tag--clickable {
  cursor: pointer;
  transition:
    filter 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    filter: brightness(0.96);
    border-color: currentColor;
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary-light-3);
    outline-offset: 2px;
  }
}

:deep(.el-tag__content) {
  display: inline-flex;
  align-items: center;
}

.run-log-status-tag__view-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
  font-size: 12px;
  line-height: 1;
}
</style>
