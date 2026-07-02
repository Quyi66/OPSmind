<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="emit('update:visible', $event)"
    :title="`${username} 的补丁分配记录`"
    width="1200px"
    @open="handleOpen"
    :close-on-click-modal="false"
  >
    <div style="margin-bottom: 12px; display: flex">
      <el-button type="danger" size="small" @click="handleRevokeAll">
        撤销该用户所有补丁分配
      </el-button>
      <el-button
        size="small"
        :disabled="selectedRecords.length === 0"
        @click="handleRevokeSelected"
      >
        批量撤销选中记录
      </el-button>
    </div>
    <el-table
      :data="patchRecords"
      v-loading="recordsLoading"
      max-height="calc(100vh - 340px)"
      @selection-change="handleRecordSelectionChange"
    >
      <el-table-column type="selection" width="50" />
      <el-table-column prop="patchId" label="补丁ID" width="180" />
      <el-table-column prop="hostKey" label="主机/IP" min-width="220" show-overflow-tooltip />
      <el-table-column prop="expireTime" label="过期时间" width="180">
        <template #default="{ row }">{{ formatDateTime(row.expireTime) || '永久有效' }}</template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" show-overflow-tooltip />
      <el-table-column
        prop="createdTime"
        label="分配时间"
        width="180"
        :formatter="row => formatDateTime(row.createdTime)"
      />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button text type="danger" size="small" @click="handleRevokeSingle(row)">
            撤销
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="ops-pagination-wrapper" style="margin-top: 12px">
      <el-pagination
        v-model:current-page="recordPage"
        v-model:page-size="recordSize"
        :total="recordTotal"
        layout="total, sizes, prev, pager, next"
        background
        @size-change="loadRecords"
        @current-change="loadRecords"
      />
    </div>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiService } from '@/core/api'
import { formatDateTime } from '@/utils/i18n.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  username: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:visible', 'success'])

const recordsLoading = ref(false)
const patchRecords = ref([])
const selectedRecords = ref([])
const recordPage = ref(1)
const recordSize = ref(10)
const recordTotal = ref(0)

function handleOpen() {
  recordPage.value = 1
  selectedRecords.value = []
  loadRecords()
}

async function loadRecords() {
  if (!props.username) return
  recordsLoading.value = true
  try {
    const res = await apiService.get('/secops/api/secops/v2/patch/assignment/list', {
      params: {
        userLogin: props.username,
        page: recordPage.value - 1, // 后端分页从0开始
        size: recordSize.value
      }
    })
    if (res?.data) {
      patchRecords.value = res.data.content || []
      recordTotal.value = res.data.totalElements || 0
      selectedRecords.value = []
    }
  } catch (e) {
    ElMessage.error('加载记录失败')
  } finally {
    recordsLoading.value = false
  }
}

function handleRecordSelectionChange(val) {
  selectedRecords.value = val
}

async function handleRevokeSingle(row) {
  try {
    await ElMessageBox.confirm(
      `确定撤销补丁 [${row.patchId}] 在主机 [${row.hostKey || '-'}] 上的分配记录吗？`,
      '提示',
      { type: 'warning' }
    )
    await apiService.delete(`/secops/api/secops/v2/patch/assignment/${row.id}`)
    ElMessage.success('撤销成功')
    loadRecords()
    emit('success')
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('撤销失败')
  }
}

async function handleRevokeSelected() {
  try {
    await ElMessageBox.confirm(
      `确定批量撤销选中的 ${selectedRecords.value.length} 条补丁分配记录吗？`,
      '提示',
      { type: 'warning' }
    )

    await Promise.all(
      selectedRecords.value
        .map(item => item.id)
        .filter(Boolean)
        .map(id => apiService.delete(`/secops/api/secops/v2/patch/assignment/${id}`))
    )

    ElMessage.success('批量撤销成功')
    loadRecords()
    emit('success')
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('批量撤销失败')
  }
}

async function handleRevokeAll() {
  try {
    await ElMessageBox.confirm(
      `危险操作：确定要撤销用户 ${props.username} 的【所有】补丁分配吗？`,
      '警告',
      { type: 'danger' }
    )
    await apiService.delete(`/secops/api/secops/v2/patch/assignment/user/${props.username}`)
    ElMessage.success('已撤销所有分配')
    loadRecords()
    emit('success')
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('撤销失败')
  }
}
</script>
