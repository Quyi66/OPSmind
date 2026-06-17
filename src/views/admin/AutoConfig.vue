<template>
  <div class="auto-config">
    <!-- 顶部标题与操作 -->
    <div class="ac-header">
      <h2 class="ac-title">连接凭据</h2>
      <div class="ac-actions">
        <el-button type="primary" plain size="small" @click="openBatchDialog">
          <el-icon style="margin-right:6px"><EditPen /></el-icon>
          批量设置纳管机器账户
        </el-button>
      </div>
    </div>

    <!-- 标签页 -->
    <el-tabs v-model="activeTab" class="ac-tabs">
      <el-tab-pane name="info">
        <template #label>
          <span class="tab-label">
            <el-icon class="tab-icon"><InfoFilled /></el-icon>
            连接凭据信息
          </span>
        </template>
      </el-tab-pane>
      <el-tab-pane name="ansible" disabled>
        <template #label>
          <span class="tab-label">
            <el-icon class="tab-icon"><Connection /></el-icon>
            Ansible连接配置
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>

    <!-- 提示信息 -->
    <el-alert
      type="success"
      :closable="false"
      class="ac-alert"
      show-icon
      description="注意：连接凭据是针对每一个自动化资产的默认连接配置进行修改，使用场景如下：执行用户/密码、登录用户/密码、执行引擎节点配置等"
    />

    <!-- 工具栏：筛选 + 搜索 -->
    <div class="ac-toolbar">
      <div class="left">
        <el-select v-model="filterOS" size="small" style="width: 180px" @change="applySearch">
          <el-option :label="'全部'" value="all" />
          <el-option
            v-for="opt in osOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>
      <div class="right">
        <el-input
          v-model="keyword"
          size="small"
          placeholder=""
          style="width: 260px"
          clearable
          @keyup.enter.native="applySearch"
        >
          <template #suffix>
            <el-icon class="search-icon"><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 数据表 -->
    <el-table
      :data="pagedRows"
      size="small"
      border
      class="ac-table"
      header-cell-class-name="ac-th"
    >
      <el-table-column prop="assetCode" label="资产代码" width="120" />
      <el-table-column prop="ip" label="IP" width="160" />
      <el-table-column prop="name" label="连接凭据名称" min-width="160" />
      <el-table-column prop="instanceGroup" label="执行引擎节点(instance group)" min-width="220" />
      <el-table-column prop="aapGroup" label="AAP instance group" min-width="180" />
      <el-table-column prop="loginUser" label="登录用户" width="120" />
      <el-table-column prop="execUser" label="执行用户" width="120" />
      <el-table-column prop="updatedAt" label="更新时间" width="200" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" :disabled="true">
            <el-icon><EditPen /></el-icon>
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页区（简化为每页条数 + 统计） -->
    <div class="ac-pager">
      <el-select v-model="pageSize" size="small" style="width: 80px" @change="refreshData">
        <el-option v-for="s in pageSizeOptions" :key="s" :label="s" :value="s" />
      </el-select>
      <span class="pager-info">{{ pageFrom }} - {{ pageTo }} / {{ filteredRows.length }}</span>
    </div>

    <!-- 批量修改对话框 -->
    <el-dialog v-model="batchVisible" title="批量修改纳管设备" width="520px">
      <div class="batch-tip">
        请选择 Excel 模版文件（.xlsx / .xls），上传后将按模版批量更新纳管设备的登录/执行密码。
      </div>
      <el-upload
        drag
        action="#"
        :auto-upload="false"
        :limit="1"
        :on-change="onFilePicked"
        :on-remove="onFileRemoved"
        :file-list="fileList"
        accept=".xlsx,.xls"
        class="batch-upload"
      >
        <el-icon class="el-icon--upload"><Connection /></el-icon>
        <div class="el-upload__text">将文件拖到此处，或 <em>点击上传</em></div>
        <template #tip>
          <div class="el-upload__tip">仅支持 .xlsx / .xls，最多 1 个文件</div>
        </template>
      </el-upload>
      <el-progress v-if="uploadPercent > 0" :percentage="uploadPercent" :stroke-width="6" style="margin-top:8px"/>

      <template #footer>
        <el-button @click="batchVisible = false" :disabled="uploading">取消</el-button>
        <el-button type="primary" @click="submitBatch" :loading="uploading" :disabled="!selectedFile">提交</el-button>
      </template>
    </el-dialog>

    <!-- 批量结果对话框 -->
    <el-dialog v-model="batchResultVisible" title="批量处理结果" width="680px">
      <div class="result-summary">
        <el-tag type="info">总计: {{ batchResult?.total || 0 }}</el-tag>
        <el-tag type="success" style="margin-left:8px">成功: {{ batchResult?.successCount || 0 }}</el-tag>
        <el-tag :type="(batchResult?.failCount||0) > 0 ? 'danger' : 'success'" style="margin-left:8px">失败: {{ batchResult?.failCount || 0 }}</el-tag>
      </div>

      <div v-if="(batchResult?.successList?.length||0) > 0" class="result-block">
        <div class="block-title">成功列表</div>
        <el-table :data="batchResult?.successList || []" size="small" border>
          <el-table-column prop="rowNum" label="#" width="60" />
          <el-table-column prop="hostIp" label="IP" width="160" />
          <el-table-column prop="ciId" label="CI ID" min-width="180" />
          <el-table-column prop="message" label="说明" min-width="220" />
        </el-table>
      </div>

      <div v-if="(batchResult?.failList?.length||0) > 0" class="result-block">
        <div class="block-title">失败列表</div>
        <el-table :data="batchResult?.failList || []" size="small" border>
          <el-table-column prop="rowNum" label="#" width="60" />
          <el-table-column prop="hostIp" label="IP" width="160" />
          <el-table-column prop="ciId" label="CI ID" min-width="180" />
          <el-table-column prop="message" label="错误" min-width="220" />
        </el-table>
      </div>

      <template #footer>
        <el-button type="primary" @click="batchResultVisible=false">知道了</el-button>
      </template>
    </el-dialog>
  </div>

