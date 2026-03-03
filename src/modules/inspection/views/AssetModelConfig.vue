<template>
  <div class="asset-model-config">
    <!-- 顶部导航栏 -->
    <!-- <nav class="navbar">
      <div class="navbar-title">巡检配置</div>
    </nav> -->

    <!-- 提示信息 -->
    <div class="config-wrapper">
      <el-alert
        type="success"
        :closable="true"
        show-icon
        class="info-alert"
      >
        <template #title>
          <strong>导出配置说明</strong>
        </template>
        <template #default>
          <div>选择需要在巡检结果中导出的资产模型字段，勾选后将自动保存。</div>
        </template>
      </el-alert>

      <!-- 资产模型列表 -->
      <div v-loading="loading" class="model-list">
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
                  :label="assetModel.title"
                  @change="(checked) => handleCheckChange(assetModel, checked)"
                />
              </div>
            </div>
          </el-card>
        </template>

        <!-- 空状态 -->
        <el-empty
          v-else-if="!loading"
          description="暂无资产模型配置"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { assetModelApi } from '../api'

// 状态
const loading = ref(false)
const assetModelTypes = ref([])
const assetModelData = reactive({})

/**
 * 获取某个类型下已选中的数量
 */
function getSelectedCount(modelType) {
  const models = assetModelData[modelType] || []
  return models.filter(m => m.isChecked).length
}

/**
 * 获取所有资产模型类型
 */
async function loadAssetModelTypes() {
  loading.value = true
  try {
    const response = await assetModelApi.getAssetModelTypes()
    const data = response?.data || response || {}

    if (Object.keys(data).length > 0) {
      assetModelTypes.value = Object.keys(data)
      // 初始化每个类型的数据
      for (const key of assetModelTypes.value) {
        assetModelData[key] = data[key].map(item => ({
          ...item,
          isChecked: false
        }))
      }
      // 加载已选择的数据
      await loadSelectedModels()
    }
  } catch (error) {
    console.error('加载资产模型类型失败:', error)
    ElMessage.error('加载资产模型类型失败')
  } finally {
    loading.value = false
  }
}

/**
 * 获取已选择的资产模型（用于回显）
 */
async function loadSelectedModels() {
  try {
    const response = await assetModelApi.getSelectedAssetModels()
    const data = response?.data || response || {}

    if (Object.keys(data).length > 0) {
      // 遍历已选择的数据，设置 isChecked
      for (const key in data) {
        if (!assetModelData[key]) continue

        const selectedCodes = data[key].map(item => item.code)
        for (const model of assetModelData[key]) {
          if (selectedCodes.includes(model.code)) {
            model.isChecked = true
          }
        }
      }
    }
  } catch (error) {
    console.error('加载已选择的资产模型失败:', error)
    ElMessage.error('加载已选择的资产模型失败')
  }
}

/**
 * 处理勾选变化
 */
async function handleCheckChange(assetModel, checked) {
  // 先更新本地状态
  assetModel.isChecked = checked

  try {
    await assetModelApi.saveAssetModel(assetModel)
    // 静默保存，不显示成功提示
  } catch (error) {
    // 保存失败，回滚状态
    assetModel.isChecked = !checked
    console.error('保存资产模型配置失败:', error)
    ElMessage.error('保存失败，请重试')
  }
}

onMounted(() => {
  loadAssetModelTypes()
})
</script>

<style scoped lang="scss">
.asset-model-config {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color-page);
}

.navbar {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);

  .navbar-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }
}

.config-wrapper {
  flex: 1;
  padding: 20px;
  overflow: auto;
}

.info-alert {
  margin-bottom: 20px;

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
}

.model-card {
  :deep(.el-card__header) {
    padding: 12px 20px;
    background: #d1e7dd;
    border-bottom: 1px solid #c3e6cb;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: #155724;
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
      color: #606266;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }
  }
}
</style>
