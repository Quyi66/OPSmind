<template>
  <div class="ops-page-layout">
    <!-- 详情穿透视图 -->
    <div v-if="currentView === 'detail'" class="detail-workbench">
      <!-- 头部导航与批次元数据卡片一体化 -->
      <div class="ops-section mb-2" v-if="activeBatch" style="padding: 12px 16px">
        <div
          class="detail-workbench-header mb-2"
          style="display: flex; justify-content: space-between; align-items: center"
        >
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>
              <el-link
                type="primary"
                :underline="false"
                style="color: var(--el-color-primary); font-weight: 500"
                @click="backToList"
              >
                CVE文件比对导入
              </el-link>
            </el-breadcrumb-item>
            <el-breadcrumb-item>比对结果分析</el-breadcrumb-item>
          </el-breadcrumb>
          <el-button size="small" @click="backToList">
            <i class="fa fa-chevron-left me-1" />
            返回列表
          </el-button>
        </div>
        <div
          class="batch-meta-card"
          style="
            border-top: 1px solid var(--el-border-color-lighter);
            padding-top: 10px;
            margin-top: 10px;
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 24px;
            font-size: 14px;
          "
        >
          <div class="batch-meta-item" style="display: flex; align-items: center">
            <span class="meta-label" style="color: var(--el-text-color-regular)">批次编号：</span>
            <strong
              class="meta-value"
              style="color: var(--el-text-color-primary); font-weight: 600"
            >
              {{ activeBatch.batchNo }}
            </strong>
          </div>
          <div class="batch-meta-item" style="display: flex; align-items: center">
            <span class="meta-label" style="color: var(--el-text-color-regular)">文件名称：</span>
            <span
              class="meta-value text-truncate"
              :title="activeBatch.originalName"
              style="
                color: var(--el-text-color-primary);
                max-width: 250px;
                display: inline-block;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              "
            >
              {{ activeBatch.originalName }}
            </span>
          </div>
          <div class="batch-meta-item" style="display: flex; align-items: center">
            <span class="meta-label" style="color: var(--el-text-color-regular)">文件来源：</span>
            <span class="meta-value" style="color: var(--el-text-color-primary)">
              {{ activeBatch.bugSource || '未识别' }}
            </span>
          </div>
          <div class="batch-meta-item" style="display: flex; align-items: center">
            <span class="meta-label" style="color: var(--el-text-color-regular)">比对汇总：</span>
            <span class="meta-value" style="color: var(--el-text-color-primary)">
              导入 CVE 数
              <strong style="color: var(--el-color-primary); font-weight: 600">
                {{ activeBatch.totalInput }}
              </strong>
              ， 成功匹配
              <strong style="color: var(--el-color-primary); font-weight: 600">
                {{ activeBatch.matchedCount }}
              </strong>
              ， 波及主机
              <strong style="color: var(--el-color-primary); font-weight: 600">
                {{ activeBatch.affectedHosts }}
              </strong>
              台
            </span>
          </div>
          <div class="batch-meta-actions" style="margin-left: auto">
            <el-button type="primary" size="small" @click="downloadFeedback(activeBatch)">
              <i class="fa fa-download me-1" />
              导出漏洞排查反馈表
            </el-button>
          </div>
        </div>
      </div>

      <!-- 比对穿透 Tab -->
      <div class="ops-section flex-detail-container">
        <el-tabs v-model="activeDetailTab" class="detail-tabs">
          <el-tab-pane label="漏洞整改比对列表 (CVE View)" name="cve">
            <template #label>
              <i class="fas fa-bug me-1"></i>
              漏洞整改比对
            </template>
            <div style="display: flex; flex-direction: column; height: 100%">
              <!-- 模糊匹配与筛选工具栏 -->
              <div
                class="ops-filter-bar mb-2"
                style="padding: 8px 12px; display: flex; align-items: center"
              >
                <el-form
                  inline
                  size="small"
                  style="margin-bottom: 0; display: flex; flex-wrap: wrap; gap: 12px"
                >
                  <el-form-item label="模糊匹配" style="margin-bottom: 0; margin-right: 0">
                    <el-input
                      v-model="cveFilterQuery"
                      placeholder="搜索 CVE 编号 / 漏洞名称 / 分类 / 威胁等级"
                      clearable
                      style="width: 320px"
                    />
                  </el-form-item>
                  <el-form-item label="等级(规范化)" style="margin-bottom: 0; margin-right: 0">
                    <el-select v-model="cveSeverityFilter" style="width: 140px" placeholder="全部">
                      <el-option value="all" label="全部" />
                      <el-option
                        v-for="opt in cveSeverityOptions.filter(o => o !== 'all')"
                        :key="opt"
                        :value="opt"
                        :label="opt"
                      />
                    </el-select>
                  </el-form-item>
                </el-form>
              </div>
              <div
                class="ops-table-wrapper"
                v-loading="detailLoading"
                style="flex: 1; min-height: 0"
              >
                <el-table :data="filteredCveItems" height="100%" style="width: 100%">
                  <el-table-column type="index" label="序号" width="60" align="center" />
                  <el-table-column prop="rawRowNo" label="Excel行号" width="90" align="center" />
                  <el-table-column prop="cveId" label="CVE 编号" width="180">
                    <template #default="{ row }">
                      <el-link type="primary" :underline="false" @click="showCveDetail(row.cveId)">
                        {{ row.cveId }}
                      </el-link>
                    </template>
                  </el-table-column>
                  <el-table-column
                    prop="bugName"
                    label="漏洞名称"
                    min-width="240"
                    show-overflow-tooltip
                  />
                  <el-table-column prop="category" label="分类" width="120" show-overflow-tooltip />
                  <el-table-column
                    prop="threatLevel"
                    label="威胁等级(原文)"
                    width="180"
                    show-overflow-tooltip
                  >
                    <template #default="{ row }">
                      <span class="text-muted">{{ row.threatLevel || '-' }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="severity" label="等级(规范化)" width="110" align="center">
                    <template #default="{ row }">
                      <el-tag
                        v-if="row.severity"
                        size="small"
                        effect="light"
                        :type="getSeverityTagType(row.severity)"
                      >
                        {{ row.severity }}
                      </el-tag>
                      <span v-else class="text-muted">-</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="affectedHosts" label="影响主机" width="100" align="center">
                    <template #default="{ row }">
                      <el-link
                        v-if="row.affectedHosts > 0"
                        type="primary"
                        class="fw-bold"
                        :underline="false"
                        @click="showAffectedHostsDialog(row)"
                      >
                        {{ row.affectedHosts }}
                      </el-link>
                      <span v-else class="text-muted">0</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="fixedHosts" label="已修复主机" width="100" align="center">
                    <template #default="{ row }">
                      <span :class="{ 'text-success': row.fixedHosts > 0 }">
                        {{ row.fixedHosts }}
                      </span>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="涉及主机清单 (Affected Hosts View)" name="hosts">
            <template #label>
              <i class="fas fa-desktop me-1"></i>
              涉及主机清单
            </template>
            <div style="display: flex; flex-direction: column; height: 100%">
              <!-- 模糊匹配与筛选工具栏 -->
              <div
                class="ops-filter-bar mb-2"
                style="padding: 8px 12px; display: flex; align-items: center"
              >
                <el-form
                  inline
                  size="small"
                  style="margin-bottom: 0; display: flex; flex-wrap: wrap; gap: 12px"
                >
                  <el-form-item label="模糊匹配" style="margin-bottom: 0; margin-right: 0">
                    <el-input
                      v-model="hostFilterQuery"
                      placeholder="搜索 主机 IP / 操作系统"
                      clearable
                      style="width: 260px"
                    />
                  </el-form-item>
                  <el-form-item label="漏洞紧急程度" style="margin-bottom: 0; margin-right: 0">
                    <el-select v-model="hostUrgencyFilter" style="width: 140px" placeholder="全部">
                      <el-option value="all" label="全部" />
                      <el-option
                        v-for="opt in hostUrgencyOptions.filter(o => o !== 'all')"
                        :key="opt"
                        :value="opt"
                        :label="opt"
                      />
                    </el-select>
                  </el-form-item>
                </el-form>
              </div>
              <div
                class="ops-table-wrapper"
                v-loading="hostsLoading"
                style="flex: 1; min-height: 0"
              >
                <el-table :data="filteredAffectedHosts" height="100%" style="width: 100%">
                  <el-table-column type="index" label="序号" width="60" align="center" />
                  <el-table-column prop="hostKey" label="主机 IP" width="150">
                    <template #default="{ row }">
                      <el-link type="primary" :underline="false" @click="goToHostDetail(row)">
                        {{ row.hostKey }}
                      </el-link>
                    </template>
                  </el-table-column>
                  <el-table-column prop="osDistro" label="操作系统" width="140">
                    <template #default="{ row }">{{ row.osDistro }} {{ row.osVersion }}</template>
                  </el-table-column>
                  <el-table-column label="关联 CVE" min-width="240">
                    <template #default="{ row }">
                      <div class="cve-link-group">
                        <template v-if="row.cveIds && row.cveIds.length > 0">
                          <!-- 数量少于或等于 3 时，直接平铺展示所有 CVE 编号 -->
                          <template v-if="row.cveIds.length <= 3">
                            <el-link
                              v-for="cveId in row.cveIds"
                              :key="cveId"
                              type="primary"
                              :underline="false"
                              @click="showCveDetail(cveId)"
                            >
                              {{ cveId }}
                            </el-link>
                          </template>
                          <!-- 数量多于 3 时，仅显示前 2 个，剩余展示为 '+N 个' clickable 触发器以缓解排版与性能压力 -->
                          <template v-else>
                            <el-link
                              v-for="cveId in row.cveIds.slice(0, 2)"
                              :key="cveId"
                              type="primary"
                              :underline="false"
                              @click="showCveDetail(cveId)"
                            >
                              {{ cveId }}
                            </el-link>
                            <el-link
                              type="warning"
                              :underline="false"
                              class="fw-bold"
                              @click="showCvesForHostDialog(row)"
                            >
                              +{{ row.cveIds.length - 2 }} 个
                            </el-link>
                          </template>
                        </template>
                        <span v-else class="text-muted">-</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column prop="urgencies" label="漏洞紧急程度" min-width="200">
                    <template #default="{ row }">
                      <template v-if="row.urgencies && row.urgencies.length > 0">
                        <el-tag
                          v-for="urg in row.urgencies"
                          :key="urg"
                          size="small"
                          round
                          effect="dark"
                          :type="getUrgencyTagType(urg)"
                          style="margin-right: 4px"
                        >
                          {{ urg }}
                        </el-tag>
                      </template>
                      <span v-else class="text-muted">未重算评估</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="rebootNeeded" label="需要重启" width="100" align="center">
                    <template #default="{ row }">
                      <el-tag :type="row.rebootNeeded ? 'danger' : 'success'" size="small" round>
                        {{ row.rebootNeeded ? '是' : '否' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <!-- <el-table-column label="操作" width="100" align="center">
                    <template #default="{ row }">
                      <el-button link type="primary" @click="goToHostDetail(row)">管理</el-button>
                    </template>
                  </el-table-column> -->
                </el-table>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- 列表主视图 -->
    <template v-else>
      <!-- 操作栏 -->
      <div class="ops-section mb-3">
        <div class="toolbar-wrapper">
          <h3 class="toolbar-title">CVE文件比对导入批次</h3>
          <div class="toolbar-actions">
            <el-button type="primary" @click="openUploadDialog">
              <el-icon><Upload /></el-icon>
              导入漏洞排查模板 (.xlsx)
            </el-button>
          </div>
        </div>
      </div>

      <!-- 批次列表 -->
      <div class="ops-section flex-table-container">
        <div class="ops-table-wrapper" v-loading="loading">
          <el-table :data="batches" height="100%" style="width: 100%">
            <el-table-column prop="batchNo" label="批次编号" width="160" />
            <el-table-column
              prop="originalName"
              label="漏洞模板文件名"
              min-width="220"
              show-overflow-tooltip
            />
            <el-table-column prop="bugSource" label="漏洞来源" width="160" show-overflow-tooltip />
            <el-table-column
              prop="projectBatch"
              label="项目批次"
              width="180"
              show-overflow-tooltip
            />
            <el-table-column prop="totalInput" label="导入CVE数" width="100" align="center" />
            <el-table-column prop="matchedCount" label="成功匹配" width="90" align="center" />
            <el-table-column prop="affectedHosts" label="影响主机" width="90" align="center" />
            <el-table-column prop="status" label="批次状态" width="110" align="center">
              <template #default="{ row }">
                <el-tag :type="getStatusTagType(row.status)" size="small" round>
                  {{ getStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="导入时间" width="170">
              <template #default="{ row }">
                <span class="text-muted">{{ formatDateTime(row.createdAt) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="260" fixed="right">
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  :disabled="row.status === 'parsed'"
                  @click="viewDetail(row)"
                >
                  比对详情
                </el-button>
                <el-button
                  link
                  type="primary"
                  :loading="comparingId === row.id"
                  @click="handleCompare(row)"
                >
                  开始比对
                </el-button>
                <el-button
                  link
                  type="success"
                  :disabled="row.status === 'parsed'"
                  @click="downloadFeedback(row)"
                >
                  导出
                </el-button>
                <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 分页 -->
        <div class="ops-pagination-wrapper">
          <el-pagination
            v-model:current-page="displayPage"
            v-model:page-size="pagination.size"
            :page-sizes="[10, 20, 50]"
            :total="pagination.totalElements"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </template>

    <!-- 导入上传对话框 -->
    <el-dialog
      v-model="uploadDialogVisible"
      title="导入威胁排查文件"
      width="520px"
      destroy-on-close
    >
      <div class="upload-area">
        <el-upload
          drag
          action=""
          :auto-upload="false"
          :on-change="handleFileChange"
          accept=".xlsx,.xls"
          :limit="1"
          :file-list="fileList"
        >
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">
            将文件拖到此处，或
            <em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip text-center mt-2">
              仅支持 .xlsx / .xls，文件不超过 10
              MB。可选“利用程度”列，合法值为：可利用、可检测、尚不可利用。
            </div>
          </template>
        </el-upload>
      </div>
      <template #footer>
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="uploading"
          :disabled="fileList.length === 0"
          @click="submitUpload"
        >
          确认上传并触发比对
        </el-button>
      </template>
    </el-dialog>

    <!-- CVE 详情对话框 -->
    <el-dialog
      v-model="cveDetailVisible"
      :title="`CVE 漏洞详情 - ${selectedCveId}`"
      width="90%"
      destroy-on-close
    >
      <div
        style="
          max-height: calc(100vh - 200px);
          overflow-y: auto;
          margin: -10px -20px -20px;
          padding: 10px 20px 20px;
        "
      >
        <CveDetail
          :cve-id="selectedCveId"
          :hide-breadcrumb="true"
          host-back-label="CVE比对详情"
          host-back-route-name="patches-cveImport"
          :host-back-route-query="cveDetailHostBackRouteQuery"
          @back="cveDetailVisible = false"
        />
      </div>
    </el-dialog>

    <!-- CVE 影响主机清单对话框 -->
    <el-dialog
      v-model="affectedHostsDialogVisible"
      :title="`CVE 影响主机清单 - ${selectedCveIdForHosts}`"
      width="680px"
      destroy-on-close
    >
      <div
        style="
          max-height: 50vh;
          overflow-y: auto;
          margin: -10px -20px -20px;
          padding: 10px 20px 20px;
        "
      >
        <el-table :data="hostsForSelectedCve" style="width: 100%">
          <el-table-column prop="hostKey" label="主机 IP" width="180">
            <template #default="{ row }">
              <el-link type="primary" :underline="false" @click="goToHostDetail(row)">
                {{ row.hostKey }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column prop="osDistro" label="操作系统" min-width="160">
            <template #default="{ row }">{{ row.osDistro }} {{ row.osVersion }}</template>
          </el-table-column>
          <el-table-column prop="rebootNeeded" label="需要重启" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.rebootNeeded ? 'danger' : 'success'" size="small" round>
                {{ row.rebootNeeded ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
          <!-- <el-table-column label="操作" width="100" align="center">
            <template #default="{ row }">
              <el-button link type="primary" @click="goToHostDetail(row)">管理</el-button>
            </template>
          </el-table-column> -->
        </el-table>
      </div>
    </el-dialog>

    <!-- 主机波及 CVE 详情对话框 -->
    <el-dialog
      v-model="cvesForHostDialogVisible"
      :title="`主机 CVE 漏洞清单 - ${selectedHostKeyForCves}`"
      width="780px"
      destroy-on-close
    >
      <div
        style="
          max-height: 50vh;
          overflow-y: auto;
          margin: -10px -20px -20px;
          padding: 10px 20px 20px;
        "
      >
        <el-table :data="cvesForSelectedHost" style="width: 100%">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="cveId" label="CVE 编号" width="180">
            <template #default="{ row }">
              <el-link
                type="primary"
                :underline="false"
                @click="handleCveClickFromHostDialog(row.cveId)"
              >
                {{ row.cveId }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column prop="bugName" label="漏洞名称" min-width="200" show-overflow-tooltip />
          <el-table-column prop="category" label="分类" width="120" show-overflow-tooltip />
          <el-table-column prop="severity" label="等级(规范化)" width="110" align="center">
            <template #default="{ row }">
              <el-tag
                v-if="row.severity"
                size="small"
                effect="light"
                :type="getSeverityTagType(row.severity)"
              >
                {{ row.severity }}
              </el-tag>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Upload, UploadFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { cveImportApi } from '../api'
import CveDetail from '../components/cve/details/CveDetail.vue'

const router = useRouter()
const route = useRoute()

// 视图切换
const currentView = ref('list') // list | detail
const activeBatch = ref(null)

// CVE 详情弹窗
const cveDetailVisible = ref(false)
const selectedCveId = ref('')
// 点击 CVE 链接时实时快照下来的页面状态，用于主机详情页"返回"时还原
// 不用 computed 是因为 computed 仅依赖响应式状态，普通 DOM 滚动位置无法触发重算
const cveDetailHostBackRouteQuery = ref('')

// 影响主机弹窗
const affectedHostsDialogVisible = ref(false)
const selectedCveIdForHosts = ref('')

// 主机 CVE 漏洞弹窗
const cvesForHostDialogVisible = ref(false)
const selectedHostIdForCves = ref('')
const selectedHostKeyForCves = ref('')

// 搜索/筛选条件
const cveFilterQuery = ref('')
const cveSeverityFilter = ref('all')
const hostFilterQuery = ref('')
const hostUrgencyFilter = ref('all')

// 列表数据
const loading = ref(false)
const batches = ref([])
const comparingId = ref(null)

// 分页信息
const pagination = reactive({
  page: 0,
  size: 20,
  totalElements: 0
})

const displayPage = computed({
  get: () => pagination.page + 1,
  set: val => {
    pagination.page = val - 1
  }
})

// 详情 Tab 数据
const activeDetailTab = ref('cve')
const detailLoading = ref(false)
const cveItems = ref([])
const hostsLoading = ref(false)
const affectedHosts = ref([])

// 动态提取 CVE 严重等级选项
const cveSeverityOptions = computed(() => {
  const severities = new Set(cveItems.value.map(item => item.severity).filter(Boolean))
  return ['all', ...severities]
})

// 动态提取主机漏洞紧急程度选项
const hostUrgencyOptions = computed(() => {
  const urgencies = new Set()
  affectedHosts.value.forEach(item => {
    if (Array.isArray(item.urgencies)) {
      item.urgencies.forEach(urg => urgencies.add(urg))
    }
  })
  return ['all', ...urgencies]
})

// 抓取当前页面状态（含表格滚动位置）并序列化为路由 query 字符串
// 在打开 CVE 详情弹窗的瞬间调用一次，从而让主机详情页"返回"时能精确还原
function snapshotHostBackRouteQuery() {
  const scrollWrapper = document.querySelector('.detail-tabs .el-scrollbar__wrap')
  const scrollTop = scrollWrapper ? scrollWrapper.scrollTop : 0

  return JSON.stringify({
    view: 'detail',
    batchId: activeBatch.value?.id,
    activeDetailTab: activeDetailTab.value,
    cveFilterQuery: cveFilterQuery.value,
    cveSeverityFilter: cveSeverityFilter.value,
    hostFilterQuery: hostFilterQuery.value,
    hostUrgencyFilter: hostUrgencyFilter.value,
    scrollTop
  })
}

// 过滤后的 CVE 列表 (支持模糊搜索 CVE编号 / 漏洞名称 / 分类 / 威胁等级，以及严重等级筛选)
const filteredCveItems = computed(() => {
  let list = cveItems.value

  if (cveFilterQuery.value.trim()) {
    const q = cveFilterQuery.value.toLowerCase().trim()
    list = list.filter(item => {
      return (
        (item.cveId && item.cveId.toLowerCase().includes(q)) ||
        (item.bugName && item.bugName.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.threatLevel && item.threatLevel.toLowerCase().includes(q))
      )
    })
  }

  if (cveSeverityFilter.value !== 'all') {
    list = list.filter(item => item.severity === cveSeverityFilter.value)
  }

  return list
})

// 过滤后的主机列表 (支持模糊搜索 主机IP / 操作系统，以及漏洞紧急程度筛选)
const filteredAffectedHosts = computed(() => {
  let list = affectedHosts.value

  if (hostFilterQuery.value.trim()) {
    const q = hostFilterQuery.value.toLowerCase().trim()
    list = list.filter(item => {
      return (
        (item.hostKey && item.hostKey.toLowerCase().includes(q)) ||
        (item.osDistro && item.osDistro.toLowerCase().includes(q)) ||
        (item.osVersion && item.osVersion.toLowerCase().includes(q))
      )
    })
  }

  if (hostUrgencyFilter.value !== 'all') {
    list = list.filter(item => {
      return Array.isArray(item.urgencies) && item.urgencies.includes(hostUrgencyFilter.value)
    })
  }

  return list
})

// 显示 CVE 详情弹窗
function showCveDetail(cveId) {
  selectedCveId.value = cveId
  // 在弹窗打开的瞬间快照当前 scrollTop / 过滤条件，避免 computed 不会跟踪 DOM 滚动
  cveDetailHostBackRouteQuery.value = snapshotHostBackRouteQuery()
  cveDetailVisible.value = true
}

// 获取当前选中 CVE 影响的主机列表
const hostsForSelectedCve = computed(() => {
  if (!selectedCveIdForHosts.value) return []
  return affectedHosts.value.filter(host => {
    return Array.isArray(host.cveIds) && host.cveIds.includes(selectedCveIdForHosts.value)
  })
})

// 显示受影响主机弹窗
function showAffectedHostsDialog(row) {
  selectedCveIdForHosts.value = row.cveId
  affectedHostsDialogVisible.value = true
}

// 获取当前选中主机所受波及的 CVE 列表
const cvesForSelectedHost = computed(() => {
  if (!selectedHostIdForCves.value) return []
  const host = affectedHosts.value.find(h => h.hostId === selectedHostIdForCves.value)
  if (!host || !Array.isArray(host.cveIds)) return []
  return cveItems.value.filter(item => host.cveIds.includes(item.cveId))
})

// 显示主机波及 CVE 详情弹窗
function showCvesForHostDialog(row) {
  selectedHostIdForCves.value = row.hostId
  selectedHostKeyForCves.value = row.hostKey
  cvesForHostDialogVisible.value = true
}

// 在弹窗中点击 CVE 编号，穿透展示 CVE 漏洞详情
function handleCveClickFromHostDialog(cveId) {
  cvesForHostDialogVisible.value = false
  setTimeout(() => {
    showCveDetail(cveId)
  }, 200)
}

// 文件上传
const uploadDialogVisible = ref(false)
const uploading = ref(false)
const fileList = ref([])

// 加载批次列表
async function loadBatches() {
  loading.value = true
  try {
    const res = await cveImportApi.getBatches({
      page: pagination.page,
      size: pagination.size
    })
    const result = res?.data || res
    batches.value = result.content || []
    pagination.totalElements = result.totalElements || 0
  } catch (error) {
    console.error('加载批次列表失败:', error)
    ElMessage.error('加载批次历史记录失败')
  } finally {
    loading.value = false
  }
}

// 格式化日期
function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 分页处理
function handleSizeChange(size) {
  pagination.size = size
  pagination.page = 0
  loadBatches()
}

function handlePageChange(page) {
  pagination.page = page - 1
  loadBatches()
}

// 标签与状态映射
function getStatusTagType(status) {
  if (status === 'parsed') return 'warning'
  if (status === 'compared') return 'primary'
  if (status === 'exported') return 'success'
  return 'info'
}

function getStatusLabel(status) {
  if (status === 'parsed') return '已解析'
  if (status === 'compared') return '已比对'
  if (status === 'exported') return '已导出'
  return status
}

function getSeverityTagType(severity) {
  if (severity === '特高危' || severity === '严重' || severity === 'Critical') return 'danger'
  if (severity === '高危' || severity === '重要' || severity === 'Important') return 'warning'
  if (severity === '中危' || severity === '中等' || severity === 'Moderate') return 'primary'
  return 'info'
}

function getUrgencyTagType(urgency) {
  if (urgency === '特急') return 'danger'
  if (urgency === '紧急') return 'warning'
  if (urgency === '普通') return 'primary'
  return 'info'
}

// 触发比对
async function handleCompare(row) {
  comparingId.value = row.id
  try {
    await cveImportApi.compareBatch(row.id)
    ElMessage.success(`批次 [${row.batchNo}] CVE 比对计算完成！`)
    loadBatches()
  } catch (error) {
    console.error('触发比对失败:', error)
    ElMessage.error('比对分析触发失败，请稍后重试')
  } finally {
    comparingId.value = null
  }
}

// 查看详情
async function viewDetail(row) {
  activeBatch.value = row
  currentView.value = 'detail'
  activeDetailTab.value = 'cve'
  // 重置模糊过滤条件和下拉选择
  cveFilterQuery.value = ''
  cveSeverityFilter.value = 'all'
  hostFilterQuery.value = ''
  hostUrgencyFilter.value = 'all'
  affectedHostsDialogVisible.value = false
  selectedCveIdForHosts.value = ''
  cvesForHostDialogVisible.value = false
  selectedHostIdForCves.value = ''
  selectedHostKeyForCves.value = ''
  // 更新路由 query 参数，以便能通过面包屑/浏览器后退返回到正确的详情页
  router.replace({
    query: {
      ...route.query,
      view: 'detail',
      batchId: row.id
    }
  })

  loadBatchCves(row.id)
  loadBatchHosts(row.id)
}

// 加载比对详情 (CVE View)
async function loadBatchCves(batchId) {
  detailLoading.value = true
  try {
    const res = await cveImportApi.getBatchDetail(batchId)
    cveItems.value = res?.items || res?.data?.items || []
  } catch (error) {
    console.error('加载CVE详情失败:', error)
    ElMessage.error('获取CVE比对分析记录失败')
  } finally {
    detailLoading.value = false
  }
}

// 加载比对详情 (Hosts View)
async function loadBatchHosts(batchId) {
  hostsLoading.value = true
  try {
    const res = await cveImportApi.getAffectedHosts(batchId)
    affectedHosts.value = res?.hosts || res?.data?.hosts || []
  } catch (error) {
    console.error('加载涉及主机失败:', error)
    ElMessage.error('获取涉及主机清单失败')
  } finally {
    hostsLoading.value = false
  }
}

// 返回列表
function backToList() {
  currentView.value = 'list'
  activeBatch.value = null

  // 清除路由中的详情参数
  const nextQuery = { ...route.query }
  delete nextQuery.view
  delete nextQuery.batchId
  router.replace({ query: nextQuery })

  loadBatches()
}

// 导出漏洞排查反馈表
async function downloadFeedback(row) {
  try {
    ElMessage.info('正在生成反馈表，请稍候...')
    const res = await cveImportApi.exportReport(row.id)
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `漏洞排查结果反馈表_${row.batchNo}.xlsx`
    a.click()
    URL.revokeObjectURL(a.href)
    ElMessage.success('反馈表生成并下载成功！')

    // 如果是列表状态，刷新一下，因为导出后状态会变为 exported
    if (currentView.value === 'list') {
      loadBatches()
    } else {
      // 详情状态，同步更新本地状态
      if (activeBatch.value && activeBatch.value.id === row.id) {
        activeBatch.value.status = 'exported'
      }
    }
  } catch (error) {
    console.error('导出反馈表失败:', error)
    ElMessage.error('反馈表格导出失败')
  }
}

// 删除批次
function handleDelete(row) {
  ElMessageBox.confirm(
    `确定要彻底删除导入批次 [${row.batchNo}] (${row.originalName}) 吗？此操作将同时清除其所有比对分析明细且不可恢复。`,
    '提示',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await cveImportApi.deleteBatch(row.id)
      ElMessage.success('批次删除成功')
      loadBatches()
    } catch (error) {
      console.error('删除批次失败:', error)
      ElMessage.error('删除批次失败')
    }
  })
}

// 打开上传弹框
function openUploadDialog() {
  fileList.value = []
  uploadDialogVisible.value = true
}

// 处理文件改变
function handleFileChange(uploadFile, uploadFiles) {
  fileList.value = uploadFiles.slice(-1) // 仅保留单个文件
}

// 提交上传并触发比对
async function submitUpload() {
  if (fileList.value.length === 0) {
    ElMessage.warning('请先选择需要上传的漏洞模板 Excel 文件')
    return
  }

  const rawFile = fileList.value[0].raw
  if (rawFile.size > 10 * 1024 * 1024) {
    ElMessage.warning('文件大小不能超过 10 MB')
    return
  }

  uploading.value = true
  try {
    // 1. 上传文件得到解析结果
    const uploadRes = await cveImportApi.uploadExcel(rawFile)
    const batch = uploadRes?.data || uploadRes
    ElMessage.success('文件上传解析成功！正在后台为您自动执行 CVE 比对，请稍候...')

    uploadDialogVisible.value = false

    // 2. 自动触发比对
    if (batch && batch.id) {
      await cveImportApi.compareBatch(batch.id)
      ElMessage.success(`比对计算完成！已生成漏洞排查批次 [${batch.batchNo}]`)
    }

    // 3. 刷新列表
    loadBatches()
  } catch (error) {
    console.error('上传比对失败:', error)
    ElMessage.error(error?.response?.data?.error || '漏洞文件比对导入失败')
  } finally {
    uploading.value = false
  }
}

// 跳转到主机详情
function goToHostDetail(row) {
  router.push({
    name: 'patches-hostDetail',
    query: {
      hostId: row.hostId,
      hostKey: row.hostKey,
      fromLabel: 'CVE比对详情',
      fromRouteName: 'patches-cveImport',
      fromRouteQuery: snapshotHostBackRouteQuery()
    }
  })
}

// 监听路由参数变化，支持从主机详情返回比对详情页
watch(
  () => route.query,
  async query => {
    if (query.view === 'detail' && query.batchId) {
      const batchId = Number(query.batchId)
      // 如果当前没有载入或者载入的批次不一致，执行详情载入逻辑
      if (!activeBatch.value || activeBatch.value.id !== batchId) {
        detailLoading.value = true
        try {
          const res = await cveImportApi.getBatchDetail(batchId)
          const batchInfo = res?.batch || res?.data?.batch
          if (batchInfo) {
            activeBatch.value = batchInfo
            currentView.value = 'detail'

            // 恢复之前保存的页面状态与过滤词
            activeDetailTab.value = query.activeDetailTab || 'cve'
            cveFilterQuery.value = query.cveFilterQuery || ''
            cveSeverityFilter.value = query.cveSeverityFilter || 'all'
            hostFilterQuery.value = query.hostFilterQuery || ''
            hostUrgencyFilter.value = query.hostUrgencyFilter || 'all'
            affectedHostsDialogVisible.value = false
            selectedCveIdForHosts.value = ''

            cveItems.value = res?.items || res?.data?.items || []
            // 必须等待主机列表异步载入并更新渲染完毕
            await loadBatchHosts(batchId)

            // 平滑恢复滚动条的垂直高度
            if (query.scrollTop) {
              nextTick(() => {
                setTimeout(() => {
                  const scrollWrapper = document.querySelector('.detail-tabs .el-scrollbar__wrap')
                  if (scrollWrapper) {
                    scrollWrapper.scrollTop = Number(query.scrollTop)
                  }
                }, 150) // 150ms 延时，确保 Vue 完成 DOM 重绘渲染
              })
            }
          } else {
            ElMessage.error('获取批次详情失败')
            backToList()
          }
        } catch (error) {
          console.error('加载批次详情失败:', error)
          ElMessage.error('加载批次详情失败')
          backToList()
        } finally {
          detailLoading.value = false
        }
      } else {
        // 如果组件未卸载（例如仅路由参数产生联动微调），同样支持就地恢复状态与滚动条
        activeDetailTab.value = query.activeDetailTab || activeDetailTab.value || 'cve'
        cveFilterQuery.value = query.cveFilterQuery || cveFilterQuery.value || ''
        cveSeverityFilter.value = query.cveSeverityFilter || cveSeverityFilter.value || 'all'
        hostFilterQuery.value = query.hostFilterQuery || hostFilterQuery.value || ''
        hostUrgencyFilter.value = query.hostUrgencyFilter || hostUrgencyFilter.value || 'all'

        if (query.scrollTop) {
          nextTick(() => {
            setTimeout(() => {
              const scrollWrapper = document.querySelector('.detail-tabs .el-scrollbar__wrap')
              if (scrollWrapper) {
                scrollWrapper.scrollTop = Number(query.scrollTop)
              }
            }, 100)
          })
        }
      }
      return
    }

    // 如果没有详情参数但当前为详情态，则退回列表态
    if (currentView.value === 'detail') {
      currentView.value = 'list'
      activeBatch.value = null
      loadBatches()
    }
  },
  { immediate: true }
)

onMounted(() => {
  loadBatches()
})
</script>

<style scoped lang="scss">
.toolbar-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--el-text-color-primary);
}

.detail-workbench-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.batch-meta-card {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 24px;
  font-size: 14px;
}

.batch-meta-item {
  display: flex;
  align-items: center;

  .meta-label {
    color: var(--el-text-color-regular);
  }

  .meta-value {
    color: var(--el-text-color-primary);

    strong {
      color: var(--el-color-primary);
    }
  }

  .text-truncate {
    max-width: 250px;
    display: inline-block;
  }
}

.batch-meta-actions {
  margin-left: auto;
}

.flex-table-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  margin-bottom: 0 !important;
}

.detail-workbench {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.flex-detail-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 12px 16px !important;
  margin-bottom: 0 !important;

  .detail-tabs {
    display: flex;
    flex-direction: column;
    height: 100%;

    :deep(.el-tabs__content) {
      flex: 1;
      min-height: 0;

      .el-tab-pane {
        height: 100%;
      }
    }
  }
}

.upload-area {
  padding: 10px 0;
  display: flex;
  justify-content: center;

  :deep(.el-upload-dragger) {
    width: 440px;
  }
}

.text-center {
  text-align: center;
}

.mt-2 {
  margin-top: 8px;
}

.cve-link-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
}
</style>
