<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="emit('update:visible', $event)"
    :title="t('settings.patchAssignment.recordsTitle', { name: username })"
    width="1200px"
    @open="handleOpen"
    :close-on-click-modal="selectedRecords.length === 0"
    :close-on-press-escape="selectedRecords.length === 0"
  >
    <div style="margin-bottom: 12px; display: flex">
      <el-button type="danger" size="small" @click="handleRevokeAll">
        {{ t('settings.patchAssignment.revokeAll') }}
      </el-button>
      <el-button
        size="small"
        :disabled="selectedRecords.length === 0"
        @click="handleRevokeSelected"
      >
        {{ t('settings.patchAssignment.revokeSelected') }}
      </el-button>
    </div>
    <el-table
      :data="patchRecords"
      v-loading="recordsLoading"
      max-height="calc(100vh - 340px)"
      @selection-change="handleRecordSelectionChange"
    >
      <el-table-column type="selection" width="50" />
      <el-table-column prop="patchId" :label="t('settings.patchAssignment.recordPatchId')" width="180" />
      <el-table-column prop="hostKey" :label="t('settings.patchAssignment.hostIp')" min-width="220" show-overflow-tooltip />
      <el-table-column prop="expireTime" :label="t('settings.user.expiresAt')" width="180">
        <template #default="{ row }">{{ formatDateTime(row.expireTime) || t('settings.patchAssignment.permanent') }}</template>
      </el-table-column>
      <el-table-column prop="remark" :label="t('settings.patchAssignment.notes')" show-overflow-tooltip />
      <el-table-column
        prop="createdTime"
        :label="t('settings.patchAssignment.assignedAt')"
        width="180"
        :formatter="row => formatDateTime(row.createdTime)"
      />
      <el-table-column :label="t('common.actions')" width="100" fixed="right">
        <template #default="{ row }">
          <el-button text type="danger" size="small" @click="handleRevokeSingle(row)">
            {{ t('settings.patchAssignment.revoke') }}
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
import { t } from '@/core/i18n'
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
    ElMessage.error(t('settings.patchAssignment.recordsFailed'))
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
      t('settings.patchAssignment.revokeConfirm', { patch: row.patchId, host: row.hostKey || '-' }),
      t('settings.patchAssignment.notice'),
      { closeOnClickModal: false, closeOnPressEscape: false, type: 'warning' }
    )
    await apiService.delete(`/secops/api/secops/v2/patch/assignment/${row.id}`)
    ElMessage.success(t('settings.patchAssignment.revoked'))
    loadRecords()
    emit('success')
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(t('settings.patchAssignment.revokeFailed'))
  }
}

async function handleRevokeSelected() {
  try {
    await ElMessageBox.confirm(
      t('settings.patchAssignment.batchRevokeConfirm', { count: selectedRecords.value.length }),
      t('settings.patchAssignment.notice'),
      { closeOnClickModal: false, closeOnPressEscape: false, type: 'warning' }
    )

    await Promise.all(
      selectedRecords.value
        .map(item => item.id)
        .filter(Boolean)
        .map(id => apiService.delete(`/secops/api/secops/v2/patch/assignment/${id}`))
    )

    ElMessage.success(t('settings.patchAssignment.batchRevoked'))
    loadRecords()
    emit('success')
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(t('settings.patchAssignment.batchRevokeFailed'))
  }
}

async function handleRevokeAll() {
  try {
    await ElMessageBox.confirm(
      t('settings.patchAssignment.revokeAllConfirm', { name: props.username }),
      t('settings.patchAssignment.warning'),
      {
        closeOnClickModal: false,
        closeOnPressEscape: false,
        type: 'danger'
      }
    )
    await apiService.delete(`/secops/api/secops/v2/patch/assignment/user/${props.username}`)
    ElMessage.success(t('settings.patchAssignment.allRevoked'))
    loadRecords()
    emit('success')
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(t('settings.patchAssignment.revokeFailed'))
  }
}
</script>
