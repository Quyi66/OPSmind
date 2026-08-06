<template>
  <div class="cve-detail">
    <!-- 顶部面包屑：导航入口 -->
    <div class="cve-detail-breadcrumb">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item>
          <a @click.prevent="goBack">中间件漏洞详情</a>
        </el-breadcrumb-item>
        <el-breadcrumb-item>{{ cveId }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" v-loading="loading" class="detail-section" style="height: 400px"></div>

    <!-- 详情内容 -->
    <div v-else-if="cveDetail" class="cve-content-wrapper">
      <el-tabs v-model="activeTab" class="ops-tabs">
        <el-tab-pane name="basic" label="基本信息">
          <div class="tab-scroll-box">
            <!-- 头部信息 -->
            <div class="modern-header mb-4">
              <div class="header-top">
                <h1 class="cve-title">{{ cveId }}</h1>
                <el-tag
                  v-if="currentMiddleware"
                  :type="getSeverityType(currentMiddleware.severity)"
                  effect="dark"
                  :class="['severity-badge', getSeverityClass(currentMiddleware.severity)]"
                >
                  {{
                    currentMiddleware.severityLabel || getSeverityLabel(currentMiddleware.severity)
                  }}
                </el-tag>
              </div>
              <div class="header-meta">
                <div class="meta-item" v-if="currentMiddleware">
                  <span class="label">发布时间:</span>
                  <span class="value">{{ formatDateTime(currentMiddleware.publicDate) }}</span>
                </div>
                <div class="meta-separator"></div>
                <div
                  class="meta-item data-source-item"
                  v-if="cveDetail.middlewares && cveDetail.middlewares.length > 0"
                >
                  <span class="label">中间件:</span>
                  <el-radio-group
                    v-model="currentMiddlewareIndex"
                    size="small"
                    @change="selectMiddleware"
                    class="source-radio-group"
                  >
                    <el-radio-button
                      v-for="(mw, index) in cveDetail.middlewares"
                      :key="index"
                      :value="index"
                    >
                      {{ mw.middlewareType }}
                    </el-radio-button>
                  </el-radio-group>
                </div>
              </div>
            </div>

            <!-- 详细信息卡片 -->
            <div class="modern-card mb-4" v-if="currentMiddleware">
              <div class="card-title">基础信息</div>
              <div class="details-grid two-col inline">
                <div class="detail-cell">
                  <span class="label">漏洞编号</span>
                  <div class="value">
                    <el-link
                      v-if="currentMiddleware.webUrl"
                      :href="currentMiddleware.webUrl"
                      target="_blank"
                      type="primary"
                      underline="never"
                      class="cve-link"
                    >
                      {{ cveId }}
                      <el-icon class="ms-1"><TopRight /></el-icon>
                    </el-link>
                    <span v-else class="text-primary fw-bold">{{ cveId }}</span>
                  </div>
                </div>
                <div class="detail-cell">
                  <span class="label">中间件类型</span>
                  <div class="value">
                    <el-tag size="small" effect="plain">
                      {{ currentMiddleware.middlewareType }}
                    </el-tag>
                  </div>
                </div>
                <div class="detail-cell">
                  <span class="label">严重等级</span>
                  <div class="value">
                    <el-tag
                      :type="getSeverityType(currentMiddleware.severity)"
                      effect="dark"
                      size="small"
                      :class="['severity-badge', getSeverityClass(currentMiddleware.severity)]"
                    >
                      {{
                        currentMiddleware.severityLabel ||
                        getSeverityLabel(currentMiddleware.severity)
                      }}
                    </el-tag>
                  </div>
                </div>
                <div class="detail-cell">
                  <span class="label">CVSS 评分</span>
                  <div class="value">
                    <span
                      :class="currentMiddleware.cvss3Score ? 'text-danger fw-bold' : 'text-muted'"
                    >
                      {{
                        currentMiddleware.cvss3Score ? currentMiddleware.cvss3Score.toFixed(1) : '-'
                      }}
                    </span>
                    <span v-if="currentMiddleware.cvss3Vector" class="text-muted ms-2 code-font">
                      ({{ currentMiddleware.cvss3Vector }})
                    </span>
                  </div>
                </div>
                <div class="detail-cell">
                  <span class="label">CWE 编号</span>
                  <div class="value code-font text-primary">{{ currentMiddleware.cwe || '-' }}</div>
                </div>
                <div class="detail-cell">
                  <span class="label">数据源</span>
                  <div class="value">{{ currentMiddleware.source || '-' }}</div>
                </div>
              </div>
            </div>

            <!-- 描述信息卡片 -->
            <div class="modern-card mb-4" v-if="currentMiddleware">
              <div class="card-title">漏洞描述</div>
              <div class="card-text description-text">
                {{ currentMiddleware.description || '暂无详细描述信息。' }}
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane name="versions">
          <template #label>
            受影响版本
            <span class="ops-tab-count" v-if="currentMiddleware?.affectedVersions?.length">
              {{ currentMiddleware.affectedVersions.length }}
            </span>
          </template>
          <div class="tab-content-container">
            <div class="ops-table-wrapper" v-if="currentMiddleware">
              <el-table
                :data="currentMiddleware.affectedVersions || []"
                max-height="calc(100vh - 274px)"
                style="width: 100%"
              >
                <el-table-column prop="productName" label="产品名称" min-width="150" />
                <el-table-column label="受影响版本范围" min-width="180">
                  <template #default="{ row }">
                    {{ row.versionStart || '*' }} ~ {{ row.versionEnd || '*' }}
                  </template>
                </el-table-column>
                <el-table-column prop="fixedVersion" label="修复版本" min-width="120">
                  <template #default="{ row }">
                    <span v-if="row.fixedVersion" class="text-success">{{ row.fixedVersion }}</span>
                    <span v-else class="text-muted">-</span>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="状态" width="100">
                  <template #default="{ row }">
                    <el-tag
                      size="small"
                      :type="
                        row.status === 'fixed'
                          ? 'success'
                          : row.status === 'affected'
                            ? 'danger'
                            : 'info'
                      "
                    >
                      {{ row.statusLabel || row.status }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 错误状态 -->
    <div v-else class="detail-section error-container">
      <el-empty description="无法获取详细信息">
        <el-button type="primary" @click="goBack">返回列表</el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { TopRight } from '@element-plus/icons-vue'
import { formatDateTime as formatDateTimeGlobal } from '@/utils/date'
import { middlewareCveApi } from '../../../api'

// Props
const props = defineProps({
  cveId: {
    type: String,
    required: true
  }
})

// Emits
const emit = defineEmits(['back'])

const loading = ref(true)
const cveDetail = ref(null)
const activeTab = ref('basic')
const currentMiddlewareIndex = ref(0)
const currentMiddleware = ref(null)

// 返回列表
function goBack() {
  emit('back')
}

function formatDateTime(dateStr) {
  return formatDateTimeGlobal(dateStr, 'YYYY-MM-DD HH:mm')
}

function normalizeSeverityKey(severity) {
  const raw = String(severity || '').trim()
  if (!raw) return ''
  const lower = raw.toLowerCase()
  if (lower === 'critical' || raw === '严重') return 'critical'
  if (lower === 'important' || raw === '重要') return 'important'
  if (lower === 'moderate' || raw === '中等') return 'moderate'
  if (lower === 'low' || raw === '低危') return 'low'
  return ''
}

function getSeverityClass(severity) {
  const key = normalizeSeverityKey(severity)
  return key ? `is-${key}` : ''
}

function getSeverityType(severity) {
  const key = normalizeSeverityKey(severity)
  const typeMap = {
    critical: 'danger',
    important: 'warning',
    moderate: 'primary',
    low: 'info'
  }
  return typeMap[key] || 'info'
}

function getSeverityLabel(severity) {
  const key = normalizeSeverityKey(severity)
  const labelMap = {
    critical: '严重',
    important: '重要',
    moderate: '中等',
    low: '低危'
  }
  return labelMap[key] || severity
}

async function loadCveDetail() {
  loading.value = true
  try {
    const data = await middlewareCveApi.getDetail(props.cveId)
    const result = data?.data || data
    cveDetail.value = result

    if (result.middlewares && result.middlewares.length > 0) {
      currentMiddlewareIndex.value = 0
      selectMiddleware(0)
    }
  } catch (error) {
    console.error('加载详情失败:', error)
  } finally {
    loading.value = false
  }
}

function selectMiddleware(index) {
  if (cveDetail.value && cveDetail.value.middlewares) {
    currentMiddleware.value = cveDetail.value.middlewares[index]
  }
}

onMounted(() => {
  loadCveDetail()
})
</script>

<style scoped lang="scss">
@use '@/styles/biz-tags.scss';

.cve-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--el-bg-color-page);
  overflow: hidden;
}

