function readErrorMessage(value) {
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return ''
    try {
      const parsed = JSON.parse(text)
      if (typeof parsed === 'string') return parsed
      const message = readErrorMessage(parsed)
      if (message) return message
    } catch {
      // 作业 error 也可能是普通文本，保留后端原始原因。
    }
    return text
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

// chq5Pe 的业务错误可能包在 HTTP 200 响应中，只在该标签作业的消费者检查。
export function throwIfTagJobFailed(response) {
  const body = typeof response?.status === 'string' ? response : (response?.data ?? response)
  const results = Array.isArray(body) ? body : [body]
  const failure = results.find(result => {
    const status = String(result?.status || '')
      .trim()
      .toUpperCase()
    return (
      ['ERROR', 'FAILED'].includes(status) ||
      Boolean(result?.error) ||
      Number(result?.detail?.statusCode) >= 400
    )
  })

  if (failure) {
    throw new Error(
      readErrorMessage(failure.error) || readErrorMessage(failure) || '标签操作失败，请重试'
    )
  }
}
