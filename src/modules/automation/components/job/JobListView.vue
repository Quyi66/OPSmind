<template>
  <div class="job-workbench">
    <aside class="job-workbench__sidebar">
      <div class="sidebar-header">
        <el-input v-model="appStr" style="width: 100%" placeholder="请输入" :prefix-icon="'Search'" @input="filterApplets()" />
      </div>
      <el-scrollbar class="sidebar-list">
        <button
          v-for="applet in appOptions"
          :key="applet"
          class="sidebar-item"
          :class="{ 'is-active': currentApp.name === applet.name }"
          @click="selectApplet(applet)"
          v-show="applet.show"
        >
          <span>{{ applet.title }}</span>
          <!-- <el-tag type="info" size="small">{{ appletCounts[applet] || 0 }}</el-tag> -->
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
          <el-button size="small" text :loading="loading" @click="reloadJobs">
            <el-icon><RefreshRight /></el-icon>
            刷新
          </el-button>
        </div>

        <div class="header-right">
          <div class="header-filter">
            <span class="header-label">类型</span>
            <el-select
              v-model="jobTypeValue"
              size="small"
              class="header-select--narrow"
              @change="filterList('type', jobTypeValue)"
            >
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
        :data="paginatedJobs"
        @selection-change="handleSelectionChange"
        class="job-table"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="title" label="作业" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="job-title">
              <span class="job-title__text">{{ row.title || '-' }}</span>
              <span v-if="row.description" class="job-title__desc">{{ row.description }}</span>
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
            {{ row.appletCode || '未分配' }}
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
        <el-table-column label="操作" fixed="right" width="150">
          <template #default="{ row }">
            <div class="table-actions">
              <el-tooltip content="查看详情">
                <el-button link class="action-button" @click="handleViewJob(row)">
                  <i class="fa fa-eye"></i>
                </el-button>
              </el-tooltip>
              <el-tooltip content="复制为新作业">
                <el-button link class="action-button" @click="handleCopy(row)">
                  <i class="fa fa-copy"></i>
                </el-button>
              </el-tooltip>
              <el-tooltip content="删除">
                <el-button
                  link
                  class="action-button action-button--danger"
                  @click="handleDeleteJobs([row.id])"
                >
                  <i class="fa fa-trash"></i>
                </el-button>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-footer">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="paginatedJobs.length"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          background
        />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAutomationJobStore, JOB_TYPE_OPTIONS } from '@/modules/automation/stores/useJobStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import { appUrlManager } from '@/config/module-urls.config'
import { Plus, Delete, RefreshRight, Search, ArrowDown } from '@element-plus/icons-vue'
import * as jaoApi from '@/modules/automation/api/jao'

const store = useAutomationJobStore()
const { error, filteredJobs, jobs } = storeToRefs(store)

const keyword = ref(store.filters.keyword)
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

/** 过滤app */
function filterApplets() {
  const str = appStr.value.trim().toLowerCase()
  appOptions.value.forEach((app) => {
    app.show = app.title.toLowerCase().includes(str) || (app.title && app.title.toLowerCase().includes(str))
  })
}

const jobTypeValue = ref('')
/** 过滤列表 */
function filterList(key, value) {
  // if (!key && !value) {
  //   paginatedJobs.value = originalJobs.value.filter((job) => {
  //     if (job)
  //   })
  // }
  if (!value) {
    paginatedJobs.value = originalJobs.value
    return
  }
  paginatedJobs.value = originalJobs.value.filter((job) => {
    if (job[key] !== value) {
      return false
    }
    return true
  })
}

watch(keyword, (value) => {
  store.setKeyword(value)
  currentPage.value = 1
})


const jobTypeOptions = computed(() =>
  JOB_TYPE_OPTIONS.map((option) => ({
    label: option.label,
    value: option.value,
    icon: option.icon
  }))
)

const createJobOptions = computed(() =>
  jobTypeOptions.value.filter((option) => option.value !== 'all')
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

watch(selectedIds, (ids) => {
  if (!ids.length) {
    moveTarget.value = ''
  }
})

/** 切换作业列表 */
function selectApplet(app) {
  // store.setApplet(appletCode)
  // currentPage.value = 1
  // selectedRows.value = []
  // moveTarget.value = ''
  loading.value = true
  paginatedJobs.value = []
  currentApp.value = app
  jaoApi.appTableList({ appletCode: app.name }).then((response) => {
    paginatedJobs.value = response.data
    originalJobs.value = response.data
    loading.value = false
  }).catch((error) => {
    loading.value = false
    // console.error('Failed to fetch app list:', error);
  });
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
  } catch (error_) {
    const message = error_ instanceof Error ? error_.message : '移动作业失败'
    ElMessage.error(message)
  } finally {
    moveTarget.value = ''
  }
}

async function handleDeleteJobs(ids) {
  const jobIds = ids ?? selectedIds.value
  if (!jobIds.length) {
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${jobIds.length} 个作业吗？`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }

  await store.deleteJobs(jobIds)
  ElMessage.success('删除成功')
  selectedRows.value = []
}

async function handleCopy(row) {
  if (!row?.id) return
  await store.duplicateJob(row.id)
  ElMessage.success('复制成功')
}

function openAngularRoute(hashPath) {
  const base = appUrlManager.getAngularBaseUrl()
  const normalizedHash = hashPath.startsWith('#') ? hashPath : `#${hashPath}`
  const url = `${base}${normalizedHash}`
  window.open(url, '_blank', 'noopener')
}

function handleCreateJob(type) {
  const applet = store.filters.appletCode
  const params = new URLSearchParams()
  if (type) params.append('type', type)
  if (applet && applet !== 'ALL' && applet !== '__UNASSIGNED__') {
    params.append('appletCode', applet)
  }
  const hash = params.toString()
    ? `#/appman/job/create?${params.toString()}`
    : '#/appman/job/create'
  openAngularRoute(hash)
}

function handleViewJob(row) {
  if (!row?.id) return
  const hash = `#/appman/job/view/${encodeURIComponent(row.id)}`
  openAngularRoute(hash)
}

function reloadJobs() {
  void store.loadJobs()
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

watch(
  () => [store.filters.type, store.filters.appletCode],
  () => {
    currentPage.value = 1
    selectedRows.value = []
    moveTarget.value = ''
    void store.loadJobs()
  },
  { immediate: true }
)

onMounted(() => {
  // if (!jobs.value.length) {
  //   void store.loadJobs()
  // }
  // debugger
  jaoApi.appList().then((response) => {
    // //console.log('App List:', response.data);
    appOptions.value = [{ name: '', show: true, title: '所有应用' }, { name: '$NULL$', show: true, title: '未分配' }].concat(response.data.map(app => ({ ...app, show: true })))
  }).catch((error) => {
    console.error('Failed to fetch app list:', error);
  });
})
</script>

<style scoped lang="scss">
@import '@/modules/automation/styles/common.scss';
</style>
