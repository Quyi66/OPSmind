<template>
  <div class="ops-page-layout">
    <!-- 厂商统计 KPI 卡片 -->
    <!-- 厂商统计 KPI 卡片 -->
    <div class="vendor-kpi-section">
      <div
        v-for="vendor in vendorStats"
        :key="vendor.vendor"
        class="vendor-kpi-card"
        :class="[getVendorClass(vendor.vendor), { 'is-active': currentVendor === vendor.vendor }]"
        @click="handleVendorClick(vendor.vendor)"
      >
        <!-- 背景装饰图标 -->
        <div class="card-bg-icon">
          <i :class="getVendorIcon(vendor.vendor)" />
        </div>

        <div class="card-content">
          <div class="card-header">
            <div class="vendor-info">
              <i :class="getVendorIcon(vendor.vendor)" class="vendor-icon-small" />
              <span class="vendor-name">{{ (vendor.vendor || 'Unknown').toUpperCase() }}</span>
            </div>
            <div v-if="currentVendor === vendor.vendor" class="active-indicator">
              <i class="fa fa-check-circle" />
            </div>
          </div>

          <div class="card-body">
            <div class="count-value">{{ vendor.count.toLocaleString() }}</div>
            <div class="count-label">补丁总数</div>
          </div>

          <div class="card-footer">
            <div class="latest-date">
              <i class="fa fa-clock-o" />
              <span>更新: {{ vendor.latest_date }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :inline="true" size="small">
        <el-form-item label="严重级别">
          <el-select v-model="severityFilter" multiple placeholder="请选择" style="width: auto">
            <el-option label="严重" value="Critical" />
            <el-option label="重要" value="Important" />
            <el-option label="中等" value="Moderate" />
            <el-option label="低危" value="Low" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="ignoreFilter" style="width: 100px">
            <el-option label="全部" value="0,1" />
            <el-option label="白名单" value="1" />
            <el-option label="非白名单" value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filterText"
            placeholder="请输入关键词"
            style="width: 240px"
            clearable
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon>
              <Search />
            </el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon>
              <RefreshRight />
            </el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 操作栏 -->
    <div class="ops-action-bar">
      <el-button type="primary" size="small" @click="handleCheckPatchUpdate">
        检查补丁库更新
      </el-button>
      <el-button type="primary" size="small" :loading="uploadLoading" @click="fileInput.click()">
        上传补丁文件
      </el-button>
      <input
        type="file"
        ref="fileInput"
        accept=".json"
        multiple
        style="display: none"
        @change="handleFileUpload"
      />
      <el-button
        :disabled="selectedPatches.length === 0"
        size="small"
        @click="handleBatchAddWhitelist"
      >
        添加白名单
      </el-button>
      <el-button
        :disabled="selectedPatches.length === 0"
        type="danger"
        size="small"
        @click="handleBatchRemoveWhitelist"
      >
        移除白名单
      </el-button>
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        @click="handleRefresh"
        title="刷新"
      >
        <el-icon v-show="!loading">
          <Refresh />
        </el-icon>
      </el-button>
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="tableData"
        max-height="calc(100vh - 400px)"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="patch_id" label="补丁编号" width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="handleViewDetail(row)">
              {{ row.patch_id }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="概要" min-width="180" show-overflow-tooltip />
        <el-table-column prop="severity" label="严重级别" width="100" align="left">
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
        <el-table-column prop="related_vuls" label="关联CVE" min-width="200">
          <template #default="{ row }">
            <div class="cve-tags" v-if="row.related_vuls">
              <a
                v-for="(cve, idx) in parseCVEs(row.related_vuls).slice(0, 3)"
                :key="idx"
                :href="getCveUrl(cve, row.os_distro)"
                target="_blank"
                class="cve-link"
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
        <el-table-column prop="vendor" label="厂商" width="100" />
        <el-table-column prop="is_ignore" label="是否在白名单" width="110" align="left">
          <template #default="{ row }">
            <el-button
              v-if="row.is_ignore"
              text
              type="primary"
              size="small"
              @click="handleRemoveFromWhitelist(row)"
            >
              是
            </el-button>
            <el-button v-else text type="primary" size="small" @click="handleAddToWhitelist(row)">
              否
            </el-button>
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
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 补丁详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="补丁详情" width="700px" destroy-on-close>
      <div v-loading="detailLoading" class="patch-detail">
        <template v-if="patchDetail">
          <!-- 补丁编号 - 大号加粗 -->
          <h3 class="patch-detail-id">{{ patchDetail.patch_id }}</h3>

          <!-- 概要 -->
          <div class="patch-detail-row">
            <span class="patch-detail-label">概要：</span>
            <span class="patch-detail-value">{{ patchDetail.title }}</span>
          </div>

          <!-- 严重程度 -->
          <div class="patch-detail-row">
            <span class="patch-detail-label">严重程度：</span>
            <span class="patch-detail-value">
              <el-tag
                effect="dark"
                class="severity-tag"
                :class="'is-' + (patchDetail.severity || '').toLowerCase()"
              >
                {{ getSeverityLabel(patchDetail.severity) }}
              </el-tag>
            </span>
          </div>

          <!-- 描述 -->
          <div class="patch-detail-section">
            <div class="patch-detail-label">描述</div>
            <div class="patch-detail-desc" v-html="renderMarkdown(patchDetail.description)"></div>
          </div>

          <!-- 关联CVE -->
          <div class="patch-detail-section">
            <div class="patch-detail-label">关联CVE</div>
            <div class="patch-detail-cves">
              <template v-if="patchDetail.related_vuls">
                <span
                  v-for="(cve, idx) in parseCVEs(patchDetail.related_vuls)"
                  :key="idx"
                  class="cve-item"
                >
                  <a :href="getCveUrl(cve, patchDetail?.os_distro)" target="_blank">
                    {{ cve }}
                  </a>
                </span>
              </template>
              <span v-else>-</span>
            </div>
          </div>
        </template>
      </div>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
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
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
import { patchLibraryApi } from '../api'
import { runJob } from '@/modules/automation/api/command'
import { getCveUrl } from '../composables/useFormatters'

// 常量定义
const CHECK_PATCH_UPDATE_JOB_ID = '0QdW7u' // 检查补丁更新作业ID
const ADD_WHITELIST_JOB_ID = 'sosZAJ' // 添加白名单作业ID
const REMOVE_WHITELIST_JOB_ID = 'an2cRO' // 移除白名单作业ID

// 加载状态
const loading = ref(false)
const uploadLoading = ref(false)
const tableRef = ref(null)
const fileInput = ref(null)

// 厂商统计数据
const vendorStats = ref([])

// 筛选条件
const filterText = ref('')
const severityFilter = ref(['Critical', 'Important', 'Moderate', 'Low']) // 默认选中 Critical, Important, Moderate, Low
const ignoreFilter = ref('0,1') // 默认全部
const currentVendor = ref('redhat') // 默认 redhat

// 表格数据
const tableData = ref([])
const selectedPatches = ref([])

// 分页（后端）
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 详情对话框
const detailDialogVisible = ref(false)
const detailLoading = ref(false)
const patchDetail = ref(null)

// CVE 列表对话框
const cveDialogVisible = ref(false)
const cveDialogList = ref([])
const cveDialogOsDistro = ref('')

// 计算补丁总数
const totalPatches = computed(() => {
  return vendorStats.value.reduce((acc, curr) => acc + (curr.count || 0), 0)
})

// 计算百分比
function calculatePercent(count) {
  if (!totalPatches.value) return 0
  return ((count / totalPatches.value) * 100).toFixed(1)
}

// 获取厂商样式类
function getVendorClass(vendor) {
  const classMap = {
    centos: 'vendor-centos',
    suse: 'vendor-suse',
    redhat: 'vendor-redhat',
    ubuntu: 'vendor-ubuntu',
    kylinos: 'vendor-kylinos',
    kylin: 'vendor-kylin',
    anolis: 'vendor-anolis',
    uniontech: 'vendor-uniontech'
  }
  return classMap[vendor?.toLowerCase()] || 'vendor-default'
}

// 获取厂商图标
function getVendorIcon(vendor) {
  const v = vendor?.toLowerCase()
  if (v === 'kylinos') return 'fab fa-fedora'
  if (v === 'anolis') return 'fab fa-airbnb'
  if (v === 'uniontech') return 'fab fa-linux'
  if (v === 'kylin') return 'fab fa-linux'
  return `fab fa-${v}`
}

// 获取严重程度样式
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
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  } catch {
    return '-'
  }
}

