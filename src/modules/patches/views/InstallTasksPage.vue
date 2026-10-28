<template>
  <div class="ops-page-layout">
    <PackageInstallTasks :is-admin="isAdmin" @detail="openTaskDetail" />
    <InstallTaskDetailDialog
      v-model:visible="detailVisible"
      :task-id="selectedTaskId"
      @update:visible="handleDetailVisibleChange"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/core/auth'
import PackageInstallTasks from '../components/PackageInstallTasks.vue'
import InstallTaskDetailDialog from '../components/InstallTaskDetailDialog.vue'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const isAdmin = computed(() => user.value?.login === 'admin')
const detailVisible = ref(false)
const selectedTaskId = ref('')

function openTaskDetail(task) {
  if (!task?.id) return
  router.replace({ query: { ...route.query, taskId: String(task.id) } })
}

function handleDetailVisibleChange(visible) {
  if (visible || !route.query.taskId) return
  const query = { ...route.query }
  delete query.taskId
  router.replace({ query })
}

watch(
  () => route.query.taskId,
  taskId => {
    selectedTaskId.value = Array.isArray(taskId) ? taskId[0] : taskId || ''
    detailVisible.value = Boolean(selectedTaskId.value)
  },
  { immediate: true }
)
</script>
