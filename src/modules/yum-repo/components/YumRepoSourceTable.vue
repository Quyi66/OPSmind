<template>
  <div class="win-patch-yum-page">
    <div class="ops-filter-bar">
      <el-form inline size="small">
        <el-form-item :label="t('yumRepo.keyword')">
          <el-input
            v-model="filterText"
            :placeholder="t('yumRepo.searchConfigs')"
            :style="{ width: currentLocale === 'en-US' ? '360px' : '240px' }"
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
      <el-button type="primary" size="small" @click="handleAddConfig">{{ t('yumRepo.addConfig') }}</el-button>
      <el-button
        size="small"
        :disabled="!configs.length"
        :loading="batchCollecting"
        @click="emit('collect-all')"
      >
        {{ t('yumRepo.collectAll') }}
      </el-button>
      <span class="win-patch-action-spacer"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        @click="emit('refresh')"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <div class="ops-table-wrapper">
      <el-table v-loading="loading" :data="paginatedConfigs" class="natural-height-table">
        <el-table-column :label="t('yumRepo.sourceName')" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getYumConfigLabel(row) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('yumRepo.description')" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.description || '-' }}
          </template>
        </el-table-column>
        <el-table-column :label="t('yumRepo.repoUrl')" min-width="260">
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
                  <span class="more-link">+{{ getYumConfigBaseurls(row).length - 2 }} {{ t('yumRepo.more') }}</span>
                </template>
                <div class="yum-baseurls-popover">
                  <div v-for="url in getYumConfigBaseurls(row)" :key="url" class="yum-baseurl-item">
                    {{ url }}
                  </div>
                </div>
              </el-popover>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('yumRepo.sourceFile')" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getYumConfigFile(row) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('yumRepo.updatedAt')" min-width="170" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatDateTime(row.updateTime || row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('yumRepo.collectStatus')" :width="currentLocale === 'en-US' ? 190 : 110" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="getCollectStatusTagType(row)">
              {{ getCollectStatusLabel(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('yumRepo.packages')" width="90" align="center">
          <template #default="{ row }">
            {{ row.packageCount ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column :label="t('common.actions')" width="230" fixed="right">
          <template #default="{ row }">
            <el-button
              text
              type="primary"
              size="small"
              :loading="collectingConfigId === resolveYumConfigId(row)"
              @click.stop="emit('collect', row)"
            >
              {{ t('yumRepo.collect') }}
            </el-button>
            <el-button
              text
              type="primary"
              size="small"
              :disabled="!getSourceId(row)"
              @click.stop="emit('open-packages', row)"
            >
              {{ t('yumRepo.inventory') }}
            </el-button>
            <el-button
              text
              type="primary"
              size="small"
              :disabled="!canOpenCompare(row)"
              @click.stop="emit('open-compare', row)"
            >
              {{ t('yumRepo.compare') }}
            </el-button>
            <el-button text type="primary" size="small" @click.stop="handleEditConfig(row)">
              {{ t('common.edit') }}
            </el-button>
            <el-button text type="danger" size="small" @click.stop="handleDeleteConfig(row)">
              {{ t('common.delete') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="filteredConfigs.length"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handlePageSizeChange"
      />
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="editingConfig ? t('yumRepo.editConfig') : t('yumRepo.addConfig')"
      width="800px"
      :close-on-press-escape="false"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" :validate-on-rule-change="false" :label-width="currentLocale === 'en-US' ? '180px' : '100px'">
        <el-form-item :label="t('yumRepo.yumSourceName')" prop="name">
          <el-input v-model="formData.name" :placeholder="t('yumRepo.nameRequired')" maxlength="50" />
        </el-form-item>
        <el-form-item :label="t('yumRepo.description')" prop="description">
          <el-input v-model="formData.description" :placeholder="t('yumRepo.descriptionPlaceholder')" maxlength="200" />
        </el-form-item>
        <el-form-item :label="t('yumRepo.yumRepoUrl')" prop="baseurls">
          <div class="yum-baseurl-list">
            <div v-for="(url, index) in formData.baseurls" :key="index" class="yum-baseurl-row">
              <el-input
                v-model="formData.baseurls[index]"
                :placeholder="t('yumRepo.baseurlPlaceholder')"
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
        <el-form-item :label="t('yumRepo.os')" prop="osFamily">
          <el-select v-model="formData.osFamily" :placeholder="t('yumRepo.osRequired')" style="width: 100%">
            <el-option
              v-for="item in YUM_REPO_OS_FAMILY_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('yumRepo.osMajor')" prop="osMajor">
          <el-input
            v-model="formData.osMajor"
            :placeholder="t('yumRepo.majorExample')"
            maxlength="16"
          />
        </el-form-item>
        <el-form-item :label="t('yumRepo.osRelease')" prop="osSpVersion">
          <el-input
            v-model="formData.osSpVersion"
            :placeholder="t('yumRepo.releaseExample')"
            maxlength="32"
          />
        </el-form-item>
        <el-form-item :label="t('yumRepo.architecture')" prop="arch">
          <el-select v-model="formData.arch" :placeholder="t('yumRepo.archRequired')" style="width: 100%">
            <el-option
              v-for="item in YUM_REPO_ARCH_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('yumRepo.yumSourceFile')" prop="file">
          <el-input
            v-model="formData.file"
            :placeholder="t('yumRepo.fileExample')"
            maxlength="256"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">{{ t('yumRepo.confirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'
import { useLocalizedValidation } from '@/core/i18n/validation'

import { computed, nextTick, reactive, ref, watch } from 'vue'
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
const currentPage = ref(1)
const pageSize = ref(10)
const dialogVisible = ref(false)
const submitting = ref(false)
const editingConfig = ref(null)
const formRef = ref(null)
useLocalizedValidation(formRef)
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
  const baseurls = normalizeBaseurls(value)
  if (!baseurls.length) {
    callback(new Error(t('yumRepo.baseurlsRequired')))
    return
  }

  const invalidUrl = baseurls.find(item => !/^https?:\/\//i.test(item))
  if (invalidUrl) {
    callback(new Error(t('yumRepo.baseurlProtocol')))
    return
  }

  if (baseurls.length > 0) {
    callback()
    return
  }
}

function validateOsMajor(rule, value, callback) {
  const v = String(value || '').trim()
  if (!v) {
    callback(new Error(t('yumRepo.majorRequired')))
    return
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9.\- ]{0,15}$/.test(v)) {
    callback(new Error(t('yumRepo.majorInvalid')))
    return
  }
  callback()
}

function validateOsSpVersion(rule, value, callback) {
  const v = String(value || '').trim()
  if (v && !/^(SP\d+(?:\.\d+)?(?:[\s_/-]+\d\w*)?|Update\d+|HPC|Host|Compat)$/i.test(v)) {
    callback(
      new Error(
        t('yumRepo.spInvalid')
      )
    )
    return
  }
  callback()
}

const formRules = computed(() => ({
  name: [{ required: true, message: t('yumRepo.nameRequired'), trigger: 'blur' }],
  baseurls: [{ validator: validateBaseurls, trigger: ['blur', 'change'] }],
  osFamily: [{ required: true, message: t('yumRepo.osRequired'), trigger: 'change' }],
  osMajor: [{ validator: validateOsMajor, trigger: 'blur' }],
  osSpVersion: [{ validator: validateOsSpVersion, trigger: 'blur' }],
  arch: [{ required: true, message: t('yumRepo.archRequired'), trigger: 'change' }]
}))

const filteredConfigs = computed(() => {
  const keyword = String(filterText.value || '')
    .trim()
    .toLowerCase()
  if (!keyword) return props.configs

  return props.configs.filter(item => {
    const config = item || {}
    return [
      config.name,
      config.description,
      getYumConfigBaseurlsText(config),
      config.file,
      config.collectStatus
    ].some(value =>
      String(value || '')
        .toLowerCase()
        .includes(keyword)
    )
  })
})

const paginatedConfigs = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredConfigs.value.slice(start, start + pageSize.value)
})

watch(filterText, () => {
  currentPage.value = 1
})

watch(
  () => filteredConfigs.value.length,
  total => {
    const maxPage = Math.max(1, Math.ceil(total / pageSize.value))
    if (currentPage.value > maxPage) {
      currentPage.value = maxPage
    }
  },
  { immediate: true }
)

function handlePageSizeChange() {
  currentPage.value = 1
}

function getSourceId(row) {
  return resolveYumRepoId(findYumRepoSourceByConfig(row, props.sources))
}

function canOpenCompare(row) {
  return Boolean(getSourceId(row)) && isYumRepoCollectSucceeded(row)
}

function resolveConfigBaseurls(row) {
  const baseurls = Array.isArray(row?.baseurls) ? row.baseurls : []
  const fallbackBaseurl = String(row?.baseurl || '').trim()
  return baseurls.length > 0 ? baseurls : fallbackBaseurl ? [fallbackBaseurl] : []
}

function normalizeBaseurl(value) {
  return String(value || '')
    .trim()
    .replace(/\/+$/, '')
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
      const response = await yumRepoApi.updateConfig(
        resolveYumConfigId(previousConfig),
        submitPayload
      )
      const updatedConfig = {
        ...previousConfig,
        ...submitPayload,
        ...(response?.data ?? response ?? {})
      }
      const nextBaseurls = serializeBaseurls(resolveConfigBaseurls(updatedConfig))
      const baseurlChanged = previousBaseurls !== nextBaseurls

      ElMessage.success(baseurlChanged ? t('yumRepo.updatedRecollecting') : t('yumRepo.updated'))
      dialogVisible.value = false
      emit('updated', {
        config: updatedConfig,
        baseurlChanged
      })
    } else {
      const response = await yumRepoApi.createConfig(submitPayload)
      const newConfig = response?.data ?? response ?? {}
      ElMessage.success(t('yumRepo.addedCollecting'))
      dialogVisible.value = false
      emit('created', newConfig)
    }
  } catch (error) {
    if (error !== false) {
      console.error('提交YUM源配置失败:', error)
    }
  } finally {
    submitting.value = false
  }
}

async function handleDeleteConfig(row) {
  try {
    await ElMessageBox.confirm(
      t('yumRepo.deleteConfigConfirm', { name: getYumConfigLabel(row) }),
      t('yumRepo.deleteTitle'),
      {
        closeOnClickModal: false,
        closeOnPressEscape: false,
        type: 'warning'
      }
    )
    await yumRepoApi.deleteConfig(resolveYumConfigId(row))
    ElMessage.success(t('yumRepo.configDeleted'))
    emit('refresh')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('删除YUM源配置失败:', error)
      ElMessage.error(t('yumRepo.deleteConfigFailed'))
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
