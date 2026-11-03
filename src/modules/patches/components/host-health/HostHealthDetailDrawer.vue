<template>
  <el-drawer
    :model-value="modelValue"
    :title="drawerTitle"
    size="780px"
    direction="rtl"
    append-to-body
    destroy-on-close
    :close-on-click-modal="true"
    @update:model-value="val => emit('update:modelValue', val)"
  >
    <div v-if="host" class="drawer-body health-detail-drawer">
      <!-- 基本信息区块 -->
      <div class="ops-section mb-3">
        <div class="ops-section__header">
          <div class="ops-section__title">主机概览</div>
          <el-button
            type="primary"
            size="small"
            plain
            :loading="recheckLoading"
            :disabled="recheckDisabled"
            @click="emit('recheck-host', host)"
          >
            <i class="fas fa-sync-alt me-1" aria-hidden="true"></i>
            重新巡检该主机
          </el-button>
        </div>

        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="主机 IP">
            {{ host.hostIp || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="主机名">
            {{ host.hostname || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="健康状态">
            <el-tag :type="statusMeta.tagType" size="small" round>
              {{ statusMeta.label }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="健康得分">
            {{ formatHostScore(host) }}
          </el-descriptions-item>
          <el-descriptions-item label="操作系统" :span="2">
            {{ host.os || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="最近巡检时间" :span="2">
            {{ formatHealthDateTime(host.checkTime) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 风险提示区块 -->
      <div class="ops-section mb-3">
        <div class="ops-section__header">
          <div class="ops-section__title">
            风险提示
            <el-tag
              v-if="host.risks && host.risks.length"
              type="warning"
              size="small"
              round
              class="ms-2"
            >
              {{ host.risks.length }} 项
            </el-tag>
          </div>
        </div>

        <el-empty
          v-if="host.status === 'UNCHECKED'"
          description="该主机纳管后尚未巡检，请点击上方「重新巡检该主机」发起巡检"
          :image-size="64"
        />
        <el-alert
          v-else-if="host.status === 'UNREACHABLE' && (!host.risks || !host.risks.length)"
          title="主机不可达或巡检脚本执行失败（0 分，不计入平均分）"
          type="info"
          show-icon
          :closable="false"
        />
        <el-alert
          v-else-if="!host.risks || !host.risks.length"
          title="当前主机全部检查项正常，无风险提示"
          type="success"
          show-icon
          :closable="false"
        />
        <ul v-else class="risk-item-list">
          <li v-for="(riskText, idx) in host.risks" :key="idx" class="risk-item">
            <i class="fas fa-exclamation-circle risk-item-icon" aria-hidden="true"></i>
            <span>{{ riskText }}</span>
          </li>
        </ul>
      </div>

      <!-- 检查项明细区块 -->
      <div class="ops-section">
        <div class="ops-section__header">
          <div class="ops-section__title">
            检查项明细
            <el-tag size="small" type="info" round class="ms-2">
              {{ filteredItems.length }} / {{ enrichedItems.length }} 项
            </el-tag>
          </div>
          <el-radio-group v-model="levelFilter" size="small">
            <el-radio-button label="ALL">全部 ({{ enrichedItems.length }})</el-radio-button>
            <el-radio-button label="ABNORMAL">
              异常 ({{ abnormalCount }})
            </el-radio-button>
            <el-radio-button label="NORMAL">
              正常 ({{ enrichedItems.length - abnormalCount }})
            </el-radio-button>
          </el-radio-group>
        </div>

        <div class="ops-table-wrapper">
          <el-table :data="filteredItems" style="width: 100%">
            <el-table-column prop="name" label="检查项" min-width="170" show-overflow-tooltip />
            <el-table-column prop="value" label="当前值" min-width="110" show-overflow-tooltip />
            <el-table-column prop="level" label="状态" width="95">
              <template #default="{ row }">
                <el-tag :type="getHealthItemLevelMeta(row.level).tagType" size="small" round>
                  {{ getHealthItemLevelMeta(row.level).label }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              prop="threshold"
              label="告警 / 严重阈值"
              min-width="130"
              show-overflow-tooltip
            />
            <el-table-column prop="deduction" label="扣分标准" width="95" show-overflow-tooltip />
            <template #empty>
              <el-empty
                :description="
                  host.status === 'UNCHECKED' ? '尚未生成检查项记录' : '暂无匹配的检查项数据'
                "
                :image-size="60"
              />
            </template>
          </el-table>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  getHealthStatusMeta,
  getHealthItemLevelMeta,
  formatHealthDateTime,
  formatHostScore,
  enrichAndSortCheckItems
} from '../../utils/hostHealth'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  host: {
    type: Object,
    default: null
  },
  recheckLoading: {
    type: Boolean,
    default: false
  },
  recheckDisabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'recheck-host'])

const levelFilter = ref('ALL')

watch(
  () => props.host?.hostId,
  () => {
    levelFilter.value = 'ALL'
  }
)

const drawerTitle = computed(() => {
  if (!props.host) return '主机健康巡检详情'
  const ip = props.host.hostIp || ''
  const name = props.host.hostname ? ` (${props.host.hostname})` : ''
  return `主机健康巡检详情 — ${ip}${name}`
})

const statusMeta = computed(() => getHealthStatusMeta(props.host?.status))

const enrichedItems = computed(() => enrichAndSortCheckItems(props.host?.items || []))

const abnormalCount = computed(
  () => enrichedItems.value.filter(item => item.level !== 'NORMAL').length
)

const filteredItems = computed(() => {
  if (levelFilter.value === 'ABNORMAL') {
    return enrichedItems.value.filter(item => item.level !== 'NORMAL')
  }
  if (levelFilter.value === 'NORMAL') {
    return enrichedItems.value.filter(item => item.level === 'NORMAL')
  }
  return enrichedItems.value
})
</script>

<style scoped lang="scss">
.risk-item-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.risk-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--el-color-warning-light-9);
  border: 1px solid var(--el-color-warning-light-7);
  color: var(--el-text-color-primary);
  font-size: 13px;
  line-height: 1.5;
}

.risk-item-icon {
  color: var(--el-color-warning);
  margin-top: 3px;
  flex-shrink: 0;
}
</style>
