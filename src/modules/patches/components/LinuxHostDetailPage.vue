<template>
  <div class="ops-page-layout">
    <!-- 面包屑导航 -->
    <div class="ops-breadcrumb-bar">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item>
          <a @click.prevent="handleBack">{{ fromLabel }}</a>
        </el-breadcrumb-item>
        <el-breadcrumb-item>主机详情</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 主机信息卡片 -->
    <div class="host-info-card" v-loading="machineLoading">
      <div class="host-info-body">
        <div class="info-item" v-if="machineInfo.hostname">
          <span class="label">主机名：</span>
          <span class="value">{{ machineInfo.hostname }}</span>
        </div>
        <div class="info-item">
          <span class="label">OS：</span>
          <span class="value">{{ machineInfo.os_distro }} {{ machineInfo.os_version }}</span>
        </div>
        <div class="info-item">
          <span class="label">最后扫描：</span>
          <span class="value">{{ formatDateTime(machineInfo.scan_timestamp) }}</span>
        </div>
        <div class="info-item">
          <span class="label">已安装软件包：</span>
          <span class="value">{{ getInstalledPkgsCount(machineInfo.installed_pkgs) }}</span>
        </div>
      </div>
    </div>

    <!-- Tab 导航 -->
    <el-tabs v-model="activeTab" class="host-tabs">
      <el-tab-pane label="可用补丁" name="patches">
        <template #label>
          <i class="far fa-briefcase-medical"></i>
          可用补丁
        </template>
      </el-tab-pane>
      <el-tab-pane label="软件包" name="packages">
        <template #label>
          <i class="far fa-cube"></i>
          软件包
        </template>
      </el-tab-pane>
      <el-tab-pane label="漏洞" name="vulnerabilities">
        <template #label>
          <i class="far fa-virus"></i>
          漏洞
        </template>
      </el-tab-pane>
    </el-tabs>

    <!-- 可用补丁 Tab -->
    <PatchesTab
      v-show="activeTab === 'patches'"
      ref="patchesTabRef"
      :host-id="hostId"
      :host-key="hostKey"
      :os-distro="hostOsDistro"
      @patch-click="handlePatchClick"
      @fix-patches="handleFixPatches"
    />

    <!-- 软件包 Tab -->
    <PackagesTab
      v-show="activeTab === 'packages'"
      ref="packagesTabRef"
      :host-id="hostId"
      @patch-click="handlePatchClick"
    />

    <!-- 漏洞 Tab -->
    <VulnerabilitiesTab
      v-show="activeTab === 'vulnerabilities'"
      ref="vulnerabilitiesTabRef"
      :host-id="hostId"
      :os-distro="hostOsDistro"
      @patch-click="handlePatchClick"
    />

    <!-- 补丁详情弹窗 -->
    <PatchDetailDialog
      v-model="patchDetailVisible"
      :patch-data="patchDetailData"
      :loading="patchDetailLoading"
      :os-distro="hostOsDistro"
    />

    <!-- 安装补丁对话框 -->
    <el-dialog
      v-model="installDialogVisible"
      title="补丁安装向导"
      width="1000px"
      :close-on-click-modal="false"
      class="install-dialog"
      top="5vh"
      @closed="resetInstallState"
    >
      <!-- 自定义步骤条 -->
      <div class="ops-stepper">
        <div class="stepper-item" :class="{ 'is-active': installStep === 0, 'is-success': installStep > 0 }">
          <div class="stepper-icon">
            <i v-if="installStep > 0" class="fa fa-check"></i>
            <span v-else>1</span>
          </div>
          <div class="stepper-title">确认更新内容</div>
        </div>
        <div class="stepper-line" :class="{ 'is-active': installStep > 0 }"></div>

        <div class="stepper-item" :class="{ 'is-active': installStep === 1, 'is-success': installStep > 1 }">
          <div class="stepper-icon">
            <i v-if="installStep > 1" class="fa fa-check"></i>
            <span v-else>2</span>
          </div>
          <div class="stepper-title">配置升级项</div>
        </div>
        <div class="stepper-line" :class="{ 'is-active': installStep > 1 }"></div>

        <div class="stepper-item" :class="{ 'is-active': installStep === 2 }">
          <div class="stepper-icon">
            <span>3</span>
          </div>
          <div class="stepper-title">任务确认</div>
        </div>
      </div>

      <!-- Step 1: Confirmation of Updates -->
      <div v-show="installStep === 0" class="install-content" v-loading="installDialogLoading">
        <div class="install-card">
          <div class="card-header">
            <i class="fa fa-lock" />
            更新补丁
          </div>
          <div class="card-body">
            {{ installDialogData.patchIds.join(', ') }}
          </div>
        </div>
        <div class="install-card">
          <div class="card-header">
            <i class="fa fa-cube" />
            待更新软件包
          </div>
          <div class="card-body card-body--scroll" v-html="installDialogData.packagesDetail || '-'">
          </div>
        </div>
      </div>

      <!-- Step 2: Configuration Options -->
      <div v-show="installStep === 1" class="install-config-content">
        <el-form :model="installConfig" label-width="120px" label-position="left" class="config-form">
          <el-form-item label="预执行脚本">
            <div style="width: 100%">
              <el-input
                type="textarea"
                v-model="installConfig.preScript"
                :autosize="{ minRows: 2, maxRows: 10 }"
                placeholder="#!/bin/bash&#10;# 在此输入升级前需要执行的命令或脚本"
                class="script-input"
              />
            </div>
          </el-form-item>

          <el-form-item label="重启策略">
            <div style="width: 100%">
              <el-alert
                :title="'系统重启建议：' + (backendRestartReason || smartRestartGuess)"
                type="info"
                show-icon
                :closable="false"
                style="margin-bottom: 12px; line-height: 1.4"
              >
              </el-alert>
              <el-radio-group v-model="installConfig.restartPolicy" class="restart-radio-group">
                <el-radio label="smart">智能识别</el-radio>
                <el-radio label="system">系统重启</el-radio>
                <el-radio label="service">服务重启</el-radio>
                <el-radio label="none">不重启</el-radio>
              </el-radio-group>
            </div>
          </el-form-item>

          <el-form-item label="校验脚本">
            <div style="width: 100%">
              <el-input
                type="textarea"
                v-model="installConfig.postScript"
                :autosize="{ minRows: 2, maxRows: 10 }"
                placeholder="#!/bin/bash&#10;# 在此输入系统升级完成后的校验脚本"
                class="script-input"
              />
            </div>
          </el-form-item>
        </el-form>
      </div>

      <!-- Step 3: Confirmation -->
      <div v-show="installStep === 2" class="install-confirm-content">
        <el-descriptions title="任务执行概要" :column="1" border size="small" class="confirm-descriptions">
          <el-descriptions-item label="待安装补丁">
            {{ installDialogData.patchIds.join(', ') }}
          </el-descriptions-item>
          <el-descriptions-item label="预执行脚本">
            <span :class="{'text-muted': !installConfig.preScript}">
              {{ installConfig.preScript ? '已配置' : '-' }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="重启策略">
            <el-tag size="small" :type="getRestartPolicyTagType(installConfig.restartPolicy)">
              {{ getRestartPolicyLabel(installConfig.restartPolicy) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="策略依据">
            <span v-if="installConfig.restartPolicy === 'smart'" style="font-size: 13px; color: var(--el-text-color-secondary)">
              (系统建议依据: {{ backendRestartReason || smartRestartGuess }})
            </span>
            <span v-else style="font-size: 13px; color: var(--el-text-color-secondary)">-</span>
          </el-descriptions-item>
          <el-descriptions-item label="校验脚本">
            <span :class="{'text-muted': !installConfig.postScript}">
              {{ installConfig.postScript ? '已配置' : '-' }}
            </span>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button v-if="installStep === 0" @click="installDialogVisible = false">取消</el-button>

          <el-button v-if="installStep > 0" @click="installStep--">
            <i class="fa fa-chevron-left" style="margin-right: 4px" /> 上一步
          </el-button>

          <el-button v-if="installStep < 2" type="primary" :disabled="installStep === 0 && !installDialogData.patchIds.length" @click="handleNextStep">
            下一步 <i class="fa fa-chevron-right" style="margin-left: 4px" />
          </el-button>

          <el-button
            v-if="installStep === 2"
            type="primary"
            :loading="installSubmitting"
            @click="handleConfirmInstall"
          >
            <i class="fa fa-check" style="margin-right: 4px" />
            确认并执行
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 操作记录对话框 -->
    <OperationLogsDialog v-model="operationLogsVisible" :highlight-run-id="lastSubmittedRunId" />

    <!-- 任务执行五步轮询调度弹窗 -->
    <TaskExecutionProgress
      ref="taskProgressRef"
      :task-id="createdTaskId"
      :restart-policy="installConfig.restartPolicy"
      @done="handleTaskWorkflowDone"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { patchScanApi, patchInstallApi } from '../api'
import { formatDateTime, getInstalledPkgsCount } from '../composables/useFormatters'
import { useHostDetail } from '../composables/useHostDetail'
import PatchesTab from './host-detail/PatchesTab.vue'
import PackagesTab from './host-detail/PackagesTab.vue'
import VulnerabilitiesTab from './host-detail/VulnerabilitiesTab.vue'
import PatchDetailDialog from './host-detail/PatchDetailDialog.vue'
import OperationLogsDialog from './dialogs/OperationLogsDialog.vue'
import TaskExecutionProgress from './patch-task/TaskExecutionProgress.vue'

const route = useRoute()
const router = useRouter()

const hostInfoRef = computed(() => ({
  host_key: route.query.host_key || route.query.hostKey || '',
  host_id: route.query.host_id || route.query.hostId || '',
  os_distro: route.query.os_distro || '',
  os_version: route.query.os_version || '',
  hostname: route.query.hostname || ''
}))

const hostId = computed(() => hostInfoRef.value.host_id || '')
const hostKey = computed(() => hostInfoRef.value.host_key || hostInfoRef.value.hostKey || '')
const hostOsDistro = computed(
  () => machineInfo.value?.os_distro || hostInfoRef.value.os_distro || ''
)

const fromLabel = computed(() => route.query.fromLabel || '机器扫描')
const fromRouteName = computed(() => route.query.fromRouteName || 'patches-machineScan')
const fromRouteQuery = computed(() => {
  const raw = route.query.fromRouteQuery
  if (!raw || typeof raw !== 'string') return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
})

// Tab 状态
const activeTab = ref('patches')

// 标签页组件引用
const patchesTabRef = ref(null)
const packagesTabRef = ref(null)
const vulnerabilitiesTabRef = ref(null)

// 使用主机详情逻辑
const { machineLoading, machineInfo, loadMachineInfo } = useHostDetail(hostId, hostInfoRef)

// 补丁详情弹窗
const patchDetailVisible = ref(false)
const patchDetailLoading = ref(false)
const patchDetailData = ref({})

// 安装补丁对话框 wizard state
const installDialogVisible = ref(false)
const installDialogLoading = ref(false)
const installSubmitting = ref(false)
const installStep = ref(0)
const backendRestartReason = ref('')
const installConfig = reactive({
  preScript: '',
  restartPolicy: 'smart',
  postScript: ''
})
const installDialogData = reactive({
  patchIds: [],
  patchStatusIds: [],
  packagesDetail: '',
  hostId: ''
})

const operationLogsVisible = ref(false)
const lastSubmittedRunId = ref('')
const createdTaskId = ref('')
const taskProgressRef = ref(null)

function resetInstallState() {
  installStep.value = 0
  backendRestartReason.value = ''
  installConfig.preScript = ''
  installConfig.restartPolicy = 'smart'
  installConfig.postScript = ''
  installDialogData.patchIds = []
  installDialogData.packagesDetail = ''
  installDialogData.hostId = ''
  createdTaskId.value = ''
}

function getRestartPolicyLabel(policy) {
  const map = {
    smart: '智能识别',
    system: '系统重启',
    service: '服务重启',
    none: '不重启'
  }
  return map[policy] || policy
}

function getRestartPolicyTagType(policy) {
  const map = {
    smart: 'success',
    system: 'danger',
    service: 'warning',
    none: 'info'
  }
  return map[policy] || 'info'
}

const smartRestartGuess = computed(() => {
  const pkgs = (installDialogData.packagesDetail || '').toLowerCase()
  if (pkgs.includes('kernel')) return '系统重启 (System Restart)'
  if (pkgs.includes('glibc') || pkgs.includes('openssl')) return '服务重启 (Service Restart)'
  return '无需重启 (None)'
})

async function handleNextStep() {
  if (installStep.value === 0) {
    installDialogLoading.value = true
    try {
      // 方案 B：先在后端创建任务，获取精准评估与自动生成的脚本
      // patchStatusIds：将 patches 中的 id (机器补丁状态ID) 传入，用于后端推断重启类型和 OS
      const res = await patchInstallApi.createTask({
        hostIds: [installDialogData.hostId],
        patchIds: installDialogData.patchIds,
        patchStatusIds: installDialogData.patchStatusIds || [],
        osType: 'linux'
      })

      if (res?.data) {
        createdTaskId.value = res.data.id || ''

        // 自动使用后端返回的更精准重启策略
        if (res.data.restartType && ['system', 'service', 'none'].includes(res.data.restartType)) {
          installConfig.restartPolicy = res.data.restartType
        } else {
          installConfig.restartPolicy = 'smart'
        }
        backendRestartReason.value = res.data.restartReason || ''

        // 后端可能自动生成预检和校验脚本
        if (res.data.preCheckScript && !installConfig.preScript) {
          installConfig.preScript = res.data.preCheckScript
        }
        if (res.data.validateScript && !installConfig.postScript) {
          installConfig.postScript = res.data.validateScript
        }
      }

      installStep.value++
    } catch (error) {
      console.error('Failed to pre-flight task data:', error)
      ElMessage.warning('未能连接后端智能预判接口，已自动降级为本地启发式策略。')
      backendRestartReason.value = '（后端评估网络异常，目前显示本地启发式评估）'
      installStep.value++
    } finally {
      installDialogLoading.value = false
    }
  } else {
    installStep.value++
  }
}

// 监听Tab切换
watch(activeTab, newTab => {
  if (newTab === 'packages' && packagesTabRef.value) {
    packagesTabRef.value.loadPackageList()
  } else if (newTab === 'vulnerabilities' && vulnerabilitiesTabRef.value) {
    vulnerabilitiesTabRef.value.loadVulnerabilityList()
  }
})

watch(
  () => route.query,
  () => {
    activeTab.value = route.query.tab || 'patches'
    loadMachineInfo()
    nextTick(() => {
      if (patchesTabRef.value) {
        patchesTabRef.value.loadPatchList()
      }
    })
  },
  { immediate: true }
)

watch(hostId, value => {
  if (value && patchesTabRef.value) {
    patchesTabRef.value.loadPatchList()
  }
})

// 点击补丁
function handlePatchClick(row) {
  if (!row.patch_id) return
  loadPatchDetail(row.patch_id)
}

// 加载补丁详情
async function loadPatchDetail(patchId) {
  patchDetailVisible.value = true
  patchDetailLoading.value = true
  patchDetailData.value = {}

  try {
    const response = await patchScanApi.getPatchDetail({ patch_id: patchId })
    const records = response?.data?.records || response?.records || []
    if (records.length > 0) {
      patchDetailData.value = records[0]
    } else {
      ElMessage.warning('未找到补丁详情')
      patchDetailVisible.value = false
    }
  } catch (error) {
    console.error('Failed to load patch detail:', error)
    ElMessage.error('获取补丁详情失败')
    patchDetailVisible.value = false
  } finally {
    patchDetailLoading.value = false
  }
}

// 安装补丁
async function handleFixPatches(patches) {
  if (!patches || patches.length === 0) {
    ElMessage.warning('请选择要安装的补丁')
    return
  }
  const patchIds = patches.map(item => item.patch_id).filter(Boolean)
  if (patchIds.length === 0) {
    ElMessage.warning('所选补丁缺少补丁编号')
    return
  }
  if (!hostId.value) {
    ElMessage.warning('主机信息缺失，无法安装补丁')
    return
  }

  // 提取机器补丁状态 ID（用于后端推断重启类型和 OS 发行版）
  const patchStatusIds = patches.map(item => item.id).filter(Boolean)

  installDialogData.patchIds = patchIds
  installDialogData.patchStatusIds = patchStatusIds
  installDialogData.packagesDetail = ''
  installDialogData.hostId = hostId.value
  installDialogVisible.value = true
  installDialogLoading.value = true

  try {
    const response = await patchInstallApi.getAffectedPackages({ patch_ids: patchIds })
    const records = response?.data?.records || response?.records || []
    const fileNames = records.map(item => item.file_name).filter(Boolean)
    installDialogData.packagesDetail = fileNames.join('<br>')
  } catch (error) {
    ElMessage.error('获取软件包信息失败: ' + (error.message || '未知错误'))
  } finally {
    installDialogLoading.value = false
  }
}

async function handleConfirmInstall() {
  if (!createdTaskId.value) return

  // 抛弃旧版单一执行形式，激活全新的5步流转弹窗
  taskProgressRef.value.open()
}

function handleTaskWorkflowDone(success) {
  if (success) {
    ElMessage.success('补丁安装与智能校验流程完成')
  } else {
    ElMessage.error('执行失败')
  }
  installDialogVisible.value = false
  // 刷新当前Tab表格刷新数据
  patchesTabRef.value?.loadPatchList()
}

function handleBack() {
  if (fromRouteName.value) {
    router.push({ name: fromRouteName.value, query: fromRouteQuery.value })
    return
  }
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push({ name: 'patches-machineScan' })
  }
}
</script>

<style scoped lang="scss">
.host-info-card {
  background: var(--el-fill-color-light);
  border-radius: 6px;
  padding: 16px;
  margin-top: 8px;
  margin-bottom: 16px;
  border: 1px solid var(--el-border-color-lighter);
}

.host-info-body {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  align-items: center;
  font-size: 14px;

  .label {
    color: var(--el-text-color-regular);
    margin-right: 8px;
  }

  .value {
    color: var(--el-text-color-primary);
    font-weight: 500;
  }
}

.host-tabs {
  :deep(.el-tabs__item) {
    i {
      margin-right: 6px;
    }
  }
}

.fix-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 200px;
}

.fix-info-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  overflow: hidden;
}

