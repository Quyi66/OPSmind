<template>
  <el-dialog
    v-model="visible"
    title="主机详情"
    width="1280px"
    destroy-on-close
    @close="handleClose"
  >
    <div v-loading="hostDetailLoading" class="host-detail-dialog-body">
      <template v-if="hostDetailInfo">
        <div class="host-detail-card">
          <div class="host-detail-card__content">
            <div class="host-detail-card__title">{{ hostDetailInfo.host_key || '-' }}</div>
            <div class="host-detail-card__meta">
              OS: {{ hostDetailInfo.os_distro || '-' }} {{ hostDetailInfo.os_version || '' }}
            </div>
            <div class="host-detail-card__meta">漏洞数量：{{ hostDetailInfo.kb_count ?? 0 }}</div>
            <div class="host-detail-card__meta">上一次扫描：{{ formatFromNow(hostDetailInfo.scan_date) }}</div>
          </div>
          <i class="fa fa-desktop host-detail-card__icon" />
        </div>

        <div class="ops-action-bar host-detail-actions">
          <el-row justify="space-between" style="width: 100%">
            <el-button type="primary" :disabled="hostDetailSelection.length === 0" @click="emitFixSelected">
              修复选定的漏洞
            </el-button>
            <el-button :loading="hostDetailLoading" @click="handleRefresh" circle>
              <el-icon v-show="!hostDetailLoading"><Refresh /></el-icon>
            </el-button>
          </el-row>
        </div>

        <div class="ops-table-wrapper host-detail-table">
          <el-table
            v-loading="hostDetailLoading"
            :data="hostDetailPatches"
           
            height="420px"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="50" />
            <el-table-column prop="kb_number" label="KB编号" min-width="120">
              <template #default="{ row }">
                <el-button
                  v-if="row.kb_number"
                  text
                  type="primary"
                  @click="openKb(row.kb_number)">
                  {{ row.kb_number }}
                </el-button>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="category_name" label="类别" min-width="180" show-overflow-tooltip />
            <el-table-column prop="title" label="描述" min-width="280" show-overflow-tooltip />
            <el-table-column prop="patch_status" label="补丁状态" width="120">
              <template #default="{ row }">
                <el-tag
                  v-if="row.patch_status"
                  :type="getPatchStatusType(row.patch_status)"
                  size="small"
                  effect="plain"
                  @click="row.run_id && handleViewRun(row.run_id)"
                  :style="{ cursor: row.run_id ? 'pointer' : 'default' }"
                >
                  <i :class="getPatchStatusIcon(row.patch_status)" style="margin-right: 4px" />
                  {{ row.patch_status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="scan_date" label="扫描时间" width="120">
              <template #default="{ row }">
                {{ formatDateShort(row.scan_date) }}
              </template>
            </el-table-column>
            <el-table-column prop="update_date" label="更新时间" width="120">
              <template #default="{ row }">
                {{ formatDateShort(row.update_date) }}
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="ops-pagination-wrapper">
          <el-pagination
            v-model:current-page="hostDetailPagination.page"
            v-model:page-size="hostDetailPagination.pageSize"
            :page-sizes="[10, 20, 50]"
            :total="hostDetailPagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </template>
      <template v-else>
        <el-empty description="暂无主机详情" />
      </template>
    </div>
    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { windowsVulnerabilityApi } from '../../api'
import { Refresh } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  hostId: {
    type: String,
    default: ''
  },
  hostKey: {
    type: String,
    default: ''
  },
  initialInfo: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'view-run', 'fix-selected'])

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const hostDetailLoading = ref(false)
const hostDetailInfo = ref(props.initialInfo)
const hostDetailPatches = ref([])
const hostDetailSelection = ref([])
const hostDetailPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

watch(
  () => props.initialInfo,
  value => {
    if (value) hostDetailInfo.value = value
  }
)

watch(
  () => [visible.value, props.hostId, props.hostKey],
  ([open, hostId, hostKey], [_prevOpen, prevHostId, prevHostKey]) => {
    const targetChanged = hostId !== prevHostId || hostKey !== prevHostKey
    if (!open) return
    if (targetChanged) {
      hostDetailPagination.page = 1
      hostDetailSelection.value = []
    }
    if (hostId || hostKey) {
      loadHostDetailData({ reloadInfo: true })
    }
  }
)