.cve-detail-breadcrumb {
  flex-shrink: 0;
  padding: 12px 20px;
  padding-top: 0;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);

  :deep(.el-breadcrumb) {
    font-size: 14px;

    .el-breadcrumb__item {
      .el-breadcrumb__inner {
        a {
          color: #409eff;
          font-weight: normal;
          cursor: pointer;

          &:hover {
            color: #66b1ff;
          }
        }
      }

      &:last-child .el-breadcrumb__inner {
        color: var(--el-text-color-regular);
        font-weight: 500;
      }
    }
  }
}

.cve-content-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.ops-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: transparent;

  :deep(.el-tabs__header) {
    margin-bottom: 0;
    background: var(--el-bg-color);
    padding: 0 16px;
    border-radius: 8px 8px 0 0;
    border-bottom: 1px solid var(--el-border-color-light);
  }

  :deep(.el-tabs__content) {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--el-bg-color);
    padding: 20px 24px;
    border-radius: 0 0 8px 8px;
    box-shadow: var(--el-box-shadow-light);
  }

  :deep(.el-tab-pane) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
}

.tab-scroll-box {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--el-border-color-lighter);
    border-radius: 10px;
  }
}

.ops-tab-count {
  display: inline-block;
  background: var(--el-bg-color-page);
  color: var(--el-text-color-secondary);
  font-size: 11px;
  padding: 0 6px;
  border-radius: 10px;
  height: 18px;
  line-height: 18px;
  margin-left: 4px;
}

