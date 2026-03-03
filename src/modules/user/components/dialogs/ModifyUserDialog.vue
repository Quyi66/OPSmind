<template>
  <el-dialog
    v-model="visible"
    title="修改用户"
    width="800px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="formData" label-width="120px" class="modify-user-form">
      <!-- 选择主机 -->
      <el-form-item label="选择主机" required>
        <AcmDeviceSelector
          v-model="selectedHosts"
          ci-types="linux"
          :options="{
            selectMode: 'host,group,tag,input,recently',
            selector: 'multiple',
            label: '选择设备'
          }"
        />
      </el-form-item>

      <!-- 操作类型选择 -->
      <el-form-item label="操作类型">
        <el-radio-group v-model="formData.operate" @change="handleOperateChange">
          <el-radio value="modify_base">修改基本信息</el-radio>
          <el-radio value="delete">删除用户</el-radio>
          <el-radio value="lock">锁定/解锁</el-radio>
          <el-radio value="ssh">SSH设置</el-radio>
          <el-radio value="modify_password">修改密码</el-radio>
          <el-radio value="sudo">sudo权限</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- 用户名 -->
      <el-form-item label="用户名" required>
        <el-input v-model="formData.username" placeholder="要修改的用户名" maxlength="32" />
      </el-form-item>

      <!-- ========== 修改基本信息 ========== -->
      <template v-if="formData.operate === 'modify_base'">
        <el-form-item label="附加用户组">
          <el-input
            v-model="formData.user_groups"
            placeholder="多个组名用逗号隔开"
            maxlength="100"
          />
        </el-form-item>
        <el-form-item label="主目录">
          <el-input v-model="formData.user_home" placeholder="用户主目录" maxlength="256" />
        </el-form-item>
        <el-form-item label="Shell">
          <el-input v-model="formData.user_shell" placeholder="默认Shell" maxlength="100" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="formData.user_comment" placeholder="用户备注" maxlength="200" />
        </el-form-item>
        <el-form-item label="过期时间">
          <el-date-picker
            v-model="formData.user_expires"
            type="date"
            placeholder="选择过期时间"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
      </template>

      <!-- ========== 删除用户 ========== -->
      <template v-if="formData.operate === 'delete'">
        <el-form-item label="删除主目录">
          <el-radio-group v-model="formData.user_remove_home">
            <el-radio value="yes">是，同时删除用户主目录</el-radio>
            <el-radio value="no">否，保留用户主目录</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-alert type="warning" :closable="false" show-icon>
          <template #title>警告：删除用户操作不可逆，请谨慎操作！</template>
        </el-alert>
      </template>

      <!-- ========== 锁定/解锁 ========== -->
      <template v-if="formData.operate === 'lock'">
        <el-form-item label="锁定用户">
          <el-radio-group v-model="formData.user_lock">
            <el-radio value="yes">锁定用户</el-radio>
            <el-radio value="no">解锁用户</el-radio>
          </el-radio-group>
        </el-form-item>
      </template>

      <!-- ========== SSH设置 ========== -->
      <template v-if="formData.operate === 'ssh'">
        <el-form-item label="SSH登录">
          <el-radio-group v-model="formData.user_login">
            <el-radio value="yes">允许SSH登录</el-radio>
            <el-radio value="no">禁止SSH登录</el-radio>
          </el-radio-group>
        </el-form-item>
      </template>

      <!-- ========== 修改密码 ========== -->
      <template v-if="formData.operate === 'modify_password'">
        <el-form-item label="新密码" required>
          <el-input
            v-model="formData.user_password"
            type="password"
            show-password
            placeholder="输入新密码"
            autocomplete="new-password"
            maxlength="32"
          />
        </el-form-item>
      </template>

      <!-- ========== sudo权限 ========== -->
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
            <el-table-column type="selection" width="50" />
            <el-table-column prop="command" label="命令" min-width="200" show-overflow-tooltip />
            <el-table-column prop="description" label="描述" width="150" show-overflow-tooltip />
          </el-table>
        </el-form-item>
      </template>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">
          <i class="fa fa-times"></i>
          取消
        </el-button>
        <el-button
          :type="formData.operate === 'delete' ? 'danger' : 'primary'"
          :loading="submitting"
          @click="handleSubmit"
        >
          <i :class="getSubmitIcon()" v-if="!submitting"></i>
          {{ submitting ? '执行中...' : getSubmitLabel() }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import * as userApi from '@/modules/user/api'
import { useJobPolling } from '@/composables/useJobPolling'

// 使用作业轮询 composable
const { startPolling, stopPolling } = useJobPolling()

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'success'])

const visible = computed({
  get: () => props.visible,
  set: val => emit('update:visible', val)
})

const formRef = ref(null)
const showDeviceSelector = ref(false)
const selectedHosts = ref([])
const submitting = ref(false)
const currentStatus = ref('')
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
  // modify_base
  user_groups: '',
  user_home: '',
  user_shell: '',
  user_comment: '',
  user_expires: '',
  // delete
  user_remove_home: 'yes',
  // lock
  user_lock: 'no',
  // ssh
  user_login: 'yes',
  // password
  user_password: '',
  // sudo
  templateId: 'N/A'
})

// 作业ID映射
const jobIdMap = {
  modify_base: 'EOLAGR',
  delete: '5XLCC1',
  lock: '1TKvLB',
  ssh: 'wSVnmq',
  modify_password: 'rbNP8M',
  sudo: 'OHlcdQ'
}

