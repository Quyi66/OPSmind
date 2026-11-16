<template>
  <el-dialog
    v-model="visible"
    :title="hosts.length ? '批量安装 Agent' : '新建批量纳管'"
    width="760px"
    :close-on-click-modal="false"
    :close-on-press-escape="!saving"
    :show-close="!saving"
    append-to-body
  >
    <el-form label-width="110px" :disabled="saving" @submit.prevent="submit">
      <el-form-item label="批次名称">
        <el-input v-model="form.name" placeholder="留空由系统生成" />
      </el-form-item>
      <el-alert
        v-if="hosts.length"
        :title="`已选择 ${hosts.length} 台主机，单批最多支持 2000 台。`"
        type="info"
        :closable="false"
      />
      <template v-else>
        <el-form-item label="导入 Excel">
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            accept=".xlsx,.xls"
            :disabled="saving"
            :on-change="handleFile"
          >
            <el-button :loading="parsing">选择文件</el-button>
          </el-upload>
          <span class="credential-hint">
            <template v-if="importedTargets.length">
              已导入 {{ importedTargets.length }} 台
              <el-button link type="primary" @click="importedTargets = []">清除</el-button>
            </template>
            <template v-else>表头需含“IP”列，可选“主机名”“操作系统”列。</template>
          </span>
        </el-form-item>
        <el-form-item label="目标 IP" :required="!importedTargets.length">
          <el-input
            v-model="form.targetText"
            type="textarea"
            :rows="5"
            placeholder="换行、逗号、空格分隔，例如：10.0.0.5、10.0.0.10-20、10.0.0.10-10.0.0.20、10.0.0.0/24（支持 /20～/32）。单批最多 2000 台。"
          />
        </el-form-item>
        <el-form-item label="操作系统">
          <el-radio-group v-model="form.targetOs">
            <el-radio value="linux">Linux</el-radio>
            <el-radio value="windows">Windows</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="资产分组">
          <el-select
            v-model="form.groupId"
            clearable
            filterable
            :loading="loadingGroups"
            placeholder="默认根分组"
          >
            <el-option
              v-for="group in groups"
              :key="group.id"
              :value="group.id"
              :label="group.path || group.name || group.id"
            />
          </el-select>
        </el-form-item>
      </template>
      <AgentBatchCredentials v-model="credentials" :operating-systems="operatingSystems" />
      <el-form-item label="保留凭据">
        <el-switch v-model="form.keepCredentials" />
        <span class="credential-hint">
          默认装完恢复资产原凭据；开启后留作以后 SSH / WinRM 使用。
        </span>
      </el-form-item>
    </el-form>
    <el-alert
      v-if="errorMessage"
      :title="errorMessage"
      type="error"
      :closable="false"
      class="batch-error"
    />
    <template #footer>
      <el-button :disabled="saving" @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">创建并开始</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { agentApi, dataManageApi, getAgentErrorMessage } from '../../api'
import {
  buildBatchCredentials,
  createBatchCredentials,
  getBatchHostOs,
  BATCH_MAX_TARGETS,
  countTargetText,
  readBatchTargetsFile
} from '../../utils/agentBatch'
import AgentBatchCredentials from './AgentBatchCredentials.vue'

const props = defineProps({
  modelValue: Boolean,
  hosts: { type: Array, default: () => [] },
  defaultTargetOs: { type: String, default: 'linux' }
})
const emit = defineEmits(['update:modelValue', 'created'])
const visible = computed({
  get: () => props.modelValue,
  set: value => {
    if (!saving.value) emit('update:modelValue', value)
  }
})
const emptyForm = () => ({
  name: '',
  targetText: '',
  targetOs: getBatchHostOs(null, props.defaultTargetOs),
  groupId: '',
  keepCredentials: false
})
const form = ref(emptyForm())
const credentials = ref(createBatchCredentials())
const saving = ref(false)
const parsing = ref(false)
const importedTargets = ref([])
const errorMessage = ref('')
const groups = ref([])
const loadingGroups = ref(false)
const operatingSystems = computed(() =>
  props.hosts.length
    ? [...new Set(props.hosts.map(host => getBatchHostOs(host, props.defaultTargetOs)))]
    : [...new Set([form.value.targetOs, ...importedTargets.value.map(target => target.os)])]
)
let session = 0

async function handleFile(uploadFile) {
  const file = uploadFile.raw
  if (!file || parsing.value) return
  const version = session
  parsing.value = true
  errorMessage.value = ''
  try {
    const targets = await readBatchTargetsFile(file, form.value.targetOs)
    if (session === version) importedTargets.value = targets
  } catch (error) {
    if (session === version) errorMessage.value = getAgentErrorMessage(error, '解析导入文件失败')
  } finally {
    parsing.value = false
  }
}
async function submit() {
  if (saving.value || !visible.value) return
  const version = session
  errorMessage.value = ''
  try {
    const hasText = !!form.value.targetText.trim()
    if (!props.hosts.length && !hasText && !importedTargets.value.length)
      throw new Error('请输入目标 IP 或导入 Excel')
    if (
      !props.hosts.length &&
      countTargetText(form.value.targetText) + importedTargets.value.length > BATCH_MAX_TARGETS
    )
      throw new Error(`单批最多支持 ${BATCH_MAX_TARGETS} 台主机，请分批操作`)
    if (props.hosts.length > BATCH_MAX_TARGETS) throw new Error('单批最多支持 2000 台主机，请分批操作')
    const payload = {
      name: form.value.name.trim() || undefined,
      credentials: buildBatchCredentials(credentials.value, operatingSystems.value),
      keepCredentials: form.value.keepCredentials
    }
    if (props.hosts.length) {
      payload.hostIds = [
        ...new Set(
          props.hosts.map(host => String(host.id || host.hostId || host.key || '')).filter(Boolean)
        )
      ]
      if (payload.hostIds.length !== props.hosts.length)
        throw new Error('所选主机缺少有效 ID 或重复，请重新选择')
    } else {
      if (hasText) {
        payload.targetText = form.value.targetText.trim()
        payload.targetOs = form.value.targetOs
      }
      if (importedTargets.value.length) payload.targets = importedTargets.value
      payload.groupId = form.value.groupId || null
    }
    saving.value = true
    const result = await agentApi.createBatch(payload)
    if (session !== version) return
    credentials.value = createBatchCredentials()
    emit('update:modelValue', false)
    emit('created', result)
  } catch (error) {
    if (session === version) errorMessage.value = getAgentErrorMessage(error)
  } finally {
    if (session === version) saving.value = false
  }
}

watch(
  visible,
  async open => {
    const version = ++session
    credentials.value = createBatchCredentials()
    saving.value = false
    if (!open) return
    form.value = emptyForm()
    importedTargets.value = []
    errorMessage.value = ''
    groups.value = []
    loadingGroups.value = false
    if (props.hosts.length) return
    loadingGroups.value = true
    try {
      const result = await dataManageApi.getAllGroups('')
      if (session === version) groups.value = (result.records || []).filter(group => group.id)
    } catch (error) {
      if (session === version) errorMessage.value = getAgentErrorMessage(error, '加载资产分组失败')
    } finally {
      if (session === version) loadingGroups.value = false
    }
  },
  { immediate: true }
)
onUnmounted(() => {
  session++
})
</script>

<style scoped>
.credential-hint {
  margin-left: 12px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.batch-error {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin-top: 12px;
}
</style>