.modern-header {
  margin-top: 4px;

  .header-top {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;

    .cve-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--el-text-color-primary);
      margin: 0;
      line-height: 1.2;
    }
  }

  .header-meta {
    display: flex;
    align-items: center;
    gap: 24px;

    .meta-item {
      display: flex;
      align-items: center;
      font-size: 14px;

      .label {
        color: var(--el-text-color-regular);
        margin-right: 8px;
        font-weight: 400;
      }

      .value {
        color: var(--el-text-color-primary);
        font-weight: 500;
      }
    }

    .meta-separator {
      width: 1px;
      height: 14px;
      background: var(--el-border-color-lighter);
      display: none;
    }
  }
}

.modern-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 24px;
  box-shadow: var(--el-box-shadow-light);

  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 20px;
    letter-spacing: -0.2px;
  }
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px 20px;
  row-gap: 16px;

  &.two-col {
    grid-template-columns: repeat(2, 1fr);
  }

  &.inline {
    .detail-cell {
      flex-direction: row;
      align-items: center;
      gap: 10px;

      .label {
        width: 90px;
        margin-bottom: 0;
      }

      .value {
        flex: 1;
      }
    }
  }

  .detail-cell {
    display: flex;
    flex-direction: column;

    &.wide {
      grid-column: span 2;
    }

    label {
      font-size: 13px;
      color: var(--el-text-color-secondary);
      margin-bottom: 6px;
      font-weight: 400;
    }

    .label {
      font-size: 13px;
      color: var(--el-text-color-secondary);
      margin-bottom: 6px;
      font-weight: 400;
    }

    .value {
      font-size: 15px;
      color: var(--el-text-color-primary);
      font-weight: 500;
      min-height: 22px;

      &.code-font {
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
      }

      .code-font {
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px;
      }

      &.fw-bold {
        font-weight: 600;
      }
    }
  }
}

.code-font {
  font-family: var(--el-font-family-monospace) !important;
}

.cve-link {
  display: inline-flex;
  align-items: center;
  font-weight: 600;
}

.description-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  white-space: pre-wrap;
  word-break: break-all;
}

.tab-content-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px 20px 20px;
  overflow-y: auto;
}
</style>
