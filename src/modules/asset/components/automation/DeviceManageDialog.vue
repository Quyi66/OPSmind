<template>
  <el-dialog
    v-model="visible"
    :title="t('asset.enrollTitle')"
    width="900px"
    destroy-on-close
    :close-on-click-modal="false"
    @close="handleClose"
    :close-on-press-escape="false"
  >
    <!-- Tab 导航 -->
    <el-tabs v-model="activeTab" class="device-manage-tabs">
      <el-tab-pane name="password">
        <template #label>
          <span>
            <i class="fa fa-unlock-alt"></i>
            {{ t('asset.passwordEnrollment') }}
          </span>
        </template>
      </el-tab-pane>
      <el-tab-pane name="ssh">
        <template #label>
          <span>
            <i class="fa fa-key"></i>
            {{ t('asset.sshEnrollment') }}
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>

    <!-- 用户名密码纳管 Tab -->
    <div v-show="activeTab === 'password'" class="tab-content">
      <el-alert
        :title="t('asset.enrollPriority')"
        type="success"
        :closable="false"
        show-icon
        class="tip-alert"
      />

      <el-form :model="passwordForm" class="manage-form" :label-width="currentLocale === 'en-US' ? '170px' : '120px'">
        <!-- 设备选择器 -->
        <el-form-item :label="t('asset.chooseDevice')">
          <AcmDeviceSelector
            v-model="passwordForm.hosts"
            ci-types="[auto]"
            :options="{ label: t('asset.chooseDevice') }"
          />
        </el-form-item>

        <!-- 执行引擎节点 (非 AAP) -->
        <el-form-item v-if="scriptEngine !== 'aap'" :label="t('asset.executionNode')">
          <el-select
            v-model="passwordForm.instanceGroup"
            :placeholder="t('asset.select')"
            style="width: 100%"
            clearable
          >

            <el-option
              v-for="item in instanceGroupOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>

        <!-- AAP Instance Group -->
        <el-form-item v-if="scriptEngine === 'aap'" :label="t('asset.aapInstanceGroup')">
          <el-select
            v-model="passwordForm.aapInstanceGroup"
            :placeholder="t('asset.select')"
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
        <el-form-item :label="t('asset.automationInfo')">
          <div style="display: flex; gap: 8px; width: 100%; align-items: center;">
            <el-select
              v-model="passwordForm.ansibleVarsSetId"
              :placeholder="t('asset.select')"
              style="flex: 1"
              clearable
            >

              <el-option
                v-for="item in autoConfigOptions"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </el-select>
            <el-button type="primary" plain @click="emit('create-template')">
              <i class="fa fa-plus" style="margin-right: 4px"></i>{{ t('asset.newTemplate') }}
            </el-button>
          </div>
        </el-form-item>

        <!-- 登录用户 -->
        <el-form-item :label="t('asset.loginUser')">
          <el-input v-model="passwordForm.loginUser" :placeholder="t('asset.loginUserPlaceholder')" />
        </el-form-item>

        <!-- 登录密码 -->
        <el-form-item :label="t('asset.loginPassword')">
          <el-input
            v-model="passwordForm.loginPasswd"
            type="password"
            show-password
            autocomplete="new-password"
            :placeholder="t('asset.loginPasswordPlaceholder')"
          />
        </el-form-item>

        <!-- 执行用户 -->
        <el-form-item :label="t('asset.executionUser')">
          <el-input v-model="passwordForm.runUser" :placeholder="t('asset.executionUserPlaceholder')" />
        </el-form-item>

        <!-- 执行密码 -->
        <el-form-item :label="t('asset.executionPassword')">
          <el-input
            v-model="passwordForm.runPasswd"
            type="password"
            show-password
            autocomplete="new-password"
            :placeholder="t('asset.executionPasswordPlaceholder')"
          />
        </el-form-item>
      </el-form>
    </div>

    <!-- SSH公钥纳管 Tab -->
    <div v-show="activeTab === 'ssh'" class="tab-content">
      <el-alert
        :title="t('asset.sshNodeHint')"
        type="success"
        :closable="false"
        show-icon
        class="tip-alert"
      />

      <el-form :model="sshForm" label-position="top" class="manage-form">
        <!-- 设备选择器 -->
        <el-form-item :label="t('asset.chooseDevice')">
          <AcmDeviceSelector
            v-model="sshForm.hosts"
            ci-types="[auto]"
            :options="{ label: t('asset.chooseDevice') }"
          />
        </el-form-item>

        <!-- Oplus纳管目标用户 -->
        <el-form-item :label="t('asset.enrollmentUser')">
          <el-input v-model="sshForm.oplus_ansible_ssh_user" placeholder="ansible" />
        </el-form-item>

        <!-- 当前可以SSH连接到目标机器的用户 -->
        <el-form-item :label="t('asset.currentSshUser')">
          <el-input v-model="sshForm.ansible_ssh_user" placeholder="demo" />
        </el-form-item>

        <!-- 当前可以SSH连接到目标机器的用户密码 -->
        <el-form-item :label="t('asset.currentSshPassword')">
          <el-input
            v-model="sshForm.ansible_ssh_pass"
            type="password"
            show-password
            autocomplete="new-password"
            :placeholder="t('asset.passwordPlaceholder')"
          />
        </el-form-item>

        <!-- 需要发送的id_rsa.pub文件内容 -->
        <el-form-item :label="t('asset.publicKey')">
          <el-input
            v-model="sshForm.oplus_ssh_pub_key"
            type="textarea"
            :rows="4"
            :placeholder="t('asset.publicKeyPlaceholder')"
          />
          <div class="form-desc">{{ t('asset.publicKeyPath') }}</div>
        </el-form-item>
      </el-form>
    </div>

    <!-- 底部按钮区 -->
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">{{ t('common.cancel') }}</el-button>
        <el-button
          v-if="activeTab === 'password'"
          type="primary"
          :loading="submitting"
          @click="handlePasswordSubmit"
        >
          {{ t('common.save') }}
        </el-button>
        <el-button v-else type="primary" :loading="submitting" @click="handleSSHSubmit">
          {{ t('asset.execute') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'

import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { automationApi } from '../../api'
import { apiService } from '@/core/api'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success', 'create-template'])

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
    const engineData = await automationApi.getScriptEngine()
    scriptEngine.value = engineData?.value || 'ansible'
    instanceGroupOptions.value = []
    aapInstanceGroupOptions.value = []

    // 获取instance group选项
    const instanceGroups = await automationApi.getInstanceGroupList()
    instanceGroupOptions.value = instanceGroups.length > 0 ? instanceGroups : ['default']

    // 如果是AAP引擎，获取AAP instance group: AAP_QUERY_INSTANCE_GROUP → GET /workflow/api/workflow/aap/instance_group
    if (scriptEngine.value === 'aap') {
      const aapRes = await apiService.get('/workflow/api/workflow/aap/instance_group')
      const aapData = aapRes?.data || aapRes
      aapInstanceGroupOptions.value = Array.isArray(aapData) ? aapData : (aapData?.records || [])
    }

    // 获取自动化配置选项
    autoConfigOptions.value = await automationApi.getAllAssetAutoConfigOptions()

    // 获取资产类型
    const typeRes = await apiService.get(
      `/cmdb/api/cmdb/cit/get/all/select?cacheBuster=${Date.now()}`
    )
    assetTypes.value = typeRes.data || []
  } catch (error) {
    console.error('加载表单选项失败:', error)
    ElMessage.error(t('asset.formOptionsFailed'))
  }
}

