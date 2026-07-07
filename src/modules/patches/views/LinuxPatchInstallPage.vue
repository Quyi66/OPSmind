<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item label="严重程度">
          <el-select v-model="filters.severity" multiple placeholder="请选择" style="width: auto">
            <el-option label="严重" value="Critical" />
            <el-option label="重要" value="Important" />
            <el-option label="中等" value="Moderate" />
            <el-option label="低危" value="Low" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索补丁编号、概要、CVE..."
            style="width: 240px"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 操作区 -->
    <div class="ops-action-bar">
      <el-button
        type="primary"
        size="small"
        :disabled="selectedPatchIds.length === 0"
        @click="handleInstallSelected"
      >
        安装选中的补丁
      </el-button>
      <el-button
        size="small"
        :type="allSelected ? 'default' : 'primary'"
        @click="handleToggleSelectAll"
      >
        <i :class="`fa fa-${allSelected ? 'times' : 'check-double'} me-1`" />
        {{ allSelected ? '一键取消' : '一键全选' }}
      </el-button>
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        @click="loadData"
        title="刷新"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="paginatedData"
        max-height="calc(100vh - 264px)"
        @select="handleTableSelect"
        @select-all="handleTableSelect"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="patch_id" label="补丁编号" min-width="160" sortable>
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="handleViewPatchDetail(row)">
              {{ row.patch_id }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="概要" min-width="220" show-overflow-tooltip />
        <el-table-column prop="severity" label="严重性" width="100" sortable>
          <template #default="{ row }">
            <el-tag
              effect="dark"
              class="severity-tag"
              :class="'is-' + (row.severity || '').toLowerCase()"
            >
              {{ getSeverityLabel(row.severity) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="publish_date" label="发布时间" width="120" sortable>
          <template #default="{ row }">
            {{ formatDate(row.publish_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="related_vuls" label="关联CVE" min-width="320">
          <template #default="{ row }">
            <CveLinkList
              :cves="row.related_vuls"
              :url-resolver="cve => getCveUrl(cve, resolvePatchDistro(row))"
            />
          </template>
        </el-table-column>
        <el-table-column prop="effect_host_count" label="受影响的软件包" width="130" align="left">
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="handleViewAffectedHosts(row)">
              {{ row.effect_host_count }}
            </el-link>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页区域 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="totalCount"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 补丁详情对话框 -->
    <el-dialog
      v-model="patchDetailVisible"
      title="补丁详情"
      width="800px"
      :close-on-click-modal="false"
      class="patch-detail-dialog"
    >
      <PatchDetailContent
        :patch="patchDetail || {}"
        :loading="patchDetailLoading"
        :cve-source="resolvePatchDistro(patchDetail)"
      />
    </el-dialog>

    <!-- 统一补丁向导组件 -->
    <PatchInstallWizard
      v-model:visible="installDialogVisible"
      :patches-to-install="patchesToInstall"
      @success="handleInstallSuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import { getCveUrl } from '../composables/useFormatters'
import { patchInstallApi } from '../api'
import PatchInstallWizard from '../components/patch-task/wizard/PatchInstallWizard.vue'
import PatchDetailContent from '../components/common/PatchDetailContent.vue'
import CveLinkList from '../components/common/CveLinkList.vue'
import { useTableSelectAll } from '../composables/useTableSelectAll'

// 加载状态
const loading = ref(false)

// 统一筛选条件
const filters = reactive({
  severity: ['Critical', 'Important', 'Moderate', 'Low'], // 默认勾选严重和重要
  keyword: ''
})

// 表格数据
const tableRef = ref(null)
const allData = ref([]) // 存储所有数据
const selectedRows = ref([])

// 选中的补丁ID列表
const selectedPatchIds = computed(() => selectedRows.value.map(r => r.patch_id))

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10
})

// 筛选后的数据（仅关键词筛选，严重程度已由后端筛选）
const filteredData = computed(() => {
  let data = allData.value

  // 根据关键词筛选
  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase().trim()
    data = data.filter(
      item =>
        item.patch_id?.toLowerCase().includes(keyword) ||
        item.title?.toLowerCase().includes(keyword) ||
        item.related_vuls?.toLowerCase().includes(keyword)
    )
  }

  return data
})

// 分页后的数据
const paginatedData = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return filteredData.value.slice(start, end)
})

// 总数
const totalCount = computed(() => filteredData.value.length)

// 补丁详情对话框
const patchDetailVisible = ref(false)
const patchDetail = ref(null)
const patchDetailLoading = ref(false)

// ============================================================
// 补丁安装相关
// ============================================================
const installDialogVisible = ref(false)
const patchesToInstall = ref([])

function handleViewAffectedHosts(row) {
  patchesToInstall.value = [row]
  installDialogVisible.value = true
}

function handleInstallSelected() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要安装的补丁')
    return
  }
  patchesToInstall.value = [...selectedRows.value]
  installDialogVisible.value = true
}

