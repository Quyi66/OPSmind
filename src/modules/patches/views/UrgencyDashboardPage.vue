<template>
  <div class="ops-page-layout">
    <!-- 顶部标题与操作 -->
    <div class="ops-section mb-3">
      <div class="dashboard-header">
        <h3 class="dashboard-title">漏洞紧急程度管理</h3>
        <div class="dashboard-header-actions" v-if="activeViewTab === 'dashboard'">
          <el-button type="primary" :loading="recomputing" @click="handleRecomputeAll">
            <el-icon><Refresh /></el-icon>
            全量重算紧急度
          </el-button>
        </div>
      </div>
    </div>

    <!-- 选项卡 -->
    <el-tabs v-model="activeViewTab" class="dashboard-tabs">
      <!-- 标签页一：评估规则与统计 -->
      <el-tab-pane name="dashboard">
        <template #label>
          <i class="fas fa-list-alt me-1"></i>
          评估规则与统计
        </template>

        <!-- 4档统计大卡片 -->
        <div class="stats-cards-grid mb-3" v-loading="statsLoading">
          <div
            v-for="card in statCards"
            :key="card.key"
            class="stat-card"
            :class="['stat-card--' + card.type]"
          >
            <div class="stat-card__icon">
              <i :class="card.icon"></i>
            </div>
            <div class="stat-card__content">
              <div class="stat-card__value">{{ formatNumber(statistics[card.key]) }}</div>
              <div class="stat-card__label">{{ card.label }}</div>
              <div class="stat-card__desc">{{ card.desc }}</div>
            </div>
          </div>
        </div>

        <!-- 规则配置区域 -->
        <div class="ops-section flex-table-container">
          <div class="table-header mb-3">
            <div class="table-title">
              <i class="fas fa-sliders-h text-primary me-2"></i>
              紧急度评估规则 (33 + 3 条)
            </div>
            <span class="text-muted fs-7">紧急程度 = f(资产网络区域 × CVE 利用程度 × CVE 风险等级)</span>
          </div>

          <!-- 规则表格 -->
          <div class="ops-table-wrapper" v-loading="rulesLoading">
            <el-table :data="sortedRules" height="100%" style="width: 100%">
              <el-table-column prop="id" label="规则ID" width="90" />
              <el-table-column prop="location" label="资产网络区域" min-width="160">
                <template #default="{ row }">
                  <el-tag size="small" effect="plain" type="info">{{ row.location }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="exploit" label="CVE 利用程度" width="130">
                <template #default="{ row }">
                  <el-tag size="small" effect="light" :type="getExploitTagType(row.exploit)">
                    {{ row.exploit }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="riskLevel" label="CVE 风险等级" width="130">
                <template #default="{ row }">
                  <el-tag size="small" effect="light" :type="getRiskTagType(row.riskLevel)">
                    {{ row.riskLevel }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="urgency" label="漏洞紧急程度" width="130">
                <template #default="{ row }">
                  <el-tag size="small" round effect="dark" :type="getUrgencyTagType(row.urgency)">
                    {{ row.urgency }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="enabled" label="启用状态" width="110">
                <template #default="{ row }">
                  <el-tag :type="row.enabled === 1 ? 'success' : 'info'" size="small" round>
                    {{ row.enabled === 1 ? '已启用' : '已禁用' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="updatedBy" label="更新人" width="120" show-overflow-tooltip>
                <template #default="{ row }">
                  <span class="text-muted">{{ row.updatedBy || 'system' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="updatedAt" label="更新时间" width="180">
                <template #default="{ row }">
                  <span class="text-muted">{{ formatDateTime(row.updatedAt) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" @click="handleEditRule(row)">编辑</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-tab-pane>

      <!-- 标签页二：多 CVE 紧急度即时排查 -->
      <el-tab-pane name="lookup">
        <template #label>
          <i class="fas fa-search me-1"></i>
          多 CVE 紧急度即时排查
        </template>

        <!-- 输入区域 -->
        <div class="ops-section mb-3">
          <div class="lookup-input-bar">
            <div class="lookup-input-title mb-2">
              <i class="fas fa-search-plus text-primary me-2"></i>
              请输入待排查的 CVE 编号或文本
            </div>
            <el-input
              v-model="lookupText"
              type="textarea"
              :rows="4"
              placeholder="粘贴包含一个或多个 CVE 编号的排查文本（例如：CVE-2024-1234, CVE-2024-5678&#10;或者直接粘贴整篇通知正文，后台会自动正则提取 CVE 编号并执行即时诊断，结果不落库）"
              class="mb-3"
            />
            <div class="lookup-actions">
              <el-button type="primary" :loading="lookupLoading" @click="handleLookup">
                <i class="fas fa-search me-1"></i>
                即时排查
              </el-button>
              <el-button type="success" :disabled="!lookupResults.length" :loading="exportLoading" @click="handleExportLookup">
                <i class="fas fa-file-excel me-1"></i>
                导出 Excel
              </el-button>
              <el-button @click="handleClearLookup">
                清空输入
              </el-button>
            </div>
          </div>
        </div>

        <!-- 结果展示区域 -->
        <div class="ops-section flex-table-container">
          <div class="table-header mb-3">
            <div class="table-title">
              <i class="fas fa-table text-primary me-2"></i>
              即时排查诊断结果
              <span v-if="lookupResults.length" class="text-muted fs-7">
                (已匹配 {{ lookupResults.length }} 项关联，涉及 {{ totalInputCves }} 个 CVE 编号)
              </span>
            </div>
          </div>

          <!-- 结果表格 -->
          <div class="ops-table-wrapper" v-loading="lookupLoading">
            <el-table :data="lookupResults" height="100%" style="width: 100%">
              <el-table-column prop="cveId" label="CVE 编号" width="160">
                <template #default="{ row }">
                  <el-tag size="small" effect="plain" type="danger">{{ row.cveId }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="hostKey" label="主机 IP" width="150">
                <template #default="{ row }">
                  <el-link type="primary" :underline="false" @click="goToHostDetail(row)">
                    {{ row.hostKey }}
                  </el-link>
                </template>
              </el-table-column>
              <el-table-column prop="osDistro" label="操作系统" width="160" show-overflow-tooltip>
                <template #default="{ row }">
                  {{ row.osDistro }} {{ row.osVersion }} ({{ row.osArch }})
                </template>
              </el-table-column>
              <el-table-column prop="location" label="所处区域" width="140" show-overflow-tooltip>
                <template #default="{ row }">
                  <el-tag v-if="row.location" size="small" effect="plain" type="info">{{ row.location }}</el-tag>
                  <span v-else class="text-muted">未标记</span>
                </template>
              </el-table-column>
              <el-table-column prop="riskLevel" label="风险等级" width="110" align="center">
                <template #default="{ row }">
                  <el-tag size="small" effect="light" :type="getRiskTagType(row.riskLevel)">
                    {{ row.riskLevel }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="urgency" label="漏洞紧急程度" width="120" align="center">
                <template #default="{ row }">
                  <el-tag size="small" round effect="dark" :type="getUrgencyTagType(row.urgency)">
                    {{ row.urgency }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="cvss" label="CVSS" width="80" align="center">
                <template #default="{ row }">
                  <span :class="{ 'text-danger fw-bold': row.cvss >= 9.0 }">{{ row.cvss || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="patchId" label="补丁编号" width="160" show-overflow-tooltip>
                <template #default="{ row }">
                  <span>{{ row.patchId || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="patchStatus" label="补丁状态" width="110" align="center">
                <template #default="{ row }">
                  <el-tag size="small" round :type="getPatchStatusTagType(row.patchStatus)">
                    {{ getPatchStatusLabel(row.patchStatus) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="affectedPkgs" label="受影响包" min-width="180" show-overflow-tooltip>
                <template #default="{ row }">
                  <span>{{ row.affectedPkgs || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="scanDate" label="扫描时间" width="170">
                <template #default="{ row }">
                  <span class="text-muted">{{ formatDateTime(row.scanDate) }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 全量重算对话框 -->
    <el-dialog v-model="recomputeDialogVisible" title="全量重算漏洞紧急程度" width="460px">
      <div class="recompute-warning mb-3">
        <el-alert
          title="重算影响提示"
          type="warning"
          description="系统将分批读取全量资产与漏洞关联数据，并按照当前启用的 36 条规则对所有 CVE 漏洞的紧急程度进行重新评估写入，此操作耗时随数据规模而定（数千条数据通常在 5 秒内完成）。"
          :closable="false"
          show-icon
        />
      </div>
      <el-form :model="reform" label-width="120px">
        <el-form-item label="单批处理行数">
          <el-select v-model="reform.batchSize" style="width: 100%">
            <el-option :value="500" label="500 行" />
            <el-option :value="1000" label="1000 行 (推荐)" />
            <el-option :value="2000" label="2000 行" />
            <el-option :value="5000" label="5000 行 (最大)" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="recomputeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="recomputing" @click="executeRecompute">
          开始计算
        </el-button>
      </template>
    </el-dialog>

    <!-- 规则编辑对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑评估规则" width="480px" destroy-on-close>
      <el-form :model="editForm" label-width="120px">
        <el-form-item label="资产网络区域">
          <el-input :model-value="editForm.location" disabled />
        </el-form-item>
        <el-form-item label="CVE 利用程度">
          <el-input :model-value="editForm.exploit" disabled />
        </el-form-item>
        <el-form-item label="CVE 风险等级">
          <el-input :model-value="editForm.riskLevel" disabled />
        </el-form-item>
        <el-form-item label="漏洞紧急程度">
          <el-select v-model="editForm.urgency" style="width: 100%">
            <el-option value="特急" label="特急" />
            <el-option value="紧急" label="紧急" />
            <el-option value="普通" label="普通" />
            <el-option value="一般" label="一般" />
          </el-select>
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch
            v-model="editForm.enabled"
            :active-value="1"
            :inactive-value="0"
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveRule">保存配置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { urgencyApi } from '../api'

const router = useRouter()

// 标签页状态
const activeViewTab = ref('dashboard') // dashboard | lookup

// 看板统计状态
const statsLoading = ref(false)
const statistics = ref({
  特急: 0,
  紧急: 0,
  普通: 0,
  一般: 0
})

// 看板统计卡片定义
const statCards = [
  {
    key: '特急',
    label: '特急漏洞',
    type: 'danger',
    icon: 'fas fa-radiation text-danger',
    desc: '互联网高危漏洞，需立即阻断响应'
  },
  {
    key: '紧急',
    label: '紧急漏洞',
    type: 'warning',
    icon: 'fas fa-exclamation-triangle text-warning',
    desc: '外联网/内网漏洞，需在24小时内封堵'
  },
  {
    key: '普通',
    label: '普通漏洞',
    type: 'primary',
    icon: 'fas fa-shield-alt text-primary',
    desc: '可检测尚不可利用漏洞，列入计划整改'
  },
  {
    key: '一般',
    label: '一般漏洞',
    type: 'info',
    icon: 'fas fa-info-circle text-info',
    desc: '低风险或安全隔离环境，定期清理即可'
  }
]

// 规则列表状态
const rulesLoading = ref(false)
const rules = ref([])

// 重算控制
const recomputing = ref(false)
const recomputeDialogVisible = ref(false)
const reform = reactive({
  batchSize: 1000
})

// 编辑规则
const editDialogVisible = ref(false)
const saving = ref(false)
const editForm = reactive({
  id: null,
  location: '',
  exploit: '',
  riskLevel: '',
  urgency: '一般',
  enabled: 1
})

// 多 CVE 即时排查工作区状态
const lookupText = ref('')
const lookupLoading = ref(false)
const exportLoading = ref(false)
const lookupResults = ref([])
const totalInputCves = ref(0)

// 排序后的规则
const sortedRules = computed(() => {
  if (!rules.value || rules.value.length === 0) return []

  // 排序权重映射
  const riskWeight = { 特高危: 4, 高危: 3, 中危: 2, 低危: 1 }

  return [...rules.value].sort((a, b) => {
    // 1. location 升序
    const locCompare = (a.location || '').localeCompare(b.location || '', 'zh')
    if (locCompare !== 0) return locCompare

    // 2. riskLevel 降序
    const aRisk = riskWeight[a.riskLevel] || 0
    const bRisk = riskWeight[b.riskLevel] || 0
    if (bRisk !== aRisk) return bRisk - aRisk

    // 3. exploit 升序
    return (a.exploit || '').localeCompare(b.exploit || '', 'zh')
  })
})

// 加载统计信息
async function loadStatistics() {
  statsLoading.value = true
  try {
    const res = await urgencyApi.getStatistics()
    statistics.value = res?.data || res || { 特急: 0, 紧急: 0, 普通: 0, 一般: 0 }
  } catch (error) {
    console.error('加载紧急度统计失败:', error)
  } finally {
    statsLoading.value = false
  }
}

// 加载评估规则
async function loadRules() {
  rulesLoading.value = true
  try {
    const res = await urgencyApi.getRules()
    rules.value = res?.data || res || []
  } catch (error) {
    console.error('加载规则列表失败:', error)
    ElMessage.error('加载规则列表失败')
  } finally {
    rulesLoading.value = false
  }
}

// 格式化数字
function formatNumber(val) {
  return typeof val === 'number' ? val.toLocaleString() : (val || 0)
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

// 标签颜色映射
function getExploitTagType(exploit) {
  if (exploit === '可利用') return 'danger'
  if (exploit === '可检测') return 'warning'
  return 'info'
}

// 风险等级颜色映射
function getRiskTagType(riskLevel) {
  if (riskLevel === '特高危' || riskLevel === '严重') return 'danger'
  if (riskLevel === '高危' || riskLevel === '重要') return 'warning'
  if (riskLevel === '中危' || riskLevel === '中等') return 'primary'
  return 'info'
}

// 漏洞紧急度颜色映射
function getUrgencyTagType(urgency) {
  if (urgency === '特急') return 'danger'
  if (urgency === '紧急') return 'warning'
  if (urgency === '普通') return 'primary'
  return 'info'
}

// 补丁状态中文翻译与色彩映射
function getPatchStatusLabel(status) {
  const map = {
    is_repair: '已修复',
    no_repair: '未修复',
    repairing: '正在修复',
    repair_faild: '修复失败',
    rolling_back: '正在回滚',
    rolling_back_faild: '回滚失败',
    rolling_back_success: '回滚成功',
    is_repair_artificial: '手动修复'
  }
  return map[status] || status || '-'
}

function getPatchStatusTagType(status) {
  const map = {
    is_repair: 'success',
    no_repair: 'danger',
    repairing: 'warning',
    repair_faild: 'danger',
    rolling_back: 'warning',
    rolling_back_faild: 'danger',
    rolling_back_success: 'success',
    is_repair_artificial: 'info'
  }
  return map[status] || 'info'
}

// 打开全量重算弹窗
function handleRecomputeAll() {
  reform.batchSize = 1000
  recomputeDialogVisible.value = true
}

// 执行全量重算
async function executeRecompute() {
  recomputing.value = true
  recomputeDialogVisible.value = false
  try {
    const res = await urgencyApi.recompute({ batchSize: reform.batchSize })
    const data = res?.data || res
    ElMessageBox.alert(
      `重算已全部完成！<br/>更新数据行数：<strong>${data.updated || 0}</strong> 行<br/>累计耗时：<strong>${((data.elapsedMs || 0) / 1000).toFixed(2)}</strong> 秒`,
      '重算成功',
      {
        dangerouslyUseHTMLString: true,
        type: 'success'
      }
    )
    refresh()
  } catch (error) {
    console.error('全量重算失败:', error)
    ElMessage.error('紧急度评估全量重算失败')
  } finally {
    recomputing.value = false
  }
}

// 编辑规则
function handleEditRule(row) {
  editForm.id = row.id
  editForm.location = row.location
  editForm.exploit = row.exploit
  editForm.riskLevel = row.riskLevel
  editForm.urgency = row.urgency
  editForm.enabled = row.enabled ?? 1
  editDialogVisible.value = true
}

// 保存规则
async function saveRule() {
  saving.value = true
  try {
    await urgencyApi.updateRule(editForm.id, {
      urgency: editForm.urgency,
      enabled: editForm.enabled
    })
    ElMessage.success('规则配置已更新，后台内存缓存已同步生效！')
    editDialogVisible.value = false
    loadRules()
    // 规则变化可能影响统计，同时更新一下统计卡片
    loadStatistics()
  } catch (error) {
    console.error('保存规则失败:', error)
    ElMessage.error('保存规则配置失败')
  } finally {
    saving.value = false
  }
}

// 多 CVE 即时诊断排查
async function handleLookup() {
  if (!lookupText.value || !lookupText.value.trim()) {
    ElMessage.warning('请输入待排查的 CVE 编号或文本')
    return
  }

  lookupLoading.value = true
  try {
    const res = await urgencyApi.lookupUrgency({
      text: lookupText.value.trim()
    })
    const data = res?.data || res || {}
    lookupResults.value = data.rows || []
    totalInputCves.value = data.totalInput || 0
    ElMessage.success(`排查诊断完成！成功获取 ${lookupResults.value.length} 条关联主机排查记录`)
  } catch (error) {
    console.error('即时排查失败:', error)
    ElMessage.error('即时诊断排查失败，请检查输入后重试')
  } finally {
    lookupLoading.value = false
  }
}

// 导出即时排查结果为 Excel
async function handleExportLookup() {
  if (!lookupText.value || !lookupText.value.trim()) {
    ElMessage.warning('请先输入要排查的 CVE 文本并进行诊断')
    return
  }

  exportLoading.value = true
  try {
    ElMessage.info('正在生成排查报告 Excel，请稍候...')
    const res = await urgencyApi.exportLookupUrgency({
      cveIds: [lookupText.value.trim()]
    })
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `CVE紧急程度_${new Date().toISOString().slice(0,10)}.xlsx`
    a.click()
    URL.revokeObjectURL(a.href)
    ElMessage.success('排查报告 Excel 导出成功！')
  } catch (error) {
    console.error('导出排查报告失败:', error)
    ElMessage.error('导出排查报告 Excel 失败')
  } finally {
    exportLoading.value = false
  }
}

// 清空即时排查
function handleClearLookup() {
  lookupText.value = ''
  lookupResults.value = []
  totalInputCves.value = 0
  ElMessage.info('输入及排查结果已清空')
}

// 跳转至主机详情页进行管理
function goToHostDetail(row) {
  router.push({
    name: 'patches-hostDetail',
    query: {
      hostId: row.hostId,
      hostKey: row.hostKey,
      tab: 'vulnerabilities',
      fromLabel: '漏洞紧急程度查询',
      fromRouteName: 'patches-urgencyDashboard'
    }
  })
}

// 全局刷新
function refresh() {
  loadStatistics()
  loadRules()
}

onMounted(() => {
  refresh()
})
</script>

<style scoped lang="scss">
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dashboard-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--el-text-color-primary);
}

.dashboard-tabs {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 165px);
  min-height: 500px;

  :deep(.el-tabs__content) {
    flex: 1;
    min-height: 0;

    .el-tab-pane {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
  }
}

.stats-cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: transparent;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.06);
  }

  &__icon {
    font-size: 28px;
    margin-right: 20px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--el-bg-color);
  }

  &__content {
    flex: 1;
  }

  &__value {
    font-size: 28px;
    font-weight: 700;
    line-height: 1;
    color: var(--el-text-color-primary);
  }

  &__label {
    font-size: 14px;
    font-weight: 500;
    margin-top: 6px;
    color: var(--el-text-color-regular);
  }

  &__desc {
    font-size: 11px;
    color: var(--el-text-color-secondary);
    margin-top: 4px;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  /* 4档类型高亮 */
  &--danger {
    &::before { background: #f53f3f; }
    .stat-card__icon { background: rgba(245, 63, 63, 0.1); }
    .stat-card__value { color: #f53f3f; }
  }

  &--warning {
    &::before { background: #ff7d00; }
    .stat-card__icon { background: rgba(255, 125, 0, 0.1); }
    .stat-card__value { color: #ff7d00; }
  }

  &--primary {
    &::before { background: #165dff; }
    .stat-card__icon { background: rgba(22, 93, 255, 0.1); }
    .stat-card__value { color: #165dff; }
  }

  &--info {
    &::before { background: #86909c; }
    .stat-card__icon { background: rgba(134, 144, 156, 0.1); }
    .stat-card__value { color: #86909c; }
  }
}

.flex-table-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.fs-7 {
  font-size: 12px;
}

.lookup-input-bar {
  display: flex;
  flex-direction: column;
}

.lookup-input-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.lookup-actions {
  display: flex;
  gap: 10px;
}

@media (max-width: 1200px) {
  .stats-cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
