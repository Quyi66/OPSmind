<template>
  <el-dialog
    v-model="visible"
    title="应用详情"
    width="1200px"
    destroy-on-close
    @close="handleClose"
  >
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <!-- 基本信息 -->
      <el-tab-pane label="基本信息" name="basic">
        <el-form label-width="100px" v-loading="loading">
          <el-form-item label="名称">
            <el-input :model-value="translateText(detail?.title)" readonly />
          </el-form-item>
          <el-form-item label="Code">
            <el-input :model-value="detail?.name" readonly />
          </el-form-item>
          <el-form-item label="版本">
            <el-input :model-value="detail?.version" readonly />
          </el-form-item>
          <el-form-item label="创建时间">
            <el-input :model-value="formatDateTime(detail?.createdAt)" readonly />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 页面列表 -->
      <el-tab-pane label="页面" name="page">
        <div class="tab-search-bar">
          <el-input
            v-model="pagesSearch"
            placeholder="搜索标题..."
            clearable
            style="width: 200px"
            size="small"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <el-table
          v-loading="pagesLoading"
          :data="paginatedPages"
          stripe
          style="width: 100%"
          max-height="calc(100vh - 480px)"
        >
          <el-table-column prop="title" label="标题" min-width="150">
            <template #default="{ row }">
              {{ translateText(row.title) || '未定义名称' }}
            </template>
          </el-table-column>
          <el-table-column prop="createdName" label="创建人" width="100" />
          <el-table-column prop="createdAt" label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="modifiedName" label="修改人" width="100" />
          <el-table-column prop="modifiedAt" label="修改时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.modifiedAt) }}
            </template>
          </el-table-column>
        </el-table>
        <div class="ops-pagination-wrapper" v-if="filteredPages.length > 0">
          <el-pagination
            v-model:current-page="pagesPagination.page"
            v-model:page-size="pagesPagination.size"
            :total="filteredPages.length"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            background
            size="small"
          />
        </div>
      </el-tab-pane>

      <!-- 数据模板 -->
      <el-tab-pane label="数据模板" name="dts">
        <div class="tab-search-bar">
          <el-input
            v-model="datasetsSearch"
            placeholder="搜索Code或名称..."
            clearable
            style="width: 200px"
            size="small"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <el-table
          v-loading="loading"
          :data="paginatedDatasets"
          stripe
          style="width: 100%"
          max-height="calc(100vh - 480px)"
        >
          <el-table-column prop="code" label="Code" min-width="200" />
          <el-table-column prop="name" label="名称" min-width="200" />
          <el-table-column prop="datasource" label="数据源" width="100" />
          <el-table-column prop="type" label="类型" width="80" />
          <el-table-column prop="creatorName" label="创建人" width="100" />
          <el-table-column prop="createdAt" label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.createdAt) }}
            </template>
          </el-table-column>
        </el-table>
        <div class="ops-pagination-wrapper" v-if="filteredDatasets.length > 0">
          <el-pagination
            v-model:current-page="datasetsPagination.page"
            v-model:page-size="datasetsPagination.size"
            :total="filteredDatasets.length"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            background
            size="small"
          />
        </div>
      </el-tab-pane>

      <!-- 作业 -->
      <el-tab-pane label="作业" name="jao">
        <div class="tab-search-bar">
          <el-input
            v-model="jobsSearch"
            placeholder="搜索作业标题..."
            clearable
            style="width: 200px"
            size="small"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <el-table
          v-loading="jobsLoading"
          :data="paginatedJobs"
          stripe
          style="width: 100%"
          max-height="calc(100vh - 480px)"
        >
          <!-- <el-table-column type="selection" width="40" /> -->
          <el-table-column prop="title" label="作业" min-width="150">
            <template #default="{ row }">
              <div>{{ translateJobText(row.title) }}</div>
              <div class="job-desc" v-if="row.description">{{ translateJobText(row.description) }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="type" label="类型" width="130">
            <template #default="{ row }">
              <span class="job-type">
                <i :class="getJobTypeIcon(row.type)"></i>
                {{ getJobTypeLabel(row.type) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="appletCode" label="所属应用" width="100" />
          <el-table-column prop="updatedBy" label="修改人" width="80" />
          <el-table-column prop="updatedAt" label="修改时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.updatedAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="lastRunTime" label="上次运行时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.lastRunTime) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right" align="left">
            <template #default="{ row }">
              <el-button text type="primary" size="small" @click="handleRunJob(row)" title="运行">
                运行
              </el-button>
              <el-button text type="primary" size="small" @click="handleCopyJob(row)" title="复制">
                复制
              </el-button>
              <el-button text type="primary" size="small" @click="handleJobHistory(row)" title="历史">
                历史
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="ops-pagination-wrapper" v-if="filteredJobs.length > 0">
          <el-pagination
            v-model:current-page="jobsPagination.page"
            v-model:page-size="jobsPagination.size"
            :total="filteredJobs.length"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            background
            size="small"
          />
        </div>
      </el-tab-pane>

      <!-- 数据采集模板 -->
      <el-tab-pane label="数据采集模板" name="dcModel">
        <div class="tab-search-bar">
          <el-input
            v-model="dcModelsSearch"
            placeholder="搜索Code或标题..."
            clearable
            style="width: 200px"
            size="small"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <el-table
          v-loading="loading"
          :data="paginatedDcModels"
          stripe
          style="width: 100%"
          max-height="calc(100vh - 480px)"
        >
          <el-table-column prop="code" label="Code" min-width="200" />
          <el-table-column prop="title" label="标题" min-width="150" />
          <el-table-column prop="dataMode" label="数据模式" width="100" />
          <el-table-column prop="createBy" label="创建人" width="100" />
          <el-table-column prop="createAt" label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.createAt) }}
            </template>
          </el-table-column>
        </el-table>
        <div class="ops-pagination-wrapper" v-if="filteredDcModels.length > 0">
          <el-pagination
            v-model:current-page="dcModelsPagination.page"
            v-model:page-size="dcModelsPagination.size"
            :total="filteredDcModels.length"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            background
            size="small"
          />
        </div>
      </el-tab-pane>

      <!-- 作业流 -->
      <el-tab-pane label="作业流" name="jobFlow">
        <div class="tab-search-bar">
          <el-input
            v-model="flowsSearch"
            placeholder="搜索名称..."
            clearable
            style="width: 200px"
            size="small"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <el-table
          v-loading="loading"
          :data="paginatedFlows"
          stripe
          style="width: 100%"
          max-height="calc(100vh - 480px)"
        >
          <el-table-column prop="name" label="流程模版名" min-width="200" />
          <el-table-column prop="stepIds" label="步骤" min-width="100">
            <template #default="{ row }">
              {{ row.stepIds.length }}
            </template>
          </el-table-column>
          <el-table-column prop="createdBy" label="创建人" width="150" />
          <el-table-column prop="createdAt" label="创建时间" width="180" />
        </el-table>
        <div class="ops-pagination-wrapper" v-if="filteredFlows.length > 0">
          <el-pagination
            v-model:current-page="flowsPagination.page"
            v-model:page-size="flowsPagination.size"
            :total="filteredFlows.length"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            background
            size="small"
          />
        </div>
        <el-empty v-if="!filteredFlows.length && !loading" description="暂无数据" />
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>

    <!-- 作业执行对话框 -->
    <ExecuteJobDialog
      v-if="executeDialogVisible"
      v-model:visible="executeDialogVisible"
      :job-id="executeJobMeta?.id || ''"
      :job-type="executeJobMeta?.type || ''"
      :fallback-config-json="executeJobMeta?.configJson || ''"
    />

    <!-- 作业历史对话框 -->
    <ExecuteHistoryDialog
      v-if="historyDialogVisible"
      v-model:visible="historyDialogVisible"
      :job-id="historyJobMeta?.id || ''"
      :job-title="historyJobMeta?.title || ''"
    />
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import {apiService} from '@/core/api'
import * as appletApi from '@/modules/settings/api/applet'
import { translateText, formatDateTime } from '@/utils/i18n'
import ExecuteJobDialog from '@/modules/automation/components/job/JobListView/ExecuteJobDialog.vue'
import ExecuteHistoryDialog from '@/modules/automation/components/job/JobListView/ExecuteHistoryDialog.vue'

