<template>
  <div class="ops-page-layout">
    <!-- 标签页 -->
    <el-tabs v-model="activeTab" class="ops-tabs" @tab-change="handleTabChange">
      <el-tab-pane label="系统参数配置" name="sysParams">
        <!-- 筛选区 -->
        <div class="ops-filter-bar">
          <el-form :inline="true" size="small">
            <el-form-item label="关键词">
              <el-input
                v-model="sysSearchKeyword"
                placeholder="参数名称/域"
                clearable
                style="width: 200px"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSysSearch">
                <el-icon><Search /></el-icon> 搜索
              </el-button>
              <el-button @click="handleSysReset">
                <el-icon><RefreshRight /></el-icon> 重置
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 操作栏 -->
        <div class="ops-action-bar">
          <el-button type="primary" size="small" @click="handleCreateSysParam">
            <i class="fa fa-plus"></i> 新建
          </el-button>
          <span style="flex: 1;"></span>
          <el-button class="toolbar-icon-btn" circle size="small" :loading="sysLoading" @click="loadSysParams" title="刷新">
            <el-icon v-show="!sysLoading"><Refresh /></el-icon>
          </el-button>
        </div>

        <!-- 系统参数表格 -->
        <div class="ops-table-wrapper">
          <el-table
            v-loading="sysLoading"
            :data="paginatedSysParams"
            stripe
            style="width: 100%"
            max-height="calc(100vh - 400px)"
          >
            <el-table-column prop="domain" label="域" width="100" />
            <el-table-column prop="name" label="参数名称" min-width="180" show-overflow-tooltip />
            <el-table-column prop="value" label="参数值" min-width="300" show-overflow-tooltip />
            <el-table-column prop="description" label="描述" min-width="250" show-overflow-tooltip />
            <el-table-column label="操作" width="150" fixed="right" align="left">
              <template #default="{ row }">
                <el-button text type="primary" size="small" @click="handleViewSysParam(row)">
                  查看
                </el-button>
                <el-button text type="primary" size="small" @click="handleEditSysParam(row)">
                  编辑
                </el-button>
                <el-button
                  v-if="!row.cannotDelete"
                  text
                  type="danger"
                  size="small"
                  @click="handleDeleteSysParam(row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 系统参数分页 -->
        <div class="ops-pagination-wrapper">
          <el-pagination
            v-model:current-page="sysCurrentPage"
            v-model:page-size="sysPageSize"
            :total="filteredSysParams.length"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            background
          />
        </div>
      </el-tab-pane>

      <el-tab-pane label="应用参数配置" name="appParams">
        <!-- 筛选区 -->
        <div class="ops-filter-bar">
          <el-form :inline="true" size="small">
            <el-form-item label="关键词">
              <el-input
                v-model="appSearchKeyword"
                placeholder="参数名称"
                clearable
                style="width: 200px"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleAppSearch">
                <el-icon><Search /></el-icon> 搜索
              </el-button>
              <el-button @click="handleAppReset">
                <el-icon><RefreshRight /></el-icon> 重置
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 操作栏 -->
        <div class="ops-action-bar">
          <el-button type="primary" size="small" @click="handleCreateAppParam">
            <i class="fa fa-plus"></i> 新建
          </el-button>
          <span style="flex: 1;"></span>
          <el-button class="toolbar-icon-btn" circle size="small" :loading="appLoading" @click="loadAppParams" title="刷新">
            <el-icon v-show="!appLoading"><Refresh /></el-icon>
          </el-button>
        </div>

        <!-- 应用参数表格 -->
        <div class="ops-table-wrapper">
          <el-table
            v-loading="appLoading"
            :data="paginatedAppParams"
            stripe
            style="width: 100%"
            max-height="calc(100vh - 400px)"
          >
            <el-table-column prop="name" label="参数名称" min-width="180" show-overflow-tooltip />
            <el-table-column prop="value" label="参数值" min-width="350" show-overflow-tooltip />
            <el-table-column prop="description" label="描述" min-width="300" show-overflow-tooltip />
            <el-table-column label="操作" width="150" fixed="right" align="left">
              <template #default="{ row }">
                <el-button text type="primary" size="small" @click="handleViewAppParam(row)">
                  查看
                </el-button>
                <el-button text type="primary" size="small" @click="handleEditAppParam(row)">
                  编辑
                </el-button>
                <el-button
                  text
                  type="danger"
                  size="small"
                  @click="handleDeleteAppParam(row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 应用参数分页 -->
        <div class="ops-pagination-wrapper">
          <el-pagination
            v-model:current-page="appCurrentPage"
            v-model:page-size="appPageSize"
            :total="filteredAppParams.length"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            background
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 系统参数编辑对话框 -->
    <el-dialog
      v-model="sysDialogVisible"
      :title="getDialogTitle('sys')"
      width="700px"
      destroy-on-close
    >
      <el-form
        v-if="dialogMode !== 'view'"
        ref="sysFormRef"
        :model="sysForm"
        :rules="sysFormRules"
        label-width="100px"
      >
        <!-- 提示信息 -->
        <el-alert
          title="提示"
          type="success"
          :closable="true"
          show-icon
          class="mb-4"
        >
          <template #default>
            建议配置的与部署环境相关的，不需要经常修改的参数，比如ip，文件路径，接口地址等等。<br/>
            禁止配置需要频繁修改或者与安全相关的参数，比如数据库的账号密码，调用接口验证的token等等。
          </template>
        </el-alert>

        <el-form-item label="域" prop="domain">
          <el-input v-model="sysForm.domain" placeholder="请输入域，如: jao, acm, oplus" :disabled="sysForm.editValueOnly" />
          <div class="help-text">域用于区分不同模块，如 jao（作业自动化）、acm（资产管理）等</div>
        </el-form-item>
        <el-form-item label="参数名称" prop="name">
          <el-input v-model="sysForm.name" placeholder="请输入参数名称" :disabled="sysForm.editValueOnly" />
          <div class="help-text">参数名称需唯一，建议使用下划线命名法</div>
        </el-form-item>
        <el-form-item label="参数值" prop="value">
          <el-input
            v-model="sysForm.value"
            type="textarea"
            :rows="6"
            placeholder="请输入参数值"
          />
        </el-form-item>
        <el-form-item label="是否加密">
          <el-radio-group v-model="sysForm.isEncrypt">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
          <div class="help-text">启用后参数值将以加密形式存储</div>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="sysForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入参数描述"
          />
        </el-form-item>
      </el-form>
      <el-descriptions v-else :column="1" border label-width="100">
        <el-descriptions-item label="域">{{ sysForm.domain }}</el-descriptions-item>
        <el-descriptions-item label="参数名称">{{ sysForm.name }}</el-descriptions-item>
        <el-descriptions-item label="参数值">
          <pre class="param-value-pre">{{ sysForm.value }}</pre>
        </el-descriptions-item>
        <el-descriptions-item label="描述">{{ sysForm.description }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="sysDialogVisible = false">{{ dialogMode === 'view' ? '关闭' : '取消' }}</el-button>
        <el-button v-if="dialogMode !== 'view'" type="primary" :loading="saving" @click="handleSaveSysParam">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 应用参数编辑对话框 -->
    <el-dialog
      v-model="appDialogVisible"
      :title="getDialogTitle('app')"
      width="700px"
      destroy-on-close
    >
      <el-form
        v-if="dialogMode !== 'view'"
        ref="appFormRef"
        :model="appForm"
        :rules="appFormRules"
        label-width="100px"
      >
        <el-form-item label="参数名称" prop="name">
          <el-input v-model="appForm.name" placeholder="请输入参数名称" />
        </el-form-item>
        <el-form-item label="参数值" prop="value">
          <el-input
            v-model="appForm.value"
            type="textarea"
            :rows="6"
            placeholder="请输入参数值"
          />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="appForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入参数描述"
          />
        </el-form-item>
      </el-form>
      <el-descriptions v-else :column="1" border>
        <el-descriptions-item label="参数名称">{{ appForm.name }}</el-descriptions-item>
        <el-descriptions-item label="参数值">
          <pre class="param-value-pre">{{ appForm.value }}</pre>
        </el-descriptions-item>
        <el-descriptions-item label="描述">{{ appForm.description }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="appDialogVisible = false">{{ dialogMode === 'view' ? '关闭' : '取消' }}</el-button>
        <el-button v-if="dialogMode !== 'view'" type="primary" :loading="saving" @click="handleSaveAppParam">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import * as paramsApi from '@/modules/settings/api/params'

const activeTab = ref('sysParams')

// 系统参数
const sysLoading = ref(false)
const sysParams = ref([])
const sysSearchKeyword = ref('')
const sysAppliedSearchKeyword = ref('')
const sysCurrentPage = ref(1)
const sysPageSize = ref(10)
const sysDialogVisible = ref(false)
const sysFormRef = ref(null)
const sysForm = ref({
  id: null,
  domain: '',
  name: '',
  value: '',
  description: '',
  isEncrypt: 0,
  view: 1
})

// 应用参数
const appLoading = ref(false)
const appParams = ref([])
const appSearchKeyword = ref('')
const appAppliedSearchKeyword = ref('')
const appCurrentPage = ref(1)
const appPageSize = ref(10)
const appDialogVisible = ref(false)
const appFormRef = ref(null)
const appForm = ref({
  id: null,
  tenantId: null,
  name: '',
  value: '',
  description: ''
})

// 通用状态
const dialogMode = ref('create') // create, edit, view
const saving = ref(false)

// 表单验证规则
const sysFormRules = {
  domain: [{ required: true, message: '请输入域', trigger: 'blur' }],
  name: [{ required: true, message: '请输入参数名称', trigger: 'blur' }],
  value: [{ required: true, message: '请输入参数值', trigger: 'blur' }]
}

const appFormRules = {
  name: [{ required: true, message: '请输入参数名称', trigger: 'blur' }],
  value: [{ required: true, message: '请输入参数值', trigger: 'blur' }]
}

// 过滤后的系统参数
const filteredSysParams = computed(() => {
  if (!sysAppliedSearchKeyword.value) return sysParams.value
  const keyword = sysAppliedSearchKeyword.value.toLowerCase()
  return sysParams.value.filter(p =>
    p.name?.toLowerCase().includes(keyword) ||
    p.domain?.toLowerCase().includes(keyword)
  )
})

// 过滤后的应用参数
const filteredAppParams = computed(() => {
  if (!appAppliedSearchKeyword.value) return appParams.value
  const keyword = appAppliedSearchKeyword.value.toLowerCase()
  return appParams.value.filter(p =>
    p.name?.toLowerCase().includes(keyword)
  )
})

// 分页后的系统参数
const paginatedSysParams = computed(() => {
  const start = (sysCurrentPage.value - 1) * sysPageSize.value
  const end = start + sysPageSize.value
  return filteredSysParams.value.slice(start, end)
})

// 分页后的应用参数
const paginatedAppParams = computed(() => {
  const start = (appCurrentPage.value - 1) * appPageSize.value
  const end = start + appPageSize.value
  return filteredAppParams.value.slice(start, end)
})

// 搜索
function handleSysSearch() {
  sysAppliedSearchKeyword.value = sysSearchKeyword.value
  sysCurrentPage.value = 1
}

function handleSysReset() {
  sysSearchKeyword.value = ''
  sysAppliedSearchKeyword.value = ''
  sysCurrentPage.value = 1
}

function handleAppSearch() {
  appAppliedSearchKeyword.value = appSearchKeyword.value
  appCurrentPage.value = 1
}

function handleAppReset() {
  appSearchKeyword.value = ''
  appAppliedSearchKeyword.value = ''
  appCurrentPage.value = 1
}

// 获取对话框标题
function getDialogTitle(type) {
  const typeLabel = type === 'sys' ? '系统参数' : '应用参数'
  if (dialogMode.value === 'create') return `新建${typeLabel}`
  if (dialogMode.value === 'edit') return `编辑${typeLabel}`
  return `${typeLabel}详情`
}

// 加载系统参数
async function loadSysParams() {
  sysLoading.value = true
  try {
    const response = await paramsApi.getSysParams()
    sysParams.value = response?.data || response || []
  } catch (error) {
    console.error('Failed to load sys params:', error)
    ElMessage.error('加载系统参数失败')
  } finally {
    sysLoading.value = false
  }
}

// 加载应用参数
async function loadAppParams() {
  appLoading.value = true
  try {
    const response = await paramsApi.getAppParams()
    appParams.value = response?.data || response || []
  } catch (error) {
    console.error('Failed to load app params:', error)
    ElMessage.error('加载应用参数失败')
  } finally {
    appLoading.value = false
  }
}

// 标签页切换
function handleTabChange(tab) {
  if (tab === 'sysParams' && sysParams.value.length === 0) {
    loadSysParams()
  } else if (tab === 'appParams' && appParams.value.length === 0) {
    loadAppParams()
  }
}

// ============== 系统参数操作 ==============

function handleCreateSysParam() {
  dialogMode.value = 'create'
  sysForm.value = { id: null, domain: '', name: '', value: '', description: '', isEncrypt: 0, view: 1 }
  sysDialogVisible.value = true
}

function handleViewSysParam(row) {
  dialogMode.value = 'view'
  sysForm.value = { ...row }
  sysDialogVisible.value = true
}

function handleEditSysParam(row) {
  dialogMode.value = 'edit'
  sysForm.value = { ...row }
  sysDialogVisible.value = true
}

async function handleSaveSysParam() {
  if (!sysFormRef.value) return

  try {
    await sysFormRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    if (dialogMode.value === 'create') {
      await paramsApi.createSysParam(sysForm.value)
      ElMessage.success('创建成功')
    } else {
      await paramsApi.updateSysParam(sysForm.value)
      ElMessage.success('保存成功')
    }
    sysDialogVisible.value = false
    loadSysParams()
  } catch (error) {
    console.error('Failed to save sys param:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function handleDeleteSysParam(row) {
  try {
    await ElMessageBox.confirm(
      `确定要删除参数"${row.name}"吗？`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
  } catch {
    return
  }

  try {
    await paramsApi.deleteSysParam(row.id)
    ElMessage.success('删除成功')
    loadSysParams()
  } catch (error) {
    console.error('Failed to delete sys param:', error)
    ElMessage.error('删除失败')
  }
}

// ============== 应用参数操作 ==============

function handleCreateAppParam() {
  dialogMode.value = 'create'
  appForm.value = { id: null, tenantId: null, name: '', value: '', description: '' }
  appDialogVisible.value = true
}

function handleViewAppParam(row) {
  dialogMode.value = 'view'
  appForm.value = { ...row }
  appDialogVisible.value = true
}

function handleEditAppParam(row) {
  dialogMode.value = 'edit'
  appForm.value = { ...row }
  appDialogVisible.value = true
}

async function handleSaveAppParam() {
  if (!appFormRef.value) return

  try {
    await appFormRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    if (dialogMode.value === 'create') {
      await paramsApi.createAppParam(appForm.value)
      ElMessage.success('创建成功')
    } else {
      await paramsApi.updateAppParam(appForm.value)
      ElMessage.success('保存成功')
    }
    appDialogVisible.value = false
    loadAppParams()
  } catch (error) {
    console.error('Failed to save app param:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function handleDeleteAppParam(row) {
  try {
    await ElMessageBox.confirm(
      `确定要删除参数"${row.name}"吗？`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
  } catch {
    return
  }

  try {
    await paramsApi.deleteAppParam(row.id)
    ElMessage.success('删除成功')
    loadAppParams()
  } catch (error) {
    console.error('Failed to delete app param:', error)
    ElMessage.error('删除失败')
  }
}

onMounted(() => {
  loadSysParams()
})
</script>

<style scoped lang="scss">
.ops-tabs {
  :deep(.el-tabs__content) {
    padding: 0;
  }

  :deep(.el-tabs__header) {
    margin-bottom: 12px;
  }
}

.param-value-pre {
  margin: 0;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow: auto;
}

.help-text {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.mb-4 {
  margin-bottom: 16px;
}
</style>
