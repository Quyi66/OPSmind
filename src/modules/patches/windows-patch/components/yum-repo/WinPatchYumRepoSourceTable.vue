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
      <el-table v-loading="loading" :data="filteredConfigs" max-height="calc(100vh - 250px)">
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
        <el-table-column label="仓库地址" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getYumConfigBaseurl(row) }}
          </template>
        </el-table-column>
        <el-table-column label="来源文件" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getYumConfigFile(row) }}
          </template>
        </el-table-column>
        <el-table-column label="录入标识" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getYumConfigMarkerValue(row) }}
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
        <el-table-column label="操作" width="220" fixed="right">
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
            <el-button text type="primary" size="small" :disabled="!getSourceId(row)" @click.stop="emit('open-compare', row)">
              比对
            </el-button>
            <el-button text type="primary" size="small" @click.stop="handleEditConfig(row)">编辑</el-button>
            <!-- <el-button text type="primary" size="small" @click.stop="handleConfigHosts(row)">配置</el-button> -->
            <el-button text type="danger" size="small" @click.stop="handleDeleteConfig(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="editingConfig ? '编辑YUM源' : 'YUM源配置录入'" width="600px">
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="YUM源名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入YUM源名称" maxlength="50" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="formData.description" placeholder="请输入描述" maxlength="200" />
        </el-form-item>
        <el-form-item label="YUM源地址" prop="baseurl">
          <el-input v-model="formData.baseurl" placeholder="请输入YUM源地址" maxlength="500" />
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

    <el-dialog
      v-model="selectHostDialogVisible"
      title="选择目标主机"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="select-host-dialog-content">
        <el-form-item label="操作类型" label-width="80px" class="win-patch-config-action">
          <el-radio-group v-model="configAction">
            <el-radio value="add">添加YUM源</el-radio>
            <el-radio value="remove">移除YUM源</el-radio>
          </el-radio-group>
        </el-form-item>
        <AcmDeviceSelector
          v-model="selectedDevices"
          ci-types="[auto]"
          :options="{
            selectMode: 'host,group,tag,input,recently',
            selector: 'multiple',
            label: '选择设备'
          }"
        />
      </div>
      <template #footer>
        <el-button @click="selectHostDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="jobExecuting"
          :disabled="selectedDevices.length === 0"
          @click="executeConfigJob"
        >
          开始配置
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { runJob } from '@/modules/automation/api/command'
import { useJobPolling } from '@/composables/useJobPolling'
import { yumRepoApi } from '../../yumRepoApi'
import {
  findYumRepoSourceByConfig,
  getCollectStatusLabel,
  getCollectStatusTagType,
  getYumConfigBaseurl,
  getYumConfigFile,
  getYumConfigMarkerValue,
  getYumConfigLabel,
  resolveYumConfigId,
  resolveYumRepoId
} from '../../yumRepoUtils'

const YUM_JOB_ID = 'IxL8nr'

const { startPolling } = useJobPolling()

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
  'open-compare'
])

const filterText = ref('')
const dialogVisible = ref(false)
const selectHostDialogVisible = ref(false)
const submitting = ref(false)
const jobExecuting = ref(false)
const editingConfig = ref(null)
const configRepo = ref(null)
const configAction = ref('add')
const formRef = ref(null)
const selectedDevices = ref([])
const formData = reactive({
  name: '',
  description: '',
  baseurl: '',
  file: ''
})
const formRules = {
  baseurl: [{ required: true, message: '请输入YUM源地址', trigger: 'blur' }]
}

const filteredConfigs = computed(() => {
  const keyword = String(filterText.value || '').trim().toLowerCase()
  if (!keyword) return props.configs

  return props.configs.filter(item => {
    const config = item || {}
    return [config.name, config.description, config.baseurl, config.file, config.collectStatus]
      .some(value => String(value || '').toLowerCase().includes(keyword))
  })
})

function getSourceId(row) {
  return resolveYumRepoId(findYumRepoSourceByConfig(row, props.sources))
}

function resetForm() {
  Object.assign(formData, {
    name: '',
    description: '',
    baseurl: '',
    file: ''
  })
}

function handleAddConfig() {
  editingConfig.value = null
  resetForm()
  dialogVisible.value = true
}

function handleEditConfig(row) {
  editingConfig.value = row
  Object.assign(formData, {
    name: row?.name || '',
    description: row?.description || '',
    baseurl: row?.baseurl || '',
    file: row?.file || ''
  })
  dialogVisible.value = true
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
    submitting.value = true

    if (editingConfig.value) {
      await yumRepoApi.updateConfig(resolveYumConfigId(editingConfig.value), formData)
      ElMessage.success('更新成功')
    } else {
      await yumRepoApi.createConfig(formData)
      ElMessage.success('添加成功')
    }

    dialogVisible.value = false
    emit('refresh')
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

function handleConfigHosts(row) {
  configRepo.value = row
  configAction.value = 'add'
  selectedDevices.value = []
  selectHostDialogVisible.value = true
}

async function executeConfigJob() {
  if (selectedDevices.value.length === 0 || !configRepo.value) {
    ElMessage.warning('请选择至少一台主机')
    return
  }

  jobExecuting.value = true

  try {
    const hosts = selectedDevices.value.map(host => ({
      key: host.key || host.id,
      value: host.value || host.hostname || host.$data_owner,
      assetType: host.ci_type || host.assetType || 'linux'
    }))

    const response = await runJob(YUM_JOB_ID, {
      params: {
        hosts,
        func: 'yum-configs',
        action: configAction.value,
        repo_name: configRepo.value.name,
        repo_desc: configRepo.value.description || '',
        repo_url: configAction.value === 'remove' ? '' : configRepo.value.baseurl,
        repo_file: configRepo.value.file,
        repo_status: ''
      }
    })

    const runResult = (response?.data || response || [])[0]
    if (!runResult?.runId) {
      throw new Error('未获取到任务运行ID')
    }

    ElMessage.success('配置任务已提交')
    selectHostDialogVisible.value = false

    startPolling(runResult.runId, {
      successMessage: '任务执行成功',
      errorMessage: '任务执行失败',
      onComplete: () => {
        jobExecuting.value = false
      }
    })
  } catch (error) {
    console.error('执行 Yum 源配置任务失败:', error)
    ElMessage.error(`任务执行失败: ${error?.message || '未知错误'}`)
    jobExecuting.value = false
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

.select-host-dialog-content {
  padding: 8px;
}

.win-patch-config-action {
  margin-bottom: 12px;
}

</style>
