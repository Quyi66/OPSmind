<template>
  <div class="win-kb-detail">
    <div v-if="showBreadcrumb" class="ops-breadcrumb-bar">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item>
          <a @click.prevent="goBack">Windows KB 知识库</a>
        </el-breadcrumb-item>
        <el-breadcrumb-item>{{ kbNumber }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div v-if="loading" v-loading="loading" class="win-kb-detail__loading"></div>

    <div v-else-if="detail" class="win-kb-detail__content">
      <el-tabs v-model="activeTab" class="ops-tabs">
        <el-tab-pane name="basic" label="基本信息">
          <div class="win-kb-detail__scroll">
            <div class="win-kb-card win-kb-card--header">
              <div class="win-kb-detail__title-row">
                <h1>{{ detail.kbNumber || kbNumber }}</h1>
                <el-tag :type="getSeverityTagType(detail.msrcSeverity)" effect="dark">
                  {{ detail.severityLabel || getSeverityLabel(detail.msrcSeverity) }}
                </el-tag>
              </div>
              <p class="win-kb-detail__subtitle">{{ detail.title || '-' }}</p>
            </div>

            <div class="win-kb-card">
              <div class="win-kb-card__title">基本信息</div>
              <div class="win-kb-detail-grid">
                <div class="win-kb-detail-cell">
                  <span>KB 编号</span>
                  <strong>
                    <a
                      v-if="currentKbExternalUrl"
                      :href="currentKbExternalUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="win-kb-external-link"
                      title="打开 Microsoft Support"
                    >
                      {{ detail.kbNumber || kbNumber }}
                    </a>
                    <span v-else>{{ detail.kbNumber || '-' }}</span>
                  </strong>
                </div>
                <div class="win-kb-detail-cell">
                  <span>严重等级</span>
                  <strong>
                    {{ detail.severityLabel || getSeverityLabel(detail.msrcSeverity) }}
                  </strong>
                </div>
                <div class="win-kb-detail-cell">
                  <span>分类</span>
                  <strong>{{ detail.classification || '-' }}</strong>
                </div>
                <div class="win-kb-detail-cell">
                  <span>发布日期</span>
                  <strong>{{ formatDate(detail.publishDate) }}</strong>
                </div>
                <div class="win-kb-detail-cell">
                  <span>大小</span>
                  <strong>{{ formatBytes(detail.sizeBytes) }}</strong>
                </div>
                <div class="win-kb-detail-cell">
                  <span>关联 CVE</span>
                  <strong>{{ detail.totalCves ?? cves.length }}</strong>
                </div>
                <div class="win-kb-detail-cell win-kb-detail-cell--wide">
                  <span>产品</span>
                  <strong>{{ detail.products || '-' }}</strong>
                </div>
              </div>
            </div>

            <div class="win-kb-card">
              <div class="win-kb-card__title">描述</div>
              <div
                class="win-kb-detail__description"
                v-html="renderDescription(detail.description)"
              ></div>
            </div>

            <div class="win-kb-card win-kb-card--relations">
              <div class="win-kb-card__title">补丁取代关系</div>
              <div class="win-kb-relation-grid">
                <div class="win-kb-relation-panel">
                  <div class="win-kb-relation-title">取代此补丁的更新</div>
                  <el-empty
                    v-if="supersededBy.length === 0"
                    description="当前知识库未发现取代此补丁的更新"
                    :image-size="56"
                  />
                  <div v-else class="win-kb-relation-list">
                    <div
                      v-for="item in supersededBy"
                      :key="item.kbNumber || item.title"
                      class="win-kb-relation-link"
                    >
                      <span class="win-kb-relation-link__kb">
                        {{ normalizeKbNumber(item.kbNumber) || item.kbNumber }}
                      </span>
                      <span v-if="item.title" class="win-kb-relation-link__title">
                        {{ item.title }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="win-kb-relation-panel">
                  <div class="win-kb-relation-title">此补丁取代的历史更新</div>
                  <el-empty v-if="supersedes.length === 0" description="无" :image-size="56" />
                  <div v-else class="win-kb-relation-list">
                    <div
                      v-for="item in supersedes"
                      :key="item.kbNumber || item.title"
                      class="win-kb-relation-link"
                    >
                      <span class="win-kb-relation-link__kb">
                        {{ normalizeKbNumber(item.kbNumber) || item.kbNumber }}
                      </span>
                      <span v-if="item.title" class="win-kb-relation-link__title">
                        {{ item.title }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="win-kb-chain" v-if="supersedesChain.length">
                <div class="win-kb-chain__header">
                  <span class="win-kb-chain__label">主要历史替代链</span>
                </div>
                <div class="win-kb-chain__flow">
                  <template v-for="(item, index) in supersedesChain" :key="`${item}-${index}`">
                    <span class="win-kb-chain__node" :class="{ 'is-current': isCurrentKb(item) }">
                      <span class="win-kb-chain__node-kb">
                        {{ normalizeKbNumber(item) || item }}
                      </span>
                      <span v-if="isCurrentKb(item)" class="win-kb-chain__current">当前</span>
                    </span>
                    <span v-if="index < supersedesChain.length - 1" class="win-kb-chain__arrow">
                      →
                    </span>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane name="cves">
          <template #label>
            关联 CVE
            <span class="ops-tab-count" v-if="cves.length">{{ cves.length }}</span>
          </template>
          <div class="win-kb-table-pane">
            <el-table :data="cves" height="100%">
              <el-table-column prop="cveId" label="CVE 编号" width="180">
                <template #default="{ row }">
                  <CveLinkList :cves="[row.cveId]" :url-resolver="getCveUrl" />
                </template>
              </el-table-column>
              <el-table-column label="严重等级" width="110">
                <template #default="{ row }">
                  <el-tag :type="getSeverityTagType(row.severity)" size="small">
                    {{ row.severityLabel || getSeverityLabel(row.severity) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="CVSS" width="90">
                <template #default="{ row }">
                  {{ row.cvss3Score ? Number(row.cvss3Score).toFixed(1) : '-' }}
                </template>
              </el-table-column>
              <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
              <el-table-column prop="products" label="产品" min-width="220" show-overflow-tooltip />
              <el-table-column label="发布日期" width="200">
                <template #default="{ row }">{{ formatDateTime(row.publicDate) }}</template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane name="hosts">
          <template #label>
            受影响主机
            <span class="ops-tab-count" v-if="affectedHostsTotal">{{ affectedHostsTotal }}</span>
          </template>
          <div class="win-kb-table-pane">
            <div class="win-kb-host-summary">
              <el-tag type="danger" effect="plain">待修复 {{ missingHosts }}</el-tag>
              <el-tag effect="plain">总计 {{ affectedHostsTotal }}</el-tag>
            </div>
            <el-table :data="affectedHosts" height="100%" v-loading="hostsLoading">
              <el-table-column label="主机标识" width="160" show-overflow-tooltip>
                <template #default="{ row }">
                  {{ pickValue(row, ['hostKey', 'host_key', 'hostId', 'host_id'], '-') }}
                </template>
              </el-table-column>
              <el-table-column label="系统" min-width="220" show-overflow-tooltip>
                <template #default="{ row }">
                  {{ getHostOsDisplay(row) }}
                </template>
              </el-table-column>
              <el-table-column label="状态" width="130">
                <template #default="{ row }">
                  <el-tag :type="getPatchStatusTagType(row)" size="small">
                    {{ row.patchStatusLabel || getPatchStatusLabel(row) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="扫描时间" width="180">
                <template #default="{ row }">{{ formatDateTime(row.scanDate) }}</template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-empty v-else description="无法获取 KB 详情">
      <el-button v-if="showBreadcrumb" type="primary" @click="goBack">返回列表</el-button>
    </el-empty>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { winKbApi } from '../../../api'
import CveLinkList from '../../../components/common/CveLinkList.vue'
import {
  formatDateTime,
  getPatchStatusLabel,
  getPatchStatusTagType,
  getSeverityLabel,
  getSeverityTagType,
  pickValue
} from '../../utils'

const props = defineProps({
  kbNumber: {
    type: String,
    required: true
  },
  showBreadcrumb: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['back'])

const activeTab = ref('basic')
const loading = ref(false)
const hostsLoading = ref(false)
const detail = ref(null)
const affectedHostsResult = ref(null)

const cves = computed(() => (Array.isArray(detail.value?.cves) ? detail.value.cves : []))
const cveUrlMap = computed(() => {
  const pairs = cves.value
    .map(item => [String(item?.cveId || '').trim(), String(item?.webUrl || '').trim()])
    .filter(([cveId]) => cveId)

  return new Map(pairs)
})
const supersedence = computed(() => detail.value?.supersedence || {})
const supersededBy = computed(() =>
  Array.isArray(supersedence.value.supersededBy) ? supersedence.value.supersededBy : []
)
const supersedes = computed(() =>
  Array.isArray(supersedence.value.supersedes) ? supersedence.value.supersedes : []
)
const supersedesChain = computed(() =>
  Array.isArray(supersedence.value.supersedesChain) ? supersedence.value.supersedesChain : []
)
const currentKbNumber = computed(() => normalizeKbNumber(detail.value?.kbNumber || props.kbNumber))
const currentKbExternalUrl = computed(() =>
  resolveKbSupportUrl(detail.value || {}, currentKbNumber.value)
)
const affectedHosts = computed(() =>
  Array.isArray(affectedHostsResult.value?.hosts) ? affectedHostsResult.value.hosts : []
)
const affectedHostsTotal = computed(() =>
  Number(affectedHostsResult.value?.totalHosts ?? affectedHosts.value.length ?? 0)
)
const missingHosts = computed(() => Number(affectedHostsResult.value?.missingHosts ?? 0))

function formatDate(value) {
  if (!value) return '-'
  return String(value).split('T')[0]
}

function formatBytes(value) {
  const size = Number(value)
  if (!Number.isFinite(size) || size <= 0) return '-'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let current = size
  let index = 0

  while (current >= 1024 && index < units.length - 1) {
    current /= 1024
    index += 1
  }

  return `${current.toFixed(index === 0 ? 0 : 2)} ${units[index]}`
}

function getCveUrl(cveId) {
  const id = String(cveId || '').trim()
  if (!id) return ''

  return (
    cveUrlMap.value.get(id) ||
    `https://msrc.microsoft.com/update-guide/vulnerability/${encodeURIComponent(id)}`
  )
}

function resolveKbSupportUrl(kbDetail, kbNumber) {
  const normalizedKb = normalizeKbNumber(kbNumber)
  const useSearchFallback = shouldUseSupportSearchFallback(kbDetail)
  const supportUrl = [
    'supportUrl',
    'support_url',
    'supportArticleUrl',
    'support_article_url',
    'articleUrl',
    'article_url',
    'moreInfoUrl',
    'more_info_url',
    'webUrl',
    'web_url',
    'kbUrl',
    'kb_url'
  ]
    .map(key => normalizeUrl(kbDetail?.[key]))
    .find(url => isAcceptableMicrosoftSupportUrl(url, normalizedKb, useSearchFallback))

  if (supportUrl) return supportUrl

  return useSearchFallback
    ? buildMicrosoftSupportSearchUrl(normalizedKb)
    : buildMicrosoftSupportHelpUrl(normalizedKb)
}

function normalizeUrl(value) {
  return String(value || '').trim()
}

function isMicrosoftSupportUrl(value) {
  if (!value) return false

  try {
    const url = new URL(value)
    return url.hostname.toLowerCase() === 'support.microsoft.com'
  } catch {
    return false
  }
}

function isAcceptableMicrosoftSupportUrl(value, kbNumber, requireKbInUrl = false) {
  if (!isMicrosoftSupportUrl(value)) return false
  if (!requireKbInUrl) return true

  return hasKbNumberInUrl(value, kbNumber)
}

function hasKbNumberInUrl(value, kbNumber) {
  if (!value || !kbNumber) return false

  try {
    return decodeURIComponent(value).toUpperCase().includes(kbNumber)
  } catch {
    return String(value).toUpperCase().includes(kbNumber)
  }
}

function shouldUseSupportSearchFallback(kbDetail) {
  const text = [
    kbDetail?.title,
    kbDetail?.description,
    kbDetail?.products,
    kbDetail?.classification
  ]
    .map(value => String(value || ''))
    .join(' ')

  return /\b\.NET\b/i.test(text)
}

function buildMicrosoftSupportSearchUrl(kbNumber) {
  return kbNumber
    ? `https://support.microsoft.com/zh-cn/search/results?query=${encodeURIComponent(kbNumber)}`
    : ''
}

function buildMicrosoftSupportHelpUrl(kbNumber) {
  const articleId = String(kbNumber || '').match(/\d+/)?.[0]
  return articleId ? `https://support.microsoft.com/help/${encodeURIComponent(articleId)}` : ''
}

function normalizeKbNumber(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
  if (!normalized) return ''

  const match = normalized.match(/KB\s*\d+/i)
  if (match) {
    return match[0].replace(/\s+/g, '')
  }

  return /^\d+$/.test(normalized) ? `KB${normalized}` : normalized
}

function isCurrentKb(value) {
  return normalizeKbNumber(value) === normalizeKbNumber(detail.value?.kbNumber || props.kbNumber)
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderDescription(value) {
  const content = String(value || '').trim()
  if (!content) return '<p>暂无描述信息。</p>'
  return `<p>${escapeHtml(content).replace(/\n/g, '<br>')}</p>`
}

function getHostOsDisplay(row) {
  return (
    [
      pickValue(row, ['osDistro', 'os_distro'], ''),
      pickValue(row, ['osVersion', 'os_version'], ''),
      pickValue(row, ['osArch', 'os_arch'], '')
    ]
      .filter(Boolean)
      .join(' / ') || '-'
  )
}

async function loadAffectedHosts() {
  hostsLoading.value = true
  affectedHostsResult.value = null

  try {
    const response = await winKbApi.getAffectedHosts(props.kbNumber)
    affectedHostsResult.value = response?.data || response || {}
  } catch (error) {
    console.error('Failed to load Windows KB affected hosts:', error)
    affectedHostsResult.value = null
  } finally {
    hostsLoading.value = false
  }
}

async function loadDetail() {
  loading.value = true
  activeTab.value = 'basic'
  detail.value = null

  try {
    const response = await winKbApi.getKbDetail(props.kbNumber)
    detail.value = response?.data || response || null
    await loadAffectedHosts()
  } catch (error) {
    console.error('Failed to load Windows KB detail:', error)
    ElMessage.error(error?.response?.data?.error || '加载 KB 详情失败')
    detail.value = null
  } finally {
    loading.value = false
  }
}

function goBack() {
  emit('back')
}

watch(
  () => props.kbNumber,
  value => {
    if (value) {
      loadDetail()
    }
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.win-kb-detail {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.win-kb-detail__loading {
  height: 400px;
}

.win-kb-detail__content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ops-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: transparent;

  :deep(.el-tabs__header) {
    flex-shrink: 0;
  }

  :deep(.el-tabs__content) {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  :deep(.el-tab-pane) {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
}

.win-kb-detail__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 4px 20px 0;
}

.win-kb-card {
  padding: 18px 20px;
  margin-bottom: 12px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
  background: var(--el-bg-color);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transition:
    transform 0.2s,
    box-shadow 0.2s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }
}

.win-kb-card--header {
  background: linear-gradient(135deg, var(--el-color-primary-light-9), var(--el-bg-color));
}

.win-kb-card--relations {
  padding-top: 16px;
  padding-bottom: 16px;
}

.win-kb-card__title {
  margin-bottom: 12px;
  color: var(--el-text-color-primary);
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: '';
    width: 3px;
    height: 14px;
    background: var(--el-color-primary);
    border-radius: 2px;
  }
}

.win-kb-relation-title {
  margin-bottom: 10px;
  color: var(--el-text-color-regular);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
}

.win-kb-detail__title-row {
  display: flex;
  align-items: center;
  gap: 12px;

  h1 {
    margin: 0;
    color: var(--el-text-color-primary);
    font-size: 24px;
    line-height: 1.2;
  }
}

.win-kb-detail__subtitle {
  margin: 10px 0 0;
  color: var(--el-text-color-regular);
  font-size: 14px;
}

.win-kb-detail-grid,
.win-kb-relation-grid {
  display: grid;
  gap: 12px 20px;
}

.win-kb-detail-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.win-kb-relation-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.win-kb-card--relations .win-kb-card__title {
  margin-bottom: 6px;
}

.win-kb-card--relations .win-kb-relation-grid {
  gap: 10px 18px;
}

.win-kb-relations-note {
  margin: 0 0 12px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.win-kb-detail-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
  transition: background-color 0.15s;

  &:hover {
    background: var(--el-fill-color);
  }

  span {
    flex-shrink: 0;
    width: 86px;
    color: var(--el-text-color-secondary);
    font-size: 13px;
  }

  strong {
    min-width: 0;
    color: var(--el-text-color-primary);
    font-weight: 500;
    word-break: break-word;
  }
}

.win-kb-detail-cell--wide {
  grid-column: span 3;
}

.win-kb-external-link {
  color: var(--el-color-primary);
  text-decoration: none;

  &::after {
    content: '↗';
    margin-left: 4px;
    font-size: 11px;
    opacity: 0.72;
  }

  &:hover {
    text-decoration: underline;
  }
}

/* v-html 生成的内容不受 scoped 限制，直接选择器即可 */
.win-kb-detail__description {
  color: var(--el-text-color-primary);
  line-height: 1.7;
  word-break: break-word;
  padding: 4px 0;
}

.win-kb-detail__description p {
  margin: 0;
}

.win-kb-relation-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.win-kb-relation-panel {
  min-height: 112px;
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--el-fill-color-light) 55%, transparent);

  :deep(.el-empty) {
    padding: 2px 0 0;
  }

  :deep(.el-empty__description) {
    margin-top: 6px;
  }
}

.win-kb-relation-link {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 32px;
  padding: 6px 10px;
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 6px;
  background: var(--el-color-primary-light-9);
  color: var(--el-text-color-primary);
  line-height: 1.4;
  text-align: left;
  text-decoration: none;
}

.win-kb-relation-link__kb {
  flex-shrink: 0;
  color: var(--el-color-primary);
  font-family: 'SF Mono', 'JetBrains Mono', 'Consolas', monospace;
  font-size: 13px;
  font-weight: 700;
}

.win-kb-relation-link__title {
  min-width: 0;
  overflow: hidden;
  color: var(--el-text-color-regular);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.win-kb-chain {
  margin-top: 12px;
  padding: 12px 14px;
  border: 1px dashed var(--el-color-primary-light-5);
  border-radius: 10px;
  background: linear-gradient(135deg, var(--el-color-primary-light-9), var(--el-fill-color-blank));
}

.win-kb-chain__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.win-kb-chain__label {
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 600;
}

.win-kb-chain__hint {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.win-kb-chain__flow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.win-kb-chain__node {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 4px 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 999px;
  background: var(--el-bg-color);
  color: var(--el-color-primary);
  font-family: 'SF Mono', 'JetBrains Mono', 'Consolas', monospace;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  box-shadow: var(--el-box-shadow-lighter);

  &.is-current {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary);
    color: #fff;
  }
}

.win-kb-chain__current {
  padding: 1px 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  font-family: inherit;
  font-size: 11px;
  font-weight: 500;
}

.win-kb-chain__arrow {
  color: var(--el-color-primary);
  font-size: 18px;
  line-height: 1;
}

@media (max-width: 768px) {
  .win-kb-relation-grid {
    grid-template-columns: 1fr;
  }

  .win-kb-chain__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }
}

.win-kb-table-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.win-kb-host-summary {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.ops-tab-count {
  display: inline-block;
  height: 18px;
  padding: 0 6px;
  margin-left: 4px;
  border-radius: 10px;
  background: var(--el-bg-color-page);
  color: var(--el-text-color-secondary);
  font-size: 11px;
  line-height: 18px;
}
</style>
