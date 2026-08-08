<template>
  <el-dialog
    v-model="visible"
    title="新增 Agent 主机 (纳管接入)"
    width="min(1080px, calc(100vw - 32px))"
    destroy-on-close
    :close-on-click-modal="false"
    class="agent-enroll-dialog"
    @close="handleClose"
  >
    <!-- 自定义步骤条 (与 AgentEnrollDialog 100% 对齐) -->
    <div class="ops-stepper">
      <template v-for="(step, idx) in steps" :key="step.title">
        <div
          class="stepper-item"
          :class="{
            'is-active': activeStep === idx,
            'is-success': activeStep > idx
          }"
        >
          <div class="stepper-icon">
            <i v-if="activeStep > idx" class="fa fa-check"></i>
            <span v-else>{{ idx + 1 }}</span>
          </div>
          <div class="stepper-title">{{ step.title }}</div>
          <div class="stepper-sub">{{ step.sub }}</div>
        </div>
        <div
          v-if="idx < steps.length - 1"
          class="stepper-line"
          :class="{ 'is-active': activeStep > idx }"
        ></div>
      </template>
    </div>

    <!-- 步骤 1：生成凭证与命令 -->
    <div v-if="activeStep === 0" class="step-pane">
      <el-form :model="tokenForm" label-width="110px" class="token-form">
        <el-form-item label="凭据有效期">
          <div class="input-with-unit">
            <el-input-number v-model="tokenForm.ttlMinutes" :min="5" :max="1440" :step="15" style="width: 160px" />
            <span class="unit-text">分钟</span>
          </div>
        </el-form-item>
        <el-form-item label="允许安装次数">
          <div class="input-with-unit">
            <el-input-number v-model="tokenForm.maxUses" :min="1" :max="100" style="width: 160px" />
            <span class="unit-text">次 (单台建议设为 1)</span>
          </div>
        </el-form-item>
        <el-form-item label="备注说明">
          <el-input
            v-model="tokenForm.remark"
            placeholder="例如：财务部办公电脑、机房内网堡垒机"
            style="width: 440px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="generatingToken" @click="generateToken">
            <i class="fa fa-key me-1" /> 生成安装命令
          </el-button>
        </el-form-item>
      </el-form>

      <!-- Token 生成结果展示 (浅色融合风) -->
      <div v-if="installCommand" class="token-result-container">
        <div class="command-header">
          <div class="command-info">
            <span class="status-badge">
              <i class="fa fa-check-circle me-1" />凭证已就绪
            </span>
            <span class="command-label">一键安装 Shell 指令</span>
            <span class="meta-text">
              （有效期至 {{ enrollmentToken?.expiresAt || '未知' }} / 剩余 {{ remainingTokenUses }} 次）
            </span>
          </div>
          <el-button
            type="primary"
            plain
            size="small"
            class="copy-btn"
            @click="copyCommand"
          >
            <el-icon class="me-1"><DocumentCopy /></el-icon> 复制命令
          </el-button>
        </div>

        <div class="code-box">
          <pre class="code-text"><code>{{ installCommand }}</code></pre>
        </div>

        <div class="command-tip">
          <i class="fa fa-info-circle me-1" />
          <span>请在目标终端机器（需 root/sudo 权限）运行上述 Shell 指令，Agent 启动后将自动向平台报到。</span>
        </div>
      </div>
    </div>

    <!-- 步骤 2：轮询待绑定 Agent 候选列表 -->
    <div v-if="activeStep === 1" class="step-pane">
      <div class="polling-status-bar">
        <div class="status-left">
          <el-icon class="is-loading polling-icon"><Loading /></el-icon>
          <div>
            <div class="status-title">正在等待 Agent 机器注册报到...</div>
            <div class="status-sub">系统正在实时获取平台在线候选 Agent 报到管道</div>
          </div>
        </div>
        <el-button size="small" :icon="Refresh" :loading="loadingPending" @click="fetchPendingList">
          手动刷新
        </el-button>
      </div>

      <el-alert
        v-if="tokenStatusMessage"
        class="mt-3"
        :type="tokenStatusType"
        :closable="false"
        show-icon
        :title="tokenStatusMessage"
      />

      <div class="pending-table-wrapper mt-3">
        <el-alert
          type="info"
          :closable="false"
          show-icon
          class="mb-3"
          title="请显式选择本次安装命令对应的 Agent；系统不会自动选择候选机器。"
        />
        <el-table
          v-loading="loadingPending"
          :data="pendingAgents"
          row-key="clientId"
          style="width: 100%"
          height="260px"
          border
          @row-click="handlePendingSelect"
        >
          <el-table-column width="55" align="center" label="选择">
            <template #default="{ row }">
              <el-radio
                :model-value="selectedClient?.clientId"
                :label="row.clientId"
                @change="() => handlePendingSelect(row)"
              >
                <span></span>
              </el-radio>
            </template>
          </el-table-column>
          <el-table-column prop="clientId" label="Client ID" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="font-mono font-bold text-primary">{{ row.clientId }}</span>
            </template>
          </el-table-column>
          <el-table-column label="端点 IP / 主机名" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.hostname || '-' }}<span v-if="row.ip"> / {{ row.ip }}</span>
            </template>
          </el-table-column>
          <el-table-column label="系统 / 版本" min-width="145" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.osInfo || '-' }}<span v-if="row.agentVersion"> / v{{ row.agentVersion }}</span>
            </template>
          </el-table-column>
          <el-table-column label="能力 (Capabilities)" min-width="210">
            <template #default="{ row }">
              <el-tag v-for="cap in parseCapabilities(row.capabilities)" :key="cap" size="small" class="mr-1 mb-1" type="info" effect="plain">
                {{ cap }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="接入打卡状态" width="130" align="center">
            <template #default>
              <el-tag size="small" type="success" effect="light" round>
                <i class="fa fa-dot-circle me-1"></i>在线就绪
              </el-tag>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="pendingAgents.length === 0 && !loadingPending" class="empty-pending-box">
          <i class="fa fa-inbox empty-icon" />
          <p class="empty-text">尚未收到候选 Agent 报到请求</p>
          <p class="empty-sub">请检查目标机器是否成功执行了安装命令并正常联网。</p>
        </div>
      </div>
    </div>

    <!-- 步骤 3：确认绑定资产 -->
    <div v-if="activeStep === 2" class="step-pane">
      <div v-if="bindForm.mode === 'local' && selectedClient" class="agent-preview-card">
        <div class="card-header-bar">
          <i class="fa fa-laptop me-2" />
          <span>已选中的 Candidate Agent</span>
          <el-tag type="success" size="small" class="ms-auto">打卡就绪</el-tag>
        </div>
        <div class="card-grid-body">
          <div class="grid-item">
            <span class="item-label">Client ID：</span>
            <span class="item-value font-mono fw-bold">{{ selectedClient.clientId }}</span>
          </div>
          <div class="grid-item">
            <span class="item-label">端点 IP / 主机：</span>
            <span class="item-value">{{ selectedClient.ip || selectedClient.hostname || '-' }}</span>
          </div>
          <div class="grid-item col-span-2">
            <span class="item-label">已具备能力：</span>
            <span class="item-value">
              <el-tag v-for="cap in parseCapabilities(selectedClient.capabilities)" :key="cap" size="small" class="me-1" type="info" effect="plain">
                {{ cap }}
              </el-tag>
            </span>
          </div>
        </div>
      </div>

      <el-form :model="bindForm" label-width="140px" class="bind-form mt-4" size="default">
        <el-form-item label="纳管模式">
          <el-radio-group v-model="bindForm.mode">
            <el-radio-button value="local">绑定到已有资产档案 (Local)</el-radio-button>
            <el-radio-button value="gateway">跳板代理模式 (Gateway)</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="bindForm.mode === 'gateway'" label="选择在线 Agent" required>
          <AcmDeviceSelector
            v-model="selectedGatewayAgentList"
            :options="{ selector: 'single', selectMode: 'host', label: '选择已纳管且在线的 Agent 主机' }"
          />
          <div v-if="gatewayAgentLoading" class="text-muted mt-2">正在校验 Agent 状态…</div>
          <el-alert
            v-else-if="selectedGatewayAgentList.length"
            class="mt-2"
            :type="isGatewayAgentReady ? 'success' : 'error'"
            :closable="false"
            show-icon
            :title="gatewayAgentStatusText"
          />
        </el-form-item>

        <el-form-item label="选择目标资产" required>
          <div class="asset-select-row">
            <AcmDeviceSelector
              v-model="selectedDeviceList"
              :options="{ selector: 'single', selectMode: 'host', label: '点击选择关联的目标 CMDB 资产档案' }"
            />
            <el-button @click="openAssetImport">导入新资产</el-button>
          </div>
          <div class="form-help">新 Agent 尚无 CMDB 档案时，可先通过现有资产导入流程创建，再返回选择。</div>
        </el-form-item>

        <el-form-item v-if="bindForm.mode === 'gateway'" label="目标主机 IP" required>
          <el-input
            v-model="bindForm.targetIp"
            placeholder="请输入跳板代理目标主机的 IP 地址 (如 192.168.1.100)"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
    </div>

    <!-- 脚部按钮栏 (风格对齐) -->
    <template #footer>
      <div class="dialog-footer flex justify-between items-center">
        <div>
          <el-button v-if="activeStep > 0" @click="activeStep--">上一步</el-button>
        </div>
        <div class="flex gap-2">
          <el-button @click="visible = false">取消</el-button>
          
          <el-button v-if="activeStep === 0" type="primary" :disabled="!installCommand" @click="goToStep2">
            下一步：等待报到
          </el-button>

          <el-button v-if="activeStep === 0" plain @click="openGatewayBinding">
            使用已有 Agent 配置跳板
          </el-button>

          <el-button v-if="activeStep === 1" type="primary" :disabled="!selectedClient" @click="activeStep = 2">
            下一步：确认绑定
          </el-button>

          <el-button v-if="activeStep === 2" type="primary" :loading="submittingBind" @click="submitBind">
            <i class="fa fa-check me-1" /> 确认绑定
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>

  <ImportAssetDialog
    v-model="assetImportVisible"
    :tenant-id="currentTenantId"
    @saved="handleAssetImported"
  />
</template>

<script setup>
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { DocumentCopy, Refresh, Loading } from '@element-plus/icons-vue'
import { agentApi, dataManageApi, getAgentErrorMessage } from '@/modules/asset/api'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import ImportAssetDialog from './ImportAssetDialog.vue'

const selectedDeviceList = ref([])
const selectedGatewayAgentList = ref([])
const gatewayAgentInfo = ref(null)
const gatewayAgentLoading = ref(false)

watch(selectedDeviceList, (val) => {
  if (val && val.length > 0) {
    const item = val[0]
    bindForm.hostId = String(item.hostId || item.host_id || item.id || item.ci_id || item.ciId || item.key || '')
  } else {
    bindForm.hostId = ''
  }
}, { deep: true })

watch(selectedGatewayAgentList, async (val) => {
  const item = val?.[0]
  const hostId = item && String(item.hostId || item.host_id || item.id || item.ci_id || item.ciId || item.key || '')
  bindForm.gatewayAgentHostId = hostId || ''
  gatewayAgentInfo.value = null
  if (!hostId) {
    gatewayAgentLoading.value = false
    return
  }

  gatewayAgentLoading.value = true
  try {
    const result = await agentApi.getHostAgentInfo([hostId])
    const info = Array.isArray(result) ? result.find(entry => String(entry?.hostId) === hostId) : null
    if (bindForm.gatewayAgentHostId === hostId) {
      gatewayAgentInfo.value = info || null
    }
  } catch {
    if (bindForm.gatewayAgentHostId === hostId) {
      gatewayAgentInfo.value = null
    }
  } finally {
    if (bindForm.gatewayAgentHostId === hostId) {
      gatewayAgentLoading.value = false
    }
  }
}, { deep: true })

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const steps = [
  { title: '生成凭证', sub: '生成 Agent 安装 Token' },
  { title: '等待报到', sub: '在目标主机执行并报到' },
  { title: '确认绑定', sub: '关联 CMDB 资产' }
]

const activeStep = ref(0)
const generatingToken = ref(false)
const installCommand = ref('')
const enrollmentToken = ref(null)
const loadingPending = ref(false)
const pendingAgents = ref([])
const selectedClient = ref(null)
const assetImportVisible = ref(false)
const currentTenantId = ref('')
let pollingTimer = null

const tokenForm = reactive({
  ttlMinutes: 60,
  maxUses: 1,
  remark: ''
})

const remainingTokenUses = computed(() => {
  const maxUses = Number(enrollmentToken.value?.maxUses ?? tokenForm.maxUses)
  const usedCount = Number(enrollmentToken.value?.usedCount ?? 0)
  return Math.max(maxUses - usedCount, 0)
})

const effectiveTokenStatus = computed(() => {
  const status = String(enrollmentToken.value?.status || '').toLowerCase()
  const expiresAt = enrollmentToken.value?.expiresAt
  if (expiresAt) {
    const timestamp = Date.parse(String(expiresAt).replace(' ', 'T'))
    if (Number.isFinite(timestamp) && timestamp <= Date.now()) return 'expired'
  }
  return status
})

const tokenStatusMessage = computed(() => {
  const status = effectiveTokenStatus.value
  if (!status || status === 'active') return ''
  if (status === 'exhausted') return '安装凭据已耗尽；仍可绑定已经报到的候选 Agent，但不能继续安装新 Agent。'
  if (status === 'expired') return '安装凭据已过期；如尚无候选 Agent，请返回上一步重新生成。'
  if (status === 'revoked') return '安装凭据已被撤销；如尚无候选 Agent，请返回上一步重新生成。'
  return `安装凭据当前状态：${status}`
})

const tokenStatusType = computed(() => effectiveTokenStatus.value === 'exhausted' ? 'warning' : 'error')

const submittingBind = ref(false)
const bindForm = reactive({
  hostId: '',
  mode: 'local',
  targetIp: '',
  gatewayAgentHostId: ''
})

const isGatewayAgentReady = computed(() => {
  const info = gatewayAgentInfo.value
  return ['koreops_agent', 'agent', 'oplus_agent'].includes(info?.connectionType)
    && info?.agentStatus === 'online'
    && Boolean(info?.agentClientId || info?.clientId)
})

const gatewayAgentStatusText = computed(() => {
  if (isGatewayAgentReady.value) {
    return `Agent 已就绪：${gatewayAgentInfo.value.agentClientId || gatewayAgentInfo.value.clientId}`
  }
  if (!gatewayAgentInfo.value) return '无法读取所选主机的 Agent 信息，请确认其已纳管。'
  if (!['koreops_agent', 'agent', 'oplus_agent'].includes(gatewayAgentInfo.value.connectionType)) {
    return '所选主机不是 Agent 接入主机。'
  }
  if (gatewayAgentInfo.value.agentStatus !== 'online') return '所选 Agent 当前离线，无法作为跳板。'
  return '所选 Agent 缺少 Client ID，无法作为跳板。'
})

const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

const startPolling = () => {
  stopPolling()
  pollingTimer = setInterval(() => {
    if (activeStep.value === 1 && visible.value) {
      fetchPendingList(true)
    } else {
      stopPolling()
    }
  }, 5000)
}

watch(activeStep, (newStep) => {
  if (newStep === 1) {
    startPolling()
  } else {
    stopPolling()
  }
})

const handleClose = () => {
  stopPolling()
  activeStep.value = 0
  installCommand.value = ''
  enrollmentToken.value = null
  selectedClient.value = null
  tokenForm.ttlMinutes = 60
  tokenForm.maxUses = 1
  tokenForm.remark = ''
  bindForm.hostId = ''
  bindForm.mode = 'local'
  bindForm.targetIp = ''
  bindForm.gatewayAgentHostId = ''
  selectedDeviceList.value = []
  selectedGatewayAgentList.value = []
  gatewayAgentInfo.value = null
  assetImportVisible.value = false
}

onUnmounted(() => {
  stopPolling()
})

const generateToken = async () => {
  try {
    generatingToken.value = true
    // 新凭证对应一次新的纳管会话，不能沿用此前轮询时选择的候选 Agent。
    selectedClient.value = null
    pendingAgents.value = []
    const res = await agentApi.createEnrollmentToken({
      ttlMinutes: tokenForm.ttlMinutes,
      maxUses: tokenForm.maxUses,
      remark: tokenForm.remark
    })
    
    const result = res?.data && !res?.token ? res.data : res
    const token = result?.token
    const rawCmd = result?.installCommand
    enrollmentToken.value = {
      ...result,
      maxUses: result?.maxUses ?? tokenForm.maxUses,
      usedCount: result?.usedCount ?? 0
    }
    
    if (rawCmd) {
      installCommand.value = rawCmd
    } else if (token) {
      const server = window.location.origin + '/sjxy-console'
      installCommand.value = `sudo mkdir -p /etc/koreops-agent && sudo curl -ks -o /etc/koreops-agent/ca-bundle.crt ${server}/agent/ca-bundle.crt && export CURL_CA_BUNDLE=/etc/koreops-agent/ca-bundle.crt && export REQUESTS_CA_BUNDLE=/etc/koreops-agent/ca-bundle.crt && export PIP_CERT=/etc/koreops-agent/ca-bundle.crt && curl -fsSLk ${server}/agent/install.sh | sudo -E sh -s -- --token ${token} --server ${server}`
    } else {
      ElMessage.error('签发返回数据异常：缺少 token 和 installCommand，请联系后端确认接口')
      return
    }

    ElMessage.success('凭据及安装命令生成成功！')
  } catch (err) {
    ElMessage.error(getAgentErrorMessage(err, '签发 Token 失败，请检查账号权限'))
  } finally {
    generatingToken.value = false
  }
}

const fallbackCopyText = (text) => {
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    ElMessage.success('一键安装命令已复制到剪贴板')
  } catch (e) {
    ElMessage.warning('自动复制失败，请手动选中代码块复制')
  }
}

