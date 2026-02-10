<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :inline="true" size="small">
        <el-form-item label="更新分类">
          <el-select
            v-model="categoryFilter"
            multiple
            collapse-tags
            collapse-tags-tooltip
            placeholder="请选择"
            style="width: 240px"
            clearable
            filterable
          >
            <el-option
              v-for="item in classificationOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filterText"
            placeholder="搜索 KB 编号 / 描述..."
            style="width: 240px"
            clearable
            @keyup.enter="handleFilter"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleFilter">
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
        :disabled="selectedKbNumbers.length === 0"
        @click="handleFixSelected"
      >
        修复选中漏洞
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
        :data="tableData"
        max-height="calc(100vh - 230px)"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="kb_number" label="KB编号" width="150">
          <template #default="{ row }">
            <el-link
              v-if="row.kb_number"
              type="primary"
              :underline="false"
              @click="openKb(row.kb_number)"
            >
              {{ row.kb_number }}
            </el-link>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="category_name" label="类型" min-width="140">
          <template #default="{ row }">
            <el-tag :type="getCategoryType(row.category_name)" size="small" effect="plain">
              {{ getCategoryLabel(row.category_name) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="描述" min-width="400" show-overflow-tooltip />
        <el-table-column prop="affect_machines" label="受影响主机" width="120">
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="handleViewAffectedMachines(row)">
              {{ row.affect_machines || 0 }}
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
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 批量修复选择主机对话框 -->
    <el-dialog v-model="fixSelectionVisible" title="修复选中漏洞" width="920px" destroy-on-close>
      <div v-loading="fixSelectionLoading" class="fix-selection">
        <div class="fix-selection__card">
          <div class="fix-selection__card-header">
            <i class="fa fa-briefcase-medical text-muted" />
            <span class="fix-selection__card-title">更新漏洞</span>
          </div>
          <div class="fix-selection__card-body">
            <div v-if="currentFixKbs.length" class="fix-selection__kb-list">
              <el-tag v-for="kb in currentFixKbs" :key="kb" type="info" effect="plain" size="small">
                {{ kb }}
              </el-tag>
            </div>
            <el-empty v-else description="暂无选中的漏洞" />
          </div>
        </div>

        <div class="fix-selection__card">
          <div class="fix-selection__card-header">
            <i class="fa fa-server text-muted" />
            <span class="fix-selection__card-title">更新主机</span>
            <div class="fix-selection__spacer" />
            <el-input
              v-model="fixSelectionFilter"
              placeholder="搜索主机..."
              size="small"
              style="width: 200px"
              clearable
            >
              <template #prefix>
                <i class="fa fa-search" />
              </template>
            </el-input>
          </div>
          <div class="fix-selection__card-body">
            <el-table
              ref="fixSelectionTableRef"
              :data="filteredFixSelection"
              size="small"
              max-height="420"
              @selection-change="handleFixSelectionChange"
            >
              <el-table-column type="selection" width="50" />
              <el-table-column prop="host_key" label="主机" min-width="140" />
              <el-table-column prop="os_distro" label="OS" min-width="250" show-overflow-tooltip />
              <el-table-column prop="os_version" label="OS版本" min-width="110" />
              <el-table-column prop="os_arch" label="OS架构" min-width="90" />
              <el-table-column prop="scan_date" label="扫描时间" min-width="130">
                <template #default="{ row }">
                  {{ formatDateShort(row.scan_date) }}
                </template>
              </el-table-column>
              <!-- <el-table-column prop="patch_status" label="状态" min-width="110">
                <template #default="{ row }">
                  <el-tag :type="getPatchStatusType(row.patch_status)" size="small">
                    {{ row.patch_status || '-' }}
                  </el-tag>
                </template>
              </el-table-column> -->
            </el-table>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="fixSelectionVisible = false">取消</el-button>
        <el-button
          type="primary"
          :disabled="fixSelectionSelectedIds.length === 0"
          @click="openFixConfirm"
        >
          开始修复
        </el-button>
      </template>
    </el-dialog>

    <!-- 修复确认对话框 -->
    <FixSelectedVulnsDialog
      v-model="fixDialogVisible"
      :ids="fixDialogIds"
      @submitted="handleFixSubmitted"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import { windowsUpdateApi } from '../api'
import FixSelectedVulnsDialog from './dialogs/FixSelectedVulnsDialog.vue'

// 加载状态
const loading = ref(false)
const tableRef = ref(null)

// 筛选
const filterText = ref('')
const categoryFilter = ref(['Critical Updates', 'Security Updates'])

const classificationOptions = [
  { label: '安全', value: 'Security Updates' },
  { label: '重要', value: 'Critical Updates' },
  { label: '更新汇总', value: 'Update Rollups' },
  { label: '应用程序', value: 'Application' },
  { label: '连接器', value: 'Connectors' },
  { label: '定义更新', value: 'Definition Updates' },
  { label: '开发工具包', value: 'Developer Kits' },
  { label: '功能包', value: 'Feature Packs' },
  { label: '说明性更新', value: 'Guidance' },
  { label: '服务包', value: 'Service Packs' },
  { label: '工具', value: 'Tools' },
  { label: '常规', value: 'Updates' },
  { label: '升级', value: 'Upgrades' }
]

function getCategoryLabel(val) {
  const item = classificationOptions.find(opt => opt.value === val)
  return item ? item.label : val
}

function getCategoryType(val) {
  // High Priority / Security
  if (['Security Updates', 'Critical Updates'].includes(val)) return 'danger'

  // Significant System Updates
  if (['Update Rollups', 'Service Packs', 'Upgrades', 'Feature Packs'].includes(val))
    return 'primary'

  // Components & Tools
  if (['Application', 'Connectors', 'Developer Kits', 'Tools'].includes(val)) return 'success'

  // Definitions (Warning color implies attention but not critical error)
  if (['Definition Updates'].includes(val)) return 'warning'

  // Others (Guidance, Updates)
  return 'info'
}

// 表格数据
const tableData = ref([])
const selectedRows = ref([])
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 计算选中的 KB 编号
const selectedKbNumbers = computed(() => {
  return selectedRows.value.map(row => row.kb_number).filter(Boolean)
})

// 已移除 affectedMachines 相关逻辑

// 批量修复
const fixSelectionVisible = ref(false)
const fixSelectionLoading = ref(false)
const fixSelectionList = ref([])
const fixSelectionFilter = ref('')
const fixSelectionTableRef = ref(null)
const fixSelectionSelectedIds = ref([])
const fixDialogVisible = ref(false)
const fixDialogIds = ref([])
const currentFixKbs = ref([]) // 当前正在修复的 KB 列表

// 补丁状态样式
function getPatchStatusType(status) {
  const map = {
    未修复: 'info',
    已修复: 'success',
    修复中: '',
    修复失败: 'warning'
  }
  return map[status] || 'info'
}

// 加载数据 - VAP2_PATCH_WIN_LIST
async function loadData() {
  loading.value = true
  try {
    const response = await windowsUpdateApi.getPatchWinList({
      page: pagination.page,
      size: pagination.pageSize,
      category_names: categoryFilter.value.join(','),
      filter: filterText.value
    })
    const records = response?.records || response?.data?.records || []
    tableData.value = records
    pagination.total = response?.total || response?.data?.total || records.length
  } catch (error) {
    console.error('Failed to load data:', error)
  } finally {
    loading.value = false
  }
}

function handleReset() {
  categoryFilter.value = ['Critical Updates', 'Security Updates']
  filterText.value = ''
  pagination.page = 1
  loadData()
}

function handleFilter() {
  pagination.page = 1
  loadData()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadData()
}

function handlePageChange(page) {
  pagination.page = page
  loadData()
}

function handleSelectionChange(selection) {
  selectedRows.value = selection
}

// 修复选中漏洞（或者指定漏洞）
async function openFixDialog(kbNumbers) {
  if (!kbNumbers || kbNumbers.length === 0) {
    ElMessage.warning('请选择要修复的漏洞')
    return
  }

  currentFixKbs.value = kbNumbers
  fixSelectionVisible.value = true
  fixSelectionLoading.value = true
  fixSelectionFilter.value = ''
  fixSelectionSelectedIds.value = []

  try {
    const response = await windowsUpdateApi.getAffectedMachinesByKbNumbers({
      kb_numbers: kbNumbers
    })
    fixSelectionList.value = response?.records || response?.data?.records || []
    if (!fixSelectionList.value.length) {
      ElMessage.info('所选漏洞暂无可修复的主机')
    }
  } catch (error) {
    console.error('Failed to load affected machines for fix:', error)
    ElMessage.error('加载受影响主机失败')
  } finally {
    fixSelectionLoading.value = false
  }
}

// 按钮点击事件处理
function handleFixSelected() {
  openFixDialog(selectedKbNumbers.value)
}

// 单个点击事件处理（查看受影响主机 -> 直接打开修复对话框）
function handleViewAffectedMachines(row) {
  openFixDialog([row.kb_number])
}

const filteredFixSelection = computed(() => {
  if (!fixSelectionFilter.value) return fixSelectionList.value
  const keyword = fixSelectionFilter.value.toLowerCase()
  return fixSelectionList.value.filter(item => {
    return (
      (item.host_key || '').toLowerCase().includes(keyword) ||
      (item.os_distro || '').toLowerCase().includes(keyword) ||
      (item.kb_number || '').toLowerCase().includes(keyword)
    )
  })
})

function handleFixSelectionChange(selection) {
  fixSelectionSelectedIds.value = selection.map(row => row.id).filter(Boolean)
}

function openFixConfirm() {
  if (fixSelectionSelectedIds.value.length === 0) {
    ElMessage.warning('请先选择要修复的主机')
    return
  }
  fixDialogIds.value = [...fixSelectionSelectedIds.value]
  fixDialogVisible.value = true
}

function handleFixSubmitted() {
  fixDialogVisible.value = false
  fixSelectionVisible.value = false
  loadData()
}

// 查看受影响主机 logic removed, replaced by handleViewAffectedMachines reusing openFixDialog

// 导出
function handleExport() {
  ElMessage.info('导出功能开发中...')
}

function openKb(kbNumber) {
  if (!kbNumber) return
  const num = kbNumber.replace('KB', '')
  window.open(`https://support.microsoft.com/zh-cn/help/${num}`, '_blank')
}

function formatDateShort(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '-'
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
.ops-filter-bar {
  // Global class .ops-filter-bar handles layout.
  // We use .filter-left and .filter-right for grouping.

  .filter-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

.kb-link {
  display: inline-block;
  padding: 2px 8px;
  background: #6c757d;
  color: #fff;
  border-radius: 10px;
  font-size: 12px;
  text-decoration: none;

  &:hover {
    background: #5a6268;
    color: #fff;
  }
}

.fix-selection {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fix-selection__card {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fff;
}

.fix-selection__card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px 0;
  font-weight: 600;
  color: #303133;
}

.fix-selection__card-title {
  font-size: 14px;
}

.fix-selection__card-body {
  padding: 8px 16px 14px;
}

.fix-selection__kb-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.fix-selection__spacer {
  flex: 1;
}
</style>
