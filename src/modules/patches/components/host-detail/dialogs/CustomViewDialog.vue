<template>
  <el-dialog
    v-model="visible"
    title="自定义视图配置 (主机)"
    width="740px"
    destroy-on-close
    @close="handleClose"
  >
    <div v-loading="loading" class="dialog-inner-content">
      <!-- 范围选择 -->
      <div class="scope-selector mb-3">
        <span class="selector-label">应用范围：</span>
        <el-radio-group v-model="scope" size="small" @change="loadConfig">
          <el-radio value="user">当前用户级 (仅对我生效)</el-radio>
          <el-radio value="tenant">租户共享级 (对本租户下所有用户生效)</el-radio>
        </el-radio-group>
      </div>

      <el-tabs v-model="activeTab" class="view-config-tabs">
        <!-- Tab 1: 列表表格列配置 -->
        <el-tab-pane label="列表表格列配置" name="list">
          <template #label>
            <i class="fas fa-table me-1"></i>
            列表表格列配置
          </template>

          <div class="config-tip mb-3">
            <el-alert
              title="提示：表格第一列“主机 IP”、“是否需要重启”及尾部“操作”为必选固定列，此处配置中间的数据展示列。"
              type="info"
              :closable="false"
              show-icon
            />
          </div>

          <!-- 流式标签云一体化容器 -->
          <div class="unified-tag-flow-panel">
            <div class="panel-header mb-3">
              <i class="fas fa-th-large me-1 text-primary"></i>
              自定义展示列与展示顺序调整 (左起依次为从左往右展示顺序)
            </div>

            <div class="tag-flow-container">
              <div
                v-for="(attr, index) in localOrderedAttrs"
                :key="attr.code"
                class="flow-tag-item"
                :class="{
                  'is-dragging': draggedIndex === index,
                  'is-checked': selectedColumns.includes(attr.code),
                  'is-unchecked': !selectedColumns.includes(attr.code)
                }"
                draggable="true"
                @dragstart="handleDragStart($event, index)"
                @dragover.prevent
                @dragenter.prevent="handleDragEnter($event, index)"
                @dragend="handleDragEnd($event)"
              >
                <!-- 拖拽手柄 -->
                <span class="drag-handle" title="按住拖拽以调整顺序">
                  <i class="fas fa-grip-vertical"></i>
                </span>

                <!-- 复选框与标题 -->
                <el-checkbox v-model="selectedColumns" :value="attr.code" class="checkbox-item">
                  <span class="item-title">{{ attr.title }}</span>
                  <span class="item-code">({{ attr.code }})</span>
                </el-checkbox>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- Tab 2: 详情页属性字段配置 -->
        <el-tab-pane label="详情卡片显示属性" name="detail">
          <template #label>
            <i class="fas fa-id-card me-1"></i>
            详情卡片显示属性
          </template>

          <div class="config-tip mb-3">
            <el-alert
              title="提示：在此处勾选并拖拽排序需要展示在主机详情抽屉中的属性字段。"
              type="info"
              :closable="false"
              show-icon
            />
          </div>

          <!-- 流式标签云一体化容器 -->
          <div class="unified-tag-flow-panel">
            <div class="panel-header mb-3">
              <i class="fas fa-th-large me-1 text-primary"></i>
              自定义展示属性与显示顺序调整 (左起依次为从上往下展示顺序)
            </div>

            <div class="tag-flow-container">
              <div
                v-for="(attr, index) in localOrderedDetailAttrs"
                :key="attr.code"
                class="flow-tag-item"
                :class="{
                  'is-dragging': draggedDetailIndex === index,
                  'is-checked': selectedDetailColumns.includes(attr.code),
                  'is-unchecked': !selectedDetailColumns.includes(attr.code)
                }"
                draggable="true"
                @dragstart="handleDetailDragStart($event, index)"
                @dragover.prevent
                @dragenter.prevent="handleDetailDragEnter($event, index)"
                @dragend="handleDetailDragEnd($event)"
              >
                <!-- 拖拽手柄 -->
                <span class="drag-handle" title="按住拖拽以调整顺序">
                  <i class="fas fa-grip-vertical"></i>
                </span>

                <!-- 复选框与标题 -->
                <el-checkbox
                  v-model="selectedDetailColumns"
                  :value="attr.code"
                  class="checkbox-item"
                >
                  <span class="item-title">{{ attr.title }}</span>
                  <span class="item-code">({{ attr.code }})</span>
                </el-checkbox>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <template #footer>
      <el-button :disabled="saving" @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存并应用视图</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { viewConfigApi } from '../../../api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const loading = ref(false)
