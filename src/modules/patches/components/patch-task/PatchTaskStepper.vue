<template>
  <div class="patch-task-stepper">
    <template v-for="(step, index) in steps" :key="step.key">
      <div
        class="patch-task-stepper__item"
        :class="itemClasses(index)"
        :role="clickable ? 'button' : undefined"
        :tabindex="clickable ? 0 : undefined"
        @click="selectStep(index)"
        @keydown.enter="selectStep(index)"
        @keydown.space.prevent="selectStep(index)"
      >
        <div class="patch-task-stepper__icon">
          <i v-if="stepState(index) === 'failed'" class="fa fa-times" />
          <i v-else-if="isStepSuccessful(index)" class="fa fa-check" />
          <span v-else>{{ index + 1 }}</span>
        </div>
        <div class="patch-task-stepper__title">{{ step.title }}</div>
      </div>
      <div
        v-if="index < steps.length - 1"
        class="patch-task-stepper__line"
        :class="{ 'is-active': isLineCompleted(index) }"
      />
    </template>
  </div>
</template>

<script setup>
const props = defineProps({
  steps: {
    type: Array,
    default: () => []
  },
  activeIndex: {
    type: Number,
    default: 0
  },
  states: {
    type: Array,
    default: () => []
  },
  clickable: {
    type: Boolean,
    default: false
  },
  completedByIndex: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['select'])

function stepState(index) {
  return props.states[index] || 'idle'
}

function isStepSuccessful(index) {
  const state = stepState(index)
  if (props.completedByIndex && props.activeIndex === index) return false
  return (
    state === 'success' ||
    (state !== 'failed' && props.completedByIndex && props.activeIndex > index)
  )
}

function isLineCompleted(index) {
  return props.completedByIndex ? props.activeIndex > index : stepState(index) === 'success'
}

function itemClasses(index) {
  return {
    'is-active': props.activeIndex === index,
    'is-success': isStepSuccessful(index),
    'is-failed': stepState(index) === 'failed',
    'is-clickable': props.clickable
  }
}

function selectStep(index) {
  if (props.clickable) emit('select', index)
}
</script>

<style scoped lang="scss">
.patch-task-stepper {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  margin-bottom: 30px;
  padding: 0 40px;
}

.patch-task-stepper__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 90px;
  position: relative;
  z-index: 1;

  &.is-clickable {
    cursor: pointer;
  }

  &.is-clickable:focus-visible {
    border-radius: 4px;
    outline: 2px solid var(--el-color-primary-light-3, #79bbff);
    outline-offset: 4px;
  }

  &.is-active {
    .patch-task-stepper__icon {
      border-color: var(--el-color-primary, #409eff);
      background-color: var(--el-color-primary, #409eff);
      color: #fff;
    }

    .patch-task-stepper__title {
      color: var(--el-color-primary, #409eff);
      font-weight: bold;
    }
  }

  &.is-success {
    .patch-task-stepper__icon {
      border-color: var(--el-color-success, #67c23a);
      color: var(--el-color-success, #67c23a);
      background-color: var(--el-bg-color, #fff);
    }

    .patch-task-stepper__title {
      color: var(--el-color-success, #67c23a);
    }
  }

  &.is-failed {
    .patch-task-stepper__icon {
      border-color: var(--el-color-danger, #f56c6c);
      background-color: var(--el-color-danger, #f56c6c);
      color: #fff;
    }

    .patch-task-stepper__title {
      color: var(--el-color-danger, #f56c6c);
    }
  }
}

.patch-task-stepper__icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background-color: var(--el-bg-color, #fff);
  border: 2px solid var(--el-text-color-placeholder, #a8abb2);
  color: var(--el-text-color-placeholder, #a8abb2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 6px;
  transition: all 0.3s;
}

.patch-task-stepper__title {
  font-size: 12px;
  color: var(--el-text-color-regular, #606266);
  font-weight: 500;
  transition: all 0.3s;
  text-align: center;
  white-space: nowrap;
}

.patch-task-stepper__line {
  flex: 1;
  height: 2px;
  background-color: var(--el-border-color-lighter, #ebeef5);
  margin: 12px -30px 0;
  z-index: 0;
  transition: all 0.3s;

  &.is-active {
    background-color: var(--el-color-success, #67c23a);
  }
}
</style>
