<template>
  <div class="ops-page-layout">
    <!-- 详情穿透视图 -->
    <div v-if="currentView === 'detail'" class="detail-workbench">
      <!-- 面包屑与返回 -->
      <div class="ops-section mb-3">
        <div class="detail-workbench-header">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>
              <el-link type="primary" :underline="false" @click="backToList">CVE文件比对导入</el-link>
            </el-breadcrumb-item>
            <el-breadcrumb-item>比对结果分析</el-breadcrumb-item>
          </el-breadcrumb>
          <el-button size="small" @click="backToList">
            <i class="fa fa-chevron-left me-1" />
            返回列表
          </el-button>
        </div>
      </div>

      <!-- 批次元数据卡片 -->
      <div class="ops-section mb-3" v-if="activeBatch">
        <div class="batch-meta-card">
          <div class="batch-meta-item">
            <span class="meta-label">批次编号：</span>
            <strong class="meta-value">{{ activeBatch.batchNo }}</strong>
          </div>
          <div class="batch-meta-item">
            <span class="meta-label">文件名称：</span>
            <span class="meta-value text-truncate" :title="activeBatch.originalName">
              {{ activeBatch.originalName }}
            </span>
          </div>
          <div class="batch-meta-item">
            <span class="meta-label">文件来源：</span>
            <span class="meta-value">{{ activeBatch.bugSource || '未识别' }}</span>
          </div>
          <div class="batch-meta-item">
            <span class="meta-label">比对汇总：</span>
            <span class="meta-value">
              导入 CVE 数 <strong>{{ activeBatch.totalInput }}</strong>，
              成功匹配 <strong>{{ activeBatch.matchedCount }}</strong>，
              波及主机 <strong>{{ activeBatch.affectedHosts }}</strong> 台
            </span>
          </div>
          <div class="batch-meta-actions">
            <el-button type="primary" size="small" @click="downloadFeedback(activeBatch)">
              <i class="fa fa-download me-1" />
              导出漏洞排查反馈表
            </el-button>
          </div>
        </div>
      </div>

      <!-- 比对穿透 Tab -->
      <div class="ops-section flex-detail-container">
        <el-tabs v-model="activeDetailTab" class="detail-tabs">
          <el-tab-pane label="漏洞整改比对列表 (CVE View)" name="cve">
            <template #label>
              <i class="fas fa-bug me-1"></i>
              漏洞整改比对
            </template>
            <div class="ops-table-wrapper" v-loading="detailLoading" style="height: 100%">
              <el-table :data="cveItems" height="100%" style="width: 100%">
                <el-table-column prop="rawRowNo" label="Excel行号" width="90" align="center" />
                <el-table-column prop="cveId" label="CVE 编号" width="160">
                  <template #default="{ row }">
                    <el-tag size="small" effect="plain" type="danger">{{ row.cveId }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="bugName" label="漏洞名称" min-width="240" show-overflow-tooltip />
                <el-table-column prop="category" label="分类" width="120" show-overflow-tooltip />
                <el-table-column prop="threatLevel" label="威胁等级(原文)" width="180" show-overflow-tooltip>
                  <template #default="{ row }">
                    <span class="text-muted">{{ row.threatLevel || '-' }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="severity" label="等级(规范化)" width="110" align="center">
                  <template #default="{ row }">
                    <el-tag
                      v-if="row.severity"
                      size="small"
                      effect="light"
                      :type="getSeverityTagType(row.severity)"
                    >
                      {{ row.severity }}
                    </el-tag>
                    <span v-else class="text-muted">-</span>
                  </template>
                </el-table-column>
                <el-table-column prop="affectedHosts" label="影响主机" width="90" align="center">
                  <template #default="{ row }">
                    <span :class="{ 'text-danger fw-bold': row.affectedHosts > 0 }">
                      {{ row.affectedHosts }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column prop="fixedHosts" label="已修复主机" width="100" align="center">
                  <template #default="{ row }">
                    <span :class="{ 'text-success': row.fixedHosts > 0 }">{{ row.fixedHosts }}</span>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>

          <el-tab-pane label="涉及主机清单 (Affected Hosts View)" name="hosts">
            <template #label>
              <i class="fas fa-desktop me-1"></i>
              涉及主机清单
            </template>
            <div class="ops-table-wrapper" v-loading="hostsLoading" style="height: 100%">
              <el-table :data="affectedHosts" height="100%" style="width: 100%">
                <el-table-column prop="hostKey" label="主机 IP" width="150">
                  <template #default="{ row }">
                    <el-link type="primary" :underline="false" @click="goToHostDetail(row)">
                      {{ row.hostKey }}
                    </el-link>
                  </template>
                </el-table-column>
                <el-table-column prop="osDistro" label="操作系统" width="140">
                  <template #default="{ row }">
                    {{ row.osDistro }} {{ row.osVersion }}
                  </template>
                </el-table-column>
                <el-table-column prop="cveCount" label="本批次漏洞数" width="120" align="center">
                  <template #default="{ row }">
                    <el-tag type="danger" size="small" round>{{ row.cveCount }} 个</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="urgencies" label="漏洞紧急程度" min-width="200">
                  <template #default="{ row }">
                    <template v-if="row.urgencies && row.urgencies.length > 0">
                      <el-tag
                        v-for="urg in row.urgencies"
                        :key="urg"
                        size="small"
                        round
                        effect="dark"
                        :type="getUrgencyTagType(urg)"
                        style="margin-right: 4px"
                      >
                        {{ urg }}
                      </el-tag>
                    </template>
                    <span v-else class="text-muted">未重算评估</span>
                  </template>
                </el-table-column>
                <el-table-column prop="rebootNeeded" label="需要重启" width="100" align="center">
                  <template #default="{ row }">
                    <el-tag :type="row.rebootNeeded ? 'danger' : 'success'" size="small" round>
                      {{ row.rebootNeeded ? '是' : '否' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="100" align="center">
                  <template #default="{ row }">
                    <el-button link type="primary" @click="goToHostDetail(row)">管理</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- 列表主视图 -->
    <template v-else>
      <!-- 操作栏 -->
      <div class="ops-section mb-3">
        <div class="toolbar-wrapper">
          <h3 class="toolbar-title">CVE文件比对导入批次</h3>
          <div class="toolbar-actions">
            <el-button type="primary" @click="openUploadDialog">
              <el-icon><Upload /></el-icon>
              导入漏洞排查模板 (.xlsx)
            </el-button>
          </div>
        </div>
      </div>

      <!-- 批次列表 -->
      <div class="ops-section flex-table-container">
        <div class="ops-table-wrapper" v-loading="loading">
          <el-table :data="batches" height="100%" style="width: 100%">
            <el-table-column prop="batchNo" label="批次编号" width="160" />
            <el-table-column prop="originalName" label="漏洞模板文件名" min-width="220" show-overflow-tooltip />
            <el-table-column prop="bugSource" label="漏洞来源" width="160" show-overflow-tooltip />
            <el-table-column prop="projectBatch" label="项目批次" width="180" show-overflow-tooltip />
            <el-table-column prop="totalInput" label="导入CVE数" width="100" align="center" />
            <el-table-column prop="matchedCount" label="成功匹配" width="90" align="center" />
            <el-table-column prop="affectedHosts" label="影响主机" width="90" align="center" />
            <el-table-column prop="status" label="批次状态" width="110" align="center">
              <template #default="{ row }">
                <el-tag :type="getStatusTagType(row.status)" size="small" round>
                  {{ getStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="导入时间" width="170">
              <template #default="{ row }">
                <span class="text-muted">{{ formatDateTime(row.createdAt) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="280" fixed="right">
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  :disabled="row.status === 'parsed'"
                  @click="viewDetail(row)"
                >
                  比对详情
                </el-button>
                <el-button
                  link
                  type="primary"
                  :loading="comparingId === row.id"
                  @click="handleCompare(row)"
                >
                  开始比对
                </el-button>
                <el-button
                  link
                  type="success"
                  :disabled="row.status === 'parsed'"
                  @click="downloadFeedback(row)"
                >
                  导出反馈表
                </el-button>
                <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 分页 -->
        <div class="ops-pagination-wrapper">
          <el-pagination
            v-model:current-page="displayPage"
            v-model:page-size="pagination.size"
            :page-sizes="[10, 20, 50]"
            :total="pagination.totalElements"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </template>

    <!-- 导入上传对话框 -->
    <el-dialog v-model="uploadDialogVisible" title="导入威胁排查文件" width="520px" destroy-on-close>
      <div class="upload-area">
        <el-upload
          drag
          action=""
          :auto-upload="false"
          :on-change="handleFileChange"
          accept=".xlsx,.xls"
          :limit="1"
          :file-list="fileList"
        >
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
          <template #tip>
            <div class="el-upload__tip text-center mt-2">
              仅支持导入银行下发的 .xlsx / .xls 格式表格，且文件大小不超过 10 MB。
            </div>
          </template>
        </el-upload>
      </div>
      <template #footer>
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="uploading"
          :disabled="fileList.length === 0"
          @click="submitUpload"
        >
          确认上传并触发比对
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Upload, UploadFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { cveImportApi } from '../api'

const router = useRouter()
const route = useRoute()

// 视图切换
const currentView = ref('list') // list | detail
const activeBatch = ref(null)

// 列表数据
const loading = ref(false)
const batches = ref([])
const comparingId = ref(null)

// 分页信息
const pagination = reactive({
  page: 0,
  size: 20,
  totalElements: 0
})

const displayPage = computed({
  get: () => pagination.page + 1,
  set: val => {
    pagination.page = val - 1
  }
})

// 详情 Tab 数据
const activeDetailTab = ref('cve')
const detailLoading = ref(false)
const cveItems = ref([])
const hostsLoading = ref(false)
const affectedHosts = ref([])

// 文件上传
const uploadDialogVisible = ref(false)
const uploading = ref(false)
const fileList = ref([])

// 加载批次列表
async function loadBatches() {
  loading.value = true
  try {
    const res = await cveImportApi.getBatches({
      page: pagination.page,
      size: pagination.size
    })
    const result = res?.data || res
    batches.value = result.content || []
    pagination.totalElements = result.totalElements || 0
  } catch (error) {
    console.error('加载批次列表失败:', error)
    ElMessage.error('加载批次历史记录失败')
  } finally {
    loading.value = false
  }
}

// 格式化日期
function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 分页处理
function handleSizeChange(size) {
  pagination.size = size
  pagination.page = 0
  loadBatches()
}

function handlePageChange(page) {
  pagination.page = page - 1
  loadBatches()
}

// 标签与状态映射
function getStatusTagType(status) {
  if (status === 'parsed') return 'warning'
  if (status === 'compared') return 'primary'
  if (status === 'exported') return 'success'
  return 'info'
}

function getStatusLabel(status) {
  if (status === 'parsed') return '已解析'
  if (status === 'compared') return '已比对'
  if (status === 'exported') return '已导出'
  return status
}

function getSeverityTagType(severity) {
  if (severity === '特高危' || severity === '严重' || severity === 'Critical') return 'danger'
  if (severity === '高危' || severity === '重要' || severity === 'Important') return 'warning'
  if (severity === '中危' || severity === '中等' || severity === 'Moderate') return 'primary'
  return 'info'
}

function getUrgencyTagType(urgency) {
  if (urgency === '特急') return 'danger'
  if (urgency === '紧急') return 'warning'
  if (urgency === '普通') return 'primary'
  return 'info'
}

// 触发比对
async function handleCompare(row) {
  comparingId.value = row.id
  try {
    await cveImportApi.compareBatch(row.id)
    ElMessage.success(`批次 [${row.batchNo}] CVE 比对计算完成！`)
    loadBatches()
  } catch (error) {
    console.error('触发比对失败:', error)
    ElMessage.error('比对分析触发失败，请稍后重试')
  } finally {
    comparingId.value = null
  }
}

// 查看详情
async function viewDetail(row) {
  activeBatch.value = row
  currentView.value = 'detail'
  activeDetailTab.value = 'cve'
  loadBatchCves(row.id)
  loadBatchHosts(row.id)
}

// 加载比对详情 (CVE View)
async function loadBatchCves(batchId) {
  detailLoading.value = true
  try {
    const res = await cveImportApi.getBatchDetail(batchId)
    cveItems.value = res?.items || res?.data?.items || []
  } catch (error) {
    console.error('加载CVE详情失败:', error)
    ElMessage.error('获取CVE比对分析记录失败')
  } finally {
    detailLoading.value = false
  }
}

// 加载比对详情 (Hosts View)
async function loadBatchHosts(batchId) {
  hostsLoading.value = true
  try {
    const res = await cveImportApi.getAffectedHosts(batchId)
    affectedHosts.value = res?.hosts || res?.data?.hosts || []
  } catch (error) {
    console.error('加载涉及主机失败:', error)
    ElMessage.error('获取涉及主机清单失败')
  } finally {
    hostsLoading.value = false
  }
}

// 返回列表
function backToList() {
  currentView.value = 'list'
  activeBatch.value = null
  loadBatches()
}

// 导出漏洞排查反馈表
async function downloadFeedback(row) {
  try {
    ElMessage.info('正在生成反馈表，请稍候...')
    const res = await cveImportApi.exportReport(row.id)
    const blob = new Blob([res], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `漏洞排查结果反馈表_${row.batchNo}.xlsx`
    a.click()
    URL.revokeObjectURL(a.href)
    ElMessage.success('反馈表生成并下载成功！')
    
    // 如果是列表状态，刷新一下，因为导出后状态会变为 exported
    if (currentView.value === 'list') {
      loadBatches()
    } else {
      // 详情状态，同步更新本地状态
      if (activeBatch.value && activeBatch.value.id === row.id) {
        activeBatch.value.status = 'exported'
      }
    }
  } catch (error) {
    console.error('导出反馈表失败:', error)
    ElMessage.error('反馈表格导出失败')
  }
}

// 删除批次
function handleDelete(row) {
  ElMessageBox.confirm(
    `确定要彻底删除导入批次 [${row.batchNo}] (${row.originalName}) 吗？此操作将同时清除其所有比对分析明细且不可恢复。`,
    '提示',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await cveImportApi.deleteBatch(row.id)
      ElMessage.success('批次删除成功')
      loadBatches()
    } catch (error) {
      console.error('删除批次失败:', error)
      ElMessage.error('删除批次失败')
    }
  })
}

// 打开上传弹框
function openUploadDialog() {
  fileList.value = []
  uploadDialogVisible.value = true
}

// 处理文件改变
function handleFileChange(uploadFile, uploadFiles) {
  fileList.value = uploadFiles.slice(-1) // 仅保留单个文件
}

// 提交上传并触发比对
async function submitUpload() {
  if (fileList.value.length === 0) {
    ElMessage.warning('请先选择需要上传的漏洞模板 Excel 文件')
    return
  }

  const rawFile = fileList.value[0].raw
  if (rawFile.size > 10 * 1024 * 1024) {
    ElMessage.warning('文件大小不能超过 10 MB')
    return
  }

  uploading.value = true
  try {
    // 1. 上传文件得到解析结果
    const uploadRes = await cveImportApi.uploadExcel(rawFile)
    const batch = uploadRes?.data || uploadRes
    ElMessage.success('文件上传解析成功！正在后台为您自动执行 CVE 比对，请稍候...')
    
    uploadDialogVisible.value = false

    // 2. 自动触发比对
    if (batch && batch.id) {
      await cveImportApi.compareBatch(batch.id)
      ElMessage.success(`比对计算完成！已生成漏洞排查批次 [${batch.batchNo}]`)
    }
    
    // 3. 刷新列表
    loadBatches()
  } catch (error) {
    console.error('上传比对失败:', error)
    ElMessage.error(error?.response?.data?.error || '漏洞文件比对导入失败')
  } finally {
    uploading.value = false
  }
}

// 跳转到主机详情
function goToHostDetail(row) {
  router.push({
    name: 'patches-hostDetail',
    query: {
      hostId: row.hostId,
      hostKey: row.hostKey,
      tab: 'vulnerabilities',
      fromLabel: 'CVE比对详情',
      fromRouteName: 'patches-cveImport'
    }
  })
}

onMounted(() => {
  loadBatches()
})
</script>

<style scoped lang="scss">
.toolbar-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--el-text-color-primary);
}

.detail-workbench-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.batch-meta-card {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 24px;
  font-size: 14px;
}

.batch-meta-item {
  display: flex;
  align-items: center;

  .meta-label {
    color: var(--el-text-color-regular);
  }

  .meta-value {
    color: var(--el-text-color-primary);
    
    strong {
      color: var(--el-color-primary);
    }
  }

  .text-truncate {
    max-width: 250px;
    display: inline-block;
  }
}

.batch-meta-actions {
  margin-left: auto;
}

.flex-table-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 220px);
  min-height: 400px;
}

.flex-detail-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 280px);
  min-height: 400px;

  .detail-tabs {
    display: flex;
    flex-direction: column;
    height: 100%;
    
    :deep(.el-tabs__content) {
      flex: 1;
      min-height: 0;
      
      .el-tab-pane {
        height: 100%;
      }
    }
  }
}

.upload-area {
  padding: 10px 0;
  display: flex;
  justify-content: center;
  
  :deep(.el-upload-dragger) {
    width: 440px;
  }
}

.text-center {
  text-align: center;
}

.mt-2 {
  margin-top: 8px;
}
</style>
