<template>
  <div class="critical-cve-alert">
    <div class="section-header">
      <h3 class="section-title">
        <img :src="cveHeaderIcon" alt="严重漏洞概览" class="section-icon" />
        严重漏洞概览
      </h3>
      <div class="header-actions">
        <button class="more-btn" @click="navigateToCveList" title="查看全部">
          <span>查看全部</span>
          <i class="fas fa-chevron-right more-arrow"></i>
        </button>
      </div>
    </div>

    <div v-loading="loading" class="cve-content" element-loading-text="正在加载严重漏洞数据...">
      <div v-if="!loading && !cveList.length" class="empty-state">
        <i class="fas fa-shield-alt empty-icon"></i>
        <p class="empty-text">暂无严重级别漏洞数据</p>
      </div>

      <template v-else>
        <!-- 列表表头 -->
        <div class="list-header">
          <span class="header-label cve-label">漏洞编号</span>
          <span class="header-label source-label">影响系统</span>
          <span class="header-label affected-label">受影响机器</span>
          <span class="header-label packages-label">受影响软件包</span>
          <span class="header-label score-label">CVSS 评分</span>
        </div>

        <div class="cve-list">
        <el-popover
          v-for="cve in cveList"
          :key="cve.id || cve.cveId"
          placement="right"
          :width="360"
          trigger="hover"
          :show-after="300"
          popper-style="padding: 12px; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); border: 1px solid var(--el-border-color-lighter);"
        >
          <template #reference>
            <div
              class="cve-card"
              @click="navigateToDetail(cve)"
            >
              <div class="cve-card-header">
                <span class="cve-id-badge">{{ cve.cveId }}</span>
                <div class="cve-source-tags">
                  <template v-if="cve.sources && cve.sources.length">
                    <span
                      v-for="src in cve.sources"
                      :key="src"
                      :class="['source-tag', getSourceClass(src)]"
                    >
                      {{ getSourceLabel(src) }}
                    </span>
                  </template>
                  <span v-else-if="cve.source" :class="['source-tag', getSourceClass(cve.source)]">
                    {{ getSourceLabel(cve.source) }}
                  </span>
                </div>
                <!-- 受影响机器数量 -->
                <div class="cve-affected-hosts">
                  <span class="affected-count">{{ cve.affectedHostCount ?? 0 }}</span>
                  <span class="affected-unit">台</span>
                </div>
                <!-- 受影响软件包数量 -->
                <div class="cve-packages">
                  <span class="pkg-count">{{ cve.affectedCount ?? cve.affected_count ?? 0 }}</span>
                  <span class="pkg-unit">个</span>
                </div>
                <div class="cve-score-badge" :style="getScoreStyle(cve.cvss3Score)">
                  <span class="score-value">{{ cve.cvss3Score ? cve.cvss3Score.toFixed(1) : '9.0' }}</span>
                </div>
              </div>
            </div>
          </template>

          <div class="cve-popover-content">
            <div class="popover-header">
              <span class="popover-cve-id">{{ cve.cveId }}</span>
              <span class="popover-score" :style="getScoreStyle(cve.cvss3Score)">
                <span class="score-label">CVSS </span>
                <span class="score-value">{{ cve.cvss3Score ? cve.cvss3Score.toFixed(1) : '9.0' }}</span>
              </span>
            </div>
            <div class="popover-sources">
              <span
                v-for="src in (cve.sources || [cve.source]).filter(Boolean)"
                :key="src"
                :class="['source-tag', getSourceClass(src)]"
              >
                {{ getSourceLabel(src) }}
              </span>
            </div>
            <div class="popover-desc">
              <div class="popover-label">漏洞描述</div>
              <p class="popover-desc-text">{{ cve.description || '暂无详细描述信息' }}</p>
            </div>

            <div class="popover-packages">
              <div class="popover-label">
                <span>软件包状态统计</span>
                <span class="pkg-total">共 {{ cve.totalPackageCount ?? 0 }} 个</span>
              </div>
              <div class="packages-summary-grid">
                <div class="pkg-stat-item is-affected" title="受影响">
                  <span class="pkg-label">受影响</span>
                  <span class="pkg-count">{{ cve.affectedCount ?? 0 }}</span>
                </div>
                <div class="pkg-stat-item is-fixed" title="已修复">
                  <span class="pkg-label">已修复</span>
                  <span class="pkg-count">{{ cve.fixedCount ?? 0 }}</span>
                </div>
                <div class="pkg-stat-item is-not-affected" title="不受影响">
                  <span class="pkg-label">无影响</span>
                  <span class="pkg-count">{{ cve.notAffectedCount ?? 0 }}</span>
                </div>
                <div class="pkg-stat-item is-will-not-fix" title="不予修复">
                  <span class="pkg-label">不修复</span>
                  <span class="pkg-count">{{ cve.willNotFixCount ?? 0 }}</span>
                </div>
                <div class="pkg-stat-item is-fix-deferred" title="延迟修复">
                  <span class="pkg-label">延期</span>
                  <span class="pkg-count">{{ cve.fixDeferredCount ?? 0 }}</span>
                </div>
                <div class="pkg-stat-item is-out-of-support" title="超出支持范围">
                  <span class="pkg-label">超期</span>
                  <span class="pkg-count">{{ cve.outOfSupportCount ?? 0 }}</span>
                </div>
              </div>
            </div>

            <div class="popover-footer">
              <i class="fas fa-mouse-pointer"></i> 点击进入详情页查看补丁及受影响主机
            </div>
          </div>
        </el-popover>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { cveApi } from '@/modules/patches/api'
