<template>
  <div class="ops-page-layout" :class="{ 'middleware-cve-english': currentLocale === 'en-US' }">
    <MiddlewareCveDetail
      v-if="currentView === 'detail'"
      :cve-id="selectedCveId"
      @back="backToList"
    />

    <template v-else>
      <div class="ops-filter-bar mb-3">
        <el-form :model="searchParams" inline size="small" @submit.prevent>
          <el-form-item :label="t('patches.cve.keyword')">
            <el-input
              v-model="searchParams.keyword"
              :placeholder="t('patches.cve.searchIdOrDescription')"
              clearable
              :style="{ width: currentLocale === 'en-US' ? '280px' : '200px' }"
              @keyup.enter="search"
            @clear="search" />
          </el-form-item>
          <el-form-item :label="t('patches.cve.middlewareType')">
            <el-select
              v-model="searchParams.middlewareType"
              style="width: 120px"
              clearable
              :placeholder="t('common.all')" @change="search">
              <el-option :label="t('common.all')" value="" />
              <el-option v-for="type in middlewareTypes" :key="type" :label="type" :value="type" />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('patches.cve.severity')">
            <el-select
              v-model="searchParams.severity"
              style="width: 100px"
              clearable
              :placeholder="t('common.all')" @change="search">
              <el-option value="" :label="t('common.all')" />
              <el-option value="critical" :label="t('patches.catalog.critical')" />
              <el-option value="important" :label="t('patches.catalog.important')" />
              <el-option value="moderate" :label="t('patches.catalog.moderate')" />
              <el-option value="low" :label="t('patches.catalog.low')" />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('patches.catalog.publishDate')">
            <el-date-picker
              v-model="searchParams.startDateObj"
              type="date"
              :placeholder="t('patches.cve.startDate')"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 150px"
              @change="onDateChange"
            />
            <span class="mx-1 text-muted">-</span>
            <el-date-picker
              v-model="searchParams.endDateObj"
              type="date"
              :placeholder="t('patches.cve.endDate')"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 150px"
              @change="onDateChange"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="search">
              <el-icon><Search /></el-icon>
              {{ t('common.search') }}
            </el-button>
            <el-button @click="resetFilters">
              <el-icon><RefreshRight /></el-icon>
              {{ t('common.reset') }}
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="ops-table-wrapper" v-loading="loading">
        <el-table :data="cveList" height="100%" style="width: 100%" @sort-change="handleSortChange">
          <el-table-column prop="cveId" :label="t('patches.linux.vulnId')" width="180" sortable="custom" />
          <el-table-column prop="middlewareType" :label="t('patches.cve.middleware')" width="120">
            <template #default="{ row }">
              <!-- <el-tag size="small" type="info" effect="light">{{ row.middlewareType }}</el-tag> -->
              {{ row.middlewareType }}
            </template>
          </el-table-column>
          <el-table-column prop="severity" :label="t('patches.cve.severity')" width="90">
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
          <el-table-column prop="cvss3Score" :label="t('patches.cve.cvssScore')" :width="currentLocale === 'en-US' ? 144 : 120" sortable="custom">
            <template #default="{ row }">
              <span v-if="toKnownNumber(row.cvss3Score, { max: 10 }) !== null" style="font-weight: 600">
                {{ formatCvssScore(row.cvss3Score) }}
              </span>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="description" :label="t('automation.job.description')" min-width="300" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.description || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="affectedCount" :label="t('patches.cve.affectedVersionCount')" :width="currentLocale === 'en-US' ? 144 : 120" />
          <el-table-column prop="fixedCount" :label="t('patches.cve.fixedVersionCount')" width="120" />
          <el-table-column prop="publicDate" :label="t('patches.catalog.publishDate')" :width="currentLocale === 'en-US' ? 216 : 180" sortable="custom" :class-name="currentLocale === 'en-US' ? 'middleware-date' : undefined">
            <template #default="{ row }">
              <span class="text-muted">{{ formatDate(row.publicDate) }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="t('common.actions')" :width="currentLocale === 'en-US' ? 200 : 170" :class-name="currentLocale === 'en-US' ? 'middleware-actions' : undefined" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="viewDetail(row)">{{ t('automation.records.details') }}</el-button>
              <el-button link type="primary" @click="viewAffectedHosts(row)">{{ t('patches.linux.affectedHostsTitle') }}</el-button>
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
    </template>
    <MiddlewareAffectedHostsDialog
      v-model="affectedHostsVisible"
      :cve-id="affectedHostsCveId"
      :middleware-type="affectedHostsMiddlewareType"
    />
  </div>
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, RefreshRight } from '@element-plus/icons-vue'
import { middlewareCveApi } from '../api'
import { ElMessage } from 'element-plus'
import { formatCvssScore, toKnownNumber } from '@/utils/workspacePresentation'
import MiddlewareCveDetail from '../components/cve/details/MiddlewareCveDetail.vue'
import MiddlewareAffectedHostsDialog from '../components/cve/MiddlewareAffectedHostsDialog.vue'

const route = useRoute()
const router = useRouter()

const currentView = ref('list')
const selectedCveId = ref(null)
const affectedHostsVisible = ref(false)
const affectedHostsCveId = ref('')
const affectedHostsMiddlewareType = ref('')

function viewAffectedHosts(cve) {
  affectedHostsCveId.value = cve.cveId
  affectedHostsMiddlewareType.value = cve.middlewareType || searchParams.middlewareType || ''
  affectedHostsVisible.value = true
}

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
  return date.toLocaleString(currentLocale.value, {
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
    get critical() { return t('patches.catalog.critical') },
    get important() { return t('patches.catalog.important') },
    get moderate() { return t('patches.catalog.moderate') },
    get low() { return t('patches.catalog.low') }
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
  if (!validateDateRange()) return
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
    ElMessage.error(t('patches.cve.queryFailed'))
    cveList.value = []
    pagination.totalElements = 0
  } finally {
    loading.value = false
  }
}

function validateDateRange() {
  if (
    searchParams.startDate &&
    searchParams.endDate &&
    searchParams.startDate > searchParams.endDate
  ) {
    ElMessage.warning(t('patches.cve.invalidDateRange'))
    return false
  }
  return true
}

function search() {
  if (!validateDateRange()) return
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
    searchParams.endDateObj = searchParams.endDate
  }
  search()
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
  () => (route.name === 'patches-middlewareCveList' ? route.query : null),
  query => {
    if (!query) return
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

.middleware-cve-english {
  :deep(th .cell),
  :deep(.middleware-date .cell),
  :deep(.middleware-actions .cell) {
    white-space: nowrap;
  }
}
</style>
