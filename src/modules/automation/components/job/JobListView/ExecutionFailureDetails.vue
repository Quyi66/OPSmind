<template>
  <section v-if="rawError || failures.length" class="execution-failures">
    <div class="failure-heading">
      <strong>执行失败详情</strong>
      <el-button v-if="hasLog" link type="primary" @click="$emit('view-log')">
        查看完整日志
      </el-button>
    </div>
    <article v-for="(failure, index) in displayedFailures" :key="index" class="failure-target">
      <strong>{{ failure.host || '未提供目标' }} · {{ failure.status }}</strong>
      <div v-if="failure.step">执行步骤：{{ failure.step }}</div>
      <pre v-if="failure.message" class="failure-message">{{ failure.message }}</pre>
      <details>
        <summary>原始错误详情</summary>
        <pre>{{ failure.raw }}</pre>
      </details>
      <el-button size="small" @click="copy(failure.raw)">复制原始错误</el-button>
    </article>
    <el-button
      v-if="failures.length > visibleCount"
      link
      type="primary"
      @click="visibleCount += 10"
    >
      显示更多失败目标（已显示 {{ displayedFailures.length }}/{{ failures.length }}）
    </el-button>
    <details v-if="rawError" :open="!failures.length" class="raw-task-error">
      <summary>任务原始错误</summary>
      <pre>{{ rawError }}</pre>
      <el-button size="small" @click="copy(rawError)">复制原始错误</el-button>
    </details>
  </section>
</template>
<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { extractExecutionFailures } from './executionFailures'
defineEmits(['view-log'])
const props = defineProps({
  error: { type: [String, Object, Array], default: '' },
  contents: { type: Array, default: () => [] },
  hasLog: Boolean
})
const rawError = computed(() =>
  typeof props.error === 'string' ? props.error : JSON.stringify(props.error, null, 2)
)
const failures = computed(() => extractExecutionFailures(props.contents))
const visibleCount = ref(10)
const displayedFailures = computed(() => failures.value.slice(0, visibleCount.value))
async function copy(value) {
  try {
    await navigator.clipboard.writeText(value)
    ElMessage.success('已复制原始错误')
  } catch {
    ElMessage.error('复制失败，请选中原文手动复制')
  }
}
</script>
<style scoped>
.execution-failures {
  padding: 16px;
  margin: 12px 0;
  border: 1px solid var(--el-color-danger-light-5);
  border-radius: 6px;
}
.failure-heading {
  display: flex;
  align-items: center;
  gap: 16px;
}
.failure-target {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}
.execution-failures pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 240px;
  overflow: auto;
  margin: 8px 0;
  user-select: text;
}
.failure-message {
  color: var(--el-text-color-primary);
}
.execution-failures summary {
  cursor: pointer;
}
.raw-task-error {
  margin-top: 12px;
}
</style>
