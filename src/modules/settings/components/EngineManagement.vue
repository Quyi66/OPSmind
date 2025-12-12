<template>
  <div class="engine-management">
    <el-card class="config-card" v-loading="loading">
      <el-form label-width="200px" label-position="left">
        <!-- 引擎类型选择 -->
        <el-form-item label="OPlus Execute Engine">
          <div class="engine-hint">Ansible or Ansible Automation Platform</div>
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
          <el-divider content-position="left">Ansible 配置</el-divider>

          <el-form-item label="Enable Host Forks">
            <el-switch v-model="jaoParamMap.is_fork" />
          </el-form-item>

          <el-form-item label="Host Forks Size">
            <el-input-number v-model="jaoParamMap.forks" :min="100" style="width: 200px" />
          </el-form-item>

          <el-form-item label="Sync Git Project Before Starting Job">
            <el-switch v-model="jaoParamMap.sync_script_git" />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="saveAnsibleConfig" :loading="saving">
              保存
            </el-button>
          </el-form-item>
        </template>

        <!-- AAP 配置 -->
        <template v-if="scriptEngine === 'aap'">
          <el-divider content-position="left">AAP 配置</el-divider>

          <el-form-item label="AAP Clear">
            <el-switch v-model="ataParamMap.tower_clear" />
          </el-form-item>

          <!-- AAP Web Login 配置 -->
          <el-form-item label="AAP Web Login Config">
            <el-card class="nested-card">
              <el-form-item label="Login Host" label-width="140px">
                <el-input v-model="ataParamMap.tower_host" style="width: 300px" />
                <div class="form-help">AAP 服务器地址</div>
              </el-form-item>

              <el-form-item label="Login Name" label-width="140px">
                <el-input v-model="loginConfig.web_login_name" style="width: 300px" />
                <div class="form-help">AAP 登录用户名</div>
              </el-form-item>

              <el-form-item label="Login Password" label-width="140px">
                <el-input
                  v-model="loginConfig.web_login_pwd"
                  type="password"
                  show-password
                  style="width: 300px"
                />
                <div class="form-help">AAP 登录密码</div>
              </el-form-item>
            </el-card>
          </el-form-item>

          <!-- AAP Servers -->
          <template v-if="isConnectAap">
            <el-form-item label="AAP Servers">
              <div class="form-help mb-2">AAP 集群服务器配置</div>
              <el-table :data="clusterServers" border style="max-width: 800px">
                <el-table-column label="Host" min-width="150">
                  <template #default="{ row }">
                    <el-input v-model="row.host" size="small" />
                  </template>
                </el-table-column>
                <el-table-column label="Port" width="100">
                  <template #default="{ row }">
                    <el-input v-model="row.port" size="small" />
                  </template>
                </el-table-column>
                <el-table-column label="Username" min-width="150">
                  <template #default="{ row }">
                    <el-input v-model="row.username" size="small" />
                  </template>
                </el-table-column>
                <el-table-column label="Password" min-width="150">
                  <template #default="{ row }">
                    <el-input v-model="row.password" type="password" size="small" />
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="150">
                  <template #default="{ $index }">
                    <el-button type="danger" size="small" @click="deleteClusterServer($index)">
                      删除
                    </el-button>
                    <el-button type="primary" size="small" @click="addClusterServer">
                      添加
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-form-item>

            <!-- AAP Execute Config -->
            <el-form-item label="AAP Execute Config">
              <div class="form-help mb-2">AAP 执行配置</div>
              <el-card class="nested-card">
                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="Git Project" label-width="180px">
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
                    <el-form-item label="Organization" label-width="180px">
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
                    <el-form-item label="Manual Project" label-width="180px">
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
                    <el-form-item label="Manual Project Path" label-width="180px">
                      <el-input v-model="towerConfig.project_path" disabled style="width: 100%" />
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="Credential" label-width="180px">
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
                    <el-form-item label="Instance Group" label-width="180px">
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
                    <el-form-item label="Execution Environment" label-width="180px">
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
                    <el-form-item label="Template Become Enabled" label-width="200px">
                      <el-switch v-model="towerConfig.template_become" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="Sync Git Before Job" label-width="200px">
                      <el-switch v-model="towerConfig.sync_git_project_before_starting_job" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="Encrypt Host Pass" label-width="200px">
                      <el-switch v-model="towerConfig.encrypt_host_pass" />
                    </el-form-item>
                  </el-col>
                </el-row>
              </el-card>
            </el-form-item>
          </template>

          <el-form-item>
            <el-button type="primary" @click="saveAapConfig" :loading="saving">
              保存
            </el-button>
          </el-form-item>
        </template>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as engineApi from '@/modules/settings/api/engine'

const loading = ref(false)
const saving = ref(false)

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
const loginConfig = reactive({
  web_login_name: '',
  web_login_pwd: '',
  cluster_servers: [{ host: '', port: '', username: '', password: '' }]
})

