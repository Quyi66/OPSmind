<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form inline size="small">
        <el-form-item label="关键词">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索运维工具标题"
            clearable
            style="width: 240px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="currentPage = 1">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 功能按钮区 -->
    <div class="ops-action-bar">
      <el-button type="primary" size="small" @click="handleCreateJob">
        <i class="fas fa-plus" />
        创建运维工具
      </el-button>
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        @click="loadJobs"
        title="刷新"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table
        v-loading="loading"
        :data="pagedJobs"
        max-height="calc(100vh - 264px)"
        row-key="id"
        :default-sort="{ prop: sortField, order: sortOrder }"
        @sort-change="handleSortChange"
      >
        <el-table-column prop="title" label="运维工具标题" min-width="200" sortable="custom">
          <template #default="{ row }">
            <el-button text type="primary" @click="openDetail(row)">{{ row.title }}</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="220" show-overflow-tooltip />
        <el-table-column label="命令数" width="90">
          <template #default="{ row }">{{ getCommandCount(row) }}</template>
        </el-table-column>
        <el-table-column label="主机数" width="90">
          <template #default="{ row }">{{ getHostCount(row) }}</template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="修改时间" min-width="160" sortable="custom">
          <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column prop="lastRunTime" label="最近执行" min-width="160" sortable="custom">
          <template #default="{ row }">{{ formatDateTime(row.lastRunTime) || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openDetail(row)">查看</el-button>
            <el-button text type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button
              text
              type="primary"
              size="small"
              :loading="running && runningJobId === row.id"
              @click="handleRunJob(row)"
            >
              执行
            </el-button>
            <el-button text type="danger" size="small" @click="handleDeleteJob(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页区域 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 25, 50, 100]"
        :total="filteredJobs.length"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handlePageSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      width="780px"
      title="运维工具详情"
      :close-on-click-modal="false"
    >
      <div v-if="detailJob" class="detail-dialog-body">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="标题">{{ detailJob.title }}</el-descriptions-item>
          <el-descriptions-item label="类型">
            {{ detailJob.type || 'command' }}
          </el-descriptions-item>
          <el-descriptions-item label="最近修改">
            {{ formatDateTime(detailJob.updatedAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="最近执行">
            {{ formatDateTime(detailJob.lastRunTime) || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ detailJob.description || '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="subsection">
          <h4>命令</h4>
          <div class="chip-list" v-if="detailCommands.length">
            <el-tag
              v-for="cmd in detailCommands"
              :key="cmd.id || cmd.name"
              type="info"
              class="chip"
            >
              <span class="cmd-name">{{ cmd.name || cmd.id }}</span>
              <span class="cmd-type">{{ cmd.type || '-' }}</span>
            </el-tag>
          </div>
          <div v-else class="text-muted">未配置命令</div>
        </div>

        <div class="subsection">
          <h4>目标主机</h4>
          <div class="chip-list" v-if="detailHosts.length">
            <el-tag
              v-for="host in detailHosts"
              :key="host.key || host.value"
              class="chip"
              type="success"
            >
              <span class="host-name">{{ host.value || host.key }}</span>
              <span class="host-type">{{ host.assetType || '-' }}</span>
            </el-tag>
          </div>
          <div v-else class="text-muted">未配置主机</div>
        </div>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button @click="handleEditFromDetail">编辑运维工具</el-button>
        <el-button
          type="primary"
          :loading="running && runningJobId === detailJob?.id"
          @click="detailJob && handleRunJob(detailJob)"
        >
          执行运维工具
        </el-button>
      </template>
    </el-dialog>

    <!-- 编辑弹窗 -->
    <el-dialog
      v-model="editDialogVisible"
      width="820px"
      :title="editDialogTitle"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form ref="formRef" :model="jobForm" :rules="formRules" label-width="100px">
        <el-form-item label="运维工具标题" prop="title">
          <el-input v-model="jobForm.title" placeholder="请输入运维工具标题" maxlength="100" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="jobForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入运维工具描述"
          />
        </el-form-item>
        <el-form-item label="命令列表" required>
          <el-select
            v-model="selectedCommandIds"
            multiple
            filterable
            placeholder="选择要执行的命令"
            style="width: 100%"
          >
            <el-option
              v-for="cmd in availableCommands"
              :key="cmd.id"
              :label="cmd.name"
              :value="cmd.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="目标主机" required>
          <AcmDeviceSelector
            v-model="jobHosts"
            ci-types="[auto]"
            :options="{
              selectMode: 'host,group,tag,input,recently',
              selector: 'multiple',
              label: '选择主机'
            }"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSaveJob">
          {{ editDialogConfirmText }}
        </el-button>
      </template>
    </el-dialog>

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
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import {
  findAllJobs,
  findJobById,
  saveJob,
  deleteJob,
  runJobByRequest,
  findAllApproveCommand
} from '@/modules/automation/api/command'
import * as jaoApi from '@/modules/automation/api/jao'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { normalizeAcmDeviceSelection } from '@/modules/automation/components/job/schedule/components/acmDeviceSelector.utils'
import {
  buildCommandJobConfig,
  buildSavedCommandJobRunRequest
} from '@/modules/automation/components/command/commandJob.utils'
import JobApproveDialog from '@/modules/automation/components/job/JobListView/JobApproveDialog.vue'

const router = useRouter()

function createEmptyJobForm() {
  return {
    id: null,
    title: '',
    description: '',
    type: 'command',
    configJson: ''
  }
}

const props = defineProps({
  jobType: {
    type: String,
    default: 'command'
  }
})

const loading = ref(false)
const jobs = ref([])
const searchKeyword = ref('')
const sortField = ref('updatedAt')
const sortOrder = ref('descending')
const currentPage = ref(1)
const pageSize = ref(10)

const selectedJob = ref(null)
const detailJob = ref(null)

const formRef = ref(null)
const jobForm = ref(createEmptyJobForm())

const selectedCommandIds = ref([])
const jobHosts = ref([])
const availableCommands = ref([])

const running = ref(false)
const runningJobId = ref('')
const saving = ref(false)

const approveDialogVisible = ref(false)
const approveJobMeta = ref(null)

const detailDialogVisible = ref(false)
const editDialogVisible = ref(false)

const formRules = {
  title: [{ required: true, message: '请输入运维工具标题', trigger: 'blur' }]
}

const isEditMode = computed(() => Boolean(jobForm.value.id))

const editDialogTitle = computed(() => (isEditMode.value ? '编辑运维工具' : '创建运维工具'))

const editDialogConfirmText = computed(() => (isEditMode.value ? '保存' : '创建运维工具'))

const filteredJobs = computed(() => {
  let result = [...jobs.value]
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(job => job.title?.toLowerCase().includes(keyword))
  }

  if (!sortField.value || !sortOrder.value) {
    return result
  }

  result.sort((a, b) => {
    let aVal = a[sortField.value] || ''
    let bVal = b[sortField.value] || ''
    const isDateField = ['updatedAt', 'createdAt', 'lastRunTime'].includes(sortField.value)
    if (isDateField) {
      aVal = new Date(aVal).getTime() || 0
      bVal = new Date(bVal).getTime() || 0
    }
    if (sortOrder.value === 'ascending') return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
    return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
  })

  return result
})

const paginationInfo = computed(() => {
  const total = filteredJobs.value.length
  if (total === 0) return '0 - 0 / 0'
  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, total)
  return `${start} - ${end} / ${total}`
})

const pagedJobs = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredJobs.value.slice(start, start + pageSize.value)
})

