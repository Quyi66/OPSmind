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
          <span class="patch-detail__value">{{ patchDetail.severity }}</span>
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

    <!-- 选择目标主机对话框 -->
    <el-dialog
      v-model="installDialogVisible"
      title="选择目标主机"
      width="1000px"
      :close-on-click-modal="false"
      class="install-dialog"
      top="5vh"
    >
      <div class="install-content" v-loading="installDataLoading">
        <!-- 更新补丁 -->
        <div class="install-card">
          <div class="card-header">
            <i class="fa fa-lock" />
            更新补丁
          </div>
          <div class="card-body">
            {{ patchesToInstall.map(p => p.patch_id).join(', ') }}
          </div>
        </div>

        <!-- 待更新软件包 -->
        <div class="install-card">
          <div class="card-header">
            <i class="fa fa-cube" />
            待更新软件包
          </div>
          <div class="card-body card-body--scroll">
            <div v-for="pkg in affectedPackages" :key="pkg" class="package-item">
              {{ pkg }}
            </div>
            <div v-if="affectedPackages.length === 0" class="no-data">暂无数据</div>
          </div>
        </div>

        <!-- 更新主机 -->
        <div class="install-card install-card--table">
          <div class="card-header">
            <i class="fa fa-list" />
            更新主机
          </div>
          <div class="card-body">
            <!-- 工具栏：设备选择 + 搜索 -->
            <div class="host-toolbar">
              <el-select v-model="hostFilter" size="small" style="width: 140px">
                <el-option label="@@(linux)" value="@@(linux)">
                  <i class="fa fa-server" />
                  @@(linux)
                </el-option>
              </el-select>
              <el-input
                v-model="hostSearchText"
                placeholder="搜索"
                prefix-icon="Search"
                size="small"
                style="width: 200px"
                clearable
              />
            </div>
            <!-- 主机表格 -->
            <el-table
              ref="hostTableRef"
              :data="filteredHosts"
              size="small"
              height="220"
              @selection-change="handleHostSelectionChange"
            >
              <el-table-column type="selection" width="40" />
              <el-table-column prop="hostKey" label="主机" min-width="200" sortable>
                <template #default="{ row }">
                  <span class="host-link">{{ row.hostKey }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="os_distro" label="OS" width="100" sortable />
              <el-table-column prop="os_version" label="OS版本" width="100" sortable />
              <el-table-column prop="scan_timestamp" label="上次扫描时间" width="180" sortable>
                <template #default="{ row }">
                  {{ formatDateTime(row.scan_timestamp) }}
                </template>
              </el-table-column>
            </el-table>
            <!-- 分页 -->
            <div class="host-pagination">
              <el-pagination
                v-model:current-page="hostPagination.page"
                v-model:page-size="hostPagination.pageSize"
                :page-sizes="[10, 20, 50]"
                :total="hostPagination.total"
                layout="total, sizes, prev, pager, next, jumper"
                size="small"
                background
                @size-change="handleHostSizeChange"
                @current-change="handleHostPageChange"
              />
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="installDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="installLoading"
          :disabled="selectedHosts.length === 0"
          @click="executeInstall"
        >
          <i class="fa fa-chevron-right" style="margin-right: 4px" />
          开始更新
        </el-button>
      </template>
    </el-dialog>

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
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import { patchInstallApi } from '../api'
import { getCveUrl } from '../composables/useFormatters'

// 加载状态
const loading = ref(false)
const installLoading = ref(false)

// 统一筛选条件
const filters = reactive({
  severity: ['Critical', 'Important', 'Moderate', 'Low' ], // 默认勾选严重和重要
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

// 安装对话框
const installDialogVisible = ref(false)
const patchesToInstall = ref([])
const installDataLoading = ref(false)
const affectedPackages = ref([])
const affectedHosts = ref([])
const selectedHosts = ref([])
const hostTableRef = ref(null)
const hostFilter = ref('@@(linux)')
const hostSearchText = ref('')
const hostPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 过滤后的主机列表
const filteredHosts = computed(() => {
  let hosts = affectedHosts.value
  if (hostSearchText.value) {
    const keyword = hostSearchText.value.toLowerCase()
    hosts = hosts.filter(
      h =>
        h.hostKey?.toLowerCase().includes(keyword) || h.os_distro?.toLowerCase().includes(keyword)
    )
  }
  // 更新总数
  hostPagination.total = hosts.length
  // 分页
  const start = (hostPagination.page - 1) * hostPagination.pageSize
  const end = start + hostPagination.pageSize
  return hosts.slice(start, end)
})

// 主机分页处理
function handleHostPageChange(page) {
  hostPagination.page = page
}

function handleHostSizeChange(size) {
  hostPagination.pageSize = size
  hostPagination.page = 1
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
  return patch.os_distro || patch.vendor || ''
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
  filters.severity = ['Critical', 'Important', 'Moderate', 'Low' ]
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

function handleViewAffectedHosts(row) {
  // 点击受影响软件包数量，打开安装弹窗
  patchesToInstall.value = [row]
  installDialogVisible.value = true
  loadInstallData([row.patch_id])
}

function handleInstallSelected() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要安装的补丁')
    return
  }
  patchesToInstall.value = [...selectedRows.value]
  installDialogVisible.value = true
  loadInstallData(selectedRows.value.map(p => p.patch_id))
}

function handleInstallSingle(patch) {
  patchesToInstall.value = [patch || selectedPatch.value]
  patchDetailVisible.value = false
  installDialogVisible.value = true
  loadInstallData([patchesToInstall.value[0].patch_id])
}

// 加载安装相关数据（软件包列表、主机列表）
async function loadInstallData(patchIds) {
  installDataLoading.value = true
  affectedPackages.value = []
  affectedHosts.value = []
  selectedHosts.value = []
  try {
    // 并行加载软件包和主机数据
    const [pkgResponse, hostResponse] = await Promise.all([
      patchInstallApi.getAffectedPackages({ patch_ids: patchIds }),
      patchInstallApi.getMachinesByPatch({ patch_ids: patchIds, hostId: '@@(linux)' })
    ])

    if (pkgResponse?.data?.records) {
      affectedPackages.value = pkgResponse.data.records.map(r => r.file_name || r.pkg_name)
    }

    if (hostResponse?.data?.records) {
      affectedHosts.value = hostResponse.data.records
    }
  } catch (error) {
    console.error('Failed to load install data:', error)
    // 模拟数据
    affectedPackages.value = [
      'glibc-devel-0:2.17-55.el7_0.5.x86_64',
      'glibc-common-0:2.17-55.el7_0.5.x86_64',
      'glibc-utils-0:2.17-55.el7_0.5.x86_64',
      'nscd-0:2.17-55.el7_0.5.x86_64'
    ]
    affectedHosts.value = generateMockHosts()
  } finally {
    installDataLoading.value = false
  }
}

// 生成模拟主机数据
function generateMockHosts() {
  const hosts = []
  for (let i = 0; i < 5; i++) {
    hosts.push({
      hostId: `host-${i}`,
      hostKey: `192.168.1.${100 + i}`,
      os_distro: 'RHEL',
      os_version: `7.${i + 1}`,
      scan_timestamp: Date.now() - Math.random() * 86400000 * 7
    })
  }
  return hosts
}

function handleHostSelectionChange(selection) {
  selectedHosts.value = selection
}

// 格式化日期时间
function formatDateTime(timestamp) {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date
    .toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    .replace(/\//g, '-')
}

async function executeInstall() {
  if (selectedHosts.value.length === 0) {
    ElMessage.warning('请选择要安装补丁的主机')
    return
  }

  installLoading.value = true
  try {
    await patchInstallApi.install({
      patchIds: patchesToInstall.value.map(p => p.patch_id),
      hostIds: selectedHosts.value.map(h => h.hostId),
      packages: affectedPackages.value
    })
    ElMessage.success('安装任务已提交')
    installDialogVisible.value = false
  } catch (error) {
    console.error('Install failed:', error)
    ElMessage.error('安装任务提交失败')
  } finally {
    installLoading.value = false
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
    color: #212529;
  }

  &-dark {
    background-color: #343a40;
  }

  &-secondary {
    background-color: #6c757d;
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
    color: #6c757d;
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

.install-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.install-card {
  border: 1px solid #dee2e6;
  border-radius: 4px;
  overflow: hidden;

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
    font-size: 13px;
    color: #495057;

    i {
      color: #6c757d;
    }
  }

  .card-body {
    padding: 10px 12px;
    background: #fff;
    font-size: 13px;
    color: #495057;

    &--scroll {
      max-height: 140px;
      overflow-y: auto;
      color: #495057;
    }
  }

  &--table {
    .card-body {
      padding: 0;
      color: inherit;
    }
  }
}

.package-item {
  padding: 2px 0;
  color: #495057;
  font-size: 13px;
}

.no-data {
  color: #adb5bd;
  text-align: center;
  padding: 20px;
}

.host-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #e9ecef;
  background: #fff;
}

.host-link {
  color: #495057;
}

.host-pagination {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 8px 12px;
  border-top: 1px solid #e9ecef;
  background: #fff;
}

.patch-detail {
  padding: 8px;

  &__id {
    font-size: 18px;
    font-weight: bold;
    color: #212529;
    margin: 0 0 16px 0;
  }

  &__item {
    margin-bottom: 8px;
  }

  &__label {
    font-weight: bold;
    color: #212529;
  }

  &__value {
    font-size: 14px;
    color: #495057;
  }

  &__desc {
    font-size: 14px;
    color: #495057;
    line-height: 1.6;
    margin-bottom: 16px;
    padding: 8px 0;
  }

  &__cve-list {
    margin: 8px 0 0 0;
    padding-left: 20px;

    li {
      margin-bottom: 4px;
    }

    .cve-link {
      color: #0d6efd;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}

.patch-detail-loading {
  padding: 20px;
}
</style>
