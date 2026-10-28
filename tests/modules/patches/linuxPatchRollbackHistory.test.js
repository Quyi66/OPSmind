import { describe, expect, it } from 'vitest'
import {
  flattenRollbackSourceRecords,
  getRollbackRecordIds,
  mergeRollbackHistoryRecords
} from '@/modules/patches/utils/rollbackHistory'

function createRecord(overrides = {}) {
  return {
    id: 'history-1',
    hosts: '192.168.1.220',
    hosts_id: 'host-1',
    update_time: '2026-08-11T09:52:46.000+08:00',
    update_pkgs: JSON.stringify([
      {
        name: 'kernel',
        old_pkg: 'kernel-1',
        new_pkg: 'kernel-2'
      }
    ]),
    update_id: 'CVE-2026-46209',
    patch_id: 'RHSA-2026:34911',
    ...overrides
  }
}

describe('mergeRollbackHistoryRecords', () => {
  it('merges records with the same patch and update time before pagination', () => {
    const records = [
      createRecord(),
      createRecord({ id: 'history-2', update_id: 'CVE-2026-45998' }),
      createRecord({
        id: 'history-3',
        hosts: '192.168.1.221',
        update_id: 'CVE-2026-46316',
        update_pkgs: JSON.stringify([
          {
            name: 'kernel-core',
            old_pkg: 'kernel-core-1',
            new_pkg: 'kernel-core-2'
          }
        ])
      })
    ]

    const result = mergeRollbackHistoryRecords(records)

    expect(result).toHaveLength(1)
    expect(result[0].hosts).toBe('192.168.1.220, 192.168.1.221')
    expect(result[0].update_id).toBe('CVE-2026-46209, CVE-2026-45998, CVE-2026-46316')
    expect(JSON.parse(result[0].update_pkgs)).toHaveLength(2)
    expect(getRollbackRecordIds(result)).toEqual(['history-1', 'history-2', 'history-3'])
    expect(flattenRollbackSourceRecords(result)).toEqual(records)
  })

  it('does not merge the same patch from different update times', () => {
    const records = [
      createRecord(),
      createRecord({ id: 'history-2', update_time: '2026-08-12T09:52:46.000+08:00' })
    ]

    expect(mergeRollbackHistoryRecords(records)).toHaveLength(2)
  })

  it('keeps records without a complete grouping key independent', () => {
    const records = [
      createRecord({ id: 'history-1', update_time: '' }),
      createRecord({ id: 'history-2', update_time: '' }),
      createRecord({ id: 'history-3', patch_id: '' }),
      createRecord({ id: 'history-4', patch_id: '' })
    ]

    expect(mergeRollbackHistoryRecords(records)).toHaveLength(4)
  })
})
