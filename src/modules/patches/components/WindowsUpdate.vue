<template>
  <div class="windows-update">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-header__actions">
        <el-button
          type="primary"
          plain
          :disabled="selectedKbNumbers.length === 0"
          @click="handleFixSelected"
        >
          <i class="fa fa-tools" style="margin-right: 6px" />
          修复选中漏洞
        </el-button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="page-content">
      <!-- 筛选区域 -->
      <div class="filter-section">
        <!-- 类型多选筛选和搜索框在同一行 -->
        <div class="filter-row">
          <el-checkbox-group v-model="categoryFilter" @change="handleFilter">
            <el-checkbox value="Security Updates">
              <el-tag type="danger" size="small" effect="dark">安全</el-tag>
            </el-checkbox>
            <el-checkbox value="Critical Updates">
              <el-tag type="danger" size="small" effect="dark">重要</el-tag>
            </el-checkbox>
            <el-checkbox value="Update Rollups">
              <el-tag type="success" size="small" effect="dark">更新汇总</el-tag>
            </el-checkbox>
            <el-checkbox value="Application">
              <el-tag type="success" size="small" effect="dark">应用程序</el-tag>
            </el-checkbox>
            <el-checkbox value="Connectors">
              <el-tag type="success" size="small" effect="dark">连接器</el-tag>
            </el-checkbox>
            <el-checkbox value="Definition Updates">
              <el-tag type="success" size="small" effect="dark">定义更新</el-tag>
            </el-checkbox>
            <el-checkbox value="Developer Kits">
              <el-tag type="success" size="small" effect="dark">开发工具包</el-tag>
            </el-checkbox>
            <el-checkbox value="Feature Packs">
              <el-tag type="success" size="small" effect="dark">功能包</el-tag>
            </el-checkbox>
            <el-checkbox value="Guidance">
              <el-tag type="success" size="small" effect="dark">说明性更新</el-tag>
            </el-checkbox>
            <el-checkbox value="Service Packs">
              <el-tag type="success" size="small" effect="dark">服务包</el-tag>
            </el-checkbox>
            <el-checkbox value="Tools">
              <el-tag type="success" size="small" effect="dark">工具</el-tag>
            </el-checkbox>
            <el-checkbox value="Updates">
              <el-tag type="success" size="small" effect="dark">常规</el-tag>
            </el-checkbox>
            <el-checkbox value="Upgrades">
              <el-tag size="small" effect="dark">升级</el-tag>
            </el-checkbox>
          </el-checkbox-group>
          <div class="filter-spacer"></div>
          <el-input
            v-model="filterText"
            placeholder=""
            style="width: 180px"
            clearable
            @input="handleFilter"
          >
            <template #prefix>
              <i class="fa fa-search" style="color: #c0c4cc" />
            </template>
          </el-input>
        </div>
      </div>

      <!-- 更新表格 -->
      <div class="table-section">
        <el-table
          ref="tableRef"
          v-loading="loading"
          :data="tableData"
          style="width: 100%"
          size="small"
          border
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="50" />
          <el-table-column prop="kb_number" label="KB编号" min-width="120">
            <template #default="{ row }">
              <a
                v-if="row.kb_number"
                :href="`https://support.microsoft.com/zh-cn/help/${row.kb_number?.replace('KB', '')}`"
                target="_blank"
                class="kb-link"
              >
                {{ row.kb_number }}
              </a>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="category_name" label="类型" min-width="100" />
          <el-table-column prop="title" label="描述" min-width="300" show-overflow-tooltip />
          <el-table-column prop="affect_machines" label="受影响主机" min-width="120">
            <template #default="{ row }">
              <el-button
                type="primary"
                link
                size="small"
                @click="handleViewAffectedMachines(row)"
              >
                {{ row.affect_machines || 0 }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 表格底部分页 -->
      <div class="table-footer">
        <el-select v-model="pagination.pageSize" style="width: 80px" @change="handleSizeChange">
          <el-option :value="10" label="10" />
          <el-option :value="20" label="20" />
          <el-option :value="50" label="50" />
          <el-option :value="100" label="100" />
        </el-select>
      </div>
    </div>

    <!-- 受影响主机对话框 -->
    <el-dialog
      v-model="affectedMachinesVisible"
      :title="`受影响主机 - ${selectedPatch?.kb_number || ''}`"
      width="800px"
      destroy-on-close
    >
      <div v-loading="affectedMachinesLoading">
        <el-table :data="affectedMachinesList" size="small" stripe max-height="400">
          <el-table-column prop="host_key" label="主机" min-width="140" />
          <el-table-column prop="os_distro" label="操作系统" min-width="120" />
          <el-table-column prop="os_version" label="版本" min-width="100" />
          <el-table-column prop="patch_status" label="状态" min-width="100">
            <template #default="{ row }">
              <el-tag :type="getPatchStatusType(row.patch_status)" size="small">
                {{ row.patch_status }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <el-button @click="affectedMachinesVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { windowsUpdateApi } from '../api'

// 加载状态
const loading = ref(false)
const tableRef = ref(null)

// 筛选
const filterText = ref('')
const categoryFilter = ref(['Critical Updates', 'Security Updates'])

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

// 受影响主机对话框
const affectedMachinesVisible = ref(false)
const affectedMachinesLoading = ref(false)
const affectedMachinesList = ref([])
const selectedPatch = ref(null)

// 补丁状态样式
function getPatchStatusType(status) {
  const map = {
    '未修复': 'info',
    '已修复': 'success',
    '修复中': '',
    '修复失败': 'warning'
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

function handleFilter() {
  pagination.page = 1
  loadData()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadData()
}

function handleSelectionChange(selection) {
  selectedRows.value = selection
}

// 修复选中漏洞
function handleFixSelected() {
  if (selectedKbNumbers.value.length === 0) {
    ElMessage.warning('请先选择要修复的漏洞')
    return
  }
  // 跳转到修复页面，传递 kb_numbers 参数
  const kbNumbers = selectedKbNumbers.value.join(',')
  ElMessage.info(`修复漏洞: ${kbNumbers}`)
  // TODO: 跳转到页面 05pYMf
}

// 查看受影响主机
async function handleViewAffectedMachines(row) {
  selectedPatch.value = row
  affectedMachinesVisible.value = true
  affectedMachinesLoading.value = true

  try {
    const response = await windowsUpdateApi.getAffectedMachines({
      kb_number: row.kb_number
    })
    affectedMachinesList.value = response?.records || response?.data?.records || []
  } catch (error) {
    console.error('Failed to load affected machines:', error)
    affectedMachinesList.value = []
  } finally {
    affectedMachinesLoading.value = false
  }
}

// 导出
function handleExport() {
  ElMessage.info('导出功能开发中...')
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
.windows-update {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f7fa;
}

.page-header {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e9ecef;

  &__actions {
    display: flex;
    gap: 8px;
  }
}

.page-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;

  &--right {
    justify-content: flex-end;
  }

  :deep(.el-checkbox-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  :deep(.el-checkbox) {
    margin-right: 0;
  }

  :deep(.el-checkbox__label) {
    padding-left: 4px;
  }
}

.filter-spacer {
  flex: 1;
}

.table-section {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}

.table-footer {
  margin-top: 12px;
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
</style>
