<template>
  <el-dialog
    :model-value="modelValue"
    title="安装任务失败主机"
    width="1000px"
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-loading="loading">
      <div class="ops-action-bar">
        <span v-if="result">失败主机共 {{ failedHostCount }} 台（去重）</span>
        <span class="action-spacer" />
        <el-button size="small" :loading="loading" @click="load">刷新</el-button>
      </div>
      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        :closable="false"
        show-icon
      />
      <template v-else-if="result">
        <section v-for="group in groups" :key="group.key" class="failed-host-group">
          <h3>{{ group.label }}（{{ group.rows.length }}）</h3>
          <el-table :data="group.rows" max-height="260" size="small" empty-text="暂无失败主机">
            <el-table-column prop="hostKey" label="主机" min-width="160">
              <template #default="{ row }">{{ row.hostKey || '-' }}</template>
            </el-table-column>
            <el-table-column prop="reason" label="失败原因" min-width="360">
              <template #default="{ row }">
                <span class="failure-reason">{{ row.reason || '-' }}</span>
              </template>
            </el-table-column>
          </el-table>
        </section>
      </template>
    </div>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { patchInstallApi } from '../../../api'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  taskId: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])
const loading = ref(false)
const result = ref(null)
const errorMessage = ref('')
let requestId = 0

const groups = computed(() => [
  { key: 'preCheckFailed', label: '预检失败', rows: result.value?.preCheckFailed || [] },
  { key: 'installFailed', label: '安装失败', rows: result.value?.installFailed || [] }
])
const failedHostCount = computed(() => {
  const ids = result.value?.failedHostIds
  if (Array.isArray(ids)) return new Set(ids).size
  return new Set(groups.value.flatMap(group => group.rows.map(row => row.hostId)).filter(Boolean))
    .size
})

async function load() {
  const id = ++requestId
  result.value = null
  errorMessage.value = ''
  if (!props.taskId) {
    errorMessage.value = '当前任务信息不完整，无法查询失败主机'
    loading.value = false
    return
  }
  loading.value = true
  try {
    const response = await patchInstallApi.getFailedHosts(props.taskId)
    if (id !== requestId) return
    result.value = response?.data ?? response
  } catch (error) {
    if (id !== requestId) return
    errorMessage.value =
      error?.response?.status === 404 ? '任务不存在或已删除' : '加载失败主机失败，请点击刷新重试'
  } finally {
    if (id === requestId) loading.value = false
  }
}

watch(
  () => [props.modelValue, props.taskId],
  ([visible]) => {
    requestId += 1
    loading.value = false
    result.value = null
    errorMessage.value = ''
    if (visible) load()
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  requestId += 1
})
</script>

<style scoped>
.action-spacer {
  flex: 1;
}
.failed-host-group {
  margin-top: 16px;
}
.failed-host-group h3 {
  margin: 0 0 8px;
  font-size: 14px;
}
.failure-reason {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
