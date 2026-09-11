<template>
  <el-dialog
    v-model="visible"
    :title="page === 'command' ? '生成 Agent 安装命令' : '待处理 Agent'"
    width="min(1040px, calc(100vw - 32px))"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <template v-if="page === 'command'">
      <el-alert
        :title="
          preboundHostId
            ? '在目标机执行命令后，Agent 将自动绑定到当前资产。'
            : '新机器注册后会自动建档并绑定；大多数 Agent 无需人工处理。'
        "
        type="info"
        :closable="false"
        show-icon
      />
      <el-form label-width="110px" class="enroll-form">
        <el-form-item v-if="preboundHostId" label="预绑定资产">
          {{ initialAsset.hostname || initialAsset.value || '-' }} /
          {{ initialAsset.IP || initialAsset.ip || '-' }}
        </el-form-item>
        <el-form-item label="操作系统">
          <el-radio-group
            v-model="tokenForm.targetOs"
            :disabled="!!preboundHostId || generating"
            @change="handleTargetOsChange"
          >
            <el-radio-button value="linux">Linux</el-radio-button>
            <el-radio-button value="windows">Windows</el-radio-button>
          </el-radio-group>
          <span v-if="preboundHostId" class="hint">按资产类型自动选择</span>
        </el-form-item>
        <el-form-item label="有效期（分钟）">
          <el-input-number v-model="tokenForm.ttlMinutes" :min="1" :max="1440" :precision="0" />
        </el-form-item>
        <el-form-item label="可用次数">
          <el-input-number
            v-model="tokenForm.maxUses"
            :min="0"
            :precision="0"
            :disabled="!!preboundHostId"
          />
          <span class="hint">
            {{ preboundHostId ? '预绑定凭证仅可使用一次' : '0 表示有效期内不限次' }}
          </span>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="tokenForm.remark" /></el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="generating" @click="generateToken">
            生成安装命令
          </el-button>
        </el-form-item>
      </el-form>
      <div v-if="token" class="command-result">
        <div class="command-result__header">
          <div class="command-result__meta">
            有效期至 {{ token.expiresAt }} / 剩余
            {{ token.remainingUses === null ? '不限' : token.remainingUses }} 次
          </div>
          <div class="command-result__actions">
            <el-button type="primary" size="small" :disabled="!installCommand || !tokenUsable" @click="copyCommand">
              复制
            </el-button>
            <el-button
              v-if="token.bootstrapUrl && tokenUsable"
              size="small"
              :loading="downloading"
              @click="downloadScript"
            >
              下载安装脚本
            </el-button>
            <el-button v-if="tokenUsable" type="danger" size="small" :loading="revoking" @click="revokeToken">
              撤销凭证
            </el-button>
          </div>
        </div>
        <pre class="command-box">{{ installCommand }}</pre>
        <p class="command-tip">
          <i class="fa fa-info-circle"></i>
          请在目标机以 root / 管理员身份执行完整命令。
        </p>
        <el-alert
          v-if="!tokenUsable"
          title="凭证已不可用，请重新生成。"
          type="warning"
          :closable="false"
          class="command-alert"
        />
      </div>
    </template>
    <template v-else>
      <el-alert
        title="大多数 Agent 会自动绑定；此处仅列需人工判断的。候选资产只作参考，请核对主机名和 IP。"
        type="info"
        :closable="false"
        show-icon
      />
      <el-alert
        v-if="token && !tokenUsable"
        title="凭证已不可用，请回上一步重新生成。已停止轮询。"
        type="warning"
        :closable="false"
        class="enroll-form"
      />
      <div class="pending-toolbar">
        <el-button
          size="small"
          :loading="loadingPending"
          :disabled="!!token && !tokenUsable"
          @click="fetchPending"
        >
          <i class="fa fa-refresh" style="margin-right: 4px"></i>
          刷新待处理列表
        </el-button>
      </div>
      <el-table
        :data="pendingAgents"
        v-loading="loadingPending"
        row-key="clientId"
        max-height="280"
        empty-text="暂无待处理 Agent"
        @row-click="selectClient"
      >
        <el-table-column width="50" align="center">
          <template #default="{ row }">
            <el-radio
              :model-value="selectedClient?.clientId"
              :value="row.clientId"
              @change="selectClient(row)"
            >
              <template #default>&zwnj;</template>
            </el-radio>
          </template>
        </el-table-column>
        <el-table-column prop="hostname" label="主机名" min-width="140" />
        <el-table-column prop="ip" label="IP" min-width="130" />
        <el-table-column label="平台" width="100">
          <template #default="{ row }">{{ getAgentPlatformLabel(row) }}</template>
        </el-table-column>
        <el-table-column prop="os" label="系统" min-width="150" />
        <el-table-column prop="agentVersion" label="版本" width="90" />
        <el-table-column label="状态" width="85">
          <template #default="{ row }">
            <el-tag :type="row.agentStatus === 'online' ? 'success' : 'danger'">
              {{ row.agentStatus === 'online' ? '在线' : '离线' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <el-form label-width="115px" class="enroll-form">
        <el-form-item label="绑定模式">
          <el-radio-group v-model="bindMode">
            <el-radio-button value="local">本机</el-radio-button>
            <el-radio-button value="gateway">跳板代管</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="bindMode === 'gateway'" label="跳板 Agent">
          <AcmDeviceSelector v-model="gatewayHosts" :options="singleSelector" />
          <div v-if="gatewayInfo">
            {{ gatewayInfo.agentIp || '-' }} /
            {{ gatewayInfo.agentStatus === 'online' ? '在线' : '离线' }}
          </div>
        </el-form-item>
        <el-form-item label="资产档案">
          <el-radio-group v-model="assetMode">
            <el-radio value="new">新建资产并绑定</el-radio>
            <el-radio value="existing">绑定已有资产</el-radio>
          </el-radio-group>
        </el-form-item>
        <template v-if="assetMode === 'existing'">
          <el-form-item v-if="selectedClient?.matchedHosts?.length" label="候选资产">
            <el-radio-group :model-value="targetHostId" @change="selectMatchedHost">
              <el-radio
                v-for="host in selectedClient.matchedHosts"
                :key="host.hostId"
                :value="host.hostId"
              >
                {{ host.hostname }} / {{ host.ip }}（{{ host.matchedBy }}）
              </el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="选择目标资产">
            <AcmDeviceSelector v-model="targetHosts" :options="singleSelector" />
          </el-form-item>
        </template>
        <template v-else>
          <el-form-item label="主机名">
            <el-input v-model="newHost.hostname" placeholder="本机模式留空则使用 Agent 上报值" />
          </el-form-item>
          <el-form-item label="资产 IP">
            <el-input v-model="newHost.ip" placeholder="本机模式留空则使用 Agent 上报值" />
          </el-form-item>
          <el-form-item label="资产类型">
            <el-select v-model="newHost.ciType" clearable placeholder="按 Agent 平台自动选择">
              <el-option label="Linux" value="linux" />
              <el-option label="Windows" value="windows" />
            </el-select>
          </el-form-item>
        </template>
        <el-form-item v-if="bindMode === 'gateway'" label="目标 IP" required>
          <el-input v-model="targetIp" />
        </el-form-item>
      </el-form>
      <div class="comparison">
        <div>
          <strong>Agent 上报</strong>
          <p>
            {{ sourceClient?.hostname || '-' }} /
            {{ sourceClient?.ip || sourceClient?.agentIp || '-' }}
          </p>
        </div>
        <div>
          <strong>目标资产</strong>
          <p>{{ targetPreview.hostname || '-' }} / {{ targetPreview.ip || '-' }}</p>
        </div>
      </div>
    </template>
    <template #footer>
      <el-button v-if="page === 'pending'" @click="page = 'command'">返回生成凭证</el-button>
      <el-button v-else @click="page = 'pending'">待处理 Agent</el-button>
      <el-button
        v-if="page === 'pending'"
        type="primary"
        :loading="binding"
        :disabled="gatewayLoading"
        @click="submitBind"
      >
        确认绑定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { agentApi, getAgentErrorMessage } from '../../api'
import { getAgentPlatformLabel } from '../../utils/agentInfo'
import {
  getEnrollmentInstallCommand,
  isEnrollmentTokenUsable
} from '../../utils/agentInstallCommand'

const props = defineProps({
  modelValue: Boolean,
  initialAsset: { type: Object, default: null },
  mode: { type: String, default: 'enroll' }
})
const emit = defineEmits(['update:modelValue', 'success'])
const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})
const hostId = host => String(host?.hostId || host?.id || host?.key || host?.host_id || '')
const preboundHostId = computed(() => hostId(props.initialAsset))
const page = ref('command')
const tokenForm = reactive({ targetOs: 'linux', ttlMinutes: 1440, maxUses: 0, remark: '' })
const token = ref(null)
const tokenUsable = computed(() => isEnrollmentTokenUsable(token.value))
const installCommand = computed(() => getEnrollmentInstallCommand(token.value))
const generating = ref(false)
const revoking = ref(false)
const loadingPending = ref(false)
const binding = ref(false)
const downloading = ref(false)
const pendingAgents = ref([])
const selectedClient = ref(null)
const bindMode = ref('local')
const assetMode = ref('new')
const targetHosts = ref([])
const gatewayHosts = ref([])
const gatewayInfo = ref(null)
const gatewayLoading = ref(false)
const targetIp = ref('')
const newHost = reactive({ hostname: '', ip: '', ciType: '' })
const singleSelector = { selector: 'single', selectMode: 'host', label: '选择资产' }
const targetHostId = computed(() => hostId(targetHosts.value[0]))
const sourceClient = computed(() =>
  bindMode.value === 'gateway' ? gatewayInfo.value : selectedClient.value
)
const targetPreview = computed(() =>
  assetMode.value === 'existing'
    ? {
        hostname: targetHosts.value[0]?.hostname || targetHosts.value[0]?.value,
        ip: targetHosts.value[0]?.ip || targetHosts.value[0]?.IP || targetHosts.value[0]?.value
      }
    : {
        hostname:
          newHost.hostname || (bindMode.value === 'local' ? selectedClient.value?.hostname : ''),
        ip: newHost.ip || (bindMode.value === 'local' ? selectedClient.value?.ip : targetIp.value)
      }
)
let timer
let session = 0
let gatewayRequest = 0
function stopPolling() {
  clearTimeout(timer)
}
function schedulePoll() {
  stopPolling()
  if (visible.value && page.value === 'pending' && (!token.value || tokenUsable.value))
    timer = setTimeout(fetchPending, 4000)
}
async function fetchPending() {
  if (loadingPending.value || !visible.value || (token.value && !tokenUsable.value)) return
  const version = session
  loadingPending.value = true
  try {
    const result = await agentApi.getPendingAgents(token.value?.id)
    if (version !== session) return
    if (result.token) token.value = { ...token.value, ...result.token }
    pendingAgents.value = Array.isArray(result.agents) ? result.agents : []
    if (selectedClient.value)
      selectedClient.value =
        pendingAgents.value.find(item => item.clientId === selectedClient.value.clientId) || null
  } catch (error) {
    if (version === session) ElMessage.error(getAgentErrorMessage(error))
  } finally {
    if (version === session) {
      loadingPending.value = false
      schedulePoll()
    }
  }
}
function selectClient(client) {
  if (client?.clientId === selectedClient.value?.clientId) return
  selectedClient.value = client
  targetHosts.value = []
  assetMode.value = client?.matchedHosts?.length ? 'existing' : 'new'
  Object.assign(newHost, { hostname: '', ip: '', ciType: '' })
}
function selectMatchedHost(id) {
  const host = selectedClient.value?.matchedHosts?.find(item => item.hostId === id)
  if (host)
    targetHosts.value = [{ ...host, key: host.hostId, value: host.ip, assetType: host.ciType }]
}
function handleTargetOsChange() {
  token.value = null
}
async function generateToken() {
  if (generating.value) return
  const version = ++session
  stopPolling()
  loadingPending.value = false
  token.value = null
  generating.value = true
  try {
    const result = await agentApi.createEnrollmentToken({
      ...tokenForm,
      ...(preboundHostId.value ? { hostId: preboundHostId.value, maxUses: 1 } : {})
    })
    if (version !== session) return
    token.value = result
    tokenForm.targetOs = result.targetOs
    if (!installCommand.value) ElMessage.error('接口未返回安装命令')
  } catch (error) {
    if (version === session) ElMessage.error(getAgentErrorMessage(error))
  } finally {
    if (version === session) generating.value = false
  }
}
async function revokeToken() {
  const version = session
  revoking.value = true
  try {
    await agentApi.revokeEnrollmentToken(token.value.id)
    if (version === session) token.value = { ...token.value, status: 'revoked' }
  } catch (error) {
    ElMessage.error(getAgentErrorMessage(error))
  } finally {
    if (version === session) revoking.value = false
  }
}
async function copyCommand() {
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(installCommand.value)
    else {
      const input = document.createElement('textarea')
      input.value = installCommand.value
      document.body.appendChild(input)
      input.select()
      try {
        if (!document.execCommand('copy')) throw new Error('copy failed')
      } finally {
        input.remove()
      }
    }
    ElMessage.success('安装命令已复制')
  } catch {
    ElMessage.warning('复制失败，请手动复制命令')
  }
}
async function downloadScript() {
  if (downloading.value || !token.value?.bootstrapUrl) return
  downloading.value = true
  try {
    const response = await fetch(token.value.bootstrapUrl)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const blob = await response.blob()
    const disposition = response.headers.get('Content-Disposition') || ''
    const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)"?/i)
    const filename =
      match?.[1] ||
      token.value.bootstrapUrl.split('/').pop()?.split('?')[0] ||
      (tokenForm.targetOs === 'windows' ? 'install_agent.ps1' : 'install_agent.sh')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = decodeURIComponent(filename)
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch {
    ElMessage.error('下载安装脚本失败，请重试')
  } finally {
    downloading.value = false
  }
}
async function submitBind() {
  const client = sourceClient.value
  if (!client || client.agentStatus !== 'online') return ElMessage.warning('请选择在线 Agent')
  if (assetMode.value === 'existing' && !targetHostId.value)
    return ElMessage.warning('请选择目标资产')
  if (bindMode.value === 'gateway' && !targetIp.value.trim())
    return ElMessage.warning('请填写代管目标 IP')
  const fields = Object.fromEntries(
    Object.entries(newHost)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value)
  )
  if (bindMode.value === 'gateway' && assetMode.value === 'new') {
    if (!fields.hostname || !fields.ciType) return ElMessage.warning('请填写代管主机名称和资产类型')
    fields.ip = fields.ip || targetIp.value.trim()
  }
  const version = session
  binding.value = true
  try {
    const result = await agentApi.bindAgent({
      clientId: client.clientId || client.agentClientId,
      mode: bindMode.value,
      ...(bindMode.value === 'gateway' ? { targetIp: targetIp.value.trim() } : {}),
      ...(assetMode.value === 'new' ? { newHost: fields } : { hostId: targetHostId.value })
    })
    if (version !== session) return
    ElMessage.success(result.hostCreated ? '资产已创建并绑定 Agent' : 'Agent 绑定成功')
    visible.value = false
    emit('success', result.hostId)
  } catch (error) {
    if (version === session) ElMessage.error(getAgentErrorMessage(error))
  } finally {
    if (version === session) binding.value = false
  }
}
watch(gatewayHosts, async hosts => {
  const request = ++gatewayRequest
  gatewayInfo.value = null
  gatewayLoading.value = false
  const id = hostId(hosts[0])
  if (!id) return
  gatewayLoading.value = true
  try {
    const infos = await agentApi.getHostAgentInfo([id])
    if (request !== gatewayRequest) return
    const info = infos[0]
    if (['koreops_agent', 'agent', 'oplus_agent'].includes(info?.connectionType))
      gatewayInfo.value = { ...hosts[0], ...info }
    else ElMessage.warning('所选资产未绑定 Agent')
  } catch (error) {
    if (request === gatewayRequest) ElMessage.error(getAgentErrorMessage(error))
  } finally {
    if (request === gatewayRequest) gatewayLoading.value = false
  }
})
watch(page, value => {
  stopPolling()
  if (value === 'pending') fetchPending()
})
watch(
  visible,
  open => {
    session++
    stopPolling()
    generating.value = false
    loadingPending.value = false
    revoking.value = false
    binding.value = false
    token.value = null
    pendingAgents.value = []
    selectedClient.value = null
    targetHosts.value = []
    gatewayHosts.value = []
    gatewayInfo.value = null
    gatewayRequest++
    if (!open) return
    page.value = props.mode === 'pending' ? 'pending' : 'command'
    bindMode.value = 'local'
    assetMode.value = 'new'
    targetIp.value = ''
    Object.assign(newHost, { hostname: '', ip: '', ciType: '' })
    Object.assign(tokenForm, {
      targetOs:
        String(props.initialAsset?.ciType || props.initialAsset?.assetType || '').toLowerCase() ===
        'windows'
          ? 'windows'
          : 'linux',
      ttlMinutes: 1440,
      maxUses: preboundHostId.value ? 1 : 0,
      remark: ''
    })
    if (page.value === 'pending') fetchPending()
  },
  { immediate: true }
)
onUnmounted(() => {
  session++
  gatewayRequest++
  stopPolling()
})
</script>

<style scoped>
.enroll-form {
  margin-top: 16px;
}
.pending-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
  margin-bottom: 12px;
}
.hint {
  margin-left: 12px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.command-result {
  margin-top: 16px;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  border-radius: 8px;
}
.command-result__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.command-result__meta {
  color: var(--el-text-color-regular);
  font-size: 13px;
}
.command-result__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.command-box {
  margin: 0;
  padding: 14px 16px;
  background: #1e1e2e;
  color: #cdd6f4;
  border: 1px solid #313244;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  overflow-wrap: anywhere;
  user-select: text;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
}
.command-tip {
  margin: 10px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.command-tip i {
  color: var(--el-color-info);
}
.command-alert {
  margin-top: 12px;
}
.comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 16px;
  background: var(--el-fill-color-light);
}
</style>
