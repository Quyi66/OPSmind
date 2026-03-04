<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑临时密码申请' : '申请临时密码'"
    width="650px"
    :close-on-click-modal="false"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      v-loading="loading"
    >
      <!-- 主机选择 -->
      <el-form-item label="主机" prop="hosts">
        <AcmDeviceSelector
          v-model="formData.hosts"
          ci-types="linux"
          :options="{ label: '选择主机' }"
          :disabled="submitting"
        />
      </el-form-item>

      <!-- 用途 -->
      <el-form-item label="用途" prop="intention">
        <el-input
          v-model="formData.intention"
          type="textarea"
          :rows="3"
          placeholder="请输入申请用途"
          :disabled="submitting"
        />
      </el-form-item>

      <!-- 申请用户 -->
      <el-form-item label="申请用户" prop="username">
        <el-select
          v-model="formData.username"
          placeholder="请选择用户"
          style="width: 100%"
          :disabled="submitting"
          filterable
          allow-create
        >
          <el-option
            v-for="item in usernameOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <!-- 申请时长 -->
      <el-form-item label="申请时长(小时)" prop="effectiveHours">
        <div style="width: 100%">
          <el-input-number
            v-model="formData.effectiveHours"
            :min="0"
            :max="720"
            style="width: 100%"
            :disabled="submitting"
          />
          <div class="input-hint">设置为0表示永久有效</div>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" :disabled="submitting">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          <i class="fa fa-check" v-if="!submitting"></i>
          提交
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import * as pmsApi from '@/modules/password/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  editData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = ref(props.modelValue)
const loading = ref(false)
const submitting = ref(false)
const usernameOptions = ref([])
const formRef = ref(null)

const formData = reactive({
  hosts: [],
  intention: '',
  username: '',
  effectiveHours: 3,
  id: ''
})

// 表单验证规则
const formRules = {
  hosts: [
    {
      type: 'array',
      required: true,
      message: '请选择主机',
      trigger: ['change', 'blur'],
      validator: (rule, value, callback) => {
        if (!value || value.length === 0) {
          callback(new Error('请选择主机'))
        } else {
          callback()
        }
      }
    }
  ],
  intention: [
    { required: true, message: '请输入申请用途', trigger: 'blur' },
    { min: 1, max: 500, message: '用途长度在1到500个字符之间', trigger: 'blur' }
  ],
  username: [{ required: true, message: '请选择用户', trigger: 'change' }],
  effectiveHours: [{ required: true, message: '请输入申请时长', trigger: 'blur' }]
}

const isEdit = computed(() => !!props.editData?.id)

// 监听主机变化，自动清除验证错误
watch(
  () => formData.hosts,
  newVal => {
    if (newVal && newVal.length > 0 && formRef.value) {
      // 清除主机字段的验证错误
      formRef.value.clearValidate('hosts')
    }
  },
  { deep: true }
)

watch(
  () => props.modelValue,
  val => {
    visible.value = val
    if (val) {
      loadUsernameList()
      if (props.editData) {
        fillEditData()
      } else {
        resetForm()
      }
    }
  }
)

watch(visible, val => {
  emit('update:modelValue', val)
})

function resetForm() {
  formData.hosts = []
  formData.intention = ''
  formData.username = ''
  formData.effectiveHours = 3
  formData.id = ''
}

function fillEditData() {
  if (props.editData) {
    formData.intention = props.editData.intention || ''
    formData.username = props.editData.username || ''
    formData.effectiveHours = props.editData.effective_hours || 3
    formData.id = props.editData.id || ''
    // hosts需要从hostKeys解析
    // TODO: 根据实际数据结构处理
  }
}

async function loadUsernameList() {
  loading.value = true
  try {
    const response = await pmsApi.getUsernameList()
    const result = response?.data || response
    const records = result?.records || []
    usernameOptions.value = records.map(r => ({
      label: r.label || r.value || r,
      value: r.value || r.label || r
    }))
  } catch (error) {
    console.error('Failed to load username list:', error)
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  // 先进行表单验证
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch (error) {
    ElMessage.warning('请填写完整信息')
    return
  }

  submitting.value = true

  try {
    // 提取主机信息
    const assestsParam = formData.hosts.map(h => ({
      key: h.key || h.value || h,
      value: h.value || h.key || h,
      assetType: h.assetType || 'linux'
    }))

    // 获取当前时间
    const now = new Date()
    const applyTime = now
      .toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
      .replace(/\//g, '-')

    await pmsApi.createApplication({
      applicantLogin: 'admin', // TODO: 从全局状态获取
      applicantName: '管理员', // TODO: 从全局状态获取
      applyTime,
      assestsParam,
      intention: formData.intention,
      effectiveHours: formData.effectiveHours,
      username: formData.username,
      id: formData.id
    })

    ElMessage.success(isEdit.value ? '修改成功' : '申请成功')
    emit('saved')
    handleClose()
  } catch (error) {
    console.error('Failed to submit application:', error)
    ElMessage.error('提交失败')
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  visible.value = false
  // 重置表单验证状态
  if (formRef.value) {
    formRef.value.resetFields()
  }
  resetForm()
}
</script>

<style scoped lang="scss">
.input-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