const saving = ref(false)
const activeTab = ref('list')
const scope = ref('user') // user | tenant

// 表格列勾选
const selectedColumns = ref([])
// 详情字段勾选
const selectedDetailColumns = ref([])

// 流式属性列表
const localOrderedAttrs = ref([])
const localOrderedDetailAttrs = ref([])

function initOrderedAttrs() {
  const list = [...allAvailableAttrs.value]
  const selected = selectedColumns.value || []

  list.sort((a, b) => {
    const idxA = selected.indexOf(a.code)
    const idxB = selected.indexOf(b.code)

    if (idxA > -1 && idxB > -1) return idxA - idxB
    if (idxA > -1) return -1
    if (idxB > -1) return 1
    return 0
  })

  localOrderedAttrs.value = list
}

function initOrderedDetailAttrs() {
  const list = [...allAvailableAttrs.value]
  const selected = selectedDetailColumns.value || []

  list.sort((a, b) => {
    const idxA = selected.indexOf(a.code)
    const idxB = selected.indexOf(b.code)

    if (idxA > -1 && idxB > -1) return idxA - idxB
    if (idxA > -1) return -1
    if (idxB > -1) return 1
    return 0
  })

  localOrderedDetailAttrs.value = list
}

// 内置系统属性与后端模型属性合并的备选属性
const defaultAvailableAttrs = [
  { code: 'IP', title: '纳管IP', required: true, editable: true },
  { code: 'HOSTNAME', title: '主机名', required: false, editable: true },
  { code: 'OS', title: '系统环境', required: false, editable: true },
  { code: 'RUN_ENVIRONMENT', title: '运行环境', required: false, editable: true },
  { code: 'CONN_LATEST_STATUS', title: '连通巡检', required: false, editable: true },
  { code: 'DEPT_NAME', title: '处置团队', required: false, editable: true },
  { code: 'APPLICATION_SYSTEM', title: '应用系统', required: false, editable: true },
  { code: 'HOST_RISK_LEVEL', title: '主机风险等级', required: false, editable: true },
  { code: 'SSH_PORT', title: 'SSH端口', required: false, editable: true },
  { code: 'SERVICE_PORT', title: '业务端口', required: false, editable: true },
  { code: 'OWNER', title: '责任人', required: false, editable: true },
  { code: 'updated_at', title: '最后同步时间', required: false, editable: true }
]
const apiAttrs = ref([])

// 合并后的全部备选属性，去重
const allAvailableAttrs = computed(() => {
  const list = [...defaultAvailableAttrs]
  apiAttrs.value.forEach(attr => {
    if (!list.some(item => item.code === attr.code)) {
      list.push(attr)
    }
  })
  return list
})

function handleClose() {
  visible.value = false
}

// ====== 原生拖拽调序逻辑 (列表字段) ======
const draggedIndex = ref(null)