const detailCommands = computed(() => parseJobConfig(detailJob.value).commands)
const detailHosts = computed(() => parseJobConfig(detailJob.value).hosts)

function parseJobConfig(job) {
  if (!job) return { commands: [], hosts: [] }
  try {
    const cfg = JSON.parse(job.configJson || '{}')
    const task = cfg.tasks?.[0] || {}
    return {
      commands: task.commands || [],
      hosts: normalizeAcmDeviceSelection(task.hosts, 'linux')
    }
  } catch (e) {
    return { commands: [], hosts: [] }
  }
}

function getCommandCount(job) {
  return parseJobConfig(job).commands.length
}

function getHostCount(job) {
  return parseJobConfig(job).hosts.length
}

function formatDateTime(val) {
  if (!val) return ''
  const date = new Date(val)
  if (Number.isNaN(date.getTime())) return val
  return date.toLocaleString('zh-CN')
}

async function loadJobs() {
  loading.value = true
  try {
    const response = await findAllJobs(props.jobType)
    jobs.value = response.data || response || []
  } catch (error) {
    console.error('加载运维工具列表失败:', error)
    ElMessage.error('加载运维工具列表失败')
  } finally {
    loading.value = false
  }
}

async function loadAvailableCommands() {
  try {
    const response = await findAllApproveCommand()
    availableCommands.value = response.data || response || []
  } catch (error) {
    console.error('加载命令列表失败:', error)
  }
}

