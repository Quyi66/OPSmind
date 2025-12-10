<template>
  <div class="flow-history-view">
    <!-- 顶部工具栏 -->
    <div class="history-toolbar">
      <div class="toolbar-left">
        <el-button type="primary" plain size="small" @click="handleBack">
          <i class="fa fa-arrow-left"></i> 返回
        </el-button>
      </div>
      <div class="toolbar-center">
        <span class="process-name">{{ processInfo.processName }} 历史版本</span>
      </div>
      <div class="toolbar-right">
        <el-button size="small" @click="loadHistory">
          <i class="fa fa-refresh"></i> 刷新
        </el-button>
      </div>
    </div>

    <!-- 历史版本列表 -->
    <div class="history-content">
      <el-table
        :data="historyList"
        v-loading="loading"
        style="width: 100%"
        border
      >
        <el-table-column label="版本" width="150">
          <template #default="{ row }">
            <el-tag
              :type="row.version === row.currentVersion ? 'success' : 'primary'"
              size="small"
            >
              {{ row.version }}
              <span v-if="row.version === row.currentVersion">(当前版本)</span>
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="版本备注" prop="versionRemarks">
          <template #default="{ row }">
            {{ row.versionRemarks || row.remark || '-----' }}
          </template>
        </el-table-column>
        <el-table-column label="操作人" prop="operator" width="120">
          <template #default="{ row }">
            {{ row.operator || '-----' }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button
              type="success"
              size="small"
              plain
              :disabled="row.version === row.currentVersion"
              @click="handleChangeVersion(row)"
            >
              <i class="fa fa-edit"></i> 切换版本
            </el-button>
            <el-button
              type="primary"
              size="small"
              plain
              @click="handleDesign(row)"
            >
              <i class="fa fa-pencil-ruler"></i> 设计
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as flowApi from '@/modules/flow/api'

const props = defineProps({
  processId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['back', 'view-version'])

const loading = ref(false)
const historyList = ref([])
const processInfo = ref({
  processName: ''
})

async function loadHistory() {
  if (!props.processId) return

  loading.value = true
  try {
    // 加载流程信息
    const infoRes = await flowApi.getFlowInfo(props.processId)
    processInfo.value = infoRes?.data || infoRes || {}

    // 加载历史版本
    const response = await flowApi.getFlowVersionHistory(props.processId)
    const data = response?.data || response
    historyList.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Failed to load history:', error)
    ElMessage.error('加载历史版本失败')
  } finally {
    loading.value = false
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-----'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function handleBack() {
  emit('back')
}

function handleDesign(row) {
  // 发出事件，传递 processId 和 detailId
  emit('view-version', {
    processId: props.processId,
    detailId: row.processDetailId || row.id
  })
}

async function handleChangeVersion(row) {
  try {
    await ElMessageBox.confirm(
      '确定要切换到此版本吗？切换后当前运行的流程将使用此版本的配置。',
      '切换版本',
      { type: 'warning' }
    )

    // 调用切换版本 API
    await flowApi.changeFlowVersion({
      processId: props.processId,
      detailId: row.processDetailId || row.id
    })

    ElMessage.success('版本切换成功')
    loadHistory()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to change version:', error)
      ElMessage.error('版本切换失败')
    }
  }
}

onMounted(() => {
  loadHistory()
})
</script>

<style scoped lang="scss">
.flow-history-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.history-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.toolbar-left, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-center {
  flex: 1;
  text-align: center;

  .process-name {
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
  }
}

.history-content {
  flex: 1;
  padding: 20px;
  overflow: auto;
}

:deep(.el-table) {
  .el-button + .el-button {
    margin-left: 8px;
  }
}
</style>
