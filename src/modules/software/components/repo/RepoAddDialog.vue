<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑仓库' : '添加仓库'"
    width="860px"
    top="4vh"
    destroy-on-close
    @close="handleClose"
    :close-on-press-escape="false"
    :close-on-click-modal="false"
  >
    <div class="repo-add-dialog">
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="仓库名称" prop="repoName">
          <el-input v-model="formData.repoName" placeholder="只能英文字母、数字、. _ -" maxlength="64" />
        </el-form-item>
        <el-form-item label="配置文件" prop="repoFile">
          <el-input
            v-model="formData.repoFile"
            placeholder="只能英文，不带 .repo 后缀，如 ky-local"
            maxlength="64"
          />
        </el-form-item>
        <el-form-item label="仓库描述" prop="repoDesc">
          <el-input
            v-model="formData.repoDesc"
            type="textarea"
            :rows="2"
            placeholder="请输入仓库描述"
          />
        </el-form-item>

        <el-form-item label="频道列表">
          <div class="channel-toolbar">
            <el-button size="small" type="primary" plain @click="addChannel">添加频道</el-button>
            <el-button size="small" @click="openImport">从 repo 文件导入</el-button>
          </div>
        </el-form-item>

        <div class="channel-actions">
          <el-button link type="primary" @click="toggleAll(true)">全部展开</el-button>
          <el-button link type="primary" @click="toggleAll(false)">全部折叠</el-button>
        </div>
        <el-collapse v-model="activeKeys" class="channel-collapse">
        <el-collapse-item v-for="(ch, idx) in channels" :key="ch._key" :name="ch._key">
          <template #title>
            <div class="channel-header">
              <span class="channel-title">
                频道 {{ idx + 1 }}：{{ ch.name || '(未填写名称)' }}
              </span>
              <el-tag size="small" :type="ch.enabled ? 'success' : 'info'">
                {{ ch.enabled ? '启用' : '停用' }}
              </el-tag>
              <span class="channel-summary">
                {{ ch.baseurls.find(u => u && u.trim()) || '' }}
              </span>
              <el-button
                v-if="channels.length > 1"
                size="small"
                type="danger"
                link
                @click.stop="removeChannel(idx)"
              >
                删除
              </el-button>
            </div>
          </template>
          <el-form-item label="名称" required>
            <el-input v-model="ch.name" maxlength="64" placeholder="频道名称，如 os / updates，只能英文字母、数字及 . _ : -" />
          </el-form-item>
          <el-form-item label="仓库地址" required>
            <div class="list-wrap">
              <div v-for="(_, i) in ch.baseurls" :key="i" class="list-row">
                <el-input v-model="ch.baseurls[i]" placeholder="http(s)/ftp/file:// 开头，可含 $basearch" />
                <el-button
                  :disabled="ch.baseurls.length <= 1"
                  link
                  type="danger"
                  @click="ch.baseurls.splice(i, 1)"
                >
                  删除
                </el-button>
              </div>
              <el-button
                size="small"
                link
                type="primary"
                :disabled="ch.baseurls.length >= 20"
                @click="ch.baseurls.push('')"
              >
                + 添加地址
              </el-button>
            </div>
          </el-form-item>
          <el-form-item label="启用">
            <el-switch v-model="ch.enabled" />
          </el-form-item>
          <el-form-item label="gpgcheck">
            <el-switch v-model="ch.gpgcheck" />
          </el-form-item>
          <el-form-item v-if="ch.gpgcheck" label="gpgkey">
            <div class="list-wrap">
              <div v-for="(_, i) in ch.gpgkeys" :key="i" class="list-row">
                <el-input
                  v-model="ch.gpgkeys[i]"
                  placeholder="如 file:///etc/pki/rpm-gpg/RPM-GPG-KEY-kylin"
                />
                <el-button link type="danger" @click="ch.gpgkeys.splice(i, 1)">删除</el-button>
              </div>
              <el-button size="small" link type="primary" @click="ch.gpgkeys.push('')">
                + 添加 gpgkey
              </el-button>
            </div>
          </el-form-item>
          <el-form-item label="sslverify">
            <el-switch v-model="ch.sslverify" />
          </el-form-item>
          <template v-if="ch.sslverify">
            <el-form-item label="sslcacert">
              <el-input v-model="ch.sslcacert" placeholder="目标主机上的 CA 证书绝对路径" />
            </el-form-item>
            <el-form-item label="sslclientcert">
              <el-input v-model="ch.sslclientcert" placeholder="客户端证书绝对路径" />
            </el-form-item>
            <el-form-item label="sslclientkey">
              <el-input v-model="ch.sslclientkey" placeholder="客户端私钥绝对路径" />
            </el-form-item>
          </template>
          <el-form-item label="高级选项">
            <div class="list-wrap">
              <div v-for="(opt, i) in ch.extraList" :key="i" class="list-row">
                <el-input v-model="opt.key" placeholder="key，如 priority" style="width: 40%" />
                <el-input v-model="opt.value" placeholder="value" />
                <el-button link type="danger" @click="ch.extraList.splice(i, 1)">删除</el-button>
              </div>
              <el-button
                size="small"
                link
                type="primary"
                @click="ch.extraList.push({ key: '', value: '' })"
              >
                + 添加选项
              </el-button>
            </div>
          </el-form-item>
        </el-collapse-item>
        </el-collapse>
      </el-form>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </div>
    </template>

    <el-dialog v-model="importVisible" title="从 repo 文件导入" width="560px" append-to-body>
      <el-input
        v-model="importText"
        type="textarea"
        :rows="12"
        placeholder="粘贴 .repo 文件内容，由后端解析为多频道"
      />
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleImport">导入并保存</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { repoApi } from '../../api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  repoData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const importVisible = ref(false)
const importText = ref('')

