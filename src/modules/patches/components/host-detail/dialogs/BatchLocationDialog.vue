<template>
  <el-dialog
    v-model="visible"
    title="批量配置主机区域环境"
    width="500px"
    destroy-on-close
    :close-on-click-modal="!recomputing"
    :close-on-press-escape="!recomputing"
    :show-close="!recomputing"
    @close="handleClose"
  >
    <div v-loading="loading">
      <!-- 选中的主机提示 -->
      <div class="host-chips-container mb-3">
        <div class="chips-label">已选择主机 ({{ hosts.length }} 台)：</div>
        <div class="chips-list">
          <el-tag
            v-for="host in hosts"
            :key="host.id || host.host_id || host.hostId"
            size="small"
            type="info"
            class="host-chip"
          >
            {{ host.host_key || host.hostKey || host.IP || host.ip || host.hostname }}
          </el-tag>
        </div>
      </div>

      <!-- 选择区域表单 -->
      <el-form :model="form" label-width="120px" size="small" class="mt-3">
        <el-form-item label="网络区域环境">
          <el-select
            v-model="form.location"
            placeholder="请选择所处保留网络区域"
            v-loading="locationsLoading"
            style="width: 100%"
          >
            <el-option v-for="loc in locationOptions" :key="loc" :value="loc" :label="loc" />
          </el-select>
        </el-form-item>
      </el-form>

      <!-- 重算进度提示 -->
      <div v-if="recomputing" class="recompute-loading-panel mt-3">
        <div v-if="globalRecomputing" class="recompute-loading-text">
          <el-icon class="is-loading"><Loading /></el-icon>
          全量紧急程度重算正在后台执行，请稍候...
        </div>
        <template v-else>
          <div class="recompute-loading-text">
            <el-icon class="is-loading"><Loading /></el-icon>
            正在为 {{ hosts.length }} 台主机重新评估漏洞紧急程度 ({{ recomputeProgress }}/{{
              hosts.length
            }})...
          </div>
          <el-progress
            :percentage="Math.round((recomputeProgress / hosts.length) * 100)"
            :status="recomputeProgress === hosts.length ? 'success' : undefined"
            class="mt-2"
          />
        </template>
      </div>
    </div>

    <template #footer>
      <el-button :disabled="saving || recomputing" @click="handleClose">取消</el-button>
      <el-button
        type="primary"
        :loading="saving || recomputing"
        :disabled="!form.location"
        @click="handleSubmit"
      >
        确认设置区域
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { hostBatchApi, urgencyApi } from '../../../api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  hosts: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const loading = ref(false)
const saving = ref(false)
const locationsLoading = ref(false)
const locationOptions = ref([])

// 重算状态
const recomputing = ref(false)
const recomputeProgress = ref(0)
const globalRecomputing = ref(false)
let recomputeStatusTimer = null
let cancelRecomputeStatusPolling = null

const form = reactive({
  location: ''
})

// 加载区域列表
async function loadLocations() {
  locationsLoading.value = true
  try {
    const res = await hostBatchApi.getLocations()
    locationOptions.value = res?.data || res || ['互联网', '外联网', '内网环境、孤岛环境']
  } catch (error) {
    console.error('加载网络区域失败:', error)
    // 降级兜底方案
    locationOptions.value = ['互联网', '外联网', '内网环境、孤岛环境']
  } finally {
    locationsLoading.value = false
  }
}

function stopRecomputeStatusPolling() {
  if (recomputeStatusTimer) {
    clearTimeout(recomputeStatusTimer)
    recomputeStatusTimer = null
  }
  const cancel = cancelRecomputeStatusPolling
  cancelRecomputeStatusPolling = null
  cancel?.()
}