const copyCommand = () => {
  if (!installCommand.value) return
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(installCommand.value).then(() => {
      ElMessage.success('一键安装命令已复制到剪贴板')
    }).catch(() => {
      fallbackCopyText(installCommand.value)
    })
  } else {
    fallbackCopyText(installCommand.value)
  }
}

const goToStep2 = () => {
  activeStep.value = 1  // watch(activeStep) 会自动调用 startPolling()
  fetchPendingList()
}

const fetchEnrollmentTokenStatus = async () => {
  const tokenId = enrollmentToken.value?.id || enrollmentToken.value?.tokenId
  if (!tokenId) return
  try {
    const status = await agentApi.getEnrollmentToken(tokenId)
    if (status && typeof status === 'object') {
      enrollmentToken.value = { ...enrollmentToken.value, ...status }
    }
  } catch (error) {
    console.warn('查询 Agent 安装凭据状态失败:', error)
  }
}

const openGatewayBinding = () => {
  bindForm.mode = 'gateway'
  activeStep.value = 2
}

const fetchPendingList = async (isBackground = false) => {
  try {
    if (!isBackground) {
      loadingPending.value = true
    }
    const res = await agentApi.getPendingAgents()
    const list = Array.isArray(res) ? res : (res?.records || res?.data || [])
    pendingAgents.value = list

    // 仅保留用户显式选择的候选项；不能自动切换到另一台待绑定 Agent。
    if (selectedClient.value) {
      const exists = list.find(item => item.clientId === selectedClient.value.clientId)
      if (!exists) {
        selectedClient.value = null
      }
    }
  } catch (err) {
    if (!isBackground) {
      ElMessage.error(getAgentErrorMessage(err, '获取待纳管 Agent 失败'))
    }
  } finally {
    if (!isBackground) {
      loadingPending.value = false
    }
  }
  await fetchEnrollmentTokenStatus()
}