.fix-info-header {
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color-light);
  font-weight: 500;
  font-size: 14px;
  color: var(--el-text-color-primary);

  i {
    margin-right: 8px;
  }
}

.fix-info-body {
  padding: 12px;
  max-height: 150px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.8;
  color: var(--el-text-color-regular);
}

/* Custom wizard styles */
.install-card {
  margin-bottom: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  overflow: hidden;

  .card-header {
    background: var(--el-fill-color-light);
    padding: 8px 12px;
    font-weight: 500;
    font-size: 13px;
    color: var(--el-text-color-primary);
    border-bottom: 1px solid var(--el-border-color-lighter);

    i {
      margin-right: 6px;
      color: var(--el-text-color-secondary);
    }
  }

  .card-body {
    padding: 10px 12px;
    background: var(--el-bg-color);
    font-size: 13px;
    color: var(--el-text-color-primary);

    &--scroll {
      max-height: 140px;
      overflow-y: auto;
      color: var(--el-text-color-primary);
      line-height: 1.6;
    }
  }
}

.script-input :deep(.el-textarea__inner) {
  font-family: monospace;
  background-color: #fafafa;
}

.config-form {
  padding: 10px 20px;
}

.restart-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.confirm-descriptions {
  padding: 10px 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.text-muted {
  color: var(--el-text-color-secondary);
}

/* Stepper Styles */
.ops-stepper {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  margin-bottom: 30px;
  padding: 0 40px;
}

.stepper-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 120px;
  position: relative;
  z-index: 1;

  .stepper-icon {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background-color: var(--el-bg-color, #fff);
    border: 2px solid var(--el-text-color-placeholder, #a8abb2);
    color: var(--el-text-color-placeholder, #a8abb2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 8px;
    transition: all 0.3s;
  }

  .stepper-title {
    font-size: 14px;
    color: var(--el-text-color-regular, #606266);
    font-weight: 500;
    transition: all 0.3s;
  }

  &.is-active {
    .stepper-icon {
      border-color: var(--el-color-primary, #409eff);
      background-color: var(--el-color-primary, #409eff);
      color: #fff;
    }
    .stepper-title {
      color: var(--el-color-primary, #409eff);
      font-weight: bold;
    }
  }

  &.is-success {
    .stepper-icon {
      border-color: var(--el-color-success, #67c23a);
      color: var(--el-color-success, #67c23a);
      background-color: var(--el-bg-color, #fff);
    }
    .stepper-title {
      color: var(--el-color-success, #67c23a);
    }
  }
}

.stepper-line {
  flex: 1;
  height: 2px;
  background-color: var(--el-border-color-lighter, #ebeef5);
  margin: 13px -40px 0;
  z-index: 0;
  transition: all 0.3s;

  &.is-active {
    background-color: var(--el-color-success, #67c23a);
  }
}
</style>
