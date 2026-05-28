<template>
  <div class="ops-page-layout overview-dashboard">
    <div class="content-scroll-area">
      <!-- 加载骨架屏 -->
      <template v-if="loading">
        <div class="skeleton-section">
          <el-skeleton animated>
            <template #template>
              <div class="skeleton-bar-row">
                <el-skeleton-item variant="rect" class="skeleton-bar-item" />
              </div>
              <div class="skeleton-bottom-row">
                <el-skeleton-item variant="rect" class="skeleton-left" />
                <el-skeleton-item variant="rect" class="skeleton-right" />
              </div>
            </template>
          </el-skeleton>
        </div>
      </template>

      <template v-else>
        <!-- ② 检查结果分布（单行 5 列条形进度条） -->
        <section class="aw-panel distribution-bar-section mb-4">
          <div class="aw-panel__header">
            <div class="aw-panel__title-group">
              <i class="fas fa-chart-bar" style="color: var(--aw-accent); font-size: 14px"></i>
              <h3 class="aw-panel__title">检查结果分布</h3>
            </div>
          </div>
          <div class="distribution-bar-content">
            <div
              v-for="item in distributionData"
              :key="item.key"
              class="dist-bar-item"
              :class="`dist-${item.key.toLowerCase()}`"
            >
              <div class="dist-bar-header">
                <span class="dist-bar-label">
                  <span class="dist-bar-dot"></span>
                  {{ item.label }}
                </span>
                <span class="dist-bar-meta">
                  <span class="dist-bar-value">{{ item.value }}</span>
                  <span class="dist-bar-percent">{{ item.percent.toFixed(1) }}%</span>
                </span>
              </div>
              <div class="dist-bar-track">
                <div class="dist-bar-fill" :style="{ width: item.percent + '%' }"></div>
              </div>
            </div>
          </div>
        </section>

        <!-- ③ 底部双栏：最近执行记录 + 模板健康度 -->
        <div class="bottom-section-layout">
          <!-- 左栏：最近执行记录 -->
          <section class="aw-panel recent-panel">
            <div class="aw-panel__header">
              <div class="aw-panel__title-group">
                <i class="fas fa-history" style="color: var(--aw-accent); font-size: 14px"></i>
                <h3 class="aw-panel__title">最近执行记录</h3>
                <span class="aw-panel__stat-badge" v-if="recentExecutions.length > 0">
                  <strong>{{ recentExecutions.length }}</strong>
                  条
                </span>
              </div>
            </div>
            <div class="recent-list">
              <div
                v-for="(exec, idx) in recentExecutions"
                :key="exec.id"
                class="recent-item"
                :class="{ clickable: exec.hasResult }"
                @click="exec.hasResult && goToResult(exec.jobId)"
              >
                <div class="recent-seq">{{ idx + 1 }}</div>
                <div class="recent-icon-wrap">
                  <i :class="exec.icon"></i>
                </div>
                <div class="recent-body">
                  <div class="recent-name" :title="exec.templateName">{{ exec.templateName }}</div>
                  <div class="recent-meta">
                    <span class="recent-user">
                      <i class="fas fa-user-circle"></i>
                      {{ exec.executedBy }}
                    </span>
                    <span class="recent-dot">·</span>
                    <span class="recent-time">
                      <i class="fas fa-clock"></i>
                      {{ exec.executedTime }}
                    </span>
                  </div>
                </div>
                <div class="recent-status">
                  <template v-if="exec.stats">
                    <el-tag :type="exec.stats.failed > 0 ? 'danger' : 'success'" size="small" round>
                      <i
                        :class="
                          exec.stats.failed > 0 ? 'fas fa-exclamation-triangle' : 'fas fa-check'
                        "
                      ></i>
                      {{ exec.stats.failed > 0 ? `${exec.stats.failed} 失败` : '全部通过' }}
                    </el-tag>
                  </template>
                  <template v-else>
                    <el-tag type="success" size="small" round>
                      <i class="fas fa-check"></i>
                      全部通过
                    </el-tag>
                  </template>
                </div>
              </div>
              <el-empty
                v-if="recentExecutions.length === 0"
                description="暂无执行记录"
                :image-size="64"
              />
            </div>
          </section>

          <!-- 右栏：模板健康度 -->
          <section class="aw-panel templates-panel">
            <div class="aw-panel__header">
              <div class="aw-panel__title-group">
                <i class="fas fa-th-large" style="color: var(--aw-accent); font-size: 14px"></i>
                <h3 class="aw-panel__title">模板健康度</h3>
                <span class="aw-panel__stat-badge">
                  <strong>{{ filteredTemplateList.length }}</strong>
                  / {{ templateList.length }}
                </span>
              </div>
              <div class="aw-panel__header-actions">
                <el-input
                  v-model="searchKeyword"
                  placeholder="搜索模板名称"
                  clearable
                  style="width: 220px"
                  size="small"
                >
                  <template #prefix>
                    <i class="fa fa-search"></i>
                  </template>
                </el-input>
                <el-button
                  size="small"
                  circle
                  :loading="statsLoading"
                  title="刷新"
                  @click="refreshAll"
                >
                  <i v-show="!statsLoading" class="fas fa-sync-alt"></i>
                </el-button>
              </div>
            </div>

            <div class="health-grid-scroll-wrap">
              <div v-if="filteredTemplateList.length > 0" class="health-grid">
                <div
                  v-for="template in filteredTemplateList"
                  :key="template.id"
                  class="health-card"
                  :class="{ 'is-executed': template.jobId }"
                  @click="handleCardClick(template)"
                >
                  <!-- 顶部色带 -->
                  <div class="hc-color-strip" :class="getPassRateClass(template.passRate)"></div>

                  <!-- 卡片头 -->
                  <div class="hc-header">
                    <div class="hc-icon" :class="getPassRateClass(template.passRate)">
                      <i :class="template.iconClass"></i>
                    </div>
                    <div class="hc-title-wrap">
                      <h4 class="hc-name" :title="template.templateName">
                        {{ template.templateName }}
                      </h4>
                      <div class="hc-badges">
                        <el-tag size="small" round type="info">
                          <i class="fas fa-desktop"></i>
                          {{ template.hostLength }} 主机
                        </el-tag>
                      </div>
                    </div>
                    <div class="hc-time-badge" :class="getPassRateClass(template.passRate)">
                      <template v-if="template.executedTime">
                        {{ template.executedTime }}
                      </template>
                      <template v-else>未执行</template>
                    </div>
                  </div>

                  <!-- 已执行：通过率 + 指标 -->
                  <template v-if="template.stats">
                    <div class="hc-progress-area">
                      <div class="progress-header">
                        <span class="progress-label">通过率</span>
                        <span class="progress-value" :class="getPassRateClass(template.passRate)">
                          {{ template.passRate ?? 0 }}%
                        </span>
                      </div>
                      <div class="progress-track">
                        <div
                          class="progress-fill"
                          :class="getPassRateClass(template.passRate)"
                          :style="{ width: (template.passRate ?? 0) + '%' }"
                        ></div>
                      </div>
                    </div>

                    <div class="hc-metrics">
                      <div class="metric metric-ok">
                        <span class="metric-num">{{ template.stats.ok }}</span>
                        <span class="metric-txt">通过</span>
                      </div>
                      <div class="metric metric-fail">
                        <span class="metric-num">{{ template.stats.failed }}</span>
                        <span class="metric-txt">失败</span>
                      </div>
                      <div class="metric metric-check">
                        <span class="metric-num">{{ template.stats.check }}</span>
                        <span class="metric-txt">人工</span>
                      </div>
                      <div class="metric metric-skip">
                        <span class="metric-num">{{ template.stats.skipping }}</span>
                        <span class="metric-txt">白名单</span>
                      </div>
                    </div>
                  </template>

                  <!-- 未执行：占位 -->
                  <template v-else>
                    <div class="hc-empty-state">
                      <i class="fas fa-hourglass-half"></i>
                      <span>待巡检</span>
                    </div>
                  </template>

                  <!-- 底部（平铺功能按钮） -->
                  <div class="hc-footer">
                    <el-button
                      type="primary"
                      link
                      size="small"
                      @click.stop="handleCommand('run', template)"
                    >
                      <i class="fas fa-play mr-1"></i>
                      执行
                    </el-button>
                    <el-button
                      type="primary"
                      link
                      size="small"
                      @click.stop="handleCommand('edit', template)"
                    >
                      <i class="fas fa-edit mr-1"></i>
                      编辑
                    </el-button>
                    <el-button
                      type="danger"
                      link
                      size="small"
                      @click.stop="handleCommand('delete', template)"
                    >
                      <i class="fas fa-trash-alt mr-1"></i>
                      删除
                    </el-button>
                  </div>
                </div>
              </div>

              <!-- 空状态 -->
              <el-empty
                v-else-if="!loading && templateList.length === 0"
                description="暂无巡检模板"
              >
                <el-button type="primary" @click="goToAddTemplate">
                  <i class="fa fa-plus"></i>
                  新增模板
                </el-button>
              </el-empty>
              <el-empty
                v-else-if="filteredTemplateList.length === 0"
                description="没有匹配的模板"
                :image-size="80"
              />
            </div>
          </section>
        </div>
      </template>
    </div>

    <!-- 编辑模板弹窗 -->
    <TemplateEditDialog
      v-model:visible="editDialogVisible"
      :template-id="editTemplateId"
      @success="handleEditSuccess"
    />

    <!-- 执行巡检弹窗 -->
    <RunTemplateDialog
      v-model:visible="runDialogVisible"
      :template-id="runTemplateId"
      @success="handleRunSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { templateApi } from '../api'