// 提交密码表单
async function handlePasswordSubmit() {
  if (!passwordForm.value.hosts || passwordForm.value.hosts.length === 0) {
    ElMessage.warning(t('asset.selectDevice'))
    return
  }

  submitting.value = true
  try {
    // 构建hostKeys参数
    const hostKeys = passwordForm.value.hosts.map(({ key, value, assetType }) => ({
      key,
      value,
      assetType
    }))

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

    await apiService.post(`/workflow/api/workflow/jobs/eGfsxb/run?cacheBuster=${Date.now()}`, { params })
    ElMessage.success(t('asset.enrollSubmitted'))
    emit('success')
    visible.value = false
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error(t('asset.submissionFailed', { message: error.message || t('asset.unknownError') }))
  } finally {
    submitting.value = false
  }
}

// 提交SSH表单
async function handleSSHSubmit() {
  if (!sshForm.value.hosts || sshForm.value.hosts.length === 0) {
    ElMessage.warning(t('asset.selectDevice'))
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

    await apiService.post(`/workflow/api/workflow/jobs/p2AW5s/run?cacheBuster=${Date.now()}`, { params })
    ElMessage.success(t('asset.sshEnrollSubmitted'))
    emit('success')
    visible.value = false
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error(t('asset.submissionFailed', { message: error.message || t('asset.unknownError') }))
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

async function refreshAndSelectConfig(configId) {
  try {
    autoConfigOptions.value = await automationApi.getAllAssetAutoConfigOptions()
    if (configId) {
      passwordForm.value.ansibleVarsSetId = configId
    }
  } catch (error) {
    console.error('刷新配置失败:', error)
  }
}

defineExpose({
  refreshAndSelectConfig
})
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
    color: var(--el-text-color-primary);
  }
}

.form-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  line-height: 1.4;
}
</style>
