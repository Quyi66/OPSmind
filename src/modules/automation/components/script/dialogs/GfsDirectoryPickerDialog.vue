<template>
  <el-dialog
    v-model="visible"
    title="选择素材路径"
    width="760px"
    destroy-on-close
    append-to-body
    :close-on-click-modal="false"
    class="gfs-directory-picker-dialog"
  >
    <div class="gfs-directory-picker">
      <div class="gfs-directory-picker__toolbar">
        <div class="gfs-directory-picker__path-block">
          <span class="gfs-directory-picker__path-label">当前目录</span>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item
              v-for="crumb in breadcrumbs"
              :key="crumb.path || 'root'"
            >
              <button
                type="button"
                class="gfs-directory-picker__crumb"
                :class="{ 'is-active': crumb.path === currentDir }"
                @click="navigateTo(crumb.path)"
              >
                {{ crumb.name || '~' }}
              </button>
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="gfs-directory-picker__toolbar-actions">
          <el-button link type="primary" size="small" @click="navigateTo('')">根目录</el-button>
          <el-button circle size="small" :loading="loading" title="刷新目录" @click="loadDirectories">
            <el-icon v-show="!loading"><Refresh /></el-icon>
          </el-button>
        </div>
      </div>

      <div class="gfs-directory-picker__tip">
        浏览到目标目录后，点击“使用当前目录”，后续新建脚本和上传文件都会默认落到这里。
      </div>

      <div v-loading="loading" class="gfs-directory-picker__body">
        <div class="gfs-directory-picker__list">
          <button
            v-if="currentDir"
            type="button"
            class="gfs-directory-picker__item gfs-directory-picker__item--parent"
            @click="navigateTo(parentDir)"
          >
            <span class="gfs-directory-picker__item-main">
              <i class="fa fa-level-up-alt" />
              <span class="gfs-directory-picker__item-name">上级目录</span>
            </span>
            <i class="fa fa-chevron-right gfs-directory-picker__item-arrow" />
          </button>

          <button
            v-for="item in directories"
            :key="item.path"
            type="button"
            class="gfs-directory-picker__item"
            @click="navigateTo(item.path)"
          >
            <span class="gfs-directory-picker__item-main">
              <i class="fa fa-folder-open" />
              <span class="gfs-directory-picker__item-name">{{ item.name }}</span>
            </span>
            <span v-if="item.description" class="gfs-directory-picker__item-desc">{{ item.description }}</span>
            <i class="fa fa-chevron-right gfs-directory-picker__item-arrow" />
          </button>
        </div>

        <el-empty
          v-if="!loading && !directories.length"
          description="当前目录下暂无子目录，可直接使用当前目录"
          :image-size="72"
        />
      </div>
    </div>

    <template #footer>
      <div class="gfs-directory-picker__footer">
        <span class="gfs-directory-picker__selected">已选路径：{{ formatPath(currentDir) }}</span>
        <div class="gfs-directory-picker__footer-actions">
          <el-button @click="visible = false">取消</el-button>
          <el-button type="primary" @click="handleConfirm">使用当前目录</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import * as gfsApi from '@/modules/automation/api/gfs'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  repoType: {
    type: String,
    default: 'git'
  },
  repo: {
    type: String,
    default: '$tnt'
  },
  initDir: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = ref(false)
const currentDir = ref('')
const directories = ref([])

const parentDir = computed(() => currentDir.value.split('/').slice(0, -1).join('/'))

const breadcrumbs = computed(() => {
  const crumbs = [{ name: '~', path: '' }]
  if (!currentDir.value) return crumbs

  const parts = currentDir.value.split('/').filter(Boolean)
  let path = ''
  parts.forEach((part) => {
    path = path ? `${path}/${part}` : part
    crumbs.push({ name: part, path })
  })
  return crumbs
})

function formatPath(path) {
  return path ? `~/${path}` : '~'
}

async function loadDirectories() {
  loading.value = true
  try {
    const files = await gfsApi.listFiles(props.repo, currentDir.value, props.repoType)
    directories.value = files
      .filter(item => item.directory)
      .sort((left, right) => (left.name || '').localeCompare(right.name || ''))
      .map(item => ({
        path: item.path,
        name: item.name,
        description: item.description || ''
      }))
  } catch (error) {
    directories.value = []
    ElMessage.error(error?.message || '加载目录失败')
  } finally {
    loading.value = false
  }
}

function navigateTo(path) {
  currentDir.value = path || ''
  loadDirectories()
}

function handleConfirm() {
  emit('confirm', currentDir.value)
  visible.value = false
}

watch(visible, (newVal) => {
  if (!newVal) return
  currentDir.value = props.initDir || ''
  loadDirectories()
})
</script>

<style scoped lang="scss">
.gfs-directory-picker {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__toolbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 8px;
    background: var(--el-fill-color-extra-light);
  }

  &__path-block {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__path-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
  }

  &__toolbar-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  &__crumb {
    padding: 0;
    border: none;
    background: transparent;
    color: var(--el-color-primary);
    cursor: pointer;
    font-size: 13px;

    &.is-active {
      color: var(--el-text-color-primary);
      cursor: default;
      font-weight: 600;
    }
  }

  &__tip {
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--el-color-primary-light-9);
    color: var(--el-text-color-regular);
    font-size: 12px;
    line-height: 1.5;
  }

  &__body {
    min-height: 340px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 8px;
    background: var(--el-bg-color);
    padding: 10px;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--el-fill-color-blank);
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, transform 0.15s;

    &:hover {
      border-color: var(--el-color-primary-light-5);
      background: var(--el-color-primary-light-9);
      transform: translateY(-1px);
    }
  }

  &__item--parent {
    border-style: dashed;
  }

  &__item-main {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    color: var(--el-text-color-primary);
    flex: 1;
  }

  &__item-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 500;
  }

  &__item-desc {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }

  &__item-arrow {
    color: var(--el-text-color-placeholder);
    flex-shrink: 0;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__selected {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &__footer-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
}

@media (max-width: 720px) {
  .gfs-directory-picker {
    &__toolbar,
    &__footer {
      flex-direction: column;
      align-items: stretch;
    }

    &__toolbar-actions,
    &__footer-actions {
      justify-content: flex-end;
    }

    &__item {
      flex-wrap: wrap;
    }
  }
}
</style>
