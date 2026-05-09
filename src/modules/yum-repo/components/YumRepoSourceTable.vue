<template>
  <div class="win-patch-yum-page">
    <div class="ops-filter-bar">
      <el-form inline size="small">
        <el-form-item label="关键词">
          <el-input
            v-model="filterText"
            placeholder="搜索名称、描述、地址或文件"
            style="width: 240px"
            clearable
            maxlength="100"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
    </div>

    <div class="ops-action-bar">
      <el-button type="primary" size="small" @click="handleAddConfig">YUM源配置录入</el-button>
      <el-button
        size="small"
        :disabled="!configs.length"
        :loading="batchCollecting"
        @click="emit('collect-all')"
      >
        全部采集
      </el-button>
      <span class="win-patch-action-spacer"></span>
      <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="emit('refresh')">
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <div class="ops-table-wrapper">
      <el-table v-loading="loading" :data="filteredConfigs" max-height="calc(100vh - 480px)">
        <el-table-column label="源名称" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getYumConfigLabel(row) }}
          </template>
        </el-table-column>
        <el-table-column label="描述" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.description || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="仓库地址" min-width="260">
          <template #default="{ row }">
            <div v-if="getYumConfigBaseurls(row).length" class="yum-baseurls-cell">
              <div
                v-for="url in getYumConfigBaseurls(row).slice(0, 2)"
                :key="url"
                class="yum-baseurl-item"
              >
                {{ url }}
              </div>
              <el-popover
                v-if="getYumConfigBaseurls(row).length > 2"
                placement="top"
                trigger="hover"
                :width="400"
              >
                <template #reference>
                  <span class="more-link">
                    +{{ getYumConfigBaseurls(row).length - 2 }} 更多
                  </span>
                </template>
                <div class="yum-baseurls-popover">
                  <div
                    v-for="url in getYumConfigBaseurls(row)"
                    :key="url"
                    class="yum-baseurl-item"
                  >
                    {{ url }}
                  </div>
                </div>
              </el-popover>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="来源文件" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getYumConfigFile(row) }}
          </template>
        </el-table-column>
        <el-table-column label="更新时间" min-width="170" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatDateTime(row.updateTime || row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="采集状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="getCollectStatusTagType(row)">
              {{ getCollectStatusLabel(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="包数量" width="90" align="center">
          <template #default="{ row }">
            {{ row.packageCount ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button
              text
              type="primary"
              size="small"
              :loading="collectingConfigId === resolveYumConfigId(row)"
              @click.stop="emit('collect', row)"
            >
              采集
            </el-button>
            <el-button text type="primary" size="small" :disabled="!getSourceId(row)" @click.stop="emit('open-packages', row)">
              清单
            </el-button>
            <el-button text type="primary" size="small" :disabled="!canOpenCompare(row)" @click.stop="emit('open-compare', row)">
              比对
            </el-button>
            <el-button text type="primary" size="small" @click.stop="handleEditConfig(row)">编辑</el-button>
            <el-button text type="danger" size="small" @click.stop="handleDeleteConfig(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="editingConfig ? '编辑YUM源配置' : 'YUM源配置录入'" width="800px">
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="YUM源名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入YUM源名称" maxlength="50" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="formData.description" placeholder="请输入描述" maxlength="200" />
        </el-form-item>
        <el-form-item label="YUM仓库地址" prop="baseurls">
          <div class="yum-baseurl-list">
            <div v-for="(url, index) in formData.baseurls" :key="index" class="yum-baseurl-row">
              <el-input
                v-model="formData.baseurls[index]"
                placeholder="请输入仓库baseurl地址"
                maxlength="500"
              />
              <el-button class="yum-baseurl-action" circle @click="addBaseurlRow">
                <el-icon><Plus /></el-icon>
              </el-button>
              <el-button
                v-if="formData.baseurls.length > 1"
                class="yum-baseurl-action"
                circle
                type="danger"
                plain
                @click="removeBaseurlRow(index)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="操作系统" prop="osFamily">
          <el-select v-model="formData.osFamily" placeholder="请选择操作系统" style="width: 100%">
            <el-option
              v-for="item in YUM_REPO_OS_FAMILY_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="主版本号" prop="osMajor">
          <el-input v-model="formData.osMajor" placeholder="如：V10、8、22.04、20、12 SP5" maxlength="16" />
        </el-form-item>
        <el-form-item label="OS 精确版本" prop="osSpVersion">
          <el-input v-model="formData.osSpVersion" placeholder="如：SP1、SP3、SP3 2403、HPC、Host" maxlength="32" />
        </el-form-item>
        <el-form-item label="架构" prop="arch">
          <el-select v-model="formData.arch" placeholder="请选择架构" style="width: 100%">
            <el-option
              v-for="item in YUM_REPO_ARCH_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="YUM源文件" prop="file">
          <el-input v-model="formData.file" placeholder="如：/etc/yum.repos.d/local.repo" maxlength="256" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Plus, Refresh, Search } from '@element-plus/icons-vue'
import { YUM_REPO_ARCH_OPTIONS, YUM_REPO_OS_FAMILY_OPTIONS } from '../constants'
import { yumRepoApi } from '../api'
import {
  formatDateTime,
  findYumRepoSourceByConfig,
  getCollectStatusLabel,
  getCollectStatusTagType,
  getYumConfigFile,
  getYumConfigLabel,
  isYumRepoCollectSucceeded,
  resolveYumConfigId,
  resolveYumRepoId
} from '../utils'

const props = defineProps({
  configs: {
    type: Array,
    default: () => []
  },
  sources: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  collectingConfigId: {
    type: String,
    default: ''
  },
  batchCollecting: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'refresh',
  'collect',
  'collect-all',
  'open-packages',
  'open-compare',
  'created',
  'updated'
])

const filterText = ref('')
const dialogVisible = ref(false)
const submitting = ref(false)
const editingConfig = ref(null)
const formRef = ref(null)
const formData = reactive({
  name: '',
  description: '',
  baseurls: [''],
  osFamily: '',
  osMajor: '',
  osSpVersion: '',
  arch: '',
  file: ''
})

function validateBaseurls(rule, value, callback) {
  if (normalizeBaseurls(value).length > 0) {
    callback()
    return
  }
  callback(new Error('请至少输入一个仓库baseurl地址'))
}

function validateOsMajor(rule, value, callback) {
  const v = String(value || '').trim()
  if (!v) {
    callback(new Error('请填写主版本号'))
    return
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9.\- ]{0,15}$/.test(v)) {
    callback(new Error('主版本号格式不正确（仅允许字母/数字/点号/连字符/空格，长度 1~16）'))
    return
  }
  callback()
}

function validateOsSpVersion(rule, value, callback) {
  const v = String(value || '').trim()
  if (formData.osFamily === 'kylinos' && !v) {
    callback(new Error('麒麟仓库必须填写 OS 精确版本（如 SP1、SP3、SP3 2403、HPC、Host）'))
    return
  }
  if (v && !/^(SP\d+(\.\d+)?( \w+)?|Update\d+|HPC|Host|Compat)$/.test(v)) {
    callback(new Error('OS 精确版本格式不正确，请按 SP1 / SP1.1 / SP3 2403 / Update6 / HPC / Host / Compat 形式填写'))
    return
  }
  callback()
}

const formRules = {
  name: [{ required: true, message: '请输入YUM源名称', trigger: 'blur' }],
  baseurls: [{ validator: validateBaseurls, trigger: ['blur', 'change'] }],
  osFamily: [{ required: true, message: '请选择操作系统', trigger: 'change' }],
  osMajor: [{ validator: validateOsMajor, trigger: 'blur' }],
  osSpVersion: [{ validator: validateOsSpVersion, trigger: 'blur' }],
  arch: [{ required: true, message: '请选择架构', trigger: 'change' }]
}

const filteredConfigs = computed(() => {
  const keyword = String(filterText.value || '').trim().toLowerCase()
  if (!keyword) return props.configs

  return props.configs.filter(item => {
    const config = item || {}
    return [
      config.name,
      config.description,
      getYumConfigBaseurlsText(config),
      config.file,
      config.collectStatus
    ]
      .some(value => String(value || '').toLowerCase().includes(keyword))
  })
})

function getSourceId(row) {
  return resolveYumRepoId(findYumRepoSourceByConfig(row, props.sources))
}

function canOpenCompare(row) {
  return Boolean(getSourceId(row)) && isYumRepoCollectSucceeded(row)
}

function resolveConfigBaseurls(row) {
  const baseurls = Array.isArray(row?.baseurls) ? row.baseurls : []
  const fallbackBaseurl = String(row?.baseurl || '').trim()
  return baseurls.length > 0 ? baseurls : (fallbackBaseurl ? [fallbackBaseurl] : [])
}

function normalizeBaseurl(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function normalizeBaseurls(list = []) {
  const values = Array.isArray(list) ? list : []
  const dedupeSet = new Set()

  values.forEach(item => {
    const normalized = normalizeBaseurl(item)
    if (normalized) {
      dedupeSet.add(normalized)
    }
  })

  return Array.from(dedupeSet)
}

function getYumConfigBaseurls(row) {
  return normalizeBaseurls(resolveConfigBaseurls(row))
}

function getYumConfigBaseurlsText(row) {
  const urls = getYumConfigBaseurls(row)
  return urls.length > 0 ? urls.join('；') : '-'
}

function createSubmitPayload() {
  const payload = {
    name: String(formData.name || '').trim(),
    description: String(formData.description || '').trim(),
    baseurls: normalizeBaseurls(formData.baseurls),
    osFamily: String(formData.osFamily || '').trim(),
    osMajor: String(formData.osMajor || '').trim(),
    arch: String(formData.arch || '').trim(),
    file: String(formData.file || '').trim()
  }
  const osSpVersion = String(formData.osSpVersion || '').trim()
  if (osSpVersion) {
    payload.osSpVersion = osSpVersion
  }
  return payload
}

function serializeBaseurls(list = []) {
  return normalizeBaseurls(list).sort().join('|')
}

function addBaseurlRow() {
  formData.baseurls.push('')
}

function removeBaseurlRow(index) {
  if (formData.baseurls.length <= 1) {
    formData.baseurls[0] = ''
    return
  }

  formData.baseurls.splice(index, 1)
}

function resetForm() {
  Object.assign(formData, {
    name: '',
    description: '',
    baseurls: [''],
    osFamily: '',
    osMajor: '',
    osSpVersion: '',
    arch: '',
    file: ''
  })
}

function handleAddConfig() {
  editingConfig.value = null
  resetForm()
  dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

function handleEditConfig(row) {
  editingConfig.value = row
  Object.assign(formData, {
    name: row?.name || '',
    description: row?.description || '',
    baseurls: resolveConfigBaseurls(row),
    osFamily: row?.osFamily || '',
    osMajor: row?.osMajor || '',
    osSpVersion: row?.osSpVersion || '',
    arch: row?.arch || '',
    file: row?.file || ''
  })
  if (!formData.baseurls.length) {
    formData.baseurls = ['']
  }
  dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
    submitting.value = true
    const submitPayload = createSubmitPayload()

    if (editingConfig.value) {
      const previousConfig = editingConfig.value || {}
      const previousBaseurls = serializeBaseurls(resolveConfigBaseurls(previousConfig))
      const response = await yumRepoApi.updateConfig(resolveYumConfigId(previousConfig), submitPayload)
      const updatedConfig = {
        ...previousConfig,
        ...submitPayload,
        ...(response?.data ?? response ?? {})
      }
      const nextBaseurls = serializeBaseurls(resolveConfigBaseurls(updatedConfig))
      const baseurlChanged = previousBaseurls !== nextBaseurls

      ElMessage.success(baseurlChanged ? '更新成功，正在自动重新采集并比对' : '更新成功')
      dialogVisible.value = false
      emit('updated', {
        config: updatedConfig,
        baseurlChanged
      })
    } else {
      const response = await yumRepoApi.createConfig(submitPayload)
      const newConfig = response?.data ?? response ?? {}
      ElMessage.success('添加成功，正在自动采集并比对')
      dialogVisible.value = false
      emit('created', newConfig)
    }
  } catch (error) {
    if (error !== false) {
      console.error('提交 Yum 源配置失败:', error)
    }
  } finally {
    submitting.value = false
  }
}

async function handleDeleteConfig(row) {
  try {
    await ElMessageBox.confirm(`确定要删除“${getYumConfigLabel(row)}”吗？此操作不可恢复。`, '删除确认', {
      type: 'warning'
    })
    await yumRepoApi.deleteConfig(resolveYumConfigId(row))
    ElMessage.success('配置已删除')
    emit('refresh')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('删除 Yum 源配置失败:', error)
      ElMessage.error('删除 Yum 源配置失败')
    }
  }
}
</script>

<style scoped lang="scss">
.win-patch-yum-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.win-patch-action-spacer {
  flex: 1;
}

.yum-baseurl-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.yum-baseurl-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.yum-baseurl-action {
  flex-shrink: 0;
}

.yum-baseurls-cell {
  line-height: 1.5;
}

.yum-baseurl-item {
  word-break: break-all;
}

.yum-baseurls-popover {
  max-height: 250px;
  overflow-y: auto;

  .yum-baseurl-item {
    padding: 4px 0;

    &:not(:last-child) {
      border-bottom: 1px dashed var(--el-border-color-light);
    }
  }
}

.more-link {
  color: var(--el-color-primary);
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

</style>