const openAssetImport = async () => {
  if (!currentTenantId.value) {
    try {
      currentTenantId.value = await dataManageApi.getCurrentTenantId()
      if (!currentTenantId.value) {
        ElMessage.error('当前租户信息缺失，不能创建资产')
        return
      }
    } catch (error) {
      ElMessage.error(error?.message || '无法获取当前租户，不能创建资产')
      return
    }
  }
  assetImportVisible.value = true
}

const handleAssetImported = () => {
  selectedDeviceList.value = []
  ElMessage.success('新资产已导入，请重新打开资产选择器并选择刚创建的主机')
}

const handlePendingSelect = (row) => {
  if (row) {
    selectedClient.value = row
  }
}

const parseCapabilities = (caps) => {
  if (!caps) return []
  if (Array.isArray(caps)) return caps
  if (typeof caps === 'string') return caps.split(',').filter(Boolean)
  return []
}

const submitBind = async () => {
  if (bindForm.mode === 'local' && !selectedClient.value) {
    ElMessage.warning('请在第 2 步列表中选中要纳管的 Candidate Agent')
    return
  }
  if (!bindForm.hostId) {
    ElMessage.warning('请选择要关联的目标 CMDB 主机')
    return
  }
  if (bindForm.mode === 'gateway' && !bindForm.targetIp) {
    ElMessage.warning('跳板代理模式下请输入目标主机 IP')
    return
  }
  if (bindForm.mode === 'gateway' && (!isGatewayAgentReady.value || gatewayAgentLoading.value)) {
    ElMessage.warning('请选择一台已纳管且在线的 Agent 主机作为跳板')
    return
  }

  const boundHostId = bindForm.hostId
  try {
    submittingBind.value = true
    if (bindForm.mode === 'gateway') {
      await agentApi.bindAgentGateway({
        clientId: gatewayAgentInfo.value.agentClientId || gatewayAgentInfo.value.clientId,
        hostId: bindForm.hostId,
        targetIp: bindForm.targetIp
      })
    } else {
      await agentApi.bindAgent({
        clientId: selectedClient.value.clientId,
        hostId: bindForm.hostId,
        mode: 'local'
      })
    }
    ElMessage.success('Agent 资产绑定成功！')
    stopPolling()
    visible.value = false
    emit('success', boundHostId)
  } catch (err) {
    ElMessage.error(getAgentErrorMessage(err, '资产绑定失败'))
  } finally {
    submittingBind.value = false
  }
}
</script>

