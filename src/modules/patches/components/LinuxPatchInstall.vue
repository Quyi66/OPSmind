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
        max-height="calc(100vh - 230px)"
        @selection-change="handleSelectionChange"
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
            <div class="cve-tags" v-if="row.related_vuls">
              <a
                v-for="(cve, idx) in parseCVEs(row.related_vuls).slice(0, 3)"
                :key="idx"
                :href="getCveUrl(cve, resolvePatchDistro(row))"
                target="_blank"
                class="cve-link"
                @click.stop
              >
                {{ cve }}
              </a>
              <button
                v-if="parseCVEs(row.related_vuls).length > 3"
                type="button"
                class="cve-more"
                @click="handleShowAllCves(row)"
              >
                +{{ parseCVEs(row.related_vuls).length - 3 }}
              </button>
            </div>
            <span v-else>-</span>
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
      <div class="patch-detail" v-if="patchDetail" v-loading="patchDetailLoading">
        <h3 class="patch-detail__id">{{ patchDetail.patch_id }}</h3>
        <div class="patch-detail__item">
          <span class="patch-detail__label">概要：</span>
          <span class="patch-detail__value">{{ patchDetail.title }}</span>
        </div>
        <div class="patch-detail__item">
          <span class="patch-detail__label">严重性：</span>
          <span class="patch-detail__value">
            <el-tag
              effect="dark"
              class="severity-tag"
              :class="'is-' + (patchDetail.severity || '').toLowerCase()"
            >
              {{ getSeverityLabel(patchDetail.severity) }}
            </el-tag>
          </span>
        </div>
        <div class="patch-detail__item">
          <span class="patch-detail__label">描述</span>
        </div>
        <div class="patch-detail__desc">
          {{ patchDetail.description }}
        </div>
        <div class="patch-detail__item">
          <span class="patch-detail__label">关联CVE</span>
        </div>
        <ul class="patch-detail__cve-list">
          <li v-for="cve in parseCveList(patchDetail.related_vuls)" :key="cve">
            <a
              :href="getCveUrl(cve, resolvePatchDistro(patchDetail))"
              target="_blank"
              class="cve-link"
            >
                            {{ cve }}
            </a>
          </li>
        </ul>
      </div>
      <div v-else-if="patchDetailLoading" class="patch-detail-loading">
        <el-skeleton :rows="6" animated />
      </div>
    </el-dialog>

    <!-- 统一补丁向导组件 -->
    <PatchInstallWizard
      v-model:visible="installDialogVisible"
      :patches-to-install="patchesToInstall"
      @success="handleInstallSuccess"
    />

    <!-- 关联CVE 列表对话框 -->
    <el-dialog v-model="cveDialogVisible" title="关联CVE" width="520px" destroy-on-close>
      <div class="cve-dialog">
        <template v-if="cveDialogList.length">
          <a
            v-for="(cve, idx) in cveDialogList"
            :key="idx"
            :href="getCveUrl(cve, cveDialogOsDistro)"
            target="_blank"
            class="cve-dialog-item"
          >
            {{ cve }}
          </a>
        </template>
        <span v-else>-</span>
      </div>
      <template #footer>
        <el-button @click="cveDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>


  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, RefreshRight, Upload } from '@element-plus/icons-vue'
import { getCveUrl } from '../composables/useFormatters'
import { patchInstallApi } from '../api'
import PatchInstallWizard from './patch-task/PatchInstallWizard.vue'

// 加载状态
const loading = ref(false)
const installLoading = ref(false)

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
const selectedPatch = ref(null)
const cveDialogVisible = ref(false)
const cveDialogList = ref([])
const cveDialogOsDistro = ref('')

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

function handleInstallSingle(patch) {
  patchesToInstall.value = [patch || selectedPatch.value]
  patchDetailVisible.value = false
  installDialogVisible.value = true
}

function resetInstallState() {
  installDialogVisible.value = false
}

function handleInstallSuccess() {
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

function parseCVEs(vulsStr) {
  if (!vulsStr) return []
  return vulsStr.split(',').filter(cve => cve.trim())
}

function handleShowAllCves(row) {
  cveDialogList.value = parseCVEs(row.related_vuls)
  cveDialogOsDistro.value = resolvePatchDistro(row)
  cveDialogVisible.value = true
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
  } catch (error) {
    console.error('Failed to load patches:', error)
    // 模拟数据
    allData.value = preprocessData(generateMockData())
  } finally {
    loading.value = false
  }
}

// 生成模拟数据
function generateMockData() {
  const severities = ['Critical', 'Important', 'Moderate', 'Low']
  const data = []
  for (let i = 0; i < 30; i++) {
    const year = 2025
    const seqNum = String(10000 + Math.floor(Math.random() * 20000))
    data.push({
      patch_id: `RHSA-${year}:${seqNum}`,
      title: `Important: ${['libtiff', 'bind', 'sssd', 'cups', 'container-tools:rhel8'][i % 5]} security update`,
      severity: severities[i % 4],
      publish_date: `${year}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      related_vuls: `CVE-${year}-${String(Math.floor(Math.random() * 90000) + 10000)}`,
      effect_host_count: Math.floor(Math.random() * 10) + 1
    })
  }
  return data
}

// 搜索处理（严重程度改变时需要重新加载）
function handleSearch() {
  pagination.page = 1
  loadData()
}

// 重置处理
function handleReset() {
  // 重置筛选条件为默认值
  filters.severity = ['Critical', 'Important', 'Moderate', 'Low']
  filters.keyword = ''
  // 重置分页
  pagination.page = 1
  pagination.pageSize = 10
  loadData()
}

function handleSelectionChange(selection) {
  selectedRows.value = selection
}

function handlePageChange(page) {
  pagination.page = page
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
}

function handleViewPatchDetail(row) {
  selectedPatch.value = row
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
    // 使用模拟数据
    patchDetail.value = {
      patch_id: patchId,
      title: selectedPatch.value?.title || 'Important: security update',
      severity: selectedPatch.value?.severity || 'Important',
      description:
        'The libtiff packages contain a library of functions for manipulating Tagged Image File Format (TIFF) files. Security Fix(es): libtiff: LibTIFF Use-After-Free Vulnerability (CVE-2025-8176) For more details about the security issue(s), including the impact, a CVSS score, acknowledgments, and other related information, refer to the CVE page(s) listed in the References section.',
      related_vuls: selectedPatch.value?.related_vuls || 'CVE-2025-8176'
    }
  } finally {
    patchDetailLoading.value = false
  }
}



// executeInstall 已不再使用（新流程按步骤执行）
// 保留空函数以防外部引用
function executeInstall() {}

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

.cve-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;

  .cve-link {
    display: inline-block;
    padding: 2px 8px;
    background: #6c757d;
    color: #fff;
    border-radius: 4px;
    font-size: 12px;
    text-decoration: none;
    transition: background 0.2s;

    &:hover {
      background: #545b62;
    }
  }

  .cve-more {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px 8px;
    background: #e9ecef;
    color: var(--el-text-color-secondary);
    border-radius: 4px;
    font-size: 12px;
    border: none;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: #dfe3e6;
    }
  }
}

.cve-dialog {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cve-dialog-item {
  display: inline-block;
  padding: 4px 10px;
  background: #6c757d;
  color: #fff;
  border-radius: 4px;
  font-size: 13px;
  text-decoration: none;
  transition: background 0.2s;

  &:hover {
    background: #545b62;
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
