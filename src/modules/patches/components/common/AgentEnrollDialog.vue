<template>
  <el-dialog
    v-model="visible"
    title="新增 Agent 主机 (纳管接入)"
    width="760px"
    :close-on-click-modal="false"
    destroy-on-close
    class="agent-enroll-dialog"
    @close="handleClose"
  >
    <!-- 自定义步骤条（使用补丁安装向导统一样式） -->
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
        </div>
        <div
          v-if="idx < steps.length - 1"
          class="stepper-line"
          :class="{ 'is-active': activeStep > idx }"
        ></div>
      </template>
    </div>

    <!-- 步骤 1：生成凭证 (邀请函) -->
    <div v-if="activeStep === 0" class="step-pane">
      <el-form :model="tokenForm" label-width="110px" size="default" class="token-form">
        <el-form-item label="凭证有效期">
          <div class="input-with-unit">
            <el-input-number v-model="tokenForm.ttlMinutes" :min="5" :max="1440" style="width: 160px" />
            <span class="unit-text">分钟</span>
          </div>
        </el-form-item>
        <el-form-item label="允许使用次数">
          <div class="input-with-unit">
            <el-input-number v-model="tokenForm.maxUses" :min="1" :max="100" style="width: 160px" />
            <span class="unit-text">次</span>
          </div>
        </el-form-item>
        <el-form-item label="备注说明">
          <el-input
            v-model="tokenForm.remark"
            placeholder="例如：财务部办公电脑、机房内网堡垒机"
            style="width: 400px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="generating" @click="handleGenerateToken">
            <i class="fa fa-key me-1" /> 生成安装命令
          </el-button>
        </el-form-item>
      </el-form>

      <!-- Token 生成结果展示 (终端代码卡片风格) -->
      <div v-if="tokenResult" class="token-result-container">
        <div class="token-meta-bar">
          <div class="meta-status">
            <el-tag type="success" size="small" effect="light" round>
              <i class="fa fa-check-circle me-1" /> 凭证已就绪
            </el-tag>
          </div>
          <div class="meta-details">
            <span>有效期至：<strong>{{ tokenResult.expiresAt }}</strong></span>
            <span class="ms-3">剩余次数：<strong>{{ (tokenResult.maxUses || 1) - (tokenResult.usedCount || 0) }}</strong> 次</span>
          </div>
        </div>

        <!-- 终端样式代码框 -->
        <div class="code-terminal">
          <div class="terminal-header">
            <div class="terminal-dots">
              <span class="dot dot-red"></span>
              <span class="dot dot-yellow"></span>
              <span class="dot dot-green"></span>
              <span class="terminal-title">Bash / Install Command</span>
            </div>
            <el-button
              type="primary"
              size="small"
              class="copy-btn"
              @click="copyCommand"
            >
              <el-icon class="me-1"><CopyDocument /></el-icon> 复制命令
            </el-button>
          </div>
          <div class="terminal-body">
            <pre class="code-text"><code>{{ tokenResult.installCommand }}</code></pre>
          </div>
        </div>

        <el-alert
          type="warning"
          :closable="false"
          show-icon
          class="mt-3"
          title="请在目标终端机器（需 root/sudo 权限）运行上述 Shell 指令，Agent 启动后将自动向平台打卡报到。"
        />
      </div>
    </div>

    <!-- 步骤 2：轮询待绑定 Agent 候选列表 -->
    <div v-if="activeStep === 1" class="step-pane">
      <div class="polling-status-bar">
        <div class="status-left">
          <el-icon class="is-loading polling-icon"><Loading /></el-icon>
          <div>
            <div class="status-title">正在等待 Agent 机器注册报到...</div>
            <div class="status-sub">系统正在每 3 秒自动轮询平台 Candidate 注册管道</div>
          </div>
        </div>
        <el-button size="small" icon="Refresh" :loading="pollingLoading" @click="fetchPendingAgents">
          手动刷新
        </el-button>
      </div>

      <div class="pending-table-wrapper mt-3">
        <el-table
          v-loading="pollingLoading"
          :data="pendingList"
          highlight-current-row
          style="width: 100%"
          height="250px"
          border
          @current-change="handlePendingSelect"
        >
          <el-table-column prop="hostname" label="主机名" min-width="130" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="fw-bold">{{ row.hostname }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="ip" label="IP 地址" width="130" />
          <el-table-column prop="osInfo" label="操作系统" min-width="140" show-overflow-tooltip />
          <el-table-column prop="agentVersion" label="Agent 版本" width="110">
            <template #default="{ row }">
              <el-tag size="small" type="info" effect="plain">v{{ row.agentVersion }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="clientId" label="Client ID" min-width="140" show-overflow-tooltip />
          <el-table-column prop="registeredAt" label="报到时间" width="160" />
        </el-table>

        <div v-if="pendingList.length === 0 && !pollingLoading" class="empty-pending-box">
          <i class="fa fa-inbox empty-icon" />
          <p class="empty-text">尚未收到候选 Agent 报到请求</p>
          <p class="empty-sub">请检查目标机器是否成功执行了安装命令并正常联网。</p>
        </div>
      </div>
    </div>

    <!-- 步骤 3：确认绑定 -->
    <div v-if="activeStep === 2" class="step-pane">
      <div v-if="selectedPending" class="agent-preview-card">
        <div class="card-header-bar">
          <i class="fa fa-laptop me-2" />
          <span>已选中的 Candidate Agent</span>
          <el-tag type="success" size="small" class="ms-auto">打卡就绪</el-tag>
        </div>
        <div class="card-grid-body">
          <div class="grid-item">
            <span class="item-label">主机名称：</span>
            <span class="item-value">{{ selectedPending.hostname }}</span>
          </div>
          <div class="grid-item">
            <span class="item-label">IP 地址：</span>
            <span class="item-value">{{ selectedPending.ip }}</span>
          </div>
          <div class="grid-item">
            <span class="item-label">Client ID：</span>
            <span class="item-value font-mono">{{ selectedPending.clientId }}</span>
          </div>
          <div class="grid-item">
            <span class="item-label">操作系统：</span>
            <span class="item-value">{{ selectedPending.osInfo }}</span>
          </div>
        </div>
      </div>

      <el-form :model="bindForm" label-width="110px" class="bind-form mt-4" size="default">
        <el-form-item label="纳管模式">
          <el-radio-group v-model="bindForm.mode">
            <el-radio-button value="existing">绑定到已有资产档案</el-radio-button>
            <el-radio-button value="gateway">跳板模式 (代管内网服务器)</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <!-- 绑定已有资产 -->
        <template v-if="bindForm.mode === 'existing'">
          <el-form-item label="选择目标资产" required>
            <el-select
              v-model="bindForm.hostId"
              placeholder="请选择需要关联合并的 CMDB 主机资产"
              filterable
              style="width: 420px"
            >
              <el-option
                v-for="host in availableHosts"
                :key="host.id || host.hostId"
                :label="`${host.name || host.hostname || host.ip} (${host.ip || '无IP'})`"
                :value="String(host.id || host.hostId)"
              />
            </el-select>
          </el-form-item>
        </template>

        <!-- 跳板模式 -->
        <template v-if="bindForm.mode === 'gateway'">
          <el-form-item label="内网目标资产" required>
            <el-select
              v-model="bindForm.hostId"
              placeholder="请选择需要代管的内网服务器"
              filterable
              style="width: 420px"
            >
              <el-option
                v-for="host in availableHosts"
                :key="host.id || host.hostId"
                :label="`${host.name || host.hostname || host.ip} (${host.ip || '无IP'})`"
                :value="String(host.id || host.hostId)"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="内网目标 IP" required>
            <el-input
              v-model="bindForm.targetIp"
              placeholder="例如：10.0.0.5"
              style="width: 420px"
            />
          </el-form-item>
        </template>
      </el-form>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button v-if="activeStep === 1" @click="activeStep = 0">上一步</el-button>
        <el-button
          v-if="activeStep === 0 && tokenResult"
          type="primary"
          @click="startPollingStep"
        >
          下一步：等待上线 <i class="fa fa-arrow-right ms-1" />
        </el-button>
        <el-button
          v-if="activeStep === 1"
          type="primary"
          :disabled="!selectedPending"
          @click="activeStep = 2"
        >
          下一步：确认绑定 <i class="fa fa-arrow-right ms-1" />
        </el-button>
        <el-button v-if="activeStep === 2" @click="activeStep = 1">上一步</el-button>
        <el-button
          v-if="activeStep === 2"
          type="primary"
          :loading="submitting"
          @click="handleConfirmBind"
        >
          <i class="fa fa-check me-1" /> 确认绑定并完成
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, CopyDocument, Refresh } from '@element-plus/icons-vue'
import {
  generateEnrollmentToken,
  getPendingAgents,
  bindAgent,
  bindAgentGateway,
  getAgentErrorMessage
} from '../../api/agent'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  availableHosts: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'success'])