</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, EditPen, Search, InfoFilled, Connection } from '@element-plus/icons-vue'
import { apiService } from '@/core/api'
import { batchUpdateDevicePasswords } from '@/services/acm/automation.service'
import type { BatchUpdateResult } from '@/types/acm'

// Tabs
const activeTab = ref('info')

// Filters
const filterOS = ref('all')
const osOptions = ref<{ label: string; value: string }[]>([])
const keyword = ref('')

// Pagination
const pageSizeOptions = [10, 20, 50, 100]
const pageSize = ref(100)
const currentPage = ref(1)

// Data rows
const rows = ref<any[]>([])
const loading = ref(false)

// Batch update dialog state
const batchVisible = ref(false)
const selectedFile = ref<File | null>(null)
const fileList = ref<any[]>([])
const uploading = ref(false)
const uploadPercent = ref(0)

// Batch result display
const batchResultVisible = ref(false)
const batchResult = ref<BatchUpdateResult | null>(null)

const filteredRows = computed(() => {
  let data = rows.value
  if (filterOS.value !== 'all') {
    data = data.filter(r => r.assetCode === filterOS.value)
  }
  if (keyword.value && keyword.value.trim()) {
    const k = keyword.value.trim().toLowerCase()
    data = data.filter(r =>
      r.assetCode.toLowerCase().includes(k) ||
      r.ip.toLowerCase().includes(k) ||
      (r.name || '').toLowerCase().includes(k)
    )
  }
  return data
})

const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredRows.value.slice(start, end)
})

const pageFrom = computed(() => {
  if (!filteredRows.value.length) return 0
  return (currentPage.value - 1) * pageSize.value + 1
})
const pageTo = computed(() => Math.min(filteredRows.value.length, currentPage.value * pageSize.value))

