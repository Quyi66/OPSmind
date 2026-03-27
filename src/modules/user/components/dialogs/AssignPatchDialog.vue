<template>
  <el-dialog :model-value="visible" @update:model-value="emit('update:visible', $event)" title="分配补丁给用户" width="800px" @open="loadAssignedPatches" @closed="resetAssignForm" :close-on-click-modal="false">
    <el-form label-width="100px" :model="assignForm" v-loading="loadingAssigned">
      <el-form-item label="目标用户">
        <el-input :value="username" disabled />
      </el-form-item>



      <el-form-item label="选择补丁">
        <div style="width: 100%;">
          <!-- 有选择时的显示 -->
          <div v-if="selectedPatchesList.length" class="device-list-container">
            <div class="device-header">
              <div
                class="device-summary btn btn-sm btn-default op-hover-trigger"
                @click="openPatchLibrary"
              >
                <span
                  class="op-hover-to-show clear-btn"
                  title="清空全部"
                  @click.stop="clearAllPatches"
                >
                  <i class="fa fa-times" />
                </span>
                <span>共 <strong>{{ selectedPatchesList.length }}</strong> 项</span>
              </div>
            </div>

            <ul class="device-chip-list">
              <li
                v-for="(patch, index) in selectedPatchesList"
                :key="index"
                class="device-chip-item"
              >
                <el-tag type="primary" closable @close="removeSelectedPatchFromMain(index)">
                  {{ patch.patch_id }}
                </el-tag>
              </li>
            </ul>
          </div>

          <!-- 无选择时的空状态 -->
          <div v-else class="empty-state">
            <el-button @click="openPatchLibrary">
              <i class="fa fa-list" style="margin-right: 4px" /> 打开补丁列表进行选择
            </el-button>
          </div>
        </div>
      </el-form-item>

      <el-form-item label="过期时间">
        <el-date-picker
          v-model="assignForm.expireTime"
          type="datetime"
          placeholder="不填表示永久有效"
          value-format="YYYY-MM-DD HH:mm:ss"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="assignForm.remark" placeholder="填写分配说明（选填）" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="assignLoading" @click="submitAssign">确定分配</el-button>
    </template>
  </el-dialog>

  <!-- 内部嵌套的补丁挑选小窗口 -->
  <el-dialog v-model="innerDialogVisible" title="从补丁库选择" width="1200px" top="5vh" append-to-body destroy-on-close @opened="handleInnerDialogOpened" :close-on-click-modal="false">
    <div style="height: 70vh; display: flex; flex-direction: column; overflow: hidden; padding: 0; gap: 16px;">

      <!-- 实时选中项展示板 -->
      <el-card v-if="liveSelectedPatches.length > 0" class="selected-patches-card" shadow="never" :body-style="{ padding: '12px' }">
        <template #header>
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 14px; font-weight: bold; color: var(--el-text-color-primary)">
            <span><i class="fa fa-shopping-cart text-muted me-2" /> 已筛选准备分配的补丁</span>
            <el-tag size="small" type="success" effect="dark" round>共 {{ liveSelectedPatches.length }} 项</el-tag>
          </div>
        </template>
        <div style="max-height: 100px; overflow-y: auto; display: flex; flex-wrap: wrap; gap: 8px;">
          <el-tag
            v-for="patch in liveSelectedPatches"
            :key="patch.patch_id"
            closable
            type="primary"
            @close="handleRemovePatch(patch)"
          >
            {{ patch.patch_id }}
          </el-tag>
        </div>
      </el-card>

      <div style="flex: 1; display: flex; flex-direction: column; min-height: 0; border: 1px solid var(--el-border-color-lighter); border-radius: 4px;">
        <LinuxPatchLibrary ref="patchLibraryRef" picker-mode @selection-change="onPatchSelectionChange" />
      </div>
    </div>
    <template #footer>
      <el-button @click="innerDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmPatchSelection">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'
