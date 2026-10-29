import { computed, onScopeDispose, ref, toValue, watch } from 'vue'
import {
  formatAgentCapabilitySummary,
  getAgentCapabilityIssues,
  resolveAgentCapabilityHosts
} from '../utils/agentCapability'

// 选择器只提供资产 ID 时补全 Agent 信息；切换选择、关闭窗口后丢弃旧查询。
export function useAgentCapabilitySelection(hosts, capability, enabled = true) {
  const resolvedHosts = ref([])
  const checking = ref(false)
  let version = 0
  const issues = computed(() => getAgentCapabilityIssues(resolvedHosts.value, toValue(capability)))
  const summary = computed(() => formatAgentCapabilitySummary(resolvedHosts.value, issues.value))

  async function refresh() {
    const request = ++version
    const snapshot = toValue(hosts) || []
    resolvedHosts.value = snapshot
    if (!toValue(enabled) || !snapshot.length) {
      checking.value = false
      return null
    }
    checking.value = true
    const result = await resolveAgentCapabilityHosts(snapshot)
    if (request !== version || !toValue(enabled)) return null
    resolvedHosts.value = result
    checking.value = false
    return result
  }

  watch([() => toValue(hosts), () => toValue(enabled)], refresh, {
    deep: true,
    immediate: true,
    flush: 'sync'
  })
  onScopeDispose(() => version++)
  return { resolvedHosts, checking, issues, summary, refresh }
}
