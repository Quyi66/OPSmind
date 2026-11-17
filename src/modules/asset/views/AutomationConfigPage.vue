<template>
  <div class="ops-page-layout" :class="{ 'is-english': currentLocale === 'en-US' }">
    <!-- Tab 页签 -->
    <div class="type-tabs-wrapper">
      <el-tabs v-model="activeTab" @tab-change="handleTabClick" class="modern-tabs">
        <el-tab-pane name="automation">
          <template #label>
            <span class="tab-label">
              <i class="fa fa-plug"></i>
              {{ t('asset.deviceCredentials') }}
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="ansible">
          <template #label>
            <span class="tab-label">
              <i class="fa fa-shield-alt"></i>
              {{ t('asset.connectionTemplates') }}
            </span>
          </template>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 主体内容 -->
    <div class="main-content-layout">
      <!-- 自动化配置信息 Tab 内容 -->
      <template v-if="activeTab === 'automation'">
        <div class="content-view-area">
          <!-- 筛选区 -->
          <div class="ops-filter-bar">
            <el-form :inline="true" size="small">
              <el-form-item :label="t('asset.ipAddress')">
                <el-input
                  v-model="filters.ip"
                  :placeholder="t('asset.ipPlaceholder')"
                  clearable
                  style="width: 180px"
                  maxlength="50"
                  @keyup.enter="handleAutomationSearch"
                @clear="handleAutomationSearch" />
              </el-form-item>
              <el-form-item :label="t('asset.deviceType')">
                <el-select v-model="filters.cit" style="width: 140px" @change="handleAutomationSearch">
                  <el-option :label="t('common.all')" value="sjxy_all" />
                  <el-option
                    v-for="item in resourceTypes"
                    :key="item.code"
                    :label="item.title"
                    :value="item.code"
                  />
                </el-select>
              </el-form-item>
              <el-form-item :label="t('asset.connectionTemplate')">
                <el-select v-model="filters.ansible_config_id" :placeholder="t('asset.selectLinkedTemplate')" clearable style="width: 200px" @change="handleAutomationSearch">
                  <el-option
                    v-for="item in ansibleConfigOptions"
                    :key="item.id"
                    :label="item.name"
                    :value="item.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item class="filter-actions">
                <el-button type="primary" @click="handleAutomationSearch">
                  <el-icon><Search /></el-icon>
                  {{ t('common.search') }}
                </el-button>
                <el-button @click="handleAutomationReset">
                  <el-icon><RefreshRight /></el-icon>
                  {{ t('common.reset') }}
                </el-button>
              </el-form-item>
            </el-form>
          </div>

          <!-- 操作栏 -->
          <div class="ops-action-bar">
            <el-button type="primary" size="small" @click="handleDeviceManage">
              <i class="fa fa-cogs" style="margin-right: 4px"></i>
              {{ t('asset.batchEnroll') }}
            </el-button>
            <el-button size="small" @click="quickCreateAnsibleConfig" plain>
              <i class="fa fa-plus" style="margin-right: 4px"></i>
              {{ t('asset.newTemplate') }}
            </el-button>
            <el-button size="small" @click="openOperationLog" plain>
              <i class="fa fa-history" style="margin-right: 4px"></i>
              {{ t('asset.connectionAudit') }}
            </el-button>
            <span style="flex: 1"></span>
            <el-button
              class="toolbar-icon-btn"
              circle
              size="small"
              :loading="automationLoading"
              @click="loadAutomationData"
              :title="t('common.refresh')"
            >
              <el-icon v-show="!automationLoading"><Refresh /></el-icon>
            </el-button>
          </div>

          <!-- 表格区域 -->
          <div class="ops-table-wrapper card-table">
            <el-table
              :data="filteredAutomationData"
              v-loading="automationLoading"
              height="100%"
              row-class-name="modern-table-row"
            >
              <!-- 1. 资产标识复合列 -->
              <el-table-column :label="t('asset.deviceId')" min-width="180" fixed="left">
                <template #default="{ row }">
                  <div class="composite-device-cell">
                    <span>{{ row.ip || '-' }}</span>
                    <el-tag size="small" type="info" effect="plain" class="cit-tag">
                      {{ row.ci_type || row.ciType || '-' }}
                    </el-tag>
                  </div>
                </template>
              </el-table-column>

              <!-- 2. 引用模板 -->
              <el-table-column prop="ansibleConfigName" :label="t('asset.linkedTemplate')" min-width="160">
                <template #default="{ row }">
                  <el-link
                    v-if="row.ansibleConfigName"
                    type="primary"
                    underline="never"
                    class="link-with-icon"
                    @click="switchToTab('ansible')"
                  >
                    <i class="fa fa-link icon-decorator"></i>
                    {{ row.ansibleConfigName }}
                  </el-link>
                  <el-tag v-else size="small" type="warning" effect="light">{{ t('asset.noTemplate') }}</el-tag>
                </template>
              </el-table-column>

              <!-- 3. 执行引擎 -->
              <el-table-column prop="instanceGroup" :label="t('asset.executionNode')" min-width="160">
                <template #default="{ row }">
                  <span class="engine-node-text">{{ row.instanceGroup || '-' }}</span>
                </template>
              </el-table-column>

              <!-- 4. AAP 节点 -->
              <el-table-column prop="aapInstanceGroup" :label="t('asset.aapNode')" min-width="140">
                <template #default="{ row }">
                  <span class="engine-node-text">{{ row.aapInstanceGroup || '-' }}</span>
                </template>
              </el-table-column>

              <!-- 5. 登录与执行用户 -->
              <el-table-column prop="loginUser" :label="t('asset.connectionAccount')" :width="currentLocale === 'en-US' ? 160 : 130">
                <template #default="{ row }">
                  <div class="credentials-cell">
                    <span class="cred-item" :title="t('asset.loginUser')">
                      <i class="fa fa-user-circle text-primary"></i>
                      {{ row.loginUser || '-' }}
                    </span>
                  </div>
                </template>
              </el-table-column>

              <!-- <el-table-column prop="runUser" label="特权执行账号" width="130">
                <template #default="{ row }">
                  <div class="credentials-cell">
                    <span class="cred-item" title="提权执行用户">
                      <i class="fa fa-user-shield text-warning"></i>
                      {{ row.runUser || '-' }}
                    </span>
                  </div>
                </template>
              </el-table-column> -->

              <!-- 6. 更新时间 -->
              <el-table-column prop="updated_at" :label="t('asset.lastModified')" width="180">
                <template #default="{ row }">
                  <span>{{ formatDateTime(row.updated_at || row.updatedAt) }}</span>
                </template>
              </el-table-column>

              <!-- 7. 操作 -->
              <el-table-column :label="t('common.actions')" width="80" fixed="right">
                <template #default="{ row }">
                  <el-button text type="primary" size="small" @click="handleEditAutomation(row)">
                    {{ t('common.edit') }}
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
        </div>
      </template>

      <!-- Ansible连接配置 Tab 内容 -->
      <template v-if="activeTab === 'ansible'">
        <div class="content-view-area">
          <!-- 筛选区 -->
          <div class="ops-filter-bar">
            <el-form :inline="true" size="small">
              <el-form-item :label="t('asset.keyword')">
                <el-input
                  v-model="ansibleSearch"
                  :placeholder="t('asset.templateSearch')"
                  clearable
                  :style="{ width: currentLocale === 'en-US' ? '340px' : '260px' }"
                  maxlength="50"
                  @keyup.enter="handleAnsibleSearch"
                />
              </el-form-item>
              <el-form-item class="filter-actions">
                <el-button type="primary" @click="handleAnsibleSearch">
                  <el-icon><Search /></el-icon>
                  {{ t('common.search') }}
                </el-button>
                <el-button @click="handleAnsibleReset">
                  <el-icon><RefreshRight /></el-icon>
                  {{ t('common.reset') }}
                </el-button>
              </el-form-item>
            </el-form>
          </div>

          <!-- 操作栏 -->
          <div class="ops-action-bar">
            <el-button type="primary" size="small" @click="handleAddAnsibleConfig">
              <i class="fa fa-plus" style="margin-right: 4px"></i>
              {{ t('asset.newCredentialTemplate') }}
            </el-button>
            <span style="flex: 1"></span>
            <el-button
              class="toolbar-icon-btn"
              circle
              size="small"
              :loading="ansibleLoading"
              @click="loadAnsibleData"
              :title="t('common.refresh')"
            >
              <el-icon v-show="!ansibleLoading"><Refresh /></el-icon>
            </el-button>
          </div>

          <!-- 表格区域 -->
          <div class="ops-table-wrapper card-table">
            <el-table
              :data="paginatedAnsibleData"
              v-loading="ansibleLoading"
              height="100%"
              row-class-name="modern-table-row"
            >
              <el-table-column
                prop="name"
                :label="t('asset.templateName')"
                min-width="150"
                fixed="left"
                class-name="font-bold-column"
              />
              <el-table-column prop="instanceGroup" :label="t('asset.executionNode')" min-width="150" />
              <el-table-column prop="aapInstanceGroup" :label="t('asset.aapNode')" min-width="140" />

              <el-table-column prop="loginUser" :label="t('asset.loginAccount')" width="120">
                <template #default="{ row }">
                  <span class="user-cell-item">
                    <i class="fa fa-user text-primary"></i>
                    {{ row.loginUser || '-' }}
                  </span>
                </template>
              </el-table-column>

              <el-table-column prop="runUser" :label="t('asset.privilegedAccount')" :width="currentLocale === 'en-US' ? 220 : 120">
                <template #default="{ row }">
                  <span class="user-cell-item">
                    <i class="fa fa-user-shield text-warning"></i>
                    {{ row.runUser || '-' }}
                  </span>
                </template>
              </el-table-column>

              <el-table-column prop="group_paths" :label="t('asset.applicableGroups')" min-width="200">
                <template #default="{ row }">
                  <div v-if="getGroupPathList(row).length" class="group-path-list">
                    <el-tag
                      v-for="path in getGroupPathList(row)"
                      :key="path"
                      size="small"
                      effect="plain"
                      type="success"
                      class="visual-path-tag"
                    >
                      {{ path }}
                    </el-tag>
                  </div>
                  <span v-else class="placeholder-dash">-</span>
                </template>
              </el-table-column>

              <el-table-column prop="param" :label="t('asset.extraConnectionParams')" :min-width="currentLocale === 'en-US' ? 260 : 180">
                <template #default="{ row }">
                  <el-tooltip v-if="row.param" :content="row.param" placement="top" effect="dark">
                    <span class="param-preview">{{ getParamPreview(row.param) }}</span>
                  </el-tooltip>
                  <span v-else class="placeholder-dash">-</span>
                </template>
              </el-table-column>

              <el-table-column prop="updatedAt" :label="t('asset.lastModified')" width="180">
                <template #default="{ row }">
                  <span>{{ formatDateTime(row.updatedAt) }}</span>
                </template>
              </el-table-column>

              <el-table-column :label="t('common.actions')" :width="currentLocale === 'en-US' ? 120 : 100" fixed="right">
                <template #default="{ row }">
                  <el-button text type="primary" size="small" @click="handleEditAnsible(row)">
                    {{ t('common.edit') }}
                  </el-button>
                  <el-button text type="danger" size="small" @click="handleDeleteAnsible(row)">
                    {{ t('common.delete') }}
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
        </div>
      </template>
    </div>

    <!-- 编辑自动化配置抽屉 (Dialog -> Drawer 升级) -->
    <el-drawer
      v-model="editAutomationDialogVisible"
      :title="t('asset.editDeviceCredentials')"
      size="560px"
      direction="rtl"
      :close-on-click-modal="false"
      destroy-on-close
      class="automation-drawer"
      :close-on-press-escape="false"
    >
      <div v-loading="automationFormLoading" class="drawer-body">
        <el-alert
          :title="t('asset.credentialHelp')"
          :description="t('asset.credentialDescription')"
          type="info"
          show-icon
          :closable="false"
          style="margin-bottom: 20px"
        />

        <el-form :model="automationForm" label-position="top">
          <el-form-item :label="t('asset.targetIp')">
            <el-input v-model="automationForm.ip" disabled />
          </el-form-item>

          <el-form-item :label="t('asset.executionNode')" v-if="scriptEngine !== 'aap'">
            <el-select
              v-model="automationForm.instanceGroup"
              :placeholder="t('asset.selectExecutionNode')"
              style="width: 100%"
              clearable
            >
              <el-option :label="t('asset.none')" value="" />
              <el-option
                v-for="item in instanceGroupOptions"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
          </el-form-item>

          <el-form-item :label="t('asset.aapNode')" v-if="scriptEngine === 'aap'">
            <el-select
              v-model="automationForm.aapInstanceGroup"
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

          <el-form-item :label="t('asset.referenceTemplate')">
            <div style="display: flex; gap: 8px; width: 100%; align-items: center;">
              <el-select
                v-model="automationForm.ansibleConfigId"
                clearable
                :placeholder="t('asset.selectAnsibleTemplate')"
                style="flex: 1"
              >
                <template #empty>
                  <div style="padding: 12px; text-align: center; color: var(--el-text-color-secondary);">
                    <span>{{ t('asset.noCredentialTemplates') }}</span>
                    <el-button type="primary" link @click="quickCreateAnsibleConfig">{{ t('asset.createOne') }}</el-button>
                  </div>
                </template>
                <el-option
                  v-for="item in ansibleConfigOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
              <el-button type="primary" plain @click="quickCreateAnsibleConfig">
                <i class="fa fa-plus" style="margin-right: 4px"></i>{{ t('asset.newTemplate') }}
              </el-button>
            </div>
          </el-form-item>

          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item :label="t('asset.connectionLoginUser')">
                <el-input
                  v-model="automationForm.loginUser"
                  :placeholder="t('asset.rootExample')"
                  maxlength="32"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="t('asset.connectionPassword')">
                <el-input
                  v-model="automationForm.loginPasswd"
                  type="password"
                  show-password
                  :placeholder="t('asset.blankUnchanged')"
                  autocomplete="new-password"
                  maxlength="32"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item :label="t('asset.privilegedUserSudo')">
                <el-input
                  v-model="automationForm.runUser"
                  :placeholder="t('asset.rootExample')"
                  maxlength="32"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="t('asset.privilegedPassword')">
                <el-input
                  v-model="automationForm.runPasswd"
                  type="password"
                  show-password
                  :placeholder="t('asset.blankUnchanged')"
                  autocomplete="new-password"
                  maxlength="32"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>
      <template #footer>
        <div style="display: flex; gap: 12px; justify-content: flex-end">
          <el-button @click="editAutomationDialogVisible = false">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" :loading="automationSaving" @click="saveAutomationConfig">
            {{ t('asset.saveCredentials') }}
          </el-button>
        </div>
      </template>
    </el-drawer>

    <!-- 新增/编辑Ansible配置抽屉 (Dialog -> Drawer 升级) -->
    <el-drawer
      v-model="editAnsibleDialogVisible"
      :title="ansibleForm.id ? t('asset.editSharedTemplate') : t('asset.addSharedTemplate')"
      size="580px"
      direction="rtl"
      :close-on-click-modal="false"
      destroy-on-close
      class="ansible-drawer"
      :close-on-press-escape="false"
    >
      <div v-loading="ansibleFormLoading" class="drawer-body">
        <el-alert
          :title="t('asset.templateHelp')"
          :description="t('asset.templateDescription')"
          type="success"
          show-icon
          :closable="false"
          style="margin-bottom: 20px"
        />

        <el-form :model="ansibleForm" label-position="top">
          <el-form-item :label="t('asset.connectionTemplateName')" required>
            <el-input
              v-model="ansibleForm.name"
              :placeholder="t('asset.templateNameExample')"
              maxlength="50"
            />
          </el-form-item>

          <el-form-item :label="t('asset.automaticGroups')">
            <el-select
              v-model="ansibleForm.groupIds"
              :placeholder="t('asset.bindGroups')"
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

          <el-form-item :label="t('asset.executionNode')" v-if="scriptEngine !== 'aap'">
            <el-select
              v-model="ansibleForm.instanceGroup"
              :placeholder="t('asset.select')"
              style="width: 100%"
              clearable
            >
              <el-option :label="t('asset.none')" value=" " />
              <el-option
                v-for="item in instanceGroupOptions"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
          </el-form-item>

          <el-form-item :label="t('asset.aapNode')" v-if="scriptEngine === 'aap'">
            <el-select
              v-model="ansibleForm.aapInstanceGroup"
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

          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item :label="t('asset.defaultLoginUser')">
                <el-input v-model="ansibleForm.loginUser" :placeholder="t('asset.rootExample')" maxlength="32" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="t('asset.defaultLoginPassword')">
                <el-input
                  v-model="ansibleForm.loginPasswd"
                  type="password"
                  show-password
                  :placeholder="t('asset.blankKeep')"
                  autocomplete="new-password"
                  maxlength="32"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item :label="t('asset.defaultPrivilegedUser')">
                <el-input v-model="ansibleForm.runUser" :placeholder="t('asset.rootExample')" maxlength="32" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="t('asset.defaultPrivilegedPassword')">
                <el-input
                  v-model="ansibleForm.runPasswd"
                  type="password"
                  show-password
                  :placeholder="t('asset.blankKeep')"
                  autocomplete="new-password"
                  maxlength="32"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item :label="t('asset.advancedAnsible')">
            <el-input
              v-model="ansibleForm.param"
              type="textarea"
              :rows="4"
              :placeholder="t('asset.ansibleExample')"
            />
            <div class="form-desc">
              {{ t('asset.ansibleParamHelp') }}
            </div>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <div style="display: flex; gap: 12px; justify-content: flex-end">
          <el-button @click="editAnsibleDialogVisible = false">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" @click="saveAnsibleConfig">{{ t('asset.saveTemplate') }}</el-button>
        </div>
      </template>
    </el-drawer>

    <!-- 设备纳管弹窗 -->
    <DeviceManageDialog
      ref="deviceManageDialogRef"
      v-model="deviceManageDialogVisible"
      @success="handleDeviceManageSuccess"
      @create-template="quickCreateAnsibleConfig"
    />
  </div>
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'

