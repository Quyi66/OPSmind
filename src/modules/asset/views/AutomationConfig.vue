<template>
  <div class="automation-config">
    <!-- 功能按钮区 -->
    <div class="page-header">
      <div class="page-actions">
        <el-button type="primary" @click="handleAddAnsibleConfig">
          <i class="fa fa-plus" style="margin-right: 4px"></i>
          新增Ansible连接配置
        </el-button>
        <el-button @click="handleDeviceManage">
          <i class="fa fa-cogs" style="margin-right: 4px"></i>
          设备纳管
        </el-button>
      </div>
    </div>

    <!-- Tab 页签 -->
    <div class="tab-section">
      <el-tabs v-model="activeTab" @tab-click="handleTabClick">
        <el-tab-pane name="automation">
          <template #label>
            <span><i class="fa fa-code-branch"></i> 自动化配置信息</span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="ansible">
          <template #label>
            <span><i class="fa fa-wifi"></i> Ansible连接配置</span>
          </template>
        </el-tab-pane>
      </el-tabs>

      <!-- 提示信息 -->
      <el-alert
        v-if="activeTab === 'automation'"
        title="注意：自动化配置是针对每一个自动化资产的默认连接配置进行修改，使用场景如下：执行用户/密码、登录用户/密码、执行引擎节点配置等"
        type="success"
        :closable="false"
        show-icon
        class="tip-alert"
      />
      <el-alert
        v-else
        title="注意：Ansible连接配置是针对Ansible连接参数的配置模板，可以在自动化配置中引用"
        type="success"
        :closable="false"
        show-icon
        class="tip-alert"
      />

      <!-- 自动化配置信息 Tab 内容 -->
      <div v-show="activeTab === 'automation'" class="tab-content">
        <!-- 筛选栏 -->
        <div class="filter-bar">
          <el-select v-model="filters.cit" style="width: 120px" @change="loadAutomationData">
            <el-option label="全部" value="oplus_all" />
            <el-option
              v-for="item in resourceTypes"
              :key="item.code"
              :label="item.title"
              :value="item.code"
            />
          </el-select>
          <div class="filter-right">
            <el-input
              v-model="automationSearch"
              placeholder="搜索"
              clearable
              :prefix-icon="Search"
              style="width: 200px"
            />
          </div>
        </div>

        <!-- 自动化配置表格 -->
        <el-table
          :data="filteredAutomationData"
          v-loading="automationLoading"
          stripe
          style="width: 100%"
          :max-height="tableMaxHeight"
        >
          <el-table-column prop="ci_type" label="资产代码" width="100">
            <template #default="{ row }">
              <el-link type="primary">{{ row.ci_type }}</el-link>
            </template>
          </el-table-column>
          <el-table-column prop="hostKey" label="IP" width="140" />
          <el-table-column prop="ansibleConfigName" label="自动化配置名称" width="160">
            <template #default="{ row }">
              {{ row.ansibleConfigName || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="instanceGroup" label="执行引擎节点(instance group)">
            <template #default="{ row }">
              <el-link v-if="row.instanceGroup" type="primary">{{ row.instanceGroup }}</el-link>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="aapInstanceGroup" label="AAP instance group" width="160">
            <template #default="{ row }">
              {{ row.aapInstanceGroup || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="loginUser" label="登录用户" width="100">
            <template #default="{ row }">
              {{ row.loginUser || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="runUser" label="执行用户" width="100">
            <template #default="{ row }">
              {{ row.runUser || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="updated_at" label="更新时间" width="180">
            <template #default="{ row }">
              <el-link type="primary">{{ formatDateTime(row.updated_at) }}</el-link>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="60" align="left" fixed="right">
            <template #default="{ row }">
              <el-button text type="primary" size="small" @click="handleEditAutomation(row)">
                编辑
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="ops-pagination-wrapper">
          <el-pagination
            v-model:current-page="automationPage"
            v-model:page-size="automationPageSize"
            :page-sizes="[10, 50, 100]"
            :total="automationTotal"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="loadAutomationData"
            @current-change="loadAutomationData"
          />
        </div>
      </div>

      <!-- Ansible连接配置 Tab 内容 -->
      <div v-show="activeTab === 'ansible'" class="tab-content">
        <!-- Ansible配置表格 -->
        <el-table
          :data="filteredAnsibleData"
          v-loading="ansibleLoading"
          stripe
          style="width: 100%"
          :max-height="tableMaxHeight"
        >
          <el-table-column prop="name" label="Ansible配置名称" width="160" />
          <el-table-column prop="instanceGroup" label="执行引擎节点(instance group)" width="200">
            <template #default="{ row }">
              {{ row.instanceGroup || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="aapInstanceGroup" label="AAP instance group" width="160">
            <template #default="{ row }">
              {{ row.aapInstanceGroup || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="loginUser" label="登录用户" width="120">
            <template #default="{ row }">
              {{ row.loginUser || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="runUser" label="执行用户" width="120">
            <template #default="{ row }">
              {{ row.runUser || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="group_paths" label="分组路径" min-width="200">
            <template #default="{ row }">
              <div v-if="row.group_paths">
                <p v-for="(path, idx) in row.group_paths.split(',')" :key="idx">{{ path }}</p>
              </div>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="param" label="Ansible配置信息" width="200" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.param || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="updatedAt" label="更新时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.updatedAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="88" align="left" fixed="right">
            <template #default="{ row }">
              <el-button text type="primary" size="small" @click="handleEditAnsible(row)">
                编辑
              </el-button>
              <el-button text type="danger" size="small" @click="handleDeleteAnsible(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 编辑自动化配置弹窗 -->
    <el-dialog
      v-model="editAutomationDialogVisible"
      title="编辑自动化配置"
      width="600px"
      destroy-on-close
    >
      <el-form :model="automationForm" label-width="140px">
        <el-form-item label="IP">
          <el-input v-model="automationForm.hostKey" disabled />
        </el-form-item>
        <el-form-item label="自动化配置名称">
          <el-select v-model="automationForm.ansibleVarsSetId" clearable placeholder="选择配置模板" style="width: 100%">
            <el-option
              v-for="item in ansibleConfigOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="执行引擎节点">
          <el-input v-model="automationForm.instanceGroup" placeholder="default" />
        </el-form-item>
        <el-form-item label="AAP instance group">
          <el-input v-model="automationForm.aapInstanceGroup" />
        </el-form-item>
        <el-form-item label="登录用户">
          <el-input v-model="automationForm.loginUser" />
        </el-form-item>
        <el-form-item label="登录密码">
          <el-input v-model="automationForm.loginPasswd" type="password" show-password />
        </el-form-item>
        <el-form-item label="执行用户">
          <el-input v-model="automationForm.runUser" />
        </el-form-item>
        <el-form-item label="执行密码">
          <el-input v-model="automationForm.runPasswd" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editAutomationDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAutomationConfig">保存</el-button>
      </template>
    </el-dialog>

    <!-- 新增/编辑Ansible配置弹窗 -->
    <el-dialog
      v-model="editAnsibleDialogVisible"
      :title="ansibleForm.id ? '编辑Ansible配置' : '新增Ansible连接配置'"
      width="700px"
      destroy-on-close
    >
      <el-form :model="ansibleForm" label-width="240px">
        <el-form-item label="执行引擎节点(instance group)" v-if="scriptEngine !== 'aap'">
          <el-select v-model="ansibleForm.instanceGroup" placeholder="请选择" style="width: 100%" clearable>
            <el-option label="none" value=" " />
            <el-option
              v-for="item in instanceGroupOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="AAP instance_group" v-if="scriptEngine === 'aap'">
          <el-select v-model="ansibleForm.aapInstanceGroup" placeholder="请选择" style="width: 100%" clearable>
            <el-option
              v-for="item in aapInstanceGroupOptions"
              :key="item.name"
              :label="item.name"
              :value="item.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Ansible配置名称" required>
          <el-input v-model="ansibleForm.name" placeholder="设备纳管时，根据已有配置名称设置设备的自动化连接配置" />
        </el-form-item>
        <el-form-item label="分组">
          <el-select
            v-model="ansibleForm.groupIds"
            placeholder="请选择分组"
            style="width: 100%"
            multiple
            clearable
          >
            <el-option
              v-for="item in groupOptions"
              :key="item.id"
              :label="`${item.path} (${item.ciType})`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="登录用户">
          <el-input v-model="ansibleForm.loginUser" />
        </el-form-item>
        <el-form-item label="登录密码">
          <el-input v-model="ansibleForm.loginPasswd" type="password" show-password />
        </el-form-item>
        <el-form-item label="执行用户">
          <el-input v-model="ansibleForm.runUser" />
        </el-form-item>
        <el-form-item label="执行密码">
          <el-input v-model="ansibleForm.runPasswd" type="password" show-password />
        </el-form-item>
        <el-form-item label="Ansible配置信息">
          <el-input
            v-model="ansibleForm.param"
            type="textarea"
            :rows="3"
            placeholder="例如: ansible_python_interpreter=/usr/libexec/platform-python"
          />
          <div class="form-desc">除了登录用户密码、执行用户密码之外的Ansible配置参数</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editAnsibleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAnsibleConfig">保存</el-button>
      </template>
    </el-dialog>

    <!-- 设备纳管弹窗 -->
    <DeviceManageDialog
      v-model="deviceManageDialogVisible"
      @success="handleDeviceManageSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { dtsApi } from '../api'
import { apiService } from '@/core/api'
import DeviceManageDialog from '../components/DeviceManageDialog.vue'

// Tab
const activeTab = ref('automation')

// 资源类型
const resourceTypes = ref([])

// 筛选条件
const filters = ref({
  cit: 'oplus_all'
})

// 自动化配置数据
const automationLoading = ref(false)
const automationData = ref([])
const automationSearch = ref('')
const automationPage = ref(1)
const automationPageSize = ref(100)
const automationTotal = ref(0)

// Ansible配置数据
const ansibleLoading = ref(false)
const ansibleData = ref([])
const ansibleConfigOptions = ref([])

// 弹窗下拉选项
const scriptEngine = ref('ansible')
const instanceGroupOptions = ref([])
const aapInstanceGroupOptions = ref([])
const groupOptions = ref([])

// 表格高度
const tableMaxHeight = ref(500)

// 弹窗
const editAutomationDialogVisible = ref(false)
const editAnsibleDialogVisible = ref(false)
const deviceManageDialogVisible = ref(false)

// 表单
const automationForm = ref({})
const ansibleForm = ref({})

// 计算属性
const filteredAutomationData = computed(() => {
  if (!automationSearch.value) return automationData.value
  const keyword = automationSearch.value.toLowerCase()
  return automationData.value.filter(item =>
    item.hostKey?.toLowerCase().includes(keyword) ||
    item.ci_type?.toLowerCase().includes(keyword) ||
    item.loginUser?.toLowerCase().includes(keyword) ||
    item.instanceGroup?.toLowerCase().includes(keyword)
  )
})

const filteredAnsibleData = computed(() => {
  return ansibleData.value
})

const automationPageInfo = computed(() => {
  const start = (automationPage.value - 1) * automationPageSize.value + 1
  const end = Math.min(automationPage.value * automationPageSize.value, automationTotal.value)
  return `${start} - ${end} / ${automationTotal.value}`
})

onMounted(() => {
  loadResourceTypes()
  loadAutomationData()
  loadAnsibleData()
  updateTableHeight()
  window.addEventListener('resize', updateTableHeight)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateTableHeight)
})

function updateTableHeight() {
  tableMaxHeight.value = window.innerHeight - 340
}

// 加载资源类型
async function loadResourceTypes() {
  try {
    const response = await dtsApi.queryData('ACM_GET_RESOURCE_TYPE', null)
    resourceTypes.value = response?.records || []
  } catch (error) {
    console.error('加载资源类型失败:', error)
  }
}

// 加载自动化配置数据
async function loadAutomationData() {
  automationLoading.value = true
  try {
    const response = await dtsApi.queryData('ACM_AUTOMATION_GET', {
      cit: filters.value.cit,
      param: 'x'
    }, {
      size: automationPageSize.value,
      page: automationPage.value,
      filter: ''
    })
    automationData.value = response?.records || []
    automationTotal.value = response?.total || 0
    console.log('自动化配置数据:', automationData.value)
  } catch (error) {
    console.error('加载自动化配置失败:', error)
    ElMessage.error('加载自动化配置失败')
  } finally {
    automationLoading.value = false
  }
}

// 加载Ansible配置数据
async function loadAnsibleData() {
  ansibleLoading.value = true
  try {
    const response = await dtsApi.queryData('ACM_GET_ALL_ANSIBLE_SET_REST', {})
    ansibleData.value = response?.records || []
    ansibleConfigOptions.value = response?.records || []
    console.log('Ansible配置数据:', ansibleData.value)
  } catch (error) {
    console.error('加载Ansible配置失败:', error)
    ElMessage.error('加载Ansible配置失败')
  } finally {
    ansibleLoading.value = false
  }
}

// Tab切换
function handleTabClick() {
  if (activeTab.value === 'automation') {
    loadAutomationData()
  } else {
    loadAnsibleData()
  }
}

// 加载Ansible表单选项数据
async function loadAnsibleFormOptions() {
  try {
    // 加载脚本引擎类型
    const engineRes = await dtsApi.queryData('ACM_GET_SCRIPT_ENGINE', null)
    scriptEngine.value = engineRes?.records?.[0]?.result || 'ansible'

    // 加载执行引擎节点列表
    const instanceRes = await dtsApi.queryData('GET_TAT_URL_AS_STRING_LIST', null)
    if (instanceRes?.records?.[0]?.value) {
      try {
        instanceGroupOptions.value = JSON.parse(instanceRes.records[0].value)
      } catch {
        instanceGroupOptions.value = []
      }
    }

    // 加载AAP instance group（如果是aap引擎）
    if (scriptEngine.value === 'aap') {
      const aapRes = await dtsApi.queryData('AAP_QUERY_INSTANCE_GROUP', null)
      aapInstanceGroupOptions.value = aapRes?.records || []
    }

    // 加载分组列表
    const groupRes = await dtsApi.queryData('ACM_GET_GROUP_BY_CIT', { ciType: 'oplus_all' })
    groupOptions.value = groupRes?.records || []
  } catch (error) {
    console.error('加载表单选项失败:', error)
  }
}

// 格式化日期时间
function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  // 如果已经是格式化的字符串
  if (typeof dateStr === 'string' && dateStr.includes('-')) {
    return dateStr
  }
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
}

// 编辑自动化配置
function handleEditAutomation(row) {
  automationForm.value = {
    id: row.id,
    cid: row.cid,
    hostKey: row.hostKey,
    ansibleVarsSetId: row.ansibleVarsSetId,
    instanceGroup: row.instanceGroup,
    aapInstanceGroup: row.aapInstanceGroup,
    loginUser: row.loginUser,
    loginPasswd: '',
    runUser: row.runUser,
    runPasswd: ''
  }
  editAutomationDialogVisible.value = true
}

// 保存自动化配置
async function saveAutomationConfig() {
  try {
    // TODO: 调用保存接口
    ElMessage.success('保存成功')
    editAutomationDialogVisible.value = false
    loadAutomationData()
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  }
}

// 新增Ansible配置
async function handleAddAnsibleConfig() {
  // 先加载表单选项
  await loadAnsibleFormOptions()

  ansibleForm.value = {
    id: '',
    name: '',
    instanceGroup: '',
    aapInstanceGroup: '',
    groupIds: [],
    loginUser: '',
    loginPasswd: '',
    runUser: '',
    runPasswd: '',
    param: ''
  }
  editAnsibleDialogVisible.value = true
}

// 编辑Ansible配置
async function handleEditAnsible(row) {
  // 先加载表单选项
  await loadAnsibleFormOptions()

  ansibleForm.value = {
    id: row.id,
    name: row.name,
    instanceGroup: row.instanceGroup,
    aapInstanceGroup: row.aapInstanceGroup,
    groupIds: row.groupIds ? row.groupIds.split(',') : [],
    loginUser: row.loginUser,
    loginPasswd: '',
    runUser: row.runUser,
    runPasswd: '',
    param: row.param
  }
  editAnsibleDialogVisible.value = true
}

// 删除Ansible配置
async function handleDeleteAnsible(row) {
  try {
    await ElMessageBox.confirm('该ansible配置可能被多个主机引用，是否确定删除？', '确认删除', {
      type: 'warning'
    })
    await apiService.post(`/cm/api/cm/v2/host/ansible/remove/${row.id}`)
    ElMessage.success('删除成功')
    loadAnsibleData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 保存Ansible配置
async function saveAnsibleConfig() {
  if (!ansibleForm.value.name) {
    ElMessage.warning('请输入配置名称')
    return
  }
  try {
    const data = {
      id: ansibleForm.value.id || null,
      varSetName: ansibleForm.value.name,
      varSetValue: ansibleForm.value.param,
      autoType: scriptEngine.value,
      instanceGroup: ansibleForm.value.instanceGroup,
      aapInstanceGroup: ansibleForm.value.aapInstanceGroup,
      groupIds: ansibleForm.value.groupIds?.join(',') || '',
      loginUser: ansibleForm.value.loginUser,
      loginPasswd: ansibleForm.value.loginPasswd,
      runUser: ansibleForm.value.runUser,
      runPasswd: ansibleForm.value.runPasswd
    }
    await apiService.post('/cm/api/cm/v2/host/ansible/save', data)
    ElMessage.success('保存成功')
    editAnsibleDialogVisible.value = false
    loadAnsibleData()
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  }
}

// 设备纳管
function handleDeviceManage() {
  deviceManageDialogVisible.value = true
}

// 设备纳管成功回调
function handleDeviceManageSuccess() {
  ElMessage.success('设备纳管任务已提交，请在操作记录中查看执行状态')
  // 刷新自动化配置数据
  loadAutomationData()
}
</script>

<style scoped lang="scss">
.automation-config {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f7fa;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;

  .page-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  .page-actions {
    display: flex;
    gap: 8px;
  }
}

.tab-section {
  flex: 1;
  margin: 16px;
  padding: 16px;
  background: #fff;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;

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

.tip-alert {
  margin: 12px 0;

  :deep(.el-alert__title) {
    font-size: 13px;
  }
}

.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;

  .filter-right {
    display: flex;
    gap: 8px;
  }
}

.pagination-wrapper {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;

  .page-info {
    color: #606266;
    font-size: 13px;
  }

  :deep(.el-pagination) {
    margin-left: auto;
  }
}

.form-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}
</style>
