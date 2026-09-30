<template>
  <div class="ops-page-layout">
    <!-- Tab 导航 -->
    <el-tabs v-model="activeTab" class="mb-3">
      <el-tab-pane label="一键分批安装" name="install" />
      <el-tab-pane label="软件包集管理" name="management" />
    </el-tabs>

    <!-- 一键分批安装 Tab -->
    <template v-if="activeTab === 'install'">
      <div style="display: flex; gap: 20px; height: calc(100vh - 180px); overflow: hidden;">
        <!-- 左侧配置区 -->
        <div style="flex: 2; display: flex; flex-direction: column; gap: 16px; background: var(--el-bg-color); border: 1px solid var(--el-border-color-light); border-radius: 8px; padding: 20px; min-width: 0;">
          <h3 class="m-0 mb-3" style="font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <i class="fa fa-sliders-h" style="color: var(--el-color-primary);" />
            1. 安装配置
          </h3>

          <el-form label-position="top" size="small" style="flex: 1; overflow-y: auto; padding-right: 8px;">
            <!-- 包集选择方式 -->
            <el-form-item label="软件包来源">
              <el-radio-group v-model="installForm.useCustomPackages">
                <el-radio-button :value="false">选择已有包集</el-radio-button>
                <el-radio-button :value="true">临时输入包名</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <!-- 选择已有包集 -->
            <el-form-item v-if="!installForm.useCustomPackages" label="选择软件包集" required>
              <div style="width: 100%;">
                <div style="display: flex; gap: 8px; width: 100%;">
                  <el-select
                    v-model="installForm.packageSetId"
                    placeholder="请选择软件包集"
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
                        {{ item.source === 'headquarters' ? '总行' : '自定义' }}
                      </span>
                    </el-option>
                  </el-select>
                  <el-button
                    type="primary"
                    plain
                    @click="handleCreatePackageSet"
                  >
                    新建包集
                  </el-button>
                </div>

                <!-- 已选包集信息展示 -->
                <div v-if="selectedPackageSet" class="mt-2" style="background: var(--el-fill-color-light); border-radius: 8px; padding: 16px; font-size: 13px; border: 1px solid var(--el-border-color-lighter); width: 100%; box-sizing: border-box;">
                  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 12px;">
                    <div><strong>适用系统：</strong><span style="color: var(--el-text-color-regular);">{{ selectedPackageSet.osType }}</span></div>
                    <div><strong>包集描述：</strong><span style="color: var(--el-text-color-regular);">{{ selectedPackageSet.description || '无' }}</span></div>
                  </div>
                  <div>
                    <strong style="display: block; margin-bottom: 8px;">包含软件包：</strong>
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
            <el-form-item v-else label="输入软件包名称" required>
              <el-input
                v-model="installForm.customPackagesText"
                type="textarea"
                :rows="5"
                placeholder="请输入软件包名称，支持换行/逗号分隔。可直接粘贴 RPM 文件名或带版本号的格式（例如：openssl-1.0.2k-23.el7_9.x86_64.rpm、openssl 1.0.2、openssl==1.0.2）"
              />
              <div style="font-size: 12px; color: var(--el-text-color-secondary);" class="mt-1">
                支持直接粘贴包含版本的软件包条目，系统将自动识别包名与版本。
              </div>
            </el-form-item>

            <el-form-item label="计划执行时间" required>
              <div style="display: flex; flex-wrap: wrap; gap: 8px; width: 100%;">
                <el-date-picker v-model="scheduleDate" type="date" value-format="YYYY-MM-DD"
                  :editable="false" placeholder="选择日期" style="flex: 1; min-width: 150px;" />
                <el-select v-model="scheduleHour" filterable default-first-option placeholder="时" aria-label="执行小时，可输入筛选" no-match-text="请输入 00–23" style="width: 85px;">
                  <el-option v-for="hour in scheduleHours" :key="hour" :label="`${hour} 时`" :value="hour" />
                </el-select>
                <el-select v-model="scheduleMinute" filterable default-first-option placeholder="分" aria-label="执行分钟，可输入筛选（每 5 分钟）" no-match-text="请选择 00、05 … 55" style="width: 85px;">
                  <el-option v-for="minute in scheduleMinutes" :key="minute" :label="`${minute} 分`" :value="minute" />
                </el-select>
              </div>
              <div class="mt-1" style="font-size: 12px; color: var(--el-text-color-secondary); width: 100%;">
                时、分支持输入筛选，按回车选择。每 5 分钟一个执行时间点，分钟可选 00、05、10 … 55。
              </div>
              <div class="mt-1" style="font-size: 12px; color: var(--el-text-color-secondary);">
                {{ isAdmin ? '提交后等待计划时间自动执行。' : '提交后须由管理员在计划时间前审批通过，否则申请自动失效。' }}
                到点自动预检查并分批安装，默认不重启。
              </div>
            </el-form-item>

            <!-- 每批数量 -->
            <el-form-item label="分批大小 (每批主机数)" required>
              <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
                <el-input-number
                  v-model="installForm.batchSize"
                  :min="1"
                  :max="1000"
                  style="width: 140px;"
                  :controls="false"
                />
                <el-tooltip content="目标主机会按照该数值拆分成多个批次，依次下发执行（前一批执行完成后自动接续下一批），以降低大规模并发更新时的网络及系统负载。" placement="top">
                  <i class="fa fa-info-circle" style="color: var(--el-text-color-secondary); cursor: pointer;" />
                </el-tooltip>
                <span style="font-size: 12px; color: var(--el-text-color-secondary); margin-left: 4px;">
                  默认 50，不填或设空则使用系统参数
                </span>
              </div>
            </el-form-item>
          </el-form>
        </div>

        <!-- 右侧资产选择器 -->
        <div style="flex: 3; display: flex; flex-direction: column; background: var(--el-bg-color); border: 1px solid var(--el-border-color-light); border-radius: 8px; padding: 20px; min-width: 0;">
          <h3 class="m-0 mb-3" style="font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <i class="fa fa-server" style="color: var(--el-color-primary);" />
            2. 选择目标主机
          </h3>
          <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; margin-bottom: 20px;">
            <AcmDeviceSelector
              class="package-host-selector"
              v-model="selectedHosts"
              ci-types="[auto]"
              :options="{
                selectMode: 'host,group,tag,input,recently',
                selector: 'multiple',
                label: '选择目标主机'
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
              {{ isAdmin ? '提交定时安装' : '提交安装申请' }}
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
          新建包集
        </el-button>
        <span style="flex: 1"></span>
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="loadingSets"
          title="刷新"
          @click="loadPackageSets"
        >
          <el-icon v-show="!loadingSets"><Refresh /></el-icon>
        </el-button>
      </div>

      <!-- 数据表格 -->
      <div class="ops-table-wrapper">
        <el-table v-loading="loadingSets" :data="packageSets" height="100%">
          <el-table-column prop="name" label="包集名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="osType" label="适用系统" width="100" />
          <el-table-column prop="source" label="包集来源" width="100">
            <template #default="{ row }">
              <el-tag :type="row.source === 'headquarters' ? 'warning' : 'info'" size="small" round>
                {{ row.source === 'headquarters' ? '总行下发' : '分行自定义' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="包集描述" min-width="200" show-overflow-tooltip />
          <el-table-column prop="packages" label="包含软件包数" width="120">
            <template #default="{ row }">
              {{ countPackages(row.packages) }} 个
            </template>
          </el-table-column>
          <el-table-column prop="updatedTime" label="更新时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.updatedTime) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button text type="primary" size="small" @click="handleEditPackageSet(row)">
                编辑
              </el-button>
              <el-button
                v-if="row.source !== 'headquarters'"
                text
                type="danger"
                size="small"
                @click="handleDeletePackageSet(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>

    <!-- 包集编辑对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      :title="editForm.id ? '编辑软件包集' : '新建软件包集'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="100px" size="small">
        <el-form-item label="包集名称" prop="name">
          <el-input v-model="editForm.name" placeholder="请输入包集名称" />
        </el-form-item>
        <el-form-item label="适用系统" prop="osType">
          <el-select v-model="editForm.osType" placeholder="请选择适用系统" style="width: 100%;">
            <el-option label="Linux" value="linux" />
            <el-option label="Windows" value="windows" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="editForm.description" type="textarea" :rows="2" placeholder="请输入包集描述" />
        </el-form-item>
        <el-form-item label="软件包列表" prop="packagesText">
          <el-input
            v-model="editForm.packagesText"
            type="textarea"
            :rows="8"
            placeholder="请输入软件包，支持换行/逗号分隔。可直接粘贴包含版本号的复杂包名或 RPM 文件名（例如：openssl-1.0.2k-23.el7_9.x86_64.rpm、openssl 1.0.2、openssl==1.0.2）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button size="small" @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" size="small" :loading="savingSet" @click="submitEditForm">
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
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
    ElMessage.error('获取软件包集列表失败')
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
  return date.toLocaleString('zh-CN', {
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

const editRules = {
  name: [{ required: true, message: '请输入包集名称', trigger: 'blur' }],
  osType: [{ required: true, message: '请选择适用系统', trigger: 'change' }],
  packagesText: [{ required: true, message: '请输入软件包列表', trigger: 'blur' }]
}

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
    await ElMessageBox.confirm(`确定删除软件包集 "${row.name}" 吗？`, '删除确认', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await packageSetApi.delete(row.id)
    ElMessage.success('软件包集删除成功')
    loadPackageSets()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete package set:', error)
      ElMessage.error('删除软件包集失败')
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
        ElMessage.warning('软件包列表不能为空')
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
      ElMessage.success('保存软件包集成功')
      editDialogVisible.value = false
      loadPackageSets()
    } catch (error) {
      console.error('Failed to save package set:', error)
      ElMessage.error('保存软件包集失败')
    } finally {
      savingSet.value = false
    }
  })
}

// ============================================================
// 一键分批安装表单
// ============================================================
const selectedHosts = ref([])
const scheduleDate = ref('')
const scheduleHour = ref('')
const scheduleMinute = ref('')
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
})

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
    ElMessage.warning('计划执行时间的分钟只能选择 5 的倍数')
    return
  }
  if (!isFutureSchedule(installForm.scheduledTime)) {
    ElMessage.warning('请选择晚于当前时间的计划执行时间')
    return
  }
  if (selectedHosts.value.length === 0) {
    ElMessage.warning('请选择目标主机')
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
      ElMessage.warning('请输入软件包名称')
      return
    }
    payload.packages = pkgs
  } else {
    if (!installForm.packageSetId) {
      ElMessage.warning('请选择软件包集')
      return
    }
    payload.packageSetId = installForm.packageSetId
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
      ElMessage.success(response.data.status === 'PENDING_APPROVAL' ? '安装申请已提交，等待管理员审批' : '定时安装已提交，等待计划时间执行')
      selectedHosts.value = []
      if (installForm.useCustomPackages) {
        installForm.customPackagesText = ''
      } else {
        installForm.packageSetId = ''
      }
    } else {
      ElMessage.error('创建一键安装任务失败')
    }
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('Failed to create and run task:', error)
      ElMessage.error(error?.response?.data?.message || error?.response?.data?.error || error?.message || '创建任务失败，请检查参数')
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