let keySeed = 0
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/
const REPOID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/
const EXTRA_KEY_RE = /^[a-z0-9_]+$/
const URL_RE = /^(https?|ftp|file):\/\//i
const RESERVED_KEYS = [
  'name',
  'baseurl',
  'enabled',
  'gpgcheck',
  'gpgkey',
  'sslverify',
  'sslcacert',
  'sslclientcert',
  'sslclientkey'
]

function newChannel(raw = {}) {
  return {
    _key: ++keySeed,
    repoId: '', // 不在页面显示，保存时等于名称
    name: raw.repoId || raw.name || '',
    baseurls: raw.baseurls?.length ? [...raw.baseurls] : [''],
    enabled: raw.enabled !== false,
    gpgcheck: !!raw.gpgcheck,
    gpgkeys: raw.gpgkeys ? [...raw.gpgkeys] : [],
    sslverify: raw.sslverify !== false,
    sslcacert: raw.sslcacert || '',
    sslclientcert: raw.sslclientcert || '',
    sslclientkey: raw.sslclientkey || '',
    extraList: Object.entries(raw.extraOptions || {}).map(([key, value]) => ({
      key,
      value: String(value)
    }))
  }
}

const formData = ref({
  id: null,
  repoName: '',
  repoFile: '',
  repoDesc: ''
})
const channels = ref([newChannel()])
// 当前展开的频道（以 _key 标识），默认展开第一个
const activeKeys = ref([channels.value[0]._key])

function resetChannels(list) {
  channels.value = list
  activeKeys.value = list.length ? [list[0]._key] : []
}

function toggleAll(expand) {
  activeKeys.value = expand ? channels.value.map(c => c._key) : []
}

const formRules = {
  repoName: [
    { required: true, message: '请输入仓库名称', trigger: 'blur' },
    {
      pattern: NAME_RE,
      message: '只能英文字母、数字、. _ -，字母或数字开头，最长 64',
      trigger: 'blur'
    }
  ],
  repoFile: [
    { required: true, message: '请输入配置文件名', trigger: 'blur' },
    {
      pattern: NAME_RE,
      message: '只能英文字母、数字、. _ -，字母或数字开头，最长 64（不带 .repo）',
      trigger: 'blur'
    }
  ]
}

