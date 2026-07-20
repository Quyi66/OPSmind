<template>
  <div v-if="patchOverviewInfo" class="result-section">
    <div class="patch-overview-card">
      <div class="patch-overview-grid" :class="gridClass">
        <!-- 1. 更新补丁 (Patches) -->
        <div v-if="patchOverviewInfo.patches.length" class="overview-subcard">
          <div class="subcard-header">
            <i class="fa fa-lock" />
            <span>更新补丁 ({{ patchOverviewInfo.patches.length }})</span>
          </div>
          <div class="subcard-body">
            <div v-for="patch in patchOverviewInfo.patches" :key="patch" class="patch-item-text font-mono">
              {{ patch }}
            </div>
          </div>
        </div>

        <!-- 2. 更新软件包 (Packages) -->
        <div v-if="patchOverviewInfo.packages.length" class="overview-subcard">
          <div class="subcard-header">
            <i class="fa fa-cube" />
            <span>更新软件包 ({{ patchOverviewInfo.packages.length }})</span>
          </div>
          <div class="subcard-body">
            <div v-for="pkg in patchOverviewInfo.packages" :key="pkg" class="package-item font-mono">
              {{ pkg }}
            </div>
          </div>
        </div>

        <!-- 3. 目标主机 (Target Hosts) -->
        <div v-if="patchOverviewInfo.hosts.length" class="overview-subcard">
          <div class="subcard-header">
            <i class="fa fa-server" />
            <span>目标主机 ({{ patchOverviewInfo.hosts.length }})</span>
          </div>
          <div class="subcard-body">
            <div v-for="host in patchOverviewInfo.hosts" :key="host.name" class="overview-item">
              <span class="host-name">{{ host.name }}</span>
              <el-tag size="small" :type="taskStatusTag(host.status)">
                {{ taskStatusLabel(host.status) }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  ansibleContents: {
    type: Array,
    default: () => []
  }
})

const TASK_STATUS_LABELS = {
  ok: '成功',
  changed: '成功',
  failed: '失败',
  unreachable: '不可达',
  ignored: '忽略',
  skipped: '跳过',
  running: '运行中',
  unknown: '未知'
}

const TASK_STATUS_TAGS = {
  ok: 'success',
  changed: 'success',
  failed: 'danger',
  unreachable: 'danger',
  ignored: 'info',
  skipped: 'info',
  running: 'warning',
  unknown: 'info'
}

const HOST_STATUS_PRIORITY = [
  'unreachable',
  'failed',
  'changed',
  'ok',
  'ignored',
  'skipped',
  'running',
  'unknown'
]

function taskStatusLabel(status) {
  return TASK_STATUS_LABELS[status] || status || TASK_STATUS_LABELS.unknown
}

function taskStatusTag(status) {
  return TASK_STATUS_TAGS[status] || 'info'
}

function detectHostStatus(host) {
  if (!host || typeof host !== 'object') return 'unknown'
  if (host.unreachable) return 'unreachable'
  if (host.failed) return 'failed'
  if (host.changed) return 'changed'
  if (host.ok) return 'ok'
  if (host.ignored) return 'ignored'
  if (host.skipped || host.skipping) return 'skipped'
  return host.running ? 'running' : 'unknown'
}

function parseHostKey(hostKey) {
  if (!hostKey) return { targetHost: '', delegateHost: '' }
  const matches = /([^\s]+)(?:\s*->\s*(.+))?/.exec(hostKey)
  return {
    targetHost: matches?.[1] ?? hostKey,
    delegateHost: matches?.[2] ?? ''
  }
}

function statusPriority(status) {
  const idx = HOST_STATUS_PRIORITY.indexOf(status)
  return idx === -1 ? HOST_STATUS_PRIORITY.length : idx
}

function pickDominantStatus(current, nextStatus) {
  if (!current) return nextStatus || 'unknown'
  if (!nextStatus) return current
  return statusPriority(nextStatus) < statusPriority(current) ? nextStatus : current
}

function extractStringOrArrayItems(val) {
  if (!val) return []
  if (Array.isArray(val)) {
    return val
      .map(v => (typeof v === 'string' ? v.trim() : v?.name || v?.pkg || String(v)))
      .filter(Boolean)
  }
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed
            .map(v => (typeof v === 'string' ? v.trim() : v?.name || v?.pkg || String(v)))
            .filter(Boolean)
        }
      } catch {
        // non-JSON string
      }
    }
    return trimmed
      .split(/[\s,]+/)
      .map(v => v.trim())
      .filter(Boolean)
  }
  return []
}

const PATCH_KEY_NAMES = [
  'patch_ids',
  'patch_id',
  'patchids',
  'patchid',
  'patches',
  'advisories',
  'patch_list',
  'advisory_ids'
]

const PKG_KEY_NAMES = [
  'target_nvr_pkgs',
  'full_pkgs',
  'patch_pkgs',
  'packages',
  'target_pkgs',
  'affected_packages',
  'pkgs',
  'package_list',
  'secops_packages',
  'secops_pkgs'
]

function findAdvisories(obj, found = new Set()) {
  if (!obj) return found
  if (typeof obj === 'string') {
    const regex = /\b(?:KYSA|RHSA|ALSA|RLSA|ELSA|GLSA|USN|DSA|CAN|CVE|KB)[-:]?[A-Za-z0-9_.:-]+\b/gi
    let match
    while ((match = regex.exec(obj)) !== null) {
      found.add(match[0])
    }
  } else if (Array.isArray(obj)) {
    obj.forEach(item => findAdvisories(item, found))
  } else if (typeof obj === 'object') {
    Object.entries(obj).forEach(([key, val]) => {
      const lowerKey = key.toLowerCase()
      if (PATCH_KEY_NAMES.includes(lowerKey)) {
        extractStringOrArrayItems(val).forEach(item => found.add(item))
      } else {
        findAdvisories(val, found)
      }
    })
  }
  return found
}