const props = defineProps({
  modelValue: Boolean,
  applet: Object
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const activeTab = ref('basic')
const loading = ref(false)
const pagesLoading = ref(false)
const jobsLoading = ref(false)

const detail = ref(null)
const pages = ref([])
const jobs = ref([])

// 搜索关键词
const pagesSearch = ref('')
const datasetsSearch = ref('')
const jobsSearch = ref('')
const dcModelsSearch = ref('')
const flowsSearch = ref('')

// 分页状态
const pagesPagination = reactive({ page: 1, size: 10 })
const datasetsPagination = reactive({ page: 1, size: 10 })
const jobsPagination = reactive({ page: 1, size: 10 })
const dcModelsPagination = reactive({ page: 1, size: 10 })
const flowsPagination = reactive({ page: 1, size: 10 })

// 计算各数据源
const datasetList = computed(() => detail.value?.aouDatasetList || [])
const dcModelList = computed(() => detail.value?.aouDcDataModelDTOList || [])
const flowList = computed(() => detail.value?.aouFlowDTOList || [])

// 过滤后的数据
const filteredPages = computed(() => {
  const keyword = pagesSearch.value.trim().toLowerCase()
  if (!keyword) return pages.value
  return pages.value.filter(item => {
    const title = translateText(item.title) || ''
    return title.toLowerCase().includes(keyword)
  })
})

const filteredDatasets = computed(() => {
  const keyword = datasetsSearch.value.trim().toLowerCase()
  if (!keyword) return datasetList.value
  return datasetList.value.filter(item => {
    return (item.code || '').toLowerCase().includes(keyword) ||
           (item.name || '').toLowerCase().includes(keyword)
  })
})

const filteredJobs = computed(() => {
  const keyword = jobsSearch.value.trim().toLowerCase()
  if (!keyword) return jobs.value
  return jobs.value.filter(item => {
    const title = translateText(item.title) || ''
    const desc = translateText(item.description) || ''
    return title.toLowerCase().includes(keyword) || desc.toLowerCase().includes(keyword)
  })
})

const filteredDcModels = computed(() => {
  const keyword = dcModelsSearch.value.trim().toLowerCase()
  if (!keyword) return dcModelList.value
  return dcModelList.value.filter(item => {
    return (item.code || '').toLowerCase().includes(keyword) ||
           (item.title || '').toLowerCase().includes(keyword)
  })
})

const filteredFlows = computed(() => {
  const keyword = flowsSearch.value.trim().toLowerCase()
  if (!keyword) return flowList.value
  return flowList.value.filter(item => {
    return (item.name || '').toLowerCase().includes(keyword) ||
           (item.description || '').toLowerCase().includes(keyword)
  })
})

// 搜索时重置分页
watch(pagesSearch, () => { pagesPagination.page = 1 })
watch(datasetsSearch, () => { datasetsPagination.page = 1 })
watch(jobsSearch, () => { jobsPagination.page = 1 })
watch(dcModelsSearch, () => { dcModelsPagination.page = 1 })
watch(flowsSearch, () => { flowsPagination.page = 1 })

// 计算分页后的数据
const paginatedPages = computed(() => {
  const start = (pagesPagination.page - 1) * pagesPagination.size
  return filteredPages.value.slice(start, start + pagesPagination.size)
})

const paginatedDatasets = computed(() => {
  const start = (datasetsPagination.page - 1) * datasetsPagination.size
  return filteredDatasets.value.slice(start, start + datasetsPagination.size)
})

const paginatedJobs = computed(() => {
  const start = (jobsPagination.page - 1) * jobsPagination.size
  return filteredJobs.value.slice(start, start + jobsPagination.size)
})

const paginatedDcModels = computed(() => {
  const start = (dcModelsPagination.page - 1) * dcModelsPagination.size
  return filteredDcModels.value.slice(start, start + dcModelsPagination.size)
})

const paginatedFlows = computed(() => {
  const start = (flowsPagination.page - 1) * flowsPagination.size
  return filteredFlows.value.slice(start, start + flowsPagination.size)
})

// 作业执行相关
const executeDialogVisible = ref(false)
const executeJobMeta = ref(null)
const historyDialogVisible = ref(false)
const historyJobMeta = ref(null)

watch(() => props.modelValue, (val) => {
  if (val && props.applet) {
    activeTab.value = 'basic'
    // 重置分页和搜索
    pagesPagination.page = 1
    datasetsPagination.page = 1
    jobsPagination.page = 1
    dcModelsPagination.page = 1
    flowsPagination.page = 1
    pagesSearch.value = ''
    datasetsSearch.value = ''
    jobsSearch.value = ''
    dcModelsSearch.value = ''
    flowsSearch.value = ''
    loadDetail()
  }
})

async function loadDetail() {
  if (!props.applet?.id) return

  loading.value = true
  try {
    const response = await appletApi.getAppletDetail(props.applet.id)
    detail.value = response?.data || response
  } catch (error) {
    console.error('Failed to load applet detail:', error)
  } finally {
    loading.value = false
  }
}

async function loadPages() {
  if (!props.applet?.name || pages.value.length > 0) return

  pagesLoading.value = true
  try {
    const response = await appletApi.getPages(props.applet.name)
    const data = response?.data || response
    pages.value = data?.content || data || []
  } catch (error) {
    console.error('Failed to load pages:', error)
  } finally {
    pagesLoading.value = false
  }
}

async function loadJobs(forceRefresh = false) {
  if (!props.applet?.name) return
  if (!forceRefresh && jobs.value.length > 0) return

  jobsLoading.value = true
  try {
    const response = await appletApi.getJobs(props.applet.name)
    jobs.value = response?.data || response || []
  } catch (error) {
    console.error('Failed to load jobs:', error)
  } finally {
    jobsLoading.value = false
  }
}

function handleTabChange(tabName) {
  if (tabName === 'page') {
    loadPages()
  } else if (tabName === 'jao') {
    loadJobs()
  }
}

// 翻译作业文本（处理 #{key} 格式）
function translateJobText(text) {
  return translateText(text)
}

function getJobTypeLabel(type) {
  const labels = {
    'script': '脚本作业',
    'command': '命令作业',
    'rest': 'REST作业',
    'template': '模板'
  }
  return labels[type] || type
}

function getJobTypeIcon(type) {
  const icons = {
    'script': 'fa fa-file-code',
    'command': 'fa fa-terminal',
    'rest': 'fa fa-globe',
    'template': 'fa fa-cube'
  }
  return icons[type] || 'fa fa-cog'
}


function handleRunJob(job) {
  if (!job?.id) {
    ElMessage.warning('无法获取作业信息')
    return
  }
  executeJobMeta.value = {
    id: job.id,
    type: job.type ?? '',
    configJson: job.configJson ?? ''
  }
  executeDialogVisible.value = true
}

async function handleCopyJob(job) {
  if (!job?.id) return
  try {
    await apiService.get(`/jao/api/jao/jobs/clone/${job.id}?cacheBuster=${Date.now()}`)
    ElMessage.success('复制成功')
    // 刷新作业列表
    loadJobs(true)
  } catch (error) {
    console.error('Failed to copy job:', error)
    ElMessage.error('复制失败')
  }
}

function handleJobHistory(job) {
  if (!job?.id) {
    ElMessage.warning('无法获取作业信息')
    return
  }
  historyJobMeta.value = {
    id: job.id,
    title: job.title || ''
  }
  historyDialogVisible.value = true
}

function handleClose() {
  visible.value = false
  // 清空数据
  detail.value = null
  pages.value = []
  jobs.value = []
}
</script>

<style scoped lang="scss">
:deep(.el-tabs__content) {
  padding: 10px 0;
}

.tab-search-bar {
  margin-bottom: 12px;
}

.job-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.job-type {
  display: inline-flex;
  align-items: center;
  gap: 4px;

  i {
    font-size: 14px;
    color: #409eff;
  }
}

.ops-pagination-wrapper {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
