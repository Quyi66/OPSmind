<template>
  <el-dialog
    v-model="visible"
    title="创建用户"
    width="800px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      class="create-user-form"
    >
      <!-- 选择主机 -->
      <el-form-item label="选择主机">
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

      <!-- 用户名 -->
      <el-form-item label="用户名" prop="username" required>
        <el-input v-model="formData.username" placeholder="在主机上创建的用户名称" />
      </el-form-item>

      <!-- 密码 -->
      <el-form-item label="密码" prop="password" required>
        <el-input
          v-model="formData.password"
          type="password"
          show-password
          placeholder="密码复杂度需满足功能配置中的规则"
        />
      </el-form-item>

      <!-- 主用户组 -->
      <el-form-item label="主用户组" prop="group">
        <el-input v-model="formData.group" placeholder="选填，默认与用户名同名" />
      </el-form-item>

      <!-- 附加用户组 -->
      <el-form-item label="附加用户组" prop="groups">
        <el-input v-model="formData.groups" placeholder="选填，多个组名用逗号隔开" />
      </el-form-item>

      <!-- 主目录 -->
      <el-form-item label="主目录" prop="home">
        <el-input v-model="formData.home" placeholder="选填，一般情况无需指定" />
      </el-form-item>

      <!-- Shell -->
      <el-form-item label="Shell" prop="shell">
        <el-input v-model="formData.shell" placeholder="选填，一般情况无需指定" />
      </el-form-item>

      <!-- 备注 -->
      <el-form-item label="备注" prop="comment">
        <el-input v-model="formData.comment" placeholder="选填，用户注释信息" />
      </el-form-item>

      <!-- 过期时间 -->
      <el-form-item label="过期时间" prop="expiredDate">
        <el-date-picker
          v-model="formData.expiredDate"
          type="date"
          placeholder="选填，默认永不失效"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </el-form-item>

      <!-- sudo模板 -->
      <el-form-item label="sudo模板" prop="templateId">
        <el-select
          v-model="formData.templateId"
          placeholder="选填，设置用户sudo权限"
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

      <!-- sudo命令列表 -->
      <el-form-item v-if="sudoCommands.length" label="sudo命令">
        <el-table :data="sudoCommands" stripe size="small" max-height="200">
          <el-table-column type="selection" width="50" />
          <el-table-column prop="command" label="命令" min-width="200" show-overflow-tooltip />
          <el-table-column prop="description" label="描述" width="150" show-overflow-tooltip />
        </el-table>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">
          <!-- <i class="fa fa-times"></i>  -->
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="handleSubmit"
        >
          <!-- <i class="fa fa-plus" v-if="!submitting"></i> -->
          {{ submitting ? '创建中...' : '创建用户' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElLoading } from 'element-plus'
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
  set: (val) => emit('update:visible', val)
})

const formRef = ref(null)
const showDeviceSelector = ref(false)
const selectedHosts = ref([])
const submitting = ref(false)
const sudoTemplates = ref([])
const sudoCommands = ref([])

const formData = reactive({
  username: '',
  password: '',
  group: '',
  groups: '',
  home: '',
  shell: '',
  comment: '',
  expiredDate: '',
  templateId: 'N/A'
})

const formRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

// 加载sudo模板列表
async function loadSudoTemplates() {
  try {
    const response = await userApi.getSudoTemplates()
    sudoTemplates.value = response?.records || response?.data?.records || []
  } catch (error) {
    console.error('Failed to load sudo templates:', error)
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
function removeHost(index) {
  selectedHosts.value.splice(index, 1)
}

// 轮询定时器
let pollingTimer = null

// 提交表单
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

  // 显示加载状态
  const loadingInstance = ElLoading.service({
    lock: true,
    text: '正在创建用户...',
    background: 'rgba(0, 0, 0, 0.7)'
  })

  submitting.value = true
  try {
    // 构造主机参数（JSON 字符串格式）
    const hosts = selectedHosts.value.map(h => ({
      key: h.key || h.id,
      value: h.value || h.ip || h.host_key,
      assetType: h.assetType || h.ciType || 'linux'
    }))
    const hostsJson = JSON.stringify(hosts)

    const sudoCommandStr = sudoCommands.value.map(c => c.command).join(',')

    // 调用作业执行接口
    const cacheBuster = Date.now()
    const { data } = await apiService.post(`/jao/api/jao/jobs/6snZO9/run?cacheBuster=${cacheBuster}`, {
      params: {
        user_name: formData.username,
        user_password: formData.password,
        user_group: formData.group || '',
        groups: formData.groups || '',
        user_home: formData.home || '',
        user_shell: formData.shell || '',
        user_expires: formData.expiredDate || '',
        user_sudo_command: sudoCommandStr,
        user_comment: formData.comment || '',
        hosts: hostsJson
      }
    })

    const result = Array.isArray(data) ? data[0] : data
    console.log('创建用户作业启动结果:', result)

    if (result?.status === 'WAITING' || result?.status === 'RUNNING') {
      // 使用 composable 开始轮询
      startPolling(result.runId, {
        interval: 5000,
        maxAttempts: 120,
        successMessage: '用户创建成功',
        errorMessage: '创建失败',
        timeoutMessage: '创建超时，请稍后查看结果',
        showMessage: false,
        onProgress: (res) => {
          loadingInstance.setText(`正在创建用户... (状态: ${res?.status || 'RUNNING'})`)
        },
        onSuccess: () => {
          loadingInstance.close()
          ElMessage.success('用户创建成功')
          emit('success')
          handleClose()
        },
        onError: (res) => {
          loadingInstance.close()
          ElMessage.error(res?.error || '创建失败')
          emit('success')
          handleClose()
        },
        onTimeout: () => {
          loadingInstance.close()
          ElMessage.warning('创建超时，请稍后查看结果')
          emit('success')
          handleClose()
        }
      })
    } else if (result?.status === 'COMPLETED' || result?.status === 'SUCCESS') {
      loadingInstance.close()
      ElMessage.success('用户创建成功')
      emit('success')
      handleClose()
    } else if (result?.status === 'FAILED' || result?.status === 'ERROR') {
      loadingInstance.close()
      ElMessage.error(result?.error || '创建失败')
    } else {
      loadingInstance.close()
      ElMessage.success('用户创建任务已提交')
      emit('success')
      handleClose()
    }
  } catch (error) {
    loadingInstance?.close()
    console.error('创建用户失败:', error)
    ElMessage.error('创建失败: ' + (error?.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

// 关闭对话框
function handleClose() {
  stopPolling()
  visible.value = false
  formRef.value?.resetFields()
  selectedHosts.value = []
  sudoCommands.value = []
  Object.assign(formData, {
    username: '',
    password: '',
    group: '',
    groups: '',
    home: '',
    shell: '',
    comment: '',
    expiredDate: '',
    templateId: 'N/A'
  })
}

onMounted(() => {
  loadSudoTemplates()
})

// composable 会自动在 onUnmounted 时停止轮询
</script>

<style scoped lang="scss">
.create-user-form {
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
