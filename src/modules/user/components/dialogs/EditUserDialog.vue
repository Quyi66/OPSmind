<template>
  <el-dialog
    v-model="visible"
    title="修改用户"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="edit-user-dialog" v-loading="loading">
      <!-- 用户信息显示 -->
      <div class="user-info">
        <p>
          <strong>IP：</strong>
          {{ userData.host_key }}
        </p>
        <p>
          <strong>Hostname：</strong>
          {{ userData.hostname }}
        </p>
      </div>

      <!-- 操作类型选择 -->
      <el-form :model="formData" label-width="120px" class="edit-form">
        <el-form-item label="操作类型">
          <el-radio-group v-model="formData.operate" @change="handleOperateChange">
            <el-radio value="modify_base">修改基本信息</el-radio>
            <el-radio value="lock">锁定/解锁</el-radio>
            <el-radio value="ssh">SSH登录</el-radio>
            <el-radio value="modify_password">修改密码</el-radio>
            <el-radio value="sudo">sudo权限</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="用户名">
          <el-input v-model="formData.username" disabled />
        </el-form-item>

        <!-- 修改基本信息 -->
        <template v-if="formData.operate === 'modify_base'">
          <el-form-item label="附加用户组">
            <el-input
              v-model="formData.user_groups"
              placeholder="多个组名用逗号隔开"
              maxlength="100"
            />
          </el-form-item>
          <el-form-item label="主目录">
            <el-input v-model="formData.user_home" maxlength="256" />
          </el-form-item>
          <el-form-item label="Shell">
            <el-input v-model="formData.user_shell" maxlength="100" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="formData.user_comment" maxlength="200" />
          </el-form-item>
          <el-form-item label="过期时间">
            <el-date-picker
              v-model="formData.user_expires"
              type="date"
              placeholder="选填"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
        </template>

        <!-- 锁定/解锁 -->
        <template v-if="formData.operate === 'lock'">
          <el-form-item label="是否锁定用户">
            <el-radio-group v-model="formData.user_lock">
              <el-radio value="yes">锁定</el-radio>
              <el-radio value="no">解锁</el-radio>
            </el-radio-group>
          </el-form-item>
        </template>

        <!-- SSH登录 -->
        <template v-if="formData.operate === 'ssh'">
          <el-form-item label="允许SSH登录">
            <el-radio-group v-model="formData.user_login">
              <el-radio value="yes">是</el-radio>
              <el-radio value="no">否</el-radio>
            </el-radio-group>
          </el-form-item>
        </template>

        <!-- 修改密码 -->
        <template v-if="formData.operate === 'modify_password'">
          <el-form-item label="新密码" required>
            <el-input
              v-model="formData.user_password"
              type="password"
              show-password
              placeholder="请输入新密码"
              autocomplete="new-password"
              maxlength="32"
            />
          </el-form-item>
        </template>

        <!-- sudo权限 -->
        <template v-if="formData.operate === 'sudo'">
          <el-form-item label="sudo模板">
            <el-select
              v-model="formData.templateId"
              placeholder="选择sudo模板"
              style="width: 100%"
              @change="handleTemplateChange"
            >
              <el-option label="N/A" value="N/A" />
              <el-option
                v-for="tpl in sudoTemplates"
                :key="tpl.id"
                :label="tpl.name"
                :value="tpl.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item v-if="sudoCommands.length" label="sudo命令">
            <el-table :data="sudoCommands" size="small" max-height="200">
              <el-table-column prop="command" label="命令" min-width="200" show-overflow-tooltip />
              <el-table-column prop="description" label="描述" width="150" show-overflow-tooltip />
            </el-table>
          </el-form-item>
        </template>
      </el-form>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ getSubmitButtonText() }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'
import { dtsApi } from '@/modules/asset/api'
import { getSudoTemplates, getSudoCommandsByTemplate } from '@/modules/user/api'
import { useJobPolling } from '@/composables/useJobPolling'

