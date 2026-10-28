import { describe, expect, it } from 'vitest'
import { getWorkflowFailure, throwIfWorkflowFailed } from '@/utils/workflowResult'

describe('明确作业结果的失败检查', () => {
  it.each([
    [{ status: 'ERROR', error: null }, '操作失败，请重试'],
    [{ status: ' failed ', error: '{"message":"名称重复"}' }, '名称重复'],
    [{ status: 'INTERRUPTED', error: '已中断' }, '已中断'],
    [{ status: 'CANCELLED', error: { message: '已取消' } }, '已取消'],
    [{ status: 'CANCELED', error: null }, '操作失败，请重试'],
    [{ status: 'SUCCESS', error: '脚本失败' }, '脚本失败'],
    [
      { status: 'COMPLETED', detail: { statusCode: 400, contentType: 'application/problem+json' } },
      '操作失败，请重试'
    ]
  ])('原对象、HTTP包装和混合数组均拦截 %j', (failed, expected) => {
    for (const response of [
      failed,
      [failed],
      { status: 200, data: [failed] },
      { data: [{ status: 'SUCCESS' }, failed] }
    ]) {
      expect(() => throwIfWorkflowFailed(response)).toThrow(expected)
    }
  })

  it('保留失败记录供轮询回调使用，JSON原因解析后用于提示', () => {
    const failed = { status: 'ERROR', data: null, error: '{"message":"参数错误"}' }
    expect(getWorkflowFailure({ data: [failed] })).toEqual({ result: failed, message: '参数错误' })
  })

  it.each([
    { status: 204, data: undefined },
    { data: { status: 'RUNNING', runId: 'actual-run' } },
    { data: { status: 'WAITING', runId: 'actual-run' } },
    { data: [{ status: 'COMPLETED', data: { status: 'ERROR', error: '数据行自身状态' } }] },
    { data: { records: [{ status: 'ERROR' }] } },
    { data: { status: 'UNKNOWN' } }
  ])('无明确回执失败时不递归拒绝或改写契约：%j', response => {
    expect(() => throwIfWorkflowFailed(response)).not.toThrow()
  })
})
