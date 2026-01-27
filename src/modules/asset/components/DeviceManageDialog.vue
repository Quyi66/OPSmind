<template>
  <el-dialog
    v-model="visible"
    title="自动化配置信息 > 设备纳管"
    width="900px"
    destroy-on-close
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <!-- Tab 导航 -->
    <el-tabs v-model="activeTab" class="device-manage-tabs">
      <el-tab-pane name="password">
        <template #label>
          <span>
            <i class="fa fa-unlock-alt"></i>
            用户名密码纳管
          </span>
        </template>
      </el-tab-pane>
      <el-tab-pane name="ssh">
        <template #label>
          <span>
            <i class="fa fa-key"></i>
            SSH公钥纳管
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>

    <!-- 用户名密码纳管 Tab -->
    <div v-show="activeTab === 'password'" class="tab-content">
      <el-alert
        title="注意：此Ansible配置作用于具体的机器上，区别于组Ansible配置和资产类型Ansible配置，该Ansible配置具有最高优先级。"
        type="success"
        :closable="false"
        show-icon
        class="tip-alert"
      />

      <el-form :model="passwordForm" class="manage-form" label-width="120px">
        <!-- 设备选择器 -->
        <el-form-item label="选择设备">
          <AcmDeviceSelector
            v-model="passwordForm.hosts"
            ci-types="[auto]"
            :options="{ label: '选择设备' }"
          />
        </el-form-item>

        <!-- 执行引擎节点 (非 AAP) -->
        <el-form-item v-if="scriptEngine !== 'aap'" label="执行引擎节点">
          <el-select
            v-model="passwordForm.instanceGroup"
            placeholder="请选择"
            style="width: 100%"
            clearable
          >
            <el-option label="none" value="" />
            <el-option
              v-for="item in instanceGroupOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>

        <!-- AAP Instance Group -->
        <el-form-item v-if="scriptEngine === 'aap'" label="AAP instance_group">
          <el-select
            v-model="passwordForm.aapInstanceGroup"
            placeholder="请选择"
            style="width: 100%"
            clearable
          >
            <el-option
              v-for="item in aapInstanceGroupOptions"
              :key="item.name"
              :label="item.name"
              :value="item.name"
            />
          </el-select>
        </el-form-item>

        <!-- 自动化配置信息 -->
        <el-form-item label="自动化配置信息">
          <el-select
            v-model="passwordForm.ansibleVarsSetId"
            placeholder="请选择"
            style="width: 100%"
            clearable
          >
            <el-option label="none" :value="null" />
            <el-option
              v-for="item in autoConfigOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <!-- 登录用户 -->
        <el-form-item label="loginUser">
          <el-input v-model="passwordForm.loginUser" placeholder="请输入登录用户" />
        </el-form-item>

        <!-- 登录密码 -->
        <el-form-item label="loginPasswd">
          <el-input
            v-model="passwordForm.loginPasswd"
            type="password"
            show-password
            autocomplete="new-password"
            placeholder="请输入登录密码"
          />
        </el-form-item>

        <!-- 执行用户 -->
        <el-form-item label="runUser">
          <el-input v-model="passwordForm.runUser" placeholder="请输入执行用户" />
        </el-form-item>

        <!-- 执行密码 -->
        <el-form-item label="runPasswd">
          <el-input
            v-model="passwordForm.runPasswd"
            type="password"
            show-password
            autocomplete="new-password"
            placeholder="请输入执行密码"
          />
        </el-form-item>
      </el-form>
    </div>

    <!-- SSH公钥纳管 Tab -->
    <div v-show="activeTab === 'ssh'" class="tab-content">
      <el-alert
        title="注意：机器必须在导入时填写Ansible执行节点列（即：INSTANCE_GROUP属性）若需修改节点配置，请前往自动化配置管理 -> 设备纳管 -> 用户名密码纳管中单独进行节点配置 否则，任务将下发至default节点执行"
        type="success"
        :closable="false"
        show-icon
        class="tip-alert"
      />

      <el-form :model="sshForm" label-position="top" class="manage-form">
        <!-- 设备选择器 -->
        <el-form-item label="选择设备">
          <AcmDeviceSelector
            v-model="sshForm.hosts"
            ci-types="[auto]"
            :options="{ label: '选择设备' }"
          />
        </el-form-item>

        <!-- Oplus纳管目标用户 -->
        <el-form-item label="Oplus纳管目标用户">
          <el-input v-model="sshForm.oplus_ansible_ssh_user" placeholder="ansible" />
        </el-form-item>

        <!-- 当前可以SSH连接到目标机器的用户 -->
        <el-form-item label="当前可以SSH连接到目标机器的用户">
          <el-input v-model="sshForm.ansible_ssh_user" placeholder="demo" />
        </el-form-item>

        <!-- 当前可以SSH连接到目标机器的用户密码 -->
        <el-form-item label="当前可以SSH连接到目标机器的用户密码">
          <el-input
            v-model="sshForm.ansible_ssh_pass"
            type="password"
            show-password
            autocomplete="new-password"
            placeholder="请输入密码"
          />
        </el-form-item>

        <!-- 需要发送的id_rsa.pub文件内容 -->
        <el-form-item label="需要发送的id_rsa.pub文件内容">
          <el-input
            v-model="sshForm.oplus_ssh_pub_key"
            type="textarea"
            :rows="4"
            placeholder="请输入SSH公钥内容"
          />
          <div class="form-desc">文件默认路径为 ~/.ssh/id_rsa.pub</div>
        </el-form-item>
      </el-form>
    </div>

    <!-- 底部按钮区 -->
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button
          v-if="activeTab === 'password'"
          type="primary"
          :loading="submitting"
          @click="handlePasswordSubmit"
        >
          保存
        </el-button>
        <el-button v-else type="primary" :loading="submitting" @click="handleSSHSubmit">
          开始执行
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { dtsApi } from '../api'
import { apiService } from '@/core/api'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