const isEdit = computed(() => !!formData.value.id)

// 解析老数据: repo_channels 为空时，把 repo_url 当作"一行一个地址"放入单个频道
function parseChannels(data) {
  if (data.repo_channels) {
    try {
      const arr = JSON.parse(data.repo_channels)
      if (Array.isArray(arr) && arr.length) return arr.map(newChannel)
    } catch (e) {
      // ignore, fall back
    }
  }
  const urls = String(data.repo_url || '')
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean)
  return [
    newChannel({
      repoId: data.repo_name || '',
      baseurls: urls,
      gpgcheck: false,
      sslverify: false
    })
  ]
}

watch(
  () => props.modelValue,
  val => {
    visible.value = val
    if (val && props.repoData) {
      formData.value = {
        id: props.repoData.id || null,
        repoName: props.repoData.repo_name || '',
        repoFile: props.repoData.repo_file || '',
        repoDesc: props.repoData.repo_desc || ''
      }
      // 编辑多频道时默认全部折叠，仅单频道时展开
      const list = parseChannels(props.repoData)
      channels.value = list
      activeKeys.value = list.length === 1 ? [list[0]._key] : []
    }
  }
)

watch(visible, val => {
  emit('update:modelValue', val)
})

function addChannel() {
  if (channels.value.length >= 50) {
    ElMessage.warning('最多 50 个频道')
    return
  }
  const ch = newChannel()
  channels.value.push(ch)
  activeKeys.value = [...activeKeys.value, ch._key]
}

function removeChannel(idx) {
  const [removed] = channels.value.splice(idx, 1)
  activeKeys.value = activeKeys.value.filter(k => k !== removed._key)
}

function openImport() {
  importText.value = ''
  importVisible.value = true
}

const FORBIDDEN_RE = /'|\{\{|\{%|\{#/

function hasForbidden(...values) {
  return values.some(v => FORBIDDEN_RE.test(String(v ?? '')))
}

// 校验并序列化频道，失败返回 null
function buildChannels() {
  const seen = new Set()
  const result = []
  for (let i = 0; i < channels.value.length; i++) {
    const ch = channels.value[i]
    const label = `频道 ${i + 1}`
    const repoId = ch.name.trim()
    const name = repoId
    if (!repoId || !REPOID_RE.test(repoId)) {
      ElMessage.error(`${label}：名称必填，只能字母数字及 . _ : -，且以字母或数字开头`)
      return null
    }
    if (seen.has(repoId)) {
      ElMessage.error(`${label}：名称 "${repoId}" 重复`)
      return null
    }
    seen.add(repoId)
    const baseurls = ch.baseurls.map(s => s.trim()).filter(Boolean)
    if (!baseurls.length || baseurls.length > 20) {
      ElMessage.error(`${label}：仓库地址至少 1 个，最多 20 个`)
      return null
    }
    if (baseurls.some(u => !URL_RE.test(u))) {
      ElMessage.error(`${label}：仓库地址需以 http/https/ftp/file:// 开头`)
      return null
    }
    const gpgkeys = ch.gpgcheck ? ch.gpgkeys.map(s => s.trim()).filter(Boolean) : []
    const extraOptions = {}
    for (const { key, value } of ch.extraList) {
      const k = key.trim()
      if (!k && !String(value).trim()) continue
      if (!EXTRA_KEY_RE.test(k) || RESERVED_KEYS.includes(k)) {
        ElMessage.error(`${label}：高级选项 key "${k}" 不合法（小写字母数字下划线，且不能与已有字段重名）`)
        return null
      }
      extraOptions[k] = String(value).trim()
    }
    const sslcacert = ch.sslverify ? ch.sslcacert.trim() : ''
    const sslclientcert = ch.sslverify ? ch.sslclientcert.trim() : ''
    const sslclientkey = ch.sslverify ? ch.sslclientkey.trim() : ''

    if (hasForbidden(repoId, name, baseurls, gpgkeys, sslcacert, sslclientcert, sslclientkey, Object.entries(extraOptions))) {
      ElMessage.error(`${label}：内容不能包含英文单引号 ' 以及 {{、{%、{#`)
      return null
    }

    result.push({
      repoId,
      name,
      baseurls,
      enabled: ch.enabled,
      gpgcheck: ch.gpgcheck,
      gpgkeys,
      sslverify: ch.sslverify,
      sslcacert,
      sslclientcert,
      sslclientkey,
      extraOptions
    })
  }
  return result
}

