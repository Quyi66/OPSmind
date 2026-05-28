<template>
  <el-dialog
    v-model="visible"
    title="批量配置主机端口"
    width="640px"
    destroy-on-close
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

      <!-- 配置模式切换 -->
      <div class="mode-tabs mb-3">
        <el-radio-group v-model="configMode" size="small">
          <el-radio-button value="multi">批量多端口映射</el-radio-button>
          <el-radio-button value="single">快捷属性配置 (SSH/业务端口)</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 模式一：批量多端口映射 -->
      <div v-if="configMode === 'multi'" class="multi-config-section">
        <div class="section-title mb-2">配置端口映射列表：</div>

        <el-table :data="portsList" size="small" border class="mb-3">
          <el-table-column label="端口服务名 (Name)" min-width="150">
            <template #default="{ row }">
              <el-input v-model="row.name" placeholder="如 SSH, HTTP, MySQL" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="端口号 (Port)" width="120">
            <template #default="{ row }">
              <el-input-number
                v-model="row.port"
                :min="0"
                :max="65535"
                :controls="false"
                size="small"
                style="width: 100%"
              />
            </template>
          </el-table-column>
          <el-table-column label="传输协议 (Protocol)" width="130">
            <template #default="{ row }">
              <el-select v-model="row.protocol" size="small">
                <el-option value="tcp" label="TCP" />
                <el-option value="udp" label="UDP" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="70" align="center">
            <template #default="{ $index }">
              <el-button link type="danger" @click="removePortRow($index)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="table-actions mb-3">
          <el-button type="success" size="small" plain @click="addPortRow">
            <i class="fa fa-plus me-1" />
            添加端口行
          </el-button>
        </div>

        <el-form label-width="120px" size="small">
          <el-form-item label="冲突合并策略">
            <el-radio-group v-model="mergeStrategy">
              <el-radio value="overwrite">覆盖 (同名端口执行覆盖写)</el-radio>
              <el-radio value="keep">保留 (保留已有, 仅增补缺漏)</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </div>

      <!-- 模式二：快捷单个属性配置 -->
      <div v-else class="single-config-section">
        <el-form :model="singleForm" label-width="120px" size="small">
          <el-form-item label="目标端口属性">
            <el-select v-model="singleForm.attrCode" style="width: 100%">
              <el-option value="SSH_PORT" label="SSH端口 (SSH_PORT)" />
              <el-option value="SERVICE_PORT" label="业务端口 (SERVICE_PORT)" />
            </el-select>
          </el-form-item>
          <el-form-item label="端口值">
            <el-input-number
              v-model="singleForm.port"
              :min="0"
              :max="65535"
              placeholder="请输入端口，留空表示清除该属性值"
              :controls="false"
              style="width: 100%"
            />
          </el-form-item>
        </el-form>
      </div>

      <!-- 配置结果展示面板 -->
      <div v-if="resultPanelVisible" class="result-panel mt-3">
        <div class="result-title mb-2">更新结果反馈：</div>
        <el-table :data="resultData" size="small" border max-height="160px">
          <el-table-column prop="hostIp" label="主机 IP" width="160" />
          <el-table-column prop="status" label="更新状态">
            <template #default="{ row }">
              <el-tag :type="row.status === 'ok' ? 'success' : 'danger'" size="small" round>
                {{ row.status === 'ok' ? '配置成功' : row.status }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <template #footer>
      <div v-if="resultPanelVisible">
        <el-button type="primary" @click="handleFinish">完成并关闭</el-button>
      </div>
      <div v-else>
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">确认应用配置</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { hostBatchApi } from '../../../api'

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
const configMode = ref('multi') // multi | single

// 批量多端口配置数据
const portsList = ref([{ name: 'SSH', port: 22, protocol: 'tcp' }])
const mergeStrategy = ref('overwrite')

// 快捷单端口配置数据
const singleForm = reactive({
  attrCode: 'SERVICE_PORT',
  port: null
})

// 结果面板状态
const resultPanelVisible = ref(false)
const resultData = ref([])

function addPortRow() {
  portsList.value.push({
    name: '',
    port: 80,
    protocol: 'tcp'
  })
}

function removePortRow(index) {
  portsList.value.splice(index, 1)
}

function handleClose() {
  visible.value = false
  resultPanelVisible.value = false
  resultData.value = []
}

function handleFinish() {
  emit('success')
  handleClose()
}

// 提交应用端口配置
async function handleSubmit() {
  const hostIds = props.hosts.map(h => h.id || h.host_id || h.hostId).filter(Boolean)
  if (hostIds.length === 0) {
    ElMessage.warning('未选择任何有效的主机')
    return
  }

  saving.value = true
  try {
    let response
    if (configMode.value === 'multi') {
      // 检查空名称端口
      const invalidPorts = portsList.value.some(p => !p.name || p.name.trim() === '')
      if (invalidPorts) {
        ElMessage.warning('端口服务名称不能为空')
        saving.value = false
        return
      }

      const payload = {
        hostIds,
        ports: portsList.value.map(p => ({
          name: p.name.trim(),
          port: p.port,
          protocol: p.protocol
        })),
        mergeStrategy: mergeStrategy.value
      }
      response = await hostBatchApi.applyPorts(payload)
    } else {
      const payload = {
        ciIds: hostIds.join(','),
        code: singleForm.attrCode,
        value:
          singleForm.port === null || singleForm.port === undefined ? '' : String(singleForm.port)
      }
      response = await hostBatchApi.saveAttr(payload)
    }

    // 解析结果 map { "host-uuid-1": "ok", "host-uuid-2": "error" }
    const resMap = response?.data || response || {}
    const results = []

    props.hosts.forEach(host => {
      const id = host.id || host.host_id || host.hostId
      const ip = host.host_key || host.hostKey || host.IP || host.ip || host.hostname || '未知主机'
      results.push({
        hostId: id,
        hostIp: ip,
        status: resMap[id] || 'ok'
      })
    })

    resultData.value = results
    resultPanelVisible.value = true
    ElMessage.success('批量配置端口指令已执行完毕，请检查反馈结果！')
  } catch (error) {
    console.error('批量配置端口失败:', error)
    ElMessage.error('应用端口配置发生服务端异常')
  } finally {
    saving.value = false
  }
}
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

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.table-actions {
  display: flex;
  justify-content: flex-start;
}

.result-panel {
  padding: 10px 12px;
  background: rgba(22, 93, 255, 0.04);
  border-radius: 4px;
  border: 1px solid rgba(22, 93, 255, 0.12);
}

.result-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-color-primary);
}
</style>