import { useOverviewData } from '../composables/useOverviewData'
import TemplateEditDialog from '../components/template/TemplateEditDialog.vue'
import RunTemplateDialog from '../components/template/RunTemplateDialog.vue'

const router = useRouter()

const {
  loading,
  statsLoading,
  templateList,
  searchKeyword,
  filteredTemplateList,
  globalStats,
  passRate,
  distributionData,
  recentExecutions,
  initData,
  refreshAll
} = useOverviewData()

const editDialogVisible = ref(false)
const editTemplateId = ref('')
const runDialogVisible = ref(false)
const runTemplateId = ref('')

function getPassRateClass(rate) {
  if (rate === null || rate === undefined) return 'rate-none'
  if (rate >= 90) return 'rate-high'
  if (rate >= 60) return 'rate-mid'
  return 'rate-low'
}

function handleCardClick(template) {
  if (template.jobId) {
    router.push(`/cac/results/${template.jobId}`)
  } else {
    ElMessage.warning('该模板尚未执行巡检，请先点击菜单执行巡检')
  }
}

function handleCommand(command, template) {
  switch (command) {
    case 'run':
      runTemplateId.value = template.id
      runDialogVisible.value = true
      break
    case 'edit':
      editTemplateId.value = template.id
      editDialogVisible.value = true
      break
    case 'delete':
      deleteTemplate(template)
      break
  }
}

