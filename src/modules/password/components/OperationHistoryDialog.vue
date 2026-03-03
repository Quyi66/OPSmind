<template>
  <el-dialog
    v-model="visible"
    title="操作历史"
    width="900px"
    :close-on-click-modal="false"
    destroy-on-close
    @close="handleClose"
  >
    <div v-loading="loading" class="history-content">
      <div class="server-info" v-if="serverInfo">
        <el-tag type="info" size="small">{{ serverInfo.hostKey }}</el-tag>
        <span class="username">{{ serverInfo.username }}</span>
      </div>

      <el-table :data="tableData" style="width: 100%" max-height="400px">
        <el-table-column prop="start_time" label="开始时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.start_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" width="120" />
        <el-table-column prop="username" label="操作人" width="100" />
        <el-table-column prop="end_time" label="结束时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.end_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ row.status || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="信息" min-width="200" show-overflow-tooltip />
      </el-table>

      <div class="pagination-footer">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          background
          small
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </div>
    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import * as pmsApi from '@/modules/password/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  assestsId: {
    type: String,
    default: ''
  },
  username: {
    type: String,
    default: ''
  },
  hostKey: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = ref(props.modelValue)
const loading = ref(false)
const tableData = ref([])

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const serverInfo = computed(() => {
  if (!props.hostKey && !props.username) return null
  return {
    hostKey: props.hostKey,
    username: props.username
  }
})

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.assestsId) {
    pagination.page = 1
    loadData()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
  if (!val) {
    tableData.value = []
  }
})

async function loadData() {
  loading.value = true
  try {
    const response = await pmsApi.getServerHistory({
      assestsId: props.assestsId,
      username: props.username,
      module: 'pms'
    })
    const result = response?.data || response
    tableData.value = result?.records || []
    pagination.total = result?.total || tableData.value.length
  } catch (error) {
    console.error('Failed to load history:', error)
    ElMessage.error('加载操作历史失败')
  } finally {
    loading.value = false
  }
}

function getStatusType(status) {
  const map = {
    SUCCESS: 'success',
    COMPLETED: 'success',
    FAILED: 'danger',
    ERROR: 'danger',
    RUNNING: 'primary',
    WAITING: 'info'
  }
  return map[status] || 'info'
}

function formatTime(time) {
  if (!time) return '-'
  try {
    const date = new Date(time)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return time
  }
}

function handleClose() {
  visible.value = false
}
</script>

<style scoped lang="scss">
.history-content {
  min-height: 200px;
}

.server-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--el-bg-color-page);
  border-radius: 6px;

  .username {
    color: #606266;
    font-size: 14px;
  }
}

.pagination-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
