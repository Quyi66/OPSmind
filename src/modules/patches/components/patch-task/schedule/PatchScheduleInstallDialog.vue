<template>
  <el-dialog
    v-model="dialogVisible"
    title="定时安装补丁"
    width="1000px"
    top="5vh"
    :close-on-click-modal="false"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
    class="schedule-install-dialog"
    @closed="handleClosed"
  >
    <!-- 步骤指示器 -->
    <PatchTaskStepper
      :steps="wizardSteps"
      :active-index="currentStep"
      :states="stepStates"
    />

    <!-- Step 0: 选择目标主机 -->
    <div v-show="currentStep === 0" v-loading="installDataLoading">
      <div class="schedule-step-0-layout">
        <!-- 左侧：已选补丁信息 -->
        <section class="schedule-card">
          <div class="card-header">
            <i class="fa fa-lock" />
            已选补丁 ({{ selectedPatches.length }})
          </div>
          <div class="card-body card-body--scroll">
            <div v-if="selectedPatches.length === 0" class="no-data">暂无数据</div>
            <div
              v-for="patch in selectedPatches"
              :key="patch.patch_id"
              class="selection-item"
            >
              <div class="selection-item__primary">
                {{ patch.patch_id }}
                <el-tag
                  v-if="patch.severity"
                  size="small"
                  effect="dark"
                  :class="'severity-tag is-' + (patch.severity || '').toLowerCase()"
                  style="margin-left: 8px;"
                >
                  {{ patch.severity }}
                </el-tag>
              </div>
              <div v-if="patch.title" class="selection-item__secondary" :title="patch.title">
                {{ patch.title }}
              </div>
            </div>
          </div>
        </section>

        <!-- 右侧：受影响软件包 -->
        <section class="schedule-card">
          <div class="card-header card-header--with-actions">
            <div>
              <i class="fa fa-cube" />
              受影响软件包 ({{ affectedPackagesDisplay.length }})
            </div>
            <el-input
              v-if="affectedPackagesDisplay.length > 10"
              v-model="packageSearchText"
              placeholder="搜索软件包..."
              size="small"
              clearable
              style="width: 180px;"
            />
          </div>
          <PatchTaskPackageList
            class="card-body card-body--scroll"
            :items="paginatedPackages"
            :loading="affectedPackagesLoading"
            :empty-text="packageEmptyText"
            :has-more="hasMorePackages"
            :total="filteredPackages.length"
            @load-more="loadMorePackages"
          />
        </section>

        <!-- 下方：受影响目标主机选择（全宽） -->
        <section class="schedule-card schedule-card--full">
          <div class="card-header">
            <i class="fa fa-server" />
            目标主机 (已选 {{ selectedHosts.length }} / 共 {{ affectedHosts.length }})
          </div>
          <div class="card-body">
            <div class="host-toolbar">
              <el-select v-model="hostFilter" size="small" style="width: 140px">
                <el-option label="@@(linux)" value="@@(linux)">
                  <i class="fa fa-server" />
                  @@(linux)
                </el-option>
              </el-select>
              <el-input
                v-model="hostSearchText"
                placeholder="搜索主机名/IP/OS"
                :prefix-icon="Search"
                size="small"
                style="width: 220px"
                clearable
              />
              <el-button
                size="small"
                :type="hostAllSelected ? 'default' : 'primary'"
                @click="handleToggleHostSelectAll"
              >
                <i :class="`fa fa-${hostAllSelected ? 'times' : 'check-double'} me-1`" />
                {{ hostAllSelected ? '一键取消' : '一键全选' }}
              </el-button>
            </div>

            <el-table
              ref="hostTableRef"
              :data="paginatedHosts"
              size="small"
              max-height="300"
              @select="handleHostTableSelect"
              @select-all="handleHostTableSelect"
            >
              <el-table-column type="selection" width="40" />
              <el-table-column prop="hostKey" label="主机" min-width="180" sortable>
                <template #default="{ row }">
                  <span class="host-name-cell">{{ row.hostKey || row.host_key || row.hostname }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="os_distro" label="OS" width="120" sortable />
              <el-table-column prop="os_version" label="OS版本" width="120" sortable />
              <el-table-column prop="scan_timestamp" label="上次扫描时间" min-width="160" sortable>
                <template #default="{ row }">
                  {{ formatDateTime(row.scan_timestamp) }}
                </template>
              </el-table-column>
            </el-table>

            <div class="host-pagination">
              <el-pagination
                v-model:current-page="hostPagination.page"
                v-model:page-size="hostPagination.pageSize"
                :page-sizes="[10, 20, 50]"
                :total="filteredHosts.length"
                layout="total, sizes, prev, pager, next, jumper"
                size="small"
                background
                @size-change="handleHostSizeChange"
                @current-change="handleHostPageChange"
              />
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- Step 1: 定时与分批配置 -->
    <div v-show="currentStep === 1" class="schedule-step-1-layout">
      <!-- 汇总摘要卡片 -->
      <div class="summary-banner">
        <div class="summary-item">
          <span class="summary-label">已选补丁：</span>
          <span class="summary-value">{{ selectedPatches.length }} 个</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">目标主机：</span>
          <span class="summary-value">{{ selectedHosts.length }} 台</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">待更新包数：</span>
          <span class="summary-value">{{ resolvedPackages.length }} 个</span>
        </div>
      </div>

      <el-form label-position="top" size="default" class="schedule-form">
        <!-- 计划执行时间 -->
        <el-form-item label="计划执行时间" required>
          <div class="schedule-time-row">
            <el-date-picker
              v-model="scheduleDate"
              type="date"
              value-format="YYYY-MM-DD"
              :editable="false"
              :disabled-date="disabledScheduleDate"
              placeholder="选择日期"
              style="flex: 1; min-width: 160px;"
            />
            <el-select
              v-model="scheduleHour"
              filterable
              default-first-option
              placeholder="时"
              aria-label="执行小时"
              no-match-text="请输入 00–23"
              style="width: 100px;"
            >
              <el-option
                v-for="hour in scheduleHours"
                :key="hour"
                :label="`${hour} 时`"
                :value="hour"
              />
            </el-select>
            <el-select
              v-model="scheduleMinute"
              filterable
              default-first-option
              placeholder="分"
              aria-label="执行分钟（每 5 分钟）"
              no-match-text="请选择 00、05 … 55"
              style="width: 100px;"
            >
              <el-option
                v-for="minute in scheduleMinutes"
                :key="minute"
                :label="`${minute} 分`"
                :value="minute"
              />
            </el-select>
          </div>
          <div class="form-item-tip form-item-tip--highlight">
            {{ isAdmin ? '提交后等待计划时间自动执行。' : '提交后须由管理员在计划时间前审批通过，否则申请自动失效。' }}
            到点自动预检查并分批安装，默认不重启。
          </div>
        </el-form-item>

        <!-- 分批大小 -->
        <el-form-item label="分批大小 (每批主机数)" required>
          <div style="display: flex; align-items: center; gap: 8px;">
            <el-input-number
              v-model="batchSize"
              :min="1"
              :max="1000"
              style="width: 140px;"
              :controls="false"
            />
            <el-tooltip
              content="目标主机会按照该数值拆分成多个批次，依次下发执行（前一批执行完成后自动接续下一批），以降低大规模并发更新时的网络及系统负载。"
              placement="top"
            >
              <i class="fa fa-info-circle" style="color: var(--el-text-color-secondary); cursor: pointer;" />
            </el-tooltip>
            <span style="font-size: 12px; color: var(--el-text-color-secondary); margin-left: 4px;">
              默认 50，不填或设空则使用系统参数
            </span>
          </div>
        </el-form-item>
      </el-form>
    </div>

    <!-- 底部操作按钮 -->
    <template #footer>
      <div class="dialog-footer">
        <template v-if="currentStep === 0">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            :disabled="selectedHosts.length === 0 || installDataLoading || affectedPackagesLoading"
            @click="handleGoNextStep"
          >
            下一步
            <i class="fa fa-chevron-right ms-1" />
          </el-button>
        </template>
        <template v-else>
          <el-button :disabled="submitting" @click="currentStep = 0">
            <i class="fa fa-chevron-left me-1" />
            上一步
          </el-button>
          <el-button
            type="primary"
            :loading="submitting"
            :disabled="isSubmitDisabled"
            @click="handleSubmit"
          >
            <i class="fa fa-play-circle me-1" />
            {{ isAdmin ? '提交定时安装' : '提交安装申请' }}
          </el-button>
        </template>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDateTime } from '@/utils/date'
