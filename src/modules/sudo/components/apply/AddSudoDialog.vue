<template>
  <el-dialog
    v-model="visible"
    title="添加用户权限"
    width="700px"
    :close-on-click-modal="false"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      label-position="top"
      class="add-sudo-form"
    >
      <!-- 主机选择 -->
      <el-form-item label="主机" prop="hosts" required>
        <AcmDeviceSelector
          v-model="formData.hosts"
          ci-types="linux"
          :options="{ label: '选择主机' }"
          :disabled="submitting"
          @change="() => formRef?.validateField('hosts')"
        />
      </el-form-item>

      <!-- 有效时长 -->
      <el-form-item label="有效时长">
        <div class="duration-inputs">
          <div class="duration-item">
            <el-input-number
              v-model="formData.days"
              :min="0"
              :max="365"
              size="default"
              :disabled="submitting"
            />
            <span class="duration-label">天</span>
          </div>
          <div class="duration-item">
            <el-input-number
              v-model="formData.hours"
              :min="0"
              :max="23"
              size="default"
              :disabled="submitting"
            />
            <span class="duration-label">小时</span>
          </div>
          <div class="duration-item">
            <el-input-number
              v-model="formData.mins"
              :min="0"
              :max="59"
              size="default"
              :disabled="submitting"
            />
            <span class="duration-label">分钟</span>
          </div>
        </div>
        <div class="form-item-hint">权限的有效期，设置为0表示永久有效</div>
      </el-form-item>

      <!-- 用户 -->
      <el-form-item label="用户" prop="users">
        <el-input v-model="formData.users" placeholder="请输入用户名" :disabled="submitting" />
        <div class="form-item-hint">要添加权限的用户列表，多个用户之间采用逗号、空格、换行分隔</div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" :disabled="submitting">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          确认
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { normalizeAcmDeviceJobHosts } from '@/modules/automation/components/job/schedule/components/acmDeviceSelector.utils'
import * as sudoApi from '@/modules/sudo/api'
import { useJobPolling } from '@/composables/useJobPolling'

// 使用作业轮询 composable
const { startPolling, stopPolling } = useJobPolling()

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const formRef = ref(null)
const visible = ref(props.modelValue)
const submitting = ref(false)

const formData = reactive({
  hosts: [],
  days: 0,
  hours: 0,
  mins: 0,
  users: ''
})

// 表单验证规则
const formRules = {
  hosts: [
    {
      required: true,
      validator: (rule, value, callback) => {
        if (!value || value.length === 0) {
          callback(new Error('请选择主机'))
        } else {
          callback()
        }
      },
      trigger: ['change', 'blur']
    }
  ],
  users: [{ required: true, message: '请输入用户名', trigger: 'blur' }]
}

// 计算 valid_period（分钟数）
const validPeriod = computed(() => {
  return formData.days * 24 * 60 + formData.hours * 60 + formData.mins
})

// 是否可以提交
const canSubmit = computed(() => {
  return formData.hosts.length > 0 && formData.users.trim() !== ''
})

watch(
  () => props.modelValue,
  val => {
    visible.value = val
    if (val) {
      resetForm()
    }
  }
)

watch(visible, val => {
  emit('update:modelValue', val)
  if (!val) {
    stopPolling()
  }
})

function resetForm() {
  formData.hosts = []
  formData.days = 0
  formData.hours = 0
  formData.mins = 0
  formData.users = ''
  // 重置表单验证状态
  formRef.value?.resetFields()
}

async function handleSubmit() {
  // 表单验证
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  submitting.value = true

  try {
    const hosts = normalizeAcmDeviceJobHosts(formData.hosts, 'linux')

    const response = await sudoApi.addSudoPermission({
      hosts,
      users: formData.users,
      valid_period: validPeriod.value
    })

    const result = response?.data || response
    const runResult = Array.isArray(result) ? result[0] : result

    if (runResult?.runId) {
      ElMessage.success('任务已提交成功，正在查询执行结果')
      // 使用 composable 轮询查询执行结果
      startPolling(runResult.runId, {
        interval: 3000,
        onSuccess: () => {
          submitting.value = false
          ElMessage.success('添加成功')
          emit('saved')
          visible.value = false
        },
        onError: () => {
          submitting.value = false
          ElMessage.error('添加失败')
        }
      })
    } else {
      throw new Error('未获取到执行ID')
    }
  } catch (error) {
    console.error('Failed to add sudo permission:', error)
    submitting.value = false
    ElMessage.error('添加失败')
  }
}

function handleClose() {
  if (submitting.value) {
    return
  }
  visible.value = false
  stopPolling()
}
</script>

<style scoped lang="scss">
.add-sudo-form {
  padding: 10px 0;

  :deep(.el-form-item__label) {
    font-weight: 500;
    color: var(--el-text-color-primary);
  }
}

.duration-inputs {
  display: flex;
  gap: 20px;
  align-items: center;
}

.duration-item {
  display: flex;
  align-items: center;
  gap: 8px;

  .duration-label {
    color: var(--el-text-color-regular);
    font-size: 14px;
  }
}

.form-item-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 10px;
}
</style>