async function deleteTemplate(template) {
  try {
    await ElMessageBox.confirm(`确定要删除模板「${template.templateName}」吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await templateApi.deleteTemplate(template.id)
    ElMessage.success('删除成功')
    refreshAll()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete template:', error)
      ElMessage.error('删除失败')
    }
  }
}

function handleEditSuccess() {
  refreshAll()
}
function handleRunSuccess() {
  refreshAll()
}

function goToResult(jobId) {
  if (jobId) router.push(`/cac/results/${jobId}`)
}

function goToAddTemplate() {
  router.push('/cac/templates?action=add')
}

onMounted(() => {
  initData()
})
</script>

<style scoped lang="scss">
/* ══════════════════════════════════════════════
   巡检总览仪表盘 — 基于自动化/资产工作台设计模式重构
   ══════════════════════════════════════════════ */

.overview-dashboard {
  --aw-bg: #f8fafc;
  --aw-panel-bg: #ffffff;
  --aw-panel-border: #e2e8f0;
  --aw-panel-shadow: 0 1px 3px rgba(0, 0, 0, 0.02), 0 4px 12px -4px rgba(0, 0, 0, 0.05);
  --aw-radius: 12px;
  --aw-text-primary: #1e293b;
  --aw-text-secondary: #64748b;
  --aw-text-muted: #94a3b8;
  --aw-accent: #0d9488;
  --aw-accent-glow: rgba(13, 148, 136, 0.06);

  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--aw-bg);
  padding: 0 !important;
}

html.dark .overview-dashboard {
  --aw-bg: #0f172a;
  --aw-panel-bg: rgba(20, 28, 40, 0.94);
  --aw-panel-border: rgba(71, 85, 105, 0.48);
  --aw-panel-shadow: 0 22px 40px rgba(0, 0, 0, 0.3);
  --aw-text-primary: #f1f5f9;
  --aw-text-secondary: #94a3b8;
  --aw-text-muted: #64748b;
  --aw-accent: #5eead4;
  --aw-accent-glow: rgba(94, 234, 212, 0.08);
}

.content-scroll-area {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 16px 20px 20px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--aw-panel-border);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

/* ───── ① 通用面板 aw-panel ───── */
.aw-panel {
  display: flex;
  flex-direction: column;
  background: var(--aw-panel-bg);
  border: 1px solid var(--aw-panel-border);
  border-radius: var(--aw-radius);
  box-shadow: var(--aw-panel-shadow);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    box-shadow:
      0 8px 24px rgba(0, 0, 0, 0.04),
      var(--aw-panel-shadow);
  }
}

.aw-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--aw-panel-border);
  flex-shrink: 0;
}

.aw-panel__title-group {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.aw-panel__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--aw-text-primary);
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
}

.aw-panel__stat-badge {
  font-size: 12px;
  color: var(--aw-text-secondary);
  background: var(--aw-bg);
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--aw-panel-border);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  line-height: 1.2;
  white-space: nowrap;
  margin-left: 6px;

  strong {
    color: var(--aw-accent);
    font-weight: 700;
  }
}

.aw-panel__header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;

  :deep(.el-input--small .el-input__wrapper) {
    border-radius: 999px;
    background-color: var(--aw-bg);
    border: 1px solid var(--aw-panel-border);
    box-shadow: none !important;
    padding: 0 10px;

    &:hover,
    &.is-focus {
      border-color: var(--aw-accent);
    }

    .el-input__inner {
      color: var(--aw-text-primary);
      &::placeholder {
        color: var(--aw-text-muted);
      }
    }
  }

  :deep(.el-button--small) {
    background-color: var(--aw-bg);
    border: 1px solid var(--aw-panel-border);
    color: var(--aw-text-secondary);

    &:hover {
      border-color: var(--aw-accent);
      color: var(--aw-accent);
      background-color: var(--aw-accent-glow);
    }
  }
}

/* ───── ④ 检查结果分布 ───── */
.distribution-bar-section {
  margin-bottom: 20px;
}

.distribution-bar-content {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;
  padding: 12px 16px 16px;
}

.dist-bar-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dist-bar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.dist-bar-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--aw-text-secondary);
}

.dist-bar-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--bar-color);
}

.dist-bar-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dist-bar-value {
  font-weight: 600;
  color: var(--aw-text-primary);
}

.dist-bar-percent {
  color: var(--aw-text-muted);
  font-size: 11px;
}

.dist-bar-track {
  height: 8px;
  border-radius: 4px;
  background: var(--aw-bg);
  overflow: hidden;
}

.dist-bar-fill {
  height: 100%;
  border-radius: 4px;
  background: var(--bar-gradient);
  transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 0;
}

/* 进度条色彩定义 */
.dist-ok {
  --bar-color: #10b981;
  --bar-gradient: linear-gradient(90deg, #10b981 0%, #34d399 100%);
}
.dist-failed {
  --bar-color: #ef4444;
  --bar-gradient: linear-gradient(90deg, #ef4444 0%, #f87171 100%);
}
.dist-check {
  --bar-color: #3b82f6;
  --bar-gradient: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%);
}
.dist-skipping {
  --bar-color: #64748b;
  --bar-gradient: linear-gradient(90deg, #64748b 0%, #94a3b8 100%);
}
.dist-unreachable {
  --bar-color: #f59e0b;
  --bar-gradient: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%);
}

/* ───── ⑤ 底部双栏布局 ───── */
.bottom-section-layout {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 20px;
  margin-bottom: 20px;
  align-items: stretch;
}

.recent-panel {
  height: 100%;
}

.templates-panel {
  height: 100%;
}

.recent-list {
  padding: 4px 0;
  flex: 1;
  overflow-y: auto;
  min-height: 0;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--aw-panel-border);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  transition: all 0.2s;

  &.clickable {
    cursor: pointer;
    &:hover {
      background: var(--aw-accent-glow);
    }
  }

  & + .recent-item {
    border-top: 1px solid var(--aw-panel-border);
  }
}

.recent-seq {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--aw-text-muted);
  background: var(--aw-bg);
  flex-shrink: 0;
}

.recent-icon-wrap {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--aw-bg);
  border-radius: 10px;
  color: var(--aw-text-secondary);
  font-size: 14px;
  flex-shrink: 0;
}

.recent-body {
  flex: 1;
  min-width: 0;
}

.recent-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--aw-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.recent-meta {
  font-size: 12px;
  color: var(--aw-text-secondary);
  margin-top: 3px;
  display: flex;
  align-items: center;
  gap: 6px;

  i {
    font-size: 11px;
    margin-right: 2px;
  }
}

.recent-dot {
  color: var(--aw-panel-border);
}

.recent-status {
  flex-shrink: 0;
}

/* ───── ⑥ 模板健康度网格 ───── */
.health-grid-scroll-wrap {
  flex: 1;
  overflow-y: auto;
  min-height: 0;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--aw-panel-border);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

.health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 16px;
}

.health-card {
  background: var(--aw-panel-bg);
  border: 1px solid var(--aw-panel-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;

  &:hover {
    transform: translateY(-4px);
    box-shadow:
      0 12px 28px rgba(0, 0, 0, 0.06),
      var(--aw-panel-shadow);
    border-color: var(--aw-accent);

    .hc-icon {
      transform: scale(1.05);
    }
  }

  &.is-executed:hover {
    border-color: var(--aw-accent);
  }
}

/* 顶部色带 */
.hc-color-strip {
  height: 3px;

  &.rate-high {
    background: linear-gradient(90deg, #10b981, #34d399);
  }
  &.rate-mid {
    background: linear-gradient(90deg, #f59e0b, #fbbf24);
  }
  &.rate-low {
    background: linear-gradient(90deg, #ef4444, #f87171);
  }
  &.rate-none {
    background: var(--aw-panel-border);
  }
}

.hc-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px 8px;
}

.hc-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 16px;
  flex-shrink: 0;
  transition: transform 0.3s;

  &.rate-high {
    background: rgba(16, 185, 129, 0.08);
    color: #10b981;
  }
  &.rate-mid {
    background: rgba(245, 158, 11, 0.08);
    color: #f59e0b;
  }
  &.rate-low {
    background: rgba(239, 68, 68, 0.08);
    color: #ef4444;
  }
  &.rate-none {
    background: var(--aw-bg);
    color: var(--aw-text-muted);
  }
}

.hc-title-wrap {
  flex: 1;
  min-width: 0;
}

.hc-name {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--aw-text-primary);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hc-badges {
  display: flex;
  gap: 6px;
}

.hc-time-badge {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 20px;
  font-weight: 500;
  white-space: nowrap;
  align-self: center;
  flex-shrink: 0;

  &.rate-high {
    background: rgba(16, 185, 129, 0.08);
    color: #10b981;
  }
  &.rate-mid {
    background: rgba(245, 158, 11, 0.08);
    color: #f59e0b;
  }
  &.rate-low {
    background: rgba(239, 68, 68, 0.08);
    color: #ef4444;
  }
  &.rate-none {
    background: var(--aw-bg);
    color: var(--aw-text-muted);
  }
}

/* 通过率进度条区域 */
.hc-progress-area {
  padding: 4px 16px 8px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.progress-label {
  font-size: 12px;
  color: var(--aw-text-secondary);
}

.progress-value {
  font-size: 16px;
  font-weight: 700;

  &.rate-high {
    color: #10b981;
  }
  &.rate-mid {
    color: #f59e0b;
  }
  &.rate-low {
    color: #ef4444;
  }
}

.progress-track {
  height: 6px;
  border-radius: 3px;
  background: var(--aw-bg);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 0;

  &.rate-high {
    background: linear-gradient(90deg, #10b981, #34d399);
  }
  &.rate-mid {
    background: linear-gradient(90deg, #f59e0b, #fbbf24);
  }
  &.rate-low {
    background: linear-gradient(90deg, #ef4444, #f87171);
  }
}

/* 四格统计 */
.hc-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  padding: 2px 16px 12px;
}

.metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 8px;
  background: var(--aw-bg);
}

.metric-num {
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.metric-ok .metric-num {
  color: #10b981;
}
.metric-fail .metric-num {
  color: #ef4444;
}
.metric-check .metric-num {
  color: #3b82f6;
}
.metric-skip .metric-num {
  color: #64748b;
}

.metric-txt {
  font-size: 11px;
  color: var(--aw-text-secondary);
  margin-top: 2px;
}

/* 未执行占位 */
.hc-empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 28px 16px;
  color: var(--aw-text-muted);
  font-size: 13px;

  i {
    font-size: 14px;
    opacity: 0.5;
  }
}

/* 卡片底部 */
.hc-footer {
  padding: 8px 12px;
  border-top: 1px solid var(--aw-panel-border);
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin-top: auto;
  background: var(--aw-bg);

  .el-button {
    font-weight: 600;
    color: var(--aw-text-secondary);

    i {
      font-size: 11px;
      margin-right: 2px;
    }

    &:hover {
      color: var(--aw-accent);
      background-color: transparent !important;
    }

    &.el-button--danger {
      &:hover {
        color: var(--el-color-danger);
        background-color: transparent !important;
      }
    }
  }
}

/* ───── ⑦ 骨架屏 ───── */
.skeleton-section {
  padding: 0;
}

.skeleton-bar-row {
  margin-bottom: 20px;
}

.skeleton-bar-item {
  height: 120px;
  border-radius: 12px;
}

.skeleton-bottom-row {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.skeleton-left {
  height: 480px;
  border-radius: 12px;
}

.skeleton-right {
  height: 480px;
  border-radius: 12px;
}
</style>

<style lang="scss">
/* 覆盖全局 ops-page-layout 边距限制，消除双重 Padding */
.overview-dashboard.ops-page-layout {
  padding: 0 !important;
}
</style>