import { getCveSourceLabel } from '@/modules/patches/composables/useFormatters'

// 标题图标
const cveHeaderIcon = new URL('@/assets/icons/dashboard/icon-patchview@2x.png', import.meta.url).href

const router = useRouter()
const cveList = ref([])
const loading = ref(false)

const loadCveData = async () => {
  loading.value = true
  try {
    const res = await cveApi.getCveList({
      severity: 'critical',
      page: 0,
      size: 20,
      sortBy: 'publicDate',
      sortDir: 'desc'
    })
    const result = res?.data || res
    const rawList = result?.content || []
    // 智能排序优化：优先按受影响机器台数降序排列，受影响台数相同时按 CVSS 评分降序
    cveList.value = [...rawList].sort((a, b) => {
      const countA = Number(a.affectedHostCount) || 0
      const countB = Number(b.affectedHostCount) || 0
      if (countB !== countA) {
        return countB - countA
      }
      const scoreA = Number(a.cvss3Score) || 0
      const scoreB = Number(b.cvss3Score) || 0
      return scoreB - scoreA
    })
  } catch (error) {
    console.error('Failed to fetch critical CVEs:', error)
  } finally {
    loading.value = false
  }
}

const navigateToCveList = () => {
  router.push({ name: 'patches-cveList' })
}

const navigateToDetail = (cve) => {
  router.push({
    name: 'patches-cveList',
    query: {
      view: 'detail',
      cveId: cve.cveId
    }
  })
}

const getSourceLabel = (src) => {
  return getCveSourceLabel(src)
}

const getSourceClass = (src) => {
  const s = String(src || '').toLowerCase()
  if (s.includes('redhat') || s.includes('rhel')) return 'is-redhat'
  if (s.includes('kylin')) return 'is-kylin'
  return 'is-other'
}

const getScoreStyle = (score) => {
  const val = Number(score) || 9.0
  if (val >= 9.5) {
    return {
      background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
      color: '#dc2626',
      border: '1px solid #fca5a5'
    }
  }
  return {
    background: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)',
    color: '#ea580c',
    border: '1px solid #fdba74'
  }
}


onMounted(() => {
  loadCveData()
})
</script>

<style scoped lang="scss">
.critical-cve-alert {
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family:
    'PingFang SC',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    Arial,
    sans-serif;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
  background: transparent;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.section-title .section-icon {
  background: rgba(254, 226, 226, 0.6);
  border-radius: 4px;
  padding: 2px;
}

.header-actions {
  display: flex;
  align-items: center;
}

.more-btn {
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-regular);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.3s ease;

  &:hover {
    background: var(--el-fill-color-light);
    color: var(--el-text-color-primary);

    .more-arrow {
      transform: translateX(2px);
    }
  }

  .more-arrow {
    font-size: 10px;
    transition: transform 0.2s ease;
    display: inline-flex;
    align-items: center;
    line-height: 1;
    margin-top: 1px;
  }
}

.cve-content {
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-placeholder);
  padding: 32px;
}

.empty-icon {
  font-size: 48px;
  opacity: 0.3;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 13px;
  margin: 0;
}

.cve-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--el-border-color-light);
    border-radius: 3px;

    &:hover {
      background: var(--el-text-color-placeholder);
    }
  }
}

.cve-card {
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  padding: 6px 14px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  display: flex;
  flex-direction: column;
  gap: 6px;

  &:nth-child(even) {
    background: var(--el-fill-color-lighter);
  }

  &:hover {
    transform: translateY(-1px);
    border-color: var(--el-color-danger-light-3);
    box-shadow: 0 4px 12px rgba(245, 63, 63, 0.04);
    background: linear-gradient(to right, var(--el-fill-color-blank), rgba(245, 63, 63, 0.02));
  }
}

.cve-card-header {
  display: grid;
  grid-template-columns: 130px 1.5fr 1fr 1fr 70px;
  column-gap: 12px;
  align-items: center;
  width: 100%;
}

.cve-id-badge {
  font-family: 'Courier New', Courier, monospace;
  font-weight: 700;
  font-size: 13px;
  color: var(--el-text-color-primary);
  letter-spacing: 0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}

.cve-source-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}

.cve-affected-hosts {
  display: flex;
  align-items: baseline;
  gap: 2px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  text-align: left;

  .affected-count {
    font-weight: 700;
    color: var(--el-text-color-primary);
  }

  .affected-unit {
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }
}

