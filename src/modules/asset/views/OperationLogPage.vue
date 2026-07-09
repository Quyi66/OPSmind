<template>
  <div class="ops-page-layout">
    <div class="content-view-area">
      <!-- 筛选区 -->
      <div class="ops-filter-bar">
        <el-form :inline="true" size="small">
          <el-form-item label="时间范围">
            <el-select v-model="filters.day" style="width: 95px">
              <el-option label="今天" :value="1" />
              <el-option label="近 3 天" :value="3" />
              <el-option label="近 7 天" :value="7" />
              <el-option label="近 30 天" :value="30" />
            </el-select>
          </el-form-item>

          <el-form-item label="执行状态">
            <el-select v-model="filters.status" style="width: 105px">
              <el-option label="全部" value="all" />
              <el-option label="运行成功" value="COMPLETED" />
              <el-option label="运行异常" value="ERROR" />
              <el-option label="正在运行" value="RUNNING" />
            </el-select>
          </el-form-item>

          <el-form-item label="操作类型">
            <el-select v-model="filters.action" style="width: 155px">
              <el-option label="全部操作" value="all" />
              <el-option
                v-for="action in actionTypes"
                :key="action.value"
                :label="action.label"
                :value="action.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="引擎节点">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索执行引擎..."
              clearable
              style="width: 170px"
              @keyup.enter="handleFilterChange"
            />
          </el-form-item>

          <el-form-item class="filter-actions">
            <el-button type="primary" @click="handleFilterChange">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="handleReset">
              <el-icon><RefreshRight /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 操作栏 -->
      <div class="ops-action-bar">
        <span style="flex: 1"></span>
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="loading"
          @click="loadData"
          title="刷新"
        >
          <el-icon v-show="!loading"><Refresh /></el-icon>
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="ops-table-wrapper card-table">
        <el-table
          :data="filteredData"
          v-loading="loading"
          height="100%"
          row-key="run_id"
          row-class-name="modern-table-row"
        >
          <!-- 1. 开始时间 -->
          <el-table-column prop="start_time" label="开始执行时间" width="180" sortable>
            <template #default="{ row }">
              <span>{{ formatDateTime(row.start_time) }}</span>
            </template>
          </el-table-column>

          <!-- 2. 操作 -->
          <el-table-column prop="action" label="操作任务" min-width="180" sortable>
            <template #default="{ row }">
              <span>{{ getActionLabel(row.action) }}</span>
            </template>
          </el-table-column>

          <!-- 3. 状态 (Clickable tags with glow) -->
          <el-table-column prop="status" label="执行状态" width="105" align="left" sortable>
            <template #default="{ row }">
              <el-tag
                :type="getStatusType(row.status)"
                size="small"
                class="status-tag clickable"
                @click="showRunResult(row)"
              >
                <span
                  class="status-indicator-dot"
                  :class="`is-${row.status?.toLowerCase()}`"
                ></span>
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <!-- 4. 引擎节点 -->
          <el-table-column prop="ata_node" label="执行引擎节点" width="150" align="left">
            <template #default="{ row }">
              <el-tag
                v-if="row.ata_node"
                type="info"
                size="small"
                effect="plain"
                class="node-badge"
              >
                {{ row.ata_node }}
              </el-tag>
              <span v-else class="placeholder-dash">-</span>
            </template>
          </el-table-column>

          <!-- 5. 结果消息 -->
          <el-table-column
            prop="message"
            label="诊断采集结果反馈"
            min-width="240"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <span :class="{ 'error-text': row.status === 'ERROR' }">
                {{ formatMessage(row.message) }}
              </span>
            </template>
          </el-table-column>

          <!-- 6. 用户 -->
          <el-table-column prop="username" label="操作人" width="100" align="left" />

          <!-- 7. 结束时间 -->
          <el-table-column prop="end_time" label="结束时间" width="180" sortable>
            <template #default="{ row }">
              <span>{{ formatDateTime(row.end_time) }}</span>
            </template>
          </el-table-column>

          <!-- 8. 耗时 -->
          <el-table-column label="执行耗时" width="105" align="left" sortable>
            <template #default="{ row }">
              <span>{{ calculateDuration(row.start_time, row.end_time) }}</span>
            </template>
          </el-table-column>

          <!-- 9. 操作 (定位设备) -->
          <el-table-column label="操作" width="100" align="center" fixed="right">
            <template #default="{ row }">
              <el-link
                v-if="extractIpFromRow(row)"
                type="primary"
                underline="never"
                size="small"
                @click="goToDevice(extractIpFromRow(row))"
              >
                定位设备
              </el-link>
              <span v-else class="placeholder-dash">-</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

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
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { operationLogApi } from '../api'
import { translateI18nKey } from '@/utils/i18n'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { formatDateTime } from '../utils/helpers'

const route = useRoute()
const router = useRouter()

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
  { label: '信息数据采集', value: '#{acm.job.collect_assert_info}' }
])

// 分页
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

// 运行结果弹窗
const runResultDialogVisible = ref(false)
const currentRunId = ref('')
const currentJobTitle = ref('')

