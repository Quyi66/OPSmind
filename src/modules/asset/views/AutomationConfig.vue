<template>
  <div class="ops-page-layout">
    <!-- Tab 页签 -->
    <el-tabs v-model="activeTab" @tab-click="handleTabClick" class="ops-tabs">
      <el-tab-pane name="automation">
        <template #label>
          <span>
            <i class="fa fa-code-branch"></i>
            自动化配置信息
          </span>
        </template>
      </el-tab-pane>
      <el-tab-pane name="ansible">
        <template #label>
          <span>
            <i class="fa fa-wifi"></i>
            Ansible连接配置
          </span>
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
      style="margin-bottom: 12px"
    />
    <el-alert
      v-else
      title="注意：Ansible连接配置是针对Ansible连接参数的配置模板，可以在自动化配置中引用"
      type="success"
      :closable="false"
      show-icon
      style="margin-bottom: 12px"
    />

    <!-- 自动化配置信息 Tab 内容 -->
    <template v-if="activeTab === 'automation'">
      <!-- 筛选区 -->
      <div class="ops-filter-bar">
        <el-form :inline="true" size="small">
          <el-form-item label="资产类型">
            <el-select v-model="filters.cit" style="width: 150px">
              <el-option label="全部" value="oplus_all" />
              <el-option
                v-for="item in resourceTypes"
                :key="item.code"
                :label="item.title"
                :value="item.code"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="关键词">
            <el-input
              v-model="automationSearch"
              placeholder="搜索"
              clearable
              style="width: 180px"
              maxlength="50"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleAutomationSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="handleAutomationReset">
              <el-icon><RefreshRight /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 操作栏 -->
      <div class="ops-action-bar">
        <el-button type="primary" size="small" @click="handleAddAnsibleConfig">
          <i class="fa fa-plus" style="margin-right: 4px"></i>
          新增Ansible连接配置
        </el-button>
        <el-button size="small" @click="handleDeviceManage">
          <i class="fa fa-cogs" style="margin-right: 4px"></i>
          设备纳管
        </el-button>
        <span style="flex: 1"></span>
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="automationLoading"
          @click="loadAutomationData"
          title="刷新"
        >
          <el-icon v-show="!automationLoading"><Refresh /></el-icon>
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="ops-table-wrapper">
        <el-table
          :data="filteredAutomationData"
          v-loading="automationLoading"
          :max-height="tableMaxHeight"
        >
          <el-table-column prop="ci_type" label="资产代码" width="100" />
          <el-table-column prop="ip" label="IP" width="140" />
          <el-table-column prop="hostname" label="自动化配置名称" width="160">
            <template #default="{ row }">
              {{ row.hostname || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="instance_group" label="执行引擎节点(instance group)" />
          <el-table-column prop="aap_instance_group" label="AAP instance group" width="160">
            <template #default="{ row }">
              {{ row.aap_instance_group || '-' }}
            </template>
          </el-table-column>
          <!-- <el-table-column prop="login_user" label="登录用户" width="100">
            <template #default="{ row }">
              {{ row.login_user || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="runUser" label="执行用户" width="100">
            <template #default="{ row }">
              {{ row.runUser || '-' }}
            </template>
          </el-table-column> -->
          <el-table-column prop="updated_at" label="更新时间" width="180">
            <template #default="{ row }">
              <span>{{ formatDateTime(row.updated_at) }}</span>
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
      </div>

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
    </template>

    <!-- Ansible连接配置 Tab 内容 -->
    <template v-if="activeTab === 'ansible'">
      <!-- 筛选区 -->
      <div class="ops-filter-bar">
        <el-form :inline="true" size="small">
          <el-form-item label="关键词">
            <el-input
              v-model="ansibleSearch"
              placeholder="搜索"
              clearable
              style="width: 180px"
              maxlength="50"
            />
          </el-form-item>
          <!-- <el-form-item>
            <el-button type="primary" @click="handleAnsibleSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="handleAnsibleReset">
              <el-icon><RefreshRight /></el-icon>
              重置
            </el-button>
          </el-form-item> -->
        </el-form>
      </div>

      <!-- 操作栏 -->
      <div class="ops-action-bar">
        <el-button type="primary" size="small" @click="handleAddAnsibleConfig">
          <i class="fa fa-plus" style="margin-right: 4px"></i>
          新增Ansible连接配置
        </el-button>
        <el-button size="small" @click="handleDeviceManage">
          <i class="fa fa-cogs" style="margin-right: 4px"></i>
          设备纳管
        </el-button>
        <span style="flex: 1"></span>
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="ansibleLoading"
          @click="loadAnsibleData"
          title="刷新"
        >
          <el-icon v-show="!ansibleLoading"><Refresh /></el-icon>
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="ops-table-wrapper">
        <el-table
          :data="paginatedAnsibleData"
          v-loading="ansibleLoading"
          :max-height="tableMaxHeight"
        >
          <el-table-column prop="name" label="配置名称" width="120" />
          <el-table-column prop="instanceGroup" label="执行引擎节点(instance group)" width="250">
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
          <el-table-column prop="group_paths" label="分组路径" min-width="120">
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
          <el-table-column label="操作" width="100" align="left" fixed="right">
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

      <!-- 分页 -->
      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="ansiblePage"
          v-model:page-size="ansiblePageSize"
          :page-sizes="[10, 50, 100]"
          :total="ansibleTotal"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleAnsiblePageSizeChange"
          @current-change="handleAnsiblePageChange"
        />
      </div>
    </template>

    <!-- 编辑自动化配置弹窗 -->
    <el-dialog
      v-model="editAutomationDialogVisible"
      title="编辑自动化配置"
      width="600px"
      destroy-on-close
    >
      <el-form :model="automationForm" label-width="150px" v-loading="automationFormLoading">
        <el-form-item label="IP">
          <el-input v-model="automationForm.ip" disabled />
        </el-form-item>
        <!-- (instance group) -->
        <el-form-item label="执行引擎节点" v-if="scriptEngine !== 'aap'">
          <el-select
            v-model="automationForm.instanceGroup"
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
        <el-form-item label="AAP instance_group" v-if="scriptEngine === 'aap'">
          <el-select
            v-model="automationForm.aapInstanceGroup"
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
        <el-form-item label="自动化配置名称">
          <el-select
            v-model="automationForm.ansibleConfigId"
            clearable
            placeholder="选择配置模板"
            style="width: 100%"
          >
            <el-option
              v-for="item in ansibleConfigOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="登录用户">
          <el-input v-model="automationForm.loginUser" maxlength="32" />
        </el-form-item>
        <el-form-item label="登录密码">
          <el-input
            v-model="automationForm.loginPasswd"
            type="password"
            show-password
            autocomplete="new-password"
            maxlength="32"
          />
        </el-form-item>
        <el-form-item label="执行用户">
          <el-input v-model="automationForm.runUser" maxlength="32" />
        </el-form-item>
        <el-form-item label="执行密码">
          <el-input
            v-model="automationForm.runPasswd"
            type="password"
            show-password
            autocomplete="new-password"
            maxlength="32"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editAutomationDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="automationSaving" @click="saveAutomationConfig">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 新增/编辑Ansible配置弹窗 -->
    <el-dialog
      v-model="editAnsibleDialogVisible"
      :title="ansibleForm.id ? '编辑Ansible配置' : '新增Ansible连接配置'"
      width="700px"
      destroy-on-close
    >
      <el-form :model="ansibleForm" label-width="130px" v-loading="ansibleFormLoading">
        <el-form-item label="执行引擎节点" v-if="scriptEngine !== 'aap'">
          <el-select
            v-model="ansibleForm.instanceGroup"
            placeholder="请选择"
            style="width: 100%"
            clearable
          >
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
          <el-select
            v-model="ansibleForm.aapInstanceGroup"
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
        <el-form-item label="Ansible配置名称" required>
          <el-input
            v-model="ansibleForm.name"
            placeholder="设备纳管时，根据已有配置名称设置设备的自动化连接配置"
            maxlength="50"
          />
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
          <el-input v-model="ansibleForm.loginUser" maxlength="32" />
        </el-form-item>
        <el-form-item label="登录密码">
          <el-input
            v-model="ansibleForm.loginPasswd"
            type="password"
            show-password
            autocomplete="new-password"
            maxlength="32"
          />
        </el-form-item>
        <el-form-item label="执行用户">
          <el-input v-model="ansibleForm.runUser" maxlength="32" />
        </el-form-item>
        <el-form-item label="执行密码">
          <el-input
            v-model="ansibleForm.runPasswd"
            type="password"
            show-password
            autocomplete="new-password"
            maxlength="32"
          />
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
    <DeviceManageDialog v-model="deviceManageDialogVisible" @success="handleDeviceManageSuccess" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { automationApi, dataManageApi } from '../api'
import { apiService } from '@/core/api'
import { authService } from '@/core/auth'
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
const ansibleSearch = ref('')
const ansibleConfigOptions = ref([])
const ansiblePage = ref(1)
const ansiblePageSize = ref(100)

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
const automationFormLoading = ref(false)
const automationSaving = ref(false)
const ansibleForm = ref({})
const ansibleFormLoading = ref(false)

// 计算属性 - 直接使用后端返回的数据（后端已筛选）
const filteredAutomationData = computed(() => {
  return automationData.value
})

const filteredAnsibleData = computed(() => {
  if (!ansibleSearch.value) {
    return ansibleData.value
  }
  const keyword = ansibleSearch.value.toLowerCase()
  return ansibleData.value.filter(item => {
    return (
      item.name?.toLowerCase().includes(keyword) ||
      item.instanceGroup?.toLowerCase().includes(keyword) ||
      item.aapInstanceGroup?.toLowerCase().includes(keyword) ||
      item.loginUser?.toLowerCase().includes(keyword) ||
      item.runUser?.toLowerCase().includes(keyword) ||
      item.param?.toLowerCase().includes(keyword)
    )
  })
})

// Ansible 分页后的数据
const paginatedAnsibleData = computed(() => {
  const start = (ansiblePage.value - 1) * ansiblePageSize.value
  const end = start + ansiblePageSize.value
  return filteredAnsibleData.value.slice(start, end)
})

// Ansible 配置总数（筛选后）
const ansibleTotal = computed(() => {
  return filteredAnsibleData.value.length
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
    const response = await dataManageApi.getResourceTypes()
    resourceTypes.value = response?.records || []
  } catch (error) {
    console.error('加载资源类型失败:', error)
  }
}

// 加载自动化配置数据
async function loadAutomationData() {
  automationLoading.value = true
  try {
    const response = await automationApi.getAutomationConfigs(
      {
        cit: filters.value.cit,
        param: 'x'
      },
      {
        size: automationPageSize.value,
        page: automationPage.value,
        filter: automationSearch.value || undefined
      }
    )
    automationData.value = response?.records || []
    automationTotal.value = response?.total || 0
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
    // ACM_GET_ALL_ANSIBLE_SET_REST → GET /acm/api/acm/auto/ansible/find/all
    const res = await apiService.get('/acm/api/acm/auto/ansible/find/all')
    const records = res?.data || res || []
    ansibleData.value = Array.isArray(records) ? records : (records?.records || [])
    // 更新配置选项（供其它下拉使用）
    ansibleConfigOptions.value = ansibleData.value
  } catch (error) {
    console.error('加载Ansible配置失败:', error)
    ElMessage.error('加载Ansible配置失败')
  } finally {
    ansibleLoading.value = false
  }
}

// Ansible配置搜索
function handleAnsibleSearch() {
  ansiblePage.value = 1
}

// Ansible配置重置
function handleAnsibleReset() {
  ansibleSearch.value = ''
  ansiblePage.value = 1
}

// Ansible 分页变化
function handleAnsiblePageChange() {
  // 分页由 computed 处理
}

function handleAnsiblePageSizeChange() {
  ansiblePage.value = 1
}

// Tab切换
function handleTabClick() {
  if (activeTab.value === 'automation') {
    loadAutomationData()
  } else {
    loadAnsibleData()
  }
}

// 自动化配置搜索
function handleAutomationSearch() {
  automationPage.value = 1
  loadAutomationData()
}

// 自动化配置重置
function handleAutomationReset() {
  filters.value.cit = 'oplus_all'
  automationSearch.value = ''
  automationPage.value = 1
  loadAutomationData()
}

// 加载Ansible表单选项数据
async function loadAnsibleFormOptions() {
  try {
    const engineData = await automationApi.getScriptEngine()
    scriptEngine.value = engineData?.value || 'ansible'
    instanceGroupOptions.value = []
    aapInstanceGroupOptions.value = []

    // 加载执行引擎节点列表
    const instanceGroups = await automationApi.getInstanceGroupList()
    if (instanceGroups.length > 0) {
      instanceGroupOptions.value = instanceGroups
    }

    // 加载AAP instance group（如果是aap引擎）: AAP_QUERY_INSTANCE_GROUP → GET /jao/api/jao/aap/instance_group
    if (scriptEngine.value === 'aap') {
      const aapRes = await apiService.get('/jao/api/jao/aap/instance_group')
      const aapData = aapRes?.data || aapRes
      aapInstanceGroupOptions.value = Array.isArray(aapData) ? aapData : (aapData?.records || [])
    }

    // 加载分组列表
    const groupRes = await apiService.get('/acm/api/acm/query/group/find/oplus_all')
    const groupData = groupRes?.data || groupRes
    groupOptions.value = Array.isArray(groupData) ? groupData : (groupData?.records || [])
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
async function handleEditAutomation(row) {
  // 先打开弹窗，显示loading
  editAutomationDialogVisible.value = true
  automationFormLoading.value = true

  // 初始化表单数据
  automationForm.value = {
    id: row.id,
    ciId: row.cid,
    ip: row.hostKey,
    ansibleConfigId: row.ansibleVarsSetId,
    instanceGroup: row.instanceGroup || '',
    aapInstanceGroup: row.aapInstanceGroup || '',
    loginUser: row.loginUser || '',
    loginPasswd: '',
    runUser: row.runUser || '',
    runPasswd: ''
  }

  try {
    // 加载表单选项
    await loadAutomationFormOptions()
  } finally {
    automationFormLoading.value = false
  }
}

// 加载自动化配置表单选项
async function loadAutomationFormOptions() {
  try {
    const engineData = await automationApi.getScriptEngine()
    scriptEngine.value = engineData?.value || 'ansible'
    instanceGroupOptions.value = []
    aapInstanceGroupOptions.value = []

    // 加载执行引擎节点列表（非AAP引擎）
    if (scriptEngine.value !== 'aap') {
      instanceGroupOptions.value = await automationApi.getInstanceGroupList()
    }

    // 加载AAP instance group（AAP引擎）: AAP_QUERY_INSTANCE_GROUP → GET /jao/api/jao/aap/instance_group
    if (scriptEngine.value === 'aap') {
      const aapRes = await apiService.get('/jao/api/jao/aap/instance_group')
      const aapData = aapRes?.data || aapRes
      aapInstanceGroupOptions.value = Array.isArray(aapData) ? aapData : (aapData?.records || [])
    }

    // 加载自动化配置名称列表
    ansibleConfigOptions.value = await automationApi.getAllAssetAutoConfigOptions()
  } catch (error) {
    console.error('加载自动化配置表单选项失败:', error)
  }
}

// 保存自动化配置
async function saveAutomationConfig() {
  automationSaving.value = true
  try {
    // 调用作业 3TRE7d 保存配置
    const params = {
      id: automationForm.value.id,
      ciId: automationForm.value.ciId,
      ansibleConfigId: automationForm.value.ansibleConfigId || '',
      instanceGroup: automationForm.value.instanceGroup || '',
      aapInstanceGroup: automationForm.value.aapInstanceGroup || '',
      loginUser: automationForm.value.loginUser || '',
      loginPasswd: automationForm.value.loginPasswd || '',
      runUser: automationForm.value.runUser || '',
      runPasswd: automationForm.value.runPasswd || ''
    }

    const cacheBuster = Date.now()
    await apiService.post(`/jao/api/jao/jobs/3TRE7d/run?cacheBuster=${cacheBuster}`, {
      params
    })

    ElMessage.success('保存成功')
    editAutomationDialogVisible.value = false
    loadAutomationData()
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    automationSaving.value = false
  }
}

// 新增Ansible配置
async function handleAddAnsibleConfig() {
  // 先初始化表单并打开弹窗
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
  ansibleFormLoading.value = true

  try {
    // 异步加载表单选项
    await loadAnsibleFormOptions()
  } finally {
    ansibleFormLoading.value = false
  }
}

// 编辑Ansible配置
async function handleEditAnsible(row) {
  // 先初始化表单并打开弹窗
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
  ansibleFormLoading.value = true

  try {
    // 异步加载表单选项
    await loadAnsibleFormOptions()
  } finally {
    ansibleFormLoading.value = false
  }
}

// 删除Ansible配置
async function handleDeleteAnsible(row) {
  try {
    await ElMessageBox.confirm('该ansible配置可能被多个主机引用，是否确定删除？', '确认删除', {
      type: 'warning'
    })

    // 获取 token
    const token = authService.getToken() || ''

    const cacheBuster = Date.now()
    await apiService.post(`/jao/api/jao/jobs/OApRjl/run?cacheBuster=${cacheBuster}`, {
      params: {
        token,
        id: row.id
      }
    })

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
    // 构造参数
    const params = {
      name: ansibleForm.value.name,
      param: ansibleForm.value.param || '',
      instanceGroup: ansibleForm.value.instanceGroup || '',
      aapInstanceGroup: ansibleForm.value.aapInstanceGroup || '',
      groupIds: ansibleForm.value.groupIds?.join(',') || '',
      loginUser: ansibleForm.value.loginUser || '',
      loginPasswd: ansibleForm.value.loginPasswd || '',
      runUser: ansibleForm.value.runUser || '',
      runPasswd: ansibleForm.value.runPasswd || ''
    }

    // 如果是编辑模式，添加 id
    if (ansibleForm.value.id) {
      params.id = ansibleForm.value.id
    }

    const cacheBuster = Date.now()
    await apiService.post(`/jao/api/jao/jobs/c7WN62/run?cacheBuster=${cacheBuster}`, {
      params
    })

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
  background: var(--el-bg-color-page);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);

  .page-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
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
  background: var(--el-bg-color);
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
  border-top: 1px solid var(--el-border-color-light);

  .page-info {
    color: var(--el-text-color-regular);
    font-size: 13px;
  }

  :deep(.el-pagination) {
    margin-left: auto;
  }
}

.form-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  line-height: 1.4;
}
</style>