function handleDragStart(event, index) {
  draggedIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function handleDragEnter(event, index) {
  if (draggedIndex.value === null || draggedIndex.value === index) return

  const arr = [...localOrderedAttrs.value]
  const [draggedItem] = arr.splice(draggedIndex.value, 1)
  arr.splice(index, 0, draggedItem)
  localOrderedAttrs.value = arr

  draggedIndex.value = index
}

function handleDragEnd() {
  draggedIndex.value = null
}

// ====== 原生拖拽调序逻辑 (详情字段) ======
const draggedDetailIndex = ref(null)

function handleDetailDragStart(event, index) {
  draggedDetailIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function handleDetailDragEnter(event, index) {
  if (draggedDetailIndex.value === null || draggedDetailIndex.value === index) return

  const arr = [...localOrderedDetailAttrs.value]
  const [draggedItem] = arr.splice(draggedDetailIndex.value, 1)
  arr.splice(index, 0, draggedItem)
  localOrderedDetailAttrs.value = arr

  draggedDetailIndex.value = index
}

function handleDetailDragEnd() {
  draggedDetailIndex.value = null
}

// 自动加载后端可选字段
async function loadAvailableAttrs() {
  try {
    const res = await viewConfigApi.getAttrs({ ciType: 'host' })
    apiAttrs.value = res?.data || res || []
  } catch (error) {
    console.error('加载可选属性失败:', error)
  }
}

// 加载已有配置
async function loadConfig() {
  loading.value = true
  try {
    const res = await viewConfigApi.getViewConfig({
      ciType: 'host',
      scope: scope.value
    })
    const data = res?.data || res

    // 如果已有持久化配置，则解析还原，否则走系统默认回退
    if (data && data.viewJson) {
      let configObj = {}
      if (typeof data.viewJson === 'string') {
        try {
          configObj = JSON.parse(data.viewJson)
        } catch {
          configObj = {}
        }
      } else {
        configObj = data.viewJson
      }

      if (configObj.listColumns && configObj.listColumns.length > 0) {
        selectedColumns.value = configObj.listColumns
      } else {
        selectedColumns.value = [
          'IP',
          'HOSTNAME',
          'OS',
          'LOCATION',
          'RUN_ENVIRONMENT',
          'CONN_LATEST_STATUS',
          'DEPT_NAME',
          'APPLICATION_SYSTEM',
          'HOST_RISK_LEVEL',
          'SSH_PORT',
          'SERVICE_PORT',
          'OWNER',
          'updated_at'
        ]
      }

      if (configObj.overviewCard?.groups && configObj.overviewCard.groups.length > 0) {
        const flatAttrs = []
        configObj.overviewCard.groups.forEach(g => {
          if (Array.isArray(g.attrs)) {
            flatAttrs.push(...g.attrs)
          }
        })
        selectedDetailColumns.value = Array.from(new Set(flatAttrs))
      } else {
        selectedDetailColumns.value = [
          'IP',
          'HOSTNAME',
          'OS',
          'SSH_PORT',
          'SERVICE_PORT',
          'LOCATION',
          'RUN_ENVIRONMENT',
          'APPLICATION_SYSTEM',
          'DEPT_NAME',
          'HOST_RISK_LEVEL'
        ]
      }
    } else {
      // 默认回退配置
      selectedColumns.value = [
        'IP',
        'HOSTNAME',
        'OS',
        'LOCATION',
        'RUN_ENVIRONMENT',
        'CONN_LATEST_STATUS',
        'DEPT_NAME',
        'APPLICATION_SYSTEM',
        'HOST_RISK_LEVEL',
        'SSH_PORT',
        'SERVICE_PORT',
        'OWNER',
        'updated_at'
      ]
      selectedDetailColumns.value = [
        'IP',
        'HOSTNAME',
        'OS',
        'SSH_PORT',
        'SERVICE_PORT',
        'LOCATION',
        'RUN_ENVIRONMENT',
        'APPLICATION_SYSTEM',
        'DEPT_NAME',
        'HOST_RISK_LEVEL'
      ]
    }

    // 初始化本地单栏列表属性顺序
    initOrderedAttrs()
    initOrderedDetailAttrs()
  } catch (error) {
    console.error('加载视图配置失败:', error)
    ElMessage.error('获取视图配置失败')
  } finally {
    loading.value = false
  }
}

// 保存配置
async function handleSave() {
  if (!selectedColumns.value || selectedColumns.value.length === 0) {
    ElMessage.warning('请至少勾选一个展示列字段！')
    return
  }
  saving.value = true
  try {
    // 按照 localOrderedAttrs 的显示顺序，提取已经被勾选的字段作为保存输出
    const finalColumns = localOrderedAttrs.value
      .map(item => item.code)
      .filter(code => selectedColumns.value.includes(code))

    // 按照 localOrderedDetailAttrs 的显示顺序，提取已经被勾选的详情字段作为保存输出
    const finalDetailColumns = localOrderedDetailAttrs.value
      .map(item => item.code)
      .filter(code => selectedDetailColumns.value.includes(code))

    const viewJson = {
      overviewCard: {
        groups: [
          {
            title: '详细信息',
            attrs: finalDetailColumns
          }
        ]
      },
      listColumns: finalColumns
    }

    const payload = {
      ciType: 'host',
      scope: scope.value,
      viewJson
    }

    await viewConfigApi.saveViewConfig(payload)
    ElMessage.success('视图自定义配置保存成功，生效视图已同步刷新！')
    emit('success')
    handleClose()
  } catch (error) {
    console.error('保存视图失败:', error)
    ElMessage.error('保存视图配置失败')
  } finally {
    saving.value = false
  }
}

watch(visible, async val => {
  if (val) {
    await loadAvailableAttrs()
    await loadConfig()
  }
})
</script>

<style scoped lang="scss">
.dialog-inner-content {
  display: flex;
  flex-direction: column;
}

.scope-selector {
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  border: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;

  .selector-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-regular);
  }
}

