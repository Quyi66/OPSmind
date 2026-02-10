<template>
  <el-dialog
    v-model="visible"
    :title="`仓库详情 - ${repoId}`"
    width="900px"
    destroy-on-close
    @close="handleClose"
  >
    <div class="repo-detail-dialog">
      <!-- 操作按钮在表格上方 -->
      <div class="ops-action-bar">
        <div class="action-left">
          <el-button
            type="danger"
            plain
            :disabled="selectedRows.length === 0"
            @click="handleRemoveRepoFromHost"
          >
            <i class="fa fa-calendar-minus" /> 移除主机配置
          </el-button>
        </div>
      </div>

      <div class="ops-table-wrapper">
        <el-table
          v-loading="loading"
          :data="tableData"
          max-height="450px"
          style="width: 100%"
          size="small"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="50" />
          <el-table-column prop="host_key" label="主机" min-width="200">
            <template #default="{ row }">
              <el-link type="primary" @click="handleViewHost(row)">
                {{ row.host_key }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column prop="os_distro" label="OS" width="120" />
          <el-table-column prop="os_version" label="OS版本" width="120" />
          <el-table-column prop="scan_date" label="最后扫描时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.scan_date) }}
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
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { repoApi } from '../api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  repoId: {
    type: String,
    default: ''
  },
  refid: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'refresh'])

const visible = ref(false)
const loading = ref(false)
const tableData = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const selectedRows = ref([])
const repoInfo = ref(null)

// 监听 modelValue
watch(
  () => props.modelValue,
  (val) => {
    visible.value = val
    if (val && props.refid) {
      loadRepoInfo()
      loadData()
    }
  }
)

// 监听 visible
watch(visible, (val) => {
  emit('update:modelValue', val)
})

function formatDate(timestamp) {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('zh-CN')
}

// 加载仓库信息
async function loadRepoInfo() {
  try {
    const response = await repoApi.getRepoInfoByRefid(props.refid)
    const data = response?.data || response
    repoInfo.value = data?.records?.[0] || null
  } catch (error) {
    console.error('Failed to load repo info:', error)
    repoInfo.value = null
  }
}

// 加载已配置主机列表
async function loadData() {
  if (!props.refid) return

  loading.value = true
  try {
    const response = await repoApi.getPackageMachineList({
      refid: props.refid,
      page: currentPage.value,
      size: pageSize.value
    })
    const data = response?.data || response
    tableData.value = data?.records || []
    total.value = data?.total || 0
  } catch (error) {
    console.error('Failed to load package machines:', error)
    tableData.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSelectionChange(selection) {
  selectedRows.value = selection
}

function handleViewHost(row) {
  ElMessage.info(`查看主机详情: ${row.host_key}`)
  // TODO: 跳转到主机详情页面
}

function handleRemoveRepoFromHost() {
  const hosts = selectedRows.value.map(item => item.host_id).join(',')
  ElMessageBox.confirm('确定要从选中的主机上移除该仓库配置吗？', '确认移除', {
    type: 'warning'
  }).then(async () => {
    // TODO: 调用移除仓库配置 API
    // await repoApi.removeRepoFromHost({
    //   repo_name: repoInfo.value?.refid,
    //   hosts: hosts,
    //   repo_file: repoInfo.value?.repo_file
    // })
    ElMessage.success('移除成功')
    loadData()
    emit('refresh')
  }).catch(() => {})
}

function handleClose() {
  selectedRows.value = []
  tableData.value = []
  currentPage.value = 1
}
</script>

<style scoped lang="scss">
.repo-detail-dialog {
  /* 使用全局的 ops-action-bar, ops-table-wrapper, ops-pagination-wrapper 样式 */
}
</style>
