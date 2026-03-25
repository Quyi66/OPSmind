<template>
  <div class="ops-page-layout">
    <MiddlewareCveDetail v-if="currentView === 'detail'" :cve-id="selectedCveId" @back="backToList" />

    <template v-else>
      <div class="ops-filter-bar mb-3">
        <el-form :model="searchParams" inline size="small">
          <el-form-item label="关键字">
            <el-input
              v-model="searchParams.keyword"
              placeholder="CVE 编号或描述"
              clearable
              style="width: 200px"
              @keyup.enter="search"
            />
          </el-form-item>
          <el-form-item label="中间件类型">
            <el-select v-model="searchParams.middlewareType" style="width: 120px" clearable placeholder="全部">
              <el-option label="全部" value="" />
              <el-option
                v-for="type in middlewareTypes"
                :key="type"
                :label="type"
                :value="type"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="严重等级">
            <el-select v-model="searchParams.severity" style="width: 100px" clearable placeholder="全部">
              <el-option value="" label="全部" />
              <el-option value="critical" label="严重" />
              <el-option value="important" label="重要" />
              <el-option value="moderate" label="中等" />
              <el-option value="low" label="低危" />
            </el-select>
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

      <div class="ops-table-wrapper" v-loading="loading">
        <el-table :data="cveList" height="100%" style="width: 100%" @sort-change="handleSortChange">
          <el-table-column prop="cveId" label="CVE 编号" width="180" sortable="custom" />
          <el-table-column prop="middlewareType" label="中间件" width="120">
            <template #default="{ row }">
              <!-- <el-tag size="small" type="info" effect="light">{{ row.middlewareType }}</el-tag> -->
               {{ row.middlewareType }}
            </template>
          </el-table-column>
          <el-table-column prop="severity" label="严重等级" width="90">
            <template #default="{ row }">
              <el-tag
                :type="getSeverityType(row.severity)"
                :class="['severity-tag', getSeverityClass(row.severity)]"
                size="small"
              >
                {{ row.severityLabel || getSeverityLabel(row.severity) }}
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
          <el-table-column prop="affectedCount" label="影响版本数" width="120" />
          <el-table-column prop="fixedCount" label="修复版本数" width="120" />
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
    </template>  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, RefreshRight } from '@element-plus/icons-vue'
import { middlewareCveApi } from '../api'
import { ElMessage } from 'element-plus'
import MiddlewareCveDetail from './MiddlewareCveDetail.vue'

const route = useRoute()
const router = useRouter()

const currentView = ref('list')
const selectedCveId = ref(null)

const cveList = ref([])
const middlewareTypes = ref([])
const loading = ref(false)

const searchParams = reactive({
  middlewareType: '',
  severity: '',
  keyword: '',
  startDate: '',
  endDate: '',
  startDateObj: null,
  endDateObj: null,
  page: 0,
  size: 20,
  sortBy: 'publicDate',
  sortDir: 'desc'
})

const pagination = reactive({
  totalElements: 0,
  totalPages: 0,
  currentPage: 0
})

const displayPage = computed({
  get: () => searchParams.page + 1,
  set: val => {
    searchParams.page = val - 1
  }
})

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

function normalizeSeverityKey(severity) {
  const raw = String(severity || '').trim()
  if (!raw) return ''
  const lower = raw.toLowerCase()
  if (lower === 'critical') return 'critical'
  if (lower === 'important') return 'important'
  if (lower === 'moderate') return 'moderate'
  if (lower === 'low') return 'low'
  return ''
}

function getSeverityClass(severity) {
  const key = normalizeSeverityKey(severity)
  return key ? `is-${key}` : ''
}



function getSeverityType(severity) {
  const key = normalizeSeverityKey(severity)
  const typeMap = {
    critical: 'danger',
    important: 'warning',
    moderate: 'primary',
    low: 'info'
  }
  return typeMap[key] || 'info'
}

function getSeverityLabel(severity) {
  const key = normalizeSeverityKey(severity)
  const labelMap = {
    critical: '严重',
    important: '重要',
    moderate: '中等',
    low: '低危'
  }
  return labelMap[key] || severity
}

async function loadMiddlewareTypes() {
  try {
    const data = await middlewareCveApi.getMiddlewareTypes()
    middlewareTypes.value = data?.data || data || []
  } catch (error) {
    console.error('加载中间件类型失败:', error)
  }
}

async function loadData() {
  loading.value = true
  try {
    const apiParams = { ...searchParams }
    if (!apiParams.middlewareType) delete apiParams.middlewareType
    if (!apiParams.severity) delete apiParams.severity
    const data = await middlewareCveApi.getList(apiParams)
    const result = data?.data || data

    cveList.value = result.content || []
    pagination.totalElements = result.totalElements || 0
    pagination.totalPages = result.totalPages || 0
    pagination.currentPage = result.number || 0
  } catch (error) {
    console.error('CVE列表查询失败:', error)
    ElMessage.error('查询失败，请稍后重试')
    cveList.value = []
    pagination.totalElements = 0
  } finally {
    loading.value = false
  }
}

function search() {
  searchParams.page = 0
  loadData()
}

function resetFilters() {
  searchParams.middlewareType = ''
  searchParams.severity = ''
  searchParams.keyword = ''
  searchParams.startDate = ''
  searchParams.endDate = ''
  searchParams.startDateObj = null
  searchParams.endDateObj = null
  searchParams.page = 0
  searchParams.sortBy = 'publicDate'
  searchParams.sortDir = 'desc'
  search()
}

function onDateChange() {
  searchParams.startDate = searchParams.startDateObj || ''
  searchParams.endDate = searchParams.endDateObj || ''
  if (searchParams.startDate && !searchParams.endDate) {
    const startDate = new Date(searchParams.startDate)
    const autoEndDate = new Date(startDate)
    autoEndDate.setFullYear(autoEndDate.getFullYear() + 1)
    searchParams.endDate = autoEndDate.toISOString().split('T')[0]
  }
}

function handleSizeChange(size) {
  searchParams.size = size
  searchParams.page = 0
  loadData()
}

function handlePageChange(page) {
  searchParams.page = page - 1
  loadData()
}

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

function backToList() {
  currentView.value = 'list'
  selectedCveId.value = null
  const nextQuery = { ...route.query }
  delete nextQuery.view
  delete nextQuery.cveId
  router.replace({ query: nextQuery })
}

onMounted(() => {
  loadMiddlewareTypes()
  search()
})

watch(
  () => route.query,
  query => {
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
:deep(.el-date-editor) {
  height: 32px !important;
}
</style>