function waitForGlobalRecompute() {
  stopRecomputeStatusPolling()

  return new Promise((resolve, reject) => {
    let consecutiveErrors = 0
    let missingStatusCount = 0
    let cancelled = false

    const finish = (callback, value) => {
      if (recomputeStatusTimer) clearTimeout(recomputeStatusTimer)
      recomputeStatusTimer = null
      cancelRecomputeStatusPolling = null
      callback(value)
    }

    const schedule = () => {
      recomputeStatusTimer = setTimeout(poll, 3000)
    }

    const poll = async () => {
      try {
        const response = await urgencyApi.getRecomputeStatus()
        if (cancelled) return
        const status = response?.data || response || {}
        consecutiveErrors = 0

        if (status.running) {
          schedule()
          return
        }

        if (!status.startedAt) {
          missingStatusCount++
          if (missingStatusCount < 3) {
            schedule()
            return
          }
          finish(reject, new Error('服务未返回重算任务状态'))
          return
        }

        if (status.error) {
          finish(reject, new Error(String(status.error)))
          return
        }

        finish(resolve, status)
      } catch (error) {
        if (cancelled) return
        consecutiveErrors++
        if (consecutiveErrors < 3) {
          schedule()
          return
        }
        finish(reject, error)
      }
    }

    cancelRecomputeStatusPolling = () => {
      cancelled = true
      finish(resolve, null)
    }
    schedule()
  })
}

function handleClose() {
  stopRecomputeStatusPolling()
  visible.value = false
  recomputing.value = false
  recomputeProgress.value = 0
  globalRecomputing.value = false
  form.location = ''
}

// 提交区域标记
async function handleSubmit() {
  const hostIds = props.hosts.map(h => h.id || h.host_id || h.hostId).filter(Boolean)
  if (hostIds.length === 0) {
    ElMessage.warning('未选择任何有效的主机')
    return
  }

  saving.value = true
  try {
    // 1. 设置区域标签
    await hostBatchApi.setLocation({
      hostIds,
      location: form.location
    })

    ElMessage.success(`区域 [${form.location}] 设置成功！开始触发相关主机的漏洞紧急度规则重算...`)

    // 2. 触发紧急度重算联动 (R2.4 强力推荐)
    saving.value = false
    recomputing.value = true
    recomputeProgress.value = 0
    globalRecomputing.value = hostIds.length > 10

    if (hostIds.length > 10) {
      // 主机数量较多时提交异步全量重算，不把接口受理误报为任务完成
      try {
        const response = await urgencyApi.recompute()
        const result = response?.data || response || {}
        if (result.accepted === false) {
          ElMessage.warning(result.message || '已有一轮全量重算正在后台运行')
        } else {
          ElMessage.success(result.message || '全量重算已在后台开始')
        }

        const status = await waitForGlobalRecompute()
        if (!status) return
        recomputeProgress.value = hostIds.length
        ElMessage.success(
          `全量紧急程度重算完成，已更新 ${Number(status.changed ?? 0).toLocaleString()} 条`
        )
      } catch (err) {
        console.error('全量重算紧急度失败:', err)
        ElMessage.error(`区域设置成功，但全量紧急程度重算失败：${err?.message || '未知错误'}`)
      }
    } else {
      // 少量主机逐台重算
      for (let i = 0; i < hostIds.length; i++) {
        const hostId = hostIds[i]
        try {
          await urgencyApi.recomputeHost(hostId)
        } catch (err) {
          console.error(`重算主机 [${hostId}] 紧急度失败:`, err)
        }
        recomputeProgress.value++
      }
    }

    if (hostIds.length <= 10) {
      ElMessage.success('所选主机漏洞紧急程度重算已完成！')
    }
    emit('success')
    handleClose()
  } catch (error) {
    console.error('配置区域失败:', error)
    ElMessage.error('批量配置网络区域发生异常')
    saving.value = false
    recomputing.value = false
  }
}

watch(visible, val => {
  if (val) {
    loadLocations()
  }
})

onBeforeUnmount(() => {
  stopRecomputeStatusPolling()
})
</script>

<style scoped lang="scss">
.host-chips-container {
  padding: 10px 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  border: 1px solid var(--el-border-color-lighter);
}

.chips-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular);
  margin-bottom: 6px;
}

.chips-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 80px;
  overflow-y: auto;
}

.host-chip {
  background-color: var(--el-bg-color);
}

.recompute-loading-panel {
  padding: 12px;
  background: rgba(103, 194, 58, 0.04);
  border-radius: 4px;
  border: 1px solid rgba(103, 194, 58, 0.12);
}

.recompute-loading-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-color-success);
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