function editRow(row) {
  ElMessage.info(`编辑：${row.ip}`)
}

function applySearch() {
  currentPage.value = 1
  fetchAutomationConfigs()
}

function openBatchDialog() {
  batchVisible.value = true
}

function onFilePicked(file: any, files: any[]) {
  // Element Plus passes UploadFile; original file is at file.raw
  const f: File | null = file?.raw || null
  selectedFile.value = f
  fileList.value = files
}

function onFileRemoved() {
  selectedFile.value = null
  fileList.value = []
}

async function submitBatch() {
  if (!selectedFile.value) return
  uploading.value = true
  uploadPercent.value = 0
  try {
    const result = await batchUpdateDevicePasswords(selectedFile.value, (p) => (uploadPercent.value = p))
    // 展示结果
    batchResult.value = result || { total: 0, successCount: 0, failCount: 0, successList: [], failList: [] }
    batchResultVisible.value = true
    // 关闭上传对话框
    batchVisible.value = false
    selectedFile.value = null
    fileList.value = []
    // 刷新列表
    await fetchAutomationConfigs()
  } catch (e: any) {
    ElMessage.error(e?.message || '上传失败')
  } finally {
    uploading.value = false
  }
}

async function fetchResourceTypes() {
  try {
    const res = await apiService.get('/acm/api/acm/dashboard/resource-type')
    const payload = res?.data?.data ?? res?.data ?? []
    const list = Array.isArray(payload) ? payload : (payload?.records || [])
    osOptions.value = list.map((i: any) => ({ label: i.title || i.code, value: i.code }))
  } catch (e) {
    // 静默失败，保留默认选项
  }
}

async function fetchAutomationConfigs() {
  loading.value = true
  try {
    const res = await apiService.get('/acm/api/acm/dashboard/automation', {
      params: {
        cit: 'sjxy_all',
        param: keyword.value || 'x',
        size: pageSize.value,
        page: currentPage.value
      }
    })
    const payload = res?.data?.data ?? res?.data ?? []
    const list = Array.isArray(payload) ? payload : (payload?.records || [])
    rows.value = list.map((r: any) => ({
      id: r.id,
      cid: r.cid,
      assetCode: r.ci_type || '',
      ip: r.hostKey || '',
      name: r.ansibleConfigName || '',
      instanceGroup: r.instanceGroup || '',
      aapGroup: r.aapInstanceGroup || '',
      loginUser: r.loginUser || '',
      execUser: r.runUser || '',
      updatedAt: r.updated_at || r.updatedAt || ''
    }))
  } catch (e) {
    ElMessage.error('获取连接凭据失败')
  } finally {
    loading.value = false
  }
}

function refreshData() {
  currentPage.value = 1
  fetchAutomationConfigs()
}

onMounted(async () => {
  await fetchResourceTypes()
  await fetchAutomationConfigs()
})
</script>

<style scoped>
.auto-config {
  min-height: 100%;
}
.ac-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0 0 0;
}
.ac-title { font-size: 18px; font-weight: 600; margin: 0; }
.ac-actions { display: flex; gap: 8px; }

.ac-tabs { padding: 0; }
.tab-label { display: inline-flex; align-items: center; gap: 6px; }
.tab-icon { color: #409eff; }

.ac-alert { margin: 8px 0 12px; }

.ac-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0 8px;
}
.ac-toolbar .right { display: flex; align-items: center; gap: 8px; }

.ac-table {
  margin: 0;
}
.ac-th { background: var(--el-bg-color-page); }

/* 更轻的链接编辑按钮交互态 */
.ac-table :deep(.el-button.is-link) {
  color: #2563eb;
  padding: 4px 6px;
  border-radius: 6px;
}
.ac-table :deep(.el-button.is-link:hover) {
  background: #eff6ff;
}

.ac-pager {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0 0;
}
.pager-info { color: #6b7280; font-size: 13px; }
</style>