import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { automationApi, dataManageApi } from '../api'
import { apiService } from '@/core/api'
import { authService } from '@/core/auth'
import DeviceManageDialog from '../components/automation/DeviceManageDialog.vue'
import { formatDateTime } from '../utils/helpers'

const router = useRouter()
const route = useRoute()

// Tab
const activeTab = ref('automation')

// 资源类型
const resourceTypes = ref([])

// 筛选条件
const filters = ref({
  ip: '',
  cit: 'sjxy_all',
  ansible_config_id: ''
})

// 自动化配置数据
const automationLoading = ref(false)
const automationData = ref([])
const automationPage = ref(1)
const automationPageSize = ref(10)
const automationTotal = ref(0)

// Ansible配置数据
const ansibleLoading = ref(false)
const ansibleData = ref([])
const ansibleSearch = ref('')
const ansibleConfigOptions = ref([])
const ansiblePage = ref(1)
const ansiblePageSize = ref(10)

// 弹窗下拉选项
const scriptEngine = ref('ansible')
const instanceGroupOptions = ref([])
const aapInstanceGroupOptions = ref([])
const groupOptions = ref([])

// 弹窗
const editAutomationDialogVisible = ref(false)
const editAnsibleDialogVisible = ref(false)
const deviceManageDialogVisible = ref(false)
const deviceManageDialogRef = ref(null)
const isQuickCreatingAnsible = ref(false)

