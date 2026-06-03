<template>
  <el-dialog
    v-model="visibleModel"
    title="补丁回滚确认"
    width="780px"
    destroy-on-close
    append-to-body
    :close-on-click-modal="false"
  >
    <p>确认回滚以下 {{ selectedRows.length }} 条记录？</p>

    <div class="win-patch-confirm-table">
      <el-table :data="selectedRows" max-height="360" border size="small">
        <el-table-column label="主机" width="160">
          <template #default="{ row }">
            {{ pickValue(row, ['hostKey', 'host_key'], '-') }}
          </template>
        </el-table-column>
        <el-table-column label="KB 编号" width="140">
          <template #default="{ row }">
            {{ pickValue(row, ['kbNumber', 'kb_number'], '-') }}
          </template>
        </el-table-column>
        <el-table-column label="标题" min-width="280" show-overflow-tooltip>
          <template #default="{ row }">
            {{ pickValue(row, ['title'], '-') }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="win-patch-confirm-reboot">
      <el-form-item label="重启策略">
        <el-select v-model="reboot" style="width: 180px">
          <el-option label="安装后不重启" value="no" />
          <el-option label="安装后重启" value="yes" />
        </el-select>
      </el-form-item>
    </div>

    <template #footer>
      <el-button
        type="danger"
        text
        :loading="deleting"
        @click="handleDeleteHistory"
      >
        删除记录
      </el-button>
      <el-button @click="visibleModel = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleConfirm">
        确认回滚
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'
import { pickValue } from '../utils'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  selectedRows: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'submitted'])

const visibleModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const reboot = ref('no')
const submitting = ref(false)
const deleting = ref(false)

function extractIds() {
  return props.selectedRows
    .map(row => pickValue(row, ['id'], ''))
    .filter(Boolean)
}

async function handleConfirm() {
  const ids = extractIds()

  if (ids.length === 0) {
    ElMessage.warning('未选中有效记录')
    return
  }

  submitting.value = true
  try {
    await apiService.post('/vap/api/vap/win/patch/rollback', ids, {
      params: { reboot: reboot.value }
    })
    ElMessage.success('回滚请求已提交')
    emit('submitted')
    visibleModel.value = false
  } catch {
    ElMessage.error('回滚请求失败')
  } finally {
    submitting.value = false
  }
}

async function handleDeleteHistory() {
  const ids = extractIds()

  if (ids.length === 0) {
    ElMessage.warning('未选中有效记录')
    return
  }

  deleting.value = true
  try {
    await apiService.delete('/vap/api/vap/win/patch/rollback/history/windows', {
      data: ids
    })
    ElMessage.success('记录已删除')
    emit('submitted')
    visibleModel.value = false
  } catch {
    ElMessage.error('删除记录失败')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped lang="scss">
.win-patch-confirm-table {
  margin: 12px 0;
}

.win-patch-confirm-reboot {
  margin-top: 12px;
}
</style>