// 弹窗可见性
const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

// Tab状态
const activeTab = ref('password')

// 加载状态
const submitting = ref(false)

// 脚本引擎类型
const scriptEngine = ref('ansible')

// 下拉选项
const assetTypes = ref([])
const instanceGroupOptions = ref([])
const aapInstanceGroupOptions = ref([])
const autoConfigOptions = ref([])

// 密码表单
const passwordForm = ref({
  hosts: [],
  instanceGroup: 'default',
  aapInstanceGroup: '',
  ansibleVarsSetId: null,
  loginUser: '',
  loginPasswd: '',
  runUser: '',
  runPasswd: ''
})

// SSH表单
const sshForm = ref({
  hosts: [],
  oplus_ansible_ssh_user: 'ansible',
  ansible_ssh_user: 'demo',
  ansible_ssh_pass: 'demo@@',
  oplus_ssh_pub_key:
    'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCay5dWq/syZ0gXBS5Q8jk5wQs4A62E33Y4SPD0u0Z/hhsVyk8Go3vhl4TX+t62poplu9DIvJpAPVNYUFeUIJzya+yDsTgfkgvuQksRKMqza/Ya+RNYCzm/yc/kNA7pe8uSccK4fVLf0SuhO3LbhvgGfUC1cHaEpp3V4MDMMfHTvtTvbvwTYwbt4r0vB2v6t7urB00h3c5GQvyaJeryszjFlVG92LOXwVkIPx7lULwZoT7V47lsBlTamktuw+tn2UNgYEplUiHouar33tEHIiFHwATePtb1xVz/sRZEIDuO2P9TYqRXQd7eW3dcwzWl5jVQ5wyTCsr8VA6kt5qLr3hD demo@oplus-dev'
})

// 监听弹窗打开，加载数据
watch(
  () => props.modelValue,
  val => {
    if (val) {
      loadFormOptions()
    }
  }
)

