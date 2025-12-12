<template>
  <div class="asset-model">
    <!-- 功能按钮区 -->
    <div class="page-header">
      <div class="page-actions">
        <el-button type="primary" @click="handleAddModel">
          <i class="fa fa-plus" style="margin-right: 4px"></i>
          添加模型
        </el-button>
        <el-button @click="handleImportModel">
          <i class="fa fa-file-excel" style="margin-right: 4px"></i>
          导入模型
        </el-button>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="model-content">
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left"></div>
        <div class="toolbar-right">
          <el-input
            v-model="keyword"
            placeholder="搜索"
            style="width: 200px"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <i class="fa fa-search"></i>
            </template>
          </el-input>
          <el-tooltip content="刷新" placement="top">
            <el-button link @click="loadModelList">
              <i class="fa fa-sync"></i>
            </el-button>
          </el-tooltip>
        </div>
      </div>

      <!-- 模型表格 -->
      <el-table
        v-loading="loading"
        :data="filteredModelList"
        stripe
      >
        <el-table-column prop="title" label="模型名称" min-width="150">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleViewModel(row)">
              {{ row.title }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="code" label="资产代码" width="150" />
        <el-table-column prop="is_auto" label="是否自动化" width="120" align="center">
          <template #default="{ row }">
            <span :class="row.is_auto === 1 ? 'text-success' : 'text-secondary'">
              {{ row.is_auto === 1 ? '是' : '否' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="count" label="资产数量" width="100" align="center" />
        <el-table-column prop="updated_at" label="更新时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.updated_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-tooltip content="编辑" placement="top">
              <el-button link type="primary" @click="handleEditModel(row)">
                <i class="fa fa-pencil-alt"></i>
              </el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button link type="danger" @click="handleDeleteModel(row)">
                <i class="fa fa-trash-alt"></i>
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-bar">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="sizes, slot, prev, pager, next"
        >
          <span class="pagination-info">{{ paginationInfo }}</span>
        </el-pagination>
      </div>
    </div>

    <!-- 添加模型弹窗（简单表单） -->
    <ModelFormDialog
      v-model="modelFormDialogVisible"
      :model-data="null"
      @saved="handleModelFormSaved"
    />

    <!-- 导入模型弹窗 -->
    <ImportModelDialog
      v-model="importModelDialogVisible"
      @saved="loadModelList"
    />

    <!-- 模型详情弹窗 -->
    <ModelDetailDialog
      v-model="modelDetailDialogVisible"
      :model-data="currentModel"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { dtsApi } from '../api'
import { apiService } from '@/core/api'
import ModelFormDialog from '../components/ModelFormDialog.vue'
import ImportModelDialog from '../components/ImportModelDialog.vue'
import ModelDetailDialog from '../components/ModelDetailDialog.vue'

const emit = defineEmits(['edit-model'])

const loading = ref(false)
const keyword = ref('')
const modelList = ref([])
const pagination = ref({ page: 1, size: 10, total: 0 })

// 弹窗状态
const modelFormDialogVisible = ref(false)
const importModelDialogVisible = ref(false)
const modelDetailDialogVisible = ref(false)
const currentModel = ref(null)

// 过滤后的列表
const filteredModelList = computed(() => {
  if (!keyword.value) {
    return modelList.value
  }
  const kw = keyword.value.toLowerCase()
  return modelList.value.filter(item =>
    item.title?.toLowerCase().includes(kw) ||
    item.code?.toLowerCase().includes(kw)
  )
})

// 分页信息
const paginationInfo = computed(() => {
  const total = filteredModelList.value.length
  const start = (pagination.value.page - 1) * pagination.value.size + 1
  const end = Math.min(pagination.value.page * pagination.value.size, total)
  if (total === 0) return '0 - 0 / 0'
  return `${start} - ${end} / ${total}`
})

// 格式化日期时间
const formatDateTime = (dateStr) => {
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

// 加载模型列表
const loadModelList = async () => {
  loading.value = true
  try {
    const res = await dtsApi.queryData('ACM_CIT_MANAGE', {})
    modelList.value = res?.records || []
    pagination.value.total = modelList.value.length
  } catch (error) {
    console.error('加载模型列表失败:', error)
    ElMessage.error('加载模型列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.value.page = 1
}

// 添加模型
const handleAddModel = () => {
  currentModel.value = null
  modelFormDialogVisible.value = true
}

// 模型表单保存后（新增）跳转到编辑页面
const handleModelFormSaved = (savedModel) => {
  loadModelList()
  // 如果返回了模型 ID，通知父组件打开编辑器
  if (savedModel?.id) {
    emit('edit-model', savedModel.id)
  }
}

// 导入模型
const handleImportModel = () => {
  importModelDialogVisible.value = true
}

// 查看模型详情
const handleViewModel = (row) => {
  currentModel.value = row
  modelDetailDialogVisible.value = true
}

// 编辑模型 - 通知父组件打开编辑器
const handleEditModel = (row) => {
  const modelId = row.id || row.cit_id || row.citId
  emit('edit-model', modelId)
}

// 删除模型
const handleDeleteModel = (row) => {
  ElMessageBox.confirm(
    '确定要删除该资产模型吗？删除后不可恢复。',
    '删除确认',
    { type: 'warning' }
  ).then(async () => {
    try {
      // Job: 8PJcRc - 删除资产模型
      await apiService.post(`/jao/api/jao/jobs/8PJcRc/run?cacheBuster=${Date.now()}`, {
        params: { id: row.id }
      })
      ElMessage.success('删除成功')
      loadModelList()
    } catch (error) {
      console.error('删除失败:', error)
      ElMessage.error('删除失败: ' + (error.response?.data?.message || error.message))
    }
  }).catch(() => {})
}

// 初始化
onMounted(() => {
  loadModelList()
})

// 暴露方法供父组件调用
defineExpose({
  loadModelList
})
</script>

<style scoped lang="scss">
.asset-model {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;

  .page-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  .page-actions {
    display: flex;
    gap: 8px;
  }
}

.model-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  overflow: hidden;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.text-success {
  color: #67c23a;
}

.text-secondary {
  color: #909399;
}

.pagination-bar {
  display: flex;
  justify-content: flex-start;
  padding: 16px 0 0;

  .pagination-info {
    margin: 0 8px;
    font-size: 13px;
    color: #606266;
  }
}
</style>
