<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :inline="true" size="small">
        <el-form-item label="时间范围">
          <el-select v-model="filters.day" style="width: 100px">
            <el-option label="Today" :value="1" />
            <el-option label="3 Days" :value="3" />
            <el-option label="7 Days" :value="7" />
            <el-option label="30 Days" :value="30" />
          </el-select>
        </el-form-item>

        <el-form-item label="执行引擎">
          <el-select v-model="filters.ataNode" placeholder="全部" style="width: 130px" clearable>
            <el-option label="全部" value="all" />
            <el-option v-for="node in ataNodes" :key="node" :label="node" :value="node" />
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="filters.status" style="width: 100px">
            <el-option label="全部" value="all" />
            <el-option label="完成" value="COMPLETED" />
            <el-option label="运行错误" value="ERROR" />
            <el-option label="运行中" value="RUNNING" />
          </el-select>
        </el-form-item>

        <el-form-item label="操作">
          <el-select v-model="filters.action" style="width: 120px">
            <el-option label="全部" value="all" />
            <el-option v-for="action in actionTypes" :key="action.value" :label="action.label" :value="action.value" />
          </el-select>
        </el-form-item>

        <el-form-item label="关键词">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索"
            clearable
            style="width: 150px"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleFilterChange">
            <el-icon><Search /></el-icon> 搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshRight /></el-icon> 重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 操作栏 -->
    <div class="ops-action-bar">
      <span style="flex: 1;"></span>
      <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="loadData" title="刷新">
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <!-- 表格 -->
      <el-table
        :data="filteredData"
        v-loading="loading"
        stripe
        style="width: 100%"
        max-height="calc(100vh - 250px)"
        row-key="run_id"
      >
        <el-table-column prop="start_time" label="开始时间" width="180" sortable>
          <template #default="{ row }">
            {{ formatDateTime(row.start_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" width="250" sortable>
          <template #default="{ row }">
            {{ getActionLabel(row.action) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="left" sortable>
          <template #default="{ row }">
            <el-tag
              :type="getStatusType(row.status)"
              size="small"
              class="status-tag clickable"
              @click="showRunResult(row)"
            >
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ata_node" label="执行引擎节点" width="140" align="left">
          <template #default="{ row }">
            <el-tag v-if="row.ata_node" type="primary" size="small">
              {{ row.ata_node }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="结果" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span
              class="message-text"
              :class="{ 'error-text': row.status === 'ERROR' }"
            >
              {{ formatMessage(row.message) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="用户" width="100" align="left" />
        <el-table-column prop="end_time" label="结束时间" width="180" sortable>
          <template #default="{ row }">
            {{ formatDateTime(row.end_time) }}
          </template>
        </el-table-column>
        <el-table-column label="耗时" width="100" align="left" sortable>
          <template #default="{ row }">
            {{ calculateDuration(row.start_time, row.end_time) }}
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handlePageSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 作业运行结果弹窗 -->
    <ExecuteResultDialog
      v-model:visible="runResultDialogVisible"
      :run-id="currentRunId"
      :job-title="currentJobTitle"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { dtsApi } from '../api'
import { translateI18nKey } from '@/utils/i18n'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'

// 筛选条件
const filters = ref({
  day: 1,
  ataNode: 'all',
  status: 'all',
  action: 'all'
})

// 搜索关键词
const searchKeyword = ref('')

// 表格数据
const loading = ref(false)
const tableData = ref([])
const ataNodes = ref([])
const actionTypes = ref([
  { label: '设备连通性检测', value: '#{acm.job.check_conn}' },
  { label: '采集信息', value: '#{acm.job.collect_assert_info}' }
])

// 分页
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

// 运行结果弹窗
const runResultDialogVisible = ref(false)
const currentRunId = ref('')
const currentJobTitle = ref('')

// 过滤后的数据
const filteredData = computed(() => {
  let data = tableData.value

  // 按执行引擎节点筛选
  if (filters.value.ataNode && filters.value.ataNode !== 'all') {
    data = data.filter(item => item.ata_node === filters.value.ataNode)
  }

  // 按搜索关键词筛选
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    data = data.filter(item =>
      item.action?.toLowerCase().includes(keyword) ||
      item.message?.toLowerCase().includes(keyword) ||
      item.username?.toLowerCase().includes(keyword) ||
      item.ata_node?.toLowerCase().includes(keyword)
    )
  }

  // 更新总数
  total.value = data.length

  // 分页
  const start = (currentPage.value - 1) * pageSize.value
  return data.slice(start, start + pageSize.value)
})

onMounted(() => {
  loadData()
})

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const response = await dtsApi.queryData('JAO_LIST_OPERATION_LOG', {
      module: 'acm',
      action: filters.value.action,
      status: filters.value.status,
      day: filters.value.day
    })

    const data = response?.records || []
    tableData.value = data

    // 提取所有的 ata_node
    const nodes = new Set()
    data.forEach(item => {
      if (item.ata_node) {
        nodes.add(item.ata_node)
      }
    })
    ataNodes.value = Array.from(nodes)

    total.value = data.length
    console.log('操作记录数据:', data)
  } catch (error) {
    console.error('加载操作记录失败:', error)
    ElMessage.error('加载操作记录失败')
  } finally {
    loading.value = false
  }
}

// 筛选变化
function handleFilterChange() {
  currentPage.value = 1
  loadData()
}

// 搜索
function handleSearch() {
  currentPage.value = 1
}

// 重置
function handleReset() {
  filters.value = {
    day: 1,
    ataNode: 'all',
    status: 'all',
    action: 'all'
  }
  searchKeyword.value = ''
  currentPage.value = 1
  loadData()
}

// 分页变化
function handlePageChange() {
  // 分页由 computed 处理
}

function handlePageSizeChange() {
  currentPage.value = 1
}

// 显示运行结果弹窗
function showRunResult(row) {
  if (!row.run_id) {
    ElMessage.warning('无法获取运行记录')
    return
  }
  currentRunId.value = row.run_id
  currentJobTitle.value = getActionLabel(row.action)
  runResultDialogVisible.value = true
}

// 格式化日期时间
function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
}

// 获取操作标签
function getActionLabel(action) {
  if (!action) return '-'
  // 使用 i18n 翻译
  return translateI18nKey(action)
}

// 获取状态标签
function getStatusLabel(status) {
  const statusMap = {
    'COMPLETED': '完成',
    'ERROR': '运行错误',
    'RUNNING': '运行中',
    'WAITING': '等待中',
    'FAILED': '失败'
  }
  return statusMap[status] || status || '-'
}

// 获取状态类型
function getStatusType(status) {
  const typeMap = {
    'COMPLETED': 'success',
    'ERROR': 'danger',
    'RUNNING': 'primary',
    'WAITING': 'info',
    'FAILED': 'warning'
  }
  return typeMap[status] || 'info'
}

// 格式化消息
function formatMessage(message) {
  if (!message) return '-'
  try {
    const msgObj = typeof message === 'string' ? JSON.parse(message) : message
    // 优先显示异常消息
    if (msgObj.exception?.message) {
      return msgObj.exception.message
    }
    if (msgObj.message) {
      return msgObj.message
    }
    if (msgObj.msg_id) {
      // 国际化消息 ID 转换
      const msgIdMap = {
        'acm.common.log.conn_failed': '设备信息采集回调失败',
        'acm.common.log.conn_success': '设备连通性检测成功',
        'acm.common.log.collect_success': '设备信息采集成功',
        'acm.common.log.collect_failed': '设备信息采集失败'
      }
      return msgIdMap[msgObj.msg_id] || msgObj.msg_id
    }
    return JSON.stringify(msgObj)
  } catch {
    return message
  }
}

// 计算耗时
function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return '-'
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  const diff = Math.floor((end - start) / 1000)

  if (diff < 0) return '-'

  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  const seconds = diff % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
</script>

<style scoped lang="scss">
.operation-log {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f7fa;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;

  .page-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }
}

.table-section {
  flex: 1;
  margin: 16px;
  padding: 16px;
  background: #fff;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.filter-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;

  .filter-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .filter-label {
    color: #606266;
    font-size: 13px;
    white-space: nowrap;
  }
}

.message-text {
  font-size: 12px;
  color: #606266;

  &.error-text {
    color: #f56c6c;
  }
}

.status-tag {
  &.clickable {
    cursor: pointer;

    &:hover {
      opacity: 0.8;
      transform: scale(1.05);
    }
  }
}

.pagination-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;

  .total-info {
    color: #606266;
    font-size: 13px;
  }
}
</style>
