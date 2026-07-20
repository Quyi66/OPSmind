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
                <el-skeleton-item variant="rect" class="skeleton-full" />
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
              <i class="fas fa-chart-bar panel-title-icon"></i>
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

        <!-- ③ 模板健康度 -->
        <section class="aw-panel templates-panel">
          <div class="aw-panel__header">
            <div class="aw-panel__title-group">
              <i class="fas fa-th-large panel-title-icon"></i>
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
                class="template-search-input"
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
                :class="[getPassRateClass(template.passRate), { 'is-executed': template.jobId }]"
                @click="handleCardClick(template)"
              >
                <!-- 卡片头 -->
                <div class="hc-header">
                  <div class="hc-icon">
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
                    <span class="hc-status-dot"></span>
                    <template v-if="template.executedTime">
                      {{ template.executedTime }}
                    </template>
                    <template v-else>未执行</template>
                  </div>
                </div>

                <!-- 已执行：通过率 + 指标 -->
                <template
                  v-if="
                    template.stats &&
                    (template.stats.ok > 0 ||
                      template.stats.failed > 0 ||
                      template.stats.check > 0 ||
                      template.stats.skipping > 0)
                  "
                >
                  <!-- 嵌入式指标容器（强化层级感） -->
                  <div class="hc-metrics-wrap">
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
                  </div>
                </template>

                <!-- 未执行：占位 -->
                <template v-else>
                  <div class="hc-empty-state">
                    <i class="fas fa-hourglass-half"></i>
                    <span>尚未执行巡检</span>
                  </div>
                </template>

                <!-- 底部（平铺功能按钮） -->
                <div class="hc-footer">
                  <el-button
                    type="primary"
                    link
                    size="small"
                    class="hc-action-btn hc-action-btn--run"
                    @click.stop="handleCommand('run', template)"
                  >
                    <i class="fas fa-play mr-1"></i>
                    执行
                  </el-button>
                  <el-button
                    type="primary"
                    link
                    size="small"
                    class="hc-action-btn hc-action-btn--edit"
                    @click.stop="handleCommand('edit', template)"
                  >
                    <i class="fas fa-edit mr-1"></i>
                    编辑
                  </el-button>
                  <el-button
                    type="danger"
                    link
                    size="small"
                    class="hc-action-btn hc-action-btn--delete"
                    @click.stop="handleCommand('delete', template)"
                  >
                    <i class="fas fa-trash-alt mr-1"></i>
                    删除
                  </el-button>
                </div>
              </div>
            </div>

            <!-- 空状态 -->
            <el-empty v-else-if="!loading && templateList.length === 0" description="暂无巡检模板">
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
import { ref, onMounted } from 'vue'
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
  distributionData,
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

function goToAddTemplate() {
  router.push('/cac/templates?action=add')
}

onMounted(() => {
  initData()
})
</script>

<style scoped lang="scss">
/* 巡检总览：轻量、紧凑、状态清晰的仪表盘风格 */
.overview-dashboard {
  --page-bg: #f4f7fb;
  --surface: #ffffff;
  --surface-soft: #f8fafc;
  --surface-raised: #fbfdff;
  --line: #e5ebf3;
  --line-strong: #d6e0ec;
  --text: #16243d;
  --text-2: #5e718d;
  --text-3: #95a4ba;
  --brand: #0d9488;
  --brand-soft: rgba(13, 148, 136, 0.09);
  --success: #10b981;
  --danger: #ef4444;
  --warning: #f59e0b;
  --info: #3b82f6;
  --neutral: #64748b;
  --radius: 10px;
  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.03), 0 10px 26px rgba(15, 23, 42, 0.04);
  --shadow-md: 0 12px 30px rgba(15, 23, 42, 0.1);

  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--page-bg);
  color: var(--text);
  padding: 0 !important;
}

:global(html.dark) .overview-dashboard {
  --page-bg: #0b1220;
  --surface: #121c2d;
  --surface-soft: #172336;
  --surface-raised: #162235;
  --line: rgba(148, 163, 184, 0.14);
  --line-strong: rgba(148, 163, 184, 0.24);
  --text: #e5edf7;
  --text-2: #a1b1c7;
  --text-3: #6f829c;
  --brand: #2dd4bf;
  --brand-soft: rgba(45, 212, 191, 0.12);
  --shadow-sm: 0 2px 10px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 18px 42px rgba(0, 0, 0, 0.35);
}

.content-scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 18px 20px;
  scrollbar-gutter: stable;

  &::-webkit-scrollbar {
    width: 7px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: var(--line-strong);
  }
}

/* 面板 */
.aw-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
}

.aw-panel__header {
  min-height: 50px;
  padding: 0 20px;
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
}