async function loadHostDetailData(options = { reloadInfo: false }) {
  hostDetailLoading.value = true
  try {
    const infoPromise = options?.reloadInfo
      ? windowsVulnerabilityApi.getWinMachineInfo({
          host_id: props.hostId,
          host_key: props.hostKey
        })
      : Promise.resolve(null)

    const patchPromise = windowsVulnerabilityApi.getWinMachinePatchInfo({
      host_id: props.hostId,
      host_key: props.hostKey,
      page: hostDetailPagination.page,
      size: hostDetailPagination.pageSize
    })

    const [infoRes, patchRes] = await Promise.all([infoPromise, patchPromise])

    if (infoRes) {
      const record = infoRes?.records?.[0] || infoRes?.data?.records?.[0]
      hostDetailInfo.value = record || hostDetailInfo.value
    }

    const records = patchRes?.records || patchRes?.data?.records || []
    hostDetailPatches.value = records
    hostDetailPagination.total = patchRes?.total || patchRes?.data?.total || records.length
  } catch (error) {
    console.error('Failed to load host detail:', error)
    ElMessage.error('加载主机详情失败')
  } finally {
    hostDetailLoading.value = false
  }
}

function handlePageChange(page) {
  hostDetailPagination.page = page
  loadHostDetailData()
}

function handleSizeChange(size) {
  hostDetailPagination.pageSize = size
  hostDetailPagination.page = 1
  loadHostDetailData()
}

function handleSelectionChange(selection) {
  hostDetailSelection.value = selection
}

function emitFixSelected() {
  if (hostDetailSelection.value.length === 0) {
    ElMessage.warning('请先选择要修复的漏洞')
    return
  }
  emit('fix-selected', hostDetailSelection.value)
}

function handleViewRun(runId) {
  emit('view-run', runId)
}

function openKb(kbNumber) {
  if (!kbNumber) return
  const num = kbNumber.replace('KB', '')
  window.open(`https://support.microsoft.com/zh-cn/help/${num}`, '_blank')
}

function handleRefresh() {
  hostDetailSelection.value = []
  loadHostDetailData({ reloadInfo: true })
}

function handleClose() {
  emit('update:modelValue', false)
}

// 日期格式化 (短格式)
function formatDateShort(dateStr) {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch {
    return dateStr
  }
}

// 相对时间
function formatFromNow(dateStr) {
  if (!dateStr) return '-'
  const ts = new Date(dateStr).getTime()
  if (Number.isNaN(ts)) return dateStr
  const diff = Math.max(0, Date.now() - ts)
  const day = 1000 * 60 * 60 * 24
  const hour = 1000 * 60 * 60
  const minute = 1000 * 60
  const days = Math.floor(diff / day)
  if (days > 0) return `${days} 天前`
  const hours = Math.floor(diff / hour)
  if (hours > 0) return `${hours} 小时前`
  const minutes = Math.floor(diff / minute)
  return `${minutes} 分钟前`
}

// 补丁状态样式
function getPatchStatusType(status) {
  const map = {
    '未修复': 'info',
    '已修复': 'success',
    '已修复(手动)': 'success',
    '修复中': '',
    '修复失败': 'warning',
    '回滚中': '',
    '回滚失败': 'warning',
    '回滚成功': 'info'
  }
  return map[status] || 'info'
}

function getPatchStatusIcon(status) {
  const map = {
    '未修复': 'fa fa-times',
    '已修复': 'fa fa-check',
    '已修复(手动)': 'fa fa-check',
    '修复中': 'fa fa-cog fa-spin',
    '修复失败': 'fa fa-exclamation-triangle',
    '回滚中': 'fa fa-cog fa-spin',
    '回滚失败': 'fa fa-exclamation-triangle',
    '回滚成功': 'fa fa-check'
  }
  return map[status] || ''
}

defineExpose({ refresh: handleRefresh })
</script>

<style scoped lang="scss">
.host-detail-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.host-detail-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 6px;
  border: 1px solid #ebeef5;
}

.host-detail-card__content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.host-detail-card__title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.host-detail-card__meta {
  font-size: 13px;
  color: #606266;
}

.host-detail-card__icon {
  font-size: 48px;
  color: #c0c4cc;
}

.host-detail-actions {
  margin: 0;
}

.host-detail-table {
  margin-top: 0;
}
</style>