import { useAuth } from '@/core/auth'
import { patchInstallApi } from '../../../api'
import { useTableSelectAll } from '../../../composables/useTableSelectAll'
import { normalizeAcmDeviceSelection } from '@/modules/automation/components/job/schedule/components/acmDeviceSelector.utils'
import { isFutureSchedule } from '../../../utils/patchInstallSchedule'
import { normalizeAffectedPackages } from '../../../utils/packageParser'
import PatchTaskStepper from '../PatchTaskStepper.vue'
import PatchTaskPackageList from '../PatchTaskPackageList.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  selectedPatches: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:visible', 'success'])

const { user } = useAuth()
const isAdmin = computed(() => user.value?.login === 'admin')

const dialogVisible = computed({
  get: () => props.visible,
  set: val => emit('update:visible', val)
})

// 步骤定义
const wizardSteps = [
  { key: 'select', title: '1. 选择目标主机' },
  { key: 'schedule', title: '2. 定时与分批配置' }
]
const currentStep = ref(0)
const stepStates = computed(() => {
  if (currentStep.value === 0) return ['active', 'idle']
  return ['success', 'active']
})

// ============================================================
// 步骤一：受影响主机与受影响包联动查询
// ============================================================
const installDataLoading = ref(false)
const affectedHosts = ref([])
const selectedHosts = ref([])
const hostTableRef = ref(null)
const hostFilter = ref('@@(linux)')
const hostSearchText = ref('')
const hostPagination = reactive({
  page: 1,
  pageSize: 10
})

