<template>
  <div class="ops-page-layout">
    <!-- 编辑器视图 -->
    <ModelEditor
      v-if="showEditor"
      :model-id="editorModelId"
      @back="handleEditorBack"
      @saved="handleEditorSaved"
    />

    <!-- 列表视图 -->
    <template v-else>
      <!-- 筛选区域 -->
      <!-- <div class="ops-filter-bar">
          <div class="filter-left">
            <el-input
              v-model="keyword"
              placeholder="搜索"
              style="width: 200px"
              size="small"
              clearable
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <i class="fa fa-search"></i>
              </template>
            </el-input>
          </div>
        </div> -->

      <!-- 操作按钮区域 -->
      <div class="ops-action-bar">
        <el-button type="primary" size="small" @click="handleAddModel">
          <i class="fa fa-plus" style="margin-right: 4px"></i>
          添加模型
        </el-button>
        <el-button size="small" @click="handleImportModel">
          <i class="fa fa-file-excel" style="margin-right: 4px"></i>
          导入模型
        </el-button>
      </div>

      <!-- 数据表格 -->
      <div class="ops-table-wrapper">
        <!-- 表格右上角工具栏 -->
        <div class="table-toolbar-icons">
          <el-button
            class="toolbar-icon-btn"
            circle
            :loading="loading"
            @click="loadModelList"
            title="刷新"
          >
            <el-icon v-show="!loading"><Refresh /></el-icon>
          </el-button>
        </div>
        <el-table
          v-loading="loading"
          :data="filteredModelList"
          max-height="calc(100vh - 230px)"
        >
          <el-table-column prop="title" label="模型名称" min-width="150">
            <template #default="{ row }">
              <el-button link type="primary" @click="handleViewModel(row)">
                {{ row.title }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column prop="code" label="资产代码" width="150" />
          <el-table-column prop="is_auto" label="是否自动化" width="120" align="left">
            <template #default="{ row }">
              {{ row.is_auto === 1 ? '是' : '否' }}
            </template>
          </el-table-column>
          <el-table-column prop="count" label="资产数量" width="100" align="left" />
          <el-table-column prop="updated_at" label="更新时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.updated_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" align="left" fixed="right">
            <template #default="{ row }">
              <el-button text type="primary" size="small" @click="handleEditModel(row)">
                编辑
              </el-button>
              <el-button text type="danger" size="small" @click="handleDeleteModel(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>

      <!-- 导入模型弹窗 -->
      <ImportModelDialog v-model="importModelDialogVisible" @saved="loadModelList" />

      <!-- 模型详情弹窗 -->
      <ModelDetailDialog v-model="modelDetailDialogVisible" :model-data="currentModel" />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { dtsApi } from '../api'
import { apiService } from '@/core/api'
import ImportModelDialog from '../components/ImportModelDialog.vue'
import ModelDetailDialog from '../components/ModelDetailDialog.vue'
import ModelEditor from './ModelEditor.vue'

const route = useRoute()
const router = useRouter()

// 从父组件注入方法
const handleViewAssetTypeFn = inject('handleViewAssetType', null)

// 是否显示编辑器
const showEditor = computed(() => {
  return route.query.editor === 'model'
})

// 编辑器的模型ID
const editorModelId = computed(() => {
  return route.query.modelId || 'new'
})

const loading = ref(false)
const keyword = ref('')
const modelList = ref([])
const pagination = ref({ page: 1, size: 10, total: 0 })

// 弹窗状态
const importModelDialogVisible = ref(false)
const modelDetailDialogVisible = ref(false)
const currentModel = ref(null)

// 过滤后的列表
const filteredModelList = computed(() => {
  if (!keyword.value) {
    return modelList.value
  }
  const kw = keyword.value.toLowerCase()
  return modelList.value.filter(
    item => item.title?.toLowerCase().includes(kw) || item.code?.toLowerCase().includes(kw)
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
const formatDateTime = dateStr => {
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

// 添加模型 - 打开编辑器页面（新建模式）
const handleAddModel = () => {
  router.push({
    path: '/acm/model',
    query: { editor: 'model', modelId: 'new' }
  })
}

// 导入模型
const handleImportModel = () => {
  importModelDialogVisible.value = true
}

// 查看模型详情 - 跳转到资产信息页面
const handleViewModel = row => {
  if (handleViewAssetTypeFn) {
    handleViewAssetTypeFn(row.code)
  }
}

// 编辑模型 - 打开编辑器页面
const handleEditModel = row => {
  const modelId = row.id || row.cit_id || row.citId
  router.push({
    path: '/acm/model',
    query: { editor: 'model', modelId }
  })
}

// 编辑器返回
const handleEditorBack = () => {
  router.push({ path: '/acm/model' })
}

// 编辑器保存后
const handleEditorSaved = () => {
  router.push({ path: '/acm/model' })
  loadModelList()
}

// 删除模型
const handleDeleteModel = row => {
  ElMessageBox.confirm('确定要删除该资产模型吗？删除后不可恢复。', '删除确认', { type: 'warning' })
    .then(async () => {
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
    })
    .catch(() => {})
}

// 初始化
onMounted(() => {
  // 只有在列表模式才加载
  if (!showEditor.value) {
    loadModelList()
  }
})

// 监听路由变化，当从编辑器返回时刷新列表
watch(showEditor, (newVal, oldVal) => {
  if (!newVal && oldVal) {
    // 从编辑器返回到列表
    loadModelList()
  }
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
  background: var(--el-bg-color);
}

// 覆盖全局样式以适应此页面
.ops-page-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px;
  background: var(--el-bg-color);
  overflow: hidden;
}

.ops-table-wrapper {
  position: relative;
}
</style>
