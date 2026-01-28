<template>
  <el-dialog
    v-model="visible"
    title="密码策略设置"
    width="500px"
    :close-on-click-modal="false"
    :close-on-press-escape="!saving"
    :show-close="!saving"
    @close="handleClose"
  >
    <div class="password-policy-form" v-loading="loading">
      <!-- 密码长度 -->
      <div class="form-row">
        <label class="form-label">密码长度</label>
        <div class="form-control">
          <el-input-number
            v-model="formData.passwd_length"
            :min="minPasswordLength"
            :max="32"
            :disabled="saving"
            @change="onPasswordLengthChange"
          />
        </div>
      </div>

      <!-- 最少小写字母数 -->
      <div class="form-row">
        <label class="form-label">最少小写字母数</label>
        <div class="form-control">
          <el-input-number
            v-model="formData.lcredit"
            :min="0"
            :max="maxCharTypeValue"
            :disabled="saving"
          />
        </div>
      </div>

      <!-- 最少大写字母数 -->
      <div class="form-row">
        <label class="form-label">最少大写字母数</label>
        <div class="form-control">
          <el-input-number
            v-model="formData.ucredit"
            :min="0"
            :max="maxCharTypeValue"
            :disabled="saving"
          />
        </div>
      </div>

      <!-- 最少数字个数 -->
      <div class="form-row">
        <label class="form-label">最少数字个数</label>
        <div class="form-control">
          <el-input-number
            v-model="formData.dcredit"
            :min="0"
            :max="maxCharTypeValue"
            :disabled="saving"
          />
        </div>
      </div>

      <!-- 最少特殊符号数 -->
      <div class="form-row">
        <label class="form-label">最少特殊符号数</label>
        <div class="form-control">
          <el-input-number
            v-model="formData.ocredit"
            :min="0"
            :max="maxCharTypeValue"
            :disabled="saving"
          />
          <div class="form-hint">特殊符号：~!@#$%^&*?</div>
        </div>
      </div>

      <!-- 验证提示 -->
      <div v-if="validationError" class="validation-error">
        <i class="fa fa-exclamation-triangle"></i>
        {{ validationError }}
      </div>
      <div v-else class="validation-info">
        <i class="fa fa-info-circle"></i>
        当前字符要求总和：{{ totalCharRequirements }} / {{ formData.passwd_length }}
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" :disabled="saving">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          :disabled="!canSave"
          @click="handleSave"
        >
          保存
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as sudoApi from '@/modules/sudo/api'
import { useJobPolling } from '@/composables/useJobPolling'

const { startPolling, stopPolling } = useJobPolling()

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = ref(props.modelValue)
const loading = ref(false)
const saving = ref(false)

const formData = reactive({
  passwd_length: 8,
  lcredit: 1,
  ucredit: 1,
  dcredit: 1,
  ocredit: 1
})

// 计算各字符类型要求的最大值
const maxCharTypeValue = computed(() => {
  return Math.max(0, formData.passwd_length)
})

// 计算所有字符要求的总和
const totalCharRequirements = computed(() => {
  return formData.lcredit + formData.ucredit + formData.dcredit + formData.ocredit
})

// 密码长度的最小值
const minPasswordLength = computed(() => {
  return Math.max(1, totalCharRequirements.value)
})

// 验证错误信息
const validationError = computed(() => {
  if (formData.passwd_length < 1) {
    return '密码长度必须至少为1'
  }
  if (totalCharRequirements.value > formData.passwd_length) {
    return `字符要求总和(${totalCharRequirements.value})不能超过密码长度(${formData.passwd_length})`
  }
  return ''
})

// 是否可以保存
const canSave = computed(() => {
  return formData.ocredit >= 0 &&
         formData.dcredit >= 0 &&
         formData.ucredit >= 0 &&
         formData.lcredit >= 0 &&
         formData.passwd_length >= 1 &&
         !validationError.value
})

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    loadConfig()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
  if (!val) {
    stopPolling()
  }
})

// 当密码长度改变时，调整各字符要求不超过新的密码长度
function onPasswordLengthChange(newLength) {
  if (formData.lcredit > newLength) formData.lcredit = newLength
  if (formData.ucredit > newLength) formData.ucredit = newLength
  if (formData.dcredit > newLength) formData.dcredit = newLength
  if (formData.ocredit > newLength) formData.ocredit = newLength
}

async function loadConfig() {
  loading.value = true
  try {
    const response = await sudoApi.getSystemParams()
    const result = response?.data || response
    const records = result?.records || []

    const configItem = records.find(r => r.name === 'password_complexity')
    if (configItem) {
      const config = JSON.parse(configItem.value)
      formData.passwd_length = config.passwd_length || 8
      formData.lcredit = config.lcredit || 0
      formData.ucredit = config.ucredit || 0
      formData.dcredit = config.dcredit || 0
      formData.ocredit = config.ocredit || 0
    }
  } catch (error) {
    console.error('Failed to load config:', error)
    ElMessage.error('加载配置失败')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (!canSave.value) {
    ElMessage.warning('请填写有效的配置值')
    return
  }

  saving.value = true

  try {
    const response = await sudoApi.savePasswordComplexity({
      ocredit: formData.ocredit,
      dcredit: formData.dcredit,
      ucredit: formData.ucredit,
      lcredit: formData.lcredit,
      passwd_length: formData.passwd_length
    })

    const result = response?.data || response
    const runResult = Array.isArray(result) ? result[0] : result

    // 处理直接返回执行结果的情况
    if (runResult?.status === 'COMPLETED' || runResult?.status === 'SUCCESS') {
      saving.value = false
      ElMessage.success('配置保存成功')
      emit('saved')
      visible.value = false
    } else if (runResult?.status === 'FAILED' || runResult?.error) {
      saving.value = false
      ElMessage.error(runResult?.error || '配置保存失败')
    } else if (runResult?.runId) {
      ElMessage.info('任务已提交，正在查询执行结果')
      startPolling(runResult.runId, {
        interval: 3000,
        onSuccess: () => {
          saving.value = false
          ElMessage.success('配置保存成功')
          emit('saved')
          visible.value = false
        },
        onError: () => {
          saving.value = false
          ElMessage.error('配置保存失败')
        }
      })
    } else {
      saving.value = false
      ElMessage.success('配置保存成功')
      emit('saved')
      visible.value = false
    }
  } catch (error) {
    console.error('Failed to save config:', error)
    saving.value = false
    ElMessage.error('保存失败')
  }
}

function handleClose() {
  if (saving.value) {
    return
  }
  visible.value = false
  stopPolling()
}
</script>

<style scoped lang="scss">
.password-policy-form {
  padding: 10px 0;
  min-height: 200px;
}

.form-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 20px;

  .form-label {
    width: 120px;
    padding-top: 8px;
    font-weight: 500;
    color: #334155;
    font-size: 14px;
    flex-shrink: 0;
  }

  .form-control {
    flex: 1;
  }
}

.form-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #94a3b8;
}

.validation-error {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;

  i {
    color: #ef4444;
  }
}

.validation-info {
  margin-top: 16px;
  padding: 12px 16px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  color: #1d4ed8;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;

  i {
    color: #3b82f6;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 10px;
}
</style>
