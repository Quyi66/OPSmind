<template>
  <div class="stats-view">
    <header class="stats-header">
      <div class="tabs-wrapper">
        <el-tabs v-model="activeTab" class="stats-tabs">
          <el-tab-pane name="recent">
            <template #label>
              <span class="tab-label">
                最近30天执行作业
                <el-icon
                  v-if="activeTab === 'recent'"
                  class="tab-refresh"
                  :class="{ 'is-loading': contentLoading }"
                  @click.stop="handleRefresh"
                >
                  <RefreshRight />
                </el-icon>
              </span>
            </template>
          </el-tab-pane>
          <el-tab-pane name="summary">
            <template #label>
              <span class="tab-label">
                作业运行次数
                <el-icon
                  v-if="activeTab === 'summary'"
                  class="tab-refresh"
                  :class="{ 'is-loading': contentLoading }"
                  @click.stop="handleRefresh"
                >
                  <RefreshRight />
                </el-icon>
              </span>
            </template>
          </el-tab-pane>
        </el-tabs>
      </div>
    </header>

    <div v-loading="contentLoading" class="stats-content">
      <div v-if="activeTab === 'recent'" class="stats-tab-pane">
        <div v-if="tableData.length" class="stats-table-wrapper">
          <el-table
            :data="tableData"
            stripe
          >
            <el-table-column label="作业标题" min-width="240" fixed>
              <template #default="{ row }">
                <div class="job-title-cell">
                  {{ row.job_title || '-' }}
                </div>
              </template>
            </el-table-column>

            <el-table-column
              v-for="date in dateColumns"
              :key="date"
              :label="date"
              width="80"
              align="center"
            >
              <template #default="{ row }">
                <div
                  v-if="row.dates[date]"
                  class="count-cell"
                  :class="getHeatmapClass(row.dates[date])"
                >
                  {{ row.dates[date] }}
                </div>
                <div v-else class="count-cell count-empty">-</div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <el-empty
          v-else-if="!contentLoading"
          description="暂无统计数据"
        />
      </div>

      <div v-else class="stats-tab-pane">
        <div v-if="filteredSummary.length" class="summary-pane">
          <div class="summary-controls">
            <el-input
              v-model="summaryQuery"
              clearable
              size="small"
              class="summary-search"
              placeholder="搜索作业"
              prefix-icon="Search"
            />
          </div>

          <div class="summary-table-wrapper">
            <el-table
              ref="summaryTableRef"
              :data="filteredSummary"
              stripe
              :height="summaryTableHeight"
              class="summary-table"
            >
              <el-table-column prop="job_title" label="作业" min-width="240" show-overflow-tooltip>
                <template #default="{ row }">
                  <span class="summary-job-title">{{ row.job_title || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column
                prop="run_count"
                label="次数"
                width="120"
                align="right"
                sortable
                :sort-orders="['descending', 'ascending']"
                :default-sort="{ prop: 'run_count', order: 'descending' }"
              >
                <template #default="{ row }">
                  <span class="summary-count">{{ row.run_count }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <el-empty
          v-else-if="!contentLoading"
          description="暂无统计数据"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { RefreshRight, Search } from '@element-plus/icons-vue'
import * as jaoApi from '@/modules/automation/api/jao'

const statsLoading = ref(false)
const summaryLoading = ref(false)
const rawData = ref([])
const tableData = ref([])
const dateColumns = ref([])
const activeTab = ref('recent')
const summaryQuery = ref('')
const summaryFetched = ref(false)
const summaryRows = ref([])
const summaryTableRef = ref(null)
const summaryTableHeight = ref('800px')

onMounted(() => {
  fetchStats()
})

async function fetchStats() {
  statsLoading.value = true
  try {
    const response = await jaoApi.fetchJobStats()
    const data = response?.data || response
    rawData.value = data.records || []
    processData()
  } catch (error) {
    ElMessage.error(error?.message || '获取统计数据失败')
  } finally {
    statsLoading.value = false
  }
}

function handleRefresh() {
  if (contentLoading.value) return
  if (activeTab.value === 'recent') {
    fetchStats()
  } else {
    fetchRunCounts(true)
  }
}

function processData() {
  if (!rawData.value.length) {
    tableData.value = []
    dateColumns.value = []
    return
  }

  // 提取所有唯一的日期并排序
  const dates = new Set()
  rawData.value.forEach(item => {
    if (item.start_date) {
      dates.add(item.start_date)
    }
  })
  dateColumns.value = Array.from(dates).sort()

  // 按作业分组数据
  const jobMap = new Map()
  rawData.value.forEach(item => {
    const jobTitle = item.job_title || '未命名作业'
    if (!jobMap.has(jobTitle)) {
      jobMap.set(jobTitle, {
        job_title: jobTitle,
        job_id: item.job_id,
        dates: {}
      })
    }
    if (item.start_date) {
      jobMap.get(jobTitle).dates[item.start_date] = item.run_count
    }
  })

  // 转换为数组并按总执行次数排序
  tableData.value = Array.from(jobMap.values())
    .map(job => {
      const dateEntries = Object.entries(job.dates)
      const totalCount = dateEntries.reduce((sum, [, count]) => sum + count, 0)
      const activeDays = dateEntries.length
      const avgPerDay = activeDays ? totalCount / activeDays : 0
      const lastDate = dateEntries.reduce((max, [date]) => (date > max ? date : max), '')

      return {
        ...job,
        totalCount,
        activeDays,
        avgPerDay,
        lastDate
      }
    })
    .sort((a, b) => b.totalCount - a.totalCount)
}

function getHeatmapClass(count) {
  // 根据执行次数返回不同的热力图颜色类
  if (count >= 20) return 'heat-5'
  if (count >= 15) return 'heat-4'
  if (count >= 10) return 'heat-3'
  if (count >= 5) return 'heat-2'
  if (count >= 1) return 'heat-1'
  return ''
}

async function fetchRunCounts(force = false) {
  if (summaryLoading.value || (!force && summaryFetched.value)) return
  summaryLoading.value = true
  try {
    const response = await jaoApi.fetchJobRunCounts()
    const data = response?.data || response
    summaryRows.value = (data.records || []).map(item => ({
      job_id: item.job_id,
      job_title: item.job_title || '未命名作业',
      run_count: Number(item.run_count) || 0
    }))
    summaryFetched.value = true
  } catch (error) {
    ElMessage.error(error?.message || '获取运行次数失败')
  } finally {
    summaryLoading.value = false
  }
}

watch(activeTab, tab => {
  if (tab === 'summary' && !summaryFetched.value) {
    fetchRunCounts()
  }
})

const contentLoading = computed(() =>
  activeTab.value === 'recent' ? statsLoading.value : summaryLoading.value
)

const filteredSummary = computed(() => {
  const keyword = summaryQuery.value.trim().toLowerCase()
  const baseRows = keyword
    ? summaryRows.value.filter(row => row.job_title.toLowerCase().includes(keyword))
    : summaryRows.value

  return [...baseRows].sort((a, b) => b.run_count - a.run_count)
})
</script>

<style scoped>
.stats-view {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px);
  max-width: 100%;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.stats-header {
  padding: 12px 20px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.tabs-wrapper {
  flex: 0 0 auto;
  max-width: 520px;
}

.stats-tabs {
  width: auto;
}

.stats-tabs :deep(.el-tabs__header) {
  margin: 0;
}

.stats-tabs :deep(.el-tabs__nav-wrap) {
  padding: 0 4px;
}

.stats-tabs :deep(.el-tabs__item) {
  padding: 0 16px !important;
  font-size: 14px;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tab-refresh {
  cursor: pointer;
  color: #6b7280;
  transition: color 0.2s ease;
}

.tab-refresh:hover {
  color: #1d4ed8;
}

.tab-refresh.is-loading {
  animation: spin 1s linear infinite;
  pointer-events: none;
  color: #1d4ed8;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.stats-content {
  flex: 1;
  padding: 16px 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.stats-tab-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.stats-table-wrapper {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.stats-table-wrapper :deep(.el-table) {
  font-size: 12px;
}

.stats-table-wrapper :deep(.el-table th) {
  padding: 8px 0;
  font-size: 12px;
}

.stats-table-wrapper :deep(.el-table td) {
  padding: 6px 0;
}

.stats-table-wrapper :deep(.el-table .cell) {
  padding: 0 8px;
}

.job-title-cell {
  font-weight: 500;
  color: #1e293b;
  word-break: break-all;
  font-size: 12px;
  line-height: 1.4;
}

.count-cell {
  padding: 6px;
  border-radius: 3px;
  font-weight: 600;
  font-size: 11px;
  transition: all 0.2s;
}

.count-empty {
  color: #d1d5db;
}

.heat-1 {
  background-color: #dbeafe;
  color: #1e40af;
}

.heat-2 {
  background-color: #93c5fd;
  color: #1e3a8a;
}

.heat-3 {
  background-color: #60a5fa;
  color: #1e3a8a;
}

.heat-4 {
  background-color: #3b82f6;
  color: #fff;
}

.heat-5 {
  background-color: #1d4ed8;
  color: #fff;
}

.count-cell:not(.count-empty):hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.summary-pane {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.summary-controls {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding-bottom: 12px;
}

.summary-search {
  width: 240px;
}

.summary-table-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.summary-table {
  font-size: 13px;
}

.summary-table :deep(.el-table__header) {
  font-weight: 600;
}

.summary-table :deep(.el-table__body) {
  font-size: 13px;
}

.summary-table :deep(.el-table td),
.summary-table :deep(.el-table th) {
  border: none;
}

.summary-table :deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}

.summary-job-title {
  color: #1e293b;
  line-height: 1.5;
}

.summary-count {
  font-weight: 600;
  color: #1e40af;
  font-size: 14px;
}
</style>
