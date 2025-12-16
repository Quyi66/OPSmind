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
            <el-input :model-value="detail?.title" readonly />
          </el-form-item>
          <el-form-item label="Code">
            <el-input :model-value="detail?.name" readonly />
          </el-form-item>
          <el-form-item label="版本">
            <el-input :model-value="detail?.version" readonly />
          </el-form-item>
          <el-form-item label="创建时间">
            <el-input :model-value="detail?.createdAt" readonly />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 页面列表 -->
      <el-tab-pane label="页面" name="page">
        <el-table
          v-loading="pagesLoading"
          :data="pages"
          border
          stripe
          style="width: 100%"
          max-height="400"
        >
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="title" label="标题" min-width="150">
            <template #default="{ row }">
              {{ row.title || '未定义名称' }}
            </template>
          </el-table-column>
          <el-table-column prop="createdName" label="创建人" width="100" />
          <el-table-column prop="createdAt" label="创建时间" width="180" />
          <el-table-column prop="modifiedName" label="修改人" width="100" />
          <el-table-column prop="modifiedAt" label="修改时间" width="180" />
        </el-table>
      </el-tab-pane>

      <!-- 数据模板 -->
      <el-tab-pane label="数据模板" name="dts">
        <el-table
          v-loading="loading"
          :data="detail?.aouDatasetList || []"
          border
          stripe
          style="width: 100%"
          max-height="400"
        >
          <el-table-column prop="code" label="Code" width="150" />
          <el-table-column prop="name" label="名称" min-width="200" />
          <el-table-column prop="datasource" label="数据源" width="100" />
          <el-table-column prop="type" label="类型" width="80" />
          <el-table-column prop="creatorName" label="创建人" width="100" />
          <el-table-column prop="createdAt" label="创建时间" width="180" />
        </el-table>
      </el-tab-pane>

      <!-- 作业 -->
      <el-tab-pane label="作业" name="jao">
        <el-table
          v-loading="jobsLoading"
          :data="jobs"
          border
          stripe
          style="width: 100%"
          max-height="400"
        >
          <el-table-column type="selection" width="40" />
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
          <el-table-column label="操作" width="120" fixed="right" align="left">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleRunJob(row)" title="运行">
                <i class="fa fa-play"></i>
              </el-button>
              <el-button link type="primary" size="small" @click="handleCopyJob(row)" title="复制">
                <i class="fa fa-copy"></i>
              </el-button>
              <el-button link type="primary" size="small" @click="handleJobHistory(row)" title="历史">
                <i class="fa fa-history"></i>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 数据采集模板 -->
      <el-tab-pane label="数据采集模板" name="dcModel">
        <el-table
          v-loading="loading"
          :data="detail?.aouDcDataModelDTOList || []"
          border
          stripe
          style="width: 100%"
          max-height="400"
        >
          <el-table-column prop="code" label="Code" width="100" />
          <el-table-column prop="title" label="标题" min-width="150" />
          <el-table-column prop="dataMode" label="数据模式" width="100" />
          <el-table-column prop="createBy" label="创建人" width="100" />
          <el-table-column prop="createAt" label="创建时间" width="180" />
        </el-table>
      </el-tab-pane>

      <!-- 作业流 -->
      <el-tab-pane label="作业流" name="jobFlow">
        <el-table
          v-loading="loading"
          :data="detail?.aouFlowDTOList || []"
          border
          stripe
          style="width: 100%"
          max-height="400"
        >
          <el-table-column prop="id" label="ID" width="100" />
          <el-table-column prop="name" label="名称" min-width="200" />
          <el-table-column prop="description" label="描述" min-width="200" />
        </el-table>
        <el-empty v-if="!detail?.aouFlowDTOList?.length && !loading" description="暂无数据" />
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
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {apiService} from '@/core/api'
import * as appletApi from '@/modules/settings/api/applet'
import { translateText } from '@/utils/i18n'
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

// 作业执行相关
const executeDialogVisible = ref(false)
const executeJobMeta = ref(null)
const historyDialogVisible = ref(false)
const historyJobMeta = ref(null)

watch(() => props.modelValue, (val) => {
  if (val && props.applet) {
    activeTab.value = 'basic'
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

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).replace(/\//g, '-')
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
</style>
