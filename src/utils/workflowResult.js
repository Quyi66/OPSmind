// 仅供明确的 workflow 作业回执/执行结果使用，不递归检查普通业务数据。
export function unwrapWorkflowResponse(response) {
  return typeof response?.status === 'string' ? response : (response?.data ?? response)
}

function readErrorMessage(value) {
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return ''
    try {
      const parsed = JSON.parse(text)
      if (typeof parsed === 'string') return parsed
      return readErrorMessage(parsed) || text
    } catch {
      return text
    }
  }
  if (value && typeof value === 'object') {
    return (
      [value.message, value.detail, value.title].find(
        message => typeof message === 'string' && message.trim()
      ) || ''
    )
  }
  return ''
}

export function getWorkflowFailure(response, fallback = '任务执行失败') {
  const body = unwrapWorkflowResponse(response)
  const results = Array.isArray(body) ? body : [body]
  const result = results.find(item => {
    const status = String(item?.status || '')
      .trim()
      .toUpperCase()
    return (
      ['ERROR', 'FAILED', 'INTERRUPTED', 'CANCELLED', 'CANCELED'].includes(status) ||
      Boolean(item?.error) ||
      Number(item?.detail?.statusCode) >= 400
    )
  })
  if (!result) return null
  return {
    result,
    message: readErrorMessage(result.error) || readErrorMessage(result) || fallback
  }
}

// 无明确失败只保持原返回契约；受理/运行回执不在这里冒充最终完成。
export function throwIfWorkflowFailed(response, fallback = '操作失败，请重试') {
  const failure = getWorkflowFailure(response, fallback)
  if (failure) throw new Error(failure.message)
}