const steps = [
  { title: '生成安装命令' },
  { title: '等待机器报到' },
  { title: '确认绑定资产' }
]

const visible = ref(false)
const activeStep = ref(0)

// 步骤 1：Token 表单
const generating = ref(false)
const tokenForm = reactive({
  ttlMinutes: 60,
  maxUses: 1,
  remark: ''
})
const tokenResult = ref(null)

// 步骤 2：轮询
const pollingLoading = ref(false)
const pendingList = ref([])
const selectedPending = ref(null)
let timer = null

// 步骤 3：绑定表单
const submitting = ref(false)
const bindForm = reactive({
  mode: 'existing',
  hostId: '',
  targetIp: ''
})

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val
    if (val) {
      resetDialog()
    } else {
      stopPolling()
    }
  }
)

watch(visible, (val) => {
  emit('update:modelValue', val)
})

function resetDialog() {
  activeStep.value = 0
  tokenResult.value = null
  selectedPending.value = null
  pendingList.value = []
  bindForm.mode = 'existing'
  bindForm.hostId = ''
  bindForm.targetIp = ''
  stopPolling()
}

function handleClose() {
  stopPolling()
}

// 步骤 1：生成 Token
async function handleGenerateToken() {
  generating.value = true
  try {
    const res = await generateEnrollmentToken(tokenForm)
    tokenResult.value = res
    ElMessage.success('成功生成 Agent 安装凭证')
  } catch (err) {
    ElMessage.error(getAgentErrorMessage(err))
  } finally {
    generating.value = false
  }
}

