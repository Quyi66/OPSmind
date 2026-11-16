<template>
  <el-dialog
    v-model="visible"
    title="待处理 Agent"
    width="min(1040px, calc(100vw - 32px))"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    destroy-on-close
  >
      <el-alert
        title="大多数 Agent 会自动绑定；此处仅列需人工判断的。候选资产只作参考，请核对主机名和 IP。"
        type="info"
        :closable="false"
        show-icon
      />
      <div class="pending-toolbar">
        <el-button
          size="small"
          :loading="loadingPending"
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
    <template #footer>
      <el-button
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

const props = defineProps({
  modelValue: Boolean
})
const emit = defineEmits(['update:modelValue', 'success'])
const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})
const hostId = host => String(host?.hostId || host?.id || host?.key || host?.host_id || '')
const loadingPending = ref(false)
const binding = ref(false)
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
  if (visible.value) timer = setTimeout(fetchPending, 4000)
}
async function fetchPending() {
  if (loadingPending.value || !visible.value) return
  const version = session
  loadingPending.value = true
  try {
    const result = await agentApi.getPendingAgents()
    if (version !== session) return
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
    if (info?.connectionType === 'koreops_agent')
      gatewayInfo.value = { ...hosts[0], ...info }
    else ElMessage.warning('所选资产未绑定 Agent')
  } catch (error) {
    if (request === gatewayRequest) ElMessage.error(getAgentErrorMessage(error))
  } finally {
    if (request === gatewayRequest) gatewayLoading.value = false
  }
})
watch(
  visible,
  open => {
    session++
    stopPolling()
    loadingPending.value = false
    binding.value = false
    pendingAgents.value = []
    selectedClient.value = null
    targetHosts.value = []
    gatewayHosts.value = []
    gatewayInfo.value = null
    gatewayRequest++
    if (!open) return
    bindMode.value = 'local'
    assetMode.value = 'new'
    targetIp.value = ''
    Object.assign(newHost, { hostname: '', ip: '', ciType: '' })
    fetchPending()
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
.comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 16px;
  background: var(--el-fill-color-light);
}
</style>
