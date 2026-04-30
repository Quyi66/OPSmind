<template>
  <div class="base-host-tab">
    <!-- 操作按钮 -->
    <div class="ops-action-bar">
      <div class="action-left">
        <el-button type="primary" @click="handleChooseBaseHost">
          <i class="fa fa-mouse-pointer" /> 选择基准主机
        </el-button>
        <el-button type="danger" plain :disabled="selectedRows.length === 0" @click="handleBatchDelete">
          <i class="fa fa-trash-alt" /> 批量删除
        </el-button>
      </div>
    </div>

    <div class="ops-table-wrapper">
      <el-table
        v-loading="loading"
        :data="tableData"
        max-height="calc(100vh - 260px)"
        style="width: 100%"
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
        <el-table-column label="操作" width="60" fixed="right">
          <template #default="{ row }">
            <el-button text type="danger" size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="ops-pagination-wrapper">
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
    <SelectBaseHostDialog
      v-model="selectHostDialogVisible"
      @success="loadData"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { repoApi } from '../../api'
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
  // 使用 id 作为删除参数
  const ids = selectedRows.value.map(item => item.id)
  try {
    await ElMessageBox.confirm('确定要批量删除选中的基准主机吗？', '确认删除', {
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
.base-host-tab {
  height: 100%;
}

/* 使用全局的 ops-action-bar 和 ops-pagination-wrapper 样式 */
</style>
