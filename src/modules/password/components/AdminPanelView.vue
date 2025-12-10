<template>
  <div class="admin-panel-container">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-button type="info" plain @click="handleBack">
          <i class="fa fa-arrow-circle-left"></i>
          返回
        </el-button>
        <el-button @click="handleBatchModify">
          <i class="fa fa-wrench"></i>
          批量修改
        </el-button>
        <el-button :disabled="!selectedRows.length" @click="handleSelectModify">
          <i class="fa fa-keyboard"></i>
          选择修改
        </el-button>
        <el-button @click="handleCheckPasswordState">
          <i class="fa fa-check-double"></i>
          检查密码状态
        </el-button>
        <el-button @click="handleRevertPassword">
          <i class="fa fa-recycle"></i>
          回收密码
        </el-button>
        <el-button @click="handleExportPassword">
          <i class="fa fa-file-export"></i>
          导出密码
        </el-button>
        <el-button plain @click="handleImportInitPassword">
          <i class="fa fa-arrow-up"></i>
          导入初始密码
        </el-button>
        <el-button type="info" plain @click="handleDownloadTemplate">
          <i class="fa fa-file-excel"></i>
          模板下载
        </el-button>
      </div>
    </div>

    <!-- 筛选和设备选择 -->
    <div class="filter-bar">
      <div class="filter-left">
        <AcmDeviceSelector
          v-model="selectedHosts"
          ci-types="linux"
          :options="{ label: '筛选主机' }"
          @change="loadData"
        />
        <el-button @click="loadData" :loading="loading" circle>
          <i class="fa fa-refresh"></i>
        </el-button>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-container">
      <el-table
        ref="tableRef"
        :data="tableData"
        v-loading="loading"
        border
        stripe
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="host_key" label="IP" width="150" />
        <el-table-column prop="hostname" label="主机名" min-width="150" />
        <el-table-column prop="username" label="用户名" width="100" />
        <el-table-column prop="check_status" label="密码状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getCheckStatusType(row.check_status)" size="small">
              <i :class="['fa', getCheckStatusIcon(row.check_status)]"></i>
              {{ getCheckStatusText(row.check_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="expired_date" label="密码过期时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.expired_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="last_setup_time" label="上次修改时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.last_setup_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="check_time" label="上次检查时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.check_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="operator_name" label="操作人" width="100" />
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button
                size="small"
                plain
                :disabled="row.setup_status === 'PROCESS' || row.setup_status === 'RESET'"
                @click="handleViewPassword(row)"
              >
                <i class="fa fa-eye"></i>
                查看密码
              </el-button>
              <el-button
                size="small"
                plain
                :disabled="row.setup_status === 'PROCESS' || row.setup_status === 'RESET'"
                @click="handleViewHistory(row)"
              >
                <i class="fa fa-grip-horizontal"></i>
                操作历史
              </el-button>
              <el-button
                v-if="row.setup_status === 'PROCESS'"
                type="primary"
                size="small"
                disabled
              >
                <i class="fa fa-recycle"></i>
                修改中
              </el-button>
              <el-button
                v-if="row.setup_status === 'RESET'"
                type="primary"
                size="small"
                disabled
              >
                <i class="fa fa-recycle"></i>
                重置中
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadData"
        @current-change="loadData"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import * as pmsApi from '@/modules/password/api'

const emit = defineEmits(['back'])

const loading = ref(false)
const tableData = ref([])
const tableRef = ref(null)
const selectedRows = ref([])
const selectedHosts = ref([])

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 检查状态配置
const checkStatusConfig = {
  USABLE: { text: '可用', type: 'success', icon: 'fa-check' },
  UNABLE: { text: '不可用', type: 'danger', icon: 'fa-times' },
  PROCESSING: { text: '检查中', type: 'primary', icon: 'fa-spinner fa-spin' },
  UNKNOWN: { text: '未知', type: 'warning', icon: 'fa-question' }
}

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    // 构建设备筛选参数
    let assestsObjects = '@@(linux)'
    if (selectedHosts.value && selectedHosts.value.length > 0) {
      assestsObjects = selectedHosts.value.map(h => h.key || h.value || h).join(',')
    }

    const response = await pmsApi.getPmsServerList(assestsObjects)
    const result = response?.data || response
    tableData.value = result?.records || []
    pagination.total = result?.total || tableData.value.length
  } catch (error) {
    console.error('Failed to load server list:', error)
    ElMessage.error('加载服务器列表失败')
  } finally {
    loading.value = false
  }
}

function handleSelectionChange(selection) {
  selectedRows.value = selection
}

function getCheckStatusType(status) {
  return checkStatusConfig[status]?.type || 'info'
}

function getCheckStatusText(status) {
  return checkStatusConfig[status]?.text || status
}

function getCheckStatusIcon(status) {
  return checkStatusConfig[status]?.icon || 'fa-question'
}

function formatTime(time) {
  if (!time) return ''
  try {
    const date = new Date(time)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return time
  }
}

// 操作handlers
function handleBack() {
  emit('back')
}

function handleBatchModify() {
  ElMessage.info('批量修改弹窗待实现')
}

function handleSelectModify() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要修改的服务器')
    return
  }
  ElMessage.info('选择修改弹窗待实现')
}

function handleCheckPasswordState() {
  ElMessage.info('检查密码状态弹窗待实现')
}

function handleRevertPassword() {
  ElMessage.info('回收密码弹窗待实现')
}

function handleExportPassword() {
  pmsApi.exportPasswords()
}

function handleImportInitPassword() {
  ElMessage.info('导入初始密码弹窗待实现')
}

function handleDownloadTemplate() {
  const templateUrl = `${window.location.origin}/oplus/base/content/template/pms/host_password_template.xlsx`
  window.open(templateUrl, '_blank')
}

function handleViewPassword(row) {
  ElMessage.info('查看密码弹窗待实现')
}

function handleViewHistory(row) {
  ElMessage.info('操作历史弹窗待实现')
}
</script>

<style scoped lang="scss">
.admin-panel-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: #f8fafc;
}

.toolbar {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  .toolbar-left {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  .filter-left {
    display: flex;
    gap: 10px;
    align-items: center;
  }
}

.table-container {
  flex: 1;
  min-height: 0;
  background: #fff;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
