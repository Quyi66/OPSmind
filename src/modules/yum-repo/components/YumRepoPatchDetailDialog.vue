<template>
  <el-dialog
    v-model="visibleModel"
    :title="t('yumRepo.patchDetails')"
    width="1080px"
    destroy-on-close
    append-to-body
    :close-on-click-modal="true"
  >
    <div class="win-patch-yum-detail-dialog">
      <el-descriptions :column="3" border>
        <el-descriptions-item :label="t('yumRepo.patchId')">
          {{ pickValue(currentPatch, ['patchId', 'patch_id'], '-') }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('common.status')">
          <el-tag size="small" :type="getPatchSatisfiedTagType(currentPatch)">
            {{ getPatchSatisfiedLabel(currentPatch) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item :label="t('yumRepo.severity')">
          <el-tag
            size="small"
            effect="plain"
            :type="getSeverityTagType(pickValue(currentPatch, ['severity'], ''))"
          >
            {{ getSeverityLabel(pickValue(currentPatch, ['severity'], '-')) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item :label="t('yumRepo.affectedHosts')">
          {{ affectedHostCount }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('yumRepo.totalPackages')">
          {{ pickValue(currentPatch, ['totalPkgs', 'total_pkgs'], 0) }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('yumRepo.satisfied')">
          {{ pickValue(currentPatch, ['availableCount', 'available_count'], 0) }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('yumRepo.missing')">
          {{ pickValue(currentPatch, ['missingCount', 'missing_count'], 0) }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('yumRepo.outdated')">
          {{ pickValue(currentPatch, ['outdatedCount', 'outdated_count'], 0) }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('yumRepo.releaseMismatch')">
          {{ pickValue(currentPatch, ['releaseMismatchCount', 'release_mismatch_count'], 0) }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('yumRepo.patchTitle')" :span="2">
          {{ pickValue(currentPatch, ['patchTitle', 'patch_title'], '-') }}
        </el-descriptions-item>
      </el-descriptions>

      <div class="win-patch-yum-detail-dialog__section">
        <div class="win-patch-yum-detail-dialog__section-title">
          {{ affectedHosts.length ? t('yumRepo.affectedHostCount', { count: affectedHosts.length }) : t('yumRepo.affectedHostList') }}
        </div>
        <el-empty
          v-if="!affectedHosts.length"
          :description="t('yumRepo.noHostDetails')"
          :image-size="72"
        />
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
          {{
            failedPackages.length ? t('yumRepo.unsatisfiedPackageCount', { count: failedPackages.length }) : t('yumRepo.unsatisfiedPackages')
          }}
        </div>
        <el-empty
          v-if="!failedPackages.length"
          :description="t('yumRepo.noUnsatisfiedPackages')"
          :image-size="72"
        />
        <div v-else class="ops-table-wrapper">
          <el-table :data="failedPackages" size="small" border max-height="calc(100vh - 520px)">
            <el-table-column :label="t('yumRepo.packageName')" min-width="160" show-overflow-tooltip>
              <template #default="{ row }">
                {{ pickValue(row, ['pkgName', 'pkg_name'], '-') }}
              </template>
            </el-table-column>
            <el-table-column :label="t('yumRepo.diffType')" width="120" align="center">
              <template #default="{ row }">
                <el-tag :type="getDiffTypeTagType(row)" size="small">
                  {{ getDiffTypeLabel(row) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="t('yumRepo.requiredVersion')" min-width="260" show-overflow-tooltip>
              <template #default="{ row }">
                {{ pickValue(row, ['requiredNevra', 'required_nevra'], '-') }}
              </template>
            </el-table-column>
            <el-table-column :label="t('yumRepo.baselineVersion')" min-width="260" show-overflow-tooltip>
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
import { t } from '@/core/i18n'

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
  return normalizeBoolean(pickValue(row, ['satisfied'], false)) ? t('yumRepo.satisfied') : t('yumRepo.unsatisfied')
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
