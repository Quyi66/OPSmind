<template>
  <div class="ops-page-layout">
    <!-- 顶部导航栏 -->
    <nav class="navbar">
      <div class="navbar-title">巡检配置</div>
    </nav>

    <!-- 配置内容 -->
    <div class="config-wrapper" v-loading="loading">
      <el-form ref="formRef" :model="configData" label-width="150px" class="config-form">
        <el-card class="config-card">
          <template #header>
            <span>基础配置</span>
          </template>

          <el-form-item label="启用仪表盘">
            <el-switch v-model="configData.dashboardSwitch" />
            <span class="form-hint">启用后可在模板操作中查看仪表盘</span>
          </el-form-item>

          <el-form-item label="启用团队配置">
            <el-switch v-model="configData.teamsSwitch" />
            <span class="form-hint">启用后可配置模板的团队权限</span>
          </el-form-item>

          <el-form-item label="邮件通知">
            <el-switch v-model="configData.emailEnabled" />
            <span class="form-hint">启用后巡检完成时发送邮件通知</span>
          </el-form-item>
        </el-card>

        <el-card class="config-card">
          <template #header>
            <span>执行配置</span>
          </template>

          <el-form-item label="默认超时时间">
            <el-input-number v-model="configData.defaultTimeout" :min="30" :max="3600" :step="30" />
            <span class="form-hint">单位：秒</span>
          </el-form-item>

          <el-form-item label="并发主机数">
            <el-input-number v-model="configData.concurrency" :min="1" :max="100" :step="5" />
            <span class="form-hint">同时执行巡检的主机数量</span>
          </el-form-item>

          <el-form-item label="重试次数">
            <el-input-number v-model="configData.retryCount" :min="0" :max="5" />
            <span class="form-hint">执行失败时的重试次数</span>
          </el-form-item>
        </el-card>

        <div class="form-actions">
          <el-button type="primary" :loading="saving" @click="saveConfig">保存配置</el-button>
          <el-button @click="resetConfig">重置</el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { paramApi } from '../api'

const formRef = ref(null)
const loading = ref(false)
const saving = ref(false)

const configData = ref({
  dashboardSwitch: false,
  teamsSwitch: false,
  emailEnabled: false,
  defaultTimeout: 300,
  concurrency: 10,
  retryCount: 1
})

const originalConfig = ref({})

/**
 * 加载配置
 */
async function loadConfig() {
  loading.value = true
  try {
    const response = await paramApi.getParams()
    const params = response?.data || response || []
    const paramMap = new Map(params.map(item => [item.name, item.value]))

    configData.value = {
      dashboardSwitch: paramMap.get('dashboard_switch') === 'yes',
      teamsSwitch: paramMap.get('teams_switch') === 'yes',
      emailEnabled: paramMap.get('email_enabled') === 'yes',
      defaultTimeout: parseInt(paramMap.get('default_timeout')) || 300,
      concurrency: parseInt(paramMap.get('concurrency')) || 10,
      retryCount: parseInt(paramMap.get('retry_count')) || 1
    }

    originalConfig.value = { ...configData.value }
  } catch (error) {
    console.error('Failed to load config:', error)
    ElMessage.error('加载配置失败')
  } finally {
    loading.value = false
  }
}

/**
 * 保存配置
 */
async function saveConfig() {
  saving.value = true
  try {
    // TODO: 实现保存配置的 API
    ElMessage.success('配置保存成功')
    originalConfig.value = { ...configData.value }
  } catch (error) {
    console.error('Failed to save config:', error)
    ElMessage.error('保存配置失败')
  } finally {
    saving.value = false
  }
}

/**
 * 重置配置
 */
function resetConfig() {
  configData.value = { ...originalConfig.value }
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped lang="scss">
.inspection-config {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color);
}

.navbar {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid var(--el-border-color-light);

  .navbar-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.config-wrapper {
  flex: 1;
  padding: 20px;
  overflow: auto;
}

.config-form {
  max-width: 700px;
}

.config-card {
  margin-bottom: 20px;

  :deep(.el-card__header) {
    padding: 12px 20px;
    background: var(--el-bg-color-page);
    font-weight: 600;
  }
}

.form-hint {
  margin-left: 12px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.form-actions {
  display: flex;
  gap: 12px;
  padding-top: 20px;
}
</style>
