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

    <!-- 补丁安装向导组件 -->
    <PatchInstallWizard
      v-model:visible="installDialogVisible"
      :patches-to-install="patchesToInstall"
      :fixed-host="fixedHostInfo"
      @success="handleInstallSuccess"
    />

    <!-- 操作记录对话框 -->
    <OperationLogsDialog v-model="operationLogsVisible" :highlight-run-id="lastSubmittedRunId" />


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
import PatchInstallWizard from './patch-task/PatchInstallWizard.vue'

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

const operationLogsVisible = ref(false)
const lastSubmittedRunId = ref('')
const patchesToInstall = ref([])

const fixedHostInfo = computed(() => {
  if (!machineInfo.value) return null
  return {
    hostId: hostId.value,
    hostKey: hostKey.value,
    hostname: machineInfo.value.hostname,
    os_distro: machineInfo.value.os_distro,
    os_version: machineInfo.value.os_version
  }
})

function handleInstallSuccess() {
  patchesTabRef.value?.loadPatchList()
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
function handleFixPatches(patches) {
  if (!patches || patches.length === 0) {
    ElMessage.warning('请选择要安装的补丁')
    return
  }
  if (!hostId.value) {
    ElMessage.warning('主机信息缺失，无法安装补丁')
    return
  }
  patchesToInstall.value = patches
  installDialogVisible.value = true
}

const installDialogVisible = ref(false)

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
