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
      @patch-click="handlePatchClick"
    />

    <!-- 补丁详情弹窗 -->
    <PatchDetailDialog
      v-model="patchDetailVisible"
      :patch-data="patchDetailData"
      :loading="patchDetailLoading"
    />

    <!-- 安装补丁确认对话框 -->
    <el-dialog v-model="installDialogVisible" title="安装补丁确认" width="700px" destroy-on-close>
      <div v-loading="installDialogLoading" class="fix-dialog-content">
        <div class="fix-info-card">
          <div class="fix-info-header">
            <i class="fa fa-briefcase-medical text-muted" />
            待更新的补丁
          </div>
          <div class="fix-info-body" v-html="installDialogData.patchIds.join('<br>') || '-'" />
        </div>
        <div class="fix-info-card">
          <div class="fix-info-header">
            <i class="fa fa-cube text-muted" />
            待更新的软件包
          </div>
          <div class="fix-info-body" v-html="installDialogData.packagesDetail || '-'" />
        </div>
      </div>
      <template #footer>
        <el-button @click="installDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="installSubmitting"
          :disabled="!installDialogData.patchIds.length"
          @click="handleConfirmInstall"
        >
          <i class="fa fa-chevron-right" />
          开始更新
        </el-button>
      </template>
    </el-dialog>
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

// 安装补丁对话框
const installDialogVisible = ref(false)
const installDialogLoading = ref(false)
const installSubmitting = ref(false)
const installDialogData = reactive({
  patchIds: [],
  packagesDetail: '',
  hostId: ''
})

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

  installDialogData.patchIds = patchIds
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
  if (!installDialogData.patchIds.length || !installDialogData.hostId) return

  installSubmitting.value = true
  try {
    const response = await patchInstallApi.install({
      patchIds: installDialogData.patchIds,
      hostIds: [installDialogData.hostId],
      packages: null
    })
    const payload = response?.data ?? response
    const result = Array.isArray(payload) ? payload[0] : null
    const isSuccess = result?.status === 'COMPLETED' && result?.data?._status === 'ok'
    if (!isSuccess) {
      throw new Error('作业返回异常')
    }
    ElMessage.success('安装补丁任务已提交成功')
    installDialogVisible.value = false
  } catch (error) {
    ElMessage.error('提交安装任务失败: ' + (error.message || '未知错误'))
  } finally {
    installSubmitting.value = false
  }
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
  background: #f8fafc;
  border-radius: 6px;
  padding: 16px;
  margin-top: 8px;
  margin-bottom: 16px;
  border: 1px solid #e9ecef;
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
    color: #64748b;
    margin-right: 8px;
  }

  .value {
    color: #1e293b;
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
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
}

.fix-info-header {
  padding: 8px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  font-weight: 500;
  font-size: 14px;
  color: #303133;

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
  color: #606266;
}
</style>
