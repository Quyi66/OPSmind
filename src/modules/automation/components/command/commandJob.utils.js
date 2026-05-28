import { normalizeAcmDeviceJobHosts } from '@/modules/automation/components/job/schedule/components/acmDeviceSelector.utils'

function normalizeCommandRefs(commands) {
  if (!Array.isArray(commands)) {
    return []
  }

  return commands
    .map(command => {
      if (command == null) {
        return null
      }

      if (typeof command === 'object') {
        const id = command.id || command.commandId || command.value || command.key
        return id ? { id } : null
      }

      return { id: command }
    })
    .filter(Boolean)
}

export function buildCommandJobConfig(commands, hosts, fallbackAssetType = 'linux') {
  return JSON.stringify({
    tasks: [
      {
        commands: normalizeCommandRefs(commands),
        hosts: normalizeAcmDeviceJobHosts(hosts, fallbackAssetType)
      }
    ]
  })
}

export function buildDynamicCommandRunRequest(commands, hosts, fallbackAssetType = 'linux') {
  return {
    type: 'command',
    configJson: buildCommandJobConfig(commands, hosts, fallbackAssetType),
    options: {
      secretParams: [],
      params: {}
    }
  }
}

export function buildSavedCommandJobRunRequest(job, params = {}, secretParams = []) {
  return {
    jobId: job?.id,
    type: job?.type || 'command',
    configJson: job?.configJson || '',
    options: {
      secretParams: Array.isArray(secretParams) ? secretParams : [],
      params: params && typeof params === 'object' ? params : {}
    }
  }
}