// 解析CVE列表
function parseCVEs(vulsStr) {
  if (!vulsStr) return []
  return vulsStr.split(',').filter(cve => cve.trim())
}

function handleShowAllCves(row) {
  cveDialogList.value = parseCVEs(row.related_vuls)
  cveDialogOsDistro.value = row.os_distro
  cveDialogVisible.value = true
}

// 加载厂商统计数据
async function loadVendorStats() {
  try {
    const response = await patchLibraryApi.getVendorStats()
    // 源系统返回格式: { total: number, records: [] }
    vendorStats.value =
      response?.records || response?.data?.records || response?.data?.data?.records || []
  } catch (error) {
    console.error('Failed to load vendor stats:', error)
    vendorStats.value = []
  }
}

// 加载补丁列表数据
async function loadData() {
  loading.value = true
  try {
    const params = {
      severity: severityFilter.value.join(','),
      vendor: currentVendor.value,
      is_ignore: ignoreFilter.value,
      page: pagination.page,
      size: pagination.pageSize,
      filter: filterText.value.trim()
    }
    const response = await patchLibraryApi.getPatchList(params)
    const records =
      response?.records || response?.data?.records || response?.data?.data?.records || []
    tableData.value = records
    pagination.total =
      response?.total || response?.data?.total || response?.data?.data?.total || records.length
  } catch (error) {
    console.error('Failed to load patches:', error)
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// 筛选
function handleFilter() {
  pagination.page = 1
  loadData()
}

// 搜索
function handleSearch() {
  pagination.page = 1
  loadData()
}

// 重置
function handleReset() {
  severityFilter.value = ['Critical', 'Important', 'Moderate', 'Low'] // 重置为默认值
  ignoreFilter.value = '0,1'
  filterText.value = ''
  pagination.page = 1
  loadData()
}

// 刷新
function handleRefresh() {
  loadData()
  loadVendorStats()
}

// 分页变化 - 后端分页需要重新加载数据
function handlePageChange(page) {
  pagination.page = page
  loadData()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadData()
}

// 选择变化
function handleSelectionChange(selection) {
  selectedPatches.value = selection
}

// 点击厂商卡片
function handleVendorClick(vendor) {
  currentVendor.value = vendor
  pagination.page = 1
  loadData()
}

// 检查补丁库更新
async function handleCheckPatchUpdate() {
  try {
    await ElMessageBox.confirm('执行导入最近补丁库将花费几分钟时间不等，点确定开始导入', '确认', {
      type: 'info'
    })

    await runJob(CHECK_PATCH_UPDATE_JOB_ID, { params: {} })
    ElMessage.success('补丁库更新任务已提交')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Check patch update failed:', error)
      ElMessage.error('操作失败')
    }
  }
}

// 文件上传并导入
async function handleFileUpload(event) {
  const files = event.target.files
  if (!files || files.length === 0) return

  const formData = new FormData()
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i])
  }

  // 每次选择完成后清空 input 的值，以便能够重复选择相同文件
  event.target.value = ''

  uploadLoading.value = true
  try {
    const res = await patchLibraryApi.uploadAndImport(formData)
    const data = res?.data || res

    if (data.status === 'RUNNING') {
      let msg = data.message || '文件上传成功，补丁库导入任务已启动'
      if (data.failed && data.failed.length > 0) {
        msg += `<br>部分失败文件: ${data.failed.join(', ')}`
        ElMessage.warning({
          dangerouslyUseHTMLString: true,
          message: msg,
          showClose: true,
          duration: 5000
        })
      } else {
        ElMessage.success(msg)
      }
    } else {
      let msg = data.message || '上传处理失败'
      if (data.failed && data.failed.length > 0) {
        msg += `<br>失败原因:<br>${data.failed.join('<br>')}`
      }
      ElMessage.error({
        dangerouslyUseHTMLString: true,
        message: msg,
        showClose: true,
        duration: 5000
      })
    }
  } catch (error) {
    console.error('Upload and import failed:', error)
    ElMessage.error('上传失败，请检查网络或控制台日志')
  } finally {
    uploadLoading.value = false
  }
}

