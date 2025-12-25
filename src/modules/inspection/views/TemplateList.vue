<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item label="模板名称">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索模板名称"
            clearable
            style="width: 250px"
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

    <!-- 功能按钮区 -->
    <div class="ops-action-bar">
      <el-button type="primary" size="small" @click="goToAdd">
        <i class="fa fa-plus"></i> 新建模板
      </el-button>
      <span style="flex: 1;"></span>
      <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="loadTemplates" title="刷新">
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table
        v-loading="loading"
        :data="paginatedData"
        style="width: 100%"
        row-key="id"
        :default-sort="{ prop: 'executedAt', order: 'descending' }"
        heigth="calc(100vh - 300px)"
      >
        <!-- 名称 -->
        <el-table-column prop="templateName" label="名称" min-width="250" sortable>
          <template #default="{ row }">
            <a
              href="javascript:void(0)"
              class="template-name-link"
              @click="goToJobList(row)"
            >
              {{ row.templateName }}
            </a>
            <p v-if="row.description" class="template-desc">{{ row.description }}</p>
          </template>
        </el-table-column>

        <!-- 检查项 -->
        <el-table-column label="检查项" min-width="150" sortable>
          <template #default="{ row }">
            <span class="check-item">
              主机: <strong>{{ row.hostCount }}</strong>, 脚本: <strong>{{ row.scriptCount }}</strong>
            </span>
          </template>
        </el-table-column>

        <!-- 上次检查时间 -->
        <el-table-column prop="executedAt" label="上次检查时间" width="180" sortable>
          <template #default="{ row }">
            <span v-if="row.executedAt" class="execution-time">
              {{ formatDateTime(row.executedAt) }}
            </span>
            <span v-else class="not-executed">未执行</span>
          </template>
        </el-table-column>

        <!-- 执行人 -->
        <el-table-column prop="executedBy" label="执行人" width="120" sortable show-overflow-tooltip />

        <!-- 操作 -->
        <el-table-column label="操作" width="132" align="left" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="runTemplate(row)">
              执行
            </el-button>
            <el-button text type="primary" size="small" @click="editTemplate(row)">
              编辑
            </el-button>
            <el-button text type="danger" size="small" @click="deleteTemplate(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="filteredData.length"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handlePageSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 新建/编辑模板弹窗 -->
    <TemplateEditDialog
      v-model:visible="editDialogVisible"
      :template-id="editTemplateId"
      @success="handleEditSuccess"
    />

    <!-- 执行巡检弹窗 -->
    <RunTemplateDialog
      v-model:visible="runDialogVisible"
      :template-id="runTemplateId"
      @success="handleRunSuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import { templateApi, paramApi } from '../api'
import TemplateEditDialog from '../components/TemplateEditDialog.vue'
import RunTemplateDialog from '../components/RunTemplateDialog.vue'

const emit = defineEmits(['navigate'])

const loading = ref(false)
const tableData = ref([])
const filters = reactive({
  keyword: ''
})
const pageSize = ref(10)
const currentPage = ref(1)
const dashboardEnabled = ref(false)
const teamsEnabled = ref(false)

// 编辑弹窗状态
const editDialogVisible = ref(false)
const editTemplateId = ref('')

// 执行弹窗状态
const runDialogVisible = ref(false)
const runTemplateId = ref('')

/**
 * 过滤后的数据
 */
const filteredData = computed(() => {
  let data = tableData.value
  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase()
    data = data.filter(item =>
      item.templateName?.toLowerCase().includes(keyword) ||
      item.description?.toLowerCase().includes(keyword) ||
      item.executedBy?.toLowerCase().includes(keyword)
    )
  }
  return data
})

/**
 * 分页后的数据
 */
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredData.value.slice(start, end)
})

/**
 * 格式化日期时间
 */
function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * 加载配置参数
 */
