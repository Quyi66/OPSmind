<template>
  <el-dialog
    v-model="dialogVisible"
    :title="t('patches.linux.scheduleInstall')"
    width="1080px"
    top="5vh"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
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
            {{ t('patches.linux.selectedPatchesCount', { count: selectedPatches.length }) }}
          </div>
          <div class="card-body card-body--scroll">
            <div v-if="selectedPatches.length === 0" class="no-data">{{ t('common.noData') }}</div>
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
              {{ t('patches.linux.affectedPackagesCount', { count: affectedPackagesDisplay.length }) }}
            </div>
            <el-input
              v-if="affectedPackagesDisplay.length > 10"
              v-model="packageSearchText"
              :placeholder="t('patches.linux.searchPackages')"
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
            {{ t('patches.linux.targetHostsSelected', { selected: selectedHosts.length, total: affectedHosts.length }) }}
          </div>
          <div class="card-body">
            <div class="host-toolbar">
              <div class="host-filter">
              <span class="host-filter__label">{{ t('patches.linux.group') }}</span>
              <el-select
                v-model="selectedGroupIds"
                multiple
                filterable
                clearable
                collapse-tags
                collapse-tags-tooltip
                :loading="groupLoading"
                :placeholder="t('patches.linux.allGroups')"
                :aria-label="t('patches.linux.filterHostsGroup')"
                size="small"
                style="width: 180px"
                @change="loadStep0Data"
              >
                <el-option
                  v-for="group in groupOptions"
                  :key="group.id"
                  :label="group.label"
                  :value="group.id"
                />
              </el-select>
              </div>
              <div class="host-filter">
              <span class="host-filter__label">{{ t('automation.job.tag') }}</span>
              <el-select
                v-model="selectedTagNames"
                multiple
                filterable
                clearable
                collapse-tags
                collapse-tags-tooltip
                :loading="groupLoading"
                :placeholder="t('patches.linux.allTags')"
                :aria-label="t('patches.linux.filterHostsTag')"
                size="small"
                style="width: 180px"
                @change="loadStep0Data"
              >
                <el-option
                  v-for="tag in tagOptions"
                  :key="tag.name"
                  :label="tag.label"
                  :value="tag.name"
                />
              </el-select>
              </div>
              <el-input
                v-model="hostSearchText"
                :placeholder="t('patches.linux.searchHostnameIpOs')"
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
                {{ hostAllSelected ? t('patches.linux.clearAll') : t('patches.linux.selectAll') }}
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
              <el-table-column prop="hostKey" :label="t('execution.ui.host')" min-width="180" sortable>
                <template #default="{ row }">
                  <span class="host-name-cell">{{ row.hostKey || row.host_key || row.hostname }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="os_distro" label="OS" width="120" sortable />
              <el-table-column prop="os_version" :label="t('patches.linux.osVersionShort')" width="120" sortable />
              <el-table-column prop="scan_timestamp" :label="t('patches.linux.previousScan')" min-width="160" sortable>
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
          <span class="summary-label">{{ t('patches.linux.selectedPatchesLabel') }}</span>
          <span class="summary-value">{{ selectedPatches.length }} {{ t('patches.linux.itemUnit') }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">{{ t('patches.linux.targetHostsLabel') }}</span>
          <span class="summary-value">{{ selectedHosts.length }} {{ t('patches.linux.hostUnit') }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">{{ t('patches.linux.updatePackageCount') }}</span>
          <span class="summary-value">{{ resolvedPackages.length }} {{ t('patches.linux.itemUnit') }}</span>
        </div>
      </div>

      <el-form label-position="top" size="default" class="schedule-form">
        <!-- 计划执行时间 -->
        <el-form-item :label="t('patches.linux.scheduledTime')" required>
          <div class="schedule-time-row">
            <el-date-picker
              v-model="scheduleDate"
              type="date"
              value-format="YYYY-MM-DD"
              :editable="false"
              :disabled-date="disabledScheduleDate"
              :placeholder="t('patches.linux.selectDate')"
              style="flex: 1; min-width: 160px;"
            />
            <el-select
              v-model="scheduleHour"
              filterable
              default-first-option
              :placeholder="t('automation.schedule.hour')"
              :aria-label="t('patches.linux.executionHour')"
              :no-match-text="t('patches.linux.validHours')"
              style="width: 100px;"
            >
              <el-option
                v-for="hour in scheduleHours"
                :key="hour"
                :label="t('patches.linux.hourOption', { hour: hour })"
                :value="hour"
              />
            </el-select>
            <el-select
              v-model="scheduleMinute"
              filterable
              default-first-option
              :placeholder="t('automation.schedule.minute')"
              :aria-label="t('patches.linux.executionMinutes')"
              :no-match-text="t('patches.linux.validMinutes')"
              style="width: 100px;"
            >
              <el-option
                v-for="minute in scheduleMinutes"
                :key="minute"
                :label="t('patches.linux.minuteOption', { minute: minute })"
                :value="minute"
              />
            </el-select>
          </div>
          <div class="form-item-tip form-item-tip--highlight">
            {{ isAdmin ? t('patches.linux.submitAfterSchedule') : t('patches.linux.approveBeforeSchedule') }}
            {{ t('patches.linux.scheduleBehavior') }}
          </div>
        </el-form-item>

        <!-- 分批大小 -->
        <el-form-item :label="t('patches.linux.batchSize')" required>
          <div style="display: flex; align-items: center; gap: 8px;">
            <el-input-number
              v-model="batchSize"
              :min="1"
              :max="1000"
              style="width: 140px;"
              :controls="false"
            />
            <el-tooltip
              :content="t('patches.linux.batchSizeHint')"
              placement="top"
            >
              <i class="fa fa-info-circle" style="color: var(--el-text-color-secondary); cursor: pointer;" />
            </el-tooltip>
            <span style="font-size: 12px; color: var(--el-text-color-secondary); margin-left: 4px;">
              {{ t('patches.linux.defaultBatchSize') }}
            </span>
          </div>
        </el-form-item>
      </el-form>
    </div>

    <!-- 底部操作按钮 -->
    <template #footer>
      <div class="dialog-footer">
        <template v-if="currentStep === 0">
          <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
          <el-button
            type="primary"
            :disabled="selectedHosts.length === 0 || installDataLoading || affectedPackagesLoading"
            @click="handleGoNextStep"
          >
            {{ t('patches.linux.nextStep') }}
            <i class="fa fa-chevron-right ms-1" />
          </el-button>
        </template>
        <template v-else>
          <el-button :disabled="submitting" @click="currentStep = 0">
            <i class="fa fa-chevron-left me-1" />
            {{ t('patches.linux.previousStep') }}
          </el-button>
          <el-button
            type="primary"
            :loading="submitting"
            :disabled="isSubmitDisabled"
            @click="handleSubmit"
          >
            <i class="fa fa-play-circle me-1" />
            {{ isAdmin ? t('patches.linux.submitScheduledInstall') : t('patches.linux.submitInstallRequest') }}
          </el-button>
        </template>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { t } from '@/core/i18n'
import { ref, reactive, computed, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDateTime } from '@/utils/date'
import { useAuth } from '@/core/auth'
import { patchInstallApi } from '../../../api'
import { useTableSelectAll } from '../../../composables/useTableSelectAll'
import { normalizeAcmDeviceSelection } from '@/modules/automation/components/job/schedule/components/acmDeviceSelector.utils'
import { isFutureSchedule } from '../../../utils/patchInstallSchedule'
import { normalizeAffectedPackages } from '../../../utils/packageParser'
import { usePatchHostGroupFilter } from '../usePatchHostGroupFilter'
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
  { key: 'select', get title() { return t('patches.linux.scheduleHostsStep') } },
  { key: 'schedule', get title() { return t('patches.linux.scheduleConfigStep') } }
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
const hostSearchText = ref('')
const {
  selectedGroupIds,
  groupOptions,
  selectedTagNames,
  tagOptions,
  groupLoading,
  loadGroupOptions,
  resetGroupFilter
} = usePatchHostGroupFilter()
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
let hostRequestId = 0

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
    return t('patches.linux.checkHostsForPackages')
  }
  return affectedPackagesDisplay.value.length === 0 ? t('common.noData') : t('patches.linux.noPackageMatches')
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
      ElMessage.error(t('patches.linux.affectedPackagesFailed'))
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
  const requestId = ++hostRequestId
  if (packageRefreshTimer) {
    clearTimeout(packageRefreshTimer)
    packageRefreshTimer = null
  }
  packageRequestId += 1
  affectedPackagesLoading.value = false
  installDataLoading.value = true
  affectedHosts.value = []
  selectedHosts.value = []
  affectedPackagesRaw.value = []
  hostPagination.page = 1
  resetHostAllSelected()

  const patchIds = props.selectedPatches.map(p => p.patch_id).filter(Boolean)
  if (patchIds.length === 0) {
    installDataLoading.value = false
    return
  }

  try {
    const res = await patchInstallApi.getMachinesByPatch({
      patch_ids: patchIds,
      hostId: '@@(linux)',
      groupIds: [...selectedGroupIds.value],
      tagNames: [...selectedTagNames.value]
    })
    if (requestId !== hostRequestId) return
    if (res?.data?.records) {
      affectedHosts.value = res.data.records
    }
  } catch (err) {
    if (requestId !== hostRequestId) return
    console.error('Failed to load affected machines:', err)
    ElMessage.error(t('patches.linux.affectedHostsFailedLater'))
  } finally {
    if (requestId === hostRequestId) installDataLoading.value = false
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
    ElMessage.warning(t('patches.linux.checkAtLeastOneHost'))
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
    ElMessage.warning(t('patches.linux.scheduleMinuteInterval'))
    return
  }
  if (!isFutureSchedule(scheduledTimeString.value)) {
    ElMessage.warning(t('patches.linux.scheduleMustBeFuture'))
    return
  }
  if (selectedHosts.value.length === 0) {
    ElMessage.warning(t('automation.command.targetHostsRequired'))
    return
  }

  const pkgs = resolvedPackages.value
  if (pkgs.length === 0) {
    ElMessage.warning(t('patches.linux.validPackagesMissing'))
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
      t('patches.linux.scheduleConfirm', { count: targets.length, time: payload.scheduledTime, approval: isAdmin.value ? t('patches.linux.executeOnSchedule') : t('patches.linux.requiresAdminApproval') }),
      t('patches.linux.confirmSchedule'),
      {
        closeOnClickModal: false,
        closeOnPressEscape: false,
        get confirmButtonText() { return t('patches.linux.confirmSubmit') },
        get cancelButtonText() { return t('common.cancel') },
        type: 'info'
      }
    )

    if (!isFutureSchedule(payload.scheduledTime)) {
      ElMessage.warning(t('patches.linux.schedulePassed'))
      return
    }

    const response = await patchInstallApi.createAndRunTask(payload)
    if (response?.data) {
      ElMessage.success(
        response.data.status === 'PENDING_APPROVAL'
          ? t('patches.linux.applicationSubmitted')
          : t('patches.linux.scheduledTaskSubmitted')
      )
      emit('success', response.data)
      dialogVisible.value = false
    } else {
      ElMessage.error(t('patches.linux.scheduledTaskFailed'))
    }
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('Failed to create scheduled patch install task:', error)
      ElMessage.error(error?.response?.data?.message || error?.response?.data?.error || error?.message || t('patches.linux.createTaskCheckParams'))
    }
  } finally {
    submitting.value = false
  }
}

function handleClosed() {
  hostRequestId += 1
  installDataLoading.value = false
  resetGroupFilter()
  if (packageRefreshTimer) {
    clearTimeout(packageRefreshTimer)
    packageRefreshTimer = null
  }
  packageRequestId += 1
  affectedPackagesLoading.value = false
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
      resetGroupFilter()
      loadGroupOptions()
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
  gap: 16px;
  margin-bottom: 10px;
}

.host-filter {
  display: flex;
  align-items: center;
  gap: 6px;
}

.host-filter__label {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--el-text-color-regular);
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

:deep(.patch-task-package-list__item) {
  color: #666;
}

:global(html.dark) :deep(.patch-task-package-list__item) {
  color: var(--el-text-color-secondary);
}
</style>