function handleInstallSuccess() {
  resetAllSelected()
  loadData()
}

// 获取严重程度显示标签
function getSeverityLabel(severity) {
  const map = {
    Critical: '严重',
    Important: '重要',
    Moderate: '中等',
    Low: '低危'
  }
  return map[severity] || severity
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date
    .toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    .replace(/\//g, '-')
}

// 解析CVE列表
function parseCveList(cveStr) {
  if (!cveStr) return []
  return cveStr
    .split(',')
    .map(cve => cve.trim())
    .filter(cve => cve)
}

function resolvePatchDistro(patch) {
  if (!patch) return ''
  return patch.os_distro || patch.vendor || (patch.patch_id.includes('KYSA') ? 'kylin' : 'redhat')
}

// 预处理数据 - 提前解析CVE列表
function preprocessData(records) {
  return records.map(item => ({
    ...item,
    _cveList: parseCveList(item.related_vuls)
  }))
}

// 加载数据 - 一次性获取所有数据
async function loadData() {
  loading.value = true
  try {
    // 构建 params 参数
    const params = {}
    if (filters.severity.length > 0) {
      params.severity = filters.severity.join(',')
    }

    const response = await patchInstallApi.getAvailablePatches(params)
    if (response?.data) {
      allData.value = preprocessData(response.data.records || response.data || [])
    }
    resetAllSelected()
  } catch (error) {
    console.error('Failed to load patches:', error)
    ElMessage.error('加载可安装补丁失败，请稍后重试')
    allData.value = []
  } finally {
    loading.value = false
  }
}

// 搜索处理（严重程度改变时需要重新加载）
function handleSearch() {
  resetAllSelected()
  pagination.page = 1
  loadData()
}

// 重置处理
function handleReset() {
  resetAllSelected()
  filters.severity = ['Critical', 'Important', 'Moderate', 'Low']
  filters.keyword = ''
  pagination.page = 1
  pagination.pageSize = 10
  loadData()
}

// 全选逻辑
const {
  allSelected,
  handleToggleAllSelection: handleToggleSelectAll,
  handleTableSelect,
  resetAllSelected
} = useTableSelectAll(tableRef, {
  tableData: paginatedData,
  filteredData,
  selectedItems: selectedRows
})

function handlePageChange(page) {
  pagination.page = page
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
}

function handleViewPatchDetail(row) {
  patchDetailVisible.value = true
  loadPatchDetail(row.patch_id)
}

// 加载补丁详情
async function loadPatchDetail(patchId) {
  patchDetailLoading.value = true
  patchDetail.value = null
  try {
    const response = await patchInstallApi.getPatchDetail({ patch_id: patchId })
    if (response?.data?.records?.length > 0) {
      patchDetail.value = response.data.records[0]
    }
  } catch (error) {
    console.error('Failed to load patch detail:', error)
    ElMessage.error('加载补丁详情失败，请稍后重试')
    patchDetail.value = null
  } finally {
    patchDetailLoading.value = false
  }
}

function refresh() {
  loadData()
}

onMounted(() => {
  loadData()
})

defineExpose({ refresh })
</script>

<style scoped lang="scss">
.task-done-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.task-done-desc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
// 徽章样式
.badge {
  display: inline-block;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
  color: #fff;

  &-danger {
    background-color: #dc3545;
  }

  &-warning {
    background-color: #ffc107;
    color: var(--el-text-color-primary);
  }

  &-dark {
    background-color: #343a40;
  }

  &-secondary {
    background-color: var(--el-text-color-secondary);
  }
}

.severity-tag {
  font-weight: 600;
  letter-spacing: 0.5px;
  border: none;

  &.is-critical {
    background-color: #dc3545;
    color: #fff;
  }

  &.is-important {
    background-color: #fd7e14;
    color: #fff;
  }

  &.is-moderate {
    background-color: #ffc107;
    color: #5c3c00;
  }

  &.is-low {
    background-color: #6c757d;
    color: #fff;
  }
}

.patch-link {
  color: #409eff;
  text-decoration: none;
  cursor: pointer;
  user-select: text;

  &:hover {
    color: #66b1ff;
    text-decoration: underline;
  }
}
</style>