function quickCreateAnsibleConfig() {
  isQuickCreatingAnsible.value = true
  handleAddAnsibleConfig()
}

watch(editAnsibleDialogVisible, newVal => {
  if (!newVal) {
    isQuickCreatingAnsible.value = false
  }
})

// 表单
const automationForm = ref({})
const automationFormLoading = ref(false)
const automationSaving = ref(false)
const ansibleForm = ref({})
const ansibleFormLoading = ref(false)

function resolveScriptEngineResponse(response) {
  return (
    response?.value || response?.records?.[0]?.value || response?.records?.[0]?.result || 'ansible'
  )
}

function parseStringListValue(rawValue) {
  if (!rawValue) return []
  if (Array.isArray(rawValue)) return rawValue
  try {
    const parsed = JSON.parse(rawValue)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function normalizeAnsibleConfigOptions(records = []) {
  return records.map(item => normalizeAnsibleRecord(item)).filter(item => item?.id)
}

function normalizeAnsibleRecord(record = {}) {
  const groupIdList = Array.isArray(record.groupIds)
    ? record.groupIds
    : `${record.groupIds || record.group_ids || ''}`
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)

  return {
    ...record,
    name: record.name || record.ansibleConfigName || record.ansible_config_name || '',
    param: record.param || '',
    instanceGroup: record.instanceGroup ?? record.instance_group ?? '',
    aapInstanceGroup: record.aapInstanceGroup ?? record.aap_instance_group ?? '',
    loginUser: record.loginUser ?? record.login_user ?? '',
    loginPasswd: record.loginPasswd ?? record.login_passwd ?? '',
    runUser: record.runUser ?? record.run_user ?? '',
    runPasswd: record.runPasswd ?? record.run_passwd ?? '',
    groupIds: groupIdList,
    group_paths: record.group_paths ?? record.groupPaths ?? '',
    updatedAt: record.updatedAt || record.updated_at || '',
    createdAt: record.createdAt || record.created_at || ''
  }
}

function normalizeAutomationRecord(record = {}) {
  const ansibleConfigId =
    record.ansibleConfigId || record.ansible_config_id || record.ansibleVarsSetId || ''
  const matchedConfig = ansibleConfigOptions.value.find(
    item => `${item.id}` === `${ansibleConfigId}`
  )

  return {
    ...record,
    ciId: record.ciId || record.ci_id || record.cid || '',
    hostKey: record.hostKey || record.host_key || record.ip || '',
    ip: record.ip || record.hostKey || record.host_key || '',
    ciType: record.ciType || record.ci_type || '',
    instanceGroup: record.instanceGroup ?? record.instance_group ?? '',
    aapInstanceGroup: record.aapInstanceGroup ?? record.aap_instance_group ?? '',
    loginUser: record.loginUser ?? record.login_user ?? '',
    runUser: record.runUser ?? record.run_user ?? '',
    ansibleConfigId,
    ansibleVarsSetId:
      record.ansibleVarsSetId || record.ansible_config_id || record.ansibleConfigId || '',
    ansibleConfigName:
      record.ansibleConfigName || record.ansible_config_name || matchedConfig?.name || '',
    updatedAt: record.updatedAt || record.updated_at || '',
    updated_at: record.updated_at || record.updatedAt || ''
  }
}

// 计算属性 - 直接使用后端返回的数据（后端已筛选）
const filteredAutomationData = computed(() => {
  return automationData.value.map(item => normalizeAutomationRecord(item))
})

const filteredAnsibleData = computed(() => {
  const normalizedData = ansibleData.value.map(item => normalizeAnsibleRecord(item))

  if (!ansibleSearch.value) {
    return normalizedData
  }
  const keyword = ansibleSearch.value.toLowerCase()
  return normalizedData.filter(item => {
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

onMounted(() => {
  loadResourceTypes()
  if (route.query.ip) {
    filters.value.ip = route.query.ip
    activeTab.value = 'automation'
  }
  loadAutomationData()
  loadAnsibleData()
})

// 监听路由参数变化进行联动搜索
watch(
  () => [route.path, route.query],
  ([path, query]) => {
    if (path.replace(/\/$/, '') !== '/acm/automation') return
    if (query.ip) {
      filters.value.ip = query.ip
      activeTab.value = 'automation'
      loadAutomationData()
    }
  }
)

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
        ip: filters.value.ip || undefined,
        cit: filters.value.cit || undefined,
        ansible_config_id: filters.value.ansible_config_id || undefined
      },
      {
        size: automationPageSize.value,
        page: automationPage.value
      }
    )
    automationData.value = response?.records || []
    automationTotal.value = response?.total || 0
  } catch (error) {
    console.error('加载自动化配置失败:', error)
    ElMessage.error(t('asset.loadAutomationFailed'))
  } finally {
    automationLoading.value = false
  }
}

// 加载Ansible配置数据
async function loadAnsibleData() {
  ansibleLoading.value = true
  try {
    // ACM_GET_ALL_ANSIBLE_SET_REST → GET /cmdb/api/cmdb/auto/ansible/find/all
    const res = await apiService.get('/cmdb/api/cmdb/auto/ansible/find/all')
    const records = res?.data || res || []
    ansibleData.value = Array.isArray(records) ? records : records?.records || []
    // 更新配置选项（供其它下拉使用）
    ansibleConfigOptions.value = normalizeAnsibleConfigOptions(ansibleData.value)
  } catch (error) {
    console.error('加载Ansible配置失败:', error)
    ElMessage.error(t('asset.loadAnsibleFailed'))
  } finally {
    ansibleLoading.value = false
  }
}

// Ansible配置搜索
function handleAnsibleSearch() {
  ansiblePage.value = 1
}

// 凭据模板搜索防抖
let ansibleDebounceTimer = null
watch(ansibleSearch, newVal => {
  if (ansibleDebounceTimer) {
    clearTimeout(ansibleDebounceTimer)
  }
  if (!newVal) {
    handleAnsibleSearch()
  } else {
    ansibleDebounceTimer = setTimeout(() => {
      handleAnsibleSearch()
    }, 300)
  }
})

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

function loadCurrentTabData(tabName = activeTab.value) {
  if (tabName === 'automation') {
    loadAutomationData()
    return
  }

  loadAnsibleData()
}

function switchToTab(tabName) {
  activeTab.value = tabName
  loadCurrentTabData(tabName)
}

function openOperationLog() {
  router.push({
    path: '/acm/log',
    query: {
      day: '1'
    }
  })
}

// Tab切换
function handleTabClick() {
  loadCurrentTabData()
}

// 自动化配置搜索
function handleAutomationSearch() {
  automationPage.value = 1
  loadAutomationData()
}

// 自动化配置重置
function handleAutomationReset() {
  filters.value.ip = ''
  filters.value.cit = 'sjxy_all'
  filters.value.ansible_config_id = ''
  automationPage.value = 1
  loadAutomationData()
}

// 加载Ansible表单选项数据
async function loadAnsibleFormOptions() {
  try {
    const engineData = await automationApi.getScriptEngine()
    scriptEngine.value = resolveScriptEngineResponse(engineData)
    instanceGroupOptions.value = []
    aapInstanceGroupOptions.value = []

    // 加载执行引擎节点列表
    const instanceGroups = await automationApi.getInstanceGroupList()
    if (instanceGroups.length > 0) {
      instanceGroupOptions.value = instanceGroups
    }

    // 加载AAP instance group（如果是aap引擎）: AAP_QUERY_INSTANCE_GROUP → GET /workflow/api/workflow/aap/instance_group
    if (scriptEngine.value === 'aap') {
      const aapRes = await apiService.get('/workflow/api/workflow/aap/instance_group')
      const aapData = aapRes?.data || aapRes
      aapInstanceGroupOptions.value = Array.isArray(aapData) ? aapData : aapData?.records || []
    }

    // 加载分组列表
    const groupRes = await apiService.get('/cmdb/api/cmdb/query/group/find/sjxy_all')
    const groupData = groupRes?.data || groupRes
    groupOptions.value = Array.isArray(groupData) ? groupData : groupData?.records || []
  } catch (error) {
    console.error('加载表单选项失败:', error)
  }
}

// 编辑自动化配置
async function handleEditAutomation(row) {
  editAutomationDialogVisible.value = true
  automationFormLoading.value = true

  const normalizedRow = normalizeAutomationRecord(row)

  automationForm.value = {
    id: normalizedRow.id,
    ciId: normalizedRow.ciId,
    ip: normalizedRow.ip,
    ansibleConfigId: normalizedRow.ansibleConfigId,
    instanceGroup: normalizedRow.instanceGroup || '',
    aapInstanceGroup: normalizedRow.aapInstanceGroup || '',
    loginUser: normalizedRow.loginUser || '',
    loginPasswd: '',
    runUser: normalizedRow.runUser || '',
    runPasswd: ''
  }

  try {
    await loadAutomationFormOptions()
  } finally {
    automationFormLoading.value = false
  }
}

// 加载自动化配置表单选项
async function loadAutomationFormOptions() {
  try {
    const engineData = await automationApi.getScriptEngine()
    scriptEngine.value = resolveScriptEngineResponse(engineData)
    instanceGroupOptions.value = []
    aapInstanceGroupOptions.value = []

    if (scriptEngine.value !== 'aap') {
      instanceGroupOptions.value = await automationApi.getInstanceGroupList()
    }

    if (scriptEngine.value === 'aap') {
      const aapRes = await apiService.get('/workflow/api/workflow/aap/instance_group')
      const aapData = aapRes?.data || aapRes
      aapInstanceGroupOptions.value = Array.isArray(aapData) ? aapData : aapData?.records || []
    }

    // 加载自动化配置名称列表
    ansibleConfigOptions.value = normalizeAnsibleConfigOptions(
      await automationApi.getAllAssetAutoConfigOptions()
    )
  } catch (error) {
    console.error('加载自动化配置表单选项失败:', error)
  }
}

function getGroupPathList(row) {
  const groupPaths = parseStringListValue(row?.group_paths ?? row?.groupPaths)
  if (groupPaths.length > 0) {
    return groupPaths.map(item => `${item}`.trim()).filter(Boolean)
  }

  return `${row?.group_paths ?? row?.groupPaths ?? ''}`
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function getParamPreview(param) {
  if (!param) return '-'
  return param.length > 48 ? `${param.slice(0, 48)}...` : param
}

// 保存自动化配置
async function saveAutomationConfig() {
  automationSaving.value = true
  try {
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
    await apiService.post(`/workflow/api/workflow/jobs/3TRE7d/run?cacheBuster=${cacheBuster}`, {
      params
    })

    ElMessage.success(t('asset.saved'))
    editAutomationDialogVisible.value = false
    loadAutomationData()
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error(t('asset.saveFailed'))
  } finally {
    automationSaving.value = false
  }
}

// 新增Ansible配置
async function handleAddAnsibleConfig() {
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
    await loadAnsibleFormOptions()
  } finally {
    ansibleFormLoading.value = false
  }
}

// 编辑Ansible配置
async function handleEditAnsible(row) {
  const normalizedRow = normalizeAnsibleRecord(row)

  ansibleForm.value = {
    id: normalizedRow.id,
    name: normalizedRow.name,
    instanceGroup: normalizedRow.instanceGroup,
    aapInstanceGroup: normalizedRow.aapInstanceGroup,
    groupIds: normalizedRow.groupIds,
    loginUser: normalizedRow.loginUser,
    loginPasswd: '',
    runUser: normalizedRow.runUser,
    runPasswd: '',
    param: normalizedRow.param
  }
  editAnsibleDialogVisible.value = true
  ansibleFormLoading.value = true

  try {
    await loadAnsibleFormOptions()
  } finally {
    ansibleFormLoading.value = false
  }
}

// 删除Ansible配置
async function handleDeleteAnsible(row) {
  try {
    await ElMessageBox.confirm(t('asset.deleteTemplateConfirm'), t('asset.confirmDelete'), {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      type: 'warning'
    })

    const token = authService.getToken() || ''
    const cacheBuster = Date.now()
    await apiService.post(`/workflow/api/workflow/jobs/OApRjl/run?cacheBuster=${cacheBuster}`, {
      params: {
        token,
        id: row.id
      }
    })

    ElMessage.success(t('asset.deleted'))
    loadAnsibleData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error(t('asset.deleteFailed'))
    }
  }
}

