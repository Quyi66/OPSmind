<template>
  <el-dialog
    v-model="visible"
    title="历史版本"
    width="700px"
    @close="handleClose"
  >
    <el-table
      :data="historyList"
      v-loading="loading"
      border
      style="width: 100%"
    >
      <el-table-column prop="version" label="版本号" width="80" />
      <el-table-column prop="versionRemarks" label="版本说明" min-width="150" />
      <el-table-column prop="operator" label="操作人" width="100" />
      <el-table-column prop="createTime" label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDateTime(row.createTime) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button
            type="primary"
            link
            size="small"
            @click="handleViewVersion(row)"
            :disabled="row.currentVersion === row.version"
          >
            查看
          </el-button>
          <el-button
            type="warning"
            link
            size="small"
            @click="handleRollback(row)"
            :disabled="row.currentVersion === row.version"
          >
            回滚
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as flowApi from '@/modules/flow/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  processId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'view-version'])

const visible = ref(false)
const loading = ref(false)
const historyList = ref([])

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.processId) {
    loadHistory()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

function formatDateTime(isoString) {
  if (!isoString) return '-'
  try {
    const date = new Date(isoString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch {
    return isoString
  }
}

async function loadHistory() {
  loading.value = true
  try {
    const response = await flowApi.getFlowVersionHistory(props.processId)
    historyList.value = response?.data || response || []
  } catch (error) {
    console.error('Failed to load history:', error)
    historyList.value = []
  } finally {
    loading.value = false
  }
}

function handleViewVersion(row) {
  emit('view-version', row.processDetailId)
  handleClose()
}

function handleRollback(row) {
  ElMessage.info('回滚功能待实现')
}

function handleClose() {
  visible.value = false
  historyList.value = []
}
</script>

<style scoped lang="scss">
</style>
