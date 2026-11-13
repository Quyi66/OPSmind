<template>
  <el-dialog
    v-model="visible"
    :title="t('automation.schedule.generatorTitle')"
    width="800px"
    :close-on-click-modal="false"
    @close="handleClose"
    :close-on-press-escape="false"
  >
    <div class="cron-generator-container">
      <!-- CRON 表达式输入框 -->
      <div class="cron-input-section">
        <el-form label-width="120px">
          <el-form-item :label="t('automation.schedule.expressionLabel')">
            <el-input
              v-model="cronExpression"
              :placeholder="t('automation.schedule.expressionPlaceholder')"
              @change="handleCronChange"
            >
              <template #append>
                <el-button @click="handlePreview">
                  <el-icon><Clock /></el-icon>
                  {{ t('automation.schedule.previewTimes') }}
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
          <el-tab-pane :label="t('automation.schedule.second')" name="second">
            <CronField
              v-model="cronParts.second"
              field-type="second"
              :max-value="59"
              @update:modelValue="updateCronExpression"
            />
          </el-tab-pane>

          <!-- 分 -->
          <el-tab-pane :label="t('automation.schedule.minute')" name="minute">
            <CronField
              v-model="cronParts.minute"
              field-type="minute"
              :max-value="59"
              @update:modelValue="updateCronExpression"
            />
          </el-tab-pane>

          <!-- 时 -->
          <el-tab-pane :label="t('automation.schedule.hour')" name="hour">
            <CronField
              v-model="cronParts.hour"
              field-type="hour"
              :max-value="23"
              @update:modelValue="updateCronExpression"
            />
          </el-tab-pane>

          <!-- 日 -->
          <el-tab-pane :label="t('automation.schedule.day')" name="day">
            <CronField
              v-model="cronParts.day"
              field-type="day"
              :max-value="31"
              :min-value="1"
              @update:modelValue="updateCronExpression"
            />
          </el-tab-pane>

          <!-- 月 -->
          <el-tab-pane :label="t('automation.schedule.month')" name="month">
            <CronField
              v-model="cronParts.month"
              field-type="month"
              :max-value="12"
              :min-value="1"
              @update:modelValue="updateCronExpression"
            />
          </el-tab-pane>

          <!-- 周 -->
          <el-tab-pane :label="t('automation.schedule.week')" name="week">
            <CronField
              v-model="cronParts.week"
              field-type="week"
              :max-value="7"
              :min-value="1"
              @update:modelValue="updateCronExpression"
            />
          </el-tab-pane>

          <!-- 年（可选） -->
          <el-tab-pane :label="t('automation.schedule.year')" name="year">
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
        <el-alert :title="t('automation.schedule.currentExpression', { expression: cronExpression })" type="info" :closable="false" />
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleConfirm">{{ t('common.confirm') }}</el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 预览执行时间的独立对话框 -->
  <el-dialog
    v-model="previewDialogVisible"
    :title="t('automation.schedule.nextTimes')"
    width="500px"
    :append-to-body="true"
    :close-on-click-modal="true"
  >
    <div v-loading="previewLoading" class="preview-content">
      <div v-if="nextExecutionTimes.length > 0" class="next-times-list">
        <h4 v-for="(time, index) in nextExecutionTimes" :key="index" class="time-item">
          {{ time }}
        </h4>
      </div>
      <el-empty v-else :description="t('automation.schedule.noSchedule')" />
    </div>
  </el-dialog>
</template>
<script setup>
import { t } from '@/core/i18n'

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
  set: val => emit('update:modelValue', val)
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

// 当对话框打开时，使用最新的 initialValue 初始化/重置数据
watch(
  () => props.modelValue,
  active => {
    if (active) {
      const val = props.initialValue || '0 0 0 * * ?'
      cronExpression.value = val
      parseCronExpression(val)
    }
  },
  { immediate: true }
)

// 解决“日”和“周”字段的冲突，Quartz CRON 中两者必有一个为 "?"
watch(
  () => cronParts.value.day,
  newVal => {
    if (newVal && newVal !== '?') {
      if (cronParts.value.week !== '?') {
        cronParts.value.week = '?'
        updateCronExpression()
      }
    } else if (newVal === '?') {
      if (cronParts.value.week === '?') {
        cronParts.value.week = '*'
        updateCronExpression()
      }
    }
  }
)

watch(
  () => cronParts.value.week,
  newVal => {
    if (newVal && newVal !== '?') {
      if (cronParts.value.day !== '?') {
        cronParts.value.day = '?'
        updateCronExpression()
      }
    } else if (newVal === '?') {
      if (cronParts.value.day === '?') {
        cronParts.value.day = '*'
        updateCronExpression()
      }
    }
  }
)

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
    ElMessage.warning(t('automation.schedule.expressionFirst'))
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
    ElMessage.error(t('automation.schedule.timesFailed'))
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
    ElMessage.warning(t('automation.schedule.expressionRequired'))
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