// 获取提交按钮标签
function getSubmitLabel() {
  if (submitting.value && currentStatus.value) {
    return STATUS_MAP[currentStatus.value] || currentStatus.value
  }
  if (submitting.value) {
    return '提交中...'
  }
  const labels = {
    modify_base: '修改基本信息',
    delete: '删除用户',
    lock: formData.user_lock === 'yes' ? '锁定用户' : '解锁用户',
    ssh: '保存SSH设置',
    modify_password: '修改密码',
    sudo: '保存sudo权限'
  }
  return labels[formData.operate] || '执行'
}

// 获取提交按钮图标
function getSubmitIcon() {
  const icons = {
    modify_base: 'fa fa-running',
    delete: 'fa fa-user-alt-slash',
    lock: 'fa fa-running',
    ssh: 'fa fa-running',
    modify_password: 'fa fa-running',
    sudo: 'fa fa-running'
  }
  return icons[formData.operate] || 'fa fa-running'
}

// 加载sudo模板
async function loadSudoTemplates() {
  try {
    const response = await userApi.getSudoTemplates()
    sudoTemplates.value = response?.records || response?.data?.records || []
  } catch (error) {
    console.error('Failed to load sudo templates:', error)
  }
}

// 处理操作类型变化
function handleOperateChange() {
  // 切换到sudo时加载模板
  if (formData.operate === 'sudo' && !sudoTemplates.value.length) {
    loadSudoTemplates()
  }
}

// 处理模板选择变化
async function handleTemplateChange(templateId) {
  if (!templateId || templateId === 'N/A') {
    sudoCommands.value = []
    return
  }
  try {
    const response = await userApi.getSudoCommandsByTemplate(templateId)
    sudoCommands.value = response?.records || response?.data?.records || []
  } catch (error) {
    console.error('Failed to load sudo commands:', error)
    sudoCommands.value = []
  }
}

// 处理设备选择确认
function handleDeviceConfirm(hosts) {
  selectedHosts.value = hosts || []
  showDeviceSelector.value = false
}

// 移除主机
function removeHost(host) {
  const index = selectedHosts.value.findIndex(
    h => (h.id || h.host_key) === (host.id || host.host_key)
  )
  if (index > -1) {
    selectedHosts.value.splice(index, 1)
  }
}

// 提交表单
async function handleSubmit() {
  if (!selectedHosts.value.length) {
    ElMessage.warning('请先选择主机')
    return
  }

  if (!formData.username) {
    ElMessage.warning('请输入用户名')
    return
  }

  if (formData.operate === 'modify_password' && !formData.user_password) {
    ElMessage.warning('请输入新密码')
    return
  }

  submitting.value = true
  currentStatus.value = ''

  try {
    const hosts = selectedHosts.value.map(h => ({
      key: h.key || h.id,
      value: h.value || h.ip || h.host_key,
      assetType: h.assetType || h.ciType || 'linux'
    }))
    const hostsJson = JSON.stringify(hosts)
    const jobId = jobIdMap[formData.operate]

    // 构建作业参数
    let jobParams = {
      user_name: formData.username,
      hosts: hostsJson
    }

    switch (formData.operate) {
      case 'modify_base':
        jobParams = {
          ...jobParams,
          user_groups: formData.user_groups,
          user_home: formData.user_home,
          user_shell: formData.user_shell,
          user_comment: formData.user_comment,
          user_expires: formData.user_expires
        }
        break
      case 'delete':
        jobParams.user_remove_home = formData.user_remove_home
        break
      case 'lock':
        jobParams.user_lock = formData.user_lock
        break
      case 'ssh':
        jobParams.user_login = formData.user_login
        break
      case 'modify_password':
        jobParams.user_password = formData.user_password
        break
      case 'sudo':
        jobParams.user_sudo_command = sudoCommands.value.map(c => c.command).join(',')
        break
    }

    // 调用作业执行接口
    const cacheBuster = Date.now()
    const { data } = await apiService.post(
      `/jao/api/jao/jobs/${jobId}/run?cacheBuster=${cacheBuster}`,
      { params: jobParams }
    )

    const result = Array.isArray(data) ? data[0] : data
    currentStatus.value = result?.status || ''

    // 提交成功，提示用户可以关闭
    ElMessage.success('任务已提交，后台正在执行，可关闭此窗口')

    if (result?.status === 'WAITING' || result?.status === 'RUNNING') {
      // 使用 composable 开始轮询，状态显示在按钮上
      startPolling(result.runId, {
        interval: 5000,
        maxAttempts: 120,
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
          ElMessage.warning('执行超时，请稍后查看结果')
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
    }
  } catch (error) {
    submitting.value = false
    currentStatus.value = ''
    console.error('操作失败:', error)
    ElMessage.error('执行失败: ' + (error?.message || '未知错误'))
  }
}

// 关闭对话框
function handleClose() {
  stopPolling()
  visible.value = false
  submitting.value = false
  currentStatus.value = ''
  selectedHosts.value = []
  sudoCommands.value = []
  Object.assign(formData, {
    operate: 'modify_base',
    username: '',
    user_groups: '',
    user_home: '',
    user_shell: '',
    user_comment: '',
    user_expires: '',
    user_remove_home: 'yes',
    user_lock: 'no',
    user_login: 'yes',
    user_password: '',
    templateId: 'N/A'
  })
}

onMounted(() => {
  loadSudoTemplates()
})
</script>

<style scoped lang="scss">
.modify-user-form {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 12px;
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

  strong {
    color: #3b82f6;
  }
}

.selected-hosts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 100px;
  overflow-y: auto;
  padding: 8px;
  background: var(--el-bg-color-page);
  border-radius: 6px;
  border: 1px solid var(--el-border-color-light);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

:deep(.el-radio-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:deep(.el-alert) {
  margin-top: 12px;
}
</style>
