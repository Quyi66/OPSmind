<template>
  <el-dialog
    :model-value="visible"
    title="导出配置"
    width="960px"
    destroy-on-close
    @close="$emit('close')"
  >
    <div class="asset-model-config-dialog">
      <el-alert type="success" :closable="false" show-icon class="info-alert">
        <template #title>
          <strong>导出配置说明</strong>
        </template>
        <template #default>
          <div>选择需要在巡检结果中导出的资产模型字段，修改后点击底部保存按钮生效。</div>
        </template>
      </el-alert>

      <div v-loading="loading || saving" class="model-list">
        <template v-if="assetModelTypes.length > 0">
          <el-card
            v-for="modelType in assetModelTypes"
            :key="modelType"
            class="model-card"
            shadow="hover"
          >
            <template #header>
              <div class="card-header">
                <span class="card-title">{{ modelType }}</span>
                <el-tag type="info" size="small">
                  {{ getSelectedCount(modelType) }} / {{ assetModelData[modelType]?.length || 0 }}
                </el-tag>
              </div>
            </template>

            <div class="checkbox-grid">
              <div
                v-for="assetModel in assetModelData[modelType]"
                :key="assetModel.code"
                class="checkbox-item"
              >
                <el-checkbox
                  :model-value="assetModel.isChecked"
                  :disabled="saving"
                  :label="assetModel.title"
                  @change="checked => handleCheckChange(modelType, assetModel, checked)"
                />
              </div>
            </div>
          </el-card>
        </template>

        <el-empty v-else-if="!loading" description="暂无资产模型配置" />
      </div>
    </div>

    <template #footer>
      <el-button :disabled="saving" @click="$emit('close')">关闭</el-button>
      <el-button
        type="primary"
        :loading="saving"
        :disabled="loading || !hasPendingChanges"
        @click="handleSave"
      >
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { assetModelApi } from '../../api'

const props = defineProps({
  visible: Boolean
})

defineEmits(['close'])

const loading = ref(false)
const saving = ref(false)
const assetModelTypes = ref([])
const assetModelData = reactive({})
const originalCheckedStates = ref({})
const pendingChanges = ref({})

const hasPendingChanges = computed(() => Object.keys(pendingChanges.value).length > 0)

function buildAssetModelKey(modelType, code) {
  return `${modelType}::${code}`
}

function syncOriginalCheckedStates() {
  const nextStates = {}

  assetModelTypes.value.forEach(modelType => {
    ;(assetModelData[modelType] || []).forEach(model => {
      nextStates[buildAssetModelKey(modelType, model.code)] = Boolean(model.isChecked)
    })
  })

  originalCheckedStates.value = nextStates
  pendingChanges.value = {}
}

function removePendingChange(changeKey) {
  const nextChanges = { ...pendingChanges.value }
  delete nextChanges[changeKey]
  pendingChanges.value = nextChanges
}

function findAssetModel(modelType, code) {
  return (assetModelData[modelType] || []).find(model => model.code === code)
}

function resetAssetModelData() {
  assetModelTypes.value = []
  Object.keys(assetModelData).forEach(key => {
    delete assetModelData[key]
  })
  originalCheckedStates.value = {}
  pendingChanges.value = {}
}

function getSelectedCount(modelType) {
  const models = assetModelData[modelType] || []
  return models.filter(model => model.isChecked).length
}

async function loadAssetModelTypes() {
  loading.value = true
  resetAssetModelData()

  try {
    const response = await assetModelApi.getAssetModelTypes()
    const data = response?.data || response || {}
    const modelTypes = Object.keys(data)

    assetModelTypes.value = modelTypes

    modelTypes.forEach(key => {
      assetModelData[key] = (data[key] || []).map(item => ({
        ...item,
        isChecked: false
      }))
    })

    if (modelTypes.length > 0) {
      await loadSelectedModels()
    }

    syncOriginalCheckedStates()
  } catch (error) {
    console.error('加载资产模型类型失败:', error)
    ElMessage.error('加载资产模型类型失败')
  } finally {
    loading.value = false
  }
}

async function loadSelectedModels() {
  try {
    const response = await assetModelApi.getSelectedAssetModels()
    const data = response?.data || response || {}

    Object.keys(data).forEach(key => {
      if (!assetModelData[key]) {
        return
      }

      const selectedCodes = (data[key] || []).map(item => item.code)
      assetModelData[key].forEach(model => {
        model.isChecked = selectedCodes.includes(model.code)
      })
    })
  } catch (error) {
    console.error('加载已选择的资产模型失败:', error)
    ElMessage.error('加载已选择的资产模型失败')
  }
}

function handleCheckChange(modelType, assetModel, checked) {
  assetModel.isChecked = checked

  const changeKey = buildAssetModelKey(modelType, assetModel.code)
  if (originalCheckedStates.value[changeKey] === checked) {
    removePendingChange(changeKey)
    return
  }

  pendingChanges.value = {
    ...pendingChanges.value,
    [changeKey]: {
      modelType,
      code: assetModel.code
    }
  }
}

async function handleSave() {
  if (!hasPendingChanges.value || saving.value) {
    return
  }

  saving.value = true
  const changes = Object.values(pendingChanges.value)
  let failedCount = 0

  try {
    for (const change of changes) {
      const assetModel = findAssetModel(change.modelType, change.code)
      if (!assetModel) {
        removePendingChange(buildAssetModelKey(change.modelType, change.code))
        continue
      }

      try {
        await assetModelApi.saveAssetModel(assetModel)
        originalCheckedStates.value = {
          ...originalCheckedStates.value,
          [buildAssetModelKey(change.modelType, change.code)]: Boolean(assetModel.isChecked)
        }
        removePendingChange(buildAssetModelKey(change.modelType, change.code))
      } catch (error) {
        failedCount += 1
        console.error('保存资产模型配置失败:', error)
      }
    }

    if (failedCount === 0) {
      ElMessage.success('保存成功')
      return
    }

    if (failedCount < changes.length) {
      ElMessage.warning('部分保存失败，请重试')
      return
    }

    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

watch(
  () => props.visible,
  isVisible => {
    if (isVisible) {
      loadAssetModelTypes()
      return
    }

    resetAssetModelData()
  }
)
</script>

<style scoped lang="scss">
.asset-model-config-dialog {
  min-height: 200px;
}

.info-alert {
  margin-bottom: 16px;

  :deep(.el-alert__content) {
    .el-alert__title {
      font-size: 14px;
    }
  }
}

.model-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 60vh;
  overflow: auto;
  padding-right: 4px;
}

.model-card {
  :deep(.el-card__header) {
    padding: 12px 20px;
    background: var(--el-color-success-light-9);
    border-bottom: 1px solid var(--el-color-success-light-7);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--el-color-success);
    }
  }

  :deep(.el-card__body) {
    padding: 16px 20px;
  }
}

.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px 16px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.checkbox-item {
  :deep(.el-checkbox) {
    height: auto;

    .el-checkbox__label {
      font-size: 13px;
      color: var(--el-text-color-regular);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }
  }
}
</style>
