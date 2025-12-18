<template>
  <el-dialog
    v-model="visible"
    title="查询下次执行时间"
    width="500px"
  >
    <div v-loading="loading" class="next-time-content">
      <div v-if="times.length" class="next-time-list">
        <h4 v-for="(time, index) in times" :key="index" class="next-time-item">
          {{ time }}
        </h4>
      </div>
      <el-empty v-else description="该任务没有执行计划，是否已禁用？" />
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as jaoApi from '@/modules/automation/api/jao'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  scheduleConf: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = ref(false)
const times = ref([])

/**
 * 获取下次执行时间
 */
async function fetchNextExecutionTimes() {
  if (!props.scheduleConf) return

  loading.value = true
  try {
    const response = await jaoApi.queryNextExecutionTime(props.scheduleConf)
    const data = response.data || response
    if (data && data.length > 0 && data[0].next) {
      times.value = data[0].next
    } else {
      times.value = []
    }
  } catch (error) {
    ElMessage.error('查询执行时间失败')
    times.value = []
  } finally {
    loading.value = false
  }
}

// 监听对话框打开时加载数据
// 监听对话框打开时加载数据
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    times.value = []
    fetchNextExecutionTimes()
  }
}, { immediate: true })
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
