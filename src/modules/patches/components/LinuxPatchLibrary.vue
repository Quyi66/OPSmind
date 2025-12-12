<template>
  <div class="patch-library">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-actions">
        <el-button type="primary" link @click="handleCheckPatchUpdate">
          <i class="fa fa-chevron-right" /> 检查补丁库更新
        </el-button>
      </div>
    </div>

    <div class="page-content">
      <!-- 厂商统计 KPI 卡片 -->
      <div class="vendor-kpi-section">
        <div
          v-for="vendor in vendorStats"
          :key="vendor.vendor"
          class="vendor-kpi-card"
          :class="getVendorClass(vendor.vendor)"
          @click="handleVendorClick(vendor.vendor)"
        >
          <div class="kpi-left">
            <div class="kpi-header">
              <span class="kpi-vendor">{{ vendor.vendor.toUpperCase() }}</span>
              <span class="kpi-date">{{ vendor.latest_date }}</span>
            </div>
            <div class="kpi-value">{{ vendor.count }}</div>
          </div>
          <div class="kpi-icon">
            <i :class="getVendorIcon(vendor.vendor)" />
          </div>
        </div>
      </div>

      <!-- 筛选条件 -->
      <div class="filter-bar">
        <div class="filter-left">
          <!-- 严重程度多选 -->
          <el-checkbox-group v-model="severityFilter" @change="handleFilter">
            <el-checkbox value="Critical">
              <span class="severity-tag severity-critical">严重</span>
            </el-checkbox>
            <el-checkbox value="Important">
              <span class="severity-tag severity-important">重要</span>
            </el-checkbox>
            <el-checkbox value="Moderate">
              <span class="severity-tag severity-moderate">中等</span>
            </el-checkbox>
            <el-checkbox value="Low">
              <span class="severity-tag severity-low">低级</span>
            </el-checkbox>
          </el-checkbox-group>

          <!-- 状态筛选 -->
          <span class="filter-label">状态：</span>
          <el-select v-model="ignoreFilter" style="width: 100px;" @change="handleFilter">
            <el-option label="全部" value="0,1" />
            <el-option label="白名单" value="1" />
            <el-option label="非白名单" value="0" />
          </el-select>
        </div>

        <div class="filter-right">
          <el-input
            v-model="filterText"
            placeholder="搜索补丁编号、概要、CVE..."
            style="width: 280px"
            clearable
            @input="handleFilter"
          >
            <template #prefix>
              <i class="fa fa-search" />
            </template>
          </el-input>
          <el-button @click="handleRefresh">
            <i class="fa fa-sync" />
          </el-button>
        </div>
      </div>

      <!-- 补丁列表表格 -->
      <div class="table-section">
        <el-table
          ref="tableRef"
          v-loading="loading"
          :data="tableData"
          style="width: 100%"
          size="small"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="50" />
          <el-table-column prop="patch_id" label="补丁编号" min-width="140">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="handleViewDetail(row)">
                {{ row.patch_id }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="概要" min-width="250" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="wrap-text">{{ row.title }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="severity" label="严重级别" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getSeverityStyle(row.severity)" size="small">
                {{ row.severity }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="publish_date" label="发布时间" width="120" sortable>
            <template #default="{ row }">
              {{ formatDate(row.publish_date) }}
            </template>
          </el-table-column>
          <el-table-column prop="related_vuls" label="关联CVE" min-width="180">
            <template #default="{ row }">
              <div class="cve-tags" v-if="row.related_vuls">
                <a
                  v-for="(cve, idx) in parseCVEs(row.related_vuls).slice(0, 3)"
                  :key="idx"
                  :href="`https://access.redhat.com/security/cve/${cve}`"
                  target="_blank"
                  class="cve-link"
                >
                  {{ cve }}
                </a>
                <span v-if="parseCVEs(row.related_vuls).length > 3" class="cve-more">
                  +{{ parseCVEs(row.related_vuls).length - 3 }}
                </span>
              </div>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="vendor" label="厂商" width="100" />
          <el-table-column prop="is_ignore" label="Ignore" width="140" align="center">
            <template #default="{ row }">
              <el-button
                v-if="row.is_ignore === 1"
                type="success"
                size="small"
                @click="handleRemoveFromWhitelist(row)"
              >
                Yes
              </el-button>
              <el-button
                v-else
                type="info"
                size="small"
                @click="handleAddToWhitelist(row)"
              >
                No
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 批量操作按钮 - 选中时显示 -->
      <div class="batch-actions" v-if="selectedPatches.length > 0">
        <el-button
          type="primary"
          @click="handleBatchAddWhitelist"
        >
          <i class="fa fa-plus" /> 添加白名单
        </el-button>
        <el-button
          type="danger"
          @click="handleBatchRemoveWhitelist"
        >
          <i class="fa fa-minus" /> 移除白名单
        </el-button>
      </div>

      <!-- 分页 -->
      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 补丁详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="补丁详情"
      width="700px"
      destroy-on-close
    >
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
            <span class="patch-detail-value">{{ patchDetail.severity }}</span>
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
                  <a
                    :href="`https://access.redhat.com/security/cve/${cve}`"
                    target="_blank"
                  >{{ cve }}</a>
                </span>
              </template>
              <span v-else class="text-muted">-</span>
            </div>
          </div>
        </template>
      </div>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { patchLibraryApi } from '../api'
import { runJob } from '@/modules/automation/api/command'

// 常量定义
const CHECK_PATCH_UPDATE_JOB_ID = '0QdW7u'  // 检查补丁更新作业ID
const ADD_WHITELIST_JOB_ID = 'sosZAJ'        // 添加白名单作业ID
const REMOVE_WHITELIST_JOB_ID = 'an2cRO'     // 移除白名单作业ID

// 加载状态
const loading = ref(false)
const tableRef = ref(null)

// 厂商统计数据
const vendorStats = ref([])

// 筛选条件
const filterText = ref('')
const severityFilter = ref(['Critical'])  // 默认选中 Critical
const ignoreFilter = ref('0,1')           // 默认全部
const currentVendor = ref('redhat')       // 默认 redhat

// 表格数据
const tableData = ref([])
const selectedPatches = ref([])

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 详情对话框
const detailDialogVisible = ref(false)
const detailLoading = ref(false)
const patchDetail = ref(null)

// 获取厂商样式类
function getVendorClass(vendor) {
  const classMap = {
    centos: 'vendor-centos',
    suse: 'vendor-suse',
    redhat: 'vendor-redhat',
    ubuntu: 'vendor-ubuntu',
    kylinos: 'vendor-kylinos',
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
  return `fab fa-${v}`
}

// 获取严重程度样式
function getSeverityStyle(severity) {
  const styleMap = {
    Critical: 'danger',
    Important: 'warning',
    Moderate: '',
    Low: 'info'
  }
  return styleMap[severity] || ''
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

// 加载厂商统计数据
async function loadVendorStats() {
  try {
    const response = await patchLibraryApi.getVendorStats()
    // 源系统返回格式: { total: number, records: [] }
    vendorStats.value = response?.records || response?.data?.records || []
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
      is_ignore: ignoreFilter.value
    }
    const response = await patchLibraryApi.getPatchList(params)
    // 源系统返回格式: { total: number, records: [] }
    tableData.value = response?.records || response?.data?.records || []
    pagination.total = response?.total || response?.data?.total || 0
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

// 刷新
function handleRefresh() {
  loadData()
  loadVendorStats()
}

// 分页变化
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
    await ElMessageBox.confirm(
      '执行导入最近补丁库将花费几分钟时间不等，点确定开始导入',
      '确认',
      { type: 'info' }
    )

    await runJob(CHECK_PATCH_UPDATE_JOB_ID, { params: {} })
    ElMessage.success('补丁库更新任务已提交')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Check patch update failed:', error)
      ElMessage.error('操作失败')
    }
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
    await runJob(ADD_WHITELIST_JOB_ID, {
      params: {
        patchIdList: [row.patch_id]
      }
    })
    ElMessage.success('已添加到白名单')
    loadData()
  } catch (error) {
    console.error('Add to whitelist failed:', error)
    ElMessage.error('操作失败')
  }
}

// 从白名单移除
async function handleRemoveFromWhitelist(row) {
  try {
    await runJob(REMOVE_WHITELIST_JOB_ID, {
      params: {
        patchIdList: [row.patch_id]
      }
    })
    ElMessage.success('已从白名单移除')
    loadData()
  } catch (error) {
    console.error('Remove from whitelist failed:', error)
    ElMessage.error('操作失败')
  }
}

// 批量添加白名单
async function handleBatchAddWhitelist() {
  if (selectedPatches.value.length === 0) return

  try {
    await ElMessageBox.confirm(
      '确认要加入白名单！',
      '确认',
      { type: 'info' }
    )

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
    await ElMessageBox.confirm(
      '确认要移除白名单！',
      '确认',
      { type: 'warning' }
    )

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
.patch-library {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

// 页面头部
.page-header {
  padding: 12px 24px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-title {
    font-size: 16px;
    font-weight: 500;
    color: #333;
  }

  .header-actions {
    :deep(.el-button) {
      color: #0d6efd;
    }
  }
}

.page-content {
  flex: 1;
  padding: 16px 24px;
  overflow-y: auto;
}

// 厂商KPI卡片区域 - 一行3个（根据截图）
.vendor-kpi-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.vendor-kpi-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 20px;
  border-radius: 6px;
  min-height: 90px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #fff;

  &:hover {
    opacity: 0.9;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .kpi-left {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
  }

  .kpi-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }

  .kpi-vendor {
    font-size: 14px;
    font-weight: 600;
  }

  .kpi-date {
    font-size: 12px;
    opacity: 0.85;
  }

  .kpi-value {
    font-size: 36px;
    font-weight: 700;
    line-height: 1;
  }

  .kpi-icon {
    font-size: 48px;
    opacity: 0.3;
    align-self: center;
  }
}

// 厂商颜色
.vendor-suse {
  background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
}

.vendor-redhat {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
}

.vendor-uniontech {
  background: linear-gradient(135deg, #6c757d 0%, #545b62 100%);
}

.vendor-kylinos {
  background: linear-gradient(135deg, #6c757d 0%, #545b62 100%);
}

.vendor-ubuntu {
  background: linear-gradient(135deg, #e95420 0%, #c7411b 100%);
}

.vendor-centos {
  background: linear-gradient(135deg, #7030a0 0%, #5a2580 100%);
}

.vendor-anolis {
  background: linear-gradient(135deg, #5a6268 0%, #495057 100%);
}

.vendor-default {
  background: linear-gradient(135deg, #6c757d 0%, #545b62 100%);
}

// 筛选条件栏
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 8px 0;
  flex-wrap: wrap;
  gap: 12px;

  .filter-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .filter-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .filter-label {
    font-size: 14px;
    color: #606266;
    margin-left: 16px;
  }
}

// 严重程度标签
.severity-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
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

// 表格区域
.table-section {
  margin-bottom: 16px;

  .wrap-text {
    word-break: break-word;
    white-space: normal;
    line-height: 1.4;
  }
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
    display: inline-block;
    padding: 2px 8px;
    background: #e9ecef;
    color: #6c757d;
    border-radius: 4px;
    font-size: 12px;
  }
}

// 分页栏
.pagination-bar {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #e9ecef;
}

// 批量操作按钮
.batch-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
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
