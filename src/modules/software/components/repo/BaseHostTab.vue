<template>
  <div class="base-host-tab">
    <!-- 操作按钮 -->
    <div class="ops-action-bar">
      <div class="action-left">
        <el-button type="primary" size="small" @click="handleChooseBaseHost">
          <i class="fa fa-mouse-pointer" />
          选择基准主机
        </el-button>
        <el-button
          type="danger"
          plain
          size="small"
          :disabled="selectedRows.length === 0 || !canUseRows"
          @click="handleBatchDelete"
        >
          <i class="fa fa-trash-alt" />
          批量删除
        </el-button>
      </div>
      <div class="action-right">
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="loading"
          :disabled="!!readError && !canRetry"
          @click="refresh"
          :title="readError ? '重试读取' : '刷新'"
          :aria-label="readError ? '重试读取基准主机' : '刷新基准主机'"
        >
          <el-icon v-show="!loading"><Refresh /></el-icon>
        </el-button>
      </div>
    </div>

    <el-alert v-if="readError" type="warning" :closable="false" show-icon style="flex-shrink: 0">
      <template #title>
        {{ readErrorMessage }}
        <span v-if="hasResult">刷新成功前，旧主机数据仅供查看，暂不可删除。</span>
      </template>
    </el-alert>

    <div class="ops-table-wrapper">
      <el-table
        v-loading="loading"
        :data="tableData"
        :empty-text="emptyText"
        height="100%"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" :selectable="() => canUseRows" />
        <el-table-column prop="host_key" label="主机" min-width="200" show-overflow-tooltip />
        <el-table-column prop="os_distro" label="OS" width="120" show-overflow-tooltip />
        <el-table-column prop="os_version" label="OS版本" width="120" show-overflow-tooltip />
        <el-table-column prop="update_time" label="更新时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.update_time) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <div class="software-row-actions">
              <el-button
                text
                type="danger"
                size="small"
                :disabled="!canUseRows"
                @click="handleDelete(row)"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-if="hasResult" class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="loadData"
        @current-change="loadData"
      />
    </div>

    <!-- 选择基准主机弹窗 -->
    <SelectBaseHostDialog v-model="selectHostDialogVisible" @success="loadData" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { repoApi } from '../../api'
import SelectBaseHostDialog from './SelectBaseHostDialog.vue'
import { useSoftwareListRead } from '../../composables/useSoftwareListRead'

const currentPage = ref(1)
const pageSize = ref(10)
const selectedRows = ref([])
const {
  rows: tableData,
  total,
  loading,
  hasResult,
  error: readError,
  errorMessage: readErrorMessage,
  emptyText,
  canUseRows,
  canRetry,
  load,
  retry
} = useSoftwareListRead(params => repoApi.getBaseHostList(params), {
  onDiscard: () => {
    selectedRows.value = []
  }
})

// 弹窗相关
const selectHostDialogVisible = ref(false)

function formatDate(timestamp) {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('zh-CN')
}

function loadData() {
  return load({ page: currentPage.value, size: pageSize.value })
}

function refresh() {
  return readError.value ? retry() : loadData()
}

function handleSelectionChange(selection) {
  selectedRows.value = selection
}

function handleChooseBaseHost() {
  selectHostDialogVisible.value = true
}

async function handleBatchDelete() {
  // 使用 id 作为删除参数
  const ids = selectedRows.value.map(item => item.id)
  try {
    await ElMessageBox.confirm('确定要批量删除选中的基准主机吗？', '确认删除', {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      type: 'warning'
    })

    // 批量删除 - 一次 API 调用
    await repoApi.deleteBaseHost(ids)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete base hosts:', error)
      ElMessage.error('删除失败')
    }
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定要删除基准主机 ${row.host_key} 吗？`, '确认删除', {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      type: 'warning'
    })

    // 使用 id 作为删除参数
    await repoApi.deleteBaseHost(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete base host:', error)
      ElMessage.error('删除失败')
    }
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
@use '../../styles/layout' as software-layout;

.base-host-tab {
  @include software-layout.table-tab;
}
</style>
