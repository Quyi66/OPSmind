<template>
  <el-drawer
    v-model="visible"
    title="Agent 接入体检"
    size="85%"
    append-to-body
    destroy-on-close
    class="agent-health-drawer"
    @closed="handleClosed"
  >
    <div class="agent-health-content">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="接入体检会核对 CMDB 资产主 IP 与 Agent 实际执行地址。存在错位的主机在修正前会被任务下发安全闸门阻断。"
      />

      <div class="ops-action-bar">
        <div class="health-summary">
          <span>当前发现</span>
          <strong>{{ rows.length }}</strong>
          <span>台路由错位主机</span>
        </div>
        <span class="action-spacer" />
        <!-- <el-button size="small" @click="goToAssetList">
          <i class="fa fa-server me-1" />设备清单
        </el-button> -->
        <el-button type="primary" size="small" :loading="loading" @click="loadMismatches">
          <i class="fa fa-sync-alt me-1" />重新体检
        </el-button>
      </div>

      <el-alert
        v-if="loadError"
        type="error"
        :closable="false"
        show-icon
        class="mb-3"
        :title="loadError"
      />

      <div class="ops-table-wrapper card-table health-table-wrapper">
        <el-table
          v-loading="loading"
          :data="rows"
          border
          row-key="ciId"
          height="100%"
        >
          <el-table-column label="资产" min-width="180">
            <template #default="{ row }">
              <div class="asset-cell">
                <strong>{{ row.hostname || '-' }}</strong>
                <span>{{ row.ciId || '-' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="错位类型" width="120" align="center">
            <template #default="{ row }">
              <el-tag type="danger" size="small">{{ row.kind || 'IP_MISMATCH' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="地址对比" min-width="210">
            <template #default="{ row }">
              <div class="ip-comparison">
                <span>CMDB：{{ row.cmdbIp || '-' }}</span>
                <i class="fa fa-long-arrow-alt-right" />
                <strong>实际执行：{{ row.effectiveIp || '-' }}</strong>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="Agent" min-width="180">
            <template #default="{ row }">
              <div class="agent-cell">
                <span>Client ID：{{ row.clientId || '-' }}</span>
                <span>模式：{{ formatAgentMode(row.agentMode) }}</span>
                <span>最后在线：{{ formatAgentTimestamp(row.lastSeenAt) }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="判断依据" min-width="360">
            <template #default="{ row }">
              <pre class="mismatch-message">{{ row.message || '-' }}</pre>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="210" fixed="right">
            <template #default="{ row }">
              <el-button
                v-if="canManageAgents"
                text
                type="danger"
                size="small"
                :loading="syncingId === row.ciId"
                @click="syncAssetIp(row)"
              >
                同步资产 IP
              </el-button>
              <el-button text type="primary" size="small" @click="goToAssetEdit(row)">
                去资产详情修改
              </el-button>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="未发现 Agent 路由错位，当前接入关系正常" />
          </template>
        </el-table>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { agentApi, getAgentErrorMessage } from '../../api'
import { authService } from '@/core/auth'
import { formatAgentTimestamp } from '../../utils/agentInfo'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'synced'])
const router = useRouter()
const rows = ref([])
const loading = ref(false)
const loadError = ref('')
const syncingId = ref('')
let requestSequence = 0

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const canManageAgents = computed(() =>
  authService.hasPermission('agent:manage') ||
  [
    'admin', 'role_admin',
    'privuser', 'role_privuser',
    'developer', 'role_developer',
    'free', 'role_free'
  ].some(role => authService.hasRole(role))
)

const formatAgentMode = mode => mode === 'gateway' ? 'Gateway 跳板' : 'Local 本机'

const loadMismatches = async () => {
  const sequence = ++requestSequence
  loading.value = true
  loadError.value = ''
  try {
    const result = await agentApi.getRouteMismatches()
    if (sequence === requestSequence && visible.value) {
      rows.value = Array.isArray(result) ? result : []
    }
  } catch (error) {
    if (sequence === requestSequence && visible.value) {
      rows.value = []
      loadError.value = getAgentErrorMessage(error, 'Agent 接入体检失败')
    }
  } finally {
    if (sequence === requestSequence) {
      loading.value = false
    }
  }
}

const syncAssetIp = async row => {
  try {
    await ElMessageBox.confirm(
      `确认将资产“${row.hostname || row.ciId}”的 CMDB 主 IP 从 ${row.cmdbIp || '-'} 修改为 ${row.effectiveIp || '-'}？该地址可能被工单、审计、防火墙策略和 SSH 通道引用。`,
      '同步资产主 IP',
      {
        confirmButtonText: '确认同步',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }

  syncingId.value = row.ciId
  try {
    await agentApi.syncAssetIp({
      hostId: row.ciId,
      clientId: row.clientId,
      confirm: true
    })
    ElMessage.success('资产主 IP 已同步')
    emit('synced', row.ciId)
    await loadMismatches()
  } catch (error) {
    ElMessage.error(getAgentErrorMessage(error, '同步资产主 IP 失败'))
  } finally {
    syncingId.value = ''
  }
}

const goToAssetEdit = row => {
  visible.value = false
  router.push({
    name: 'acm-info',
    query: { assetId: row.ciId, action: 'edit' }
  })
}

const goToAssetList = () => {
  visible.value = false
  if (router.currentRoute.value.name !== 'acm-info') {
    router.push({ name: 'acm-info' })
  }
}

const handleClosed = () => {
  requestSequence += 1
  rows.value = []
  loadError.value = ''
  loading.value = false
  syncingId.value = ''
}

watch(visible, open => {
  if (open) loadMismatches()
})
</script>

<style scoped lang="scss">
.agent-health-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 14px;
}

.health-summary {
  display: flex;
  align-items: baseline;
  gap: 6px;
  color: var(--el-text-color-regular);

  strong {
    color: var(--el-color-danger);
    font-size: 20px;
  }
}

.action-spacer {
  flex: 1;
}

.health-table-wrapper {
  flex: 1;
  min-height: 0;
}

.asset-cell,
.agent-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;

  span {
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
}

.ip-comparison {
  display: flex;
  flex-direction: column;
  gap: 5px;

  i,
  strong {
    color: var(--el-color-danger);
  }
}

.mismatch-message {
  margin: 0;
  color: var(--el-text-color-regular);
  font: inherit;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

:global(.agent-health-drawer .el-drawer__body) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