.cve-packages {
  display: flex;
  align-items: baseline;
  gap: 2px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  text-align: left;

  .pkg-count {
    font-weight: 700;
    color: var(--el-text-color-primary);
  }

  .pkg-unit {
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }
}

.source-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
  background-color: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  color: var(--el-text-color-regular);

  &.is-redhat {
    color: #dc2626;
    background-color: rgba(254, 242, 242, 0.7);
    border-color: rgba(254, 202, 202, 0.5);
  }

  &.is-kylin {
    color: #2563eb;
    background-color: rgba(239, 246, 255, 0.7);
    border-color: rgba(191, 219, 254, 0.5);
  }

  &.is-other {
    color: #4b5563;
    background-color: var(--el-fill-color-lighter);
    border-color: var(--el-border-color-lighter);
  }
}

.cve-score-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  gap: 4px;
  padding: 2px 0;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  animation: pulse-danger 2s ease-in-out infinite;
}

.score-label {
  opacity: 0.8;
}

.score-value {
  font-weight: 700;
}

.cve-card-body {
  margin: 0;
}

.cve-desc {
  font-size: 12px;
  color: var(--el-text-color-regular);
  line-height: 1.4;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cve-popover-content {
  font-family: var(--el-font-family);
  display: flex;
  flex-direction: column;
  gap: 12px;

  .popover-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--el-border-color-lighter);
    padding-bottom: 8px;

    .popover-cve-id {
      font-family: 'Courier New', Courier, monospace;
      font-weight: 700;
      font-size: 14px;
      color: var(--el-text-color-primary);
    }

    .popover-score {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
  }

  .popover-sources {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .popover-desc {
    .popover-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--el-text-color-secondary);
      margin-bottom: 6px;
    }

    .popover-desc-text {
      font-size: 12px;
      line-height: 1.5;
      color: var(--el-text-color-regular);
      margin: 0;
      max-height: 120px;
      overflow-y: auto;
      text-align: justify;
      word-break: break-all;
      padding-right: 4px;

      &::-webkit-scrollbar {
        width: 4px;
      }
      &::-webkit-scrollbar-thumb {
        background: var(--el-border-color-light);
        border-radius: 2px;
      }
    }
  }

  .popover-packages {
    .popover-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--el-text-color-secondary);
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;

      .pkg-total {
        font-size: 11px;
        font-weight: normal;
        color: var(--el-text-color-placeholder);
      }
    }

    .packages-summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin-top: 6px;
    }

    .pkg-stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 6px 4px;
      background: var(--el-fill-color-lighter);
      border-radius: 4px;
      border: 1px solid var(--el-border-color-lighter);
      border-left: 3px solid var(--el-color-info);
      transition: all 0.2s ease;

      &:hover {
        background: var(--el-fill-color-light);
      }

      .pkg-label {
        font-size: 10px;
        color: var(--el-text-color-secondary);
        margin-bottom: 2px;
        line-height: 1.2;
      }

      .pkg-count {
        font-size: 13px;
        font-weight: 700;
        color: var(--el-text-color-primary);
        line-height: 1.2;
      }

      &.is-affected {
        border-left-color: var(--el-color-danger);
        .pkg-count {
          color: var(--el-color-danger);
        }
      }

      &.is-fixed {
        border-left-color: var(--el-color-success);
        .pkg-count {
          color: var(--el-color-success);
        }
      }

      &.is-not-affected {
        border-left-color: var(--el-text-color-placeholder);
        .pkg-count {
          color: var(--el-text-color-regular);
        }
      }

      &.is-will-not-fix {
        border-left-color: #eab308;
        .pkg-count {
          color: #eab308;
        }
      }

      &.is-fix-deferred {
        border-left-color: var(--el-color-warning);
        .pkg-count {
          color: var(--el-color-warning);
        }
      }

      &.is-out-of-support {
        border-left-color: #6b7280;
        .pkg-count {
          color: #6b7280;
        }
      }
    }
  }

  .popover-footer {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    padding: 6px 10px;
    border-radius: 4px;
    margin-top: 4px;
    border-left: 3px solid var(--el-color-primary);

    i {
      font-size: 10px;
    }
  }
}

@media (max-width: 768px) {
  .section-header {
    padding: 10px 12px;
  }

  .cve-list {
    padding: 10px 12px;
  }
}

.list-header {
  display: grid;
  grid-template-columns: 130px 1.5fr 1fr 1fr 70px;
  column-gap: 12px;
  align-items: center;
  padding: 8px 37px 4px 31px;
  background: transparent;
  border-bottom: none;
  flex-shrink: 0;

  .header-label {
    font-size: 11px;
    font-weight: 500;
    color: var(--el-text-color-secondary);
    opacity: 0.8;
    text-align: left;
  }
}

@keyframes pulse-danger {
  0%, 100% { box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04); }
  50% { box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2); }
}
</style>
