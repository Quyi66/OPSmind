<template>
  <el-drawer
    v-model="dialogVisible"
    title="软件包详情"
    size="880px"
    destroy-on-close
    class="rpm-package-detail-drawer"
  >
    <div v-loading="loading" class="rpm-package-detail">
      <template v-if="loading || hasDetail">
        <el-descriptions :column="2" border size="small" class="detail-descriptions">
          <el-descriptions-item label="包名">
            {{ normalizedDetail.name || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="来源">
            {{ normalizedDetail.source || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="架构">
            {{ normalizedDetail.architecture || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="版本">
            {{ versionText }}
          </el-descriptions-item>
          <el-descriptions-item label="摘要" :span="2">
            {{ normalizedDetail.summary || '-' }}
          </el-descriptions-item>
          <el-descriptions-item
            label="RPM 路径"
            :span="2"
            v-if="normalizedDetail.source !== 'ubuntu'"
          >
            <span class="mono-text">{{ normalizedDetail.rpmPath || '-' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            <div class="pre-wrap">{{ normalizedDetail.description || '暂无描述信息' }}</div>
          </el-descriptions-item>
        </el-descriptions>

        <section class="detail-section">
          <h4 class="detail-section__title">关联服务</h4>
          <div v-if="normalizedDetail.services.length" class="service-list">
            <el-tag v-for="service in normalizedDetail.services" :key="service" size="small">
              {{ service }}
            </el-tag>
          </div>
          <span v-else class="service-empty-text">暂无关联服务</span>
        </section>

        <section
          v-loading="changelogLoading"
          class="detail-section detail-section--changelog"
        >
          <div class="detail-section__header">
            <h4 class="detail-section__title">Changelog</h4>
            <span v-if="parsedChangelog.isStructured" class="detail-section__meta">
              {{ filteredEntryCount }} / {{ changelogEntryCount }} 条记录
            </span>
          </div>
          <template v-if="parsedChangelog.isStructured">
            <div class="changelog-search">
              <el-input
                v-model="searchKeyword"
                placeholder="搜索 Changelog..."
                clearable
                size="small"
                :prefix-icon="SearchIcon"
              />
            </div>
            <div class="changelog-list-container">
              <div v-if="pagedChangelogEntries.length" class="changelog-list">
                <article
                  v-for="(entry, entryIndex) in pagedChangelogEntries"
                  :key="`${entry.header || 'entry'}-${entryIndex}`"
                  class="changelog-entry"
                  :class="{ 'changelog-entry--intro': !entry.header }"
                >
                  <div v-if="entry.header" class="changelog-entry__header">
                    <div class="changelog-entry__summary">
                      <div
                        v-if="entry.dateText"
                        class="changelog-entry__date"
                        v-html="highlightText(entry.dateText, searchKeyword)"
                      ></div>
                      <div v-if="entry.maintainer || entry.email" class="changelog-entry__author">
                        <span
                          v-if="entry.maintainer"
                          v-html="highlightText(entry.maintainer, searchKeyword)"
                        ></span>
                        <span v-if="entry.email" class="changelog-entry__email">
                          &lt;
                          <span v-html="highlightText(entry.email, searchKeyword)"></span>
                          &gt;
                        </span>
                      </div>
                      <div
                        v-else
                        class="changelog-entry__headline"
                        v-html="highlightText(entry.headline || entry.header, searchKeyword)"
                      ></div>
                    </div>
                    <span
                      v-if="entry.version"
                      class="changelog-entry__version"
                      v-html="highlightText(entry.version, searchKeyword)"
                    ></span>
                  </div>
                  <div v-if="entry.notes.length" class="changelog-entry__notes">
                    <p
                      v-for="(note, noteIndex) in entry.notes"
                      :key="noteIndex"
                      class="changelog-entry__note"
                      v-html="highlightText(note, searchKeyword)"
                    ></p>
                  </div>
                  <ul v-if="entry.items.length" class="changelog-entry__items">
                    <li
                      v-for="(item, itemIndex) in entry.items"
                      :key="itemIndex"
                      class="changelog-entry__item pre-wrap"
                      v-html="highlightText(item, searchKeyword)"
                    ></li>
                  </ul>
                </article>
              </div>
              <span v-else class="service-empty-text">无匹配的 Changelog 记录</span>
            </div>
            <div v-if="filteredTotalEntries > pageSize" class="ops-pagination-wrapper mt-4">
              <el-pagination
                v-model:current-page="currentPage"
                :page-size="pageSize"
                :total="filteredTotalEntries"
                layout="prev, pager, next"
                size="small"
                background
              />
            </div>
          </template>
          <div
            v-else
            class="detail-section__content changelog-raw pre-wrap mono-text"
            v-html="
              highlightText(changelogContent || changelogStatusText, searchKeyword)
            "
          ></div>
        </section>
      </template>

      <el-empty v-else description="暂无 RPM 包详情" :image-size="80" />
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Search as SearchIcon } from '@element-plus/icons-vue'
import {
  buildRpmChangelogFileUrl,
  extractRpmPackageChangelog,
  formatRpmVersion,
  getRpmChangelogVersionCandidates,
  normalizeRpmPackageDetail,
  parseRpmChangelog
} from '../../utils/rpmPackageInfo'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  detailData: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const normalizedDetail = computed(() => normalizeRpmPackageDetail(props.detailData))
const changelogContent = ref('')
const changelogStatusText = ref('暂无 changelog 信息')
const changelogLoading = ref(false)
const changelogFileCache = new Map()
const parsedChangelog = computed(() => parseRpmChangelog(changelogContent.value))
const changelogEntryCount = computed(
  () => parsedChangelog.value.entries.filter(entry => entry.header).length
)

const currentPage = ref(1)
const pageSize = ref(10)
const searchKeyword = ref('')

async function fetchChangelogFile(url) {
  if (!changelogFileCache.has(url)) {
    const request = fetch(url, { credentials: 'same-origin' })
      .then(async response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const contentType = String(response.headers.get('content-type') || '').toLowerCase()
        const content = await response.text()
        if (contentType.includes('text/html') && /<(?:!doctype\s+html|html)\b/i.test(content)) {
          throw new Error('Changelog file resolved to the SPA entry')
        }

        return content
      })
      .catch(error => {
        changelogFileCache.delete(url)
        throw error
      })

    changelogFileCache.set(url, request)
  }

  return changelogFileCache.get(url)
}

let changelogRequestId = 0

watch(
  () => [
    dialogVisible.value,
    props.loading,
    normalizedDetail.value.source,
    normalizedDetail.value.currentPackage,
    normalizedDetail.value.completePackageName,
    normalizedDetail.value.pkgId,
    normalizedDetail.value.installedPkg,
    normalizedDetail.value.name,
    normalizedDetail.value.version,
    normalizedDetail.value.release,
    normalizedDetail.value.architecture
  ],
  async ([visible, detailLoading], _previousValue, onCleanup) => {
    const requestId = ++changelogRequestId
    let cancelled = false
    onCleanup(() => {
      cancelled = true
    })

    changelogContent.value = ''
    changelogLoading.value = false
    changelogStatusText.value = '暂无 changelog 信息'

    if (!visible || detailLoading) return

    const detail = normalizedDetail.value
    const fileUrl = buildRpmChangelogFileUrl(detail.source)
    if (!fileUrl) {
      changelogStatusText.value = '缺少有效的软件包来源，无法加载 Changelog'
      return
    }

    const versionCandidates = getRpmChangelogVersionCandidates(detail)
    if (!versionCandidates.length) {
      changelogStatusText.value = '缺少 currentPackage 或版本信息，无法匹配 Changelog'
      return
    }

    changelogLoading.value = true
    try {
      const fullChangelog = await fetchChangelogFile(fileUrl)
      if (cancelled || requestId !== changelogRequestId) return

      const matchedChangelog = extractRpmPackageChangelog(fullChangelog, detail)
      if (matchedChangelog) {
        changelogContent.value = matchedChangelog
        changelogStatusText.value = ''
      } else {
        const packageVersion = versionCandidates[0]
        changelogStatusText.value = `未在 ${detail.source}.txt 中找到版本 ${packageVersion} 对应的 Changelog`
      }
    } catch (error) {
      if (cancelled || requestId !== changelogRequestId) return
      console.error(`Failed to load changelog file ${fileUrl}:`, error)
      changelogStatusText.value = `加载 ${detail.source}.txt 失败`
    } finally {
      if (!cancelled && requestId === changelogRequestId) {
        changelogLoading.value = false
      }
    }
  },
  { immediate: true }
)

function entryMatchesKeyword(entry, keyword) {
  const lowerKeyword = keyword.toLowerCase()
  if (entry.header && entry.header.toLowerCase().includes(lowerKeyword)) return true
  if (entry.headline && entry.headline.toLowerCase().includes(lowerKeyword)) return true
  if (entry.version && entry.version.toLowerCase().includes(lowerKeyword)) return true
  if (entry.maintainer && entry.maintainer.toLowerCase().includes(lowerKeyword)) return true
  if (entry.email && entry.email.toLowerCase().includes(lowerKeyword)) return true
  if (entry.dateText && entry.dateText.toLowerCase().includes(lowerKeyword)) return true
  if (entry.notes && entry.notes.some(n => n.toLowerCase().includes(lowerKeyword))) return true
  if (entry.items && entry.items.some(i => i.toLowerCase().includes(lowerKeyword))) return true
  return false
}

const filteredChangelogEntries = computed(() => {
  if (!parsedChangelog.value.isStructured) return []
  const entries = parsedChangelog.value.entries
  const keyword = searchKeyword.value.trim()
  if (!keyword) return entries
  return entries.filter(entry => entryMatchesKeyword(entry, keyword))
})

const filteredTotalEntries = computed(() => filteredChangelogEntries.value.length)
const filteredEntryCount = computed(
  () => filteredChangelogEntries.value.filter(entry => entry.header).length
)

const pagedChangelogEntries = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredChangelogEntries.value.slice(start, end)
})

watch(searchKeyword, () => {
  currentPage.value = 1
  setTimeout(() => {
    const firstHighlight = document.querySelector('.rpm-package-detail .search-highlight')
    if (firstHighlight) {
      firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else {
      const drawerBody = document.querySelector('.rpm-package-detail-drawer .el-drawer__body')
      if (drawerBody) {
        drawerBody.scrollTop = 0
      }
    }
  }, 100)
})

watch(currentPage, () => {
  setTimeout(() => {
    const drawerBody = document.querySelector('.rpm-package-detail-drawer .el-drawer__body')
    if (drawerBody) {
      drawerBody.scrollTop = 0
    }
  }, 100)
})

watch(dialogVisible, visible => {
  if (visible) {
    currentPage.value = 1
    searchKeyword.value = ''
    setTimeout(() => {
      const drawerBody = document.querySelector('.rpm-package-detail-drawer .el-drawer__body')
      if (drawerBody) {
        drawerBody.scrollTop = 0
      }
    }, 150)
  }
})

const versionText = computed(() => formatRpmVersion(normalizedDetail.value))

const hasDetail = computed(() => {
  const detail = normalizedDetail.value
  return Boolean(
    detail.name ||
    detail.summary ||
    detail.description ||
    changelogContent.value ||
    detail.rpmPath ||
    detail.services.length
  )
})

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function highlightText(text, keyword) {
  if (!text) return ''
  const str = String(text)
  const trimKeyword = keyword ? keyword.trim() : ''
  if (!trimKeyword) {
    return escapeHtml(str)
  }

  const escapedKeyword = trimKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedKeyword})`, 'gi')
  const parts = str.split(regex)

  return parts
    .map(part => {
      if (part.toLowerCase() === trimKeyword.toLowerCase()) {
        return `<mark class="search-highlight">${escapeHtml(part)}</mark>`
      }
      return escapeHtml(part)
    })
    .join('')
}
</script>

<style scoped lang="scss">
.rpm-package-detail {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.detail-descriptions {
  margin-bottom: 16px;
}

.detail-section {
  margin-top: 16px;
  flex-shrink: 0;
}

.detail-section--changelog {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 300px;
  overflow: visible;
}

:deep(mark.search-highlight) {
  background-color: rgba(230, 162, 60, 0.2);
  color: var(--el-color-warning);
  padding: 0 2px;
  border-radius: 2px;
  font-weight: bold;
}

.changelog-search {
  position: sticky;
  top: -20px;
  z-index: 10;
  background: var(--el-bg-color, var(--el-fill-color-blank, #fff));
  padding: 8px 0;
  margin-top: -8px;
  margin-bottom: 12px;
}
.detail-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.detail-section__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.detail-section__meta {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.detail-section__content {
  padding: 12px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-regular);
  line-height: 1.6;
}

.pre-wrap {
  white-space: pre-wrap;
  word-break: break-word;
}

.mono-text {
  font-family: Consolas, 'Courier New', monospace;
}
.changelog-list-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.changelog-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.changelog-entry {
  position: relative;
  padding: 14px 16px 14px 18px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: linear-gradient(
    180deg,
    var(--el-fill-color-blank) 0%,
    var(--el-fill-color-light) 100%
  );
}

.changelog-entry::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  border-radius: 8px 0 0 8px;
  background: var(--el-color-primary-light-5);
}

.changelog-entry--intro::before {
  background: var(--el-color-info-light-5);
}

.changelog-entry__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.changelog-entry__summary {
  min-width: 0;
}

.changelog-entry__date {
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.6;
}

.changelog-entry__author {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.changelog-entry__email {
  font-family: Consolas, 'Courier New', monospace;
}

.changelog-entry__headline {
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.6;
}

.changelog-entry__version {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 12px;
  line-height: 20px;
}

.changelog-entry__notes {
  margin-bottom: 10px;
}

.changelog-entry__note {
  margin: 0;
  color: var(--el-text-color-regular);
  line-height: 1.7;
}

.changelog-entry__note + .changelog-entry__note {
  margin-top: 6px;
}

.changelog-entry__items {
  margin: 0;
  padding-left: 18px;
  color: var(--el-text-color-regular);
}

.changelog-entry__item {
  line-height: 1.7;
}

.changelog-entry__item + .changelog-entry__item {
  margin-top: 6px;
}

.changelog-raw {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.service-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.service-empty-text {
  display: block;
  padding: 12px 0;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
  text-align: center;
}
</style>

<style lang="scss">
.el-drawer__header {
  margin-bottom: 0;
}
</style>
