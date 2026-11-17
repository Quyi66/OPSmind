<template>
  <div class="ops-page-layout email-config-page">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form inline size="small" @submit.prevent="handleSearch">
        <el-form-item :label="t('inspection.email.templateName')">
          <el-input
            v-model="searchKeyword"
            :placeholder="t('inspection.email.searchTemplates')"
            clearable
            size="small"
            style="width: 220px"
            maxlength="50"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="small" :loading="loading" @click="handleSearch">
            <el-icon><Search /></el-icon>
            {{ t('common.search') }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 操作栏 -->
    <div class="ops-action-bar">
      <div class="email-switch-group">
        <el-switch
          v-model="emailEnabled"
          :loading="switchLoading"
          :active-text="t('inspection.email.enableNotifications')"
          @change="handleSwitchChange"
        />
        <span
          class="global-status-pill"
          :class="emailEnabled ? 'global-status-pill--active' : 'global-status-pill--muted'"
        >
          <span class="status-dot"></span>
          {{ emailEnabled ? t('inspection.email.globallyEnabled') : t('inspection.email.globallyDisabled') }}
        </span>
      </div>
      <span class="email-template-count">{{ t('inspection.email.templateCount', { count: templateList.length }) }}</span>
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        :title="t('common.refresh')"
        @click="loadTemplates"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table v-loading="loading" :data="pagedTemplates" height="100%">
        <el-table-column
          prop="template_name"
          :label="t('inspection.email.templateName')"
          min-width="220"
          show-overflow-tooltip
        />
        <el-table-column prop="executed_at" :label="t('inspection.email.lastChecked')" width="200">
          <template #default="{ row }">
            <span class="time-text">{{ formatDateTime(row.executed_at) || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('inspection.email.notificationStatus')" :width="currentLocale === 'en-US' ? 196 : 150">
          <template #default>
            <span
              class="channel-pill"
              :class="emailEnabled ? 'channel-pill--active' : 'channel-pill--paused'"
            >
              {{ emailEnabled ? t('inspection.email.notificationsEnabled') : t('inspection.email.pausedGlobally') }}
            </span>
          </template>
        </el-table-column>
        <el-table-column :label="t('common.actions')" :width="currentLocale === 'en-US' ? 224 : undefined" :min-width="currentLocale === 'en-US' ? undefined : 260" align="left" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="showRecipientDialog(row)">
              {{ t('inspection.email.recipients') }}
            </el-button>
            <el-button text type="primary" size="small" @click="showCustomContentDialog(row)">
              {{ t('inspection.email.customContent') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页区域 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 25, 50, 100]"
        :total="templateList.length"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handlePageSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 收件人列表弹窗 -->
    <el-dialog
      :model-value="recipientDialogVisible"
      :title="t('inspection.email.recipients')"
      width="840px"
      destroy-on-close
      @close="recipientDialogVisible = false"
      :close-on-click-modal="true"
    >
      <div v-loading="recipientLoading" class="recipient-dialog">
        <div class="template-banner-card">
          <div class="banner-left">
            <div class="banner-icon">
              <i class="fa fa-users"></i>
            </div>
            <div class="banner-text">
              <span class="banner-label">{{ t('inspection.email.currentTemplate') }}</span>
              <strong class="banner-value">{{ currentTemplate?.template_name || '-' }}</strong>
            </div>
          </div>
          <div class="banner-stats">
            <span class="stat-pill">
              {{ t('inspection.email.recipientCount') }} <strong>{{ recipientTableData.length }}</strong>
            </span>
          </div>
        </div>

        <div class="dialog-toolbar">
          <div class="toolbar-search">
            <el-input
              v-model="recipientSearchKeyword"
              :placeholder="t('inspection.email.searchRecipients')"
              clearable
              size="small"
              style="width: 240px"
            >
              <template #prefix>
                <i class="fa fa-search"></i>
              </template>
            </el-input>
          </div>
          <div class="toolbar-actions">
            <el-button size="small" @click="loadRecipientList">
              <i class="fa fa-sync-alt" style="margin-right: 4px"></i>
              {{ t('common.refresh') }}
            </el-button>
            <el-button type="primary" size="small" @click="showAddRecipientDialog">
              <i class="fa fa-plus" style="margin-right: 4px"></i>
              {{ t('inspection.email.addRecipient') }}
            </el-button>
          </div>
        </div>

        <!-- 收件人表格 -->
        <el-table :data="filteredRecipientTableData" max-height="400" border>
          <el-table-column prop="name" :label="t('inspection.email.name')" min-width="120" />
          <el-table-column prop="email" :label="t('inspection.email.email')" min-width="200" />
          <el-table-column prop="status" :label="t('common.status')" width="100" align="left">
            <template #default="{ row }">
              <el-tag v-if="row.status === '0'" type="success" size="small">{{ t('yumRepo.enable') }}</el-tag>
              <el-tag v-else type="danger" size="small">{{ t('yumRepo.disable') }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="remarks" :label="t('hostUser.notes')" min-width="160" show-overflow-tooltip />
          <el-table-column :label="t('common.actions')" width="120" align="left" fixed="right">
            <template #default="{ row }">
              <el-button text type="primary" size="small" @click="editRecipient(row)">
                {{ t('common.edit') }}
              </el-button>
              <el-button text type="danger" size="small" @click="deleteRecipient(row)">
                {{ t('common.delete') }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <template #footer>
        <el-button @click="recipientDialogVisible = false">{{ t('common.close') }}</el-button>
      </template>
    </el-dialog>

    <!-- 新增/编辑收件人弹窗 -->
    <el-dialog
      :model-value="recipientFormVisible"
      :title="recipientFormData.id ? t('inspection.email.editRecipient') : t('inspection.email.addRecipient')"
      width="500px"
      destroy-on-close
      @close="recipientFormVisible = false"
      :close-on-press-escape="false"
      :close-on-click-modal="false"
    >
      <el-form
        ref="recipientFormRef"
        :model="recipientFormData"
        :rules="recipientFormRules"
        :validate-on-rule-change="false"
        label-width="80px"
      >
        <el-form-item :label="t('inspection.email.name')" prop="name">
          <el-input v-model="recipientFormData.name" :placeholder="t('inspection.email.enterName')" maxlength="50" />
        </el-form-item>
        <el-form-item :label="t('inspection.email.email')" prop="email">
          <el-input
            v-model="recipientFormData.email"
            :placeholder="t('inspection.email.enterEmail')"
            maxlength="100"
          />
        </el-form-item>
        <el-form-item :label="t('common.status')" prop="status">
          <el-radio-group v-model="recipientFormData.status">
            <el-radio value="0">{{ t('yumRepo.enable') }}</el-radio>
            <el-radio value="1">{{ t('yumRepo.disable') }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="t('hostUser.notes')">
          <el-input
            v-model="recipientFormData.remarks"
            type="textarea"
            :rows="3"
            :placeholder="t('inspection.email.enterNotes')"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="recipientFormVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="recipientSaving" @click="saveRecipient">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 自定义内容弹窗 -->
    <el-dialog
      :model-value="customContentDialogVisible"
      :title="t('inspection.email.customEmailContent')"
      width="620px"
      destroy-on-close
      @close="customContentDialogVisible = false"
      :close-on-press-escape="false"
      :close-on-click-modal="false"
    >
      <div v-loading="customContentLoading" class="custom-content-dialog">
        <div class="template-banner-card">
          <div class="banner-left">
            <div class="banner-icon">
              <i class="fa fa-envelope-open-text"></i>
            </div>
            <div class="banner-text">
              <span class="banner-label">{{ t('inspection.email.currentTemplate') }}</span>
              <strong class="banner-value">{{ currentTemplate?.template_name || '-' }}</strong>
            </div>
          </div>
        </div>

        <el-form label-position="top" class="custom-content-form">
          <el-form-item :label="t('inspection.email.customTitle')">
            <el-input
              v-model="customContentData.title"
              :placeholder="t('inspection.email.titlePlaceholder')"
              clearable
            />
          </el-form-item>
          <el-form-item :label="t('inspection.email.customContent')">
            <el-input
              v-model="customContentData.content"
              type="textarea"
              :rows="4"
              :placeholder="t('inspection.email.contentPlaceholder')"
            />
          </el-form-item>
          <el-form-item :label="t('common.status')">
            <el-radio-group v-model="customContentData.state">
              <el-radio value="0">{{ t('yumRepo.enable') }}</el-radio>
              <el-radio value="1">{{ t('yumRepo.disable') }}</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="customContentDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="customContentSaving" @click="saveCustomContent">
          {{ t('common.save') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'
import { useLocalizedValidation } from '@/core/i18n/validation'

import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { emailConfigApi } from '../api'
import { formatDateTime } from '../utils/helpers'
import { authService } from '@/core/auth'

// 状态
const loading = ref(false)
const switchLoading = ref(false)
const emailEnabled = ref(false)
const emailConfig = ref({})
const templateList = ref([])
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

// 收件人列表弹窗
const recipientDialogVisible = ref(false)
const recipientLoading = ref(false)
const recipientTableData = ref([])
const allRecipientData = ref([])
const currentTemplate = ref(null)
const recipientSearchKeyword = ref('')

const filteredRecipientTableData = computed(() => {
  const kw = recipientSearchKeyword.value.trim().toLowerCase()
  if (!kw) return recipientTableData.value
  return recipientTableData.value.filter(
    row =>
      String(row.name || '').toLowerCase().includes(kw) ||
      String(row.email || '').toLowerCase().includes(kw) ||
      String(row.remarks || '').toLowerCase().includes(kw)
  )
})

// 收件人表单弹窗
const recipientFormVisible = ref(false)
const recipientFormRef = ref(null)
const recipientSaving = ref(false)
const recipientFormData = ref({
  id: null,
  name: '',
  email: '',
  status: '0',
  remarks: ''
})

useLocalizedValidation(recipientFormRef)

const recipientFormRules = computed(() => ({
  name: [{ required: true, message: t('inspection.email.enterName'), trigger: 'blur' }],
  email: [
    { required: true, message: t('inspection.email.enterEmail'), trigger: 'blur' },
    { type: 'email', message: t('inspection.email.validEmail'), trigger: 'blur' }
  ],
  status: [{ required: true, message: t('inspection.email.selectStatus'), trigger: 'change' }]
}))

// 自定义内容弹窗
const customContentDialogVisible = ref(false)
const customContentLoading = ref(false)
const customContentSaving = ref(false)
const allCustomContentData = ref([])
const customContentData = ref({
  id: null,
  title: '',
  content: '',
  state: '0'
})

const pagedTemplates = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return templateList.value.slice(start, start + pageSize.value)
})

/**
 * 加载邮件开关状态
 */
async function loadEmailSwitch() {
  try {
    const response = await emailConfigApi.getEmailSwitch()
    const data = response?.data || response || {}
    emailConfig.value = data
    emailEnabled.value = data.isTheEmailEnabled === 'yes'
  } catch (error) {
    console.error('加载邮件配置失败:', error)
    ElMessage.error(t('inspection.email.loadConfigurationFailed'))
  }
}

/**
 * 加载模板列表
 */
async function loadTemplates() {
  loading.value = true
  try {
    const tenantId = getTenantId()
    // 构建 filter 参数
    const filter = searchKeyword.value ? `template_name:*${searchKeyword.value}*` : ''
    const response = await emailConfigApi.getTemplates(tenantId, filter)
    const data = response?.data || response || {}
    templateList.value = data.records || []
  } catch (error) {
    console.error('加载模板列表失败:', error)
    ElMessage.error(t('inspection.email.loadTemplatesFailed'))
  } finally {
    loading.value = false
  }
}

/**
 * 搜索处理
 */
function handleSearch() {
  currentPage.value = 1
  loadTemplates()
}

function handlePageSizeChange() {
  currentPage.value = 1
}

function handlePageChange(page) {
  currentPage.value = page
}

/**
 * 获取租户ID
 */
function getTenantId() {
  const user = authService.getCurrentUser()
  if (user?.tenantId) {
    return user.tenantId
  }
  return authService.getTenantId()
}

/**
 * 处理邮件开关变更
 */
async function handleSwitchChange(value) {
  switchLoading.value = true
  try {
    const data = {
      ...emailConfig.value,
      isTheEmailEnabled: value ? 'yes' : 'no'
    }
    await emailConfigApi.saveEmailSwitch(data)
    emailConfig.value = data
    ElMessage.success(value ? t('inspection.email.enabled') : t('inspection.email.disabled'))
  } catch (error) {
    emailEnabled.value = !value
    console.error('保存邮件配置失败:', error)
    ElMessage.error(t('inspection.email.saveFailed'))
  } finally {
    switchLoading.value = false
  }
}

/**
 * 加载收件人列表
 */
async function loadRecipientList() {
  recipientLoading.value = true
  try {
    const response = await emailConfigApi.getRecipientList()
    const data = response?.data || response || []
    allRecipientData.value = data

    // 过滤当前模板的收件人
    filterRecipientsByTemplate()
  } catch (error) {
    console.error('加载收件人列表失败:', error)
    ElMessage.error(t('inspection.email.loadRecipientsFailed'))
  } finally {
    recipientLoading.value = false
  }
}

/**
 * 按模板过滤收件人
 */
function filterRecipientsByTemplate() {
  const templateId = currentTemplate.value?.template_id

  if (!templateId) {
    recipientTableData.value = []
    return
  }

  recipientTableData.value = allRecipientData.value
    .filter(item => {
      try {
        const dataJson =
          typeof item.dataJson === 'string' ? JSON.parse(item.dataJson) : item.dataJson
        return dataJson?.template_id === templateId
      } catch (e) {
        console.error('解析 dataJson 失败:', e)
        return false
      }
    })
    .map(item => {
      const dataJson = typeof item.dataJson === 'string' ? JSON.parse(item.dataJson) : item.dataJson
      return {
        _dataId: item.id,
        _createTime: item.createTime,
        _updateTime: item.updateTime,
        ...dataJson
      }
    })
}

/**
 * 显示收件人列表弹窗
 */
async function showRecipientDialog(template) {
  currentTemplate.value = template
  recipientSearchKeyword.value = ''
  recipientDialogVisible.value = true
  await loadRecipientList()
}

/**
 * 显示新增收件人弹窗
 */
function showAddRecipientDialog() {
  recipientFormData.value = {
    id: null,
    name: '',
    email: '',
    status: '0',
    remarks: ''
  }
  recipientFormVisible.value = true
}

/**
 * 编辑收件人
 */
function editRecipient(row) {
  recipientFormData.value = {
    id: row._dataId,
    name: row.name,
    email: row.email,
    status: row.status || '0',
    remarks: row.remarks || ''
  }
  recipientFormVisible.value = true
}

/**
 * 保存收件人
 */
async function saveRecipient() {
  try {
    await recipientFormRef.value.validate()
  } catch {
    return
  }

  recipientSaving.value = true
  try {
    // API 层已经封装了完整的请求格式
    await emailConfigApi.saveRecipient({
      id: recipientFormData.value.id,
      name: recipientFormData.value.name,
      email: recipientFormData.value.email,
      status: recipientFormData.value.status,
      remarks: recipientFormData.value.remarks,
      templateId: currentTemplate.value.template_id
    })
    ElMessage.success(t('profile.saved'))
    recipientFormVisible.value = false
    await loadRecipientList()
  } catch (error) {
    console.error('保存收件人失败:', error)
    ElMessage.error(t('inspection.email.saveFailed'))
  } finally {
    recipientSaving.value = false
  }
}

/**
 * 删除收件人
 */
async function deleteRecipient(row) {
  try {
    await ElMessageBox.confirm(t('inspection.email.deleteRecipientConfirm'), t('automation.list.confirmDelete'), {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      type: 'warning'
    })
    await emailConfigApi.deleteRecipient(row._dataId)
    ElMessage.success(t('hostUser.deletedSuccessfully'))
    await loadRecipientList()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除收件人失败:', error)
      ElMessage.error(t('inspection.email.deleteFailed'))
    }
  }
}

/**
 * 加载自定义内容
 */
async function loadCustomContent() {
  customContentLoading.value = true
  try {
    const response = await emailConfigApi.getEmailCustomList()
    const data = response?.data || response || []
    allCustomContentData.value = data

    // 查找当前模板的自定义内容
    const templateId = currentTemplate.value?.template_id
    const customItem = data.find(item => {
      const dataJson = typeof item.dataJson === 'string' ? JSON.parse(item.dataJson) : item.dataJson
      return dataJson.template_id === templateId
    })

    if (customItem) {
      const dataJson =
        typeof customItem.dataJson === 'string'
          ? JSON.parse(customItem.dataJson)
          : customItem.dataJson
      customContentData.value = {
        id: customItem.id,
        title: dataJson.title || '',
        content: dataJson.content || '',
        state: dataJson.state || '0'
      }
    } else {
      customContentData.value = {
        id: null,
        title: '',
        content: '',
        state: '0'
      }
    }
  } catch (error) {
    console.error('加载自定义内容失败:', error)
    ElMessage.error(t('inspection.email.loadContentFailed'))
  } finally {
    customContentLoading.value = false
  }
}

/**
 * 显示自定义内容弹窗
 */
async function showCustomContentDialog(template) {
  currentTemplate.value = template
  customContentDialogVisible.value = true
  await loadCustomContent()
}

/**
 * 保存自定义内容
 */
async function saveCustomContent() {
  customContentSaving.value = true
  try {
    await emailConfigApi.saveEmailCustom({
      id: customContentData.value.id,
      title: customContentData.value.title,
      content: customContentData.value.content,
      state: customContentData.value.state,
      templateId: currentTemplate.value.template_id
    })
    ElMessage.success(t('profile.saved'))
    customContentDialogVisible.value = false
  } catch (error) {
    console.error('保存自定义内容失败:', error)
    ElMessage.error(t('inspection.email.saveFailed'))
  } finally {
    customContentSaving.value = false
  }
}

onMounted(() => {
  loadEmailSwitch()
  loadTemplates()
})

watch(templateList, () => {
  const maxPage = Math.max(1, Math.ceil(templateList.value.length / pageSize.value))
  if (currentPage.value > maxPage) {
    currentPage.value = maxPage
  }
})
</script>

<style scoped lang="scss">
.email-config-page {
  min-width: 0;
  gap: 12px;
}

.ops-action-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.email-switch-group {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.email-template-count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.global-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;

  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }

  &--active {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
    .status-dot {
      background: #10b981;
    }
  }

  &--muted {
    background: var(--el-fill-color);
    color: var(--el-text-color-secondary);
    .status-dot {
      background: #94a3b8;
    }
  }
}

.time-text {
  color: var(--el-text-color-regular);
  font-variant-numeric: tabular-nums;
}

.channel-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;

  &--active {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
  }

  &--paused {
    background: var(--el-fill-color);
    color: var(--el-text-color-secondary);
  }
}

.template-banner-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 14px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.06), rgba(37, 99, 235, 0.02));
  border: 1px solid rgba(37, 99, 235, 0.14);
  border-radius: 10px;

  .banner-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .banner-icon {
    width: 36px;
    height: 36px;
    border-radius: 9px;
    background: rgba(37, 99, 235, 0.12);
    color: #2563eb;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
  }

  .banner-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .banner-label {
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  .banner-value {
    font-size: 14px;
    font-weight: 700;
    color: var(--el-text-color-primary);
  }

  .stat-pill {
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    font-size: 12px;
    color: var(--el-text-color-regular);
  }
}

.dialog-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}
</style>