async function loadJobDetail(job) {
  try {
    const response = await findJobById(job.id)
    const data = response.data || response
    selectedJob.value = data
    return data
  } catch (error) {
    console.error('加载运维工具详情失败:', error)
    ElMessage.error('加载运维工具详情失败')
    return null
  }
}

async function openDetail(job) {
  const detail = await loadJobDetail(job)
  if (!detail) return
  detailJob.value = detail
  detailDialogVisible.value = true
}

async function openEdit(job) {
  const detail = await loadJobDetail(job)
  if (!detail) return
  detailJob.value = detail
  fillEditForm(detail)
  editDialogVisible.value = true
}

async function handleEditFromDetail() {
  if (!detailJob.value) return
  detailDialogVisible.value = false
  await openEdit(detailJob.value)
}

function fillEditForm(job) {
  jobForm.value = {
    id: job.id,
    title: job.title,
    description: job.description,
    type: job.type,
    configJson: job.configJson
  }
  const cfg = parseJobConfig(job)
  selectedCommandIds.value = (cfg.commands || []).map(c => c.id)
  jobHosts.value = normalizeAcmDeviceSelection(cfg.hosts, 'linux')
}

function prepareCreateForm() {
  jobForm.value = createEmptyJobForm()
  selectedCommandIds.value = []
  jobHosts.value = []
}

function handleSortChange({ prop, order }) {
  if (!prop || !order) {
    sortField.value = 'updatedAt'
    sortOrder.value = 'descending'
    return
  }
  sortField.value = prop
  sortOrder.value = order
}

function handlePageSizeChange() {
  currentPage.value = 1
}

function handlePageChange(page) {
  currentPage.value = page
}

function handleCreateJob() {
  prepareCreateForm()
  editDialogVisible.value = true
}

function handleReset() {
  searchKeyword.value = ''
}

watch([searchKeyword, sortField, sortOrder], () => {
  currentPage.value = 1
})

watch(filteredJobs, () => {
  const maxPage = Math.max(1, Math.ceil(filteredJobs.value.length / pageSize.value))
  if (currentPage.value > maxPage) {
    currentPage.value = maxPage
  }
})

async function handleSaveJob() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  if (selectedCommandIds.value.length === 0) {
    ElMessage.error('请至少选择一个命令')
    return
  }
  if (jobHosts.value.length === 0) {
    ElMessage.error('请至少添加一个目标主机')
    return
  }

  saving.value = true
  try {
    const isEditAction = Boolean(jobForm.value.id)

    const job = {
      ...jobForm.value,
      configJson: buildCommandJobConfig(selectedCommandIds.value, jobHosts.value, 'linux')
    }

    await saveJob(job)
    ElMessage.success(isEditAction ? '运维工具保存成功' : '运维工具创建成功')
    editDialogVisible.value = false
    await loadJobs()
    if (detailDialogVisible.value && detailJob.value?.id === job.id) {
      detailJob.value = await findJobById(job.id)
        .then(r => r.data || r)
        .catch(() => detailJob.value)
    }
  } catch (error) {
    console.error('保存运维工具失败:', error)
    ElMessage.error('保存运维工具失败')
  } finally {
    saving.value = false
  }
}

