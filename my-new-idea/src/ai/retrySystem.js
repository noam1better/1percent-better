// Retry with exponential backoff + jitter

export async function withRetry(fn, options = {}) {
  const {
    maxAttempts = 3,
    baseDelay   = 1000,
    maxDelay    = 8000,
    onRetry     = null,
    shouldRetry = isRetryableError,
  } = options

  let lastError
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt)
    } catch (err) {
      lastError = err
      if (attempt === maxAttempts || !shouldRetry(err)) throw err
      const delay = Math.min(baseDelay * 2 ** (attempt - 1) + Math.random() * 500, maxDelay)
      onRetry?.({ attempt, delay, error: err })
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw lastError
}

function isRetryableError(err) {
  const msg = err?.message || ''
  // Retry on rate limit, server errors, network failures
  if (msg.includes('429') || msg.includes('rate limit'))  return true
  if (msg.includes('500') || msg.includes('502') || msg.includes('503')) return true
  if (msg.includes('network') || msg.includes('fetch'))  return true
  return false
}

// Wrap a provider.complete() call with retry + timeout
export async function completeWithRetry(provider, messages, options = {}) {
  const { timeout = 30000, ...opts } = options
  return withRetry(
    () => Promise.race([
      provider.complete(messages, opts),
      new Promise((_, rej) => setTimeout(() => rej(new Error('AI timeout')), timeout)),
    ]),
    { maxAttempts: 2, baseDelay: 1500, ...opts.retry }
  )
}