async function loadParams() {
  try {
    const response = await paramApi.getParams()
    const params = response?.data || response || []

    const paramMap = new Map()
    if (Array.isArray(params)) {
      params.forEach(item => paramMap.set(item.name, item.value))
    }

    dashboardEnabled.value = paramMap.get('dashboard_switch') === 'yes'
    teamsEnabled.value = paramMap.get('teams_switch') === 'yes'
  } catch (error) {
    console.error('Failed to load params:', error)
    // 默认值
    dashboardEnabled.value = false
    teamsEnabled.value = false
  }
}

/**
 * 加载模板列表
 */
async function loadTemplates() {
  loading.value = true
  try {
    const response = await templateApi.getTemplates()
    const data = response?.data || response || []

    tableData.value = data.map(template => {
      // 解析 auditParams
      let auditParams = []
      try {
        auditParams = typeof template.auditParams === 'string'
          ? JSON.parse(template.auditParams)
          : (template.auditParams || [])
      } catch {
        auditParams = []
      }

      // 计算主机和脚本总数
      let hostCount = 0
      let scriptCount = 0
      auditParams.forEach(param => {
        hostCount += (param.hosts || []).length
        scriptCount += (param.scripts || []).length
      })

      return {
        ...template,
        hostCount,
        scriptCount
      }
    })
  } catch (error) {
    console.error('Failed to load templates:', error)
    ElMessage.error('加载模板列表失败')
    tableData.value = []
  } finally {
    loading.value = false
  }
}

/**
 * 搜索处理
 */
function handleSearch() {
  currentPage.value = 1
}

/**
 * 每页数量变化
 */
function handlePageSizeChange() {
  currentPage.value = 1
}

/**
 * 重置筛选
 */
function handleReset() {
  filters.keyword = ''
  currentPage.value = 1
  pageSize.value = 10
}

/**
 * 页码变化
 */
function handlePageChange(page) {
  currentPage.value = page
}

/**
 * 跳转到新增模板
 */
function goToAdd() {
  editTemplateId.value = ''
  editDialogVisible.value = true
}

/**
 * 跳转到检查结果页面，并选中当前模板
 */
function goToJobList(template) {
  emit('navigate', { view: 'results', params: { templateId: template.id } })
}

/**
 * 执行模板 - 打开执行弹窗
 */
function runTemplate(template) {
  runTemplateId.value = template.id
  runDialogVisible.value = true
}

/**
 * 编辑模板
 */
function editTemplate(template) {
  editTemplateId.value = template.id
  editDialogVisible.value = true
}

/**
 * 编辑成功回调
 */
function handleEditSuccess() {
  loadTemplates()
}

/**
 * 执行成功回调
 */
function handleRunSuccess() {
  loadTemplates()
}

/**
 * 删除模板
 */
async function deleteTemplate(template) {
  try {
    await ElMessageBox.confirm(
      `确定要删除模板「${template.templateName}」吗？`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await templateApi.deleteTemplate(template.id)
    ElMessage.success('删除成功')
    loadTemplates()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete template:', error)
      ElMessage.error('删除失败')
    }
  }
}

onMounted(() => {
  loadParams()
  loadTemplates()
})

defineExpose({
  refresh: loadTemplates
})
</script>

<style scoped lang="scss">
.template-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid #ebeef5;

  .navbar-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }
}

.search-bar {
  display: flex;
  justify-content: flex-end;
  padding: 12px 20px;
  border-bottom: 1px solid #ebeef5;

  .search-input {
    width: 250px;
  }
}

.table-wrapper {
  flex: 1;
  padding: 0 20px;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.template-name-link {
  color: #409eff;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.template-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.check-item {
  color: #606266;

  strong {
    color: #303133;
    font-weight: 600;
  }
}

.execution-time {
  color: #606266;
}

.not-executed {
  color: #909399;
}

.action-btn {
  padding: 4px 6px;
  color: #606266;

  i {
    font-size: 14px;
  }

  &:hover {
    color: #409eff;
  }
}

.table-footer {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid #ebeef5;

  .page-size-select {
    width: 70px;
  }

  .pagination-info {
    margin-left: 12px;
    font-size: 13px;
    color: #606266;
  }
}
</style>
