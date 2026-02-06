<template>
  <div class="flow-history-view">
    <!-- 顶部导航栏 -->
    <div class="design-header">
      <div class="header-left">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>
            <a @click.prevent="handleBack">流程列表</a>
          </el-breadcrumb-item>
          <el-breadcrumb-item>{{ processInfo.processName }} 历史版本</el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <div class="header-center"></div>

      <div class="header-right">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索版本备注"
          size="small"
          clearable
          style="width: 200px"
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button size="small" @click="loadHistory">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 历史版本列表 -->
    <div class="history-content">
      <el-table :data="paginatedList" v-loading="loading" style="width: 100%">
        <el-table-column label="版本" width="150">
          <template #default="{ row }">
            <el-tag :type="row.version === row.currentVersion ? 'success' : 'primary'" size="small">
              {{ row.version }}
              <span v-if="row.version === row.currentVersion">(当前版本)</span>
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="版本备注" prop="versionRemarks" show-overflow-tooltip>
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
        <el-table-column label="操作" width="132" fixed="right">
          <template #default="{ row }">
            <el-button
              text
              type="primary"
              size="small"
              :disabled="row.version === row.currentVersion"
              @click="handleChangeVersion(row)"
            >
              切换版本
            </el-button>
            <el-button text type="primary" size="small" @click="handleDesign(row)">设计</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页器 -->
      <div class="history-pagination" v-if="filteredList.length > 0">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="filteredList.length"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handlePageChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Search, Refresh } from '@element-plus/icons-vue'
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
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

// 过滤后的列表
const filteredList = computed(() => {
  if (!searchKeyword.value) {
    return historyList.value
  }
  const keyword = searchKeyword.value.toLowerCase()
  return historyList.value.filter(item => {
    const remark = (item.versionRemarks || item.remark || '').toLowerCase()
    return remark.includes(keyword)
  })
})

// 分页后的列表
const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredList.value.slice(start, end)
})

function handleSearch() {
  currentPage.value = 1
}

function handlePageChange() {
  // 分页变化时自动更新显示
}

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

// 顶部导航栏
.design-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 20px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;

  .header-left {
    flex: 1;
    display: flex;
    align-items: center;

    :deep(.el-breadcrumb) {
      font-size: 14px;

      .el-breadcrumb__item {
        .el-breadcrumb__inner {
          a {
            color: #409eff;
            font-weight: normal;
            cursor: pointer;
            text-decoration: none;
            transition: color 0.2s;

            &:hover {
              color: #66b1ff;
            }
          }
        }

        &:last-child .el-breadcrumb__inner {
          color: #606266;
          font-weight: 500;
        }
      }
    }
  }

  .header-center {
    display: flex;
    justify-content: center;
  }

  .header-right {
    flex: 1;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
}

.history-content {
  flex: 1;
  padding: 20px;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.history-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

:deep(.el-table) {
  .el-button + .el-button {
    margin-left: 8px;
  }
}
</style>