<style scoped>
/* 统一步骤条 (与 AgentEnrollDialog 100% 对齐) */
.ops-stepper {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  margin-bottom: 24px;
  padding: 0 40px;
}

.stepper-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 140px;
  position: relative;
  z-index: 1;
}

.stepper-item .stepper-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: var(--el-bg-color, #ffffff);
  border: 2px solid var(--el-text-color-placeholder, #a8abb2);
  color: var(--el-text-color-placeholder, #a8abb2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 6px;
  transition: all 0.3s;
}

.stepper-item .stepper-title {
  font-size: 13px;
  color: var(--el-text-color-regular, #606266);
  font-weight: 500;
  transition: all 0.3s;
  text-align: center;
  white-space: nowrap;
}

.stepper-item .stepper-sub {
  font-size: 11px;
  color: var(--el-text-color-secondary, #909399);
  margin-top: 2px;
  text-align: center;
}

.stepper-item.is-active .stepper-icon {
  border-color: var(--el-color-primary, #409eff);
  background-color: var(--el-color-primary, #409eff);
  color: #ffffff;
}

.stepper-item.is-active .stepper-title {
  color: var(--el-color-primary, #409eff);
  font-weight: bold;
}

.stepper-item.is-success .stepper-icon {
  border-color: var(--el-color-success, #67c23a);
  color: var(--el-color-success, #67c23a);
  background-color: var(--el-bg-color, #ffffff);
}

.stepper-item.is-success .stepper-title {
  color: var(--el-color-success, #67c23a);
}

.stepper-line {
  flex: 1;
  height: 2px;
  background-color: var(--el-border-color-lighter, #ebeef5);
  margin: 13px -30px 0;
  z-index: 0;
  transition: all 0.3s;
}

.stepper-line.is-active {
  background-color: var(--el-color-success, #67c23a);
}

.step-pane {
  min-height: 310px;
}

/* 步骤 1 */
.input-with-unit {
  display: flex;
  align-items: center;
}

.unit-text {
  margin-left: 8px;
  color: #64748b;
  font-size: 13px;
}

.token-result-container {
  margin-top: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px 16px;
}

.command-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.command-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
  color: #059669;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  padding: 2px 8px;
  border-radius: 12px;
}

.command-label {
  color: #1e293b;
  font-weight: 600;
}

.meta-text {
  color: #64748b;
  font-size: 12px;
}

.code-box {
  background: #ffffff;
  border-radius: 6px;
  padding: 12px 14px;
  max-height: 160px;
  overflow-y: auto;
  border: 1px solid #cbd5e1;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.03);
}

.code-text {
  margin: 0;
  color: #0f172a;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, Monaco, monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.command-tip {
  margin-top: 10px;
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #64748b;
}

.command-tip i {
  color: #0284c7;
}

/* 轮询状态条 */
.polling-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 12px 16px;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.polling-icon {
  font-size: 24px;
  color: #0284c7;
}

.status-title {
  font-size: 14px;
  font-weight: 600;
  color: #0369a1;
}

.status-sub {
  font-size: 12px;
  color: #0284c7;
  margin-top: 2px;
}

.empty-pending-box {
  padding: 40px 0;
  text-align: center;
  color: #94a3b8;
}

.empty-icon {
  font-size: 36px;
  margin-bottom: 8px;
  color: #cbd5e1;
}

.empty-text {
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  margin: 0;
}

.empty-sub {
  font-size: 12px;
  margin-top: 4px;
  color: #94a3b8;
}

/* 步骤 3 确认卡片 */
.agent-preview-card {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  overflow: hidden;
}

.card-header-bar {
  background: #e0f2fe;
  padding: 10px 16px;
  font-weight: 600;
  color: #0369a1;
  display: flex;
  align-items: center;
  font-size: 13px;
}

.card-grid-body {
  padding: 14px 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  font-size: 13px;
}

.col-span-2 {
  grid-column: span 2 / span 2;
}

.item-label {
  color: #64748b;
}

.item-value {
  color: #0f172a;
  font-weight: 500;
}

.font-mono {
  font-family: monospace;
}

.asset-select-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}

.asset-select-row .acm-device-selector {
  flex: 1;
  min-width: 0;
}

.form-help {
  margin-top: 6px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.ms-auto {
  margin-left: auto;
}

.ms-3 { margin-left: 12px; }
.me-1 { margin-right: 4px; }
.me-2 { margin-right: 8px; }
.mr-1 { margin-right: 4px; }
.mb-1 { margin-bottom: 4px; }
.mt-3 { margin-top: 12px; }
.mt-4 { margin-top: 16px; }
.fw-bold { font-weight: 600; }
</style>