const filteredHosts = computed(() => {
  let list = affectedHosts.value
  if (hostSearchText.value) {
    const kw = hostSearchText.value.toLowerCase().trim()
    list = list.filter(
      h =>
        (h.hostKey || h.host_key || h.hostname || '').toLowerCase().includes(kw) ||
        (h.os_distro || '').toLowerCase().includes(kw) ||
        (h.os_version || '').toLowerCase().includes(kw)
    )
  }
  return list
})

const paginatedHosts = computed(() => {
  const start = (hostPagination.page - 1) * hostPagination.pageSize
  return filteredHosts.value.slice(start, start + hostPagination.pageSize)
})

watch(filteredHosts, list => {
  const maxPage = Math.max(1, Math.ceil(list.length / hostPagination.pageSize))
  if (hostPagination.page > maxPage) {
    hostPagination.page = 1
  }
})

const {
  allSelected: hostAllSelected,
  handleToggleAllSelection: toggleHostSelectAll,
  handleTableSelect: updateHostTableSelection,
  resetAllSelected: resetHostAllSelected
} = useTableSelectAll(hostTableRef, {
  tableData: paginatedHosts,
  filteredData: filteredHosts,
  selectedItems: selectedHosts,
  matchFn: (left, right) =>
    (left.hostId || left.id || left.hostKey) === (right.hostId || right.id || right.hostKey)
})

function handleHostPageChange(page) {
  hostPagination.page = page
}

function handleHostSizeChange(size) {
  hostPagination.pageSize = size
  hostPagination.page = 1
}

function handleToggleHostSelectAll() {
  toggleHostSelectAll()
  scheduleAffectedPackageRefresh()
}

function handleHostTableSelect(selection) {
  updateHostTableSelection(selection)
  scheduleAffectedPackageRefresh()
}

// 受影响软件包相关状态
const affectedPackagesLoading = ref(false)
const affectedPackagesRaw = ref([])
const packageSearchText = ref('')
const packageDisplayLimit = ref(20)
let packageRefreshTimer = null
let packageRequestId = 0

function formatAffectedPackageDisplay(pkg = {}) {
  const targetPackage = String(pkg.file_name || pkg.target_pkg || pkg.pkg_name || '').trim()
  const installedPackage = String(pkg.installed_pkg || '').trim()

  if (installedPackage && targetPackage && installedPackage !== targetPackage) {
    return `${installedPackage} → ${targetPackage}`
  }

  return targetPackage || installedPackage
}

const affectedPackagesDisplay = computed(() => {
  const list = affectedPackagesRaw.value.map(formatAffectedPackageDisplay).filter(Boolean)
  return [...new Set(list)]
})

const filteredPackages = computed(() => {
  if (!packageSearchText.value) return affectedPackagesDisplay.value
  const kw = packageSearchText.value.toLowerCase().trim()
  return affectedPackagesDisplay.value.filter(p => p.toLowerCase().includes(kw))
})

const paginatedPackages = computed(() => {
  return filteredPackages.value.slice(0, packageDisplayLimit.value)
})

const hasMorePackages = computed(() => {
  return packageDisplayLimit.value < filteredPackages.value.length
})

function loadMorePackages() {
  packageDisplayLimit.value += 20
}

const packageEmptyText = computed(() => {
  if (selectedHosts.value.length === 0) {
    return '请勾选目标主机后查看匹配的软件包'
  }
  return affectedPackagesDisplay.value.length === 0 ? '暂无数据' : '未匹配到相关软件包'
})