// 查看详情 - 调用 VAP2_GET_PATCH_DETAIL 获取详细信息
async function handleViewDetail(row) {
  detailDialogVisible.value = true
  detailLoading.value = true
  patchDetail.value = null

  try {
    const response = await patchLibraryApi.getPatchDetail(row.patch_id)
    patchDetail.value = response?.data || response
  } catch (error) {
    console.error('Failed to load patch detail:', error)
    // 使用行数据作为备用
    patchDetail.value = {
      patch_id: row.patch_id,
      title: row.title,
      severity: row.severity,
      description: row.description || '暂无描述信息',
      related_vuls: row.related_vuls
    }
  } finally {
    detailLoading.value = false
  }
}

// 简单的 markdown 渲染（处理基本格式）
function renderMarkdown(text) {
  if (!text) return '<span class="text-muted">暂无描述</span>'
  // 简单处理：换行、链接、加粗等
  return text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
}

// 添加到白名单
async function handleAddToWhitelist(row) {
  try {
    await ElMessageBox.confirm('确认要将该补丁加入白名单吗？', '确认', { type: 'warning' })
    await runJob(ADD_WHITELIST_JOB_ID, {
      params: {
        patchIdList: [row.patch_id]
      }
    })
    ElMessage.success('已添加到白名单')
    loadData()
  } catch (error) {
    if (error === 'cancel') return
    console.error('Add to whitelist failed:', error)
    ElMessage.error('操作失败')
  }
}

