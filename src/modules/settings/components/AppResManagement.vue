<template>
  <div class="ops-page-layout">
    <!-- 标签页导航 -->
    <el-tabs v-model="activeTab" class="ops-tabs" @tab-change="handleTabChange">
      <el-tab-pane name="page">
        <template #label>
          <span><i class="fa fa-file-alt"></i> 页面</span>
        </template>

        <!-- 页面列表 -->
        <div class="resource-section with-sidebar">
          <!-- 应用选择器侧边栏 -->
          <div class="ops-sidebar-nav">
            <div class="sidebar-title">所属应用</div>
            <div
              class="ops-sidebar-item"
              :class="{ 'is-active': selectedPageApplet === '' }"
              @click="selectPageApplet('')"
            >
              全部应用
            </div>
            <div
              v-for="app in applets"
              :key="app.id"
              class="ops-sidebar-item"
              :class="{ 'is-active': selectedPageApplet === app.name }"
              @click="selectPageApplet(app.name)"
            >
              {{ translateTitle(app.title) || app.name }}
            </div>
          </div>

          <!-- 主内容 -->
          <div class="main-content">
            <!-- 筛选区 -->
            <div class="ops-filter-bar">
              <el-form :inline="true" size="small">
                <el-form-item label="关键词">
                  <el-input v-model="pageSearch" placeholder="页面标题/Code" clearable style="width: 200px" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="handlePageSearch">
                    <el-icon><Search /></el-icon> 搜索
                  </el-button>
                  <el-button @click="handlePageReset">
                    <el-icon><RefreshRight /></el-icon> 重置
                  </el-button>
                </el-form-item>
              </el-form>
            </div>

            <!-- 操作栏 -->
            <div class="ops-action-bar">
              <el-button size="small" :disabled="selectedPages.length < 1" @click="openMoveDialog('page')">
                <i class="fa fa-sign-in-alt"></i> 移动页面
              </el-button>
              <span style="flex: 1;"></span>
              <el-button class="toolbar-icon-btn" circle size="small" :loading="pageLoading" @click="loadPages" title="刷新">
                <el-icon v-show="!pageLoading"><Refresh /></el-icon>
              </el-button>
            </div>

            <div class="ops-table-wrapper">
              <el-table
                v-loading="pageLoading"
                :data="paginatedPages"
                stripe
                style="width: 100%"
                max-height="calc(100vh - 400px)"
                @selection-change="handlePageSelectionChange"
              >
                <el-table-column type="selection" width="55" />
                <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip>
                  <template #default="{ row }">
                    {{ translateTitle(row.title) }}
                  </template>
                </el-table-column>
                <el-table-column prop="id" label="Code" width="120" show-overflow-tooltip />
                <el-table-column prop="appletCode" label="所属应用" width="120" />
                <el-table-column prop="createdBy" label="创建人" width="100" />
                <el-table-column prop="createdAt" label="创建时间" width="180">
                  <template #default="{ row }">
                    {{ formatDateTime(row.createdAt) }}
                  </template>
                </el-table-column>
              </el-table>
            </div>
            <div class="ops-pagination-wrapper">
              <el-pagination
                v-model:current-page="pageCurrentPage"
                v-model:page-size="pagePageSize"
                :total="filteredPages.length"
                :page-sizes="[10, 20, 50, 100]"
                layout="total, sizes, prev, pager, next, jumper"
                background
              />
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane name="dataset">
        <template #label>
          <span><i class="fa fa-database"></i> 数据集</span>
        </template>

        <!-- 数据集列表 -->
        <div class="resource-section with-sidebar">
          <!-- 应用选择器侧边栏 -->
          <div class="ops-sidebar-nav">
            <div class="sidebar-title">所属应用</div>
            <div
              class="ops-sidebar-item"
              :class="{ 'is-active': selectedDatasetApplet === '' }"
              @click="selectDatasetApplet('')"
            >
              全部应用
            </div>
            <div
              v-for="app in applets"
              :key="app.id"
              class="ops-sidebar-item"
              :class="{ 'is-active': selectedDatasetApplet === app.name }"
              @click="selectDatasetApplet(app.name)"
            >
              {{ translateTitle(app.title) || app.name }}
            </div>
          </div>

          <!-- 主内容 -->
          <div class="main-content">
            <!-- 筛选区 -->
            <div class="ops-filter-bar">
              <el-form :inline="true" size="small">
                <el-form-item label="关键词">
                  <el-input v-model="datasetSearch" placeholder="数据集名称/Code" clearable style="width: 200px" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="handleDatasetSearch">
                    <el-icon><Search /></el-icon> 搜索
                  </el-button>
                  <el-button @click="handleDatasetReset">
                    <el-icon><RefreshRight /></el-icon> 重置
                  </el-button>
                </el-form-item>
              </el-form>
            </div>

            <!-- 操作栏 -->
            <div class="ops-action-bar">
              <el-button size="small" :disabled="selectedDatasets.length < 1" @click="openMoveDialog('dataset')">
                <i class="fa fa-sign-in-alt"></i> 移动数据集
              </el-button>
              <span style="flex: 1;"></span>
              <el-button class="toolbar-icon-btn" circle size="small" :loading="datasetLoading" @click="loadDatasets" title="刷新">
                <el-icon v-show="!datasetLoading"><Refresh /></el-icon>
              </el-button>
            </div>

            <div class="ops-table-wrapper">
              <el-table
                v-loading="datasetLoading"
                :data="paginatedDatasets"
                stripe
                style="width: 100%"
                max-height="calc(100vh - 400px)"
                @selection-change="handleDatasetSelectionChange"
              >
                <el-table-column type="selection" width="55" />
                <el-table-column prop="name" label="标题" min-width="150" show-overflow-tooltip />
                <el-table-column prop="code" label="Code" min-width="150" show-overflow-tooltip />
                <el-table-column prop="appletCode" label="所属应用" width="120" />
                <el-table-column prop="datasource" label="数据源" width="140" />
                <el-table-column prop="createdBy" label="创建人" width="100" />
                <el-table-column prop="createdAt" label="创建时间" width="180">
                  <template #default="{ row }">
                    {{ formatDateTime(row.createdAt) }}
                  </template>
                </el-table-column>
              </el-table>
            </div>
            <div class="ops-pagination-wrapper">
              <el-pagination
                v-model:current-page="datasetCurrentPage"
                v-model:page-size="datasetPageSize"
                :total="filteredDatasets.length"
                :page-sizes="[10, 20, 50, 100]"
                layout="total, sizes, prev, pager, next, jumper"
                background
              />
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane name="job">
        <template #label>
          <span><i class="fa fa-tasks"></i> 作业</span>
        </template>

        <!-- 作业列表 -->
        <div class="resource-section with-sidebar">
          <!-- 应用选择器侧边栏 -->
          <div class="ops-sidebar-nav">
            <div class="sidebar-title">所属应用</div>
            <div
              class="ops-sidebar-item"
              :class="{ 'is-active': selectedJobApplet === '' }"
              @click="selectJobApplet('')"
            >
              全部应用
            </div>
            <div
              v-for="app in applets"
              :key="app.id"
              class="ops-sidebar-item"
              :class="{ 'is-active': selectedJobApplet === app.name }"
              @click="selectJobApplet(app.name)"
            >
              {{ translateTitle(app.title) || app.name }}
            </div>
          </div>

          <!-- 主内容 -->
          <div class="main-content">
            <!-- 筛选区 -->
            <div class="ops-filter-bar">
              <el-form :inline="true" size="small">
                <el-form-item label="关键词">
                  <el-input v-model="jobSearch" placeholder="作业标题/Code" clearable style="width: 200px" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="handleJobSearch">
                    <el-icon><Search /></el-icon> 搜索
                  </el-button>
                  <el-button @click="handleJobReset">
                    <el-icon><RefreshRight /></el-icon> 重置
                  </el-button>
                </el-form-item>
              </el-form>
            </div>

            <!-- 操作栏 -->
            <div class="ops-action-bar">
              <el-button size="small" :disabled="selectedJobs.length < 1" @click="openMoveDialog('job')">
                <i class="fa fa-sign-in-alt"></i> 移动作业
              </el-button>
              <span style="flex: 1;"></span>
              <el-button class="toolbar-icon-btn" circle size="small" :loading="jobLoading" @click="loadJobs" title="刷新">
                <el-icon v-show="!jobLoading"><Refresh /></el-icon>
              </el-button>
            </div>

            <div class="ops-table-wrapper">
              <el-table
                v-loading="jobLoading"
                :data="paginatedJobs"
                stripe
                style="width: 100%"
                max-height="calc(100vh - 400px)"
                @selection-change="handleJobSelectionChange"
              >
                <el-table-column type="selection" width="55" />
                <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip>
                  <template #default="{ row }">
                    {{ translateTitle(row.title) }}
                  </template>
                </el-table-column>
                <el-table-column prop="id" label="Code" width="120" show-overflow-tooltip />
                <el-table-column prop="appletCode" label="所属应用" width="120" />
                <el-table-column prop="type" label="类型" width="100" />
                <el-table-column prop="createdBy" label="创建人" width="100" />
                <el-table-column prop="lastRunTime" label="最后运行" width="180">
                  <template #default="{ row }">
                    {{ formatDateTime(row.lastRunTime) }}
                  </template>
                </el-table-column>
              </el-table>
            </div>
            <div class="ops-pagination-wrapper">
              <el-pagination
                v-model:current-page="jobCurrentPage"
                v-model:page-size="jobPageSize"
                :total="filteredJobs.length"
                :page-sizes="[10, 20, 50, 100]"
                layout="total, sizes, prev, pager, next, jumper"
                background
              />
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 移动对话框 -->
    <el-dialog
      v-model="moveDialogVisible"
      :title="moveDialogTitle"
      width="400px"
      destroy-on-close
    >
      <div class="move-dialog-content">
        <p>请选择目标应用：</p>
        <el-select v-model="targetAppletCode" placeholder="选择应用" style="width: 100%">
          <el-option
            v-for="app in applets"
            :key="app.id"
            :label="translateTitle(app.title) || app.name"
            :value="app.name"
          />
        </el-select>
        <p class="move-tip" v-if="moveResourceCount > 0">
          将选定的 <strong>{{ moveResourceCount }}</strong> 个资源移动到应用
          <strong class="text-primary">{{ targetAppletTitle }}</strong>
        </p>
      </div>
      <template #footer>
        <el-button @click="moveDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!targetAppletCode" :loading="moveLoading" @click="handleMove">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import { apiService } from '@/core/api'
