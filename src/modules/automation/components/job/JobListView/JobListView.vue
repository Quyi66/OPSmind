<template>
  <div class="job-workbench">
    <aside class="ops-sidebar-nav">
      <div class="ops-sidebar-header">
        <el-input v-model="appStr" style="width: 100%" placeholder="请输入" :prefix-icon="'Search'" @input="filterApplets()" />
      </div>
      <el-scrollbar class="ops-sidebar-content">
        <button
          v-for="applet in appOptions"
          :key="applet.name || 'all'"
          class="ops-sidebar-item"
          :class="{ 'is-active': currentApp.name === applet.name }"
          @click="selectApplet(applet)"
          v-show="applet.show"
        >
          <span>{{ applet.title }}</span>
        </button>
      </el-scrollbar>
    </aside>

    <section class="job-workbench__content">
      <div class="content-header">
        <div class="header-left">
          <el-select
            v-model="moveTarget"
            size="small"
            placeholder="移动到"
            clearable
            filterable
            class="header-select"
            :disabled="!selectedIds.length"
          >
            <el-option
              v-for="option in moveTargetOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <el-button
            size="small"
            type="primary"
            plain
            :disabled="!canMove"
            @click="handleMoveJobs"
          >
            移动
          </el-button>
          <el-button
            size="small"
            :disabled="!selectedIds.length"
            @click="handleDeleteJobs"
          >
            <el-icon><Delete /></el-icon>
            删除
          </el-button>
          <el-button size="small" text :loading="loading" @click="reloadJobs" title="刷新">
            <el-icon><RefreshRight /></el-icon>
          </el-button>
        </div>

        <div class="header-right">
          <div class="header-filter">
            <span class="header-label">类型</span>
            <el-select
              v-model="jobTypeValue"
              size="small"
              class="header-select--narrow"
              @change="filterList"
            >
              <el-option label="全部" value="all" />
              <el-option
                v-for="option in jobTypeOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </div>
          <el-input
            v-model="keyword"
            size="small"
            placeholder="输入字符搜索"
            clearable
            class="header-search"
            @input="filterList"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-dropdown @command="handleCreateJob">
            <el-button type="primary" size="small">
              <el-icon><Plus /></el-icon>
              新建作业
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="option in createJobOptions"
                  :key="option.value"
                  :command="option.value"
                >
                  <i :class="['fa', option.icon, 'dropdown-icon']"></i>
                  {{ option.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <el-alert
        v-if="error"
        :title="error"
        type="error"
        :closable="false"
        class="mb-3"
      />

      <el-table
        v-loading="loading"
        :data="displayedJobs"
        @selection-change="handleSelectionChange"
        class="job-table"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="title" label="作业" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="job-title">
              <span class="job-title__text">{{ translateText(row.title) || '-' }}</span>
              <span v-if="row.description" class="job-title__desc">{{ translateText(row.description) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="130">
          <template #default="{ row }">
            <el-tag
              v-if="row.type"
              size="small"
              effect="plain"
              class="job-type-tag"
            >
              <i :class="['fa', typeIcon(row.type)]" />
              <span>{{ typeLabel(row.type) }}</span>
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="appletCode" label="所属应用" min-width="140">
          <template #default="{ row }">
            {{ row.appletCode || '未分类' }}
          </template>
        </el-table-column>
        <el-table-column prop="updatedBy" label="修改人" width="140" />
        <el-table-column prop="updatedAt" label="修改时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="lastRunTime" label="上次运行时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.lastRunTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="132">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button text type="primary" size="small" @click="handleViewJob(row)">
                执行
              </el-button>
              <el-button text type="primary" size="small" @click="handleCopy(row)">
                复制
              </el-button>
              <el-button text type="primary" size="small" @click="handleViewHistory(row)">
                历史
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-footer">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="filteredJobsCount"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </section>

    <ExecuteJobDialog
      v-if="executeDialogVisible"
      v-model:visible="executeDialogVisible"
      :job-id="executeJobMeta?.id || ''"
      :job-type="executeJobMeta?.type || ''"
      :fallback-config-json="executeJobMeta?.configJson || ''"
    />
    <ExecuteHistoryDialog
      v-if="historyDialogVisible"
      v-model:visible="historyDialogVisible"
      :job-id="historyJobMeta?.id || ''"
      :job-title="historyJobMeta?.title || ''"
    />
    <CreateJobDialog
      v-if="createDialogVisible"
      v-model="createDialogVisible"
      :job-type="createJobType"
      :applet-code="currentApp.name"
      :applets-list="appOptions"
      @success="handleCreateSuccess"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAutomationJobStore, JOB_TYPE_OPTIONS } from '@/modules/automation/stores/useJobStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import { appUrlManager } from '@/config/module-urls.config'
import { Plus, Delete, RefreshRight, Search, ArrowDown } from '@element-plus/icons-vue'
import { translateText } from '@/utils/i18n'
import * as jaoApi from '@/modules/automation/api/jao'
import ExecuteJobDialog from './ExecuteJobDialog.vue'
import ExecuteHistoryDialog from './ExecuteHistoryDialog.vue'
import CreateJobDialog from './CreateJobDialog.vue'

const store = useAutomationJobStore()
const { error, filteredJobs, jobs } = storeToRefs(store)

const currentPage = ref(1)
const pageSize = ref(10)
const selectedRows = ref([])
const moveTarget = ref('')

const appStr = ref('')
const appOptions = ref([])
const loading = ref(false)
const paginatedJobs = ref([])
const currentApp = ref({ title: '' })
const originalJobs = ref([])
const keyword = ref('')
const executeDialogVisible = ref(false)
const executeJobMeta = ref(null)
const historyDialogVisible = ref(false)
const historyJobMeta = ref(null)
const createDialogVisible = ref(false)
const createJobType = ref('')

/** 过滤app */
function filterApplets() {
  const str = appStr.value.trim().toLowerCase()
  appOptions.value.forEach((app) => {
    app.show = app.title.toLowerCase().includes(str) || (app.title && app.title.toLowerCase().includes(str))
  })
}

const jobTypeValue = ref('all')

/** 过滤列表 - 支持关键词和类型筛选 */
function filterList() {
  let filtered = originalJobs.value

  // 按类型筛选
  if (jobTypeValue.value && jobTypeValue.value !== 'all') {
    filtered = filtered.filter(job => job.type === jobTypeValue.value)
  }

  // 按关键词搜索（搜索标题、描述、ID）
  if (keyword.value && keyword.value.trim()) {
    const kw = keyword.value.trim().toLowerCase()
    filtered = filtered.filter(job => {
      return (job.title && job.title.toLowerCase().includes(kw)) ||
             (job.description && job.description.toLowerCase().includes(kw)) ||
             (job.id && job.id.toLowerCase().includes(kw))
    })
  }

  paginatedJobs.value = filtered
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
function handleViewJob(row) {
  if (!row?.id) {
    ElMessage.warning('无法获取作业信息')
    return
  }
  executeJobMeta.value = {
    id: row.id,
    type: row.type ?? '',
    configJson: row.configJson ?? ''
  }
  executeDialogVisible.value = true
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
  JOB_TYPE_OPTIONS.map((option) => ({
    label: option.label,
    value: option.value || 'all',  // 把空字符串映射为 'all' 用于筛选
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
    paginatedJobs.value = response.data
    originalJobs.value = response.data
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
    await store.duplicateJob(row.id)
    ElMessage.success('复制成功')
    // 刷新当前列表
    getAppTableList(currentApp.value.name)
  } catch (error) {
    ElMessage.error('复制失败')
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
  createJobType.value = type || ''
  createDialogVisible.value = true
}

/**
 * 创建作业成功后刷新列表
 */
function handleCreateSuccess() {
  getAppTableList(currentApp.value.name)
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