// 加载表单选项
async function loadFormOptions() {
  try {
    // 获取脚本引擎类型
    const engineRes = await dtsApi.queryData('ACM_GET_SCRIPT_ENGINE', null)
    scriptEngine.value = engineRes?.records?.[0]?.result || 'ansible'

    // 获取instance group选项
    const instanceRes = await dtsApi.queryData('GET_TAT_URL_AS_STRING_LIST', null)
    if (instanceRes?.records?.[0]?.value) {
      try {
        instanceGroupOptions.value = JSON.parse(instanceRes.records[0].value)
      } catch {
        instanceGroupOptions.value = ['default']
      }
    }

    // 如果是AAP引擎，获取AAP instance group
    if (scriptEngine.value === 'aap') {
      const aapRes = await dtsApi.queryData('AAP_QUERY_INSTANCE_GROUP', null)
      aapInstanceGroupOptions.value = aapRes?.records || []
    }

    // 获取自动化配置选项
    const configRes = await dtsApi.queryData('GET_ALL_ASSET_AUTO_CONFIG', null)
    autoConfigOptions.value = (configRes?.records || []).filter(item => item.id)

    // 获取资产类型
    const typeRes = await apiService.get(
      `/acm/api/acm/cit/get/all/select?cacheBuster=${Date.now()}`
    )
    assetTypes.value = typeRes.data || []
  } catch (error) {
    console.error('加载表单选项失败:', error)
    ElMessage.error('加载表单选项失败')
  }
}

// 提交密码表单
async function handlePasswordSubmit() {
  if (!passwordForm.value.hosts || passwordForm.value.hosts.length === 0) {
    ElMessage.warning('请选择设备')
    return
  }

  submitting.value = true
  try {
    // 构建hostKeys参数
    const hostKeys = passwordForm.value.hosts.map(h => h.key || h)

    const params = {
      hostKeys,
      ansibleVarsSetId: passwordForm.value.ansibleVarsSetId,
      runUser: passwordForm.value.runUser,
      runPasswd: passwordForm.value.runPasswd,
      loginUser: passwordForm.value.loginUser,
      loginPasswd: passwordForm.value.loginPasswd,
      instanceGroup: passwordForm.value.instanceGroup,
      aapInstanceGroup: passwordForm.value.aapInstanceGroup
    }

    await apiService.post(`/jao/api/jao/jobs/eGfsxb/run?cacheBuster=${Date.now()}`, { params })
    ElMessage.success('设备纳管任务已提交')
    emit('success')
    visible.value = false
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error('提交失败: ' + (error.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

// 提交SSH表单
async function handleSSHSubmit() {
  if (!sshForm.value.hosts || sshForm.value.hosts.length === 0) {
    ElMessage.warning('请选择设备')
    return
  }

  submitting.value = true
  try {
    // 构建hosts参数
    const hosts = sshForm.value.hosts.map(h => h.key || h)

    const params = {
      hosts,
      oplus_ansible_ssh_user: sshForm.value.oplus_ansible_ssh_user,
      ansible_ssh_user: sshForm.value.ansible_ssh_user,
      ansible_ssh_pass: sshForm.value.ansible_ssh_pass,
      oplus_ssh_pub_key: sshForm.value.oplus_ssh_pub_key
    }

    await apiService.post(`/jao/api/jao/jobs/p2AW5s/run?cacheBuster=${Date.now()}`, { params })
    ElMessage.success('SSH公钥纳管任务已提交')
    emit('success')
    visible.value = false
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error('提交失败: ' + (error.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

// 关闭弹窗
function handleClose() {
  // 重置表单
  passwordForm.value = {
    hosts: [],
    instanceGroup: 'default',
    aapInstanceGroup: '',
    ansibleVarsSetId: null,
    loginUser: '',
    loginPasswd: '',
    runUser: '',
    runPasswd: ''
  }
  sshForm.value.hosts = []
  activeTab.value = 'password'
}
</script>

<style scoped lang="scss">
.device-manage-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 0;
  }

  :deep(.el-tabs__nav-wrap::after) {
    height: 1px;
  }

  :deep(.el-tab-pane) {
    display: none;
  }
}

.tab-content {
  padding: 16px 0;
}

.tip-alert {
  margin-bottom: 16px;

  :deep(.el-alert__title) {
    font-size: 13px;
    line-height: 1.5;
  }
}

.manage-form {
  :deep(.el-form-item__label) {
    font-weight: 500;
    color: #303133;
  }
}

.form-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}
</style>
