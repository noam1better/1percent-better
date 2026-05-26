import { BaseProvider } from './base'
import { AI_CONFIG } from '../config'

export class GeminiProvider extends BaseProvider {
  constructor() { super(AI_CONFIG.gemini) }

  get endpoint() {
    return `${this.config.baseUrl}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`
  }

  _toGemini(messages) {
    const sysMsg = messages.find(m => m.role === 'system')
    const systemInstruction = sysMsg ? { parts: [{ text: sysMsg.content }] } : undefined
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
    return { systemInstruction, contents }
  }

  async complete(messages, options = {}) {
    if (!this.config.apiKey) throw new Error('VITE_GEMINI_API_KEY not set')

    const { systemInstruction, contents } = this._toGemini(messages)
    const body = {
      contents,
      generationConfig: {
        temperature:      options.temperature ?? 0.7,
        maxOutputTokens:  options.maxTokens   ?? 4096,
        responseMimeType: options.jsonMode ? 'application/json' : 'text/plain',
      },
    }
    if (systemInstruction) body.systemInstruction = systemInstruction

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Gemini ${res.status}: ${JSON.stringify(err.error || err)}`)
    }

    const data = await res.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return { content, usage: data.usageMetadata }
  }
}
