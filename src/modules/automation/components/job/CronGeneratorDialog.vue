<template>
  <el-dialog
    v-model="visible"
    title="CRON表达式生成器"
    width="800px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="cron-generator-container">
      <!-- CRON 表达式输入框 -->
      <div class="cron-input-section">
        <el-form label-width="120px">
          <el-form-item label="CRON表达式">
            <el-input
              v-model="cronExpression"
              placeholder="请输入或生成CRON表达式"
              @input="handleCronChange"
            >
              <template #append>
                <el-button @click="handlePreview">
                  <el-icon><Clock /></el-icon>
                  预览执行时间
                </el-button>
              </template>
            </el-input>
          </el-form-item>
        </el-form>
      </div>

      <!-- CRON 生成器 -->
      <div class="cron-builder-section">
        <el-tabs v-model="activeTab" type="border-card">
          <!-- 秒 -->
          <el-tab-pane label="秒" name="second">
            <CronField
              v-model="cronParts.second"
              field-type="second"
              :max-value="59"
              @update:modelValue="updateCronExpression"
            />
          </el-tab-pane>

          <!-- 分 -->
          <el-tab-pane label="分" name="minute">
            <CronField
              v-model="cronParts.minute"
              field-type="minute"
              :max-value="59"
              @update:modelValue="updateCronExpression"
            />
          </el-tab-pane>

          <!-- 时 -->
          <el-tab-pane label="时" name="hour">
            <CronField
              v-model="cronParts.hour"
              field-type="hour"
              :max-value="23"
              @update:modelValue="updateCronExpression"
            />
          </el-tab-pane>

          <!-- 日 -->
          <el-tab-pane label="日" name="day">
            <CronField
              v-model="cronParts.day"
              field-type="day"
              :max-value="31"
              :min-value="1"
              @update:modelValue="updateCronExpression"
            />
          </el-tab-pane>

          <!-- 月 -->
          <el-tab-pane label="月" name="month">
            <CronField
              v-model="cronParts.month"
              field-type="month"
              :max-value="12"
              :min-value="1"
              @update:modelValue="updateCronExpression"
            />
          </el-tab-pane>

          <!-- 周 -->
          <el-tab-pane label="周" name="week">
            <CronField
              v-model="cronParts.week"
              field-type="week"
              :max-value="7"
              :min-value="1"
              @update:modelValue="updateCronExpression"
            />
          </el-tab-pane>

          <!-- 年（可选） -->
          <el-tab-pane label="年" name="year">
            <CronField
              v-model="cronParts.year"
              field-type="year"
              :optional="true"
              @update:modelValue="updateCronExpression"
            />
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- 表达式预览 -->
      <div class="cron-preview-section">
        <el-alert
          :title="`当前表达式: ${cronExpression}`"
          type="info"
          :closable="false"
        />
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleConfirm">
          确认
        </el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 预览执行时间的独立对话框 -->
  <el-dialog
    v-model="previewDialogVisible"
    title="下次执行时间"
    width="500px"
    :append-to-body="true"
  >
    <div v-loading="previewLoading" class="preview-content">
      <div v-if="nextExecutionTimes.length > 0" class="next-times-list">
        <h4 v-for="(time, index) in nextExecutionTimes" :key="index" class="time-item">
          {{ time }}
        </h4>
      </div>
      <el-empty v-else description="该任务没有执行计划，是否已禁用？" />
    </div>
  </el-dialog>
</template><script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Clock, Check } from '@element-plus/icons-vue'
import CronField from './CronField.vue'
import * as jaoApi from '../../api/jao'

const props = defineProps({
  modelValue: Boolean,
  initialValue: {
    type: String,
    default: '0 0 0 * * ?'
  }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const activeTab = ref('second')
const cronExpression = ref(props.initialValue)
const nextExecutionTimes = ref([])
const previewDialogVisible = ref(false)
const previewLoading = ref(false)

// CRON 表达式各部分
const cronParts = ref({
  second: '*',
  minute: '*',
  hour: '*',
  day: '*',
  month: '*',
  week: '?',
  year: ''
})

// 初始化时解析已有的 CRON 表达式
watch(() => props.initialValue, (newVal) => {
  if (newVal) {
    cronExpression.value = newVal
    parseCronExpression(newVal)
  }
}, { immediate: true })

// 解析 CRON 表达式到各个部分
function parseCronExpression(expression) {
  const parts = expression.trim().split(/\s+/)
  if (parts.length >= 6) {
    cronParts.value = {
      second: parts[0] || '*',
      minute: parts[1] || '*',
      hour: parts[2] || '*',
      day: parts[3] || '*',
      month: parts[4] || '*',
      week: parts[5] || '?',
      year: parts[6] || ''
    }
  }
}

// 更新 CRON 表达式
function updateCronExpression() {
  const parts = [
    cronParts.value.second,
    cronParts.value.minute,
    cronParts.value.hour,
    cronParts.value.day,
    cronParts.value.month,
    cronParts.value.week
  ]

  if (cronParts.value.year) {
    parts.push(cronParts.value.year)
  }

  cronExpression.value = parts.join(' ')
}

// 手动修改表达式时解析
function handleCronChange() {
  parseCronExpression(cronExpression.value)
}

// 预览执行时间
async function handlePreview() {
  if (!cronExpression.value || cronExpression.value.trim() === '') {
    ElMessage.warning('请先输入CRON表达式')
    return
  }

  previewDialogVisible.value = true
  previewLoading.value = true
  nextExecutionTimes.value = []

  try {
    const response = await jaoApi.queryNextExecutionTime(cronExpression.value)
    const times = response.data || response

    if (times && times.length > 0) {
      if (times[0].next && times[0].next.length > 0) {
        nextExecutionTimes.value = times[0].next.slice(0, 5)
      } else {
        nextExecutionTimes.value = []
      }
    } else {
      nextExecutionTimes.value = []
    }
  } catch (error) {
    console.error('获取执行时间失败:', error)
    ElMessage.error('获取执行时间失败')
    nextExecutionTimes.value = []
  } finally {
    previewLoading.value = false
  }
}

function handleClose() {
  visible.value = false
}

function handleConfirm() {
  if (!cronExpression.value || cronExpression.value.trim() === '') {
    ElMessage.warning('请输入CRON表达式')
    return
  }

  emit('confirm', cronExpression.value)
  handleClose()
}
</script>

<style scoped lang="scss">
.cron-generator-container {
  .cron-input-section {
    margin-bottom: 20px;
  }

  .cron-builder-section {
    margin-bottom: 20px;

    :deep(.el-tabs__content) {
      padding: 20px;
      min-height: 300px;
    }
  }

  .cron-preview-section {
    margin-top: 20px;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 预览执行时间对话框样式 */
.preview-content {
  min-height: 200px;

  .next-times-list {
    .time-item {
      margin: 0;
      padding: 12px 15px;
      background-color: var(--el-bg-color-page);
      border-radius: 4px;
      font-size: 14px;
      font-weight: normal;
      color: #606266;
      margin-bottom: 10px;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}
</style>