.config-tip {
  font-size: 12px;
}

.unified-tag-flow-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  padding: 16px;
  background: var(--el-bg-color);
  margin-top: 8px;
}

.panel-header {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  display: flex;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--el-border-color-light);
}

.tag-flow-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  max-height: 260px;
  overflow-y: auto;
  padding: 4px;
}

.flow-tag-item {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 20px;
  transition:
    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.2s ease,
    opacity 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease;
  font-size: 12px;
  user-select: none;

  &.is-dragging {
    opacity: 0.3;
    transform: scale(0.95);
    border-style: dashed;
    border-color: var(--el-color-primary);
    box-shadow: var(--el-box-shadow-light);
  }

  &.is-unchecked {
    opacity: 0.88;
    background: var(--el-fill-color-light);
    border-color: var(--el-border-color-light);

    .item-title {
      color: var(--el-text-color-regular);
      font-weight: normal;
    }
  }

  &.is-checked {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-6);
    box-shadow: 0 1px 4px rgba(64, 158, 255, 0.05);

    .item-title {
      color: var(--el-color-primary);
      font-weight: 600;
    }
  }

  &:hover:not(.is-dragging) {
    border-color: var(--el-color-primary-light-4);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-right: 8px;
    color: var(--el-text-color-placeholder);
    cursor: grab;
    font-size: 11px;
    transition: color 0.2s ease;

    &:hover {
      color: var(--el-color-primary);
    }

    &:active {
      cursor: grabbing;
    }
  }

  .checkbox-item {
    margin-right: 0 !important;
    display: flex;
    align-items: center;
    height: auto;

    :deep(.el-checkbox__label) {
      padding-left: 6px;
      font-size: 12px;
      line-height: 1;
      display: flex;
      align-items: center;
    }

    :deep(.el-checkbox__inner) {
      border-radius: 3px;
    }
  }

  .item-title {
    font-size: 12px;
    transition: color 0.2s ease;
  }

  .item-code {
    font-size: 10px;
    color: var(--el-text-color-placeholder);
    margin-left: 2px;
  }
}
</style>
