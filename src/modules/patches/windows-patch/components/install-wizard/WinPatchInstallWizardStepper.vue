<template>
  <div class="ops-stepper">
    <template v-for="(step, index) in steps" :key="step.key">
      <div class="stepper-item" :class="`is-${resolveStepState(index)}`">
        <div class="stepper-icon">
          <i v-if="resolveStepState(index) === 'failed'" class="fa fa-times"></i>
          <i v-else-if="resolveStepState(index) === 'success'" class="fa fa-check"></i>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <div class="stepper-title">{{ step.title }}</div>
      </div>
      <div
        v-if="index < steps.length - 1"
        class="stepper-line"
        :class="{ 'is-active': ['success', 'active'].includes(resolveStepState(index + 1)) }"
      ></div>
    </template>
  </div>
</template>

<script setup>
const props = defineProps({
  activeIndex: {
    type: Number,
    default: 0
  },
  steps: {
    type: Array,
    default: () => []
  },
  stepStates: {
    type: Array,
    default: () => []
  }
})

function resolveStepState(index) {
  return props.stepStates[index] || (index === props.activeIndex ? 'active' : 'idle')
}
</script>

<style scoped lang="scss">
.ops-stepper {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  margin-bottom: 30px;
  padding: 0 40px;
}

.stepper-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 90px;
  position: relative;
  z-index: 1;
}

.stepper-item .stepper-icon {
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

.stepper-item .stepper-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-regular, #606266);
  text-align: center;
  white-space: nowrap;
  transition: all 0.3s;
}

.stepper-line {
  flex: 1;
  height: 2px;
  background-color: var(--el-border-color-lighter, #ebeef5);
  margin: 12px -30px 0;
  z-index: 0;
  transition: all 0.3s;
}

.stepper-line.is-active {
  background-color: var(--el-color-success, #67c23a);
}

.stepper-item.is-active .stepper-icon {
  border-color: var(--el-color-primary, #409eff);
  background-color: var(--el-color-primary, #409eff);
  color: #fff;
}

.stepper-item.is-active .stepper-title {
  color: var(--el-color-primary, #409eff);
  font-weight: 600;
}

.stepper-item.is-success .stepper-icon {
  border-color: var(--el-color-success, #67c23a);
  color: var(--el-color-success, #67c23a);
  background-color: var(--el-bg-color, #fff);
}

.stepper-item.is-success .stepper-title {
  color: var(--el-color-success, #67c23a);
}

.stepper-item.is-failed .stepper-icon {
  border-color: var(--el-color-danger, #f56c6c);
  background-color: var(--el-color-danger, #f56c6c);
  color: #fff;
}

.stepper-item.is-failed .stepper-title {
  color: var(--el-color-danger, #f56c6c);
}
</style>
