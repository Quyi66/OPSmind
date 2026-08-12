<template>
  <el-drawer
    v-model="visible"
    title="设备详细信息"
    size="55%"
    direction="rtl"
    :close-on-click-modal="true"
    @close="handleClose"
    class="asset-detail-drawer"
  >
    <div v-loading="loading" class="drawer-body">
      <template v-if="!loading && finalDisplayAttrs.length > 0">
        <!-- 头部资产摘要卡片 -->
        <div class="detail-header-card">
          <div class="avatar-area">
            <el-avatar
              :size="48"
              style="
                background-color: var(--el-color-primary-light-9);
                color: var(--el-color-primary);
              "
            >
              <i class="fa fa-server" style="font-size: 20px"></i>
            </el-avatar>
            <div class="title-info">
              <h3>{{ getAttrValue('HOSTNAME') }}</h3>
              <span class="ip-badge">{{ getAttrValue('IP') }}</span>
            </div>
          </div>
        </div>

        <div v-if="isAgentAsset" class="agent-detail-card">
          <el-alert
            v-if="hasAgentIpMismatch(agentInfo)"
            type="error"
            :closable="false"
            show-icon
            class="mb-3"
          >
            <template #title>
              Agent 实际地址与 CMDB 主 IP 不一致，任务下发会被安全闸门阻断。
            </template>
          </el-alert>
          <div class="agent-detail-card__header">
            <span>Agent 接入信息</span>
            <el-tag size="small" :type="agentInfo?.agentStatus === 'online' ? 'success' : 'warning'">
              {{ agentInfo?.agentStatus === 'online' ? '在线' : '离线/未知' }}
            </el-tag>
          </div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="Agent 平台">{{ getAgentPlatformLabel(agentInfo) }}</el-descriptions-item>
            <el-descriptions-item label="Agent 系统">{{ agentInfo?.os || '-' }}</el-descriptions-item>
            <el-descriptions-item label="Client ID">{{ agentInfo?.agentClientId || '-' }}</el-descriptions-item>
            <el-descriptions-item label="纳管模式">{{ agentInfo?.agentMode === 'gateway' ? 'Gateway 跳板' : 'Local 本机' }}</el-descriptions-item>
            <el-descriptions-item label="CMDB 主 IP">{{ getAgentCmdbIp(agentInfo) || '-' }}</el-descriptions-item>
            <el-descriptions-item label="Agent 当前 IP">{{ getAgentReportedIp(agentInfo) || '-' }}</el-descriptions-item>
            <el-descriptions-item label="最近上报">{{ formatAgentTimestamp(agentInfo?.lastReportedAt) }}</el-descriptions-item>
            <el-descriptions-item label="最后在线">{{ formatAgentTimestamp(agentInfo?.lastSeenAt) }}</el-descriptions-item>
          </el-descriptions>
          <div v-if="hasAgentIpMismatch(agentInfo)" class="agent-detail-card__actions">
            <el-button
              v-if="canManageAgents"
              type="danger"
              plain
              size="small"
              :loading="syncingIp"
              @click="syncAssetIp"
            >
              同步资产 IP
            </el-button>
            <span v-else class="agent-detail-card__hint">请联系有 Agent 管理权限的用户同步资产 IP。</span>
          </div>
        </div>

        <!-- 扁平属性表格列表 -->
        <el-descriptions :column="2" border class="detail-descriptions mt-3">
          <el-descriptions-item
            v-for="attr in finalDisplayAttrs"
            :key="attr.code"
            :label="attr.title"
            label-class-name="desc-label"
            class-name="desc-value"
          >
            <el-tag
              v-if="attr.code.toUpperCase() === 'NEEDREBOOT'"
              :type="getAttrValue(attr.code) == 1 ? 'danger' : 'success'"
              size="small"
            >
              {{ getAttrValue(attr.code) == 1 ? '待重启' : '无需重启' }}
            </el-tag>
            <el-tag
              v-else-if="attr.code.toUpperCase() === 'STATUS'"
              :type="getAttrValue(attr.code) == 1 ? 'success' : 'info'"
              size="small"
            >
              {{ getAttrValue(attr.code) == 1 ? '在线' : '离线' }}
            </el-tag>
            <el-tag
              v-else-if="attr.code.toUpperCase() === 'CONN_LATEST_STATUS'"
              :type="String(getAttrValue(attr.code)) === '1' ? 'success' : 'danger'"
              size="small"
            >
              {{ String(getAttrValue(attr.code)) === '1' ? '正常' : '失联' }}
            </el-tag>
            <span v-else class="detail-value">{{ getAttrValue(attr.code) }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </template>
      <el-empty v-else-if="!loading" description="暂无数据" />
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { agentApi, assetApi, getAgentErrorMessage } from '../../api'
import { viewConfigApi } from '@/modules/patches/api'
import { authService } from '@/core/auth'
import {
  formatAgentTimestamp,
  getAgentCmdbIp,
  getAgentPlatformLabel,
  getAgentReportedIp,
  hasAgentIpMismatch
} from '../../utils/agentInfo'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  assetId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const loading = ref(false)
const assetType = ref(null)
const attrValues = ref({})
const agentInfo = ref(null)
const syncingIp = ref(false)

const isAgentAsset = computed(() =>
  ['koreops_agent', 'agent', 'oplus_agent'].includes(agentInfo.value?.connectionType)
)

const canManageAgents = computed(() =>
  authService.hasPermission('agent:manage') ||
  [
    'admin', 'role_admin',
    'privuser', 'role_privuser',
    'developer', 'role_developer',
    'free', 'role_free'
  ].some(role => authService.hasRole(role))
)

// 内置系统属性与后端模型属性合并的备选属性
const defaultAvailableAttrs = [
  { code: 'IP', title: '纳管IP' },
  { code: 'HOSTNAME', title: '主机名' },
  { code: 'OS', title: '系统环境' },
  { code: 'RUN_ENVIRONMENT', title: '运行环境' },
  { code: 'CONN_LATEST_STATUS', title: '连通巡检' },
  { code: 'DEPT_NAME', title: '处置团队' },
  { code: 'APPLICATION_SYSTEM', title: '应用系统' },
  { code: 'HOST_RISK_LEVEL', title: '主机风险等级' },
  { code: 'SSH_PORT', title: 'SSH端口' },
  { code: 'SERVICE_PORT', title: '业务端口' },
  { code: 'OWNER', title: '责任人' },
  { code: 'updated_at', title: '最后同步时间' }
]

const displayAttrs = ref([
  'IP',
  'HOSTNAME',
  'OS',
  'SSH_PORT',
  'SERVICE_PORT',
  'LOCATION',
  'RUN_ENVIRONMENT',
  'APPLICATION_SYSTEM',
  'DEPT_NAME',
  'HOST_RISK_LEVEL'
])

// 扁平化所有属性，构建统一的字典，用于快速查找标题
const allAttrsMap = computed(() => {
  const map = new Map()

  // 1. 系统内置属性
  defaultAvailableAttrs.forEach(attr => {
    map.set(attr.code.toUpperCase(), attr.title)
    map.set(attr.code.toLowerCase(), attr.title)
  })

  // 2. 动态模型属性
  if (assetType.value?.attrs) {
    assetType.value.attrs.forEach(attr => {
      if (attr.code && attr.title) {
        map.set(attr.code.toUpperCase(), attr.title)
        map.set(attr.code.toLowerCase(), attr.title)
      }
    })
  }

  return map
})

function getAttrTitle(code) {
  if (!code) return ''
  return (
    allAttrsMap.value.get(code) ||
    allAttrsMap.value.get(code.toUpperCase()) ||
    allAttrsMap.value.get(code.toLowerCase()) ||
    code
  )
}

function getAttrValue(code) {
  if (!code) return '-'

  // 1. 精确匹配
  if (attrValues.value[code] !== undefined && attrValues.value[code] !== null) {
    return attrValues.value[code]
  }

  // 2. 不区分大小写匹配
  const upper = code.toUpperCase()
  const lower = code.toLowerCase()

  if (attrValues.value[upper] !== undefined && attrValues.value[upper] !== null) {
    return attrValues.value[upper]
  }
  if (attrValues.value[lower] !== undefined && attrValues.value[lower] !== null) {
    return attrValues.value[lower]
  }

  // 3. 针对 OS / 操作系统等特殊字段的容错
  if (upper === 'OS') {
    return attrValues.value.os_distro || attrValues.value.osDistro || attrValues.value.os || '-'
  }

  return '-'
}

// 合并显示属性：自定义配置字段 + 其它所有在模型中定义且未在配置中勾选的属性
const finalDisplayAttrs = computed(() => {
  const result = []
  const addedCodes = new Set()

  // 1. 先加入自定义配置中的属性 (保持用户的配置先后排序)
  displayAttrs.value.forEach(code => {
    if (code) {
      result.push({
        code,
        title: getAttrTitle(code)
      })
      addedCodes.add(code.toUpperCase())
      addedCodes.add(code.toLowerCase())
    }
  })

  // 2. 再加入原始模型中定义、且在自定义配置中未选择的其它所有属性
  if (assetType.value?.attrs) {
    assetType.value.attrs.forEach(attr => {
      if (attr.code && attr.input?.control !== 'hidden') {
        const upperCode = attr.code.toUpperCase()
        const lowerCode = attr.code.toLowerCase()
        if (!addedCodes.has(upperCode) && !addedCodes.has(lowerCode)) {
          result.push({
            code: attr.code,
            title: attr.title || attr.code
          })
          addedCodes.add(upperCode)
          addedCodes.add(lowerCode)
        }
      }
    })
  }

  return result
})

// 加载资产详情
const loadAssetDetail = async () => {
  if (!props.assetId) return

  loading.value = true
  try {
    // 并行请求资产属性值、资产类型定义和自定义视图配置
    const [attrs, typeInfo, viewConfigRes, agentInfoRes] = await Promise.all([
      assetApi.getAssetAttrs(props.assetId),
      assetApi.getAssetTypeByAssetId(props.assetId),
      viewConfigApi.getViewConfig({ ciType: 'host', scope: 'user' }).catch(() => null),
      agentApi.getHostAgentInfo([props.assetId]).catch(() => [])
    ])

    attrValues.value = attrs || {}
    assetType.value = typeInfo
    agentInfo.value = Array.isArray(agentInfoRes) ? agentInfoRes[0] || null : null

    // 解析自定义详情卡片属性，将其展平为单一显示列表
    const data = viewConfigRes?.data || viewConfigRes
    if (data && data.viewJson) {
      let configObj = {}
      if (typeof data.viewJson === 'string') {
        try {
          configObj = JSON.parse(data.viewJson)
        } catch {
          configObj = {}
        }
      } else {
        configObj = data.viewJson
      }
      if (configObj.overviewCard?.groups && configObj.overviewCard.groups.length > 0) {
        const flatAttrs = []
        configObj.overviewCard.groups.forEach(g => {
          if (Array.isArray(g.attrs)) {
            flatAttrs.push(...g.attrs)
          }
        })
        if (flatAttrs.length > 0) {
          displayAttrs.value = Array.from(new Set(flatAttrs))
        }
      }
    }
  } catch (error) {
    console.error('加载资产详情失败:', error)
    ElMessage.error('加载资产详情失败')
  } finally {
    loading.value = false
  }
}

const syncAssetIp = async () => {
  const cmdbIp = getAgentCmdbIp(agentInfo.value)
  const reportedIp = getAgentReportedIp(agentInfo.value)
  if (!reportedIp) {
    ElMessage.warning('Agent 尚未上报可同步的 IP')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确认将该资产的 CMDB 主 IP 从 ${cmdbIp || '-'} 修改为 ${reportedIp}？该地址可能被工单、审计、防火墙策略和 SSH 通道引用。`,
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

  syncingIp.value = true
  try {
    await agentApi.syncAssetIp({
      hostId: props.assetId,
      clientId: agentInfo.value?.agentClientId,
      confirm: true
    })
    ElMessage.success('资产主 IP 已同步')
    await loadAssetDetail()
    emit('saved')
  } catch (error) {
    ElMessage.error(getAgentErrorMessage(error, '同步资产主 IP 失败'))
  } finally {
    syncingIp.value = false
  }
}

// 关闭弹窗
const handleClose = () => {
  visible.value = false
  attrValues.value = {}
  assetType.value = null
  agentInfo.value = null
  syncingIp.value = false
  displayAttrs.value = [
    'IP',
    'HOSTNAME',
    'OS',
    'SSH_PORT',
    'SERVICE_PORT',
    'LOCATION',
    'RUN_ENVIRONMENT',
    'APPLICATION_SYSTEM',
    'DEPT_NAME',
    'HOST_RISK_LEVEL'
  ]
}

// 监听弹窗打开
watch(visible, val => {
  if (val && props.assetId) {
    loadAssetDetail()
  }
})
</script>

<style scoped lang="scss">
.detail-header-card {
  background: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  border: 1px solid var(--el-border-color-lighter);

  .avatar-area {
    display: flex;
    align-items: center;
    gap: 16px;

    .title-info {
      display: flex;
      flex-direction: column;
      gap: 4px;

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--el-text-color-primary);
      }

      .ip-badge {
        font-size: 13px;
        color: var(--el-text-color-secondary);
      }
    }
  }
}

.detail-descriptions {
  :deep(.desc-label) {
    width: 140px;
    font-weight: 500;
    color: var(--el-text-color-regular);
    background-color: var(--el-fill-color-light);
  }

  :deep(.desc-value) {
    color: var(--el-text-color-primary);
  }
}

.agent-detail-card {
  margin-bottom: 20px;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-bg-color);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    font-weight: 600;
  }

  &__actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin-top: 12px;
  }

  &__hint {
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
}

.detail-value {
  font-size: 13px;
  line-height: 1.5;
  word-break: break-all;
}
</style>
