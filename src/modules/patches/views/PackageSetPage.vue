<template>
  <div class="ops-page-layout">
    <!-- Tab 导航 -->
    <el-tabs v-model="activeTab" class="mb-3">
      <el-tab-pane :label="t('patches.linux.batchInstall')" name="install" />
      <el-tab-pane :label="t('patches.linux.packageSetManagement')" name="management" />
    </el-tabs>

    <!-- 一键分批安装 Tab -->
    <template v-if="activeTab === 'install'">
      <div style="display: flex; gap: 20px; height: calc(100vh - 180px); overflow: hidden;">
        <!-- 左侧配置区 -->
        <div style="flex: 2; display: flex; flex-direction: column; gap: 16px; background: var(--el-bg-color); border: 1px solid var(--el-border-color-light); border-radius: 8px; padding: 20px; min-width: 0;">
          <h3 class="m-0 mb-3" style="font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <i class="fa fa-sliders-h" style="color: var(--el-color-primary);" />
            {{ t('patches.linux.installConfigStep') }}
          </h3>

          <el-form label-position="top" size="small" style="flex: 1; overflow-y: auto; padding-right: 8px;">
            <!-- 包集选择方式 -->
            <el-form-item :label="t('patches.linux.packageSource')">
              <el-radio-group v-model="installForm.useCustomPackages">
                <el-radio-button :value="false">{{ t('patches.linux.chooseExistingSet') }}</el-radio-button>
                <el-radio-button :value="true">{{ t('patches.linux.enterTemporaryPackages') }}</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <!-- 选择已有包集 -->
            <el-form-item v-if="!installForm.useCustomPackages" :label="t('patches.linux.choosePackageSet')" required>
              <div style="width: 100%;">
                <div style="display: flex; gap: 8px; width: 100%;">
                  <el-select
                    v-model="installForm.packageSetId"
                    :placeholder="t('patches.linux.selectPackageSet')"
                    style="flex: 1;"
                    clearable
                    @change="handlePackageSetChange"
                  >
                    <el-option
                      v-for="item in packageSets"
                      :key="item.id"
                      :label="item.name"
                      :value="item.id"
                    >
                      <span style="float: left;">{{ item.name }}</span>
                      <span style="float: right; color: var(--el-text-color-secondary); font-size: 12px; margin-left: 20px;">
                        {{ item.source === 'headquarters' ? t('patches.linux.headquarters') : t('patches.linux.custom') }}
                      </span>
                    </el-option>
                  </el-select>
                  <el-button
                    type="primary"
                    plain
                    @click="handleCreatePackageSet"
                  >
                    {{ t('patches.linux.newPackageSet') }}
                  </el-button>
                </div>

                <!-- 已选包集信息展示 -->
                <div v-if="selectedPackageSet" class="mt-2" style="background: var(--el-fill-color-light); border-radius: 8px; padding: 16px; font-size: 13px; border: 1px solid var(--el-border-color-lighter); width: 100%; box-sizing: border-box;">
                  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 12px;">
                    <div><strong>{{ t('patches.linux.applicableOsLabel') }}</strong><span style="color: var(--el-text-color-regular);">{{ selectedPackageSet.osType }}</span></div>
                    <div><strong>{{ t('patches.linux.setDescriptionLabel') }}</strong><span style="color: var(--el-text-color-regular);">{{ selectedPackageSet.description || t('patches.linux.none') }}</span></div>
                  </div>
                  <div>
                    <strong style="display: block; margin-bottom: 8px;">{{ t('patches.linux.includedPackagesLabel') }}</strong>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px; max-height: 350px; overflow-y: auto; padding: 2px;">
                      <el-tag
                        v-for="pkg in parsedSelectedPackages"
                        :key="pkg"
                        size="small"
                        type="info"
                        effect="light"
                        round
                      >
                        {{ pkg }}
                      </el-tag>
                    </div>
                  </div>
                </div>
              </div>
            </el-form-item>

            <!-- 临时输入包名 -->
            <el-form-item v-else :label="t('patches.linux.inputPackageName')" required>
              <el-input
                v-model="installForm.customPackagesText"
                type="textarea"
                :rows="5"
                :placeholder="t('patches.linux.packageNameInput')"
              />
              <div style="font-size: 12px; color: var(--el-text-color-secondary);" class="mt-1">
                {{ t('patches.linux.packageInputHint') }}
              </div>
            </el-form-item>

            <el-form-item :label="t('patches.linux.scheduledTime')" required>
              <div style="display: flex; flex-wrap: wrap; gap: 8px; width: 100%;">
                <el-date-picker v-model="scheduleDate" type="date" value-format="YYYY-MM-DD"
                  :editable="false" :placeholder="t('patches.linux.selectDate')" style="flex: 1; min-width: 150px;" />
                <el-select v-model="scheduleHour" filterable default-first-option :placeholder="t('automation.schedule.hour')" :aria-label="t('patches.linux.executionHourFilter')" :no-match-text="t('patches.linux.validHours')" style="width: 85px;">
                  <el-option v-for="hour in scheduleHours" :key="hour" :label="t('patches.linux.hourOption', { hour: hour })" :value="hour" />
                </el-select>
                <el-select v-model="scheduleMinute" filterable default-first-option :placeholder="t('automation.schedule.minute')" :aria-label="t('patches.linux.executionMinuteFilter')" :no-match-text="t('patches.linux.validMinutes')" style="width: 85px;">
                  <el-option v-for="minute in scheduleMinutes" :key="minute" :label="t('patches.linux.minuteOption', { minute: minute })" :value="minute" />
                </el-select>
              </div>
              <div class="mt-1" style="font-size: 12px; color: var(--el-text-color-secondary); width: 100%;">
                {{ t('patches.linux.scheduleTimeHint') }}
              </div>
              <div class="mt-1" style="font-size: 12px; color: var(--el-text-color-secondary);">
                {{ isAdmin ? t('patches.linux.submitAfterSchedule') : t('patches.linux.approveBeforeSchedule') }}
                {{ t('patches.linux.scheduleBehavior') }}
              </div>
            </el-form-item>

            <!-- 每批数量 -->
            <el-form-item :label="t('patches.linux.batchSize')" required>
              <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
                <el-input-number
                  v-model="installForm.batchSize"
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

        <!-- 右侧资产选择器 -->
        <div style="flex: 3; display: flex; flex-direction: column; background: var(--el-bg-color); border: 1px solid var(--el-border-color-light); border-radius: 8px; padding: 20px; min-width: 0;">
          <h3 class="m-0 mb-3" style="font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <i class="fa fa-server" style="color: var(--el-color-primary);" />
            {{ t('patches.linux.selectHostsStep') }}
          </h3>
          <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; margin-bottom: 20px;">
            <AcmDeviceSelector
              class="package-host-selector"
              v-model="selectedHosts"
              ci-types="[auto]"
              :options="{
                selectMode: 'host,group,tag,input,recently',
                selector: 'multiple',
                label: t('patches.linux.selectTargetHosts')
              }"
            />
          </div>
          <div class="pt-3" style="border-top: 1px solid var(--el-border-color-lighter); display: flex; justify-content: flex-end;">
            <el-button
              type="primary"
              size="default"
              :disabled="isSubmitDisabled"
              :loading="submitting"
              style="width: 100%; font-weight: 600;"
              @click="handleStartOneClickInstall"
            >
              <i class="fa fa-play-circle me-1" />
              {{ isAdmin ? t('patches.linux.submitScheduledInstall') : t('patches.linux.submitInstallRequest') }}
            </el-button>
          </div>
        </div>
      </div>
    </template>

    <!-- 软件包集管理 Tab -->
    <template v-if="activeTab === 'management'">
      <!-- 操作工具栏 -->
      <div class="ops-action-bar">
        <el-button type="primary" size="small" @click="handleCreatePackageSet">
          <i class="fa fa-plus me-1" />
          {{ t('patches.linux.newPackageSet') }}
        </el-button>
        <span style="flex: 1"></span>
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="loadingSets"
          :title="t('common.refresh')"
          @click="loadPackageSets"
        >
          <el-icon v-show="!loadingSets"><Refresh /></el-icon>
        </el-button>
      </div>

      <!-- 数据表格 -->
      <div class="ops-table-wrapper">
        <el-table v-loading="loadingSets" :data="packageSets" height="100%">
          <el-table-column prop="name" :label="t('patches.linux.packageSetName')" min-width="180" show-overflow-tooltip />
          <el-table-column prop="osType" :label="t('patches.linux.applicableOs')" width="100" />
          <el-table-column prop="source" :label="t('patches.linux.packageSetSource')" width="100">
            <template #default="{ row }">
              <el-tag :type="row.source === 'headquarters' ? 'warning' : 'info'" size="small" round>
                {{ row.source === 'headquarters' ? t('patches.linux.headquartersDistributed') : t('patches.linux.branchCustom') }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="description" :label="t('patches.linux.setDescription')" min-width="200" show-overflow-tooltip />
          <el-table-column prop="packages" :label="t('patches.linux.includedPackageCount')" width="120">
            <template #default="{ row }">
              {{ countPackages(row.packages) }} {{ t('patches.linux.itemUnit') }}
            </template>
          </el-table-column>
          <el-table-column prop="updatedTime" :label="t('automation.command.updatedAt')" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.updatedTime) }}
            </template>
          </el-table-column>
          <el-table-column :label="t('common.actions')" width="120" fixed="right">
            <template #default="{ row }">
              <el-button text type="primary" size="small" @click="handleEditPackageSet(row)">
                {{ t('common.edit') }}
              </el-button>
              <el-button
                v-if="row.source !== 'headquarters'"
                text
                type="danger"
                size="small"
                @click="handleDeletePackageSet(row)"
              >
                {{ t('common.delete') }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>

    <!-- 包集编辑对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      :title="editForm.id ? t('patches.linux.editPackageSet') : t('patches.linux.newPackageSetTitle')"
      width="600px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" :validate-on-rule-change="false" label-width="100px" size="small">
        <el-form-item :label="t('patches.linux.packageSetName')" prop="name">
          <el-input v-model="editForm.name" :placeholder="t('patches.linux.enterPackageSetName')" />
        </el-form-item>
        <el-form-item :label="t('patches.linux.applicableOs')" prop="osType">
          <el-select v-model="editForm.osType" :placeholder="t('patches.linux.selectApplicableOs')" style="width: 100%;">
            <el-option label="Linux" value="linux" />
            <el-option label="Windows" value="windows" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('automation.job.description')" prop="description">
          <el-input v-model="editForm.description" type="textarea" :rows="2" :placeholder="t('patches.linux.enterSetDescription')" />
        </el-form-item>
        <el-form-item :label="t('patches.linux.packageList')" prop="packagesText">
          <el-input
            v-model="editForm.packagesText"
            type="textarea"
            :rows="8"
            :placeholder="t('patches.linux.packageListInput')"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button size="small" @click="editDialogVisible = false">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" size="small" :loading="savingSet" @click="submitEditForm">
            {{ t('common.save') }}
          </el-button>
        </div>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'
import { useLocalizedValidation } from '@/core/i18n/validation'
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { packageSetApi, patchInstallApi } from '../api'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { normalizeAcmDeviceSelection } from '@/modules/automation/components/job/schedule/components/acmDeviceSelector.utils'
import { useAuth } from '@/core/auth'
import { isFutureSchedule } from '../utils/patchInstallSchedule'
import { parseRawPackagesText } from '../utils/packageParser'

const { user } = useAuth()
const isAdmin = computed(() => user.value?.login === 'admin')
const submitting = ref(false)
const activeTab = ref('install')

// ============================================================
// 包集数据及列表管理
// ============================================================
const loadingSets = ref(false)
const packageSets = ref([])

async function loadPackageSets() {
  loadingSets.value = true
  try {
    const response = await packageSetApi.list({ osType: 'linux' })
    packageSets.value = response || []
  } catch (error) {
    console.error('Failed to load package sets:', error)
    ElMessage.error(t('patches.linux.packageSetsFailed'))
  } finally {
    loadingSets.value = false
  }
}

function countPackages(packagesStr) {
  if (!packagesStr) return 0
  try {
    const arr = JSON.parse(packagesStr)
    return Array.isArray(arr) ? arr.length : 0
  } catch {
    return 0
  }
}

function formatDateTime(timeStr) {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  return date.toLocaleString(currentLocale.value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// ============================================================
// 包集新建/编辑 CRUD
// ============================================================
const editDialogVisible = ref(false)
const savingSet = ref(false)
const editFormRef = ref(null)

const editForm = reactive({
  id: null,
  name: '',
  osType: 'linux',
  source: 'custom',
  description: '',
  packagesText: ''
})

useLocalizedValidation(editFormRef)
const editRules = computed(() => ({
  name: [{ required: true, message: t('patches.linux.enterPackageSetName'), trigger: 'blur' }],
  osType: [{ required: true, message: t('patches.linux.selectApplicableOs'), trigger: 'change' }],
  packagesText: [{ required: true, message: t('patches.linux.enterPackageList'), trigger: 'blur' }]
}))

function handleCreatePackageSet() {
  editForm.id = null
  editForm.name = ''
  editForm.osType = 'linux'
  editForm.source = 'custom'
  editForm.description = ''
  editForm.packagesText = ''
  editDialogVisible.value = true
  nextTick(() => {
    if (editFormRef.value) {
      editFormRef.value.clearValidate()
    }
  })
}

function handleEditPackageSet(row) {
  editForm.id = row.id
  editForm.name = row.name
  editForm.osType = row.osType
  editForm.source = row.source || 'custom'
  editForm.description = row.description || ''

  let pkgs = []
  try {
    pkgs = JSON.parse(row.packages || '[]')
  } catch {
    pkgs = []
  }
  editForm.packagesText = pkgs.join('\n')
  editDialogVisible.value = true
  nextTick(() => {
    if (editFormRef.value) {
      editFormRef.value.clearValidate()
    }
  })
}

async function handleDeletePackageSet(row) {
  try {
    await ElMessageBox.confirm(t('patches.linux.deletePackageSet', { name: row.name }), t('automation.library.deleteTitle'), {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      get confirmButtonText() { return t('automation.list.confirmDelete') },
      get cancelButtonText() { return t('common.cancel') },
      type: 'warning'
    })

    await packageSetApi.delete(row.id)
    ElMessage.success(t('patches.linux.packageSetDeleted'))
    loadPackageSets()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete package set:', error)
      ElMessage.error(t('patches.linux.packageSetDeleteFailed'))
    }
  }
}


async function submitEditForm() {
  if (!editFormRef.value) return
  await editFormRef.value.validate(async (valid) => {
    if (!valid) return

    savingSet.value = true
    try {
      const packageList = parseRawPackagesText(editForm.packagesText)

      if (packageList.length === 0) {
        ElMessage.warning(t('patches.linux.packageListRequired'))
        savingSet.value = false
        return
      }

      const payload = {
        id: editForm.id,
        name: editForm.name,
        osType: editForm.osType,
        source: editForm.source,
        description: editForm.description,
        packages: JSON.stringify(packageList)
      }

      await packageSetApi.save(payload)
      ElMessage.success(t('patches.linux.packageSetSaved'))
      editDialogVisible.value = false
      loadPackageSets()
    } catch (error) {
      console.error('Failed to save package set:', error)
      ElMessage.error(t('patches.linux.packageSetSaveFailed'))
    } finally {
      savingSet.value = false
    }
  })
}

// ============================================================
// 一键分批安装表单
// ============================================================
const selectedHosts = ref([])
const today = new Date()
const scheduleDate = ref(
  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
)
const scheduleHour = ref('20')
const scheduleMinute = ref('00')
const scheduleHours = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'))
const scheduleMinutes = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'))
const installForm = reactive({
  useCustomPackages: false,
  packageSetId: '',
  customPackagesText: '',
  batchSize: 50,
  scheduledTime: ''
})

watch([scheduleDate, scheduleHour, scheduleMinute], ([date, hour, minute]) => {
  installForm.scheduledTime = date && hour && minute ? `${date} ${hour}:${minute}` : ''
}, { immediate: true })

const selectedPackageSet = computed(() => {
  if (installForm.useCustomPackages || !installForm.packageSetId) return null
  return packageSets.value.find(s => s.id === installForm.packageSetId) || null
})

const parsedSelectedPackages = computed(() => {
  if (!selectedPackageSet.value) return []
  try {
    return JSON.parse(selectedPackageSet.value.packages || '[]')
  } catch {
    return []
  }
})

const isSubmitDisabled = computed(() => {
  if (submitting.value || !installForm.scheduledTime) return true
  if (selectedHosts.value.length === 0) return true
  if (installForm.useCustomPackages) {
    return !installForm.customPackagesText.trim()
  } else {
    return !installForm.packageSetId
  }
})

function handlePackageSetChange() {
  // 仅在改变包集时可用作展示
}

async function handleStartOneClickInstall() {
  if (submitting.value) return
  if (installForm.scheduledTime && !/^\d{4}-\d{2}-\d{2} \d{2}:[0-5][05]$/.test(installForm.scheduledTime)) {
    ElMessage.warning(t('patches.linux.scheduleMinuteInterval'))
    return
  }
  if (!isFutureSchedule(installForm.scheduledTime)) {
    ElMessage.warning(t('patches.linux.scheduleMustBeFuture'))
    return
  }
  if (selectedHosts.value.length === 0) {
    ElMessage.warning(t('automation.command.targetHostsRequired'))
    return
  }

  // 构建一键安装请求参数
  const targets = normalizeAcmDeviceSelection(selectedHosts.value, 'linux')
  const payload = {
    targets,
    scheduledTime: `${installForm.scheduledTime}:00`,
    batchSize: installForm.batchSize || 50
  }

  if (installForm.useCustomPackages) {
    const pkgs = parseRawPackagesText(installForm.customPackagesText)
    if (pkgs.length === 0) {
      ElMessage.warning(t('patches.linux.enterPackageName'))
      return
    }
    payload.packages = pkgs
  } else {
    if (!installForm.packageSetId) {
      ElMessage.warning(t('patches.linux.selectPackageSet'))
      return
    }
    payload.packageSetId = installForm.packageSetId
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
      ElMessage.success(response.data.status === 'PENDING_APPROVAL' ? t('patches.linux.applicationSubmitted') : t('patches.linux.scheduledInstallSubmitted'))
      selectedHosts.value = []
      if (installForm.useCustomPackages) {
        installForm.customPackagesText = ''
      } else {
        installForm.packageSetId = ''
      }
    } else {
      ElMessage.error(t('patches.linux.batchInstallCreateFailed'))
    }
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('Failed to create and run task:', error)
      ElMessage.error(error?.response?.data?.message || error?.response?.data?.error || error?.message || t('patches.linux.createTaskCheckParams'))
    }
  } finally {
    submitting.value = false
  }
}

// ============================================================
// 生命周期钩子
// ============================================================
onMounted(() => {
  loadPackageSets()
})

</script>

<style scoped lang="scss">
.package-host-selector {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.package-host-selector :deep(.device-list-container) {
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: 100%;
}

.package-host-selector :deep(.device-list-container > div) {
  flex-shrink: 0;
}

.package-host-selector :deep(.device-chip-list) {
  min-height: 0;
  max-height: none;
  flex: 0 1 auto;
  align-content: flex-start;
}

/* 遵循 UI 规范，不在 scoped 样式里包含任何 .el- 或 .ops- 前缀覆盖类 */
.m-0 {
  margin: 0;
}
.mb-1 {
  margin-bottom: 4px;
}
.mb-2 {
  margin-bottom: 8px;
}
.mb-3 {
  margin-bottom: 12px;
}
.mt-1 {
  margin-top: 4px;
}
.mt-2 {
  margin-top: 8px;
}
.mt-3 {
  margin-top: 12px;
}
.me-1 {
  margin-right: 4px;
}
.me-2 {
  margin-right: 8px;
}
.pt-3 {
  padding-top: 12px;
}
</style>