// 判断作业返回，失败时给出提示
function checkResult(res) {
  const payload = res?.data ?? res
  const r = Array.isArray(payload) ? payload[0] : null
  if (r?.status !== 'COMPLETED') {
    let msg = isEdit.value ? '仓库更新失败' : '仓库添加失败'
    try {
      msg = JSON.parse(r.error).message || msg
    } catch (e) {
      // ignore
    }
    ElMessage.error(msg)
    return false
  }
  return true
}

async function doSave(extra) {
  const res = await repoApi.saveCustomRepo({
    id: formData.value.id,
    repoName: formData.value.repoName,
    repoFile: formData.value.repoFile.replace(/\.repo$/i, ''),
    repoDesc: formData.value.repoDesc,
    ...extra
  })
  if (!checkResult(res)) return false
  ElMessage.success(isEdit.value ? '仓库更新成功' : '仓库添加成功')
  emit('success')
  importVisible.value = false
  handleClose()
  return true
}

async function validateBase() {
  if (!formRef.value) return false
  try {
    await formRef.value.validate()
  } catch {
    return false
  }
  if (hasForbidden(formData.value.repoDesc)) {
    ElMessage.error("仓库描述不能包含英文单引号 ' 以及 {{、{%、{#")
    return false
  }
  return true
}

async function handleSubmit() {
  if (!(await validateBase())) return
  const list = buildChannels()
  if (!list) return

  submitting.value = true
  try {
    await doSave({ repoUrl: '', channels: JSON.stringify(list) })
  } catch (error) {
    console.error('Failed to save repo:', error)
    ElMessage.error(isEdit.value ? '仓库更新失败' : '仓库添加失败')
  } finally {
    submitting.value = false
  }
}

async function handleImport() {
  const text = importText.value.trim()
  if (!text) {
    ElMessage.warning('请粘贴 repo 文件内容')
    return
  }
  if (hasForbidden(text)) {
    ElMessage.error("内容不能包含英文单引号 ' 以及 {{、{%、{#")
    return
  }
  if (!(await validateBase())) return

  submitting.value = true
  try {
    // 不传 channels，repoUrl 为 .repo 文本，由后端解析
    await doSave({ repoUrl: text })
  } catch (error) {
    console.error('Failed to import repo:', error)
    ElMessage.error('导入失败')
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  visible.value = false
  formData.value = {
    id: null,
    repoName: '',
    repoFile: '',
    repoDesc: ''
  }
  resetChannels([newChannel()])
  formRef.value?.resetFields()
}
</script>

<style scoped lang="scss">
.repo-add-dialog {
  padding: 0 16px;
  max-height: 70vh;
  overflow-y: auto;
}

.channel-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 4px;
}

.channel-collapse {
  margin-bottom: 12px;
}

.channel-title {
  font-weight: 500;
  flex-shrink: 0;
}

.channel-summary {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-secondary, #909399);
  font-size: 12px;
}

.channel-toolbar {
  display: flex;
  gap: 8px;
}

.channel-card {
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 6px;
  padding: 12px 12px 0;
  margin-bottom: 12px;
}

.channel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  padding-right: 12px;
}

.list-wrap {
  width: 100%;
}

.list-row {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
