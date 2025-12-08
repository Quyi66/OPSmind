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
      <el-form-item label="选择主机" prop="hosts" required>
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
        <el-table :data="sudoCommands" border size="small" max-height="200">
          <el-table-column type="selection" width="50" />
          <el-table-column prop="command" label="命令" min-width="200" show-overflow-tooltip />
          <el-table-column prop="description" label="描述" width="150" show-overflow-tooltip />
        </el-table>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">
          <i class="fa fa-times"></i> 取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="handleSubmit"
        >
          <i class="fa fa-plus" v-if="!submitting"></i>
          {{ submitting ? '创建中...' : '创建用户' }}
        </el-button>
      </div>
    </template>

    <!-- 设备选择器对话框 -->
    <AcmDeviceSelectorDialog
      v-model="showDeviceSelector"
      :ci-types="'linux'"
      :initial-selection="selectedHosts"
      @confirm="handleDeviceConfirm"
    />
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import AcmDeviceSelectorDialog from '@/modules/automation/components/job/schedule/components/AcmDeviceSelectorDialog.vue'
import * as userApi from '@/modules/user/api'

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

  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    const hostKeys = selectedHosts.value.map(h => h.host_key || h.ip).join(',')
    const sudoCommandStr = sudoCommands.value.map(c => c.command).join(',')

    // TODO: 调用作业执行接口
    // 作业代码: 6snZO9
    const jobParams = {
      user_name: formData.username,
      user_password: formData.password,
      user_group: formData.group,
      groups: formData.groups,
      user_home: formData.home,
      user_shell: formData.shell,
      user_expires: formData.expiredDate,
      user_sudo_command: sudoCommandStr,
      user_comment: formData.comment,
      hosts: hostKeys
    }
    console.log('执行创建用户作业:', jobParams)

    // 模拟执行
    await new Promise(resolve => setTimeout(resolve, 1000))

    ElMessage.success('用户创建任务已提交')
    emit('success')
    handleClose()
  } catch (error) {
    ElMessage.error('创建失败: ' + (error?.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

// 关闭对话框
function handleClose() {
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
