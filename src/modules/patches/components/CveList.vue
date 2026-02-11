<template>
  <div class="ops-page-layout">
    <!-- 详情视图 -->
    <CveDetail v-if="currentView === 'detail'" :cve-id="selectedCveId" @back="backToList" />

    <!-- 列表视图 -->
    <template v-else>
      <!-- 统计卡片区域 -->
      <div class="ops-section mb-3" v-if="statistics" v-loading="statisticsLoading">
        <!-- 头部区域 -->
        <div class="cve-stats-header">
          <div class="cve-stats-title">
            <h3 class="cve-stats-main-title">系统漏洞概览</h3>
          </div>
          <div class="cve-stats-total" @click="filterBySeverity('all')" title="查看全部">
            <div class="cve-stats-total-number">{{ formatNumber(statistics.totalCves) }}</div>
            <div class="cve-stats-total-label">检测到的漏洞总计</div>
          </div>
        </div>

        <!-- 进度条区域 -->
        <div class="cve-stats-progress">
          <div class="cve-progress-bar">
            <div
              class="cve-progress-segment cve-progress-critical"
              :style="{ width: getProgressWidth('critical') }"
              @click="filterBySeverity('critical')"
              title="严重"
            ></div>
            <div
              class="cve-progress-segment cve-progress-important"
              :style="{ width: getProgressWidth('important') }"
              @click="filterBySeverity('important')"
              title="高危"
            ></div>
            <div
              class="cve-progress-segment cve-progress-moderate"
              :style="{ width: getProgressWidth('moderate') }"
              @click="filterBySeverity('moderate')"
              title="中危"
            ></div>
            <div
              class="cve-progress-segment cve-progress-low"
              :style="{ width: getProgressWidth('low') }"
              @click="filterBySeverity('low')"
              title="低危"
            ></div>
          </div>
        </div>

        <!-- 统计数字区域 -->
        <div class="cve-stats-grid">
          <div class="cve-stats-item" @click="filterBySeverity('critical')">
            <div class="cve-stats-content">
              <div class="cve-stats-label">严重</div>
              <div class="cve-stats-value cve-value-critical">
                {{ formatNumber(statistics.bySeverity?.critical) }}
              </div>
              <div class="cve-stats-desc">需立即响应 →</div>
            </div>
          </div>
          <div class="cve-stats-item" @click="filterBySeverity('important')">
            <div class="cve-stats-content">
              <div class="cve-stats-label">高危</div>
              <div class="cve-stats-value cve-value-important">
                {{ formatNumber(statistics.bySeverity?.important) }}
              </div>
              <div class="cve-stats-desc">24小时内修复</div>
            </div>
          </div>
          <div class="cve-stats-item" @click="filterBySeverity('moderate')">
            <div class="cve-stats-content">
              <div class="cve-stats-label">中危</div>
              <div class="cve-stats-value cve-value-moderate">
                {{ formatNumber(statistics.bySeverity?.moderate) }}
              </div>
              <div class="cve-stats-desc">列入计划任务</div>
            </div>
          </div>
          <div class="cve-stats-item" @click="filterBySeverity('low')">
            <div class="cve-stats-content">
              <div class="cve-stats-label">低危</div>
              <div class="cve-stats-value cve-value-low">
                {{ formatNumber(statistics.bySeverity?.low) }}
              </div>
              <div class="cve-stats-desc">建议定期审阅</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 筛选区域 -->
      <div class="ops-filter-bar mb-3">
        <el-form :model="searchParams" inline size="small">
          <el-form-item label="关键字">
            <el-input
              v-model="searchParams.keyword"
              placeholder="CVE 编号或描述关键字"
              clearable
              style="width: 200px"
              @keyup.enter="search"
            />
          </el-form-item>
          <el-form-item label="系统">
            <el-select v-model="searchParams.source" style="width: 100px">
              <el-option value="all" label="全部" />
              <el-option value="redhat" label="Red Hat" />
              <el-option value="kylin" label="麒麟" />
            </el-select>
          </el-form-item>
          <el-form-item label="严重等级">
            <el-select v-model="searchParams.severity" style="width: 100px">
              <el-option value="all" label="全部" />
              <el-option value="critical" label="严重" />
              <el-option value="important" label="高危" />
              <el-option value="moderate" label="中危" />
              <el-option value="low" label="低危" />
            </el-select>
          </el-form-item>
          <el-form-item label="软件包">
            <el-input
              v-model="searchParams.packageName"
              placeholder="包名"
              clearable
              style="width: 120px"
              @keyup.enter="search"
            />
          </el-form-item>
          <el-form-item label="发布日期">
            <el-date-picker
              v-model="searchParams.startDateObj"
              type="date"
              placeholder="开始日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 150px"
              @change="onDateChange"
            />
            <span class="mx-1 text-muted">-</span>
            <el-date-picker
              v-model="searchParams.endDateObj"
              type="date"
              placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 150px"
              @change="onDateChange"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="search">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="resetFilters">
              <el-icon><RefreshRight /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 操作栏 -->
      <!-- <div class="ops-action-bar">
        <span style="flex: 1"></span>
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="loading"
          @click="search"
          title="刷新"
        >
          <el-icon v-show="!loading"><Refresh /></el-icon>
        </el-button>
      </div> -->

      <!-- 数据表格 -->
      <div class="ops-table-wrapper" v-loading="loading">
        <el-table :data="cveList" height="100%" style="width: 100%" @sort-change="handleSortChange">
          <el-table-column prop="cveId" label="CVE 编号" width="180" sortable="custom">
            <!-- <template #default="{ row }">
              <el-link type="primary" :underline="false" @click="viewDetail(row)">
                {{ row.cveId }}
              </el-link>
              <el-link
                v-if="row.webUrl"
                :href="row.webUrl"
                target="_blank"
                type="info"
                :underline="false"
                class="ms-1"
                title="查看官方详情"
              >
                <el-icon><TopRight /></el-icon>
              </el-link>
            </template> -->
          </el-table-column>
          <el-table-column prop="severity" label="严重等级" width="90">
            <template #default="{ row }">
              <el-tag
                :type="getSeverityType(row.severity)"
                :class="['severity-tag', 'is-' + row.severity]"
                size="small"
              >
                {{ getSeverityLabel(row.severity) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="cvss3Score" label="CVSS 评分" width="120" sortable="custom">
            <template #default="{ row }">
              <span v-if="row.cvss3Score" style="font-weight: 600">
                {{ row.cvss3Score.toFixed(1) }}
              </span>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="300" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.description || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="sources" label="系统" width="140">
            <template #default="{ row }">
              <template v-if="row.sources && row.sources.length > 0">
                <el-tag
                  v-for="src in row.sources"
                  :key="src"
                  size="small"
                  class="me-1"
                  effect="light"
                  :type="getSourceType(src)"
                  style="margin-right: 4px"
                >
                  {{ getSourceLabel(src) }}
                </el-tag>
              </template>
              <template v-else-if="row.source">
                <el-tag size="small" effect="light" :type="getSourceType(row.source)">
                  {{ getSourceLabel(row.source) }}
                </el-tag>
              </template>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="publicDate" label="发布日期" width="180" sortable="custom">
            <template #default="{ row }">
              <span class="text-muted">{{ formatDate(row.publicDate) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="viewDetail(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="displayPage"
          v-model:page-size="searchParams.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.totalElements"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Refresh, Search, RefreshRight, TopRight } from '@element-plus/icons-vue'
import { cveApi } from '../api'
import { ElMessage } from 'element-plus'
import CveDetail from './CveDetail.vue'

const route = useRoute()
const router = useRouter()

// 视图状态管理
const currentView = ref('list')
const selectedCveId = ref(null)

// 数据列表
const cveList = ref([])
const statistics = ref(null)
const loading = ref(false)
const statisticsLoading = ref(false)

// 查询参数
const searchParams = reactive({
  source: 'all',
  severity: 'all',
  keyword: '',
  packageName: '',
  startDate: '',
  endDate: '',
  startDateObj: null,
  endDateObj: null,
  page: 0,
  size: 20,
  sortBy: 'publicDate',
  sortDir: 'desc'
})

// 分页信息
const pagination = reactive({
  totalElements: 0,
  totalPages: 0,
  currentPage: 0,
  first: true,
  last: true
})

// 计算属性：显示的页码 (1-based)
const displayPage = computed({
  get: () => searchParams.page + 1,
  set: val => {
    searchParams.page = val - 1
  }
})

// 格式化数字
function formatNumber(num) {
  return (num || 0).toLocaleString()
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return '-'
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

// 获取进度条宽度
function getProgressWidth(severity) {
  if (!statistics.value?.totalCves) return '0%'
  const count = statistics.value.bySeverity?.[severity] || 0
  return `${(count / statistics.value.totalCves) * 100}%`
}

// 获取严重等级样式
function getSeverityType(severity) {
  const typeMap = {
    critical: 'danger',
    important: 'warning',
    moderate: 'primary',
    low: 'info'
  }
  return typeMap[severity] || 'info'
}

// 获取严重等级标签
function getSeverityLabel(severity) {
  const labelMap = {
    critical: '严重',
    important: '高危',
    moderate: '中危',
    low: '低危'
  }
  return labelMap[severity] || severity
}

// 获取数据源样式
function getSourceType(source) {
  const typeMap = {
    redhat: 'danger',
    kylin: 'primary'
  }
  return typeMap[source] || 'info'
}

// 获取数据源标签
function getSourceLabel(source) {
  const labelMap = {
    redhat: 'Red Hat',
    kylin: '麒麟'
  }
  return labelMap[source] || source
}

// 加载统计信息
async function loadStatistics() {
  statisticsLoading.value = true
  try {
    const data = await cveApi.getStatistics()
    statistics.value = data?.data || data
  } catch (error) {
    console.error('加载统计信息失败:', error)
  } finally {
    statisticsLoading.value = false
  }
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const data = await cveApi.getCveList(searchParams)
    const result = data?.data || data

    cveList.value = result.content || []
    pagination.totalElements = result.totalElements || 0
    pagination.totalPages = result.totalPages || 0
    pagination.currentPage = result.number || 0
    pagination.first = result.first !== false
    pagination.last = result.last !== false
  } catch (error) {
    console.error('CVE列表查询失败:', error)
    ElMessage.error('查询失败，请稍后重试')
    cveList.value = []
    pagination.totalElements = 0
  } finally {
    loading.value = false
  }
}

// 执行搜索
function search() {
  searchParams.page = 0
  loadData()
}

// 重置筛选
function resetFilters() {
  searchParams.source = 'all'
  searchParams.severity = 'all'
  searchParams.keyword = ''
  searchParams.packageName = ''
  searchParams.startDate = ''
  searchParams.endDate = ''
  searchParams.startDateObj = null
  searchParams.endDateObj = null
  searchParams.page = 0
  searchParams.sortBy = 'publicDate'
  searchParams.sortDir = 'desc'
  search()
}

// 通过卡片点击筛选严重等级
function filterBySeverity(severity) {
  searchParams.severity = severity
  search()
}

// 日期变化处理
function onDateChange() {
  searchParams.startDate = searchParams.startDateObj || ''
  searchParams.endDate = searchParams.endDateObj || ''

  // 处理日期成对逻辑
  if (searchParams.startDate && !searchParams.endDate) {
    const startDate = new Date(searchParams.startDate)
    const autoEndDate = new Date(startDate)
    autoEndDate.setFullYear(autoEndDate.getFullYear() + 1)
    searchParams.endDate = autoEndDate.toISOString().split('T')[0]
  }
}

// 分页变化处理
function handleSizeChange(size) {
  searchParams.size = size
  searchParams.page = 0
  loadData()
}

function handlePageChange(page) {
  searchParams.page = page - 1
  loadData()
}

// 处理排序变化
function handleSortChange({ prop, order }) {
  if (order) {
    searchParams.sortBy = prop
    searchParams.sortDir = order === 'ascending' ? 'asc' : 'desc'
  } else {
    searchParams.sortBy = 'publicDate'
    searchParams.sortDir = 'desc'
  }
  search()
}

// 查看详情
function viewDetail(cve) {
  const cveId = cve.cveId
  selectedCveId.value = cveId
  currentView.value = 'detail'
  router.replace({
    query: {
      ...route.query,
      view: 'detail',
      cveId
    }
  })
}

// 返回列表
function backToList() {
  currentView.value = 'list'
  selectedCveId.value = null
  const nextQuery = { ...route.query }
  delete nextQuery.view
  delete nextQuery.cveId
  router.replace({ query: nextQuery })
}

// 初始化
onMounted(() => {
  loadStatistics()
  search()
})

watch(
  () => route.query,
  (query) => {
    if (query.view === 'detail' && query.cveId) {
      selectedCveId.value = query.cveId
      currentView.value = 'detail'
      return
    }
    currentView.value = 'list'
    selectedCveId.value = null
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.cve-stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.cve-stats-main-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.cve-stats-total {
  text-align: right;
  transition: opacity 0.2s;
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
}

.cve-stats-total-number {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  line-height: 1;
}

.cve-stats-total-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.cve-stats-progress {
  margin-bottom: 20px;
}

.cve-progress-bar {
  display: flex;
  height: 10px;
  background-color: #f5f7fa;
  border-radius: 5px;
  overflow: hidden;
}

.cve-progress-segment {
  height: 100%;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    filter: brightness(1.1);
    transform: scaleY(1.2);
  }
}

.cve-progress-critical {
  background-color: #f53f3f;
}
.cve-progress-important {
  background-color: #ff7d00;
}
.cve-progress-moderate {
  background-color: #ffc72e;
}
.cve-progress-low {
  background-color: #165dff;
}

.cve-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.cve-stats-item {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  transition: all 0.2s;
  border-radius: 4px;
  background: #fcfcfc;
  border-left: 4px solid transparent;
  cursor: pointer;

  &:hover {
    background-color: #f5f7fa;
  }
}

.cve-stats-item:nth-child(1) {
  border-left-color: #f53f3f;
}
.cve-stats-item:nth-child(2) {
  border-left-color: #ff7d00;
}
.cve-stats-item:nth-child(3) {
  border-left-color: #ffc72e;
}
.cve-stats-item:nth-child(4) {
  border-left-color: #165dff;
}

.cve-stats-content {
  flex: 1;
}

.cve-stats-label {
  font-size: 13px;
  color: #606266;
  margin-bottom: 4px;
}

.cve-stats-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}

.cve-value-critical {
  color: #f53f3f;
}
.cve-value-important {
  color: #ff7d00;
}
.cve-value-moderate {
  color: #ffc72e;
}
.cve-value-low {
  color: #165dff;
}

// 严重等级标签自定义颜色
// 严重等级标签自定义颜色: 样式已移至 src/styles/biz-tags.scss

.cve-stats-desc {
  font-size: 11px;
  color: #c0c4cc;
  margin-top: 4px;
}

// 响应式
@media (max-width: 1200px) {
  .cve-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .cve-stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
