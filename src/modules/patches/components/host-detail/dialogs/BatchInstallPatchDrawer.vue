<template>
  <el-drawer
    :model-value="visible"
    title="安装选中主机补丁"
    size="60%"
    destroy-on-close
    :close-on-click-modal="false"
    class="batch-install-patch-drawer"
    @close="handleClose"
  >
    <!-- 主机和补丁汇总信息 -->
    <div class="batch-install-summary mb-3 p-3">
      <div class="summary-item mb-2">
        <span class="label font-bold">已选主机 ({{ hosts.length }} 台)：</span>
        <div class="host-tags-container mt-1">
          <el-tag
            v-for="host in hosts"
            :key="host.host_id || host.id || host.host_key"
            size="small"
            type="info"
            effect="light"
            class="mr-1 mb-1"
          >
            {{ host.host_key }}
          </el-tag>
        </div>
      </div>
      <div class="summary-item d-flex align-items-center justify-content-between">
        <div>
          <span class="label font-bold">关联可用补丁数：</span>
          <span class="value text-primary font-bold">{{ uniquePatches.length }} 个</span>
        </div>
        <div v-if="selectedRows.length > 0">
          <span class="label font-bold">已选安装补丁：</span>
          <span class="value text-success font-bold">{{ selectedRows.length }} 个</span>
        </div>
      </div>
    </div>

    <!-- 筛选及操作栏 -->
    <div class="ops-filter-bar d-flex align-items-center justify-content-between mb-2">
      <div class="d-flex align-items-center gap-2">
        <el-select
          v-model="selectedSeverity"
          size="small"
          placeholder="严重程度"
          style="width: 140px"
          @change="handleFilterChange"
        >
          <el-option label="全部等级" value="all" />
          <el-option label="严重" value="Critical" />
          <el-option label="重要" value="Important" />
          <el-option label="中等" value="Moderate" />
          <el-option label="低危" value="Low" />
        </el-select>

        <el-input
          v-model="searchKeyword"
          size="small"
          placeholder="搜索补丁编号或摘要..."
          clearable
          style="width: 240px; margin-left: 12px"
          @input="handleFilterChange"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <div class="d-flex align-items-center gap-2">
        <el-button
          size="small"
          :disabled="filteredPatches.length === 0"
          @click="handleToggleAllSelection"
        >
          <i :class="['fa', isAllFilteredSelected ? 'fa-times' : 'fa-check-double']" style="margin-right: 4px" />
          {{ isAllFilteredSelected ? '取消全选' : '一键全选' }}
        </el-button>
        <el-button
          size="small"
          circle
          :loading="loading"
          title="刷新"
          @click="fetchPatches"
        >
          <el-icon v-show="!loading"><Refresh /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 补丁列表表格 -->
    <div class="ops-table-wrapper" v-loading="loading">
      <el-table
        ref="tableRef"
        :data="paginatedPatches"
        row-key="patch_id"
        size="small"
        style="width: 100%"
        max-height="calc(100vh - 400px)"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" reserve-selection />
        <el-table-column prop="patch_id" label="补丁编号" width="180">
          <template #default="{ row }">
            <span class="patch-id-text">{{ row.patch_id }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="摘要" min-width="250" show-overflow-tooltip />
        <el-table-column prop="severity" label="严重程度" width="100">
          <template #default="{ row }">
            <el-tag
              :type="getSeverityType(row.severity)"
              :class="['severity-tag', getSeverityClass(row.severity)]"
              size="small"
            >
              {{ getSeverityLabel(row.severity) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="影响的主机" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.hosts.map(h => h.hostKey).join(', ') }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="publish_date" label="发布时间" width="110">
          <template #default="{ row }">
            {{ formatDate(row.publish_date) }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="ops-pagination-wrapper d-flex justify-content-end mt-3">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="totalPatches"
        layout="total, sizes, prev, pager, next"
        size="small"
        background
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <template #footer>
      <div style="flex: auto">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          :disabled="selectedRows.length === 0"
          @click="handleStartInstall"
        >
          安装选中补丁 ({{ selectedRows.length }})
        </el-button>
      </div>
    </template>
  </el-drawer>

  <!-- 安装补丁向导 -->
  <PatchInstallWizard
    v-model:visible="installWizardVisible"
    :patches-to-install="patchesToInstall"
    :fixed-hosts="fixedHosts"
    operation-type="patch"
    task-mode="install"
    :selection-summary-items="installSelectionSummary"
    @success="handleInstallSuccess"
  />
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { patchScanApi } from '../../../api'
import {
  formatDate,
  getSeverityType,
  getSeverityClass,
  getSeverityLabel
} from '../../../composables/useFormatters'
import PatchInstallWizard from '../../patch-task/wizard/PatchInstallWizard.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  hosts: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:visible', 'success'])

const loading = ref(false)
const allPatches = ref([])
const tableRef = ref(null)
const selectedRows = ref([])

const selectedSeverity = ref('all')
const searchKeyword = ref('')

// 分页
const currentPage = ref(1)
const pageSize = ref(20) // 默认调大到20

// 向导弹窗
const installWizardVisible = ref(false)

// 关闭抽屉
function handleClose() {
  emit('update:visible', false)
}

// 选中项变化
function handleSelectionChange(selection) {
  selectedRows.value = selection
}

// 严重程度或搜索词变化
function handleFilterChange() {
  currentPage.value = 1
}

// 分页变化
function handlePageChange(page) {
  currentPage.value = page
}

function handleSizeChange(size) {
  pageSize.value = size
  currentPage.value = 1
}

// 汇总选中主机的关联补丁并去重
const uniquePatches = computed(() => {
  const map = new Map()
  allPatches.value.forEach(p => {
    const key = p.patch_id
    if (!key) return

    if (!map.has(key)) {
      map.set(key, {
        patch_id: p.patch_id,
        title: p.title,
        severity: p.severity,
        publish_date: p.publish_date,
        affected_pkgs: p.affected_pkgs,
        related_vuls: p.related_vuls,
        hosts: [],
        patchStatusIds: [],
        id: p.id || p.patch_status_id
      })
    }
    const item = map.get(key)
    if (p.hostId && !item.hosts.some(h => h.hostId === p.hostId)) {
      item.hosts.push({
        hostId: p.hostId,
        hostKey: p.hostKey,
        hostname: p.hostname
      })
    }
    const statusId = p.patch_status_id || p.patchStatusId || p.id
    if (statusId && !item.patchStatusIds.includes(statusId)) {
      item.patchStatusIds.push(statusId)
    }
  })
  return Array.from(map.values())
})

// 获取过滤后的补丁
const filteredPatches = computed(() => {
  let list = uniquePatches.value

  if (selectedSeverity.value !== 'all') {
    list = list.filter(p => p.severity === selectedSeverity.value)
  }

  const kw = searchKeyword.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(p => {
      const matchId = String(p.patch_id || '').toLowerCase().includes(kw)
      const matchTitle = String(p.title || '').toLowerCase().includes(kw)
      return matchId || matchTitle
    })
  }

  return list
})