async function fetchAffectedPackagesImmediate(patchIds, hostIds, requestId) {
  affectedPackagesLoading.value = true
  try {
    const res = await patchInstallApi.getAffectedPackages({
      patch_ids: patchIds,
      host_ids: hostIds
    })
    if (requestId === packageRequestId) {
      affectedPackagesRaw.value = res?.data || []
    }
  } catch (err) {
    if (requestId === packageRequestId) {
      console.error('Failed to load affected packages:', err)
      ElMessage.error('获取受影响软件包失败，请重试')
      affectedPackagesRaw.value = []
    }
  } finally {
    if (requestId === packageRequestId) {
      affectedPackagesLoading.value = false
    }
  }
}

function scheduleAffectedPackageRefresh() {
  if (packageRefreshTimer) {
    clearTimeout(packageRefreshTimer)
    packageRefreshTimer = null
  }
  const currentReqId = ++packageRequestId
  const hosts = [...selectedHosts.value]
  const patchIds = props.selectedPatches.map(p => p.patch_id).filter(Boolean)
  const hostIds = hosts.map(h => h.hostId || h.id || h.hostKey).filter(Boolean)

  if (patchIds.length === 0 || hostIds.length === 0) {
    affectedPackagesRaw.value = []
    return
  }

  packageRefreshTimer = setTimeout(() => {
    fetchAffectedPackagesImmediate(patchIds, hostIds, currentReqId)
  }, 350)
}

// 步骤一加载数据
async function loadStep0Data() {
  installDataLoading.value = true
  affectedHosts.value = []
  selectedHosts.value = []
  affectedPackagesRaw.value = []
  resetHostAllSelected()

  const patchIds = props.selectedPatches.map(p => p.patch_id).filter(Boolean)
  if (patchIds.length === 0) {
    installDataLoading.value = false
    return
  }

  try {
    const res = await patchInstallApi.getMachinesByPatch({
      patch_ids: patchIds,
      hostId: '@@(linux)'
    })
    if (res?.data?.records) {
      affectedHosts.value = res.data.records
    }
  } catch (err) {
    console.error('Failed to load affected machines:', err)
    ElMessage.error('获取受影响主机失败，请稍后重试')
  } finally {
    installDataLoading.value = false
  }
}

// ============================================================
// 步骤二：定时与分批配置
// ============================================================
const scheduleDate = ref('')
const scheduleHour = ref('')
const scheduleMinute = ref('')
const scheduleHours = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'))
const scheduleMinutes = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'))
const batchSize = ref(50)
const submitting = ref(false)

const scheduledTimeString = computed(() => {
  return scheduleDate.value && scheduleHour.value && scheduleMinute.value
    ? `${scheduleDate.value} ${scheduleHour.value}:${scheduleMinute.value}`
    : ''
})

function disabledScheduleDate(date) {
  // 禁止选择早于今天的日期
  return date.getTime() < new Date().setHours(0, 0, 0, 0)
}

const resolvedPackages = computed(() => {
  // 优先从接口返回的受影响包列表中标准化解析
  const list = normalizeAffectedPackages(affectedPackagesRaw.value)
  if (list.length > 0) return list

  // 若尚未返回，尝试从补丁对象自带 packages 提取
  const fallback = props.selectedPatches.flatMap(p => p.packages || p.packageEntry || p.packageEntries || []).filter(Boolean)
  return normalizeAffectedPackages(fallback)
})

const isSubmitDisabled = computed(() => {
  if (submitting.value) return true
  if (!scheduledTimeString.value) return true
  if (selectedHosts.value.length === 0) return true
  return false
})

async function handleGoNextStep() {
  if (selectedHosts.value.length === 0) {
    ElMessage.warning('请至少勾选一台目标主机')
    return
  }
  if (packageRefreshTimer) {
    clearTimeout(packageRefreshTimer)
    packageRefreshTimer = null
    const patchIds = props.selectedPatches.map(p => p.patch_id).filter(Boolean)
    const hostIds = selectedHosts.value.map(h => h.hostId || h.id || h.hostKey).filter(Boolean)
    await fetchAffectedPackagesImmediate(patchIds, hostIds, packageRequestId)
  }
  currentStep.value = 1
}

