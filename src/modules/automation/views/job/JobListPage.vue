<template>
  <div class="ops-page-layout" style="flex-direction: row; padding: 0; gap: 0;">
    <aside class="ops-sidebar-nav">
      <div class="ops-sidebar-header">
        <el-input v-model="appStr" style="width: 120px" placeholder="请输入" :prefix-icon="Search"
          @input="filterApplets()" />
      </div>
      <el-scrollbar class="ops-sidebar-content">
        <button v-for="applet in appOptions" :key="applet.name || 'all'" class="ops-sidebar-item"
          :class="{ 'is-active': currentApp.name === applet.name }" @click="selectApplet(applet)" v-show="applet.show">
          <span>{{ applet.title }}</span>
        </button>
      </el-scrollbar>
    </aside>

    <section class="ops-page-layout" style="border-radius: 0; flex: 1;">
      <!-- 筛选栏 -->
      <div class="ops-filter-bar">
        <el-form :model="filters" inline size="small">
          <el-form-item label="类型">
            <el-select v-model="filters.jobType" style="width: 120px;" placeholder="全部类型">
              <el-option label="全部类型" value="all" />
              <el-option v-for="option in jobTypeOptions" :key="option.value" :label="option.label"
                :value="option.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="关键词">
            <el-input v-model="filters.keyword" placeholder="搜索作业标题、描述..." clearable style="width: 200px;">
              <template #prefix>
                <el-icon>
                  <Search />
                </el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="handleSearch">
              <el-icon>
                <Search />
              </el-icon>
              搜索
            </el-button>
            <el-button @click="handleReset">
              <el-icon>
                <RefreshRight />
              </el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 操作栏 -->
      <div class="ops-action-bar">
        <el-dropdown @command="handleCreateJob">
          <el-button type="primary" size="small">
            <el-icon>
              <Plus />
            </el-icon>
            新建作业
            <el-icon class="el-icon--right">
              <ArrowDown />
            </el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="option in createJobOptions" :key="option.value" :command="option.value">
                <i :class="['fa', option.icon, 'dropdown-icon']"></i>
                {{ option.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button size="small" :disabled="!selectedIds.length" @click="handleDeleteJobs" type="danger">
          <el-icon>
            <Delete />
          </el-icon>
          删除
        </el-button>
        <span style="flex: 1;"></span>
        <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="reloadJobs" title="刷新">
          <el-icon v-show="!loading">
            <Refresh />
          </el-icon>
        </el-button>
      </div>

      <el-alert v-if="error" :title="error" type="error" :closable="false" style="margin-bottom: 12px;" />

      <!-- 表格区域 -->
      <div class="ops-table-wrapper">
        <el-table v-loading="loading" :data="displayedJobs" @selection-change="handleSelectionChange"
          @sort-change="handleSortChange" max-height="calc(100vh - 240px)"
          :default-sort="{ prop: 'updatedAt', order: 'descending' }">
          <el-table-column type="selection" width="48" />
          <el-table-column prop="title" label="作业" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">
              <!-- <span class="job-title__text" style="color: #0077EE; cursor: pointer;" @click="handleEditJob(row)">
                {{ translateText(row.title) || '-' }}
              </span> -->
              <el-button text type="primary" @click="handleEditJob(row)">
                {{ translateText(row.title) || '-' }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">
              {{ translateText(row.description) || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="类型" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.type" size="small" :type="typeTagType(row.type)" effect="plain" class="job-type-tag">
                <i :class="['fa', typeIcon(row.type)]" />
                <span>{{ typeLabel(row.type) }}</span>
              </el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="appletCode" label="所属应用" min-width="100">
            <template #default="{ row }">
              {{ row.appletCode || '未分类' }}
            </template>
          </el-table-column>
          <el-table-column prop="updatedBy" label="修改人" width="100" />
          <el-table-column prop="updatedAt" label="修改时间" width="180" sortable="custom">
            <template #default="{ row }">
              {{ formatDate(row.updatedAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="lastRunTime" label="上次运行时间" width="180" sortable="custom">
            <template #default="{ row }">
              {{ formatDate(row.lastRunTime) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="130">
            <template #default="{ row }">
              <el-button text type="primary" size="small" @click="handleViewJob(row)">
                执行
              </el-button>
              <el-button text type="primary" size="small" @click="handleCopy(row)">
                复制
              </el-button>
              <el-button text type="primary" size="small" @click="handleViewHistory(row)">
                历史
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页器区域 -->
      <div class="ops-pagination-wrapper">
        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :total="filteredJobsCount"
          :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper" background />
      </div>
    </section>

    <ExecuteJobDialog v-if="executeDialogVisible" v-model:visible="executeDialogVisible"
      :job-id="executeJobMeta?.id || ''" :job-type="executeJobMeta?.type || ''"
      :fallback-config-json="executeJobMeta?.configJson || ''" />
    <ExecuteHistoryDialog v-if="historyDialogVisible" v-model:visible="historyDialogVisible"
      :job-id="historyJobMeta?.id || ''" :job-title="historyJobMeta?.title || ''" />
    <CreateJobDialog v-if="jobDialogVisible" v-model="jobDialogVisible" :job-type="createJobType" :job-id="editJobId"
      :applet-code="currentApp.name" :applets-list="appOptions" @success="handleCreateSuccess" />
    <JobApproveDialog
      v-if="approveDialogVisible"
      v-model:visible="approveDialogVisible"
      :job-id="approveJobMeta?.id || ''"
      :job-title="approveJobMeta?.title || ''"
      :applet-code="approveJobMeta?.appletCode || ''"
      :params="approveJobMeta?.params || {}"
      @success="handleApproveSuccess"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { useAutomationJobStore, JOB_TYPE_OPTIONS } from '@/modules/automation/stores/useJobStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import { appUrlManager } from '@/config/module-urls.config'
import { Plus, Delete, Refresh, Search, ArrowDown, RefreshRight } from '@element-plus/icons-vue'
import { translateText } from '@/utils/i18n'
import * as jaoApi from '@/modules/automation/api/jao'
import ExecuteJobDialog from '../../components/job/JobListView/ExecuteJobDialog.vue'
import ExecuteHistoryDialog from '../../components/job/JobListView/ExecuteHistoryDialog.vue'
import CreateJobDialog from '../../components/job/JobListView/CreateJobDialog.vue'
import JobApproveDialog from '../../components/job/JobListView/JobApproveDialog.vue'

const store = useAutomationJobStore()
const { error, filteredJobs, jobs } = storeToRefs(store)

const currentPage = ref(1)
const pageSize = ref(10)
const selectedRows = ref([])
const moveTarget = ref('')
const currentSort = ref({ prop: 'updatedAt', order: 'descending' })

const appStr = ref('')
const appOptions = ref([])
const loading = ref(false)
const paginatedJobs = ref([])
const currentApp = ref({ title: '' })
const originalJobs = ref([])

// 统一筛选条件
const filters = reactive({
  jobType: 'all',
  keyword: ''
})

const executeDialogVisible = ref(false)
const executeJobMeta = ref(null)
const historyDialogVisible = ref(false)
const historyJobMeta = ref(null)
const createDialogVisible = ref(false)
const createJobType = ref('')
const editJobId = ref('')

// 审批弹窗相关
const approveDialogVisible = ref(false)
const approveJobMeta = ref(null)

// 统一的弹窗可见性（新建或编辑都使用同一个弹窗）
const jobDialogVisible = ref(false)

/** 过滤app */
function filterApplets() {
  const str = appStr.value.trim().toLowerCase()
  appOptions.value.forEach((app) => {
    app.show = app.title.toLowerCase().includes(str) || (app.title && app.title.toLowerCase().includes(str))
  })
}

/** 过滤列表 - 支持关键词和类型筛选 */
function filterList() {
  let filtered = originalJobs.value

  // 按类型筛选
  if (filters.jobType && filters.jobType !== 'all') {
    filtered = filtered.filter(job => job.type === filters.jobType)
  }

  // 按关键词搜索（搜索标题、描述、ID）
  if (filters.keyword && filters.keyword.trim()) {
    const kw = filters.keyword.trim().toLowerCase()
    filtered = filtered.filter(job => {
      return (job.title && job.title.toLowerCase().includes(kw)) ||
        (job.description && job.description.toLowerCase().includes(kw)) ||
        (job.id && job.id.toLowerCase().includes(kw))
    })
  }

  paginatedJobs.value = filtered
  sortJobs()
}

/** 搜索处理 */
function handleSearch() {
  currentPage.value = 1
  filterList()
}

/** 重置处理 */
function handleReset() {
  filters.jobType = 'all'
  filters.keyword = ''
  currentPage.value = 1
  pageSize.value = 10
  filterList()
}

/** 排序 */
function sortJobs() {
  const { prop, order } = currentSort.value
  if (!prop || !order) return

  paginatedJobs.value.sort((a, b) => {
    let valA = a[prop]
    let valB = b[prop]

    // 处理日期
    if (prop === 'updatedAt' || prop === 'lastRunTime') {
      valA = valA ? new Date(valA).getTime() : 0
      valB = valB ? new Date(valB).getTime() : 0
    }

    if (valA === valB) return 0

    const result = valA > valB ? 1 : -1
    return order === 'ascending' ? result : -result
  })
}

function handleSortChange({ prop, order }) {
  currentSort.value = { prop, order }
  sortJobs()
}

/**删除作业 */
function handleDeleteJobs() {
  const jobIds = selectedIds.value
  ElMessageBox.confirm(
    `确定要删除选中的 ${jobIds.length} 个作业吗？`,
    '删除确认',
    {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    }
  ).then(() => {
    ElMessage.success('删除成功')
    jaoApi.deleteJobs(JSON.stringify(jobIds)).then(() => {
      getAppTableList(currentApp.value.name)
    })
  }).catch(() => {
    // 取消删除
  })
}


/** 执行作业 */
async function handleViewJob(row) {
  if (!row?.id) {
    ElMessage.warning('无法获取作业信息')
    return
  }

  try {
    // 检查是否需要审批
    const needApprove = row?.needApprove || false
    if (needApprove) {
      const checkResult = await jaoApi.checkNeedApprove(row.id)
      if (checkResult?.data?.isApproving) {
        ElMessage.info('该作业审批申请已提交，请等待审批')
        return
      }
    }
    const isApproving = row?.isApproving || false

    if (needApprove && !isApproving) {
      // 需要审批，打开审批申请弹窗
      approveJobMeta.value = {
        id: row.id,
        title: row.title || '',
        appletCode: row.appletCode || '',
        params: {} // 默认无参数，如需要可从 row 中获取
      }
      approveDialogVisible.value = true
    } else if (isApproving) {
      // 审批中，提示用户
      ElMessage.info('该作业审批申请已提交，请等待审批')
    } else {
      // 不需要审批，直接执行
      executeJobMeta.value = {
        id: row.id,
        type: row.type ?? '',
        configJson: row.configJson ?? ''
      }
      executeDialogVisible.value = true
    }
  } catch (error) {
    ElMessage.error(error?.message || '检查审批状态失败')
  }
}

watch(executeDialogVisible, (visible) => {
  if (!visible) {
    executeJobMeta.value = null
  }
})

watch(historyDialogVisible, (visible) => {
  if (!visible) {
    historyJobMeta.value = null
  }
})

const jobTypeOptions = computed(() =>
  JOB_TYPE_OPTIONS.filter((option) => option.value !== '').map((option) => ({
    label: option.label,
    value: option.value,
    icon: option.icon
  }))
)

const createJobOptions = computed(() =>
  JOB_TYPE_OPTIONS.filter((option) => option.value !== '').map((option) => ({
    label: option.label,
    value: option.value,
    icon: option.icon
  }))
)

const selectedIds = computed(() =>
  selectedRows.value.map((row) => row.id).filter(Boolean)
)

const appletOptions = computed(() => {
  const unique = new Set()
  jobs.value.forEach((job) => {
    if (job?.appletCode) {
      unique.add(String(job.appletCode))
    }
  })
  return Array.from(unique).sort((a, b) => a.localeCompare(b))
})

const appletCounts = computed(() => {
  const counts = { ALL: jobs.value.length, __UNASSIGNED__: 0 }
  jobs.value.forEach((job) => {
    const key = job?.appletCode ? String(job.appletCode) : '__UNASSIGNED__'
    counts[key] = (counts[key] || 0) + 1
  })
  counts.ALL = jobs.value.length
  return counts
})

const moveTargetOptions = computed(() =>
  appletOptions.value
    .filter((code) => code !== store.filters.appletCode)
    .map((code) => ({
      label: code,
      value: code
    }))
)

const canMove = computed(() => selectedIds.value.length > 0 && !!moveTarget.value)

// 过滤后的数据总数
const filteredJobsCount = computed(() => paginatedJobs.value.length)

// 当前页显示的数据
const displayedJobs = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return paginatedJobs.value.slice(start, end)
})

watch(selectedIds, (ids) => {
  if (!ids.length) {
    moveTarget.value = ''
  }
})

function getAppTableList(appletCode) {
  loading.value = true
  paginatedJobs.value = []
  jaoApi.appTableList({ appletCode }).then((response) => {
    originalJobs.value = response.data
    // 应用当前筛选条件
    filterList()
    loading.value = false
  }).catch((error) => {
    loading.value = false
    // console.error('Failed to fetch app list:', error);
  });
}

/** 切换作业列表 */
function selectApplet(app) {
  getAppTableList(app.name)
  currentApp.value = app
}

function handleSelectionChange(rows) {
  selectedRows.value = rows
}

async function handleMoveJobs() {
  if (!selectedIds.value.length) {
    ElMessage.warning('请先选择要移动的作业')
    return
  }

  if (!moveTarget.value) {
    ElMessage.warning('请选择目标应用')
    return
  }

  if (!moveTargetOptions.value.length) {
    ElMessage.warning('暂无可移动的目标应用')
    return
  }

  const target = moveTargetOptions.value.find((item) => item.value === moveTarget.value)
  const targetLabel = target?.label ?? moveTarget.value

  try {
    await ElMessageBox.confirm(
      `确定将选中的 ${selectedIds.value.length} 个作业移动到「${targetLabel}」吗？`,
      '移动作业',
      {
        type: 'warning',
        confirmButtonText: '确认',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }

  try {
    await store.moveSelected(selectedIds.value, moveTarget.value)
    ElMessage.success('移动成功')
    selectedRows.value = []
    // 刷新当前列表
    getAppTableList(currentApp.value.name)
  } catch (error_) {
    const message = error_ instanceof Error ? error_.message : '移动作业失败'
    ElMessage.error(message)
  } finally {
    moveTarget.value = ''
  }
}


async function handleCopy(row) {
  if (!row?.id) return

  try {
    await ElMessageBox.confirm(
      `确定要复制作业「${row.title}」吗？`,
      '复制确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    await store.duplicateJob(row.id)
    ElMessage.success('复制成功')
    // 刷新当前列表
    getAppTableList(currentApp.value.name)
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '复制失败')
    }
  }
}

function handleViewHistory(row) {
  if (!row?.id) {
    ElMessage.warning('无法获取作业信息')
    return
  }
  historyJobMeta.value = {
    id: row.id,
    title: row.title || ''
  }
  historyDialogVisible.value = true
}

function handleCreateJob(type) {
  editJobId.value = '' // 清空编辑ID，表示新建模式
  createJobType.value = type || ''
  jobDialogVisible.value = true
}

/**
 * 编辑作业
 */
function handleEditJob(row) {
  if (!row?.id) {
    ElMessage.warning('无法获取作业信息')
    return
  }
  editJobId.value = row.id
  createJobType.value = '' // 编辑模式不需要预设类型
  jobDialogVisible.value = true
}

/**
 * 创建/编辑作业成功后刷新列表
 */
function handleCreateSuccess() {
  jobDialogVisible.value = false
  getAppTableList(currentApp.value.name)
}

/**
 * 审批申请成功后的回调
 */
function handleApproveSuccess() {
  approveDialogVisible.value = false
  ElMessage.success('审批申请已提交，请等待审批')
}

function reloadJobs() {
  if (currentApp.value && currentApp.value.name !== undefined) {
    getAppTableList(currentApp.value.name)
  }
}

function formatDate(value) {
  if (!value) return '-'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date)
}

function typeLabel(type) {
  const item = JOB_TYPE_OPTIONS.find((option) => option.value === type)
  return item?.label ?? '未知类型'
}

function typeIcon(type) {
  const item = JOB_TYPE_OPTIONS.find((option) => option.value === type)
  return item?.icon ?? 'fa-question-circle'
}

/**
 * 根据作业类型返回标签颜色
 */
function typeTagType(type) {
  const colorMap = {
    'script': 'success',   // 脚本作业 - 绿色
    'command': 'warning',  // 命令作业 - 橙色
    'rest': ''             // REST 作业 - 蓝色（默认）
  }
  return colorMap[type] || 'info'
}

/**
 * 翻译应用标题，处理 #{key} 格式
 */
function translateAppTitle(title) {
  if (!title) return ''

  if (title.startsWith('#{') && title.endsWith('}')) {
    const key = title.slice(2, -1)
    const translations = {
      'cac.index.square': '系统巡检',
      'acm.title': '资产管理',
      'app_pms.title': '密码管理',
      'app_sudo.title': 'sudo权限管理',
      'app_vap.title': '补丁管理',
      'app_spm.title': '软件管理',
      'app_uim.name': '用户管理'
    }
    return translations[key] || title
  }

  return title
}

function getAppList() {
  jaoApi.appList().then((response) => {
    const apps = response.data || []

    // 处理应用列表，翻译标题
    const translatedApps = apps.map(app => ({
      ...app,
      show: true,
      title: translateAppTitle(app.title)
    }))

    // 添加"所有应用"和"未分类"选项在最前面
    appOptions.value = [
      { name: '', show: true, title: '所有应用' },
      { name: '$NULL$', show: true, title: '未分类' }
    ].concat(translatedApps)

    // 默认选中第一个（所有应用）
    if (appOptions.value.length > 0) {
      selectApplet(appOptions.value[0])
    }
  }).catch((error) => {
    console.error('Failed to fetch app list:', error);
  });
}

onMounted(() => {
  getAppList()
})
</script>

<style scoped lang="scss">
@use '../../../styles/common.scss' as *;
</style>
