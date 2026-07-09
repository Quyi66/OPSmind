<template>
  <div class="ops-page-layout">
    <!-- Tab 导航 -->
    <el-tabs v-model="activeTab" class="mb-3">
      <el-tab-pane label="一键分批安装" name="install" />
      <el-tab-pane label="软件包集管理" name="management" />
    </el-tabs>

    <!-- 一键分批安装 Tab -->
    <template v-if="activeTab === 'install'">
      <div style="display: flex; gap: 20px; height: calc(100vh - 180px); overflow: hidden;">
        <!-- 左侧配置区 -->
        <div style="flex: 2; display: flex; flex-direction: column; gap: 16px; background: var(--el-bg-color); border: 1px solid var(--el-border-color-light); border-radius: 8px; padding: 20px; min-width: 0;">
          <h3 class="m-0 mb-3" style="font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <i class="fa fa-sliders-h" style="color: var(--el-color-primary);" />
            1. 安装配置
          </h3>

          <el-form label-position="top" size="small" style="flex: 1; overflow-y: auto; padding-right: 8px;">
            <!-- 包集选择方式 -->
            <el-form-item label="软件包来源">
              <el-radio-group v-model="installForm.useCustomPackages">
                <el-radio-button :value="false">选择已有包集</el-radio-button>
                <el-radio-button :value="true">临时输入包名</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <!-- 选择已有包集 -->
            <el-form-item v-if="!installForm.useCustomPackages" label="选择软件包集" required>
              <div style="width: 100%;">
                <div style="display: flex; gap: 8px; width: 100%;">
                  <el-select
                    v-model="installForm.packageSetId"
                    placeholder="请选择软件包集"
                    style="flex: 1;"
                    clearable
                    @change="handlePackageSetChange"
                  >
                    <el-option
                      v-for="item in packageSets"
                      :key="item.id"
                      :label="item.name"
                      :value="item.id"
                    >
                      <span style="float: left;">{{ item.name }}</span>
                      <span style="float: right; color: var(--el-text-color-secondary); font-size: 12px; margin-left: 20px;">
                        {{ item.source === 'headquarters' ? '总行' : '自定义' }}
                      </span>
                    </el-option>
                  </el-select>
                  <el-button
                    type="primary"
                    plain
                    @click="handleCreatePackageSet"
                  >
                    新建包集
                  </el-button>
                </div>

                <!-- 已选包集信息展示 -->
                <div v-if="selectedPackageSet" class="mt-2" style="background: var(--el-fill-color-light); border-radius: 8px; padding: 16px; font-size: 13px; border: 1px solid var(--el-border-color-lighter); width: 100%; box-sizing: border-box;">
                  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 12px;">
                    <div><strong>适用系统：</strong><span style="color: var(--el-text-color-regular);">{{ selectedPackageSet.osType }}</span></div>
                    <div><strong>包集描述：</strong><span style="color: var(--el-text-color-regular);">{{ selectedPackageSet.description || '无' }}</span></div>
                  </div>
                  <div>
                    <strong style="display: block; margin-bottom: 8px;">包含软件包：</strong>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px; max-height: 350px; overflow-y: auto; padding: 2px;">
                      <el-tag
                        v-for="pkg in parsedSelectedPackages"
                        :key="pkg"
                        size="small"
                        type="info"
                        effect="light"
                        round
                      >
                        {{ pkg }}
                      </el-tag>
                    </div>
                  </div>
                </div>
              </div>
            </el-form-item>

            <!-- 临时输入包名 -->
            <el-form-item v-else label="输入软件包名称" required>
              <el-input
                v-model="installForm.customPackagesText"
                type="textarea"
                :rows="5"
                placeholder="请输入软件包名称，支持换行、空格或逗号分隔。例如：&#10;openssl, bash, sudo"
              />
              <div style="font-size: 12px; color: var(--el-text-color-secondary);" class="mt-1">
                请输入在当前系统 YUM/APT 源中存在的软件包名，支持多种分隔符。
              </div>
            </el-form-item>

            <!-- 每批数量 -->
            <el-form-item label="分批大小 (每批主机数)" required>
              <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
                <el-input-number
                  v-model="installForm.batchSize"
                  :min="1"
                  :max="1000"
                  style="width: 140px;"
                  :controls="false"
                />
                <el-tooltip content="目标主机会按照该数值拆分成多个批次，依次下发执行（前一批执行完成后自动接续下一批），以降低大规模并发更新时的网络及系统负载。" placement="top">
                  <i class="fa fa-info-circle" style="color: var(--el-text-color-secondary); cursor: pointer;" />
                </el-tooltip>
                <span style="font-size: 12px; color: var(--el-text-color-secondary); margin-left: 4px;">
                  默认 50，不填或设空则使用系统参数
                </span>
              </div>
            </el-form-item>
          </el-form>
        </div>

        <!-- 右侧资产选择器 -->
        <div style="flex: 3; display: flex; flex-direction: column; background: var(--el-bg-color); border: 1px solid var(--el-border-color-light); border-radius: 8px; padding: 20px; min-width: 0;">
          <h3 class="m-0 mb-3" style="font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <i class="fa fa-server" style="color: var(--el-color-primary);" />
            2. 选择目标主机
          </h3>
          <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; margin-bottom: 20px;">
            <AcmDeviceSelector
              v-model="selectedHosts"
              ci-types="[auto]"
              :options="{
                selectMode: 'host,group,tag,input,recently',
                selector: 'multiple',
                label: '选择目标主机'
              }"
            />
          </div>
          <div class="pt-3" style="border-top: 1px solid var(--el-border-color-lighter); display: flex; justify-content: flex-end;">
            <el-button
              type="primary"
              size="default"
              :disabled="isSubmitDisabled"
              style="width: 100%; font-weight: 600;"
              @click="handleStartOneClickInstall"
            >
              <i class="fa fa-play-circle me-1" />
              立即开始一键分批更新
            </el-button>
          </div>
        </div>
      </div>
    </template>

    <!-- 软件包集管理 Tab -->
    <template v-else-if="activeTab === 'management'">
      <!-- 操作工具栏 -->
      <div class="ops-action-bar">
        <el-button type="primary" size="small" @click="handleCreatePackageSet">
          <i class="fa fa-plus me-1" />
          新建包集
        </el-button>
        <span style="flex: 1"></span>
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="loadingSets"
          title="刷新"
          @click="loadPackageSets"
        >
          <el-icon v-show="!loadingSets"><Refresh /></el-icon>
        </el-button>
      </div>

      <!-- 数据表格 -->
      <div class="ops-table-wrapper">
        <el-table v-loading="loadingSets" :data="packageSets" height="100%">
          <el-table-column prop="name" label="包集名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="osType" label="适用系统" width="100" />
          <el-table-column prop="source" label="包集来源" width="100">
            <template #default="{ row }">
              <el-tag :type="row.source === 'headquarters' ? 'warning' : 'info'" size="small" round>
                {{ row.source === 'headquarters' ? '总行下发' : '分行自定义' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="包集描述" min-width="200" show-overflow-tooltip />
          <el-table-column prop="packages" label="包含软件包数" width="120">
            <template #default="{ row }">
              {{ countPackages(row.packages) }} 个
            </template>
          </el-table-column>
          <el-table-column prop="updatedTime" label="更新时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.updatedTime) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button text type="primary" size="small" @click="handleEditPackageSet(row)">
                编辑
              </el-button>
              <el-button
                v-if="row.source !== 'headquarters'"
                text
                type="danger"
                size="small"
                @click="handleDeletePackageSet(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>

    <!-- 包集编辑对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      :title="editForm.id ? '编辑软件包集' : '新建软件包集'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="100px" size="small">
        <el-form-item label="包集名称" prop="name">
          <el-input v-model="editForm.name" placeholder="请输入包集名称" />
        </el-form-item>
        <el-form-item label="适用系统" prop="osType">
          <el-select v-model="editForm.osType" placeholder="请选择适用系统" style="width: 100%;">
            <el-option label="Linux" value="linux" />
            <el-option label="Windows" value="windows" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="editForm.description" type="textarea" :rows="2" placeholder="请输入包集描述" />
        </el-form-item>
        <el-form-item label="软件包列表" prop="packagesText">
          <el-input
            v-model="editForm.packagesText"
            type="textarea"
            :rows="8"
            placeholder="请输入软件包名称，支持换行、空格或逗号分隔。例如：&#10;openssl, bash, sudo"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button size="small" @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" size="small" :loading="savingSet" @click="submitEditForm">
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 一键更新执行进度对话框 -->
    <el-dialog
      v-model="progressVisible"
      title="一键分批更新执行进度"
      width="900px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      @closed="handleProgressClosed"
    >
      <div v-if="taskDetail" style="display: flex; flex-direction: column; gap: 16px;">
        <!-- 自定义步骤条 -->
        <div class="ops-stepper">
          <!-- 步骤 1: 创建任务 -->
          <div class="stepper-item is-success">
            <div class="stepper-icon">
              <i class="fa fa-check"></i>
            </div>
            <div class="stepper-title">创建任务</div>
          </div>
          <div class="stepper-line is-active"></div>

          <!-- 步骤 2: 前置预检查 -->
          <div
            class="stepper-item"
            :class="{
              'is-active': stepStates[1] === 'active',
              'is-success': stepStates[1] === 'success',
              'is-failed': stepStates[1] === 'failed'
            }"
          >
            <div class="stepper-icon">
              <i v-if="stepStates[1] === 'failed'" class="fa fa-times"></i>
              <i v-else-if="stepStates[1] === 'success'" class="fa fa-check"></i>
              <i v-else-if="stepStates[1] === 'active'" class="fa fa-spinner fa-spin"></i>
              <span v-else>2</span>
            </div>
            <div class="stepper-title">前置预检查</div>
          </div>
          <div
            class="stepper-line"
            :class="{ 'is-active': ['success', 'active', 'failed'].includes(stepStates[2]) }"
          ></div>

          <!-- 步骤 3: 分批安装 -->
          <div
            class="stepper-item"
            :class="{
              'is-active': stepStates[2] === 'active',
              'is-success': stepStates[2] === 'success',
              'is-failed': stepStates[2] === 'failed'
            }"
          >
            <div class="stepper-icon">
              <i v-if="stepStates[2] === 'failed'" class="fa fa-times"></i>
              <i v-else-if="stepStates[2] === 'success'" class="fa fa-check"></i>
              <i v-else-if="stepStates[2] === 'active'" class="fa fa-spinner fa-spin"></i>
              <span v-else>3</span>
            </div>
            <div class="stepper-title">分批安装</div>
          </div>
        </div>

        <!-- 任务概览信息 -->
        <div style="background: var(--el-fill-color-light); border-radius: 8px; padding: 16px; font-size: 13px; border: 1px solid var(--el-border-color-lighter); display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px 24px;">
          <div>
            <strong style="color: var(--el-text-color-secondary);">安装内容：</strong>
            <span style="color: var(--el-text-color-primary); font-weight: 500;">
              {{ taskPackageSetName }}
            </span>
          </div>
          <div>
            <strong style="color: var(--el-text-color-secondary);">分批大小：</strong>
            <span style="color: var(--el-text-color-primary); font-weight: 500;">
              {{ taskDetail.batchSize || 50 }} 台/批
            </span>
          </div>
          <div>
            <strong style="color: var(--el-text-color-secondary);">目标资产数：</strong>
            <span style="color: var(--el-text-color-primary); font-weight: 500;">
              {{ taskTargetCount }} 台
            </span>
          </div>
          <div>
            <strong style="color: var(--el-text-color-secondary);">任务状态：</strong>
            <div style="display: inline-flex; align-items: center; gap: 8px;">
              <el-tag :type="getStatusTagType(taskDetail.status)" size="small" effect="light" round>
                {{ getStatusLabel(taskDetail.status) }}
              </el-tag>
              <el-button
                v-if="taskDetail.executeRunId"
                type="primary"
                link
                size="small"
                @click="openExecuteResult(taskDetail.executeRunId, '一键安装作业详情')"
              >
                查看作业详情
              </el-button>
            </div>
          </div>

          <div style="grid-column: span 2;" v-if="formattedErrorMessage">
            <strong style="color: var(--el-color-danger);">异常原因：</strong>
            <span style="color: var(--el-color-danger);">{{ formattedErrorMessage }}</span>
          </div>
        </div>

        <!-- 预检查中 Loading 展示 -->
        <div v-if="taskDetail.status === 'PRE_CHECKING'" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; border: 1px dashed var(--el-border-color); border-radius: 8px; background: var(--el-fill-color-blank); gap: 16px;">
          <el-icon class="is-loading" style="font-size: 32px; color: var(--el-color-primary);">
            <Loading />
          </el-icon>
          <div style="font-size: 14px; font-weight: 500; color: var(--el-text-color-regular);">
            正在对目标资产进行前置环境预检查，请稍候...
          </div>
          <div style="font-size: 12px; color: var(--el-text-color-placeholder);">
            这可能需要几十秒时间，检查内容包括：SSH 连接性、操作系统版本、依赖冲突等。
          </div>
        </div>

        <!-- 安装中 Loading 展示 -->
        <div v-if="taskDetail.status === 'INSTALLING'" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; border: 1px dashed var(--el-border-color); border-radius: 8px; background: var(--el-fill-color-blank); gap: 16px;">
          <el-icon class="is-loading" style="font-size: 32px; color: var(--el-color-primary);">
            <Loading />
          </el-icon>
          <div style="font-size: 14px; font-weight: 500; color: var(--el-text-color-regular);">
            正在分批执行更新安装中，请稍候...
          </div>
          <div style="font-size: 12px; color: var(--el-text-color-placeholder);">
            正在按照分批大小分批部署中。建议在此期间不要关闭或退出本页面。
          </div>
        </div>

        <!-- 预检查失败结果展示 -->
        <div v-if="taskDetail.status === 'PRE_CHECK_FAILED' && parsedPreCheckResult" style="border: 1px solid var(--el-border-color-light); border-radius: 6px; padding: 16px;">
          <h4 class="m-0 mb-3" style="font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; color: var(--el-color-danger);">
            <i class="fa fa-exclamation-triangle" />
            前置环境检查未通过项
          </h4>

          <!-- 不可达主机列表 -->
          <div v-if="parsedPreCheckResult.unreachable && parsedPreCheckResult.unreachable.length > 0" class="mb-3">
            <div style="font-weight: 600; color: var(--el-color-danger); margin-bottom: 6px;">
              不可达主机 ({{ parsedPreCheckResult.unreachable.length }} 台)：
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              <el-tag
                v-for="hostId in parsedPreCheckResult.unreachable"
                :key="hostId"
                type="danger"
                size="small"
              >
                {{ getHostDisplayName(hostId) }}
              </el-tag>
            </div>
          </div>

          <!-- 主机检查项详情列表 -->
          <div v-if="parsedPreCheckResult.results && parsedPreCheckResult.results.length > 0">
            <el-collapse v-model="activeCollapseNames">
              <el-collapse-item
                v-for="hostResult in parsedPreCheckResult.results"
                :key="hostResult.host_id"
                :name="hostResult.host_id"
              >
                <template #title>
                  <div style="display: flex; justify-content: space-between; align-items: center; width: 95%;">
                    <span style="font-weight: 600;">
                      <i class="fa fa-server me-1" />
                      {{ getHostDisplayName(hostResult.host_id) }}
                    </span>
                    <div>
                      <el-tag v-if="hostResult.blockers > 0" type="danger" size="small" class="me-1">
                        阻断项: {{ hostResult.blockers }}
                      </el-tag>
                      <el-tag v-if="hostResult.warnings > 0" type="warning" size="small" class="me-1">
                        警告项: {{ hostResult.warnings }}
                      </el-tag>
                      <el-tag v-if="hostResult.blockers === 0 && hostResult.warnings === 0" type="success" size="small">
                        检查通过
                      </el-tag>
                    </div>
                  </div>
                </template>

                <div style="padding: 0 8px;">
                  <div
                    v-for="check in sortChecks(hostResult.checks)"
                    :key="check.id"
                    style="display: flex; align-items: flex-start; padding: 8px 0; border-bottom: 1px solid var(--el-border-color-lighter);"
                  >
                    <i
                      class="fa me-2"
                      :class="{
                        'fa-times-circle': check.status === 'fail',
                        'fa-exclamation-circle': check.status === 'warn',
                        'fa-check-circle': check.status === 'ok'
                      }"
                      :style="{
                        color: check.status === 'fail' ? 'var(--el-color-danger)' : check.status === 'warn' ? 'var(--el-color-warning)' : 'var(--el-color-success)',
                        fontSize: '14px',
                        marginTop: '2px'
                      }"
                    />
                    <div style="flex: 1;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 600; font-size: 13px;">
                          {{ getCheckTitle(check.id) }}
                        </span>
                        <el-tag
                          :type="check.status === 'fail' ? 'danger' : check.status === 'warn' ? 'warning' : 'success'"
                          size="small"
                          style="font-size: 10px; height: 16px; line-height: 14px; padding: 0 4px;"
                        >
                          {{ check.status === 'fail' ? '阻断' : check.status === 'warn' ? '警告' : '通过' }}
                        </el-tag>
                      </div>
                      <div style="font-size: 12px; color: var(--el-text-color-regular); margin-top: 2px;">
                        {{ check.detail }}
                      </div>
                    </div>
                  </div>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>
        </div>

        <!-- 任务结束成功提示 -->
        <el-alert
          v-if="taskDetail.status === 'INSTALL_DONE'"
          title="分批自动安装任务已全部成功完成！"
          type="success"
          :closable="false"
          show-icon
        >
          已成功将最新软件包版本更新并应用到所有目标机上（默认配置为不重启）。
        </el-alert>

        <!-- 任务结束部分失败提示 -->
        <el-alert
          v-if="taskDetail.status === 'INSTALL_FAILED' || taskDetail.status === 'FAILED'"
          title="分批自动安装任务未能完全执行成功"
          type="error"
          :closable="false"
          show-icon
        >
          部分主机的软件包更新可能失败，详情请查看后端日志或错误提示。
        </el-alert>
      </div>

      <!-- 对话框操作区 -->
      <template v-if="taskDetail && taskDetail.status === 'PRE_CHECK_FAILED'" #footer>
        <div class="dialog-footer" style="display: flex; gap: 10px; justify-content: flex-end;">
          <el-button
            type="warning"
            size="small"
            :loading="stepActionLoading"
            @click="handleSkipPreCheck"
          >
            我已知晓风险，跳过并执行安装
          </el-button>
          <el-button
            type="primary"
            size="small"
            :loading="stepActionLoading"
            @click="handleRetryPreCheck"
          >
            重新预检查
          </el-button>
        </div>
      </template>
    </el-dialog>

    <ExecuteResultDialog
      v-model:visible="executeResultVisible"
      :run-id="currentExecuteRunId"
      :job-title="currentExecuteJobTitle"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Loading } from '@element-plus/icons-vue'
