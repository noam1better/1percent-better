import { getEffectiveProvider } from '../config'
import { MockProvider   } from './mock'
import { OpenAIProvider } from './openai'
import { ClaudeProvider } from './claude'
import { GeminiProvider } from './gemini'
import { OllamaProvider } from './ollama'

export { MockProvider, OpenAIProvider, ClaudeProvider, GeminiProvider, OllamaProvider }

const FACTORIES = {
  mock:   () => new MockProvider(),
  openai: () => new OpenAIProvider(),
  claude: () => new ClaudeProvider(),
  gemini: () => new GeminiProvider(),
  ollama: () => new OllamaProvider(),
}

let _cache = null

export function getProvider(name) {
  const key = name || getEffectiveProvider()
  if (_cache?.key === key) return _cache.instance
  const factory = FACTORIES[key] || FACTORIES.mock
  const instance = factory()
  _cache = { key, instance }
  return instance
}

export function isMockMode() {
  return getEffectiveProvider() === 'mock'
}

export function getProviderName() {
  return getEffectiveProvider()
}