import LinuxPatchLibrary from '@/modules/patches/components/LinuxPatchLibrary.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  username: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:visible', 'success'])

const assignLoading = ref(false)
const loadingAssigned = ref(false)
const innerDialogVisible = ref(false)
const patchLibraryRef = ref(null)
const selectedPatchesList = ref([])
const liveSelectedPatches = ref([])

const assignForm = ref({
  expireTime: '',
  remark: ''
})

async function loadAssignedPatches() {
  if (!props.username) return
  loadingAssigned.value = true
  try {
    const res = await apiService.get('/vap/api/vap/v2/patch/assignment/list', {
      params: { userLogin: props.username, page: 0, size: 1000 }
    })
    if (res?.data?.content) {
      selectedPatchesList.value = res.data.content.map(item => ({
        patch_id: item.patchId
      }))
    }
  } catch (e) {
    console.error('Failed to load initially assigned patches', e)
  } finally {
    loadingAssigned.value = false
  }
}

function onPatchSelectionChange(selection) {
  liveSelectedPatches.value = selection
}

function openPatchLibrary() {
  liveSelectedPatches.value = [...selectedPatchesList.value]
  innerDialogVisible.value = true
}

function handleInnerDialogOpened() {
  if (patchLibraryRef.value && selectedPatchesList.value.length > 0) {
    patchLibraryRef.value.initSelection(selectedPatchesList.value)
  }
}

function clearAllPatches() {
  selectedPatchesList.value = []
}

function removeSelectedPatchFromMain(index) {
  selectedPatchesList.value.splice(index, 1)
}

function handleRemovePatch(patch) {
  // Use exposed toggleRowSelection on LinuxPatchLibrary component
  patchLibraryRef.value?.toggleRowSelection(patch, false)
}

function resetAssignForm() {
  assignForm.value = { expireTime: '', remark: '' }
  selectedPatchesList.value = []
  liveSelectedPatches.value = []
}

function confirmPatchSelection() {
  const patches = liveSelectedPatches.value
  if (patches.length === 0 && selectedPatchesList.value.length === 0) {
    ElMessage.warning('请在表格中至少勾选一个需要分配的补丁！')
    return
  }
  selectedPatchesList.value = [...patches]
  innerDialogVisible.value = false
}

function closeDialog() {
  emit('update:visible', false)
}

async function submitAssign() {
  if (selectedPatchesList.value.length === 0) {
    ElMessage.warning('请先点击按钮挑选需要分配的补丁！')
    return
  }

  const ids = selectedPatchesList.value.map(p => p.patch_id)

  assignLoading.value = true
  try {
    await apiService.post('/vap/api/vap/v2/patch/assignment', {
      userLogin: props.username,
      patchIds: ids,
      expireTime: assignForm.value.expireTime || undefined,
      remark: assignForm.value.remark
    })
    ElMessage.success('分配成功')
    emit('success')
    closeDialog()
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || '分配失败')
  } finally {
    assignLoading.value = false
  }
}
</script>

<style scoped>
.device-list-container {
  display: block;
  width: 100%;
}

.device-header {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.device-summary {
  display: inline-flex;
  align-items: center;
  position: relative;
  min-width: 80px;
  height: 32px;
  padding: 0 24px 0 12px;
  font-size: 13px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  background: var(--el-bg-color);
  cursor: pointer;
  transition: border-color 0.15s;
}

.device-summary:hover {
  border-color: #409eff;
}

.op-hover-trigger .op-hover-to-show {
  opacity: 0;
  transition: opacity 0.15s;
}

.op-hover-trigger:hover .op-hover-to-show {
  opacity: 1;
}

.clear-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: #909399;
  cursor: pointer;
}

.clear-btn:hover {
  color: #f56c6c;
}

.device-chip-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: calc(100vh - 500px);
  overflow-y: auto;
}

.device-chip-item {
  display: inline-block;
}

.empty-state {
  display: block;
}

</style>
