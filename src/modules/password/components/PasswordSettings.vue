<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索"
            clearable
            style="width: 200px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <!-- <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </el-form-item> -->
      </el-form>
    </div>

    <!-- 功能按钮区 -->
    <div class="ops-action-bar">
      <span style="flex: 1;"></span>
      <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="loadData" title="刷新">
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table
        :data="filteredData"
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="type" label="类型" width="100" show-overflow-tooltip>
          <template #default>
            密码策略
          </template>
        </el-table-column>
        <el-table-column prop="param_name" label="名称" width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getParamNameText(row.param_name) }}
          </template>
        </el-table-column>
        <el-table-column prop="expression" label="参数值" min-width="300" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.expression }}
          </template>
        </el-table-column>
        <el-table-column prop="description" label="备注" min-width="300" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.description || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="handleEdit(row)">
              编辑
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
      />
    </div>

    <!-- 编辑弹窗 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑参数"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="editForm" label-width="100px" v-if="editForm">
        <el-form-item label="类型">
          <el-input v-model="editForm.type" disabled />
        </el-form-item>
        <el-form-item label="名称">
          <el-input :value="getParamNameText(editForm.param_name)" disabled />
        </el-form-item>
        <el-form-item label="参数值">
          <el-input
            v-model="editForm.expression"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import * as pmsApi from '@/modules/password/api'

const loading = ref(false)
const saving = ref(false)
const tableData = ref([])
const editDialogVisible = ref(false)
const editForm = ref(null)
const filters = reactive({
  keyword: ''
})

const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
})

// 参数名称映射
const paramNameMap = {
  PASSWORD_STRENGTH: '密码复杂度',
  DEFAULT_USERNAME: '默认用户名',
  RESET_STRENGTH: '密码回收策略',
  RETRY_RECOVER_FAIL_COUNT: '失败重试次数'
}

// 过滤后的数据
const filteredData = computed(() => {
  if (!filters.keyword) {
    pagination.value.total = tableData.value.length
    return tableData.value
  }
  const keyword = filters.keyword.toLowerCase()
  const filtered = tableData.value.filter(item => {
    return (
      (item.param_name && getParamNameText(item.param_name).toLowerCase().includes(keyword)) ||
      (item.expression && item.expression.toLowerCase().includes(keyword)) ||
      (item.description && item.description.toLowerCase().includes(keyword))
    )
  })
  pagination.value.total = filtered.length
  return filtered
})

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    const response = await pmsApi.getSystemParams()
    const result = response?.data || response
    tableData.value = result?.records || []
    pagination.value.total = tableData.value.length
  } catch (error) {
    console.error('Failed to load system params:', error)
    ElMessage.error('加载系统参数失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.value.page = 1
}

function handleReset() {
  filters.keyword = ''
  pagination.value.page = 1
  pagination.value.pageSize = 10
  loadData()
}

function getParamNameText(paramName) {
  return paramNameMap[paramName] || paramName
}

function handleEdit(row) {
  editForm.value = {
    id: row.id,
    type: row.type || 'PASSWORD_CONFIG',
    param_name: row.param_name,
    expression: row.expression,
    description: row.description
  }
  editDialogVisible.value = true
}

async function handleSave() {
  if (!editForm.value) return

  saving.value = true
  try {
    await pmsApi.saveSystemParam(editForm.value)
    ElMessage.success('保存成功')
    editDialogVisible.value = false
    loadData()
  } catch (error) {
    console.error('Failed to save:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.ops-page-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 6px;
  overflow: hidden;
}

.ops-filter-bar {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}

.ops-action-bar {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.ops-table-wrapper {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.ops-pagination-wrapper {
  flex-shrink: 0;
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