// 使用作业轮询 composable
const { startPolling, stopPolling } = useJobPolling()

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  initialOperate: {
    type: String,
    default: 'modify_base'
  },
  user: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:visible', 'success'])

const visible = computed({
  get: () => props.visible,
  set: val => emit('update:visible', val)
})

const loading = ref(false)
const submitting = ref(false)
const currentStatus = ref('')
const userData = ref({})
const sudoTemplates = ref([])
const sudoCommands = ref([])

// 状态中文映射
const STATUS_MAP = {
  WAITING: '等待中',
  RUNNING: '执行中',
  COMPLETED: '已完成',
  SUCCESS: '已完成',
  FAILED: '失败',
  ERROR: '错误'
}

const formData = reactive({
  operate: 'modify_base',
  username: '',
  user_groups: '',
  user_home: '',
  user_shell: '',
  user_comment: '',
  user_expires: '',
  user_lock: 'no',
  user_login: 'yes',
  user_password: '',
  templateId: 'N/A'
})

// 作业ID映射
const jobIdMap = {
  modify_base: 'EOLAGR',
  lock: '1TKvLB',
  ssh: 'wSVnmq',
  modify_password: 'rbNP8M',
  sudo: 'OHlcdQ'
}

// 监听用户数据变化
watch(
  () => props.user,
  newUser => {
    if (newUser && Object.keys(newUser).length > 0) {
      userData.value = { ...newUser }
      formData.username = newUser.username || ''
      formData.user_groups = newUser.secondary_group || ''
      formData.user_home = newUser.home || ''
      formData.user_shell = newUser.shell || ''
      formData.user_comment = newUser.comment || ''
      formData.user_expires = newUser.expired_date || ''

      if (props.visible) {
        applyOperatePreset()
      }
    }
  },
  { immediate: true }
)

// 监听弹窗显示
watch(
  () => props.visible,
  val => {
    if (val) {
      applyOperatePreset()
      loadSudoTemplates()
    }
  }
)

function applyOperatePreset() {
  const allowedOperateSet = new Set(['modify_base', 'lock', 'ssh', 'modify_password', 'sudo'])
  formData.operate = allowedOperateSet.has(props.initialOperate)
    ? props.initialOperate
    : 'modify_base'

  if (formData.operate === 'lock') {
    formData.user_lock = Number(userData.value?.lock_status) === 1 ? 'no' : 'yes'
  }
}

// 操作类型变化
function handleOperateChange() {
  // 重置相关字段
  formData.templateId = 'N/A'
  sudoCommands.value = []
}

// 获取提交按钮文字
function getSubmitButtonText() {
  if (submitting.value && currentStatus.value) {
    return STATUS_MAP[currentStatus.value] || currentStatus.value
  }
  if (submitting.value) {
    return '提交中...'
  }
  const textMap = {
    modify_base: '保存',
    lock: '确认',
    ssh: '确认',
    modify_password: '修改密码',
    sudo: '保存sudo权限'
  }
  return textMap[formData.operate] || '确认'
}

// 加载sudo模板
async function loadSudoTemplates() {
  try {
    const response = await getSudoTemplates({ page: 1, size: 1000 })
    sudoTemplates.value = response?.data?.records || response?.records || []
  } catch (error) {
    console.error('加载sudo模板失败:', error)
  }
}

// 处理模板变化
async function handleTemplateChange(templateId) {
  if (!templateId || templateId === 'N/A') {
    sudoCommands.value = []
    return
  }
  try {
    const response = await getSudoCommandsByTemplate(templateId, { page: 1, size: 1000 })
    sudoCommands.value = response?.data?.records || response?.records || []
  } catch (error) {
    console.error('加载sudo命令失败:', error)
    sudoCommands.value = []
  }
}