// AAP Tower 配置
const towerConfig = reactive({
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
})

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
  loading.value = true
  try {
    const param = await engineApi.getParamByDomainAndName('jao', 'script_engine')
    if (param) {
      scriptEngineParam.value = param
      usedEngine.value = param.value || 'ansible'
      scriptEngine.value = param.value || 'ansible'

      if (scriptEngine.value === 'ansible') {
        await loadAnsibleConfig()
      } else if (scriptEngine.value === 'aap') {
        await loadAapConfig()
      }
    }
  } catch (error) {
    console.error('Failed to load script engine:', error)
    ElMessage.error('加载引擎配置失败')
  } finally {
    loading.value = false
  }
}

async function loadAnsibleConfig() {
  try {
    const params = await engineApi.getParamsByDomain('jao')
    jaoParams.value = params || []

    for (const param of jaoParams.value) {
      if (param.name === 'is_fork') {
        jaoParamMap.is_fork = JSON.parse(param.value || 'false')
      } else if (param.name === 'forks') {
        jaoParamMap.forks = JSON.parse(param.value || '100')
      } else if (param.name === 'sync_script_git') {
        jaoParamMap.sync_script_git = JSON.parse(param.value || 'false')
      }
    }
  } catch (error) {
    console.error('Failed to load ansible config:', error)
  }
}

async function loadAapConfig() {
  try {
    const params = await engineApi.getParamsByDomain('ata')
    ataParams.value = params || []

    for (const param of ataParams.value) {
      if (param.name === 'tower_host') {
        ataParamMap.tower_host = param.value || ''
      } else if (param.name === 'tower_clear') {
        ataParamMap.tower_clear = JSON.parse(param.value || 'false')
      } else if (param.name === 'tower_login_config') {
        const config = JSON.parse(param.value || '{}')
        Object.assign(loginConfig, config)
      } else if (param.name === 'tower_config') {
        const config = JSON.parse(param.value || '{}')
        Object.assign(towerConfig, config)
      }
    }

    // 尝试连接 AAP
    await connectAap()
  } catch (error) {
    console.error('Failed to load AAP config:', error)
  }
}

async function connectAap() {
  if (!ataParamMap.tower_host || !loginConfig.web_login_name || !loginConfig.web_login_pwd) {
    return
  }

  try {
    const result = await engineApi.queryProjectBaseDir()
    if (result) {
      isConnectAap.value = true
      aapProjectBaseDir.value = result.project_base_dir || ''
      await loadAapInfo()
      ElMessage.success('连接 AAP 成功')
    }
  } catch (error) {
    console.error('Failed to connect AAP:', error)
    ElMessage.error('无法连接 AAP，请检查账号配置')
  }
}

async function loadAapInfo() {
  try {
    const [projectsRes, orgsRes, credsRes, igsRes, eesRes] = await Promise.all([
      engineApi.queryProjects(),
      engineApi.queryOrganizations(),
      engineApi.queryCredentials(),
      engineApi.queryInstanceGroups(),
      engineApi.queryExecutionEnvironments()
    ])

    projects.value = projectsRes?.results || []
    organizations.value = orgsRes?.results || []
    credentials.value = credsRes?.results || []
    instanceGroups.value = igsRes?.results || []
    executionEnvironments.value = eesRes?.results || []
  } catch (error) {
    console.error('Failed to load AAP info:', error)
  }
}

async function handleEngineChange() {
  try {
    await ElMessageBox.confirm(
      '确定要切换执行引擎吗？此操作将保存更改。',
      '变更操作',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    usedEngine.value = scriptEngine.value
    return
  }

  if (scriptEngineParam.value) {
    saving.value = true
    try {
      scriptEngineParam.value.value = usedEngine.value
      await engineApi.updateParam(scriptEngineParam.value)
      ElMessage.success('引擎切换成功')
      scriptEngine.value = usedEngine.value
      await loadScriptEngine()
    } catch (error) {
      console.error('Failed to change engine:', error)
      ElMessage.error('引擎切换失败')
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
    ElMessage.warning('至少保留一个服务器节点')
    return
  }
  loginConfig.cluster_servers.splice(index, 1)
}

async function saveAnsibleConfig() {
  try {
    await ElMessageBox.confirm(
      '确定要保存 Ansible 配置吗？',
      '变更操作',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
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
    ElMessage.success('保存成功')
    await loadScriptEngine()
  } catch (error) {
    console.error('Failed to save ansible config:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function saveAapConfig() {
  try {
    await ElMessageBox.confirm(
      '确定要保存 AAP 配置吗？',
      '变更操作',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
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
    ElMessage.success('保存成功')
    await loadScriptEngine()
  } catch (error) {
    console.error('Failed to save AAP config:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}
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
    color: #303133;
  }
}

.config-card {
  max-width: 1200px;
}

.engine-hint {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.nested-card {
  background: #f5f7fa;

  :deep(.el-card__body) {
    padding: 16px;
  }
}

.form-help {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.mb-2 {
  margin-bottom: 8px;
}
</style>
