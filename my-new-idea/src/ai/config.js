export const AI_CONFIG = {
  provider: import.meta.env.VITE_AI_PROVIDER || 'mock',

  openai: {
    apiKey:  import.meta.env.VITE_OPENAI_API_KEY  || '',
    model:   import.meta.env.VITE_OPENAI_MODEL    || 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
  },

  claude: {
    apiKey:   import.meta.env.VITE_ANTHROPIC_API_KEY || '',
    model:    import.meta.env.VITE_CLAUDE_MODEL      || 'claude-3-5-haiku-20241022',
    proxyUrl: import.meta.env.VITE_CLAUDE_PROXY_URL  || '',
  },

  gemini: {
    apiKey:  import.meta.env.VITE_GEMINI_API_KEY || '',
    model:   import.meta.env.VITE_GEMINI_MODEL   || 'gemini-2.0-flash-exp',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  },

  ollama: {
    url:   import.meta.env.VITE_OLLAMA_URL   || 'http://localhost:11434',
    model: import.meta.env.VITE_OLLAMA_MODEL || 'llama3.1:8b',
  },
}

export function isProviderConfigured(provider = AI_CONFIG.provider) {
  switch (provider) {
    case 'openai': return !!AI_CONFIG.openai.apiKey
    case 'claude': return !!(AI_CONFIG.claude.apiKey || AI_CONFIG.claude.proxyUrl)
    case 'gemini': return !!AI_CONFIG.gemini.apiKey
    case 'ollama': return true
    case 'mock':   return true
    default:       return false
  }
}

export function getEffectiveProvider() {
  const p = AI_CONFIG.provider
  return isProviderConfigured(p) ? p : 'mock'
}
