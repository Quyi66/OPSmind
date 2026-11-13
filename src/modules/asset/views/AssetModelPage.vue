<template>
  <div class="ops-page-layout">
    <div class="content-view-area">
      <!-- 筛选区域 -->
      <div class="ops-filter-bar">
        <el-form :inline="true" size="small" @submit.prevent>
          <el-form-item :label="t('asset.automatedEnrollment')">
            <el-select v-model="autoFilter" :style="{ width: currentLocale === 'en-US' ? '170px' : '120px' }" @change="handleSearch">
              <el-option :label="t('common.all')" value="all" />
              <el-option :label="t('asset.supported')" :value="1" />
              <el-option :label="t('asset.notSupported')" :value="0" />
            </el-select>
          </el-form-item>

          <el-form-item :label="t('asset.keyword')">
            <el-input
              v-model="keyword"
              :placeholder="t('asset.searchModel')"
              clearable
              style="width: 220px"
              @keyup.enter="handleSearch"
              @clear="handleSearch"
            />
          </el-form-item>

          <el-form-item class="filter-actions">
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>
              {{ t('common.search') }}
            </el-button>
            <el-button @click="handleReset">
              <el-icon><RefreshRight /></el-icon>
              {{ t('common.reset') }}
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 操作按钮区域 -->
      <div class="ops-action-bar">
        <el-button type="primary" size="small" @click="handleAddModel">
          <i class="fa fa-plus" style="margin-right: 4px"></i>
          {{ t('asset.newModel') }}
        </el-button>
        <span style="flex: 1"></span>
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="loading"
          :title="t('common.refresh')"
          @click="loadModelList"
        >
          <el-icon v-show="!loading"><Refresh /></el-icon>
        </el-button>
      </div>

      <!-- 数据表格 -->
      <div class="ops-table-wrapper card-table">
        <el-table
          v-loading="loading"
          :data="paginatedModelList"
          height="100%"
          row-class-name="modern-table-row"
        >
          <!-- 1. 类型名称 -->
          <el-table-column prop="title" :label="t('asset.modelTitle')" min-width="180" fixed="left">
            <template #default="{ row }">
              <el-link
                type="primary"
                underline="never"
                class="model-name-link"
                @click="handleViewModel(row)"
              >
                {{ row.title }}
              </el-link>
            </template>
          </el-table-column>

          <!-- 2. 类型编码 -->
          <el-table-column prop="code" :label="t('asset.modelCode')" min-width="160">
            <template #default="{ row }">
              <span class="code-text">{{ row.code || '-' }}</span>
            </template>
          </el-table-column>

          <!-- 3. 已纳管设备数 -->
          <el-table-column prop="count" :label="t('asset.managedDeviceCount')" width="150" align="left" sortable>
            <template #default="{ row }">
              <el-tag
                size="small"
                type="primary"
                round
                class="count-tag-badge clickable-tag"
                :title="t('asset.viewTypeDevices')"
                @click="handleViewModel(row)"
              >
                {{ t('asset.deviceCount', { count: row.count ?? 0 }) }}
              </el-tag>
            </template>
          </el-table-column>

          <!-- 4. 自动化纳管 -->
          <el-table-column prop="is_auto" :label="t('asset.automatedEnrollment')" width="150" align="left">
            <template #default="{ row }">
              <el-tag
                :type="row.is_auto === 1 ? 'success' : 'info'"
                size="small"
                effect="light"
                class="auto-badge-tag"
              >
                <i
                  class="fa"
                  :class="row.is_auto === 1 ? 'fa-check-circle' : 'fa-minus-circle'"
                ></i>
                <span style="margin-left: 4px">{{ row.is_auto === 1 ? t('asset.supported') : t('asset.notSupported') }}</span>
              </el-tag>
            </template>
          </el-table-column>

          <!-- 5. 更新时间 -->
          <el-table-column prop="updated_at" :label="t('asset.updatedAt')" min-width="180" sortable>
            <template #default="{ row }">
              <span>{{ formatDateTime(row.updated_at) }}</span>
            </template>
          </el-table-column>

          <!-- 6. 操作 -->
          <el-table-column :label="t('common.actions')" width="170" align="left" fixed="right">
            <template #default="{ row }">
              <div class="action-cell">
                <el-button text type="primary" size="small" @click="handleViewModel(row)">
                  {{ t('asset.viewDevices') }}
                </el-button>
                <el-button text type="primary" size="small" @click="handleEditModel(row)">
                  {{ t('common.edit') }}
                </el-button>
                <el-button text type="danger" size="small" @click="handleDeleteModel(row)">
                  {{ t('common.delete') }}
                </el-button>
              </div>
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
          :total="filteredModelList.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handlePageSizeChange"
        />
      </div>
    </div>

    <!-- 新建 / 编辑资产类型弹窗 -->
    <ModelFormDialog
      v-model="modelFormDialogVisible"
      :model-data="currentModel"
      @saved="loadModelList"
    />

    <!-- 导入资产类型弹窗 -->
    <ImportModelDialog v-model="importModelDialogVisible" @saved="loadModelList" />
  </div>
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'