import { translateText, formatDateTime } from '@/utils/i18n'

const activeTab = ref('page')

// 应用列表
const applets = ref([])
const selectedPageApplet = ref('')
const selectedDatasetApplet = ref('')
const selectedJobApplet = ref('')

// 页面数据
const pageLoading = ref(false)
const pages = ref([])
const pageSearch = ref('')
const pageAppliedSearch = ref('')
const pageCurrentPage = ref(1)
const pagePageSize = ref(10)
const selectedPages = ref([])

// 数据集数据
const datasetLoading = ref(false)
const datasets = ref([])
const datasetSearch = ref('')
const datasetAppliedSearch = ref('')
const datasetCurrentPage = ref(1)
const datasetPageSize = ref(10)
const selectedDatasets = ref([])

// 作业数据
const jobLoading = ref(false)
const jobs = ref([])
const jobSearch = ref('')
const jobAppliedSearch = ref('')
const jobCurrentPage = ref(1)
const jobPageSize = ref(10)
const selectedJobs = ref([])

// 移动对话框
const moveDialogVisible = ref(false)
const moveDialogTitle = ref('')
const moveResourceType = ref('')
const targetAppletCode = ref('')
const moveLoading = ref(false)

// 翻译标题
function translateTitle(title) {
  return translateText(title)
}