function collectPackages(obj, pkgsSet = new Set()) {
  if (!obj) return pkgsSet
  if (typeof obj === 'object' && obj !== null) {
    Object.entries(obj).forEach(([key, val]) => {
      const lowerKey = key.toLowerCase()
      if (PKG_KEY_NAMES.includes(lowerKey)) {
        extractStringOrArrayItems(val).forEach(item => pkgsSet.add(item))
      }
    })
  }
  return pkgsSet
}

function parsePkgs(raw) {
  return extractStringOrArrayItems(raw)
}

const patchOverviewInfo = computed(() => {
  if (!props.ansibleContents || !props.ansibleContents.length) return null

  const hostsMap = new Map()
  let targetNvrPkgsRaw = null
  let fullPkgsRaw = null
  const advisoriesSet = new Set()
  const pkgsSet = new Set()

  props.ansibleContents.forEach(content => {
    findAdvisories(content, advisoriesSet)
    collectPackages(content, pkgsSet)
    collectPackages(content?.extra_vars, pkgsSet)
    collectPackages(content?.vars, pkgsSet)

    const plays = Array.isArray(content?.plays) ? content.plays : []
    plays.forEach(play => {
      collectPackages(play?.vars, pkgsSet)
      collectPackages(play?.extra_vars, pkgsSet)

      const tasks = Array.isArray(play?.tasks) ? play.tasks : []
      tasks.forEach(task => {
        collectPackages(task?.vars, pkgsSet)
        collectPackages(task?.args, pkgsSet)

        const hosts = Array.isArray(task?.hosts) ? task.hosts : []
        hosts.forEach(host => {
          collectPackages(host, pkgsSet)
          collectPackages(host?.ansible_facts, pkgsSet)
          collectPackages(host?.invocation?.module_args, pkgsSet)

          const hostKey = host?.hostKey ?? host?.host ?? host?.name
          if (hostKey) {
            const parsed = parseHostKey(hostKey)
            const name = parsed.targetHost || hostKey
            const status = detectHostStatus(host)
            if (!hostsMap.has(name)) {
              hostsMap.set(name, { name, status })
            } else {
              const entry = hostsMap.get(name)
              entry.status = pickDominantStatus(entry.status, status)
            }
          }

          const targetNvr = host?.ansible_facts?.target_nvr_pkgs ?? host?.target_nvr_pkgs
          if (targetNvr) {
            targetNvrPkgsRaw = targetNvr
          }

          const fullPkgs = host?.ansible_facts?.full_pkgs ?? host?.full_pkgs
          if (fullPkgs) {
            fullPkgsRaw = fullPkgs
          }
        })
      })
    })
  })

  const hosts = Array.from(hostsMap.values())
  const fallbackPkgs = targetNvrPkgsRaw ? parsePkgs(targetNvrPkgsRaw) : parsePkgs(fullPkgsRaw)
  fallbackPkgs.forEach(p => pkgsSet.add(p))

  const packages = Array.from(pkgsSet).sort()
  const patches = Array.from(advisoriesSet).sort()

  if (hosts.length === 0 && packages.length === 0 && patches.length === 0) return null

  return {
    hosts,
    packages,
    patches
  }
})

const gridClass = computed(() => {
  let count = 0
  if (patchOverviewInfo.value?.hosts?.length) count++
  if (patchOverviewInfo.value?.patches?.length) count++
  if (patchOverviewInfo.value?.packages?.length) count++
  return `cols-${count}`
})
</script>

<style scoped>
.result-section {
  margin-top: 0 !important;
}

.section-header {
  font-weight: 600;
  margin-bottom: 12px;
}

.patch-overview-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 16px;
  background: var(--el-bg-color);
}

.patch-overview-grid {
  display: grid;
  gap: 16px;
}

.patch-overview-grid.cols-3 {
  grid-template-columns: repeat(3, 1fr);
}

.patch-overview-grid.cols-2 {
  grid-template-columns: repeat(2, 1fr);
}

.patch-overview-grid.cols-1 {
  grid-template-columns: 1fr;
}

.overview-subcard {
  border: 1px solid var(--el-border-color-extra-light);
  border-radius: 6px;
  overflow: hidden;
}

.overview-subcard .subcard-header {
  background: var(--el-fill-color-light);
  padding: 8px 12px;
  font-weight: 600;
  font-size: 13px;
  color: var(--el-text-color-primary);
  border-bottom: 1px solid var(--el-border-color-extra-light);
  display: flex;
  align-items: center;
  gap: 8px;
}

.overview-subcard .subcard-body {
  padding: 10px 12px;
  background: var(--el-bg-color);
  font-size: 13px;
  max-height: 240px;
  overflow-y: auto;
}

.overview-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px dashed var(--el-border-color-extra-light);
}

.overview-item:last-child {
  border-bottom: none;
}

.overview-item .host-name {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.patch-item-text,
.package-item {
  padding: 4px 0;
  color: var(--el-text-color-regular);
  word-break: break-all;
}

.patch-item-text.font-mono,
.package-item.font-mono {
  font-family: Consolas, 'SFMono-Regular', Menlo, Monaco, monospace;
  font-size: 12px;
}

.no-data {
  color: var(--el-text-color-placeholder);
}
</style>
