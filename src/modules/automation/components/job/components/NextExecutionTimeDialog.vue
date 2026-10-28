<template>
  <el-dialog v-model="visible" title="查询下次执行时间" width="500px" :close-on-click-modal="true">
    <div v-loading="loading" class="next-time-content">
      <div v-if="times.length" class="next-time-list">
        <h4 v-for="(time, index) in times" :key="index" class="next-time-item">
          {{ time }}
        </h4>
      </div>
      <div v-else-if="error" role="alert">
        <p>{{ error }}</p>
        <el-button @click="fetchNextExecutionTimes">重试</el-button>
      </div>
      <el-empty v-else-if="!loading" :description="emptyDescription" />
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import * as jaoApi from '@/modules/automation/api/jao'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  scheduleConf: {
    type: String,
    default: ''
  },
  emptyDescription: {
    type: String,
    default: '该任务没有执行计划，是否已禁用？'
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const loading = ref(false)
const times = ref([])
const error = ref('')
let requestId = 0

/**
 * 获取下次执行时间
 */
async function fetchNextExecutionTimes() {
  const currentRequestId = ++requestId
  const scheduleConf = props.scheduleConf
  const isCurrent = () =>
    currentRequestId === requestId && props.modelValue && props.scheduleConf === scheduleConf
  times.value = []
  error.value = ''
  loading.value = false
  if (!props.modelValue || !scheduleConf?.trim()) return

  loading.value = true
  try {
    const response = await jaoApi.queryNextExecutionTime(scheduleConf)
    if (!isCurrent()) return
    const data = response.data || response
    if (data && data.length > 0 && Array.isArray(data[0].next)) {
      times.value = data[0].next
    } else {
      times.value = []
    }
  } catch {
    if (isCurrent()) error.value = '查询执行时间失败，请检查表达式后重试'
  } finally {
    if (isCurrent()) loading.value = false
  }
}

watch(
  () => [props.modelValue, props.scheduleConf],
  ([isVisible]) => {
    if (isVisible) {
      fetchNextExecutionTimes()
    } else {
      requestId++
      loading.value = false
      times.value = []
      error.value = ''
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  requestId++
})
</script>

<style scoped>
.next-time-content {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.next-time-list {
  text-align: center;
  width: 100%;
}

.next-time-item {
  margin: 12px 0;
  color: #303133;
  font-size: 15px;
  font-weight: normal;
}
</style>