function copyCommand() {
  if (!tokenResult.value?.installCommand) return
  navigator.clipboard.writeText(tokenResult.value.installCommand).then(() => {
    ElMessage.success('安装命令已复制到剪贴板')
  }).catch(() => {
    ElMessage.warning('复制失败，请手动复制')
  })
}

// 步骤 2：进入轮询
function startPollingStep() {
  activeStep.value = 1
  fetchPendingAgents()
  startPolling()
}

async function fetchPendingAgents() {
  pollingLoading.value = true
  try {
    const data = await getPendingAgents()
    pendingList.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('获取待绑定 Agent 失败:', err)
  } finally {
    pollingLoading.value = false
  }
}

function startPolling() {
  stopPolling()
  timer = setInterval(() => {
    fetchPendingAgents()
  }, 3000)
}

function stopPolling() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function handlePendingSelect(val) {
  selectedPending.value = val
}

// 步骤 3：提交绑定
async function handleConfirmBind() {
  if (!selectedPending.value?.clientId) {
    ElMessage.warning('请选择需要绑定的 Candidate Agent')
    return
  }

  if (!bindForm.hostId) {
    ElMessage.warning('请选择对应的资产')
    return
  }

  if (bindForm.mode === 'gateway' && !bindForm.targetIp) {
    ElMessage.warning('跳板模式必须填写内网目标 IP')
    return
  }

  submitting.value = true
  try {
    if (bindForm.mode === 'gateway') {
      await bindAgentGateway({
        clientId: selectedPending.value.clientId,
        hostId: bindForm.hostId,
        targetIp: bindForm.targetIp
      })
    } else {
      await bindAgent({
        clientId: selectedPending.value.clientId,
        hostId: bindForm.hostId
      })
    }

    ElMessage.success('Agent 资产绑定成功！')
    stopPolling()
    visible.value = false
    emit('success', bindForm.hostId)
  } catch (err) {
    ElMessage.error(getAgentErrorMessage(err))
  } finally {
    submitting.value = false
  }
}

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
/* 自定义步骤条（对齐 PatchTaskWizard.scss 样式） */
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
  width: 110px;
  position: relative;
  z-index: 1;
}

.stepper-item .stepper-icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background-color: var(--el-bg-color, #ffffff);
  border: 2px solid var(--el-text-color-placeholder, #a8abb2);
  color: var(--el-text-color-placeholder, #a8abb2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 6px;
  transition: all 0.3s;
}

.stepper-item .stepper-title {
  font-size: 12px;
  color: var(--el-text-color-regular, #606266);
  font-weight: 500;
  transition: all 0.3s;
  text-align: center;
  white-space: nowrap;
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
  margin: 12px -30px 0;
  z-index: 0;
  transition: all 0.3s;
}

.stepper-line.is-active {
  background-color: var(--el-color-success, #67c23a);
}

.step-pane {
  min-height: 320px;
}

/* 步骤 1：Token 表单与结果 */
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
  padding: 16px;
}

.token-meta-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 13px;
  color: #475569;
}

/* 终端 Shell 代码框 */
.code-terminal {
  background: #0f172a;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.terminal-header {
  background: #1e293b;
  padding: 8px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #334155;
}

.terminal-dots {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot-red { background: #ef4444; }
.dot-yellow { background: #f59e0b; }
.dot-green { background: #10b981; }

.terminal-title {
  margin-left: 8px;
  font-size: 12px;
  color: #94a3b8;
  font-family: monospace;
}

.copy-btn {
  background: #0284c7;
  border-color: #0284c7;
  color: #ffffff;
}

.copy-btn:hover {
  background: #0369a1;
  border-color: #0369a1;
}

.terminal-body {
  padding: 14px 16px;
  overflow-x: auto;
}

.code-text {
  margin: 0;
  color: #38bdf8;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, Monaco, monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 步骤 2：轮询卡片与表格 */
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
  padding: 36px 0;
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

/* 步骤 3：已选 Candidate 卡片 */
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
}

.card-grid-body {
  padding: 14px 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  font-size: 13px;
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

.ms-auto {
  margin-left: auto;
}

.ms-1 { margin-left: 4px; }
.ms-3 { margin-left: 12px; }
.me-1 { margin-right: 4px; }
.me-2 { margin-right: 8px; }
.mt-3 { margin-top: 12px; }
.mt-4 { margin-top: 16px; }
.fw-bold { font-weight: 600; }
</style>