// 从白名单移除
async function handleRemoveFromWhitelist(row) {
  try {
    await ElMessageBox.confirm('确认要将该补丁移出白名单吗？', '确认', { type: 'warning' })
    await runJob(REMOVE_WHITELIST_JOB_ID, {
      params: {
        patchIdList: [row.patch_id]
      }
    })
    ElMessage.success('已从白名单移除')
    loadData()
  } catch (error) {
    if (error === 'cancel') return
    console.error('Remove from whitelist failed:', error)
    ElMessage.error('操作失败')
  }
}

// 批量添加白名单
async function handleBatchAddWhitelist() {
  if (selectedPatches.value.length === 0) return

  try {
    await ElMessageBox.confirm('确认要加入白名单！', '确认', { type: 'info' })

    const patchIdList = selectedPatches.value.map(p => p.patch_id)
    await runJob(ADD_WHITELIST_JOB_ID, {
      params: { patchIdList }
    })
    ElMessage.success('批量添加白名单成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Batch add whitelist failed:', error)
      ElMessage.error('操作失败')
    }
  }
}

// 批量移除白名单
async function handleBatchRemoveWhitelist() {
  if (selectedPatches.value.length === 0) return

  try {
    await ElMessageBox.confirm('确认要移除白名单！', '确认', { type: 'warning' })

    const patchIdList = selectedPatches.value.map(p => p.patch_id)
    await runJob(REMOVE_WHITELIST_JOB_ID, {
      params: { patchIdList }
    })
    ElMessage.success('批量移除白名单成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Batch remove whitelist failed:', error)
      ElMessage.error('操作失败')
    }
  }
}

onMounted(() => {
  loadVendorStats()
  loadData()
})

// 暴露方法
defineExpose({
  refresh: handleRefresh
})
</script>

<style scoped lang="scss">
// 厂商KPI卡片区域
.vendor-kpi-section {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  overflow-x: auto;
  padding-bottom: 4px; /* Space for scrollbar if needed, though we try to fit */
  flex-wrap: nowrap;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #e4e7ed;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #c0c4cc;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

.vendor-kpi-card {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  padding: 12px; /* Reduced from 16px */
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 180px; /* Reduced min-width slightly */
  flex: 1;

  // Default State (Inactive)
  background: #fff;
  border: 1px solid #e9ecef;
  color: #606266;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border-color: #dcdfe6;

    .card-bg-icon {
      opacity: 0.1;
      transform: rotate(0deg) scale(1.1);
    }
  }

  // Active State
  &.is-active {
    color: #fff;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-color: transparent;
    transform: scale(1.02);

    .card-bg-icon {
      color: #fff !important;
      opacity: 0.2;
    }

    .vendor-name,
    .count-value,
    .count-label {
      color: #fff !important;
      opacity: 1;
    }

    .latest-date {
      background: #fff;
      color: #303133 !important;
      opacity: 0.9;
      font-weight: 600;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
  }

  // 背景图标
  .card-bg-icon {
    position: absolute;
    right: -15px;
    bottom: -20px;
    font-size: 80px; /* Reduced from 100px */
    opacity: 0.05;
    transform: rotate(-15deg);
    pointer-events: none;
    z-index: 0;
    transition:
      transform 0.3s ease,
      opacity 0.3s ease;
    color: currentColor;
  }

  .card-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    justify-content: space-between;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px; /* Reduced from 12px */

    .vendor-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .vendor-icon-small {
      font-size: 16px; /* Reduced from 18px */
    }

    .vendor-name {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #303133;
    }

    .active-indicator {
      font-size: 14px;
      opacity: 0.9;
    }
  }

  .card-body {
    margin-bottom: 4px; /* Reduced from 12px */

    .count-value {
      font-size: 24px; /* Reduced from 28px */
      font-weight: 800;
      line-height: 1.2;
      margin-bottom: 0px;
      color: #303133;
    }

    .count-label {
      font-size: 12px;
      color: #909399;
      font-weight: 500;
    }
  }

  .card-footer {
    display: flex;
    flex-direction: column;
    gap: 0;

    .latest-date {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #909399;
      background: #f4f4f5;
      padding: 4px 8px;
      border-radius: 4px;
      width: fit-content;
      transition: all 0.3s ease;
    }
  }
}