// 保存Ansible配置
async function saveAnsibleConfig() {
  if (!ansibleForm.value.name) {
    ElMessage.warning(t('asset.configNameRequired'))
    return
  }
  try {
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

    if (ansibleForm.value.id) {
      params.id = ansibleForm.value.id
    }

    const cacheBuster = Date.now()
    await apiService.post(`/workflow/api/workflow/jobs/c7WN62/run?cacheBuster=${cacheBuster}`, {
      params
    })

    ElMessage.success(t('asset.saved'))
    editAnsibleDialogVisible.value = false
    if (isQuickCreatingAnsible.value) {
      await loadAutomationFormOptions()
      const newConfig = ansibleConfigOptions.value.find(
        item => item.name === ansibleForm.value.name
      )
      if (newConfig) {
        if (deviceManageDialogVisible.value && deviceManageDialogRef.value) {
          await deviceManageDialogRef.value.refreshAndSelectConfig(newConfig.id)
        } else {
          automationForm.value.ansibleConfigId = newConfig.id
        }
      }
      isQuickCreatingAnsible.value = false
    }
    loadAnsibleData()
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error(t('asset.saveFailed'))
  }
}

// 设备纳管
function handleDeviceManage() {
  deviceManageDialogVisible.value = true
}

// 设备纳管成功回调
function handleDeviceManageSuccess() {
  ElMessage.success(t('asset.enrollSubmittedHint'))
  loadAutomationData()
}
</script>

<style scoped lang="scss">
.main-content-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.composite-device-cell {
  display: flex;
  align-items: center;
  gap: 10px;

  .cit-tag {
    height: 20px;
    line-height: 20px;
    border-radius: 4px;
  }
}

.link-with-icon {
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;

  .icon-decorator {
    font-size: 11px;
    color: var(--el-text-color-placeholder);
  }
}

.engine-node-text {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.credentials-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .cred-item {
    font-size: 13px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--el-text-color-regular);
  }
}

.user-cell-item {
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--el-text-color-regular);
}

.group-path-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 2px 0;

  .visual-path-tag {
    border-radius: 4px;
    border: 1px solid var(--el-color-success-light-8);
  }
}

.param-preview {
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--el-text-color-regular);
  font-size: 12px;
  font-family: Consolas, Monaco, monospace;
}

.form-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  line-height: 1.4;
}

.ops-page-layout.is-english :deep(.el-table .cell) {
  word-break: normal;
  overflow-wrap: break-word;
}
</style>
