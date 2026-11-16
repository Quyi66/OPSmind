<template>
  <div class="ops-page-layout ops-page-layout--page-scroll">
    <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon>
      <el-button
        link
        type="primary"
        :disabled="saving"
        :loading="loading"
        @click="loadScriptEngine"
      >
        {{ t('settings.team.retryMembers') }}
      </el-button>
    </el-alert>
    <el-alert v-if="aapReadError" :title="aapReadError" type="error" :closable="false" show-icon>
      <el-button
        link
        type="primary"
        :disabled="loading || saving"
        :loading="connecting"
        @click="connectAap()"
      >
        {{ t('settings.engine.retryConnect') }}
      </el-button>
    </el-alert>
    <el-card class="config-card" v-loading="loading">
      <el-form
        label-width="260px"
        label-position="left"
        :disabled="loading || saving || !configReady"
        @submit.prevent
      >
        <!-- 引擎类型选择 -->
        <el-form-item :label="t('settings.engine.executionEngine')">
          <div class="engine-hint">{{ t('settings.engine.supported') }}</div>
          <el-radio-group v-model="usedEngine" @change="handleEngineChange">
            <el-radio-button
              v-for="engine in engineOptions"
              :key="engine.value"
              :value="engine.value"
            >
              {{ engine.name }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>

        <!-- Ansible 配置 -->
        <template v-if="scriptEngine === 'ansible'">
          <el-divider content-position="left">{{ t('settings.engine.ansibleConfig') }}</el-divider>

          <el-form-item :label="t('settings.engine.parallel')">
            <el-switch v-model="jaoParamMap.is_fork" />
          </el-form-item>

          <el-form-item :label="t('settings.engine.forks')">
            <el-input-number v-model="jaoParamMap.forks" :min="100" style="width: 200px" />
          </el-form-item>

          <el-form-item :label="t('settings.engine.syncProject')">
            <el-switch v-model="jaoParamMap.sync_script_git" />
          </el-form-item>

          <el-form-item class="form-actions">
            <el-button type="primary" @click="saveAnsibleConfig" :loading="saving">{{ t('common.save') }}</el-button>
          </el-form-item>
        </template>

        <!-- AAP 配置 -->
        <template v-if="scriptEngine === 'aap'">
          <el-divider content-position="left">{{ t('settings.engine.aapConfig') }}</el-divider>

          <el-form-item :label="t('settings.engine.clearResources')">
            <el-switch v-model="ataParamMap.tower_clear" />
          </el-form-item>

          <!-- AAP Web Login 配置 -->
          <el-form-item :label="t('settings.engine.connectionConfig')">
            <el-card class="nested-card">
              <el-form-item :label="t('settings.engine.address')" label-width="140px">
                <el-input v-model="ataParamMap.tower_host" style="width: 300px" />
                <div class="form-help">{{ t('settings.engine.addressHint') }}</div>
              </el-form-item>

              <el-form-item :label="t('settings.engine.loginUser')" label-width="140px">
                <el-input v-model="loginConfig.web_login_name" style="width: 300px" />
                <div class="form-help">{{ t('settings.engine.loginUserHint') }}</div>
              </el-form-item>

              <el-form-item :label="t('settings.engine.loginPassword')" label-width="140px">
                <el-input
                  v-model="loginConfig.web_login_pwd"
                  type="password"
                  show-password
                  autocomplete="new-password"
                  style="width: 300px"
                />
                <div class="form-help">{{ t('settings.engine.loginPasswordHint') }}</div>
              </el-form-item>
            </el-card>
          </el-form-item>

          <!-- AAP Servers -->
          <template v-if="isConnectAap">
            <el-form-item :label="t('settings.engine.clusterNodes')">
              <div class="form-help mb-2">{{ t('settings.engine.clusterConfig') }}</div>
              <el-table :data="clusterServers" style="max-width: 800px" max-height="600px">
                <el-table-column :label="t('settings.engine.hostAddress')" min-width="150">
                  <template #default="{ row }">
                    <el-input v-model="row.host" size="small" />
                  </template>
                </el-table-column>
                <el-table-column :label="t('settings.engine.port')" width="100">
                  <template #default="{ row }">
                    <el-input v-model="row.port" size="small" />
                  </template>
                </el-table-column>
                <el-table-column :label="t('common.username')" min-width="150">
                  <template #default="{ row }">
                    <el-input v-model="row.username" size="small" />
                  </template>
                </el-table-column>
                <el-table-column :label="t('common.password')" min-width="150">
                  <template #default="{ row }">
                    <el-input
                      v-model="row.password"
                      type="password"
                      size="small"
                      autocomplete="new-password"
                    />
                  </template>
                </el-table-column>
                <el-table-column :label="t('common.actions')" width="150">
                  <template #default="{ $index }">
                    <el-button type="danger" size="small" @click="deleteClusterServer($index)">
                      {{ t('common.delete') }}
                    </el-button>
                    <el-button type="primary" size="small" @click="addClusterServer">
                      {{ t('settings.engine.add') }}
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-form-item>

            <!-- AAP Execute Config -->
            <el-form-item :label="t('settings.engine.executionConfig')">
              <div class="form-help mb-2">{{ t('settings.engine.executionConfig') }}</div>
              <el-card class="nested-card">
                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item :label="t('settings.engine.gitProject')" label-width="180px">
                      <el-select v-model="towerConfig.git_project_id" style="width: 100%">
                        <el-option
                          v-for="project in gitProjects"
                          :key="project.id"
                          :label="project.name"
                          :value="project.id"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item :label="t('settings.engine.organization')" label-width="180px">
                      <el-select v-model="towerConfig.organization_id" style="width: 100%">
                        <el-option
                          v-for="org in organizations"
                          :key="org.id"
                          :label="org.name"
                          :value="org.id"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item :label="t('settings.engine.localProject')" label-width="180px">
                      <el-select
                        v-model="towerConfig.template_project_id"
                        style="width: 100%"
                        @change="handleProjectChange"
                      >
                        <el-option
                          v-for="project in manualProjects"
                          :key="project.id"
                          :label="project.name"
                          :value="project.id"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item :label="t('settings.engine.projectPath')" label-width="180px">
                      <el-input v-model="towerConfig.project_path" disabled style="width: 100%" />
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item :label="t('settings.engine.credentials')" label-width="180px">
                      <el-select
                        v-model="towerConfig.template_credentials_id"
                        multiple
                        style="width: 100%"
                      >
                        <el-option
                          v-for="cred in credentials"
                          :key="cred.id"
                          :label="cred.name"
                          :value="cred.id"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item :label="t('settings.engine.instanceGroup')" label-width="180px">
                      <el-select v-model="towerConfig.instance_group" style="width: 100%">
                        <el-option
                          v-for="ig in instanceGroups"
                          :key="ig.name"
                          :label="ig.name"
                          :value="ig.name"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item :label="t('settings.engine.environment')" label-width="180px">
                      <el-select v-model="towerConfig.execution_environment" style="width: 100%">
                        <el-option
                          v-for="ee in executionEnvironments"
                          :key="ee.id"
                          :label="ee.name"
                          :value="ee.id"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-divider />

                <el-row :gutter="20">
                  <el-col :span="8">
                    <el-form-item :label="t('settings.engine.become')" label-width="200px">
                      <el-switch v-model="towerConfig.template_become" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item :label="t('settings.engine.syncGit')" label-width="200px">
                      <el-switch v-model="towerConfig.sync_git_project_before_starting_job" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item :label="t('settings.engine.encryptHostPassword')" label-width="200px">
                      <el-switch v-model="towerConfig.encrypt_host_pass" />
                    </el-form-item>
                  </el-col>
                </el-row>
              </el-card>
            </el-form-item>
          </template>

          <el-form-item class="form-actions">
            <el-button type="primary" @click="saveAapConfig" :loading="saving">{{ t('common.save') }}</el-button>
          </el-form-item>
        </template>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { t } from '@/core/i18n'
import { message, messageRef } from '@/core/i18n/feedback'
import {
  ref,
  reactive,
  computed,
  onMounted,
  onBeforeUnmount,
  onActivated,
  onDeactivated
} from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as engineApi from '@/modules/settings/api/engine'

const loading = ref(false)
const saving = ref(false)
const loadError = messageRef('')
const aapReadError = messageRef('')
const configReady = ref(false)
const connecting = ref(false)
let active = true
let readRequestId = 0
let aapRequestId = 0
let interrupted = false

// 引擎选项
const engineOptions = [
  { name: 'Ansible', value: 'ansible' },
  { name: 'Ansible Automation Platform', value: 'aap' }
]

// 当前选中的引擎
const usedEngine = ref('ansible')
// 实际使用的引擎（保存后才更新）
const scriptEngine = ref('ansible')
// 引擎参数对象
const scriptEngineParam = ref(null)

// Ansible 配置 (jao domain)
const jaoParamMap = reactive({
  is_fork: false,
  forks: 100,
  sync_script_git: false
})
const jaoParams = ref([])

// AAP 配置 (ata domain)
const ataParamMap = reactive({
  tower_clear: false,
  tower_host: ''
})
const ataParams = ref([])

// AAP 登录配置
function createLoginDefaults() {
  return {
    web_login_name: '',
    web_login_pwd: '',
    cluster_servers: [{ host: '', port: '', username: '', password: '' }]
  }
}
const loginConfig = reactive(createLoginDefaults())

// AAP Tower 配置
function createTowerDefaults() {
  return {
    git_project_id: null,
    organization_id: null,
    template_project_id: null,
    project_path: '',
    template_credentials_id: [],
    instance_group: '',
    execution_environment: null,
    template_become: false,
    sync_git_project_before_starting_job: false,
    encrypt_host_pass: false
  }
}
const towerConfig = reactive(createTowerDefaults())

// AAP 连接状态
const isConnectAap = ref(false)
const aapProjectBaseDir = ref('')

// AAP 下拉选项
const projects = ref([])
const organizations = ref([])
const credentials = ref([])
const instanceGroups = ref([])
const executionEnvironments = ref([])

// 计算属性
const clusterServers = computed(() => loginConfig.cluster_servers || [])
const gitProjects = computed(() => projects.value.filter(p => p.scm_type === 'git'))
const manualProjects = computed(() => projects.value.filter(p => p.scm_type !== 'git'))

// 初始化
onMounted(() => {
  loadScriptEngine()
})

async function loadScriptEngine() {
  if (!active) return
  const request = ++readRequestId
  aapRequestId += 1
  loading.value = true
  connecting.value = false
  configReady.value = false
  loadError.value = ''
  aapReadError.value = ''
  isConnectAap.value = false
  try {
    const param = await engineApi.getParamByDomainAndName('jao', 'script_engine')
    if (!isCurrentRead(request)) return
    if (!param || !['ansible', 'aap'].includes(param.value || 'ansible')) {
      throw new Error(t('settings.engine.invalidEngine'))
    }
    if (param) {
      scriptEngineParam.value = param
      usedEngine.value = param.value || 'ansible'
      scriptEngine.value = param.value || 'ansible'

      if (scriptEngine.value === 'ansible') {
        await loadAnsibleConfig(request)
      } else if (scriptEngine.value === 'aap') {
        await loadAapConfig(request)
      }
      if (isCurrentRead(request)) configReady.value = true
    }
  } catch (error) {
    if (!isCurrentRead(request)) return
    console.error('Failed to load script engine:', error)
    loadError.value = message('settings.engine.readFailed')
    ElMessage.error(t('settings.engine.loadFailed'))
  } finally {
    if (isCurrentRead(request)) loading.value = false
  }
}

function isCurrentRead(request) {
  return active && request === readRequestId
}

async function loadAnsibleConfig(request) {
  const params = await engineApi.getParamsByDomain('jao')
  if (!isCurrentRead(request)) return
  const next = { is_fork: false, forks: 100, sync_script_git: false }

  for (const param of params || []) {
    if (param.name === 'is_fork') {
      next.is_fork = JSON.parse(param.value || 'false')
    } else if (param.name === 'forks') {
      next.forks = JSON.parse(param.value || '100')
    } else if (param.name === 'sync_script_git') {
      next.sync_script_git = JSON.parse(param.value || 'false')
    }
  }
  jaoParams.value = params || []
  Object.assign(jaoParamMap, next)
}

async function loadAapConfig(request) {
  const params = await engineApi.getParamsByDomain('ata')
  if (!isCurrentRead(request)) return
  const next = { tower_host: '', tower_clear: false }
  const nextLogin = createLoginDefaults(),
    nextTower = createTowerDefaults()

  for (const param of params || []) {
    if (param.name === 'tower_host') {
      next.tower_host = param.value || ''
    } else if (param.name === 'tower_clear') {
      next.tower_clear = JSON.parse(param.value || 'false')
    } else if (param.name === 'tower_login_config') {
      const config = JSON.parse(param.value || '{}')
      Object.assign(nextLogin, config)
    } else if (param.name === 'tower_config') {
      const config = JSON.parse(param.value || '{}')
      Object.assign(nextTower, config)
    }
  }
  ataParams.value = params || []
  Object.assign(ataParamMap, next)
  for (const key of Object.keys(loginConfig)) delete loginConfig[key]
  for (const key of Object.keys(towerConfig)) delete towerConfig[key]
  Object.assign(loginConfig, nextLogin)
  Object.assign(towerConfig, nextTower)

  // 尝试连接 AAP
  await connectAap(request)
}

async function connectAap(request = readRequestId) {
  if (!isCurrentRead(request)) return
  const connection = ++aapRequestId
  const isCurrent = () => isCurrentRead(request) && connection === aapRequestId
  aapReadError.value = ''
  isConnectAap.value = false
  if (!ataParamMap.tower_host || !loginConfig.web_login_name || !loginConfig.web_login_pwd) {
    return
  }

  connecting.value = true
  try {
    const result = await engineApi.queryProjectBaseDir()
    if (!isCurrent()) return
    if (!result) throw new Error(t('settings.engine.noConnectionInfo'))
    if (result) {
      await loadAapInfo(isCurrent)
      if (!isCurrent()) return
      aapProjectBaseDir.value = result.project_base_dir || ''
      isConnectAap.value = true
      ElMessage.success(t('settings.engine.connected'))
    }
  } catch (error) {
    if (!isCurrent()) return
    console.error('Failed to connect AAP:', error)
    aapReadError.value = message('settings.engine.connectionReadFailed')
    ElMessage.error(t('settings.engine.connectFailed'))
  } finally {
    if (isCurrent()) connecting.value = false
  }
}

async function loadAapInfo(isCurrent) {
  const [projectsRes, orgsRes, credsRes, igsRes, eesRes] = await Promise.all([
    engineApi.queryProjects(),
    engineApi.queryOrganizations(),
    engineApi.queryCredentials(),
    engineApi.queryInstanceGroups(),
    engineApi.queryExecutionEnvironments()
  ])
  if (!isCurrent()) return
  for (const response of [projectsRes, orgsRes, credsRes, igsRes, eesRes]) {
    if (response?.results != null && !Array.isArray(response.results)) {
      throw new Error(t('settings.engine.invalidOptions'))
    }
  }

  projects.value = projectsRes?.results || []
  organizations.value = orgsRes?.results || []
  credentials.value = credsRes?.results || []
  instanceGroups.value = igsRes?.results || []
  executionEnvironments.value = eesRes?.results || []
}

async function handleEngineChange() {
  if (!configReady.value || loading.value || saving.value) {
    usedEngine.value = scriptEngine.value
    return
  }
  try {
    await ElMessageBox.confirm(t('settings.engine.switchConfirm'), t('settings.email.changeTitle'), {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      confirmButtonText: t('settings.email.confirm'),
      cancelButtonText: t('common.cancel'),
      type: 'warning'
    })
  } catch {
    usedEngine.value = scriptEngine.value
    return
  }

  if (scriptEngineParam.value) {
    saving.value = true
    try {
      scriptEngineParam.value.value = usedEngine.value
      await engineApi.updateParam(scriptEngineParam.value)
      ElMessage.success(t('settings.engine.switched'))
      scriptEngine.value = usedEngine.value
      await loadScriptEngine()
    } catch (error) {
      console.error('Failed to change engine:', error)
      ElMessage.error(t('settings.engine.switchFailed'))
      usedEngine.value = scriptEngine.value
    } finally {
      saving.value = false
    }
  }
}

function handleProjectChange() {
  const project = manualProjects.value.find(p => p.id === towerConfig.template_project_id)
  if (project && aapProjectBaseDir.value) {
    towerConfig.project_path = `${aapProjectBaseDir.value}/${project.local_path}`
  }
}

function addClusterServer() {
  loginConfig.cluster_servers.push({
    host: '',
    port: '',
    username: '',
    password: ''
  })
}

function deleteClusterServer(index) {
  if (loginConfig.cluster_servers.length <= 1) {
    ElMessage.warning(t('settings.engine.keepOneServer'))
    return
  }
  loginConfig.cluster_servers.splice(index, 1)
}

async function saveAnsibleConfig() {
  if (!configReady.value || loading.value || saving.value) return
  try {
    await ElMessageBox.confirm(t('settings.engine.saveAnsibleConfirm'), t('settings.email.changeTitle'), {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      confirmButtonText: t('settings.email.confirm'),
      cancelButtonText: t('common.cancel'),
      type: 'warning'
    })
  } catch {
    return
  }

  saving.value = true
  try {
    const saveParams = []
    for (const param of jaoParams.value) {
      if (param.name === 'is_fork') {
        param.value = JSON.stringify(jaoParamMap.is_fork)
        saveParams.push(param)
      } else if (param.name === 'forks') {
        param.value = JSON.stringify(jaoParamMap.forks)
        saveParams.push(param)
      } else if (param.name === 'sync_script_git') {
        param.value = JSON.stringify(jaoParamMap.sync_script_git)
        saveParams.push(param)
      }
    }

    await engineApi.batchUpdateParams(saveParams)
    ElMessage.success(t('settings.user.saved'))
    await loadScriptEngine()
  } catch (error) {
    console.error('Failed to save ansible config:', error)
    ElMessage.error(t('settings.user.saveFailed'))
  } finally {
    saving.value = false
  }
}

async function saveAapConfig() {
  if (!configReady.value || loading.value || saving.value) return
  try {
    await ElMessageBox.confirm(t('settings.engine.saveAapConfirm'), t('settings.email.changeTitle'), {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      confirmButtonText: t('settings.email.confirm'),
      cancelButtonText: t('common.cancel'),
      type: 'warning'
    })
  } catch {
    return
  }

  saving.value = true
  try {
    const saveParams = []
    for (const param of ataParams.value) {
      if (param.name === 'tower_host') {
        param.value = ataParamMap.tower_host
        saveParams.push(param)
      } else if (param.name === 'tower_clear') {
        param.value = JSON.stringify(ataParamMap.tower_clear)
        saveParams.push(param)
      } else if (param.name === 'tower_login_config') {
        param.value = JSON.stringify(loginConfig)
        saveParams.push(param)
      } else if (param.name === 'tower_config') {
        param.value = JSON.stringify(towerConfig)
        saveParams.push(param)
      }
    }

    await engineApi.batchUpdateParams(saveParams)
    ElMessage.success(t('settings.user.saved'))
    await loadScriptEngine()
  } catch (error) {
    console.error('Failed to save AAP config:', error)
    ElMessage.error(t('settings.user.saveFailed'))
  } finally {
    saving.value = false
  }
}

function pauseReading() {
  active = false
  interrupted = loading.value || connecting.value
  if (loading.value) {
    configReady.value = false
    loadError.value = message('settings.engine.interrupted')
  }
  readRequestId += 1
  aapRequestId += 1
  loading.value = false
  connecting.value = false
}
onDeactivated(pauseReading)
onBeforeUnmount(pauseReading)
onActivated(() => {
  if (active) return
  active = true
  if (interrupted) {
    interrupted = false
    loadScriptEngine()
  }
})
</script>

<style scoped lang="scss">
.engine-management {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.config-card {
  max-width: 1200px;
}

.engine-hint {
  font-size: 12px;
  color: var(--el-text-color-regular);
  margin-bottom: 8px;
  margin-right: 8px;
}

.nested-card {
  background: var(--el-bg-color-page);

  :deep(.el-card__body) {
    padding: 16px;
  }
}

.form-help {
  font-size: 12px;
  color: var(--el-text-color-regular);
  margin-top: 4px;
}

.mb-2 {
  margin-bottom: 8px;
}

.form-actions {
  :deep(.el-form-item__content) {
    justify-content: flex-end !important;
  }
}
</style>
