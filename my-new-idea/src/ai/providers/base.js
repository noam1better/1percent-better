export class BaseProvider {
  constructor(config = {}) {
    this.config = config
  }

  // Returns { content: string, usage?: object }
  async complete(messages, options = {}) {
    throw new Error(`${this.constructor.name}: complete() not implemented`)
  }

  // Async generator yielding string chunks
  async *stream(messages, options = {}) {
    const { content } = await this.complete(messages, options)
    yield content
  }

  buildMessages(systemPrompt, userPrompt, history = []) {
    return [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user',   content: userPrompt   },
    ]
  }
}
