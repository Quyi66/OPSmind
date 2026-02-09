<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`主机详情 - ${hostKey}`"
    width="85%"
    destroy-on-close
    class="host-detail-dialog"
    @close="handleClose"
  >
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
          <i class="far fa-briefcase-medical"></i> 可用补丁
        </template>
      </el-tab-pane>
      <el-tab-pane label="软件包" name="packages">
        <template #label>
          <i class="far fa-cube"></i> 软件包
        </template>
      </el-tab-pane>
      <el-tab-pane label="漏洞" name="vulnerabilities">
        <template #label>
          <i class="far fa-virus"></i> 漏洞
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

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 补丁详情弹窗 -->
  <PatchDetailDialog
    v-model="patchDetailVisible"
    :patch-data="patchDetailData"
    :loading="patchDetailLoading"
  />
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { patchScanApi } from '../api'
import { formatDateTime, getInstalledPkgsCount } from '../composables/useFormatters'
import { useHostDetail } from '../composables/useHostDetail'
import PatchesTab from './host-detail/PatchesTab.vue'
import PackagesTab from './host-detail/PackagesTab.vue'
import VulnerabilitiesTab from './host-detail/VulnerabilitiesTab.vue'
import PatchDetailDialog from './host-detail/PatchDetailDialog.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  hostInfo: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue', 'fix-patches'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const hostKey = computed(() => props.hostInfo.host_key || props.hostInfo.hostKey || '')
const hostId = computed(() => props.hostInfo.host_id || '')
const hostInfoRef = computed(() => props.hostInfo)

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

// 监听Tab切换
watch(activeTab, (newTab) => {
  if (newTab === 'packages' && packagesTabRef.value) {
    packagesTabRef.value.loadPackageList()
  } else if (newTab === 'vulnerabilities' && vulnerabilitiesTabRef.value) {
    vulnerabilitiesTabRef.value.loadVulnerabilityList()
  }
})

// 监听对话框打开
watch(() => props.modelValue, (val) => {
  if (val) {
    activeTab.value = 'patches'
    loadMachineInfo()

    // 延迟加载补丁列表，确保组件已挂载
    setTimeout(() => {
      if (patchesTabRef.value) {
        patchesTabRef.value.loadPatchList()
      }
    }, 100)
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

// 修复补丁
function handleFixPatches(patches) {
  emit('fix-patches', {
    patches,
    hostInfo: props.hostInfo
  })
}

// 关闭对话框
function handleClose() {
  dialogVisible.value = false
}
</script>

<style scoped lang="scss">
.host-detail-dialog {
  :deep(.el-dialog__body) {
    padding: 20px;
    max-height: 70vh;
    overflow-y: auto;
  }
}

.host-info-card {
  background: #f8fafc;
  border-radius: 6px;
  padding: 16px;
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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