import { packageSetApi, patchInstallApi } from '../api'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { normalizeAcmDeviceSelection } from '@/modules/automation/components/job/schedule/components/acmDeviceSelector.utils'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'

const activeTab = ref('install')

// ============================================================
// 包集数据及列表管理
// ============================================================
const loadingSets = ref(false)
const packageSets = ref([])

async function loadPackageSets() {
  loadingSets.value = true
  try {
    const response = await packageSetApi.list({ osType: 'linux' })
    packageSets.value = response || []
  } catch (error) {
    console.error('Failed to load package sets:', error)
    ElMessage.error('获取软件包集列表失败')
  } finally {
    loadingSets.value = false
  }
}

function countPackages(packagesStr) {
  if (!packagesStr) return 0
  try {
    const arr = JSON.parse(packagesStr)
    return Array.isArray(arr) ? arr.length : 0
  } catch {
    return 0
  }
}

function formatDateTime(timeStr) {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// ============================================================
// 包集新建/编辑 CRUD
// ============================================================
const editDialogVisible = ref(false)
const savingSet = ref(false)
const editFormRef = ref(null)

const editForm = reactive({
  id: null,
  name: '',
  osType: 'linux',
  source: 'custom',
  description: '',
  packagesText: ''
})

const editRules = {
  name: [{ required: true, message: '请输入包集名称', trigger: 'blur' }],
  osType: [{ required: true, message: '请选择适用系统', trigger: 'change' }],
  packagesText: [{ required: true, message: '请输入软件包列表', trigger: 'blur' }]
}

function handleCreatePackageSet() {
  editForm.id = null
  editForm.name = ''
  editForm.osType = 'linux'
  editForm.source = 'custom'
  editForm.description = ''
  editForm.packagesText = ''
  editDialogVisible.value = true
  nextTick(() => {
    if (editFormRef.value) {
      editFormRef.value.clearValidate()
    }
  })
}

function handleEditPackageSet(row) {
  editForm.id = row.id
  editForm.name = row.name
  editForm.osType = row.osType
  editForm.source = row.source || 'custom'
  editForm.description = row.description || ''

  let pkgs = []
  try {
    pkgs = JSON.parse(row.packages || '[]')
  } catch {
    pkgs = []
  }
  editForm.packagesText = pkgs.join('\n')
  editDialogVisible.value = true
  nextTick(() => {
    if (editFormRef.value) {
      editFormRef.value.clearValidate()
    }
  })
}

async function handleDeletePackageSet(row) {
  try {
    await ElMessageBox.confirm(`确定删除软件包集 "${row.name}" 吗？`, '删除确认', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await packageSetApi.delete(row.id)
    ElMessage.success('软件包集删除成功')
    loadPackageSets()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete package set:', error)
      ElMessage.error('删除软件包集失败')
    }
  }
}

async function submitEditForm() {
  if (!editFormRef.value) return
  await editFormRef.value.validate(async (valid) => {
    if (!valid) return

    savingSet.value = true
    try {
      const packageList = editForm.packagesText
        .split(/[,\s，\n\r]+/)
        .map(p => p.trim())
        .filter(Boolean)

      if (packageList.length === 0) {
        ElMessage.warning('软件包列表不能为空')
        savingSet.value = false
        return
      }

      const payload = {
        id: editForm.id,
        name: editForm.name,
        osType: editForm.osType,
        source: editForm.source,
        description: editForm.description,
        packages: JSON.stringify(packageList)
      }

      await packageSetApi.save(payload)
      ElMessage.success('保存软件包集成功')
      editDialogVisible.value = false
      loadPackageSets()
    } catch (error) {
      console.error('Failed to save package set:', error)
      ElMessage.error('保存软件包集失败')
    } finally {
      savingSet.value = false
    }
  })
}

// ============================================================
// 一键分批安装表单
// ============================================================
const selectedHosts = ref([])
const installForm = reactive({
  useCustomPackages: false,
  packageSetId: '',
  customPackagesText: '',
  batchSize: 50
})

const selectedPackageSet = computed(() => {
  if (installForm.useCustomPackages || !installForm.packageSetId) return null
  return packageSets.value.find(s => s.id === installForm.packageSetId) || null
})

const parsedSelectedPackages = computed(() => {
  if (!selectedPackageSet.value) return []
  try {
    return JSON.parse(selectedPackageSet.value.packages || '[]')
  } catch {
    return []
  }
})

const isSubmitDisabled = computed(() => {
  if (selectedHosts.value.length === 0) return true
  if (installForm.useCustomPackages) {
    return !installForm.customPackagesText.trim()
  } else {
    return !installForm.packageSetId
  }
})

function handlePackageSetChange() {
  // 仅在改变包集时可用作展示
}

// ============================================================
// 一键分批更新执行与轮询
// ============================================================
const progressVisible = ref(false)
const taskDetail = ref(null)
const stepActionLoading = ref(false)
let pollingIntervalId = null

const taskFinished = computed(() => {
  if (!taskDetail.value) return false
  const finishedStatuses = ['INSTALL_DONE', 'INSTALL_FAILED', 'FAILED']
  return finishedStatuses.includes(taskDetail.value.status)
})

const stepStates = computed(() => {
  const states = ['success', 'idle', 'idle']
  if (!taskDetail.value) return states
  const status = taskDetail.value.status

  if (status === 'PRE_CHECKING') {
    states[1] = 'active'
  } else if (status === 'PRE_CHECK_FAILED') {
    states[1] = 'failed'
  } else if (['PRE_CHECK_DONE', 'INSTALLING', 'INSTALL_DONE', 'INSTALL_FAILED', 'FAILED'].includes(status)) {
    states[1] = 'success'
  }

  if (status === 'INSTALLING') {
    states[2] = 'active'
  } else if (['INSTALL_FAILED', 'FAILED'].includes(status)) {
    states[2] = 'failed'
  } else if (status === 'INSTALL_DONE') {
    states[2] = 'success'
  }
  return states
})

const taskPackageSetName = computed(() => {
  if (!taskDetail.value) return ''
  if (!taskDetail.value.packageSetId) {
    return '自定义输入软件包'
  }
  const found = packageSets.value.find(s => s.id === taskDetail.value.packageSetId)
  return found ? found.name : `软件包集 (${taskDetail.value.packageSetId})`
})

const taskTargetCount = computed(() => {
  if (!taskDetail.value) return 0
  if (Array.isArray(taskDetail.value.targets)) {
    return taskDetail.value.targets.length
  }
  return selectedHosts.value.length
})

function getStatusLabel(status) {
  const map = {
    'PRE_CHECKING': '前置环境检查中',
    'PRE_CHECK_FAILED': '环境检查阻断',
    'PRE_CHECK_DONE': '准备分批安装',
    'INSTALLING': '分批安装中',
    'INSTALL_DONE': '安装任务完成',
    'INSTALL_FAILED': '安装部分失败',
    'FAILED': '任务执行失败'
  }
  return map[status] || status
}

// 执行详情弹窗
const executeResultVisible = ref(false)
const currentExecuteRunId = ref('')
const currentExecuteJobTitle = ref('')

function openExecuteResult(runId, jobTitle = '一键安装作业详情') {
  currentExecuteRunId.value = runId
  currentExecuteJobTitle.value = jobTitle
  executeResultVisible.value = true
}

// 计算三个步骤的进度激活位置
const currentStepActiveIndex = computed(() => {
  if (!taskDetail.value) return 0
  const status = taskDetail.value.status
  if (status === 'PRE_CHECKING') return 1
  if (status === 'PRE_CHECK_FAILED') return 1
  if (status === 'PRE_CHECK_DONE' || status === 'INSTALLING') return 2
  if (status === 'INSTALL_DONE' || status === 'INSTALL_FAILED' || status === 'FAILED') return 3
  return 0
})

const preCheckStepStatus = computed(() => {
  if (!taskDetail.value) return 'wait'
  const status = taskDetail.value.status
  if (status === 'PRE_CHECKING') return 'process'
  if (status === 'PRE_CHECK_FAILED') return 'error'

  const okStatuses = ['PRE_CHECK_DONE', 'INSTALLING', 'INSTALL_DONE', 'INSTALL_FAILED', 'FAILED']
  if (okStatuses.includes(status)) return 'success'
  return 'wait'
})

const preCheckStepDesc = computed(() => {
  if (!taskDetail.value) return ''
  const status = taskDetail.value.status
  if (status === 'PRE_CHECKING') return '检查环境中...'
  if (status === 'PRE_CHECK_FAILED') return '环境预检查阻断'

  const okStatuses = ['PRE_CHECK_DONE', 'INSTALLING', 'INSTALL_DONE', 'INSTALL_FAILED', 'FAILED']
  if (okStatuses.includes(status)) return '预检查已通过'
  return ''
})

const installStepStatus = computed(() => {
  if (!taskDetail.value) return 'wait'
  const status = taskDetail.value.status
  if (status === 'INSTALLING') return 'process'
  if (status === 'INSTALL_DONE') return 'success'
  if (status === 'INSTALL_FAILED' || status === 'FAILED') return 'error'
  return 'wait'
})

const installStepDesc = computed(() => {
  if (!taskDetail.value) return ''
  const status = taskDetail.value.status
  if (status === 'INSTALLING') return '分批推送安装中...'
  if (status === 'INSTALL_DONE') return '安装成功'
  if (status === 'INSTALL_FAILED' || status === 'FAILED') return '部分推送失败'
  return ''
})

const parsedPreCheckResult = computed(() => {
  if (!taskDetail.value?.preCheckResult) return null
  try {
    return typeof taskDetail.value.preCheckResult === 'string'
      ? JSON.parse(taskDetail.value.preCheckResult)
      : taskDetail.value.preCheckResult
  } catch (error) {
    console.error('Failed to parse preCheckResult:', error)
    return null
  }
})

const activeCollapseNames = ref([])

const hostIdToIpMap = computed(() => {
  const map = {}
  try {
    const normalized = normalizeAcmDeviceSelection(selectedHosts.value, 'linux')
    normalized.forEach(h => {
      if (h.key && h.value) {
        map[h.key] = h.value
      }
    })
  } catch (err) {
    console.error('Failed to map host_id to ip:', err)
  }
  return map
})

function getHostDisplayName(hostId) {
  return hostIdToIpMap.value[hostId] || hostId
}

const formattedErrorMessage = computed(() => {
  let msg = taskDetail.value?.errorMessage || ''
  if (!msg) return ''

  const map = hostIdToIpMap.value
  Object.keys(map).forEach(hostId => {
    msg = msg.split(hostId).join(map[hostId])
  })
  return msg
})

// 自动将环境检查失败的所有主机默认展开
watch(parsedPreCheckResult, (newVal) => {
  if (newVal && Array.isArray(newVal.results)) {
    activeCollapseNames.value = newVal.results.map(r => r.host_id)
  } else {
    activeCollapseNames.value = []
  }
}, { immediate: true })

// 排序检查项
function sortChecks(checks) {
  if (!Array.isArray(checks)) return []
  const severityMap = { fail: 0, warn: 1, ok: 2 }
  return [...checks].sort((a, b) => {
    const aVal = severityMap[a.status] ?? 3
    const bVal = severityMap[b.status] ?? 3
    return aVal - bVal
  })
}

// 映射预检查项的中文标题
const checkTitles = {
  conn: '连通性',
  sudo: '提权权限',
  os: '操作系统识别',
  pkg_manager: '包管理器',
  pkg_lock: '包管理器占用',
  pkg_db: '包数据库健康',
  disk: '磁盘空间',
  disk_boot: '/boot 空间',
  kernel_pending: '待重启内核',
  repo: '软件仓库',
  pkg_exists: '目标包存在性',
  version_ok: '目标版本可用性',
  depsolve: '依赖解析',
  already_satisfied: '已是目标版本',
  exec: '检查执行异常'
}

function getCheckTitle(id) {
  return checkTitles[id] || id
}

function getStatusTagType(status) {
  if (!status) return 'info'
  if (status.includes('DONE') || status.includes('SUCCESS')) return 'success'
  if (status.includes('FAILED') || status.includes('ERROR')) return 'danger'
  if (status.includes('ING')) return 'primary'
  return 'info'
}

async function handleStartOneClickInstall() {
  if (selectedHosts.value.length === 0) {
    ElMessage.warning('请选择目标主机')
    return
  }

  // 构建一键安装请求参数
  const targets = normalizeAcmDeviceSelection(selectedHosts.value, 'linux')
  const payload = {
    targets,
    batchSize: installForm.batchSize || 50
  }

  if (installForm.useCustomPackages) {
    const pkgs = installForm.customPackagesText
      .split(/[,\s，\n\r]+/)
      .map(p => p.trim())
      .filter(Boolean)
    if (pkgs.length === 0) {
      ElMessage.warning('请输入软件包名称')
      return
    }
    payload.packages = pkgs
  } else {
    if (!installForm.packageSetId) {
      ElMessage.warning('请选择软件包集')
      return
    }
    payload.packageSetId = installForm.packageSetId
  }

  try {
    await ElMessageBox.confirm(
      `确定对已选中的 ${targets.length} 项目标资产执行软件包一键分批更新吗？（该任务将进行自动预检查、分批安装且默认不重启）`,
      '确认一键分批安装',
      {
        confirmButtonText: '确定开始',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    const response = await patchInstallApi.createAndRunTask(payload)
    if (response?.data) {
      taskDetail.value = response.data
      progressVisible.value = true
      startPollingTask()
    } else {
      ElMessage.error('创建一键安装任务失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to create and run task:', error)
      ElMessage.error(error?.response?.data?.error || error?.message || '创建任务失败，请检查参数')
    }
  }
}

// 轮询任务状态
function startPollingTask() {
  stopPollingTask()

  pollingIntervalId = setInterval(async () => {
    if (!taskDetail.value?.id) return
    try {
      const response = await patchInstallApi.getTask(taskDetail.value.id)
      if (response?.data) {
        taskDetail.value = response.data
        if (taskFinished.value) {
          stopPollingTask()
        }
      }
    } catch (error) {
      console.error('Failed to poll task detail:', error)
    }
  }, 2500)
}

// 停止轮询
function stopPollingTask() {
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId)
    pollingIntervalId = null
  }
}

// 重新预检查
async function handleRetryPreCheck() {
  if (!taskDetail.value?.id) return
  stepActionLoading.value = true
  try {
    const response = await patchInstallApi.executePreCheck(taskDetail.value.id)
    if (response?.data) {
      taskDetail.value = response.data
      ElMessage.success('已重新发起环境预检查')
      startPollingTask()
    }
  } catch (error) {
    console.error('Failed to retry precheck:', error)
    ElMessage.error('重新发起预检查失败')
  } finally {
    stepActionLoading.value = false
  }
}

// 跳过检查并执行安装
async function handleSkipPreCheck() {
  if (!taskDetail.value?.id) return
  try {
    await ElMessageBox.confirm(
      '前置环境检查有未通过阻断项，跳过强行安装可能导致部署失败，是否确定跳过并执行安装？',
      '强制安装确认',
      {
        confirmButtonText: '确定跳过并安装',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    stepActionLoading.value = true
    // 1. 跳过预检查门禁
    const skipRes = await patchInstallApi.skipPreCheck(taskDetail.value.id)
    if (skipRes?.data) {
      taskDetail.value = skipRes.data
      // 2. 触发推送安装
      const installRes = await patchInstallApi.executeInstallTask(taskDetail.value.id)
      if (installRes?.data) {
        taskDetail.value = installRes.data
        ElMessage.success('已跳过环境检查，开始推送安装')
        startPollingTask()
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to skip precheck and install:', error)
      ElMessage.error('跳过预检查/启动安装失败')
    }
  } finally {
    stepActionLoading.value = false
  }
}

function handleProgressClosed() {
  stopPollingTask()
  taskDetail.value = null
  selectedHosts.value = []
  if (!installForm.useCustomPackages) {
    installForm.packageSetId = ''
  } else {
    installForm.customPackagesText = ''
  }
}

// ============================================================
// 生命周期钩子
// ============================================================
onMounted(() => {
  loadPackageSets()
})

onUnmounted(() => {
  stopPollingTask()
})
</script>

<style scoped lang="scss">
@use '../components/patch-task/wizard/PatchTaskWizard.scss' as *;
/* 遵循 UI 规范，不在 scoped 样式里包含任何 .el- 或 .ops- 前缀覆盖类 */
.m-0 {
  margin: 0;
}
.mb-1 {
  margin-bottom: 4px;
}
.mb-2 {
  margin-bottom: 8px;
}
.mb-3 {
  margin-bottom: 12px;
}
.mt-1 {
  margin-top: 4px;
}
.mt-2 {
  margin-top: 8px;
}
.mt-3 {
  margin-top: 12px;
}
.me-1 {
  margin-right: 4px;
}
.me-2 {
  margin-right: 8px;
}
.pt-3 {
  padding-top: 12px;
}
</style>