async function handleSubmit() {
  if (submitting.value) return

  if (scheduledTimeString.value && !/^\d{4}-\d{2}-\d{2} \d{2}:[0-5][05]$/.test(scheduledTimeString.value)) {
    ElMessage.warning('计划执行时间的分钟只能选择 5 的倍数')
    return
  }
  if (!isFutureSchedule(scheduledTimeString.value)) {
    ElMessage.warning('请选择晚于当前时间的计划执行时间')
    return
  }
  if (selectedHosts.value.length === 0) {
    ElMessage.warning('请选择目标主机')
    return
  }

  const pkgs = resolvedPackages.value
  if (pkgs.length === 0) {
    ElMessage.warning('未能识别到有效的待更新软件包，请确认所选主机和补丁')
    return
  }

  const targets = normalizeAcmDeviceSelection(selectedHosts.value, 'linux')
  const payload = {
    targets,
    packages: pkgs,
    scheduledTime: `${scheduledTimeString.value}:00`,
    batchSize: batchSize.value || 50
  }

  submitting.value = true
  try {
    await ElMessageBox.confirm(
      `确定对已选中的 ${targets.length} 项目标资产提交定时安装吗？计划时间：${payload.scheduledTime}。${isAdmin.value ? '届时自动执行' : '需管理员提前审批通过'}，自动预检查、分批安装且默认不重启。`,
      '确认提交定时安装',
      {
        confirmButtonText: '确认提交',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    if (!isFutureSchedule(payload.scheduledTime)) {
      ElMessage.warning('计划执行时间已过，请重新选择')
      return
    }

    const response = await patchInstallApi.createAndRunTask(payload)
    if (response?.data) {
      ElMessage.success(
        response.data.status === 'PENDING_APPROVAL'
          ? '安装申请已提交，等待管理员审批'
          : '定时安装任务已提交，等待计划时间执行'
      )
      emit('success', response.data)
      dialogVisible.value = false
    } else {
      ElMessage.error('创建定时安装任务失败')
    }
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('Failed to create scheduled patch install task:', error)
      ElMessage.error(error?.response?.data?.message || error?.response?.data?.error || error?.message || '创建任务失败，请检查参数')
    }
  } finally {
    submitting.value = false
  }
}

function handleClosed() {
  if (packageRefreshTimer) {
    clearTimeout(packageRefreshTimer)
    packageRefreshTimer = null
  }
  packageRequestId += 1
  currentStep.value = 0
  scheduleDate.value = ''
  scheduleHour.value = ''
  scheduleMinute.value = ''
  batchSize.value = 50
  selectedHosts.value = []
  affectedPackagesRaw.value = []
  packageSearchText.value = ''
  hostSearchText.value = ''
  resetHostAllSelected()
}

watch(
  () => props.visible,
  visible => {
    if (visible) {
      currentStep.value = 0
      loadStep0Data()
    }
  }
)
</script>

<style scoped lang="scss">
.schedule-install-dialog {
  :deep(.el-dialog__body) {
    padding: 16px 20px 20px;
    max-height: calc(85vh - 120px);
    overflow-y: auto;
  }
}

.schedule-step-0-layout {
  display: grid;
  grid-template-columns: minmax(280px, 2fr) minmax(0, 3fr);
  align-items: start;
  gap: 16px;
}

.schedule-card {
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;

  .card-header {
    padding: 8px 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    background: var(--el-fill-color-light);
    color: var(--el-text-color-primary);
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .card-header--with-actions {
    justify-content: space-between;
    min-height: 36px;
    padding: 4px 12px;
  }

  .card-body {
    padding: 12px;
  }

  .card-body--scroll {
    height: 180px;
    overflow-y: auto;
  }
}

.schedule-card--full {
  grid-column: 1 / -1;
}

.selection-item {
  padding: 6px 0;
  border-bottom: 1px dashed var(--el-border-color-lighter);

  &:last-child {
    border-bottom: none;
  }

  &__primary {
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-primary);
    display: flex;
    align-items: center;
  }

  &__secondary {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.no-data {
  color: var(--el-text-color-placeholder);
  text-align: center;
  padding: 30px 0;
  font-size: 13px;
}

.host-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.host-name-cell {
  font-family: monospace;
  font-weight: 500;
}

.host-pagination {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.schedule-step-1-layout {
  padding: 8px 12px;
}

.summary-banner {
  display: flex;
  gap: 24px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 20px;

  .summary-item {
    font-size: 13px;

    .summary-label {
      color: var(--el-text-color-secondary);
    }

    .summary-value {
      font-weight: 600;
      color: var(--el-color-primary);
      margin-left: 4px;
    }
  }
}

.schedule-form {
  max-width: 650px;
}

.schedule-time-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}

.form-item-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  width: 100%;

  &--highlight {
    color: var(--el-color-primary);
    line-height: 1.5;
    margin-top: 6px;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.severity-tag {
  &.is-critical {
    background-color: #f56c6c;
    border-color: #f56c6c;
  }
  &.is-important {
    background-color: #e6a23c;
    border-color: #e6a23c;
  }
  &.is-moderate {
    background-color: #909399;
    border-color: #909399;
  }
  &.is-low {
    background-color: #409eff;
    border-color: #409eff;
  }
}
</style>
