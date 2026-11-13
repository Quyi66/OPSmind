<template>
  <el-dialog
    v-model="visible"
    :title="t('asset.tagAssets')"
    width="1280px"
    :close-on-click-modal="selectedRows.length === 0"
    :close-on-press-escape="selectedRows.length === 0"
  >
    <div class="tag-asset-content">
      <!-- 操作按钮和工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button
            :type="selectedRows.length > 0 ? 'danger' : 'default'"
            :disabled="selectedRows.length === 0"
            @click="handleRemoveAsset"
          >
            <i class="fa fa-minus-circle" style="margin-right: 4px"></i>
            {{ t('asset.removeTagAssets') }}
          </el-button>
        </div>
        <div class="toolbar-right">
          <span v-if="selectedRows.length > 0" class="selected-info">
            {{ t('asset.selectedCount', { count: selectedRows.length }) }}
          </span>
          <el-input
            v-model="keyword"
            :placeholder="t('common.search')"
            style="width: 180px"
            clearable
            @keyup.enter="loadAssetList"
          >
            <template #prefix>
              <i class="fa fa-search"></i>
            </template>
          </el-input>
          <el-tooltip :content="t('asset.export')" placement="top">
            <el-button link @click="handleExport">
              <i class="fa fa-file-export"></i>
            </el-button>
          </el-tooltip>
          <el-tooltip :content="t('common.refresh')" placement="top">
            <el-button link @click="loadAssetList">
              <i class="fa fa-sync"></i>
            </el-button>
          </el-tooltip>
        </div>
      </div>

      <!-- 资产表格 -->
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="assetList"
        max-height="calc(100vh - 400px)"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="40" fixed="left" />
        <el-table-column :label="t('asset.assetStatus')" width="80" align="left" fixed="left">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? t('asset.online') : t('asset.offline') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="IP" :label="t('asset.managedIp')" width="130" fixed="left" />
        <el-table-column :label="t('asset.connectivityStatus')" width="80" align="left">
          <template #default="{ row }">
            <i
              v-if="String(row.CONN_LATEST_STATUS) === '1'"
              class="fa fa-check-circle"
              style="color: #67c23a"
            ></i>
            <i
              v-else-if="String(row.CONN_LATEST_STATUS) === '0'"
              class="fa fa-times-circle"
              style="color: #f56c6c"
            ></i>
            <i v-else class="fa fa-question-circle" style="color: #e6a23c"></i>
          </template>
        </el-table-column>
        <el-table-column :label="t('asset.connectionRate')" width="70" align="left">
          <template #default="{ row }">
            {{ row.CONN_RATE ? row.CONN_RATE + '%' : t('asset.notTested') }}
          </template>
        </el-table-column>
        <el-table-column prop="业务系统" :label="t('asset.businessSystem')" width="80" show-overflow-tooltip />
        <el-table-column prop="os_version" :label="t('asset.osVersion')" width="80" />
        <el-table-column prop="os_distro" :label="t('asset.os')" width="80" />
        <el-table-column prop="hostname" :label="t('asset.hostname')" width="100" show-overflow-tooltip />
        <el-table-column prop="arch" :label="t('asset.arch')" width="80" />
        <el-table-column prop="cpu_vcpus" :label="t('asset.cpuCount')" width="80" align="left" />
        <el-table-column prop="kernel" :label="t('asset.kernel')" width="100" show-overflow-tooltip />
        <el-table-column prop="memtotal_mb" :label="t('asset.totalMemory')" width="80" align="left" />
        <el-table-column prop="系统名称" :label="t('asset.systemName')" width="80" show-overflow-tooltip />
        <el-table-column prop="负责人" :label="t('asset.owner')" width="80" show-overflow-tooltip />
        <el-table-column prop="memfree_mb" :label="t('asset.freeMemory')" width="80" align="left" />
        <el-table-column prop="jdk_version" :label="t('asset.javaVersion')" width="120" show-overflow-tooltip />
        <el-table-column prop="系统模块" :label="t('asset.systemModule')" width="80" show-overflow-tooltip />
      </el-table>

      <!-- 分页 -->
      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="loadAssetList"
          @current-change="loadAssetList"
        />
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { t } from '@/core/i18n'

import { ref, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiService } from '@/core/api'
import { throwIfWorkflowFailed } from '@/utils/workflowResult'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  tagData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const tableRef = ref()
const loading = ref(false)
const keyword = ref('')
const assetList = ref([])
const selectedRows = ref([])
const pagination = ref({ page: 1, size: 10, total: 0 })

// 加载标签内的资产
const loadAssetList = async () => {
  if (!props.tagData) return
  loading.value = true
  try {
    // 使用 ACM_GET_ATTRS_BY_TAGID → GET /cmdb/api/cmdb/ci/attrs/tag?tagId={tagId}
    const res = await apiService.get('/cmdb/api/cmdb/ci/attrs/tag', {
      params: {
        tagId: props.tagData.id,
        size: pagination.value.size,
        page: pagination.value.page,
        filter: keyword.value || ''
      }
    })
    const data = res?.data || res
    assetList.value = data?.content || data?.records || []
    pagination.value.total = Number(
      data?.totalElements ?? data?.total ?? assetList.value.length ?? 0
    )
  } catch (error) {
    console.error('加载设备清单失败:', error)
    ElMessage.error(t('asset.devicesLoadFailed'))
  } finally {
    loading.value = false
  }
}

// 选择变化
const handleSelectionChange = rows => {
  selectedRows.value = rows
}

// 从标签中移除
const handleRemoveAsset = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning(t('asset.selectAssetsToRemove'))
    return
  }

  ElMessageBox.confirm(t('asset.removeTagAssetsConfirm'), t('asset.removeConfirm'), {
    closeOnClickModal: false,
    closeOnPressEscape: false,
    type: 'warning'
  })
    .then(async () => {
      try {
        const ciIds = selectedRows.value.map(row => row.id).join(',')
        // Job: dosxGT - 从标签移除资产
        const response = await apiService.post(
          `/workflow/api/workflow/jobs/dosxGT/run?cacheBuster=${Date.now()}`,
          {
            params: {
              tagId: props.tagData.id,
              ciId: ciIds
            }
          }
        )
        throwIfWorkflowFailed(response)
        ElMessage.success(t('asset.removed'))
        loadAssetList()
      } catch (error) {
        console.error('移除失败:', error)
        ElMessage.error(t('asset.removeFailedReason', { message: error.response?.data?.message || error.message }))
      }
    })
    .catch(() => {})
}

// 导出
const handleExport = () => {
  // TODO: 实现导出功能
  ElMessage.info(t('asset.exportPending'))
}

// 监听弹窗打开
watch(visible, val => {
  if (val) {
    keyword.value = ''
    pagination.value.page = 1
    selectedRows.value = []
    loadAssetList()
  }
})
</script>

<style scoped lang="scss">
.tag-asset-content {
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .toolbar-left {
      display: flex;
      gap: 8px;
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;

      .selected-info {
        font-size: 13px;
        color: var(--el-text-color-regular);

        .selected-count {
          color: var(--el-color-primary);
          margin: 0 2px;
        }
      }
    }
  }

  .pagination-bar {
    display: flex;
    justify-content: flex-start;
    padding: 16px 0 0;

    .pagination-info {
      margin: 0 8px;
      font-size: 13px;
      color: var(--el-text-color-regular);
    }
  }
}
</style>