async function handleRunJob(job) {
  const detail = await loadJobDetail(job)
  if (!detail) return

  const cfg = parseJobConfig(detail)
  if (!cfg.commands.length) {
    ElMessage.warning('运维工具未配置命令')
    return
  }
  if (!cfg.hosts.length) {
    ElMessage.warning('运维工具未配置目标主机')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定立即执行运维工具 "${detail.title}" 吗？该运维工具将向 ${cfg.hosts.length} 台主机执行 ${cfg.commands.length} 条命令。`,
      '执行确认',
      {
        type: 'warning',
        confirmButtonText: '立即执行',
        cancelButtonText: '取消'
      }
    )
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error('执行确认失败')
    }
    return
  }

  const needApproveFlag = detail?.needApprove || job?.needApprove
  if (needApproveFlag) {
    try {
      const checkResult = await jaoApi.checkNeedApprove(detail.id)
      const resData = checkResult?.data || checkResult || {}
      if (resData.isApproving) {
        ElMessage.info('该运维工具审批申请已提交，请等待审批')
        return
      }
      if (resData.needApprove) {
        approveJobMeta.value = {
          id: detail.id,
          title: detail.title || '',
          appletCode: detail.appletCode || '',
          params: {}
        }
        approveDialogVisible.value = true
        return
      }
    } catch (error) {
      ElMessage.error(error?.message || '检查审批状态失败')
      return
    }
  }

  running.value = true
  runningJobId.value = job.id
  try {
    await runJobByRequest(buildSavedCommandJobRunRequest(detail))
    ElMessage.success('运维工具已提交执行，可在运行记录中查看')
    router.push('/run-records/logs')
  } catch (error) {
    console.error('运行运维工具失败:', error)
    ElMessage.error(`运行运维工具失败: ${error?.message || '未知错误'}`)
  } finally {
    running.value = false
    runningJobId.value = ''
  }
}

function handleApproveSuccess() {
  ElMessage.success('审批申请已提交')
  approveDialogVisible.value = false
}

async function handleDeleteJob(job) {
  try {
    await ElMessageBox.confirm(`确定要删除运维工具 "${job.title}" 吗？`, '确认删除', {
      type: 'error',
      confirmButtonClass: 'el-button--danger'
    })
    await deleteJob(job.id)
    ElMessage.success('运维工具已删除')
    if (detailJob.value?.id === job.id) {
      detailDialogVisible.value = false
      detailJob.value = null
    }
    editDialogVisible.value = false
    await loadJobs()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除运维工具失败:', error)
      ElMessage.error('删除运维工具失败')
    }
  }
}

onMounted(() => {
  loadJobs()
  loadAvailableCommands()
})

watch(editDialogVisible, visible => {
  if (!visible) {
    prepareCreateForm()
  }
})

defineExpose({
  refresh: loadJobs,
  loadJobs
})
</script>

<style scoped lang="scss">
.command-job-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color);
  padding: 12px;
  box-sizing: border-box;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.toolbar-left {
  display: flex;
  gap: 8px;
  align-items: center;
}

.toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.toolbar-icon-btn {
  padding: 6px 8px;
}

.w-220 {
  width: 220px;
}

.table-wrapper {
  flex: 1;
  min-height: 0;
}

.detail-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.subsection {
  h4 {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.chip-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chip {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.cmd-type,
.host-type {
  color: var(--el-text-color-regular);
  font-size: 12px;
}

.text-muted {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

:deep(.el-dialog__body) {
  padding-top: 10px;
}

:deep(.el-table) {
  font-size: 13px;
}

:deep(.el-input__wrapper) {
  border-radius: 4px;
}
</style>
