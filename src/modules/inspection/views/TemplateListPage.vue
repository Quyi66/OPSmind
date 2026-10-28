<template>
  <div class="ops-page-layout template-list-page">
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small" @submit.prevent="handleSearch">
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索名称、描述或执行人"
            aria-label="搜索模板名称、描述或执行人"
            clearable
            size="small"
            class="template-search"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
    </div>

    <div class="ops-action-bar">
      <el-button type="primary" size="small" @click="goToAdd">
        <i class="fa fa-plus" aria-hidden="true"></i>
        新建模板
      </el-button>
      <span v-if="hasResult" class="template-count" role="status">
        {{ filteredData.length }} / {{ tableData.length }} 个模板
      </span>
      <span class="template-action-spacer"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        :disabled="!canRetry"
        :title="error ? '重试读取' : '刷新'"
        :aria-label="error ? '重试读取巡检模板' : '刷新巡检模板'"
        @click="loadTemplates"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <el-alert v-if="error" :title="readMessage" type="warning" :closable="false" show-icon />

    <div class="ops-table-wrapper template-table-wrapper">
      <el-table
        v-loading="loading"
        :data="paginatedData"
        row-key="id"
        height="100%"
        style="width: 100%"
        :default-sort="{ prop: 'executedAt', order: 'descending' }"
        @sort-change="handleSortChange"
      >
        <el-table-column
          prop="templateName"
          label="模板名称"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column prop="description" label="描述" min-width="230" show-overflow-tooltip />
        <el-table-column
          prop="hostCount"
          label="配置主机数"
          min-width="120"
          align="right"
          sortable="custom"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span class="template-count-value">{{ row.hostCount ?? '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="scriptCount"
          label="脚本数"
          min-width="100"
          align="right"
          sortable="custom"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span class="template-count-value">{{ row.scriptCount ?? '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="executedAt"
          label="上次检查时间"
          min-width="200"
          sortable="custom"
          show-overflow-tooltip
        >
          <template #default="{ row }">{{ formatDateTime(row.executedAt) }}</template>
        </el-table-column>
        <el-table-column prop="executedBy" label="执行人" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="200" align="left" fixed="right">
          <template #default="{ row }">
            <div class="template-row-actions" :title="rowActionReason">
              <el-button text type="primary" size="small" @click="goToJobList(row)">
                执行记录
              </el-button>
              <el-button
                text
                type="primary"
                size="small"
                :disabled="!isTemplateCurrent(row)"
                @click="runTemplate(row)"
              >
                执行
              </el-button>
              <el-button
                text
                type="primary"
                size="small"
                :disabled="!isTemplateCurrent(row)"
                @click="editTemplate(row)"
              >
                编辑
              </el-button>
              <el-button
                text
                type="danger"
                size="small"
                :disabled="deleting || !isTemplateCurrent(row)"
                @click="deleteTemplate(row)"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
        <template #empty>
          <span v-if="loading">正在读取巡检模板…</span>
          <span v-else-if="error">{{ readMessage }}</span>
          <el-empty
            v-else-if="hasResult && !tableData.length"
            description="暂无巡检模板"
            :image-size="80"
          >
            <el-button type="primary" size="small" @click="goToAdd">新建模板</el-button>
          </el-empty>
          <el-empty v-else-if="hasResult" description="没有匹配的模板" :image-size="80">
            <el-button size="small" @click="filters.keyword = ''">清除搜索</el-button>
          </el-empty>
          <span v-else>尚未读取巡检模板</span>
        </template>
      </el-table>
    </div>

    <div class="template-footer">
      <span class="template-note">数量为模板配置条目数，“—”表示无法核实。</span>
      <el-pagination
        v-if="hasResult"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="filteredData.length"
        layout="total, sizes, prev, pager, next, jumper"
        background
      />
    </div>

    <TemplateEditDialog
      v-model:visible="editDialogVisible"
      :template-id="editTemplateId"
      @success="handleEditSuccess"
    />
    <RunTemplateDialog
      v-model:visible="runDialogVisible"
      :template-id="runTemplateId"
      @success="handleRunSuccess"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { formatDateTime as formatDateTimeGlobal } from '@/utils/date'
import { templateApi, paramApi } from '../api'
import { useTemplateListData } from '../composables/useTemplateListData'
import TemplateEditDialog from '../components/template/TemplateEditDialog.vue'
import RunTemplateDialog from '../components/template/RunTemplateDialog.vue'

defineEmits(['navigate'])
const router = useRouter()
const {
  tableData,
  filters,
  currentPage,
  pageSize,
  loading,
  hasResult,
  error,
  canRetry,
  readMessage,
  filteredData,
  paginatedData,
  handleSortChange,
  loadTemplates,
  isTemplateCurrent,
  captureTemplate
} = useTemplateListData()
const dashboardEnabled = ref(false)
const teamsEnabled = ref(false)
const editDialogVisible = ref(false)
const editTemplateId = ref('')
const runDialogVisible = ref(false)
const runTemplateId = ref('')
const deleting = ref(false)
const rowActionReason = computed(() =>
  error.value
    ? '请刷新成功后再执行、编辑或删除模板'
    : loading.value
      ? '正在读取，暂不可执行、编辑或删除模板'
      : ''
)

function formatDateTime(value) {
  if (value == null || value === '' || !Number.isFinite(new Date(value).getTime())) return '—'
  return formatDateTimeGlobal(value)
}

// Keep the original configuration read and defaults; this list does not expose new features.
async function loadParams() {
  try {
    const response = await paramApi.getParams()
    const params = response?.data || response || []
    const paramMap = new Map()
    if (Array.isArray(params)) params.forEach(item => paramMap.set(item.name, item.value))
    dashboardEnabled.value = paramMap.get('dashboard_switch') === 'yes'
    teamsEnabled.value = paramMap.get('teams_switch') === 'yes'
  } catch (error) {
    console.error('Failed to load params:', error)
    dashboardEnabled.value = false
    teamsEnabled.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
}
function goToAdd() {
  editTemplateId.value = ''
  editDialogVisible.value = true
}
function jobListLocation(template) {
  return { path: '/cac/results', query: { templateId: template.id } }
}
function goToJobList(template) {
  router.push(jobListLocation(template))
}
function runTemplate(template) {
  if (!isTemplateCurrent(template)) return
  runTemplateId.value = template.id
  runDialogVisible.value = true
}
function editTemplate(template) {
  if (!isTemplateCurrent(template)) return
  editTemplateId.value = template.id
  editDialogVisible.value = true
}
function handleEditSuccess() {
  loadTemplates()
}
function handleRunSuccess() {
  loadTemplates()
}

async function deleteTemplate(template) {
  if (deleting.value || !isTemplateCurrent(template)) return
  const isCurrent = captureTemplate(template)
  const id = template.id
  const name = template.templateName
  deleting.value = true
  try {
    await ElMessageBox.confirm(`确定要删除模板「${name}」吗？`, '删除确认', {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    if (!isCurrent()) return
    await templateApi.deleteTemplate(id)
    if (!isCurrent()) return
    ElMessage.success('删除成功')
    await loadTemplates()
  } catch (error) {
    if (isCurrent() && error !== 'cancel' && error !== 'close') {
      console.error('Failed to delete template:', error)
      ElMessage.error('删除失败')
    }
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  loadParams()
  loadTemplates()
})
defineExpose({ refresh: loadTemplates })
</script>

<style scoped lang="scss">
.template-list-page {
  min-width: 0;
  gap: 12px;
}
.template-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  min-width: 0;
}
.template-footer {
  justify-content: space-between;
  flex-shrink: 0;
}
.template-count,
.template-note {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.template-action-spacer {
  flex: 1;
}
.template-search {
  width: 280px;
  max-width: 100%;
}
.template-table-wrapper {
  min-height: 0;
  overflow: hidden;
}
.template-count-value {
  font-variant-numeric: tabular-nums;
}
.template-row-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
  :deep(.el-button.is-text) {
    margin-left: 0;
    flex-shrink: 0;
  }
}
.template-footer :deep(.el-pagination) {
  margin-left: auto;
}
@media (max-width: 640px) {
  .template-search {
    width: min(280px, 65vw);
  }
  .template-footer {
    overflow-x: auto;
  }
}
</style>