import { ref, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
import { assetApi } from '../api'
import { apiService } from '@/core/api'
import ImportModelDialog from '../components/model/ImportModelDialog.vue'
import ModelFormDialog from '../components/model/ModelFormDialog.vue'
import { formatDateTime } from '../utils/helpers'

const router = useRouter()

// 从父组件注入方法
const handleViewAssetTypeFn = inject('handleViewAssetType', null)

const loading = ref(false)
const keyword = ref('')
const autoFilter = ref('all')
const modelList = ref([])
const pagination = ref({ page: 1, size: 10, total: 0 })

// 弹窗状态
const importModelDialogVisible = ref(false)
const modelFormDialogVisible = ref(false)
const currentModel = ref(null)

// 过滤后的列表
const filteredModelList = computed(() => {
  return modelList.value.filter(item => {
    if (autoFilter.value !== 'all' && Number(item.is_auto) !== Number(autoFilter.value)) {
      return false
    }
    if (keyword.value) {
      const kw = keyword.value.trim().toLowerCase()
      const matchTitle = item.title?.toLowerCase().includes(kw)
      const matchCode = item.code?.toLowerCase().includes(kw)
      if (!matchTitle && !matchCode) return false
    }
    return true
  })
})

const paginatedModelList = computed(() => {
  const start = (pagination.value.page - 1) * pagination.value.size
  return filteredModelList.value.slice(start, start + pagination.value.size)
})

function handlePageSizeChange() {
  pagination.value.page = 1
}

// 加载资产类型列表
const loadModelList = async () => {
  loading.value = true
  try {
    const res = await assetApi.getAssetTypes()
    modelList.value = res?.records || []
    pagination.value.total = modelList.value.length
  } catch (error) {
    console.error('加载资产类型列表失败:', error)
    ElMessage.error(t('asset.modelsLoadFailed'))
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.value.page = 1
}

// 重置筛选
const handleReset = () => {
  keyword.value = ''
  autoFilter.value = 'all'
  pagination.value.page = 1
}

// 新建资产类型 - 打开弹窗
const handleAddModel = () => {
  currentModel.value = null
  modelFormDialogVisible.value = true
}

// 导入资产类型
const handleImportModel = () => {
  importModelDialogVisible.value = true
}

// 查看该类型下的设备清单
const handleViewModel = row => {
  if (handleViewAssetTypeFn) {
    handleViewAssetTypeFn(row.code)
  } else {
    router.push({
      path: '/acm/info',
      query: { type: row.code }
    })
  }
}

// 编辑资产类型 - 打开弹窗
const handleEditModel = row => {
  currentModel.value = { ...row }
  modelFormDialogVisible.value = true
}

// 删除资产类型
const handleDeleteModel = row => {
  ElMessageBox.confirm(t('asset.deleteModelConfirm', { name: row.title || row.code }), t('asset.deleteConfirm'), {
    closeOnClickModal: false,
    closeOnPressEscape: false,
    type: 'warning'
  })
    .then(async () => {
      try {
        await apiService.post(`/workflow/api/workflow/jobs/8PJcRc/run?cacheBuster=${Date.now()}`, {
          params: { id: row.id }
        })
        ElMessage.success(t('asset.deleted'))
        loadModelList()
      } catch (error) {
        console.error('删除失败:', error)
        ElMessage.error(t('asset.deleteFailedReason', { message: error.response?.data?.message || error.message }))
      }
    })
    .catch(() => {})
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
.model-name-link {
  font-size: 13px;
  font-weight: 600;
}

.code-text {
  font-family: var(--el-font-family-monospace, monospace);
  color: var(--el-text-color-regular);
}

.auto-badge-tag {
  border-radius: 4px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.count-tag-badge {
  font-weight: 500;
}

.clickable-tag {
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.85;
  }
}
</style>
