<template>
  <el-dialog
    v-model="visible"
    title="批量修改密码"
    width="650px"
    :close-on-click-modal="false"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
    @close="handleClose"
  >
    <div v-loading="loading" class="batch-modify-content">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
        label-position="top"
        class="modify-form"
      >
        <!-- 设备选择 -->
        <el-form-item label="选择主机" prop="hosts" class="form-section">
          <AcmDeviceSelector
            v-model="formData.hosts"
            ci-types="linux"
            :options="{ label: '选择主机' }"
            :disabled="submitting"
          />
        </el-form-item>

        <!-- 修改方式 -->
        <el-form-item label="修改方式" prop="passwordGenerateMode">
          <el-radio-group v-model="formData.passwordGenerateMode" :disabled="submitting">
            <el-radio value="random">随机生成</el-radio>
            <el-radio value="input">手工输入</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 用户名 -->
        <el-form-item label="用户名称" prop="username">
          <el-input
            v-model="formData.username"
            placeholder="请输入用户名"
            style="width: 100%"
            :disabled="submitting"
            autocomplete="username"
            name="batch_modify_username"
          />
        </el-form-item>

        <!-- 密码 -->
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            placeholder="请输入密码"
            show-password
            autocomplete="new-password"
            name="batch_modify_password"
            :disabled="submitting"
          />
          <div class="hint-text">密码默认长度为8～16位，由数字、大小写字母、~!@$%&_组成</div>
        </el-form-item>

        <!-- 密码过期时间 -->
        <el-form-item label="密码过期时间" prop="effectiveHours">
          <el-input-number
            v-model="formData.effectiveHours"
            :min="0"
            :max="8760"
            placeholder="0表示永久有效"
            style="width: 200px"
            :disabled="submitting"
          />
          <div class="hint-text">
            密码修改成功后的有效时间，单位为小时。超过此时间密码将被重置。如果永久有效，填写0
          </div>
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" :disabled="submitting">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          保存
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { normalizeAcmDeviceJobHosts } from '@/modules/automation/components/job/schedule/components/acmDeviceSelector.utils'
import { apiService } from '@/core/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(props.modelValue)
const loading = ref(false)
const submitting = ref(false)
const formRef = ref(null)

const formData = reactive({
  hosts: [],
  passwordGenerateMode: 'random',
  username: '',
  password: '',
  effectiveHours: 0
})

const formRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, max: 16, message: '密码长度需要8-16位', trigger: 'blur' }
  ]
}

// 是否可以提交：设备参数非空且用户名非空
const canSubmit = computed(() => {
  return formData.hosts.length > 0 && formData.username.trim() !== ''
})

// 构建设备参数，格式与源系统一致
const assestsParam = computed(() => {
  if (!formData.hosts.length) return []
  return normalizeAcmDeviceJobHosts(formData.hosts, 'linux')
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
})

function resetForm() {
  formData.hosts = []
  formData.passwordGenerateMode = 'random'
  formData.username = ''
  formData.password = ''
  formData.effectiveHours = 0
}

async function handleSubmit() {
  if (!canSubmit.value) {
    ElMessage.warning('请选择主机并填写用户名')
    return
  }

  // 手工输入模式需要验证密码
  if (formData.passwordGenerateMode === 'input') {
    if (!formData.password) {
      ElMessage.warning('请输入密码')
      return
    }
    if (formData.password.length < 8 || formData.password.length > 16) {
      ElMessage.warning('密码长度需要8-16位')
      return
    }
  }

  submitting.value = true
  try {
    // 调用作业 u160sB
    await apiService.post(`/jao/api/jao/jobs/u160sB/run?cacheBuster=${Date.now()}`, {
      params: {
        assestsParam: assestsParam.value,
        passwordGenerateMode: formData.passwordGenerateMode || 'input',
        effectiveHours: formData.effectiveHours || 0,
        username: formData.username,
        password: formData.password || ''
      }
    })

    ElMessage.success('批量修改任务已提交')
    emit('success')
    handleClose()
  } catch (error) {
    console.error('Failed to batch modify:', error)
    ElMessage.error(error?.message || '批量修改失败')
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  visible.value = false
}
</script>

<style scoped lang="scss">
.batch-modify-content {
  min-height: 200px;
}

.modify-form {
  padding: 10px 0;

  .form-section {
    margin-bottom: 20px;
  }
}

.hint-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  line-height: 1.4;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