// 是否全部筛选行都被选中了
const isAllFilteredSelected = computed(() => {
  if (filteredPatches.value.length === 0) return false
  return filteredPatches.value.every(row =>
    selectedRows.value.some(sel => sel.patch_id === row.patch_id)
  )
})

// 当前页展示的补丁
const paginatedPatches = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredPatches.value.slice(start, end)
})

const totalPatches = computed(() => filteredPatches.value.length)

// 获取选中主机的关联补丁列表
async function fetchPatches() {
  if (props.hosts.length === 0) return

  loading.value = true
  allPatches.value = []
  try {
    const promises = props.hosts.map(host => {
      const hostId = host.host_id || host.hostId || host.id
      const hostKey = host.host_key || host.hostKey
      return patchScanApi
        .getPatchesOfMachine({ host_id: hostId, host_key: hostKey })
        .then(res => {
          const records = res?.data?.records || res?.records || res || []
          return records.map(p => ({
            ...p,
            hostId,
            hostKey,
            hostname: host.hostname || host.host_key
          }))
        })
        .catch(err => {
          console.error(`Failed to fetch patches for host ${hostKey}:`, err)
          return []
        })
    })

    const results = await Promise.all(promises)
    allPatches.value = results.flat()

    // 加载完成后默认全选
    await nextTick()
    handleToggleAllSelection(true)
  } catch (error) {
    console.error('Failed to aggregate patches:', error)
    ElMessage.error('获取主机关联补丁失败')
  } finally {
    loading.value = false
  }
}

// 切换全选/取消全选
function handleToggleAllSelection(forceSelect = false) {
  if (!tableRef.value) return

  const shouldSelect = forceSelect === true ? true : !isAllFilteredSelected.value
  filteredPatches.value.forEach(row => {
    tableRef.value.toggleRowSelection(row, shouldSelect)
  })
}

// 目标主机列表转换成向导接收的结构
const fixedHosts = computed(() => {
  return props.hosts.map(host => ({
    hostId: host.host_id || host.hostId || host.id,
    hostKey: host.host_key || host.hostKey || '',
    hostname: host.hostname || '',
    os_distro: host.os_distro || '',
    os_version: host.os_version || host.os_major_version || ''
  }))
})

// 选择的补丁转换成向导接收的结构
const patchesToInstall = computed(() => {
  return selectedRows.value.map(row => ({
    patch_id: row.patch_id,
    patch_name: row.patch_id,
    patchStatusIds: row.patchStatusIds
  }))
})

// 向导摘要信息
const installSelectionSummary = computed(() => {
  return selectedRows.value.map(row => ({
    key: row.patch_id,
    primary: row.patch_id,
    secondary: row.title || ''
  }))
})

// 开始安装，开启向导
function handleStartInstall() {
  if (patchesToInstall.value.length === 0) {
    ElMessage.warning('请选择要安装的补丁')
    return
  }
  installWizardVisible.value = true
}

// 安装向导执行成功
function handleInstallSuccess() {
  emit('success')
  handleClose()
}

// 监听抽屉显示，自动加载补丁
watch(
  () => props.visible,
  val => {
    if (val) {
      selectedSeverity.value = 'all'
      searchKeyword.value = ''
      currentPage.value = 1
      if (tableRef.value) {
        tableRef.value.clearSelection()
      }
      fetchPatches()
    }
  }
)
</script>

<style scoped lang="scss">
.batch-install-summary {
  background-color: var(--el-fill-color-light);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);

  .label {
    color: var(--el-text-color-regular);
    font-size: 13px;
  }

  .value {
    font-size: 14px;
  }

  .host-tags-container {
    display: inline-flex;
    flex-wrap: wrap;
    max-height: 80px;
    overflow-y: auto;
    gap: 4px;
    width: 100%;
    padding: 2px;
  }
}

.patch-id-text {
  font-family: monospace;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.severity-tag {
  font-weight: 500;
}
</style>
