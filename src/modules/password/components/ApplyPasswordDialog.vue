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
    <div class="apply-form" v-loading="loading">
      <!-- 主机选择 -->
      <div class="form-section">
        <div class="section-title">主机</div>
        <div class="section-content">
          <AcmDeviceSelector
            v-model="formData.hosts"
            ci-types="linux"
            :options="{ label: '选择主机' }"
            :disabled="submitting"
          />
        </div>
      </div>

      <!-- 用途 -->
      <div class="form-section">
        <div class="section-title">用途</div>
        <div class="section-content">
          <el-input
            v-model="formData.intention"
            type="textarea"
            :rows="3"
            placeholder="请输入申请用途"
            :disabled="submitting"
          />
        </div>
      </div>

      <!-- 申请用户 -->
      <div class="form-section">
        <div class="section-title">申请用户</div>
        <div class="section-content">
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
        </div>
      </div>

      <!-- 申请时长 -->
      <div class="form-section">
        <div class="section-title">申请时长（小时）</div>
        <div class="section-content">
          <el-input-number
            v-model="formData.effectiveHours"
            :min="0"
            :max="720"
            style="width: 100%"
            :disabled="submitting"
          />
          <div class="input-hint">设置为0表示永久有效</div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" :disabled="submitting">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
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

const formData = reactive({
  hosts: [],
  intention: '',
  username: '',
  effectiveHours: 3,
  id: ''
})

const isEdit = computed(() => !!props.editData?.id)

// 是否可以提交
const canSubmit = computed(() => {
  return formData.hosts.length > 0 &&
         formData.intention.trim() !== '' &&
         formData.username !== ''
})

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    loadUsernameList()
    if (props.editData) {
      fillEditData()
    } else {
      resetForm()
    }
  }
})

watch(visible, (val) => {
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
  if (!canSubmit.value) {
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
    const applyTime = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(/\//g, '-')

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
  resetForm()
}
</script>

<style scoped lang="scss">
.apply-form {
  padding: 10px 0;
  min-height: 200px;
}

.form-section {
  margin-bottom: 20px;
  background: #f8fafc;
  border-radius: 6px;
  overflow: hidden;

  .section-title {
    padding: 10px 16px;
    font-weight: 500;
    color: #1e293b;
    background: #e2e8f0;
    font-size: 14px;
  }

  .section-content {
    padding: 16px;
  }
}

.input-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
