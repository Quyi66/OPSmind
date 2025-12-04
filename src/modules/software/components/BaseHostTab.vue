<template>
  <div class="base-host-tab">
    <el-table
      v-loading="loading"
      :data="tableData"
      stripe
      style="width: 100%"
      size="small"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="50" />
      <el-table-column prop="host_key" label="主机" min-width="200" />
      <el-table-column prop="os_distro" label="OS" width="120" />
      <el-table-column prop="os_version" label="OS版本" width="120" />
      <el-table-column prop="update_time" label="更新时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.update_time) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button type="danger" link size="small" @click="handleDelete(row)">
            <i class="fa fa-trash" /> 删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 操作按钮 -->
    <div class="action-bar">
      <el-button type="danger" plain :disabled="selectedRows.length === 0" @click="handleBatchDelete">
        <i class="fa fa-trash-alt" /> 批量删除
      </el-button>
      <el-button type="primary" plain @click="handleChooseBaseHost">
        <i class="fa fa-mouse-pointer" /> 选择基准主机
      </el-button>
    </div>

    <div class="pagination-section">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadData"
        @current-change="loadData"
      />
    </div>

    <!-- 选择基准主机弹窗 -->
    <SelectBaseHostDialog
      v-model="selectHostDialogVisible"
      @success="loadData"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { repoApi } from '../api'
import SelectBaseHostDialog from './SelectBaseHostDialog.vue'

const loading = ref(false)
const tableData = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const selectedRows = ref([])

// 弹窗相关
const selectHostDialogVisible = ref(false)

function formatDate(timestamp) {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('zh-CN')
}

async function loadData() {
  loading.value = true
  try {
    const response = await repoApi.getBaseHostList({
      page: currentPage.value,
      size: pageSize.value
    })
    const data = response?.data || response
    tableData.value = data?.records || []
    total.value = data?.total || 0
  } catch (error) {
    console.error('Failed to load base hosts:', error)
    tableData.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSelectionChange(selection) {
  selectedRows.value = selection
}

function handleChooseBaseHost() {
  selectHostDialogVisible.value = true
}

async function handleBatchDelete() {
  const hostKeys = selectedRows.value.map(item => item.host_key)
  try {
    await ElMessageBox.confirm('确定要批量删除选中的基准主机吗？', '确认删除', {
      type: 'warning'
    })

    // 批量删除
    for (const hostKey of hostKeys) {
      await repoApi.deleteBaseHost(hostKey)
    }
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
      type: 'warning'
    })

    await repoApi.deleteBaseHost(row.host_key)
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
.base-host-tab {
  height: 100%;
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.pagination-section {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
