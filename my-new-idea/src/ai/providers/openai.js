import { BaseProvider } from './base'
import { AI_CONFIG } from '../config'

export class OpenAIProvider extends BaseProvider {
  constructor() { super(AI_CONFIG.openai) }

  async complete(messages, options = {}) {
    if (!this.config.apiKey) throw new Error('VITE_OPENAI_API_KEY not set')

    const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:           options.model       || this.config.model,
        messages,
        temperature:     options.temperature ?? 0.7,
        max_tokens:      options.maxTokens   ?? 4096,
        response_format: options.jsonMode ? { type: 'json_object' } : undefined,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`OpenAI ${res.status}: ${err.error?.message || res.statusText}`)
    }

    const data = await res.json()
    return { content: data.choices[0].message.content, usage: data.usage }
  }

  async *stream(messages, options = {}) {
    if (!this.config.apiKey) throw new Error('VITE_OPENAI_API_KEY not set')

    const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:       options.model || this.config.model,
        messages,
        stream:      true,
        temperature: options.temperature ?? 0.7,
        max_tokens:  options.maxTokens   ?? 4096,
      }),
    })

    if (!res.ok) throw new Error(`OpenAI stream ${res.status}`)

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
        const raw = line.slice(6).trim()
        if (raw === '[DONE]') return
        try {
          const delta = JSON.parse(raw).choices?.[0]?.delta?.content
          if (delta) yield delta
        } catch {}
      }
    }
  }
}
