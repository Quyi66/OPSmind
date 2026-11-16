<template>
  <div class="ops-page-layout">
    <!-- 标签页 -->
    <el-tabs v-model="activeTab" class="ops-tabs" @tab-change="handleTabChange">
      <el-tab-pane :label="t('settings.params.systemConfig')" name="sysParams">
        <!-- 筛选区 -->
        <div class="ops-filter-bar">
          <el-form :inline="true" size="small" @submit.prevent>
            <el-form-item :label="t('settings.user.keyword')">
              <el-input
                v-model="sysSearchKeyword"
                :placeholder="t('settings.params.systemSearch')"
                clearable
                style="width: 220px"
                maxlength="50"
                @input="handleSysSearch"
              @keyup.enter="handleSysSearch" @clear="handleSysSearch" />
            </el-form-item>
            <!-- <el-form-item>
              <el-button type="primary" @click="handleSysSearch">
                <el-icon><Search /></el-icon> 搜索
              </el-button>
              <el-button @click="handleSysReset">
                <el-icon><RefreshRight /></el-icon> 重置
              </el-button>
            </el-form-item> -->
          </el-form>
        </div>

        <!-- 操作栏 -->
        <div class="ops-action-bar">
          <el-button type="primary" size="small" @click="handleCreateSysParam">
            <i class="fa fa-plus"></i>
            {{ t('settings.params.create') }}
          </el-button>
          <span style="flex: 1"></span>
          <el-button
            class="toolbar-icon-btn"
            circle
            size="small"
            :loading="sysLoading"
            @click="loadSysParams"
            :title="t('common.refresh')"
          >
            <el-icon v-show="!sysLoading"><Refresh /></el-icon>
          </el-button>
        </div>

        <!-- 系统参数表格 -->
        <div class="ops-table-wrapper">
          <el-table
            v-loading="sysLoading"
            :data="paginatedSysParams"
            style="width: 100%"
            max-height="calc(100vh - 364px)"
          >
            <el-table-column prop="domain" :label="t('settings.params.domain')" width="100" />
            <el-table-column prop="name" :label="t('settings.params.name')" min-width="120" show-overflow-tooltip />
            <el-table-column prop="value" :label="t('settings.params.value')" min-width="300" show-overflow-tooltip />
            <el-table-column
              prop="description"
              :label="t('settings.team.description')"
              min-width="250"
              show-overflow-tooltip
            />
            <el-table-column :label="t('common.actions')" min-width="220" fixed="right" align="left">
              <template #default="{ row }">
                <el-button text type="primary" size="small" @click="handleViewSysParam(row)">
                  {{ t('common.view') }}
                </el-button>
                <el-button text type="primary" size="small" @click="handleEditSysParam(row)">
                  {{ t('common.edit') }}
                </el-button>
                <el-button
                  v-if="!row.cannotDelete"
                  text
                  type="danger"
                  size="small"
                  @click="handleDeleteSysParam(row)"
                >
                  {{ t('common.delete') }}
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
            @size-change="handleSysSearch"
          />
        </div>
      </el-tab-pane>

      <el-tab-pane :label="t('settings.params.appConfig')" name="appParams">
        <!-- 筛选区 -->
        <div class="ops-filter-bar">
          <el-form :inline="true" size="small" @submit.prevent>
            <el-form-item :label="t('settings.user.keyword')">
              <el-input
                v-model="appSearchKeyword"
                :placeholder="t('settings.params.appSearch')"
                clearable
                style="width: 220px"
                maxlength="50"
                @input="handleAppSearch"
              />
            </el-form-item>
            <!-- <el-form-item>
              <el-button type="primary" @click="handleAppSearch">
                <el-icon><Search /></el-icon> 搜索
              </el-button>
              <el-button @click="handleAppReset">
                <el-icon><RefreshRight /></el-icon> 重置
              </el-button>
            </el-form-item> -->
          </el-form>
        </div>

        <!-- 操作栏 -->
        <div class="ops-action-bar">
          <el-button type="primary" size="small" @click="handleCreateAppParam">
            <i class="fa fa-plus"></i>
            {{ t('settings.params.create') }}
          </el-button>
          <span style="flex: 1"></span>
          <el-button
            class="toolbar-icon-btn"
            circle
            size="small"
            :loading="appLoading"
            @click="loadAppParams"
            :title="t('common.refresh')"
          >
            <el-icon v-show="!appLoading"><Refresh /></el-icon>
          </el-button>
        </div>

        <!-- 应用参数表格 -->
        <div class="ops-table-wrapper">
          <el-table
            v-loading="appLoading"
            :data="paginatedAppParams"
            style="width: 100%"
            max-height="calc(100vh - 364px)"
          >
            <el-table-column prop="name" :label="t('settings.params.name')" min-width="120" show-overflow-tooltip />
            <el-table-column prop="value" :label="t('settings.params.value')" min-width="350" show-overflow-tooltip />
            <el-table-column
              prop="description"
              :label="t('settings.team.description')"
              min-width="300"
              show-overflow-tooltip
            />
            <el-table-column :label="t('common.actions')" min-width="220" fixed="right" align="left">
              <template #default="{ row }">
                <el-button text type="primary" size="small" @click="handleViewAppParam(row)">
                  {{ t('common.view') }}
                </el-button>
                <el-button text type="primary" size="small" @click="handleEditAppParam(row)">
                  {{ t('common.edit') }}
                </el-button>
                <el-button text type="danger" size="small" @click="handleDeleteAppParam(row)">
                  {{ t('common.delete') }}
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
            @size-change="handleAppSearch"
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
      :close-on-press-escape="dialogMode === 'view'"
      :close-on-click-modal="dialogMode === 'view'"
    >
      <el-form
        v-if="dialogMode !== 'view'"
        ref="sysFormRef"
        :model="sysForm"
        :rules="sysFormRules" :validate-on-rule-change="false"
        label-width="150px"
      >
        <!-- 提示信息 -->
        <el-alert :title="t('settings.params.notice')" type="success" :closable="true" show-icon class="mb-4">
          <template #default>
            {{ t('settings.params.environmentHint') }}
            <br />
            {{ t('settings.params.exclusionsHint') }}
          </template>
        </el-alert>

        <el-form-item :label="t('settings.params.domain')" prop="domain">
          <el-input
            v-model="sysForm.domain"
            :placeholder="t('settings.params.domainPlaceholder')"
            :disabled="sysForm.editValueOnly"
            maxlength="30"
          />
          <div class="help-text">{{ t('settings.params.domainHint') }}</div>
        </el-form-item>
        <el-form-item :label="t('settings.params.name')" prop="name">
          <el-input
            v-model="sysForm.name"
            :placeholder="t('settings.params.enterName')"
            :disabled="sysForm.editValueOnly"
            maxlength="50"
          />
          <div class="help-text">{{ t('settings.params.nameHint') }}</div>
        </el-form-item>
        <el-form-item :label="t('settings.params.value')" prop="value">
          <el-input v-model="sysForm.value" type="textarea" :rows="6" :placeholder="t('settings.params.enterValue')" />
        </el-form-item>
        <el-form-item :label="t('settings.params.encrypted')">
          <el-radio-group v-model="sysForm.isEncrypt">
            <el-radio :value="1">{{ t('settings.user.enable') }}</el-radio>
            <el-radio :value="0">{{ t('settings.user.disable') }}</el-radio>
          </el-radio-group>
          <div class="help-text">{{ t('settings.params.encryptHint') }}</div>
        </el-form-item>
        <el-form-item :label="t('settings.team.description')" prop="description">
          <el-input
            v-model="sysForm.description"
            type="textarea"
            :rows="3"
            :placeholder="t('settings.params.descriptionPlaceholder')"
          />
        </el-form-item>
      </el-form>
      <el-descriptions v-else :column="1" border label-width="100">
        <el-descriptions-item :label="t('settings.params.domain')">{{ sysForm.domain }}</el-descriptions-item>
        <el-descriptions-item :label="t('settings.params.name')">{{ sysForm.name }}</el-descriptions-item>
        <el-descriptions-item :label="t('settings.params.value')">
          <pre class="param-value-pre">{{ sysForm.value }}</pre>
        </el-descriptions-item>
        <el-descriptions-item :label="t('settings.team.description')">{{ sysForm.description }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="sysDialogVisible = false">
          {{ dialogMode === 'view' ? t('common.close') : t('common.cancel') }}
        </el-button>
        <el-button
          v-if="dialogMode !== 'view'"
          type="primary"
          :loading="saving"
          @click="handleSaveSysParam"
        >
          {{ t('common.save') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 应用参数编辑对话框 -->
    <el-dialog
      v-model="appDialogVisible"
      :title="getDialogTitle('app')"
      width="700px"
      destroy-on-close
      :close-on-press-escape="dialogMode === 'view'"
      :close-on-click-modal="dialogMode === 'view'"
    >
      <el-form
        v-if="dialogMode !== 'view'"
        ref="appFormRef"
        :model="appForm"
        :rules="appFormRules" :validate-on-rule-change="false"
        label-width="150px"
      >
        <el-form-item :label="t('settings.params.name')" prop="name">
          <el-input v-model="appForm.name" :placeholder="t('settings.params.enterName')" maxlength="50" />
        </el-form-item>
        <el-form-item :label="t('settings.params.value')" prop="value">
          <el-input v-model="appForm.value" type="textarea" :rows="6" :placeholder="t('settings.params.enterValue')" />
        </el-form-item>
        <el-form-item :label="t('settings.team.description')" prop="description">
          <el-input
            v-model="appForm.description"
            type="textarea"
            :rows="3"
            :placeholder="t('settings.params.descriptionPlaceholder')"
          />
        </el-form-item>
      </el-form>
      <el-descriptions v-else :column="1" border label-width="100">
        <el-descriptions-item :label="t('settings.params.name')">{{ appForm.name }}</el-descriptions-item>
        <el-descriptions-item :label="t('settings.params.value')">
          <pre class="param-value-pre">{{ appForm.value }}</pre>
        </el-descriptions-item>
        <el-descriptions-item :label="t('settings.team.description')">{{ appForm.description }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="appDialogVisible = false">
          {{ dialogMode === 'view' ? t('common.close') : t('common.cancel') }}
        </el-button>
        <el-button
          v-if="dialogMode !== 'view'"
          type="primary"
          :loading="saving"
          @click="handleSaveAppParam"
        >
          {{ t('common.save') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { t } from '@/core/i18n'
import { useLocalizedValidation } from '@/core/i18n/validation'
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
useLocalizedValidation(sysFormRef)

const sysFormRules = computed(() => ({
  domain: [{ required: true, message: t('settings.params.enterDomain'), trigger: 'blur' }],
  name: [{ required: true, message: t('settings.params.enterName'), trigger: 'blur' }],
  value: [{ required: true, message: t('settings.params.enterValue'), trigger: 'blur' }]
}))

useLocalizedValidation(appFormRef)

const appFormRules = computed(() => ({
  name: [{ required: true, message: t('settings.params.enterName'), trigger: 'blur' }],
  value: [{ required: true, message: t('settings.params.enterValue'), trigger: 'blur' }]
}))

// 过滤后的系统参数
const filteredSysParams = computed(() => {
  if (!sysAppliedSearchKeyword.value) return sysParams.value
  const keyword = sysAppliedSearchKeyword.value.toLowerCase()
  return sysParams.value.filter(
    p =>
      p.domain?.toLowerCase().includes(keyword) ||
      p.name?.toLowerCase().includes(keyword) ||
      p.value?.toLowerCase().includes(keyword) ||
      p.description?.toLowerCase().includes(keyword)
  )
})

// 过滤后的应用参数
const filteredAppParams = computed(() => {
  if (!appAppliedSearchKeyword.value) return appParams.value
  const keyword = appAppliedSearchKeyword.value.toLowerCase()
  return appParams.value.filter(
    p =>
      p.name?.toLowerCase().includes(keyword) ||
      p.value?.toLowerCase().includes(keyword) ||
      p.description?.toLowerCase().includes(keyword)
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
  sysAppliedSearchKeyword.value = sysSearchKeyword.value.trim()
  sysCurrentPage.value = 1
}

function handleSysReset() {
  sysSearchKeyword.value = ''
  sysAppliedSearchKeyword.value = ''
  sysCurrentPage.value = 1
}

function handleAppSearch() {
  appAppliedSearchKeyword.value = appSearchKeyword.value.trim()
  appCurrentPage.value = 1
}

function handleAppReset() {
  appSearchKeyword.value = ''
  appAppliedSearchKeyword.value = ''
  appCurrentPage.value = 1
}

// 获取对话框标题
function getDialogTitle(type) {
  if (dialogMode.value === 'create') return type === 'sys' ? t('settings.params.createSystem') : t('settings.params.createApp')
  if (dialogMode.value === 'edit') return type === 'sys' ? t('settings.params.editSystem') : t('settings.params.editApp')
  return type === 'sys' ? t('settings.params.viewSystem') : t('settings.params.viewApp')
}

// 加载系统参数
async function loadSysParams() {
  sysLoading.value = true
  try {
    const response = await paramsApi.getSysParams()
    sysParams.value = response?.data || response || []
  } catch (error) {
    console.error('Failed to load sys params:', error)
    ElMessage.error(t('settings.params.systemFailed'))
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
    ElMessage.error(t('settings.params.appFailed'))
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
  sysForm.value = {
    id: null,
    domain: '',
    name: '',
    value: '',
    description: '',
    isEncrypt: 0,
    view: 1
  }
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
      ElMessage.success(t('settings.params.created'))
    } else {
      await paramsApi.updateSysParam(sysForm.value)
      ElMessage.success(t('settings.user.saved'))
    }
    sysDialogVisible.value = false
    loadSysParams()
  } catch (error) {
    console.error('Failed to save sys param:', error)
    ElMessage.error(t('settings.user.saveFailed'))
  } finally {
    saving.value = false
  }
}

async function handleDeleteSysParam(row) {
  try {
    await ElMessageBox.confirm(t('settings.params.deleteConfirm', { name: row.name }), t('settings.params.deleteTitle'), {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      type: 'warning',
      confirmButtonText: t('common.delete'),
      cancelButtonText: t('common.cancel')
    })
  } catch {
    return
  }

  try {
    await paramsApi.deleteSysParam(row.id)
    ElMessage.success(t('settings.user.deleted'))
    loadSysParams()
  } catch (error) {
    console.error('Failed to delete sys param:', error)
    ElMessage.error(t('settings.user.deleteFailed'))
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
      ElMessage.success(t('settings.params.created'))
    } else {
      await paramsApi.updateAppParam(appForm.value)
      ElMessage.success(t('settings.user.saved'))
    }
    appDialogVisible.value = false
    loadAppParams()
  } catch (error) {
    console.error('Failed to save app param:', error)
    ElMessage.error(t('settings.user.saveFailed'))
  } finally {
    saving.value = false
  }
}

async function handleDeleteAppParam(row) {
  try {
    await ElMessageBox.confirm(t('settings.params.deleteConfirm', { name: row.name }), t('settings.params.deleteTitle'), {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      type: 'warning',
      confirmButtonText: t('common.delete'),
      cancelButtonText: t('common.cancel')
    })
  } catch {
    return
  }

  try {
    await paramsApi.deleteAppParam(row.id)
    ElMessage.success(t('settings.user.deleted'))
    loadAppParams()
  } catch (error) {
    console.error('Failed to delete app param:', error)
    ElMessage.error(t('settings.user.deleteFailed'))
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
  background: var(--el-bg-color-page);
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
  color: var(--el-text-color-regular);
  margin-top: 4px;
}

.mb-4 {
  margin-bottom: 16px;
}
</style>
