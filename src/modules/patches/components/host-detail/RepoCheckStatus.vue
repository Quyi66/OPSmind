<template>
  <span v-if="!check">-</span>
  <div v-else class="repo-check-status">
    <el-tag :type="tagType" size="small">{{ label }}</el-tag>
    <el-popover
      v-if="hasIssues"
      placement="left-start"
      trigger="hover"
      :width="620"
      :show-after="150"
      :popper-style="{ maxWidth: 'calc(100vw - 32px)' }"
    >
      <template #reference>
        <button type="button" class="repo-check-details" aria-label="查看仓库软件包差异详情">
          {{ issueSummary }}
          <el-icon><InfoFilled /></el-icon>
        </button>
      </template>
      <div class="repo-check-popover">
        <div class="repo-check-heading">仓库软件包检查</div>
        <div class="repo-check-scroll">
          <section v-if="missingPkgs.length" class="repo-check-section">
            <div class="repo-check-section-title">
              缺失软件包
              <span>{{ missingPkgs.length }} 个</span>
            </div>
            <div class="repo-check-packages">
              <span v-for="(pkg, index) in missingPkgs" :key="index" class="repo-check-package">
                {{ pkg }}
              </span>
            </div>
          </section>
          <section v-if="outdatedPkgs.length" class="repo-check-section">
            <div class="repo-check-section-title">
              版本过低
              <span>{{ outdatedPkgs.length }} 个</span>
            </div>
            <table class="repo-check-versions">
              <colgroup>
                <col class="repo-check-package-column" />
                <col />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">软件包</th>
                  <th scope="col">所需版本</th>
                  <th scope="col">仓库版本</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(pkg, index) in outdatedPkgs" :key="index">
                  <td>{{ pkg.pkgName || '-' }}</td>
                  <td class="repo-check-version">{{ pkg.requiredVersion || '-' }}</td>
                  <td class="repo-check-version repo-check-version-current">
                    {{ pkg.repoVersion || '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </el-popover>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'

const props = defineProps({
  check: { type: Object, default: null }
})

const missingPkgs = computed(() => props.check?.missingPkgs || [])
const outdatedPkgs = computed(() => props.check?.outdatedPkgs || [])
const hasIssues = computed(
  () =>
    props.check?.status === 'NOT_INSTALLABLE' &&
    (missingPkgs.value.length || outdatedPkgs.value.length)
)
const issueSummary = computed(() => {
  const parts = []
  if (missingPkgs.value.length) parts.push(`缺失 ${missingPkgs.value.length}`)
  if (outdatedPkgs.value.length) parts.push(`版本过低 ${outdatedPkgs.value.length}`)
  return parts.join(' · ')
})

const label = computed(() => {
  if (props.check?.status === 'INSTALLABLE') return '可安装'
  if (props.check?.status === 'NOT_INSTALLABLE') return '不可安装'
  return props.check?.label || '-'
})
const tagType = computed(() => {
  if (props.check?.status === 'INSTALLABLE') return 'success'
  if (props.check?.status === 'NOT_INSTALLABLE') return 'danger'
  return 'info'
})
</script>

<style scoped>
.repo-check-status {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 8px;
  padding: 2px 0;
}

.repo-check-status :deep(.el-tag) {
  max-width: 100%;
  height: auto;
  min-height: 24px;
  padding: 2px 8px;
  font-size: 12px;
  line-height: 20px;
  white-space: normal;
}

.repo-check-details {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--el-text-color-regular);
  font: inherit;
  font-size: 13px;
  line-height: 22px;
  white-space: nowrap;
  cursor: pointer;
}

.repo-check-details:hover,
.repo-check-details:focus-visible {
  color: var(--el-color-primary);
}

.repo-check-details:focus-visible {
  outline: 2px solid var(--el-color-primary-light-5);
  outline-offset: 3px;
  border-radius: 3px;
}

.repo-check-heading {
  margin-bottom: 12px;
  color: var(--el-text-color-primary);
  font-size: 15px;
  font-weight: 600;
}

.repo-check-scroll {
  max-height: 360px;
  overflow-y: auto;
}

.repo-check-section + .repo-check-section {
  margin-top: 16px;
}

.repo-check-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: var(--el-text-color-regular);
  font-size: 14px;
  font-weight: 600;
}

.repo-check-section-title span {
  color: var(--el-text-color-secondary);
  font-weight: 400;
}

.repo-check-packages {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.repo-check-package {
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-size: 14px;
  overflow-wrap: anywhere;
}

.repo-check-versions {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 14px;
  line-height: 1.6;
}

.repo-check-package-column {
  width: 25%;
}

.repo-check-versions th,
.repo-check-versions td {
  padding: 8px 10px;
  text-align: left;
  vertical-align: top;
  overflow-wrap: anywhere;
}

.repo-check-versions th {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

.repo-check-versions td {
  border-bottom: 1px solid var(--el-border-color-lighter);
  color: var(--el-text-color-regular);
}

.repo-check-versions tbody tr:last-child td {
  border-bottom: 0;
}

.repo-check-version {
  font-family: Consolas, Monaco, monospace;
}

.repo-check-versions .repo-check-version-current {
  color: var(--el-color-danger);
}
</style>
