import { computed, onActivated, onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import { getSudoTemplates, getSudoCommandsByTemplate } from '@/modules/user/api'

// The existing sudo API slices locally. Use its actual total instead of a guessed large size.
async function readAll(fetchPage, isCurrent) {
  let response = await fetchPage({ page: 1, size: 10 })
  if (!isCurrent()) return null
  let body = response?.data
  if (
    !Array.isArray(body?.records) ||
    !Number.isSafeInteger(body.total) ||
    body.total < body.records.length
  ) {
    throw new Error('Invalid sudo records')
  }
  if (body.total > body.records.length) {
    response = await fetchPage({ page: 1, size: body.total })
    if (!isCurrent()) return null
    body = response?.data
  }
  if (!Array.isArray(body?.records) || body.records.length !== body.total) {
    throw new Error('Incomplete sudo records')
  }
  return body.records
}

export function useUserSudoRead({ visible, templateId, context = () => null }) {
  const sudoTemplates = ref([])
  const sudoCommands = ref([])
  const templatesLoading = ref(false)
  const commandsLoading = ref(false)
  const templatesError = ref('')
  const commandsError = ref('')
  const templatesReady = ref(false)
  const loadedTemplate = ref(null)
  const active = ref(true)
  let templateVersion = 0
  let commandVersion = 0
  const selected = () => templateId() !== 'N/A' && !!templateId()
  const available = () => active.value && visible()
  const canSubmitSudo = computed(
    () =>
      !selected() ||
      (available() &&
        templatesReady.value &&
        !templatesLoading.value &&
        !commandsLoading.value &&
        !templatesError.value &&
        !commandsError.value &&
        loadedTemplate.value === templateId() &&
        sudoTemplates.value.some(item => item.id === templateId()))
  )

  async function loadSudoTemplates() {
    if (!available()) return
    const version = ++templateVersion
    const target = context()
    const isCurrent = () => available() && version === templateVersion && target === context()
    templatesReady.value = false
    templatesError.value = ''
    sudoTemplates.value = []
    templatesLoading.value = true
    try {
      const records = await readAll(getSudoTemplates, isCurrent)
      if (!isCurrent() || !records) return
      if (
        records.some(item => item?.id == null || item.id === '' || item.id === 'N/A') ||
        new Set(records.map(item => item.id)).size !== records.length
      )
        throw new Error('Invalid template IDs')
      sudoTemplates.value = records
      templatesReady.value = true
    } catch {
      if (isCurrent()) templatesError.value = 'sudo模板读取失败或不完整，请重试。'
    } finally {
      if (isCurrent()) templatesLoading.value = false
    }
  }

  async function loadSudoCommands() {
    const version = ++commandVersion
    sudoCommands.value = []
    loadedTemplate.value = null
    commandsError.value = ''
    commandsLoading.value = false
    if (!available() || !selected()) return
    const id = templateId()
    const target = context()
    const isCurrent = () =>
      available() && version === commandVersion && id === templateId() && target === context()
    commandsLoading.value = true
    try {
      const records = await readAll(options => getSudoCommandsByTemplate(id, options), isCurrent)
      if (!isCurrent() || !records) return
      if (records.some(item => typeof item?.command !== 'string' || !item.command.trim())) {
        throw new Error('Invalid sudo command')
      }
      sudoCommands.value = records
      loadedTemplate.value = id
    } catch {
      if (isCurrent()) commandsError.value = 'sudo命令读取失败或不完整，请重试后再提交。'
    } finally {
      if (isCurrent()) commandsLoading.value = false
    }
  }

  function clear() {
    templateVersion += 1
    commandVersion += 1
    sudoTemplates.value = []
    sudoCommands.value = []
    templatesReady.value = false
    loadedTemplate.value = null
    templatesError.value = ''
    commandsError.value = ''
    templatesLoading.value = false
    commandsLoading.value = false
  }
  watch(
    [visible, context],
    () => {
      clear()
      if (available()) {
        loadSudoTemplates()
        loadSudoCommands()
      }
    },
    { immediate: true }
  )
  watch(templateId, loadSudoCommands, { flush: 'sync' })
  onDeactivated(() => {
    active.value = false
    clear()
  })
  onActivated(() => {
    if (active.value) return
    active.value = true
    if (visible()) {
      templatesError.value = 'sudo模板读取已中断，请重试。'
      if (selected()) commandsError.value = 'sudo命令读取已中断，请重试。'
    }
  })
  onBeforeUnmount(() => {
    active.value = false
    clear()
  })
  return {
    sudoTemplates,
    sudoCommands,
    templatesLoading,
    commandsLoading,
    templatesError,
    commandsError,
    canSubmitSudo,
    loadSudoTemplates,
    loadSudoCommands,
    clear
  }
}
