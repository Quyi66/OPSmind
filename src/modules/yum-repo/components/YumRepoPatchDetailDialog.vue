<template>
  <el-dialog
    v-model="visibleModel"
    title="补丁详情"
    width="1080px"
    destroy-on-close
    append-to-body
  >
    <div class="win-patch-yum-detail-dialog">
      <el-descriptions :column="3" border>
        <el-descriptions-item label="补丁 ID">
          {{ pickValue(currentPatch, ['patchId', 'patch_id'], '-') }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="small" :type="getPatchSatisfiedTagType(currentPatch)">
            {{ getPatchSatisfiedLabel(currentPatch) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="严重等级">
          <el-tag size="small" effect="plain" :type="getSeverityTagType(pickValue(currentPatch, ['severity'], ''))">
            {{ getSeverityLabel(pickValue(currentPatch, ['severity'], '-')) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="影响主机">
          {{ affectedHostCount }}
        </el-descriptions-item>
        <el-descriptions-item label="总包数">
          {{ pickValue(currentPatch, ['totalPkgs', 'total_pkgs'], 0) }}
        </el-descriptions-item>
        <el-descriptions-item label="满足">
          {{ pickValue(currentPatch, ['availableCount', 'available_count'], 0) }}
        </el-descriptions-item>
        <el-descriptions-item label="缺失">
          {{ pickValue(currentPatch, ['missingCount', 'missing_count'], 0) }}
        </el-descriptions-item>
        <el-descriptions-item label="版本不足">
          {{ pickValue(currentPatch, ['outdatedCount', 'outdated_count'], 0) }}
        </el-descriptions-item>
        <el-descriptions-item label="发行版不匹配">
          {{ pickValue(currentPatch, ['releaseMismatchCount', 'release_mismatch_count'], 0) }}
        </el-descriptions-item>
        <el-descriptions-item label="补丁标题" :span="2">
          {{ pickValue(currentPatch, ['patchTitle', 'patch_title'], '-') }}
        </el-descriptions-item>
      </el-descriptions>

      <div class="win-patch-yum-detail-dialog__section">
        <div class="win-patch-yum-detail-dialog__section-title">
          {{ affectedHosts.length ? `影响主机列表（${affectedHosts.length} 台）` : '影响主机列表' }}
        </div>
        <el-empty v-if="!affectedHosts.length" description="当前未返回影响主机明细" :image-size="72" />
        <div v-else class="win-patch-yum-detail-dialog__host-list">
          <el-tag
            v-for="host in affectedHosts"
            :key="resolveHostId(host) || resolveHostKey(host)"
            effect="plain"
            class="win-patch-yum-detail-dialog__host-tag"
          >
            {{ resolveHostKey(host) }}
          </el-tag>
        </div>
      </div>

      <div class="win-patch-yum-detail-dialog__section">
        <div class="win-patch-yum-detail-dialog__section-title">
          {{ failedPackages.length ? `不满足包明细（${failedPackages.length} 项）` : '不满足包明细' }}
        </div>
        <el-empty v-if="!failedPackages.length" description="该补丁当前没有不满足包" :image-size="72" />
        <div v-else class="ops-table-wrapper">
          <el-table :data="failedPackages" size="small" border max-height="calc(100vh - 520px)">
            <el-table-column label="包名" min-width="160" show-overflow-tooltip>
              <template #default="{ row }">
                {{ pickValue(row, ['pkgName', 'pkg_name'], '-') }}
              </template>
            </el-table-column>
            <el-table-column label="差异类型" width="120" align="center">
              <template #default="{ row }">
                <el-tag :type="getDiffTypeTagType(row)" size="small">
                  {{ getDiffTypeLabel(row) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="要求版本" min-width="260" show-overflow-tooltip>
              <template #default="{ row }">
                {{ pickValue(row, ['requiredNevra', 'required_nevra'], '-') }}
              </template>
            </el-table-column>
            <el-table-column label="基线版本" min-width="260" show-overflow-tooltip>
              <template #default="{ row }">
                {{ pickValue(row, ['baselineNevra', 'baseline_nevra'], '-') }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import {
  getSeverityLabel,
  getSeverityTagType,
  normalizeBoolean,
  pickValue,
  resolveHostId,
  resolveHostKey
} from '@/modules/patches/windows-patch/utils.js'
import { getDiffTypeLabel, getDiffTypeTagType } from '../utils'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  patch: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const visibleModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const currentPatch = computed(() => props.patch || {})

const affectedHosts = computed(() => {
  const value = pickValue(currentPatch.value, ['affectedHosts', 'affected_hosts'], [])
  return Array.isArray(value) ? value : []
})

const affectedHostCount = computed(() => {
  if (affectedHosts.value.length) {
    return affectedHosts.value.length
  }

  return pickValue(currentPatch.value, ['affectedHostCount', 'affected_host_count'], 0)
})

const failedPackages = computed(() => {
  const value = pickValue(currentPatch.value, ['failedPackages', 'failed_packages'], [])
  return Array.isArray(value) ? value : []
})

function getPatchSatisfiedTagType(row) {
  return normalizeBoolean(pickValue(row, ['satisfied'], false)) ? 'success' : 'danger'
}

function getPatchSatisfiedLabel(row) {
  return normalizeBoolean(pickValue(row, ['satisfied'], false)) ? '满足' : '不满足'
}
</script>

<style scoped lang="scss">
.win-patch-yum-detail-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.win-patch-yum-detail-dialog__section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.win-patch-yum-detail-dialog__host-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.win-patch-yum-detail-dialog__host-tag {
  max-width: 100%;
}

.win-patch-yum-detail-dialog__section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
</style>
