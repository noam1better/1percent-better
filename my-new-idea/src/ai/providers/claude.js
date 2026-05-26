import { BaseProvider } from './base'
import { AI_CONFIG } from '../config'

// Claude requires a server-side proxy due to CORS.
// Deploy api/claude.js (Vercel function) and set VITE_CLAUDE_PROXY_URL.
export class ClaudeProvider extends BaseProvider {
  constructor() { super(AI_CONFIG.claude) }

  get endpoint() {
    if (this.config.proxyUrl) return `${this.config.proxyUrl}/messages`
    return 'https://api.anthropic.com/v1/messages'
  }

  get headers() {
    const h = { 'Content-Type': 'application/json' }
    if (!this.config.proxyUrl && this.config.apiKey) {
      h['x-api-key']         = this.config.apiKey
      h['anthropic-version'] = '2023-06-01'
    }
    return h
  }

  _toAnthropic(messages) {
    const system = messages.find(m => m.role === 'system')?.content || ''
    const msgs   = messages.filter(m => m.role !== 'system')
    return { system, messages: msgs }
  }

  async complete(messages, options = {}) {
    if (!this.config.apiKey && !this.config.proxyUrl)
      throw new Error('VITE_ANTHROPIC_API_KEY or VITE_CLAUDE_PROXY_URL required')

    const { system, messages: msgs } = this._toAnthropic(messages)
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model:       options.model    || this.config.model,
        system,
        messages:    msgs,
        max_tokens:  options.maxTokens   ?? 4096,
        temperature: options.temperature ?? 0.7,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Claude ${res.status}: ${err.error?.message || res.statusText}`)
    }

    const data = await res.json()
    return { content: data.content[0].text, usage: data.usage }
  }

  async *stream(messages, options = {}) {
    if (!this.config.apiKey && !this.config.proxyUrl)
      throw new Error('VITE_ANTHROPIC_API_KEY or VITE_CLAUDE_PROXY_URL required')

    const { system, messages: msgs } = this._toAnthropic(messages)
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model:      options.model || this.config.model,
        system,
        messages:   msgs,
        max_tokens: options.maxTokens ?? 4096,
        stream:     true,
      }),
    })

    if (!res.ok) throw new Error(`Claude stream ${res.status}`)

    const reader  = res.body.getReader()
    const decoder = new TextDecoder()
    let   buf     = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const ev = JSON.parse(line.slice(6))
          if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta')
            yield ev.delta.text
        } catch {}
      }
    }
  }
}
