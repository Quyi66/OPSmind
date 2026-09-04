import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { patchInstallApi } from '../../../api'
import { usePatchTaskTargetSelection } from './usePatchTaskTargetSelection'

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    warning: vi.fn()
  }
}))

vi.mock('../../../api', () => ({
  patchInstallApi: {
    getAffectedPackages: vi.fn()
  }
}))

function createDeferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, reject, resolve }
}

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

function mountTargetSelection() {
  let targetSelection
  const wrapper = mount(
    defineComponent({
      setup() {
        targetSelection = usePatchTaskTargetSelection({
          props: {
            patchesToInstall: [{ patch_id: 'patch-1' }],
            packageCandidates: []
          },
          hasFixedHosts: ref(false),
          resolvedFixedHosts: ref([]),
          isRollbackTask: ref(false),
          isPackageTask: ref(false),
          isVulnerabilityTask: ref(false)
        })

        return () => null
      }
    })
  )

  return { targetSelection, wrapper }
}

describe('usePatchTaskTargetSelection', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('retries the current selection when an A to B to A request supersedes the original request', async () => {
    vi.useFakeTimers()
    const requests = []
    patchInstallApi.getAffectedPackages.mockImplementation(params => {
      const deferred = createDeferred()
      requests.push({ deferred, params })
      return deferred.promise
    })

    const hostA = { hostId: 'host-a' }
    const hostB = { hostId: 'host-b' }
    const { targetSelection, wrapper } = mountTargetSelection()

    targetSelection.affectedHosts.value = [hostA, hostB]
    targetSelection.selectedHosts.value = [hostA]
    const syncPromise = targetSelection.syncAffectedPackagesForHosts([hostA])
    expect(requests[0].params.host_ids).toEqual(['host-a'])

    targetSelection.handleHostTableSelect([hostB])
    await vi.advanceTimersByTimeAsync(350)
    expect(requests[1].params.host_ids).toEqual(['host-b'])

    targetSelection.handleHostTableSelect([hostA])
    requests[0].deferred.resolve({ data: [] })
    await flushPromises()

    expect(requests[2].params.host_ids).toEqual(['host-a'])
    requests[2].deferred.resolve({ data: [] })
    await expect(syncPromise).resolves.toBe(true)

    requests[1].deferred.resolve({ data: [] })
    await flushPromises()
    wrapper.unmount()
  })

  it('does not notify when a failed request belongs to a selection that has changed', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const requests = []
    patchInstallApi.getAffectedPackages.mockImplementation(params => {
      const deferred = createDeferred()
      requests.push({ deferred, params })
      return deferred.promise
    })

    const hostA = { hostId: 'host-a' }
    const hostB = { hostId: 'host-b' }
    const { targetSelection, wrapper } = mountTargetSelection()

    targetSelection.affectedHosts.value = [hostA, hostB]
    targetSelection.handleHostTableSelect([hostA])
    await vi.advanceTimersByTimeAsync(350)
    const syncPromise = targetSelection.syncAffectedPackagesForHosts([hostA])
    expect(patchInstallApi.getAffectedPackages).toHaveBeenCalledTimes(1)

    targetSelection.handleHostTableSelect([hostB])
    requests[0].deferred.reject(new Error('request A failed'))
    await flushPromises()

    expect(requests[1].params.host_ids).toEqual(['host-b'])
    requests[1].deferred.resolve({ data: [] })
    await expect(syncPromise).resolves.toBe(true)
    expect(ElMessage.error).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('notifies only once when the sync reuses a failing refresh request', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const request = createDeferred()
    patchInstallApi.getAffectedPackages.mockReturnValue(request.promise)

    const hostA = { hostId: 'host-a' }
    const { targetSelection, wrapper } = mountTargetSelection()

    targetSelection.affectedHosts.value = [hostA]
    targetSelection.handleHostTableSelect([hostA])
    await vi.advanceTimersByTimeAsync(350)
    const syncPromise = targetSelection.syncAffectedPackagesForHosts([hostA])
    expect(patchInstallApi.getAffectedPackages).toHaveBeenCalledTimes(1)

    request.reject(new Error('request A failed'))
    await expect(syncPromise).resolves.toBe(false)
    expect(ElMessage.error).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })
})