.aw-panel__title-group {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title-icon {
  width: 16px;
  color: var(--brand);
  font-size: 14px;
  text-align: center;
}

.aw-panel__title {
  margin: 0;
  color: var(--text);
  font-size: 15px;
  line-height: 1;
  font-weight: 700;
}

.aw-panel__stat-badge {
  height: 23px;
  padding: 0 9px;
  margin-left: 6px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface-soft);

  strong {
    color: var(--brand);
    font-weight: 700;
  }
}

.aw-panel__header-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;

  .template-search-input {
    width: 248px;
  }

  :deep(.el-input__wrapper) {
    min-height: 32px;
    padding: 0 12px;
    border-radius: 16px;
    background: var(--surface-soft);
    border: 1px solid transparent;
    box-shadow: none;

    &:hover {
      border-color: var(--line-strong);
    }

    &.is-focus {
      border-color: var(--brand);
      box-shadow: 0 0 0 3px var(--brand-soft);
    }
  }

  :deep(.el-input__inner) {
    color: var(--text);

    &::placeholder {
      color: var(--text-3);
    }
  }

  :deep(.el-button--small.is-circle) {
    width: 32px;
    height: 32px;
    color: var(--text-2);
    border-color: var(--line);
    background: var(--surface-soft);

    &:hover {
      color: var(--brand);
      border-color: rgba(13, 148, 136, 0.35);
      background: var(--brand-soft);
    }
  }
}

/* 检查结果分布 */
.distribution-bar-section {
  margin-bottom: 16px;
}

.distribution-bar-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  padding: 14px 18px 16px;
}

.dist-bar-item {
  --bar-color: var(--neutral);
  --bar-soft: rgba(100, 116, 139, 0.09);

  min-width: 0;
  padding: 11px 12px 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--surface-raised);
  transition:
    border-color 0.16s ease,
    background-color 0.16s ease;

  &:hover {
    border-color: var(--line-strong);
    background: var(--surface);
  }
}

.dist-bar-header {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.dist-bar-label,
.dist-bar-meta {
  display: inline-flex;
  align-items: center;
}

.dist-bar-label {
  min-width: 0;
  gap: 7px;
  color: var(--text-2);
  font-size: 12px;
  white-space: nowrap;
}

.dist-bar-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--bar-color);
  box-shadow: 0 0 0 3px var(--bar-soft);
}

.dist-bar-meta {
  flex: 0 0 auto;
  gap: 7px;
}

.dist-bar-value {
  color: var(--text);
  font-size: 15px;
  line-height: 1;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.dist-bar-percent {
  color: var(--text-3);
  font-size: 11px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.dist-bar-track {
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.11);
}

.dist-bar-fill {
  min-width: 0;
  height: 100%;
  border-radius: inherit;
  background: var(--bar-color);
  transition: width 0.65s ease;
}

.dist-ok {
  --bar-color: var(--success);
  --bar-soft: rgba(16, 185, 129, 0.1);
}
.dist-failed {
  --bar-color: var(--danger);
  --bar-soft: rgba(239, 68, 68, 0.1);
}
.dist-check {
  --bar-color: var(--info);
  --bar-soft: rgba(59, 130, 246, 0.1);
}
.dist-skipping {
  --bar-color: var(--neutral);
}
.dist-unreachable {
  --bar-color: var(--warning);
  --bar-soft: rgba(245, 158, 11, 0.11);
}

/* 模板区域 */
.templates-panel {
  min-height: 500px;
}

.health-grid-scroll-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: var(--page-bg);

  &::-webkit-scrollbar {
    width: 7px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: var(--line-strong);
  }

  :deep(.el-empty) {
    min-height: 340px;
  }
}

.health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  align-items: stretch;
  gap: 20px;
  padding: 16px;
}

/* 健康卡片 */
.health-card {
  --state: var(--text-3);
  --state-soft: rgba(148, 163, 184, 0.1);
  --state-border: rgba(148, 163, 184, 0.18);

  min-width: 0;
  min-height: 202px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.8) 0%, rgba(255, 255, 255, 1) 100%);
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.05),
    0 2px 4px -1px rgba(0, 0, 0, 0.03);
  transition:
    transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.25s,
    box-shadow 0.25s;

  &.rate-high {
    --state: var(--success);
    --state-soft: rgba(16, 185, 129, 0.09);
    --state-border: rgba(16, 185, 129, 0.18);
  }

  &.rate-mid {
    --state: var(--warning);
    --state-soft: rgba(245, 158, 11, 0.1);
    --state-border: rgba(245, 158, 11, 0.19);
  }

  &.rate-low {
    --state: var(--danger);
    --state-soft: rgba(239, 68, 68, 0.09);
    --state-border: rgba(239, 68, 68, 0.18);
  }

  &:hover {
    transform: translateY(-3px);
    border-color: var(--state);
    box-shadow:
      0 10px 25px -5px rgba(0, 0, 0, 0.08),
      0 8px 10px -6px rgba(0, 0, 0, 0.04);
  }

  &:focus-within {
    border-color: var(--state);
    box-shadow: 0 0 0 3px var(--state-soft);
  }
}