// 搜索
function handlePageSearch() {
  pageAppliedSearch.value = pageSearch.value
  pageCurrentPage.value = 1
}

function handlePageReset() {
  pageSearch.value = ''
  pageAppliedSearch.value = ''
  pageCurrentPage.value = 1
}

function handleDatasetSearch() {
  datasetAppliedSearch.value = datasetSearch.value
  datasetCurrentPage.value = 1
}

function handleDatasetReset() {
  datasetSearch.value = ''
  datasetAppliedSearch.value = ''
  datasetCurrentPage.value = 1
}

function handleJobSearch() {
  jobAppliedSearch.value = jobSearch.value
  jobCurrentPage.value = 1
}

function handleJobReset() {
  jobSearch.value = ''
  jobAppliedSearch.value = ''
  jobCurrentPage.value = 1
}

// 过滤
const filteredPages = computed(() => {
  let result = pages.value
  if (selectedPageApplet.value) {
    result = result.filter(p => p.appletCode === selectedPageApplet.value)
  }
  if (pageAppliedSearch.value) {
    const keyword = pageAppliedSearch.value.toLowerCase()
    result = result.filter(p =>
      p.title?.toLowerCase().includes(keyword) ||
      p.id?.toLowerCase().includes(keyword)
    )
  }
  return result
})