// 厂商特定对应样式
// Defines colors for text/icons in inactive state, and full gradient for active state

.vendor-suse {
  .vendor-icon-small,
  .card-bg-icon {
    color: #28a745;
  }
  &.is-active {
    background: linear-gradient(135deg, #43cea2 0%, #185a9d 100%);
    // Replacement Suse
    background: linear-gradient(135deg, #73c6b6 0%, #117a65 100%);
  }
}

.vendor-redhat {
  .vendor-icon-small,
  .card-bg-icon {
    color: #dc3545;
  }
  &.is-active {
    background: linear-gradient(135deg, #ff6b6b 0%, #c0392b 100%);
  }
}

.vendor-uniontech {
  .vendor-icon-small,
  .card-bg-icon {
    color: #2874a6;
  }
  &.is-active {
    background: linear-gradient(135deg, #5dade2 0%, #2874a6 100%);
  }
}

.vendor-kylinos {
  .vendor-icon-small,
  .card-bg-icon {
    color: #6c3483;
  }
  &.is-active {
    background: linear-gradient(135deg, #a569bd 0%, #6c3483 100%);
  }
}

.vendor-ubuntu {
  .vendor-icon-small,
  .card-bg-icon {
    color: #d35400;
  }
  &.is-active {
    background: linear-gradient(135deg, #f39c12 0%, #d35400 100%);
  }
}

.vendor-centos {
  .vendor-icon-small,
  .card-bg-icon {
    color: #5b2c6f;
  }
  &.is-active {
    background: linear-gradient(135deg, #8e44ad 0%, #5b2c6f 100%);
  }
}

.vendor-anolis {
  .vendor-icon-small,
  .card-bg-icon {
    color: #34495e;
  }
  &.is-active {
    background: linear-gradient(135deg, #95a5a6 0%, #34495e 100%);
  }
}

.vendor-kylin {
  .vendor-icon-small,
  .card-bg-icon {
    color: #c0392b;
  }
  &.is-active {
    background: linear-gradient(135deg, #e74c3c 0%, #922b21 100%);
  }
}

.vendor-default {
  .vendor-icon-small,
  .card-bg-icon {
    color: #545b62;
  }
  &.is-active {
    background: linear-gradient(135deg, #99a3a4 0%, #626567 100%);
  }
}

.severity-critical {
  background-color: #dc3545;
  color: #fff;
}

.severity-important {
  background-color: #fd7e14;
  color: #fff;
}

.severity-moderate {
  background-color: #6c757d;
  color: #fff;
}

.severity-low {
  background-color: #6c757d;
  color: #fff;
}

// CVE标签
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

// 补丁详情对话框样式
.patch-detail {
  min-height: 200px;

  .patch-detail-id {
    font-size: 18px;
    font-weight: 700;
    color: #333;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e9ecef;
  }

  .patch-detail-row {
    margin-bottom: 12px;
    line-height: 1.6;

    .patch-detail-label {
      font-weight: 600;
      color: #333;
    }

    .patch-detail-value {
      font-size: 14px;
      color: #606266;
    }
  }

  .patch-detail-section {
    margin-top: 16px;

    .patch-detail-label {
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
    }

    .patch-detail-desc {
      font-size: 14px;
      color: #606266;
      line-height: 1.8;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 4px;
      max-height: 300px;
      overflow-y: auto;

      code {
        background: #e9ecef;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: monospace;
      }
    }

    .patch-detail-cves {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .cve-item {
        a {
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
      }
    }
  }
}

// 表格样式
:deep(.el-table) {
  font-size: 13px;

  .el-table__header th {
    background-color: #f8f9fa !important;
    color: #495057;
    font-weight: 500;
  }

  .el-table__cell {
    padding: 8px 0;
  }
}

// 复选框组样式
:deep(.el-checkbox-group) {
  display: flex;
  align-items: center;
  gap: 12px;
}

:deep(.el-checkbox) {
  margin-right: 0;
}

// 按钮样式
:deep(.el-button--primary.is-plain) {
  border-color: #0d6efd;
  color: #0d6efd;

  &:hover {
    background: #0d6efd;
    color: #fff;
  }
}
</style>
