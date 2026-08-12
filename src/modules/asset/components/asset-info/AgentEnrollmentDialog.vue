<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
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
      <el-alert
        v-if="isReenrollMode"
        class="mb-3"
        type="warning"
        :closable="false"
        show-icon
        title="这里会为已选资产签发新凭据。请在目标机执行后端返回的安装命令，Agent 会用新凭据完成重新注册。"
      />
      <el-form :model="tokenForm" label-width="110px" class="token-form">
        <el-form-item label="目标操作系统" required>
          <el-radio-group v-model="tokenForm.targetOs">
            <el-radio-button :value="AGENT_TARGET_OS.LINUX">麒麟 / RHEL 系</el-radio-button>
            <el-radio-button :value="AGENT_TARGET_OS.UBUNTU">Ubuntu</el-radio-button>
            <el-radio-button :value="AGENT_TARGET_OS.DEBIAN">Debian</el-radio-button>
            <el-radio-button :value="AGENT_TARGET_OS.WINDOWS">Windows</el-radio-button>
          </el-radio-group>
          <div class="form-help full-width">
            目标系统会随凭据一并提交，由后端返回对应平台的完整安装命令。
          </div>
        </el-form-item>
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
            <span class="command-label">{{ installCommandLabel }}</span>
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
          <span>{{ installCommandTip }}</span>
        </div>

        <el-alert
          v-if="[AGENT_TARGET_OS.UBUNTU, AGENT_TARGET_OS.DEBIAN].includes(tokenForm.targetOs)"
          class="mt-3"
          type="warning"
          :closable="false"
          show-icon
          title="当前平台证书为自签叶子证书，Ubuntu / Debian 的 OpenSSL 不接受，因此下载和 Agent 通信暂时使用 HTTP；平台换发内网 CA 证书后可统一切回 HTTPS。"
        />

        <div v-if="tokenForm.targetOs === AGENT_TARGET_OS.WINDOWS" class="windows-downloads mt-3">
          <div class="windows-downloads__title">离线安装文件（后端产物发布前链接可能暂不可用）</div>
          <div class="windows-downloads__actions">
            <el-link :href="agentArtifactUrls.windowsAgent" target="_blank" type="primary">
              koreops-agent.exe
            </el-link>
            <el-link :href="agentArtifactUrls.windowsInstaller" target="_blank" type="primary">
              install.ps1
            </el-link>
            <el-link :href="agentArtifactUrls.windowsAgentSha256" target="_blank" type="primary">
              SHA256
            </el-link>
          </div>
          <div class="form-help">请以管理员身份运行 PowerShell；未签名版本可能触发 SmartScreen 或 EDR 拦截。</div>
        </div>

        <div
          v-if="tokenForm.targetOs !== AGENT_TARGET_OS.WINDOWS && caInstallCommand"
          class="ca-command mt-3"
        >
          <div class="command-header">
            <div class="command-info">
              <span class="command-label">平台 CA 严格校验命令（正式环境推荐）</span>
            </div>
            <el-button type="primary" plain size="small" @click="copyCaCommand">
              <el-icon class="me-1"><DocumentCopy /></el-icon> 复制 CA 命令
            </el-button>
          </div>
          <div class="code-box">
            <pre class="code-text"><code>{{ caInstallCommand }}</code></pre>
          </div>
        </div>

        <el-alert
          v-if="tokenForm.targetOs !== AGENT_TARGET_OS.WINDOWS"
          class="mt-3"
          type="info"
          :closable="false"
          show-icon
          title="若手工运行 Agent 报 requests is required，请执行 /opt/koreops-agent/venv/bin/pip install requests paramiko，然后重启 koreops-agent 服务。"
        />
      </div>
    </div>

    <!-- 步骤 2：轮询待绑定 Agent 候选列表 -->
    <div v-if="activeStep === 1" class="step-pane">
      <div class="polling-status-bar">
        <div class="status-left">
          <el-icon v-if="isTokenUsable" class="is-loading polling-icon"><Loading /></el-icon>
          <i v-else class="fa fa-exclamation-circle polling-invalid-icon" />
          <div>
            <div class="status-title">{{ isTokenUsable ? '正在等待 Agent 机器注册报到...' : '当前安装凭据已停止轮询' }}</div>
            <div class="status-sub">{{ isTokenUsable ? '系统正在实时获取平台在线候选 Agent 报到管道' : '请返回上一步重新生成凭据后再继续安装' }}</div>
          </div>
        </div>
        <el-button size="small" :icon="Refresh" :loading="loadingPending" :disabled="!isTokenUsable" @click="fetchPendingList">
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

      <el-alert
        class="mt-3"
        type="info"
        :closable="false"
        show-icon
        title="当前接口返回本租户全部待绑定候选 Agent，后端暂未支持按本次凭据过滤；请结合 Client ID、主机名和 IP 核对后再选择。"
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
          <p class="empty-sub">请按下面的顺序在目标机器排查，不要只验证安装脚本是否下载成功。</p>
          <div class="troubleshooting-list">
            <div>1. 确认安装命令完整执行，且最终退出码为 0。</div>
            <template v-if="tokenForm.targetOs === AGENT_TARGET_OS.WINDOWS">
              <div>2. 以管理员身份检查 Windows 服务，并查看服务事件日志。</div>
              <div class="diagnostic-command-row">
                <code>sc query KoreOpsAgent</code>
                <el-button text type="primary" size="small" @click="copyDiagnosticCommand('sc query KoreOpsAgent')">复制</el-button>
              </div>
            </template>
            <template v-else>
              <div>2. 检查服务是否存在并正在运行。</div>
              <div class="diagnostic-command-row">
                <code>{{ linuxStatusCommand }}</code>
                <el-button text type="primary" size="small" @click="copyDiagnosticCommand(linuxStatusCommand)">复制</el-button>
              </div>
              <div>3. 查看最近日志，重点关注凭据、依赖和证书错误。</div>
              <div class="diagnostic-command-row">
                <code>{{ linuxLogCommand }}</code>
                <el-button text type="primary" size="small" @click="copyDiagnosticCommand(linuxLogCommand)">复制</el-button>
              </div>
            </template>
          </div>
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
          <div class="mode-description-list full-width">
            <div :class="{ 'is-active': bindForm.mode === 'local' }">
              <strong>Local：</strong>这台机器自己安装了 Agent，将它与自己的 CMDB 资产档案绑定。
            </div>
            <div :class="{ 'is-active': bindForm.mode === 'gateway' }">
              <strong>Gateway：</strong>使用一台已在线 Agent 作为跳板，管理另一台未安装 Agent 的机器。
            </div>
          </div>
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
          <el-alert
            v-if="!selectedDeviceList.length"
            class="mt-2 full-width"
            type="info"
            :closable="false"
            show-icon
            title="Agent 报到不会自动创建资产档案。没有可选主机时，请先点击“导入新资产”，导入完成后重新打开选择器。"
          />
        </el-form-item>

        <el-form-item v-if="bindForm.mode === 'gateway'" label="目标主机 IP" required>
          <el-input
            v-model="bindForm.targetIp"
            placeholder="请输入跳板代理目标主机的 IP 地址 (如 192.168.1.100)"
            style="width: 100%"
          />
          <div class="form-help full-width">
            这里填写的是要通过跳板管理的目标机器 IP，不是当前跳板 Agent 所在机器的 IP。
          </div>
          <el-alert
            v-if="gatewayTargetMatchesAgentIp"
            class="mt-2 full-width"
            type="warning"
            :closable="false"
            show-icon
            title="目标主机 IP 与所选 Agent 的 IP 相同；如果是为 Agent 所在机器自身纳管，请改用 Local 模式。"
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
          
          <el-button v-if="activeStep === 0" type="primary" :disabled="!installCommand || !isTokenUsable" @click="goToStep2">
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
import {
  AGENT_TARGET_OS,
  getAgentArtifactUrls,
  getEnrollmentCaInstallCommand,
  getEnrollmentInstallCommand,
  getAgentTargetOsLabel,
  resolveAgentConsoleBaseUrl
} from '@/modules/asset/utils/agentInstallCommand'
import { AGENT_PLATFORM, getAgentPlatform } from '@/modules/asset/utils/agentInfo'
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
  },
  initialAsset: {
    type: Object,
    default: null
  },
  mode: {
    type: String,
    default: 'enroll'
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isReenrollMode = computed(() => props.mode === 'reenroll')
const dialogTitle = computed(() => isReenrollMode.value
  ? '重新纳管 Agent'
  : '新增 Agent 主机 (纳管接入)')

const steps = [
  { title: '生成凭证', sub: '生成 Agent 安装 Token' },
  { title: '等待报到', sub: '在目标主机执行并报到' },
  { title: '确认绑定', sub: '关联 CMDB 资产' }
]

const activeStep = ref(0)
const generatingToken = ref(false)
const enrollmentToken = ref(null)
const loadingPending = ref(false)
const pendingAgents = ref([])
const selectedClient = ref(null)
const assetImportVisible = ref(false)
const currentTenantId = ref('')
let pollingTimer = null

const tokenForm = reactive({
  targetOs: AGENT_TARGET_OS.LINUX,
  ttlMinutes: 60,
  maxUses: 1,
  remark: ''
})

const agentConsoleBaseUrl = computed(() => resolveAgentConsoleBaseUrl({
  // 开发服务器用代理目标；正式部署必须使用用户实际访问的平台地址，不能泄露/依赖构建机内网地址。
  backendUrl: import.meta.env.DEV ? import.meta.env.VITE_BACKEND_URL : '',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  locationOrigin: window.location.origin
}))

const installCommand = computed(() => getEnrollmentInstallCommand(enrollmentToken.value))
const caInstallCommand = computed(() => getEnrollmentCaInstallCommand(enrollmentToken.value))

const agentArtifactUrls = computed(() =>
  getAgentArtifactUrls(agentConsoleBaseUrl.value)
)

const installCommandLabel = computed(() => tokenForm.targetOs === AGENT_TARGET_OS.WINDOWS
  ? '一键安装 PowerShell 指令'
  : `一键安装 Shell 指令（${getAgentTargetOsLabel(tokenForm.targetOs)}）`)

const installCommandTip = computed(() => tokenForm.targetOs === AGENT_TARGET_OS.WINDOWS
  ? '请在目标机器上以管理员身份运行上述 PowerShell 指令，服务启动后 Agent 会自动向平台报到。'
  : '请在目标机器上使用具备 root/sudo 权限的账号运行上述命令，Agent 启动后将自动向平台报到。')

const linuxStatusCommand = 'systemctl status koreops-agent --no-pager'
const linuxLogCommand = 'journalctl -u koreops-agent -n 40 --no-pager'

const remainingTokenUses = computed(() => {
  const remainingUses = Number(enrollmentToken.value?.remainingUses)
  if (Number.isFinite(remainingUses)) return Math.max(remainingUses, 0)
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

const isTokenUsable = computed(() => {
  const status = effectiveTokenStatus.value
  return (!status || status === 'active') && remainingTokenUses.value > 0
})

const tokenStatusMessage = computed(() => {
  const status = effectiveTokenStatus.value
  if (isTokenUsable.value) return ''
  if (status === 'exhausted' || remainingTokenUses.value === 0) {
    return '这张凭证已不可用（剩余次数为 0），轮询已停止，请回上一步重新生成。'
  }
  if (status === 'expired') return '这张凭证已过期，轮询已停止，请回上一步重新生成。'
  if (status === 'revoked') return '这张凭证已被撤销，轮询已停止，请回上一步重新生成。'
  return `这张凭证已不可用（状态：${status || '未知'}），请回上一步重新生成。`
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

const normalizeIp = value => String(value || '').trim().toLowerCase()

const gatewayAgentIp = computed(() => {
  const selected = selectedGatewayAgentList.value?.[0] || {}
  const info = gatewayAgentInfo.value || {}
  return normalizeIp(
    info.lastReportedIp || info.last_reported_ip || info.ip ||
    selected.lastReportedIp || selected.last_reported_ip || selected.ip || selected.IP ||
    selected.hostKey || selected.host_key
  )
})

const gatewayTargetMatchesAgentIp = computed(() => {
  const targetIp = normalizeIp(bindForm.targetIp)
  return Boolean(targetIp && gatewayAgentIp.value && targetIp === gatewayAgentIp.value)
})

const inferTargetOs = asset => {
  return getAgentPlatform(asset) === AGENT_PLATFORM.WINDOWS
    ? AGENT_TARGET_OS.WINDOWS
    : AGENT_TARGET_OS.LINUX
}

const normalizeInitialAsset = asset => {
  if (!asset) return null
  const id = asset.hostId || asset.host_id || asset.id || asset.ci_id || asset.ciId || asset.key
  if (!id) return null
  return {
    ...asset,
    key: String(id),
    value: asset.value || asset.IP || asset.ip || asset.hostname || String(id),
    assetType: asset.assetType || asset.asset_type || asset.ciType || asset.ci_type || 'linux'
  }
}

const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

const startPolling = () => {
  stopPolling()
  if (!isTokenUsable.value) return
  pollingTimer = setInterval(() => {
    if (activeStep.value === 1 && visible.value && isTokenUsable.value) {
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

watch(isTokenUsable, usable => {
  if (!usable) {
    stopPolling()
  } else if (activeStep.value === 1 && visible.value) {
    startPolling()
  }
})

watch(() => tokenForm.targetOs, targetOs => {
  const issuedTargetOs = enrollmentToken.value?.targetOs
  if (enrollmentToken.value && issuedTargetOs && issuedTargetOs !== targetOs) {
    enrollmentToken.value = null
    selectedClient.value = null
    pendingAgents.value = []
    stopPolling()
    ElMessage.info('目标系统已切换，请重新生成对应平台的安装命令')
  }
})

watch(visible, open => {
  if (!open) return
  const initialAsset = normalizeInitialAsset(props.initialAsset)
  if (initialAsset) {
    selectedDeviceList.value = [initialAsset]
    tokenForm.targetOs = inferTargetOs(initialAsset)
    if (isReenrollMode.value && !tokenForm.remark) {
      tokenForm.remark = `重新纳管：${initialAsset.value}`
    }
  }
}, { immediate: true })

const handleClose = () => {
  stopPolling()
  activeStep.value = 0
  enrollmentToken.value = null
  pendingAgents.value = []
  loadingPending.value = false
  selectedClient.value = null
  tokenForm.ttlMinutes = 60
  tokenForm.maxUses = 1
  tokenForm.remark = ''
  tokenForm.targetOs = AGENT_TARGET_OS.LINUX
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
      remark: tokenForm.remark,
      targetOs: tokenForm.targetOs
    })
    
    const result = res?.data && !res?.token ? res.data : res
    enrollmentToken.value = {
      ...result,
      targetOs: result?.targetOs || tokenForm.targetOs,
      maxUses: result?.maxUses ?? tokenForm.maxUses,
      usedCount: result?.usedCount ?? 0
    }
    
    if (!getEnrollmentInstallCommand(enrollmentToken.value)) {
      ElMessage.error('签发返回数据异常：缺少 installCommand，请联系后端确认接口')
      return
    }

    ElMessage.success('凭据及安装命令生成成功！')
  } catch (err) {
    ElMessage.error(getAgentErrorMessage(err, '签发 Token 失败，请检查账号权限'))
  } finally {
    generatingToken.value = false
  }
}

const fallbackCopyText = (text, successMessage) => {
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    ElMessage.success(successMessage)
  } catch {
    ElMessage.warning('自动复制失败，请手动选中代码块复制')
  }
}

const copyText = (text, successMessage = '内容已复制到剪贴板') => {
  if (!text) return
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      ElMessage.success(successMessage)
    }).catch(() => {
      fallbackCopyText(text, successMessage)
    })
  } else {
    fallbackCopyText(text, successMessage)
  }
}

const copyCommand = () => copyText(installCommand.value, '一键安装命令已复制到剪贴板')
const copyCaCommand = () => copyText(caInstallCommand.value, 'CA 校验安装命令已复制到剪贴板')
const copyDiagnosticCommand = command => copyText(command, '排查命令已复制到剪贴板')

const goToStep2 = () => {
  if (!isTokenUsable.value) {
    ElMessage.warning('这张凭证已不可用，请重新生成')
    return
  }
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
  if (!isTokenUsable.value) {
    stopPolling()
    return
  }
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

const handleAssetImported = importedAsset => {
  const normalizedAsset = normalizeInitialAsset(importedAsset)
  selectedDeviceList.value = normalizedAsset ? [normalizedAsset] : []
  ElMessage.success(normalizedAsset
    ? '新资产已导入并自动选中'
    : '新资产已导入，资产列表会在下次打开选择器时刷新，请选择刚创建的主机')
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
    ElMessage.warning('请选择目标 CMDB 主机；Agent 报到不会自动创建资产档案')
    return
  }
  if (bindForm.mode === 'gateway' && !bindForm.targetIp) {
    ElMessage.warning('Gateway 模式需要目标主机 IP，用于指定要由跳板 Agent 管理的另一台机器')
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

.windows-downloads {
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-fill-color-lighter);
}

.windows-downloads__title {
  margin-bottom: 8px;
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 600;
}

.windows-downloads__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.ca-command {
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-fill-color-lighter);
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

.polling-invalid-icon {
  color: var(--el-color-danger);
  font-size: 24px;
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

.troubleshooting-list {
  max-width: 720px;
  margin: 16px auto 0;
  padding: 14px 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-regular);
  font-size: 12px;
  line-height: 1.7;
  text-align: left;
}

.diagnostic-command-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 4px 0 8px;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--el-bg-color);
}

.diagnostic-command-row code {
  overflow-wrap: anywhere;
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

.full-width {
  width: 100%;
}

.mode-description-list {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.7;
}

.mode-description-list .is-active {
  color: var(--el-text-color-primary);
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
