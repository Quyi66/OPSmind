<template>
  <el-dialog
    v-model="visible"
    title="删除用户组"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="delete-group-dialog">
      <el-alert type="warning" :closable="false" show-icon class="mb-4">
        <template #title>警告：删除用户组操作不可逆，请谨慎操作！</template>
      </el-alert>

      <!-- 单个删除 -->
      <template v-if="groupData">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="主机IP">{{ groupData.host_key }}</el-descriptions-item>
          <el-descriptions-item label="主机名">{{ groupData.hostname }}</el-descriptions-item>
          <el-descriptions-item label="组名">{{ groupData.group_name }}</el-descriptions-item>
        </el-descriptions>
      </template>

      <!-- 批量删除 -->
      <template v-else>
        <el-form label-width="100px">
          <el-form-item label="选择主机">
            <div class="host-selector-row">
              <el-button type="primary" plain size="small" @click="showDeviceSelector = true">
                <i class="fa fa-plus"></i> 选择设备
              </el-button>
              <span class="host-count" v-if="selectedHosts.length">
                已选择 <strong>{{ selectedHosts.length }}</strong> 台主机
              </span>
            </div>
            <div class="selected-hosts" v-if="selectedHosts.length">
              <el-tag
                v-for="host in selectedHosts"
                :key="host.id || host.host_key"
                closable
                size="small"
                @close="removeHost(host)"
              >
                {{ host.host_key || host.ip }}
              </el-tag>
            </div>
          </el-form-item>

          <el-form-item label="组名" required>
            <el-input v-model="groupName" placeholder="输入要删除的用户组名称" />
          </el-form-item>
        </el-form>
      </template>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="handleSubmit">
          <i class="fa fa-minus-circle" v-if="!submitting"></i>
          {{ submitting ? '删除中...' : '确认删除' }}
        </el-button>
      </div>
    </template>

    <!-- 设备选择器 -->
    <AcmDeviceSelectorDialog
      v-model="showDeviceSelector"
      :ci-types="'linux'"
      :initial-selection="selectedHosts"
      @confirm="handleDeviceConfirm"
    />
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AcmDeviceSelectorDialog from '@/modules/automation/components/job/schedule/components/AcmDeviceSelectorDialog.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  groupData: { type: Object, default: null }
})

const emit = defineEmits(['update:visible', 'success'])

const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const showDeviceSelector = ref(false)
const selectedHosts = ref([])
const groupName = ref('')
const submitting = ref(false)

watch(() => props.groupData, (val) => {
  if (val) {
    groupName.value = val.group_name || ''
  }
})

function handleDeviceConfirm(hosts) {
  selectedHosts.value = hosts || []
  showDeviceSelector.value = false
}

function removeHost(host) {
  const index = selectedHosts.value.findIndex(
    h => (h.id || h.host_key) === (host.id || host.host_key)
  )
  if (index > -1) selectedHosts.value.splice(index, 1)
}

async function handleSubmit() {
  let hosts, gName

  if (props.groupData) {
    hosts = props.groupData.host_key
    gName = props.groupData.group_name
  } else {
    if (!selectedHosts.value.length) {
      ElMessage.warning('请先选择主机')
      return
    }
    if (!groupName.value) {
      ElMessage.warning('请输入组名')
      return
    }
    hosts = selectedHosts.value.map(h => h.host_key || h.ip).join(',')
    gName = groupName.value
  }

  submitting.value = true
  try {
    console.log('删除用户组:', { hosts, group_name: gName })

    await new Promise(resolve => setTimeout(resolve, 1000))

    ElMessage.success('用户组删除任务已提交')
    emit('success')
    handleClose()
  } catch (error) {
    ElMessage.error('删除失败: ' + (error?.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  visible.value = false
  selectedHosts.value = []
  groupName.value = ''
}
</script>

<style scoped lang="scss">
.delete-group-dialog {
  .mb-4 { margin-bottom: 16px; }
}

.host-selector-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.host-count {
  font-size: 13px;
  color: #64748b;
  strong { color: #3b82f6; }
}

.selected-hosts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 100px;
  overflow-y: auto;
  padding: 8px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