// 提交
async function handleSubmit() {
  // 修改密码需要验证
  if (formData.operate === 'modify_password' && !formData.user_password) {
    ElMessage.warning('请输入新密码')
    return
  }

  submitting.value = true
  currentStatus.value = ''

  try {
    const jobId = jobIdMap[formData.operate]
    const hostId = userData.value.host_id || userData.value.id
    const params = buildParams(hostId)

    const cacheBuster = Date.now()
    const { data } = await apiService.post(
      `/workflow/api/workflow/jobs/${jobId}/run?cacheBuster=${cacheBuster}`,
      {
        params
      }
    )

    const result = Array.isArray(data) ? data[0] : data
    currentStatus.value = result?.status || ''

    // 提交成功，提示用户可以关闭
    ElMessage.success('任务已提交，后台正在执行，可关闭此窗口')

    if (result?.status === 'WAITING' || result?.status === 'RUNNING') {
      // 使用 composable 开始轮询
      startPolling(result.runId, {
        interval: 5000,
        maxAttempts: 60,
        showMessage: false,
        onProgress: res => {
          const batchInfo = res?.detail?.batches?.[0]
          currentStatus.value = batchInfo?.status || res.status || currentStatus.value
        },
        onSuccess: () => {
          submitting.value = false
          currentStatus.value = ''
          ElMessage.success('操作成功')
          emit('success')
          handleClose()
        },
        onError: res => {
          submitting.value = false
          currentStatus.value = ''
          ElMessage.error(res?.error || '操作失败')
          emit('success')
          handleClose()
        },
        onTimeout: () => {
          submitting.value = false
          currentStatus.value = ''
          ElMessage.warning('操作超时，请稍后查看结果')
          emit('success')
          handleClose()
        }
      })
    } else if (result?.status === 'COMPLETED' || result?.status === 'SUCCESS') {
      submitting.value = false
      currentStatus.value = ''
      ElMessage.success('操作成功')
      emit('success')
      handleClose()
    } else if (result?.status === 'FAILED' || result?.status === 'ERROR') {
      submitting.value = false
      currentStatus.value = ''
      ElMessage.error(result?.error || '操作失败')
      emit('success')
      handleClose()
    } else {
      submitting.value = false
      currentStatus.value = ''
      ElMessage.success('操作已提交')
    }
  } catch (error) {
    submitting.value = false
    currentStatus.value = ''
    console.error('执行失败:', error)
    ElMessage.error(`执行失败: ${error?.message || '未知错误'}`)
  }
}

// 构建参数
function buildParams(hostId) {
  const base = {
    user_name: formData.username,
    hosts: hostId
  }

  switch (formData.operate) {
    case 'modify_base':
      return {
        ...base,
        user_groups: formData.user_groups || '',
        user_home: formData.user_home || '',
        user_shell: formData.user_shell || '',
        user_comment: formData.user_comment || '',
        user_expires: formData.user_expires || ''
      }
    case 'lock':
      return {
        ...base,
        user_lock: formData.user_lock
      }
    case 'ssh':
      return {
        ...base,
        user_login: formData.user_login
      }
    case 'modify_password':
      return {
        ...base,
        user_password: formData.user_password
      }
    case 'sudo':
      return {
        ...base,
        user_sudo_command: sudoCommands.value.map(c => c.command).join(',')
      }
    default:
      return base
  }
}

// 关闭弹窗
function handleClose() {
  stopPolling()
  visible.value = false
  formData.operate = 'modify_base'
  formData.user_password = ''
  formData.templateId = 'N/A'
  sudoCommands.value = []
}
</script>

<style scoped lang="scss">
.edit-user-dialog {
  max-height: 60vh;
  overflow-y: auto;
}

.user-info {
  background: var(--el-color-primary-light-9);
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid var(--el-color-primary-light-8);

  p {
    margin: 4px 0;
    font-size: 14px;
    color: var(--el-text-color-primary);
  }
}

.edit-form {
  :deep(.el-radio-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