const filteredDatasets = computed(() => {
  let result = datasets.value
  if (selectedDatasetApplet.value) {
    result = result.filter(d => d.appletCode === selectedDatasetApplet.value)
  }
  if (datasetAppliedSearch.value) {
    const keyword = datasetAppliedSearch.value.toLowerCase()
    result = result.filter(d =>
      d.name?.toLowerCase().includes(keyword) ||
      d.code?.toLowerCase().includes(keyword)
    )
  }
  return result
})

const filteredJobs = computed(() => {
  let result = jobs.value
  if (selectedJobApplet.value) {
    result = result.filter(j => j.appletCode === selectedJobApplet.value)
  }
  if (jobAppliedSearch.value) {
    const keyword = jobAppliedSearch.value.toLowerCase()
    result = result.filter(j =>
      j.title?.toLowerCase().includes(keyword) ||
      j.id?.toLowerCase().includes(keyword)
    )
  }
  return result
})

// 分页
const paginatedPages = computed(() => {
  const start = (pageCurrentPage.value - 1) * pagePageSize.value
  return filteredPages.value.slice(start, start + pagePageSize.value)
})

const paginatedDatasets = computed(() => {
  const start = (datasetCurrentPage.value - 1) * datasetPageSize.value
  return filteredDatasets.value.slice(start, start + datasetPageSize.value)
})

const paginatedJobs = computed(() => {
  const start = (jobCurrentPage.value - 1) * jobPageSize.value
  return filteredJobs.value.slice(start, start + jobPageSize.value)
})

// 计算移动资源数量
const moveResourceCount = computed(() => {
  if (moveResourceType.value === 'page') return selectedPages.value.length
  if (moveResourceType.value === 'dataset') return selectedDatasets.value.length
  if (moveResourceType.value === 'job') return selectedJobs.value.length
  return 0
})

// 目标应用标题
const targetAppletTitle = computed(() => {
  const app = applets.value.find(a => a.name === targetAppletCode.value)
  return app ? (translateTitle(app.title) || app.name) : ''
})

// 加载应用列表
async function loadApplets() {
  try {
    const response = await apiService.get(`/udp/api/udp/applets?isPaging=true&cacheBuster=${Date.now()}`)
    applets.value = response?.data || response || []
  } catch (error) {
    console.error('Failed to load applets:', error)
  }
}

// 选择应用过滤
function selectPageApplet(appName) {
  selectedPageApplet.value = appName
  pageCurrentPage.value = 1
}

function selectDatasetApplet(appName) {
  selectedDatasetApplet.value = appName
  datasetCurrentPage.value = 1
}

function selectJobApplet(appName) {
  selectedJobApplet.value = appName
  jobCurrentPage.value = 1
}

// 表格选择变化
function handlePageSelectionChange(selection) {
  selectedPages.value = selection
}

function handleDatasetSelectionChange(selection) {
  selectedDatasets.value = selection
}

function handleJobSelectionChange(selection) {
  selectedJobs.value = selection
}

// 加载页面
async function loadPages() {
  pageLoading.value = true
  try {
    const response = await apiService.get(`/udp/api/udp/pages?isPaging=true&page=0&size=1000&appletCode=&cacheBuster=${Date.now()}`)
    pages.value = response?.data?.content || response?.content || response?.data || []
  } catch (error) {
    console.error('Failed to load pages:', error)
    ElMessage.error('加载页面列表失败')
  } finally {
    pageLoading.value = false
  }
}

