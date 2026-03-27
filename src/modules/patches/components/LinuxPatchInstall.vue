<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item label="严重程度">
          <el-select v-model="filters.severity" multiple placeholder="请选择" style="width: auto">
            <el-option label="严重" value="Critical" />
            <el-option label="重要" value="Important" />
            <el-option label="中等" value="Moderate" />
            <el-option label="低危" value="Low" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索补丁编号、概要、CVE..."
            style="width: 240px"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 操作区 -->
    <div class="ops-action-bar">
      <el-button
        type="primary"
        size="small"
        :disabled="selectedPatchIds.length === 0"
        @click="handleInstallSelected"
      >
        安装选中的补丁
      </el-button>
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        @click="loadData"
        title="刷新"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="paginatedData"
        max-height="calc(100vh - 230px)"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="patch_id" label="补丁编号" min-width="160" sortable>
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="handleViewPatchDetail(row)">
              {{ row.patch_id }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="概要" min-width="220" show-overflow-tooltip />
        <el-table-column prop="severity" label="严重性" width="100" sortable>
          <template #default="{ row }">
            <el-tag
              effect="dark"
              class="severity-tag"
              :class="'is-' + (row.severity || '').toLowerCase()"
            >
              {{ getSeverityLabel(row.severity) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="publish_date" label="发布时间" width="120" sortable>
          <template #default="{ row }">
            {{ formatDate(row.publish_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="related_vuls" label="关联CVE" min-width="320">
          <template #default="{ row }">
            <div class="cve-tags" v-if="row.related_vuls">
              <a
                v-for="(cve, idx) in parseCVEs(row.related_vuls).slice(0, 3)"
                :key="idx"
                :href="getCveUrl(cve, resolvePatchDistro(row))"
                target="_blank"
                class="cve-link"
                @click.stop
              >
                {{ cve }}
              </a>
              <button
                v-if="parseCVEs(row.related_vuls).length > 3"
                type="button"
                class="cve-more"
                @click="handleShowAllCves(row)"
              >
                +{{ parseCVEs(row.related_vuls).length - 3 }}
              </button>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="effect_host_count" label="受影响的软件包" width="130" align="left">
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="handleViewAffectedHosts(row)">
              {{ row.effect_host_count }}
            </el-link>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页区域 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="totalCount"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 补丁详情对话框 -->
    <el-dialog
      v-model="patchDetailVisible"
      title="补丁详情"
      width="800px"
      :close-on-click-modal="false"
      class="patch-detail-dialog"
    >
      <div class="patch-detail" v-if="patchDetail" v-loading="patchDetailLoading">
        <h3 class="patch-detail__id">{{ patchDetail.patch_id }}</h3>
        <div class="patch-detail__item">
          <span class="patch-detail__label">概要：</span>
          <span class="patch-detail__value">{{ patchDetail.title }}</span>
        </div>
        <div class="patch-detail__item">
          <span class="patch-detail__label">严重性：</span>
          <span class="patch-detail__value">
            <el-tag
              effect="dark"
              class="severity-tag"
              :class="'is-' + (patchDetail.severity || '').toLowerCase()"
            >
              {{ getSeverityLabel(patchDetail.severity) }}
            </el-tag>
          </span>
        </div>
        <div class="patch-detail__item">
          <span class="patch-detail__label">描述</span>
        </div>
        <div class="patch-detail__desc">
          {{ patchDetail.description }}
        </div>
        <div class="patch-detail__item">
          <span class="patch-detail__label">关联CVE</span>
        </div>
        <ul class="patch-detail__cve-list">
          <li v-for="cve in parseCveList(patchDetail.related_vuls)" :key="cve">
            <a
              :href="getCveUrl(cve, resolvePatchDistro(patchDetail))"
              target="_blank"
              class="cve-link"
            >
              {{ cve }}
            </a>
          </li>
        </ul>
      </div>
      <div v-else-if="patchDetailLoading" class="patch-detail-loading">
        <el-skeleton :rows="6" animated />
      </div>
    </el-dialog>

    <!-- 补丁安装向导对话框 -->
    <el-dialog
      v-model="installDialogVisible"
      title="补丁安装向导"
      width="1000px"
      :close-on-click-modal="false"
      class="install-dialog"
      top="5vh"
      @closed="resetInstallState"
    >
      <!-- 自定义步骤条 -->
      <div class="ops-stepper">
        <div class="stepper-item" :class="{ 'is-active': installStep === 0, 'is-success': installStep > 0 }">
          <div class="stepper-icon">
            <i v-if="installStep > 0" class="fa fa-check"></i>
            <span v-else>1</span>
          </div>
          <div class="stepper-title">选择目标主机</div>
        </div>
        <div class="stepper-line" :class="{ 'is-active': installStep > 0 }"></div>

        <div class="stepper-item" :class="{ 'is-active': installStep === 1, 'is-success': installStep > 1 }">
          <div class="stepper-icon">
            <i v-if="installStep > 1" class="fa fa-check"></i>
            <span v-else>2</span>
          </div>
          <div class="stepper-title">配置升级项</div>
        </div>
        <div class="stepper-line" :class="{ 'is-active': installStep > 1 }"></div>

        <div class="stepper-item" :class="{ 'is-active': installStep === 2 }">
          <div class="stepper-icon">
            <span>3</span>
          </div>
          <div class="stepper-title">任务确认</div>
        </div>
      </div>

      <!-- Step 1: Select Hosts -->
      <div v-show="installStep === 0" class="install-content" v-loading="installDataLoading">
        <!-- 更新补丁 -->
        <div class="install-card">
          <div class="card-header">
            <i class="fa fa-lock" />
            更新补丁
          </div>
          <div class="card-body">
            {{ patchesToInstall.map(p => p.patch_id).join(', ') }}
          </div>
        </div>

        <!-- 待更新软件包 -->
        <div class="install-card">
          <div class="card-header">
            <i class="fa fa-cube" />
            待更新软件包
          </div>
          <div class="card-body card-body--scroll">
            <div v-for="pkg in affectedPackages" :key="pkg" class="package-item">
              {{ pkg }}
            </div>
            <div v-if="affectedPackages.length === 0" class="no-data">暂无数据</div>
          </div>
        </div>

        <!-- 更新主机 -->
        <div class="install-card install-card--table">
          <div class="card-header">
            <i class="fa fa-list" />
            更新主机
          </div>
          <div class="card-body">
            <!-- 工具栏：设备选择 + 搜索 -->
            <div class="host-toolbar">
              <el-select v-model="hostFilter" size="small" style="width: 140px">
                <el-option label="@@(linux)" value="@@(linux)">
                  <i class="fa fa-server" />
                  @@(linux)
                </el-option>
              </el-select>
              <el-input
                v-model="hostSearchText"
                placeholder="搜索"
                prefix-icon="Search"
                size="small"
                style="width: 200px"
                clearable
              />
            </div>
            <!-- 主机表格 -->
            <el-table
              ref="hostTableRef"
              :data="filteredHosts"
              size="small"
              height="220"
              @selection-change="handleHostSelectionChange"
            >
              <el-table-column type="selection" width="40" />
              <el-table-column prop="hostKey" label="主机" min-width="200" sortable>
                <template #default="{ row }">
                  <span class="host-link">{{ row.hostKey }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="os_distro" label="OS" width="100" sortable />
              <el-table-column prop="os_version" label="OS版本" width="100" sortable />
              <el-table-column prop="scan_timestamp" label="上次扫描时间" width="180" sortable>
                <template #default="{ row }">
                  {{ formatDateTime(row.scan_timestamp) }}
                </template>
              </el-table-column>
            </el-table>
            <!-- 分页 -->
            <div class="host-pagination">
              <el-pagination
                v-model:current-page="hostPagination.page"
                v-model:page-size="hostPagination.pageSize"
                :page-sizes="[10, 20, 50]"
                :total="hostPagination.total"
                layout="total, sizes, prev, pager, next, jumper"
                size="small"
                background
                @size-change="handleHostSizeChange"
                @current-change="handleHostPageChange"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2: Configuration Options -->
      <div v-show="installStep === 1" class="install-config-content">
        <el-form :model="installConfig" label-width="120px" label-position="left" class="config-form">
          <el-form-item label="预执行脚本">
            <div style="width: 100%">
              <el-input
                type="textarea"
                v-model="installConfig.preScript"
                :autosize="{ minRows: 2, maxRows: 10 }"
                placeholder="#!/bin/bash&#10;# 在此输入升级前需要执行的命令或脚本"
                class="script-input"
              />
            </div>
          </el-form-item>

          <el-form-item label="重启策略">
            <div style="width: 100%">
              <el-alert
                :title="'系统重启建议：' + (backendRestartReason || smartRestartGuess)"
                type="info"
                show-icon
                :closable="false"
                style="margin-bottom: 12px; line-height: 1.4"
              >
              </el-alert>
              <el-radio-group v-model="installConfig.restartPolicy" class="restart-radio-group">
                <el-radio label="smart">智能识别</el-radio>
                <el-radio label="system">系统重启</el-radio>
                <el-radio label="service">服务重启</el-radio>
                <el-radio label="none">不重启</el-radio>
              </el-radio-group>
            </div>
          </el-form-item>

          <el-form-item label="校验脚本">
            <div style="width: 100%">
              <el-input
                type="textarea"
                v-model="installConfig.postScript"
                :autosize="{ minRows: 2, maxRows: 10 }"
                placeholder="#!/bin/bash&#10;# 在此输入系统升级完成后的校验脚本"
                class="script-input"
              />
            </div>
          </el-form-item>
        </el-form>
      </div>

      <!-- Step 3: Confirmation -->
      <div v-show="installStep === 2" class="install-confirm-content">
        <el-descriptions title="任务执行概要" :column="1" border size="small" class="confirm-descriptions">
          <el-descriptions-item label="待安装补丁">
            {{ patchesToInstall.map(p => p.patch_id).join(', ') }}
          </el-descriptions-item>
          <el-descriptions-item label="目标主机">
            共选择 {{ selectedHosts.length }} 台主机
          </el-descriptions-item>
          <el-descriptions-item label="预执行脚本">
            <span :class="{'text-muted': !installConfig.preScript}">
              {{ installConfig.preScript ? '已配置' : '-' }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="重启策略">
            <el-tag size="small" :type="getRestartPolicyTagType(installConfig.restartPolicy)">
              {{ getRestartPolicyLabel(installConfig.restartPolicy) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="策略依据">
            <span v-if="installConfig.restartPolicy === 'smart'" style="font-size: 13px; color: var(--el-text-color-secondary)">
              (系统建议依据: {{ backendRestartReason || smartRestartGuess }})
            </span>
            <span v-else style="font-size: 13px; color: var(--el-text-color-secondary)">-</span>
          </el-descriptions-item>
          <el-descriptions-item label="校验脚本">
            <span :class="{'text-muted': !installConfig.postScript}">
              {{ installConfig.postScript ? '已配置' : '-' }}
            </span>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button v-if="installStep === 0" @click="installDialogVisible = false">取消</el-button>

          <el-button v-if="installStep > 0" @click="installStep--">
            <i class="fa fa-chevron-left" style="margin-right: 4px" /> 上一步
          </el-button>

          <el-button v-if="installStep < 2" type="primary" :disabled="installStep === 0 && selectedHosts.length === 0" @click="handleNextStep">
            下一步 <i class="fa fa-chevron-right" style="margin-left: 4px" />
          </el-button>

          <el-button
            v-if="installStep === 2"
            type="primary"
            :loading="installLoading"
            @click="executeInstall"
          >
            <i class="fa fa-check" style="margin-right: 4px" />
            确认并执行
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 关联CVE 列表对话框 -->
    <el-dialog v-model="cveDialogVisible" title="关联CVE" width="520px" destroy-on-close>
      <div class="cve-dialog">
        <template v-if="cveDialogList.length">
          <a
            v-for="(cve, idx) in cveDialogList"
            :key="idx"
            :href="getCveUrl(cve, cveDialogOsDistro)"
            target="_blank"
            class="cve-dialog-item"
          >
            {{ cve }}
          </a>
        </template>
        <span v-else>-</span>
      </div>
      <template #footer>
        <el-button @click="cveDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 任务执行五步轮询调度弹窗 -->
    <TaskExecutionProgress
      ref="taskProgressRef"
      :task-id="createdTaskId"
      :restart-policy="installConfig.restartPolicy"
      @done="handleTaskWorkflowDone"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, RefreshRight, Upload } from '@element-plus/icons-vue'
import { patchInstallApi } from '../api'
import { getCveUrl } from '../composables/useFormatters'
import TaskExecutionProgress from './patch-task/TaskExecutionProgress.vue'

// 加载状态
const loading = ref(false)
const installLoading = ref(false)

// 统一筛选条件
const filters = reactive({
  severity: ['Critical', 'Important', 'Moderate', 'Low'], // 默认勾选严重和重要
  keyword: ''
})

// 表格数据
const tableRef = ref(null)
const allData = ref([]) // 存储所有数据
const selectedRows = ref([])

// 选中的补丁ID列表
const selectedPatchIds = computed(() => selectedRows.value.map(r => r.patch_id))

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10
})

// 筛选后的数据（仅关键词筛选，严重程度已由后端筛选）
const filteredData = computed(() => {
  let data = allData.value

  // 根据关键词筛选
  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase().trim()
    data = data.filter(
      item =>
        item.patch_id?.toLowerCase().includes(keyword) ||
        item.title?.toLowerCase().includes(keyword) ||
        item.related_vuls?.toLowerCase().includes(keyword)
    )
  }

  return data
})

// 分页后的数据
const paginatedData = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return filteredData.value.slice(start, end)
})

// 总数
const totalCount = computed(() => filteredData.value.length)

// 补丁详情对话框
const patchDetailVisible = ref(false)
const patchDetail = ref(null)
const patchDetailLoading = ref(false)
const selectedPatch = ref(null)
const cveDialogVisible = ref(false)
const cveDialogList = ref([])
const cveDialogOsDistro = ref('')

// 安装对话框
const installDialogVisible = ref(false)
const patchesToInstall = ref([])
const installDataLoading = ref(false)
const affectedPackages = ref([])
const affectedHosts = ref([])
const selectedHosts = ref([])
const hostTableRef = ref(null)
const hostFilter = ref('@@(linux)')
const hostSearchText = ref('')
const hostPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// Wizard state
const installStep = ref(0)
const createdTaskId = ref('')
const backendRestartReason = ref('')
const taskProgressRef = ref(null)
const installConfig = reactive({
  preScript: '',
  restartPolicy: 'smart',
  postScript: ''
})

function resetInstallState() {
  installStep.value = 0
  createdTaskId.value = ''
  backendRestartReason.value = ''
  installConfig.preScript = ''
  installConfig.restartPolicy = 'smart'
  installConfig.postScript = ''
  selectedHosts.value = []
  hostSearchText.value = ''
}

// GUI label helpers
function getRestartPolicyLabel(policy) {
  const map = {
    smart: '智能识别',
    system: '系统重启',
    service: '服务重启',
    none: '不重启'
  }
  return map[policy] || policy
}

function getRestartPolicyTagType(policy) {
  const map = {
    smart: 'success',
    system: 'danger',
    service: 'warning',
    none: 'info'
  }
  return map[policy] || 'info'
}

// Smart reboot guess based on current selections
const smartRestartGuess = computed(() => {
  const patches = patchesToInstall.value
  let needsSystem = false
  let needsService = false
  for (const patch of patches) {
    const id = patch.patch_id?.toLowerCase() || ''
    if (patch.rebootStatus === 'system' || patch.isKernel === 'is_kernel' || id.includes('kernel')) {
      needsSystem = true
    } else if (patch.rebootStatus === 'service') {
      needsService = true
    }
  }
  const pkgs = affectedPackages.value.join(' ').toLowerCase()
  if (pkgs.includes('kernel')) {
    needsSystem = true
  }

  if (needsSystem) return '系统重启 (System Restart)'
  if (needsService || pkgs.includes('glibc') || pkgs.includes('openssl')) return '服务重启 (Service Restart)'
  return '无需重启 (None)'
})

async function handleNextStep() {
  if (installStep.value === 0) {
    if (selectedHosts.value.length === 0) return

    installDataLoading.value = true
    try {
      // 方案 B：先在后端创建任务，获取精准评估与自动生成的脚本
      const res = await patchInstallApi.createTask({
        hostIds: selectedHosts.value.map(h => h.hostId),
        patchIds: patchesToInstall.value.map(p => p.patch_id),
        patchStatusIds: patchesToInstall.value.map(p => p.id).filter(Boolean),
        osType: 'linux'
      })

      if (res?.data) {
        createdTaskId.value = res.data.id || ''

        // 自动使用后端返回的更精准重启策略
        if (res.data.restartType && ['system', 'service', 'none'].includes(res.data.restartType)) {
          installConfig.restartPolicy = res.data.restartType
        } else {
          installConfig.restartPolicy = 'smart'
        }

        backendRestartReason.value = res.data.restartReason || ''

        // 后端可能自动生成预检和校验脚本，将它们自动填入框内（如果框内是空的）作为默认参考，支持用户继续手工修改
        if (res.data.preCheckScript && !installConfig.preScript) {
          installConfig.preScript = res.data.preCheckScript
        }
        if (res.data.validateScript && !installConfig.postScript) {
          installConfig.postScript = res.data.validateScript
        }
      }

      installStep.value++
    } catch (error) {
      console.warn('API /create failed, falling back to local heuristic', error)
      ElMessage.warning('未能连接后端智能预判接口，已自动降级为本地启发式策略。')

      backendRestartReason.value = '（后端评估网络异常，目前显示本地启发式评估）'
      installStep.value++
    } finally {
      installDataLoading.value = false
    }
  } else if (installStep.value === 1) {
    installStep.value++
  }
}

// 过滤后的主机列表
const filteredHosts = computed(() => {
  let hosts = affectedHosts.value
  if (hostSearchText.value) {
    const keyword = hostSearchText.value.toLowerCase()
    hosts = hosts.filter(
      h =>
        h.hostKey?.toLowerCase().includes(keyword) || h.os_distro?.toLowerCase().includes(keyword)
    )
  }
  // 更新总数
  hostPagination.total = hosts.length
  // 分页
  const start = (hostPagination.page - 1) * hostPagination.pageSize
  const end = start + hostPagination.pageSize
  return hosts.slice(start, end)
})

// 主机分页处理
function handleHostPageChange(page) {
  hostPagination.page = page
}

function handleHostSizeChange(size) {
  hostPagination.pageSize = size
  hostPagination.page = 1
}

// 获取严重程度显示标签
function getSeverityLabel(severity) {
  const map = {
    Critical: '严重',
    Important: '重要',
    Moderate: '中等',
    Low: '低危'
  }
  return map[severity] || severity
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date
    .toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    .replace(/\//g, '-')
}

// 解析CVE列表
function parseCveList(cveStr) {
  if (!cveStr) return []
  return cveStr
    .split(',')
    .map(cve => cve.trim())
    .filter(cve => cve)
}

function parseCVEs(vulsStr) {
  if (!vulsStr) return []
  return vulsStr.split(',').filter(cve => cve.trim())
}

function handleShowAllCves(row) {
  cveDialogList.value = parseCVEs(row.related_vuls)
  cveDialogOsDistro.value = resolvePatchDistro(row)
  cveDialogVisible.value = true
}

function resolvePatchDistro(patch) {
  if (!patch) return ''
  return patch.os_distro || patch.vendor || (patch.patch_id.includes('KYSA') ? 'kylin' : 'redhat')
}

// 预处理数据 - 提前解析CVE列表
function preprocessData(records) {
  return records.map(item => ({
    ...item,
    _cveList: parseCveList(item.related_vuls)
  }))
}

// 加载数据 - 一次性获取所有数据
async function loadData() {
  loading.value = true
  try {
    // 构建 params 参数
    const params = {}
    if (filters.severity.length > 0) {
      params.severity = filters.severity.join(',')
    }

    const response = await patchInstallApi.getAvailablePatches(params)
    if (response?.data) {
      allData.value = preprocessData(response.data.records || response.data || [])
    }
  } catch (error) {
    console.error('Failed to load patches:', error)
    // 模拟数据
    allData.value = preprocessData(generateMockData())
  } finally {
    loading.value = false
  }
}

// 生成模拟数据
function generateMockData() {
  const severities = ['Critical', 'Important', 'Moderate', 'Low']
  const data = []
  for (let i = 0; i < 30; i++) {
    const year = 2025
    const seqNum = String(10000 + Math.floor(Math.random() * 20000))
    data.push({
      patch_id: `RHSA-${year}:${seqNum}`,
      title: `Important: ${['libtiff', 'bind', 'sssd', 'cups', 'container-tools:rhel8'][i % 5]} security update`,
      severity: severities[i % 4],
      publish_date: `${year}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      related_vuls: `CVE-${year}-${String(Math.floor(Math.random() * 90000) + 10000)}`,
      effect_host_count: Math.floor(Math.random() * 10) + 1
    })
  }
  return data
}

// 搜索处理（严重程度改变时需要重新加载）
function handleSearch() {
  pagination.page = 1
  loadData()
}

// 重置处理
function handleReset() {
  // 重置筛选条件为默认值
  filters.severity = ['Critical', 'Important', 'Moderate', 'Low']
  filters.keyword = ''
  // 重置分页
  pagination.page = 1
  pagination.pageSize = 10
  loadData()
}

function handleSelectionChange(selection) {
  selectedRows.value = selection
}

function handlePageChange(page) {
  pagination.page = page
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
}

function handleViewPatchDetail(row) {
  selectedPatch.value = row
  patchDetailVisible.value = true
  loadPatchDetail(row.patch_id)
}

// 加载补丁详情
async function loadPatchDetail(patchId) {
  patchDetailLoading.value = true
  patchDetail.value = null
  try {
    const response = await patchInstallApi.getPatchDetail({ patch_id: patchId })
    if (response?.data?.records?.length > 0) {
      patchDetail.value = response.data.records[0]
    }
  } catch (error) {
    console.error('Failed to load patch detail:', error)
    // 使用模拟数据
    patchDetail.value = {
      patch_id: patchId,
      title: selectedPatch.value?.title || 'Important: security update',
      severity: selectedPatch.value?.severity || 'Important',
      description:
        'The libtiff packages contain a library of functions for manipulating Tagged Image File Format (TIFF) files. Security Fix(es): libtiff: LibTIFF Use-After-Free Vulnerability (CVE-2025-8176) For more details about the security issue(s), including the impact, a CVSS score, acknowledgments, and other related information, refer to the CVE page(s) listed in the References section.',
      related_vuls: selectedPatch.value?.related_vuls || 'CVE-2025-8176'
    }
  } finally {
    patchDetailLoading.value = false
  }
}

function handleViewAffectedHosts(row) {
  // 点击受影响软件包数量，打开安装弹窗
  patchesToInstall.value = [row]
  installDialogVisible.value = true
  loadInstallData([row.patch_id])
}

function handleInstallSelected() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要安装的补丁')
    return
  }
  patchesToInstall.value = [...selectedRows.value]
  installDialogVisible.value = true
  loadInstallData(selectedRows.value.map(p => p.patch_id))
}

function handleInstallSingle(patch) {
  patchesToInstall.value = [patch || selectedPatch.value]
  patchDetailVisible.value = false
  installDialogVisible.value = true
  loadInstallData([patchesToInstall.value[0].patch_id])
}

// 加载安装相关数据（软件包列表、主机列表）
async function loadInstallData(patchIds) {
  installDataLoading.value = true
  affectedPackages.value = []
  affectedHosts.value = []
  selectedHosts.value = []
  try {
    // 并行加载软件包和主机数据
    const [pkgResponse, hostResponse] = await Promise.all([
      patchInstallApi.getAffectedPackages({ patch_ids: patchIds }),
      patchInstallApi.getMachinesByPatch({ patch_ids: patchIds, hostId: '@@(linux)' })
    ])

    if (pkgResponse?.data?.records) {
      affectedPackages.value = pkgResponse.data.records.map(r => r.file_name || r.pkg_name)
    }

    if (hostResponse?.data?.records) {
      affectedHosts.value = hostResponse.data.records
    }
  } catch (error) {
    console.error('Failed to load install data:', error)
    // 模拟数据
    affectedPackages.value = [
      'glibc-devel-0:2.17-55.el7_0.5.x86_64',
      'glibc-common-0:2.17-55.el7_0.5.x86_64',
      'glibc-utils-0:2.17-55.el7_0.5.x86_64',
      'nscd-0:2.17-55.el7_0.5.x86_64'
    ]
    affectedHosts.value = generateMockHosts()
  } finally {
    installDataLoading.value = false
  }
}

// 生成模拟主机数据
function generateMockHosts() {
  const hosts = []
  for (let i = 0; i < 5; i++) {
    hosts.push({
      hostId: `host-${i}`,
      hostKey: `192.168.1.${100 + i}`,
      os_distro: 'RHEL',
      os_version: `7.${i + 1}`,
      scan_timestamp: Date.now() - Math.random() * 86400000 * 7
    })
  }
  return hosts
}

function handleHostSelectionChange(selection) {
  selectedHosts.value = selection
}

// 格式化日期时间
function formatDateTime(timestamp) {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date
    .toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    .replace(/\//g, '-')
}

async function executeInstall() {
  if (selectedHosts.value.length === 0) {
    ElMessage.warning('请选择要安装补丁的主机')
    return
  }

  if (!createdTaskId.value) return

  // 以长连接轮询弹窗形式调用任务机长
  taskProgressRef.value.open()
}

function handleTaskWorkflowDone(success) {
  if (success) {
    ElMessage.success('流程已完成')
  } else {
    ElMessage.error('执行失败')
  }
  installDialogVisible.value = false
  refresh()
}

function refresh() {
  loadData()
}

onMounted(() => {
  loadData()
})

defineExpose({ refresh })
</script>

<style scoped lang="scss">
// 徽章样式
.badge {
  display: inline-block;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
  color: #fff;

  &-danger {
    background-color: #dc3545;
  }

  &-warning {
    background-color: #ffc107;
    color: var(--el-text-color-primary);
  }

  &-dark {
    background-color: #343a40;
  }

  &-secondary {
    background-color: var(--el-text-color-secondary);
  }
}

.cve-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;

  .cve-link {
    display: inline-block;
    padding: 2px 8px;
    background: #6c757d;
    color: #fff;
    border-radius: 4px;
    font-size: 12px;
    text-decoration: none;
    transition: background 0.2s;

    &:hover {
      background: #545b62;
    }
  }

  .cve-more {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px 8px;
    background: #e9ecef;
    color: var(--el-text-color-secondary);
    border-radius: 4px;
    font-size: 12px;
    border: none;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: #dfe3e6;
    }
  }
}

.cve-dialog {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cve-dialog-item {
  display: inline-block;
  padding: 4px 10px;
  background: #6c757d;
  color: #fff;
  border-radius: 4px;
  font-size: 13px;
  text-decoration: none;
  transition: background 0.2s;

  &:hover {
    background: #545b62;
  }
}

.patch-link {
  color: #409eff;
  text-decoration: none;
  cursor: pointer;
  user-select: text;

  &:hover {
    color: #66b1ff;
    text-decoration: underline;
  }
}

.install-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.install-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  overflow: hidden;

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--el-fill-color-light);
    border-bottom: 1px solid var(--el-border-color-lighter);
    font-size: 13px;
    color: var(--el-text-color-primary);

    i {
      color: var(--el-text-color-secondary);
    }
  }

  .card-body {
    padding: 10px 12px;
    background: var(--el-bg-color);
    font-size: 13px;
    color: var(--el-text-color-primary);

    &--scroll {
      max-height: 140px;
      overflow-y: auto;
      color: var(--el-text-color-primary);
    }
  }

  &--table {
    .card-body {
      padding: 0;
      color: inherit;
    }
  }
}

.package-item {
  padding: 2px 0;
  color: var(--el-text-color-primary);
  font-size: 13px;
}

.no-data {
  color: var(--el-text-color-secondary);
  text-align: center;
  padding: 20px;
}

.host-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.host-link {
  color: var(--el-text-color-primary);
}

.host-pagination {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 8px 12px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

/* Custom wizard styles */
.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-left: 12px;
}

.script-input :deep(.el-textarea__inner) {
  font-family: monospace;
  background-color: #fafafa;
}

.config-form {
  padding: 10px 20px;
}

.restart-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.confirm-descriptions {
  padding: 10px 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.text-muted {
  color: var(--el-text-color-secondary);
}

.patch-detail {
  padding: 8px;

  &__id {
    font-size: 18px;
    font-weight: bold;
    color: var(--el-text-color-primary);
    margin: 0 0 16px 0;
  }

  &__item {
    margin-bottom: 8px;
  }

  &__label {
    font-weight: bold;
    color: var(--el-text-color-primary);
  }

  &__value {
    font-size: 14px;
    color: var(--el-text-color-primary);
  }

  &__desc {
    font-size: 14px;
    color: var(--el-text-color-primary);
    line-height: 1.6;
    margin-bottom: 16px;
    padding: 8px 0;
  }

  &__cve-list {
    margin: 8px 0 0 0;
    padding-left: 20px;

    li {
      margin-bottom: 4px;
    }

    .cve-link {
      color: #0d6efd;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}

.patch-detail-loading {
  padding: 20px;
}

/* Stepper Styles */
.ops-stepper {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  margin-bottom: 30px;
  padding: 0 40px;
}

.stepper-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 120px;
  position: relative;
  z-index: 1;

  .stepper-icon {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background-color: var(--el-bg-color, #fff);
    border: 2px solid var(--el-text-color-placeholder, #a8abb2);
    color: var(--el-text-color-placeholder, #a8abb2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 8px;
    transition: all 0.3s;
  }

  .stepper-title {
    font-size: 14px;
    color: var(--el-text-color-regular, #606266);
    font-weight: 500;
    transition: all 0.3s;
  }

  &.is-active {
    .stepper-icon {
      border-color: var(--el-color-primary, #409eff);
      background-color: var(--el-color-primary, #409eff);
      color: #fff;
    }
    .stepper-title {
      color: var(--el-color-primary, #409eff);
      font-weight: bold;
    }
  }

  &.is-success {
    .stepper-icon {
      border-color: var(--el-color-success, #67c23a);
      color: var(--el-color-success, #67c23a);
      background-color: var(--el-bg-color, #fff);
    }
    .stepper-title {
      color: var(--el-color-success, #67c23a);
    }
  }
}

.stepper-line {
  flex: 1;
  height: 2px;
  background-color: var(--el-border-color-lighter, #ebeef5);
  margin: 13px -40px 0;
  z-index: 0;
  transition: all 0.3s;

  &.is-active {
    background-color: var(--el-color-success, #67c23a);
  }
}
</style>