.hc-header {
  min-height: 70px;
  padding: 16px 15px 10px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.hc-icon {
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  color: var(--state);
  font-size: 16px;
  border: 1px solid var(--state-border);
  border-radius: 8px;
  background: var(--state-soft);
  transition: transform 0.18s ease;

  .health-card:hover & {
    transform: scale(1.03);
  }
}

.hc-title-wrap {
  flex: 1;
  min-width: 0;
  padding-top: 1px;
}

.hc-name {
  margin: 0 0 5px;
  overflow: hidden;
  color: var(--text);
  font-size: 14px;
  line-height: 20px;
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.hc-badges {
  display: flex;
  align-items: center;

  :deep(.el-tag) {
    height: 20px;
    padding: 0 7px;
    color: var(--text-2);
    font-size: 11px;
    font-weight: 500;
    border-color: transparent;
    background: var(--surface-soft);

    i {
      margin-right: 4px;
    }
  }
}

.hc-time-badge {
  min-height: 22px;
  max-width: 90px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
  overflow: hidden;
  color: var(--text-2);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  text-overflow: ellipsis;
  border-radius: 999px;
  background: var(--surface-soft);
  border: 1px solid var(--line);

  .hc-status-dot {
    width: 6px;
    height: 6px;
    flex: 0 0 auto;
    border-radius: 999px;
    background: var(--state);
    box-shadow: 0 0 0 2px var(--state-soft);
  }
}

.hc-metrics-wrap {
  margin: 0 15px 12px;
  padding: 7px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface-soft);
}

.hc-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.metric {
  min-height: 48px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;

  &.metric-ok {
    color: var(--success);
  }

  &.metric-fail {
    color: var(--danger);
  }

  &.metric-check {
    color: var(--info);
  }

  &.metric-skip {
    color: var(--neutral);
  }
}

.metric-num {
  color: currentColor;
  font-size: 16px;
  line-height: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.metric-txt {
  color: var(--text-2);
  font-size: 11px;
  line-height: 13px;
}

.hc-empty-state {
  flex: 1;
  min-height: 72px;
  margin: 0 15px 12px;
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  color: var(--text-3);
  font-size: 12px;
  font-weight: 500;
  border: 1px dashed var(--line-strong);
  border-radius: 8px;
  background: var(--surface-soft);

  i {
    width: 24px;
    height: 24px;
    display: inline-grid;
    place-items: center;
    color: var(--brand);
    font-size: 14px;
    border-radius: 999px;
    background: var(--brand-soft);
    opacity: 0.82;
  }
}

.hc-footer {
  min-height: 42px;
  margin-top: auto;
  padding: 5px 8px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-top: 1px solid #cbd5e1;
  background: #f8fafc;
}

.hc-action-btn {
  width: 100%;
  height: 30px !important;
  margin: 0 !important;
  justify-content: center;
  color: var(--text-2) !important;
  font-weight: 500 !important;
  border-radius: 8px !important;
  background: transparent !important;
  transition:
    color 0.16s ease,
    background-color 0.16s ease !important;

  i {
    margin-right: 5px;
    font-size: 11px;
  }

  &.hc-action-btn--run:hover {
    color: var(--brand) !important;
    background: var(--brand-soft) !important;
  }

  &.hc-action-btn--edit:hover {
    color: var(--info) !important;
    background: rgba(59, 130, 246, 0.09) !important;
  }

  &.hc-action-btn--delete:hover {
    color: var(--danger) !important;
    background: rgba(239, 68, 68, 0.09) !important;
  }
}

/* 骨架屏 */
.skeleton-section {
  padding: 0;
}

.skeleton-bar-row {
  margin-bottom: 14px;
}

.skeleton-bar-item {
  height: 122px;
  border-radius: var(--radius);
}

.skeleton-full {
  height: 520px;
  border-radius: var(--radius);
}

/* 响应式 */
@media (max-width: 1280px) {
  .distribution-bar-content {
    grid-template-columns: repeat(3, 1fr);
    row-gap: 12px;
  }
}

@media (max-width: 840px) {
  .content-scroll-area {
    padding: 12px;
  }

  .aw-panel__header {
    min-height: auto;
    padding: 14px;
    flex-wrap: wrap;
  }

  .aw-panel__header-actions,
  .aw-panel__header-actions .template-search-input {
    width: 100%;
  }

  .distribution-bar-content {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding: 14px;
  }

  .health-grid {
    grid-template-columns: 1fr;
    padding: 12px;
    gap: 12px;
  }
}

@media (max-width: 520px) {
  .distribution-bar-content {
    grid-template-columns: 1fr;
  }

  .hc-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .health-card,
  .hc-icon,
  .dist-bar-fill {
    transition: none;
  }
}
</style>

<style lang="scss">
/* 消除外层布局的重复内边距 */
.overview-dashboard.ops-page-layout {
  padding: 0 !important;
}
</style>