// 加载数据集
async function loadDatasets() {
  datasetLoading.value = true
  try {
    const response = await apiService.get(`/dts/api/dts/datasets?cacheBuster=${Date.now()}`)
    datasets.value = response?.data || response || []
  } catch (error) {
    console.error('Failed to load datasets:', error)
    ElMessage.error('加载数据集列表失败')
  } finally {
    datasetLoading.value = false
  }
}

// 加载作业
async function loadJobs() {
  jobLoading.value = true
  try {
    const response = await apiService.get(`/jao/api/jao/jobs/app?cacheBuster=${Date.now()}`)
    jobs.value = response?.data || response || []
  } catch (error) {
    console.error('Failed to load jobs:', error)
    ElMessage.error('加载作业列表失败')
  } finally {
    jobLoading.value = false
  }
}

// 打开移动对话框
function openMoveDialog(type) {
  moveResourceType.value = type
  targetAppletCode.value = ''

  if (type === 'page') {
    moveDialogTitle.value = '移动页面'
  } else if (type === 'dataset') {
    moveDialogTitle.value = '移动数据集'
  } else if (type === 'job') {
    moveDialogTitle.value = '移动作业'
  }

  moveDialogVisible.value = true
}

// 执行移动
async function handleMove() {
  if (!targetAppletCode.value) {
    ElMessage.warning('请选择目标应用')
    return
  }

  const type = moveResourceType.value
  let ids = []
  let apiUrl = ''
  let resourceName = ''
  let loadFn = null

  if (type === 'page') {
    ids = selectedPages.value.map(p => p.id)
    apiUrl = `/udp/api/udp/pages/move/${targetAppletCode.value}`
    resourceName = '页面'
    loadFn = loadPages
  } else if (type === 'dataset') {
    ids = selectedDatasets.value.map(d => d.id)
    apiUrl = `/dts/api/dts/datasets/move/${targetAppletCode.value}`
    resourceName = '数据集'
    loadFn = loadDatasets
  } else if (type === 'job') {
    ids = selectedJobs.value.map(j => j.id)
    apiUrl = `/jao/api/jao/jobs/move/${targetAppletCode.value}`
    resourceName = '作业'
    loadFn = loadJobs
  }

  try {
    await ElMessageBox.confirm(
      `确定将选定的 ${ids.length} 个${resourceName}移动到应用 "${targetAppletTitle.value}"？`,
      `移动${resourceName}`,
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }

  moveLoading.value = true
  try {
    await apiService.put(apiUrl, ids)
    ElMessage.success(`${resourceName}移动成功`)
    moveDialogVisible.value = false

    // 清空选择并刷新列表
    if (type === 'page') selectedPages.value = []
    if (type === 'dataset') selectedDatasets.value = []
    if (type === 'job') selectedJobs.value = []

    if (loadFn) loadFn()
  } catch (error) {
    console.error('Failed to move:', error)
    ElMessage.error(`${resourceName}移动失败`)
  } finally {
    moveLoading.value = false
  }
}

// 标签页切换
function handleTabChange(tab) {
  if (tab === 'page' && pages.value.length === 0) {
    loadPages()
  } else if (tab === 'dataset' && datasets.value.length === 0) {
    loadDatasets()
  } else if (tab === 'job' && jobs.value.length === 0) {
    loadJobs()
  }
}

onMounted(() => {
  loadApplets()
  loadPages()
})
</script>

<style scoped lang="scss">
.ops-tabs {
  :deep(.el-tabs__content) {
    padding: 0;
  }

  :deep(.el-tabs__header) {
    margin-bottom: 12px;
  }
}

.resource-section {
  &.with-sidebar {
    display: flex;
    gap: 16px;
  }
}

.sidebar-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  padding: 8px 12px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 8px;
}

.main-content {
  flex: 1;
  min-width: 0;
}

.move-dialog-content {
  p {
    margin: 0 0 12px;
    color: #606266;
  }

  .move-tip {
    margin-top: 16px;
    padding: 12px;
    background: #f4f4f5;
    border-radius: 4px;

    strong {
      color: #303133;
    }

    .text-primary {
      color: #409eff;
    }
  }
}
</style>
