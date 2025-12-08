<template>
  <el-dialog
    v-model="visible"
    title="创建用户组"
    width="700px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
    >
      <!-- 选择主机 -->
      <el-form-item label="选择主机" required>
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

      <!-- 组名 -->
      <el-form-item label="组名" prop="group_name" required>
        <el-input v-model="formData.group_name" placeholder="输入用户组名称" />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          <i class="fa fa-plus" v-if="!submitting"></i>
          {{ submitting ? '创建中...' : '创建用户组' }}
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
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import AcmDeviceSelectorDialog from '@/modules/automation/components/job/schedule/components/AcmDeviceSelectorDialog.vue'

const props = defineProps({
  visible: { type: Boolean, default: false }
})

const emit = defineEmits(['update:visible', 'success'])

const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const formRef = ref(null)
const showDeviceSelector = ref(false)
const selectedHosts = ref([])
const submitting = ref(false)

const formData = reactive({
  group_name: ''
})

const formRules = {
  group_name: [{ required: true, message: '请输入组名', trigger: 'blur' }]
}

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
  if (!selectedHosts.value.length) {
    ElMessage.warning('请先选择主机')
    return
  }

  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    const hostKeys = selectedHosts.value.map(h => h.host_key || h.ip).join(',')
    // 作业 ID: zrYK7K
    console.log('创建用户组, 作业 zrYK7K:', { group_name: formData.group_name, hosts: hostKeys })

    await new Promise(resolve => setTimeout(resolve, 1000))

    ElMessage.success('用户组创建任务已提交')
    emit('success')
    handleClose()
  } catch (error) {
    ElMessage.error('创建失败: ' + (error?.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  visible.value = false
  formRef.value?.resetFields()
  selectedHosts.value = []
  formData.group_name = ''
}
</script>

<style scoped lang="scss">
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
