import { BaseProvider } from './base'
import { AI_CONFIG } from '../config'

export class OllamaProvider extends BaseProvider {
  constructor() { super(AI_CONFIG.ollama) }

  get endpoint() { return `${this.config.url}/api/chat` }

  async complete(messages, options = {}) {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:   options.model || this.config.model,
        messages,
        stream:  false,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens   ?? 4096,
        },
        format: options.jsonMode ? 'json' : undefined,
      }),
    })

    if (!res.ok) throw new Error(`Ollama ${res.status}: ${res.statusText}`)
    const data = await res.json()
    return { content: data.message?.content || '' }
  }

  async *stream(messages, options = {}) {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:   options.model || this.config.model,
        messages,
        stream:  true,
        options: { temperature: options.temperature ?? 0.7 },
      }),
    })

    if (!res.ok) throw new Error(`Ollama stream ${res.status}`)

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
        if (!line.trim()) continue
        try {
          const chunk = JSON.parse(line)
          if (chunk.message?.content) yield chunk.message.content
          if (chunk.done) return
        } catch {}
      }
    }
  }
}
