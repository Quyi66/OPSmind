<template>
  <el-dialog
    v-model="dialogVisible"
    title="修复指引"
    width="760px"
    append-to-body
    destroy-on-close
    @closed="localPackagePath = ''"
  >
    <div v-loading="loading" class="fix-guide-content">
      <el-empty v-if="!loading && !guide" description="未能加载修复指引" :image-size="72" />

      <template v-else-if="guide">
        <el-alert
          :title="guide.summary || guide.fixHint || '请按以下步骤完成修复'"
          type="info"
          show-icon
          :closable="false"
        />

        <el-descriptions v-if="guide.fixTarget || Number(guide.numVuls) > 0" :column="2" border>
          <el-descriptions-item v-if="guide.fixTarget" label="修复目标">
            {{ guide.fixTarget }}
          </el-descriptions-item>
          <el-descriptions-item v-if="Number(guide.numVuls) > 0" label="可处理漏洞">
            {{ guide.numVuls }} 条
          </el-descriptions-item>
        </el-descriptions>

        <section v-if="steps.length" class="guide-section">
          <h4>处理步骤</h4>
          <ol class="guide-list guide-list--ordered">
            <li v-for="(step, index) in steps" :key="`${index}-${step}`">
              {{ step }}
            </li>
          </ol>
        </section>

        <section v-if="cautions.length" class="guide-section guide-section--cautions">
          <h4>注意事项</h4>
          <ul class="guide-list">
            <li v-for="(caution, index) in cautions" :key="`${index}-${caution}`">
              {{ caution }}
            </li>
          </ul>
        </section>

        <el-form v-if="guide.canOneClick" label-position="top" class="local-package-form">
          <el-form-item label="目标主机上的安装包路径（可选）">
            <el-input v-model="localPackagePath" clearable placeholder="例如：/tmp/tomcat.rpm" />
            <span class="form-hint">
              留空时使用已配置的软件源；仅当安装包已经放到目标主机时填写。
            </span>
          </el-form-item>
        </el-form>
      </template>
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false">关闭</el-button>
      <el-button v-if="guide?.canOneClick" type="primary" :loading="submitting" @click="submitFix">
        开始修复
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  guide: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  submitting: { type: Boolean, default: false }
})

const emit = defineEmits(['update:visible', 'fix'])

const localPackagePath = ref('')

const dialogVisible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value)
})

const steps = computed(() => (Array.isArray(props.guide?.steps) ? props.guide.steps : []))
const cautions = computed(() => (Array.isArray(props.guide?.cautions) ? props.guide.cautions : []))

function submitFix() {
  emit('fix', {
    instanceKey: props.guide?.instanceKey || '',
    localPackagePath: localPackagePath.value.trim()
  })
}
</script>

<style scoped lang="scss">
.fix-guide-content {
  max-height: calc(100vh - 240px);
  min-height: 120px;
  padding-right: 4px;
  overflow-x: hidden;
  overflow-y: auto;
}

.fix-guide-content :deep(.el-alert) {
  margin-bottom: 16px;
}

.fix-guide-content :deep(.el-alert__title),
.fix-guide-content :deep(.el-descriptions__content) {
  overflow-wrap: anywhere;
  word-break: break-word;
}

.guide-section {
  margin-top: 18px;

  h4 {
    margin: 0 0 10px;
    color: var(--el-text-color-primary);
    font-size: 14px;
  }
}

.guide-section--cautions {
  padding: 12px 14px;
  border-radius: 6px;
  background: var(--el-color-warning-light-9);
}

.guide-list {
  margin: 0;
  padding-left: 20px;
  color: var(--el-text-color-regular);

  li {
    margin-bottom: 8px;
    line-height: 1.6;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  li:last-child {
    margin-bottom: 0;
  }
}

.guide-list--ordered {
  padding-left: 24px;
}

.local-package-form {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.form-hint {
  display: block;
  margin-top: 6px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}
</style>