// 表格数据（后端分页）
const filteredData = computed(() => {
  return tableData.value
})

function normalizeDay(value) {
  const parsed = Number(value)
  return [1, 3, 7, 30].includes(parsed) ? parsed : 1
}

function buildRouteQuery() {
  const query = {}

  if (filters.value.day !== 1) {
    query.day = String(filters.value.day)
  }

  if (filters.value.status !== 'all') {
    query.status = filters.value.status
  }

  if (filters.value.action !== 'all') {
    query.action = filters.value.action
  }

  if (searchKeyword.value.trim()) {
    query.keyword = searchKeyword.value.trim()
  }

  return query
}

function getQueryRunId(query) {
  return typeof query.runId === 'string' && query.runId ? query.runId : ''
}

function isSameQuery(query) {
  return JSON.stringify(route.query || {}) === JSON.stringify(query)
}

function syncRouteQuery() {
  const query = buildRouteQuery()
  if (isSameQuery(query)) {
    applyRouteQuery(query)
    return
  }

  router.replace({
    path: '/acm/log',
    query
  })
}

function applyRouteQuery(query) {
  filters.value = {
    ...filters.value,
    day: normalizeDay(query.day),
    ataNode: 'all',
    status: typeof query.status === 'string' ? query.status : 'all',
    action: typeof query.action === 'string' ? query.action : 'all'
  }
  searchKeyword.value = typeof query.keyword === 'string' ? query.keyword : ''
  currentPage.value = 1
  loadData()
}

function openRunResultByQuery(query) {
  const runId = getQueryRunId(query)
  if (!runId) return

  currentRunId.value = runId
  currentJobTitle.value =
    typeof query.action === 'string' && query.action ? getActionLabel(query.action) : '运行结果'
  runResultDialogVisible.value = true
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const response = await operationLogApi.getOperationLogs(
      {
        module: 'cmdb',
        action: filters.value.action,
        status: filters.value.status,
        day: filters.value.day
      },
      {
        page: currentPage.value,
        size: pageSize.value,
        filter: searchKeyword.value.trim() ? `ata_node:*${searchKeyword.value.trim()}*` : undefined
      }
    )

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

    total.value = response?.total || 0
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
  syncRouteQuery()
}

// 搜索输入防抖
let searchDebounceTimer = null
watch(searchKeyword, newVal => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  if (!newVal) {
    handleFilterChange()
  } else {
    searchDebounceTimer = setTimeout(() => {
      handleFilterChange()
    }, 300)
  }
})

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
  syncRouteQuery()
}

// 分页变化
function handlePageChange() {
  loadData()
}

function handlePageSizeChange() {
  currentPage.value = 1
  loadData()
}

watch(
  () => route.query,
  query => {
    applyRouteQuery(query)
    openRunResultByQuery(query)
  },
  { immediate: true }
)

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


// 获取操作标签
function getActionLabel(action) {
  if (!action) return '-'
  const actionLabelMap = {
    asset_import: '资产导入'
  }
  if (actionLabelMap[action]) return actionLabelMap[action]
  return translateI18nKey(action)
}

// 获取状态标签
function getStatusLabel(status) {
  const statusMap = {
    COMPLETED: '完成',
    ERROR: '运行错误',
    RUNNING: '运行中',
    WAITING: '等待中',
    FAILED: '失败'
  }
  return statusMap[status] || status || '-'
}

// 获取状态类型
function getStatusType(status) {
  const typeMap = {
    COMPLETED: 'success',
    ERROR: 'danger',
    RUNNING: 'primary',
    WAITING: 'info',
    FAILED: 'warning'
  }
  return typeMap[status] || 'info'
}

// 格式化消息
function formatMessage(message) {
  if (!message) return '-'
  try {
    const msgObj = typeof message === 'string' ? JSON.parse(message) : message
    if (msgObj.exception?.message) {
      return msgObj.exception.message
    }
    if (msgObj.message) {
      return msgObj.message
    }
    if (msgObj.msg_id) {
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

// 提取日志行中的 IP
function extractIpFromRow(row) {
  if (row.ip) return row.ip
  if (row.IP) return row.IP
  if (row.message) {
    const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/
    const match = String(row.message).match(ipRegex)
    if (match) return match[0]
  }
  return ''
}

// 定位跳转设备
function goToDevice(ip) {
  if (!ip) return
  router.push({
    path: '/acm/info',
    query: { ip }
  })
}
</script>

<style scoped lang="scss">
.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 4px;

  &.clickable {
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      opacity: 0.85;
      transform: scale(1.03);
    }
  }

  .status-indicator-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    display: inline-block;

    &.is-completed {
      background-color: var(--el-color-success);
    }
    &.is-error,
    &.is-failed {
      background-color: var(--el-color-danger);
    }
    &.is-running {
      background-color: var(--el-color-primary);
    }
    &.is-waiting {
      background-color: var(--el-color-info);
    }
  }
}

.node-badge {
  border-radius: 4px;
}

.error-text {
  color: var(--el-color-danger);
}
</style>
