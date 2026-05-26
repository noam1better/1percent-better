/**
 * generateWebsite.js — AI generation orchestrator
 *
 * Provider is selected by VITE_AI_PROVIDER env var:
 *   mock   — deterministic template engine (default, always works)
 *   openai — GPT-4o/GPT-4o-mini via OpenAI API
 *   claude — Claude via server-side proxy (VITE_CLAUDE_PROXY_URL)
 *   gemini — Gemini 2.0 Flash via Google AI API
 *   ollama — Local Ollama models (llama3, deepseek, qwen, etc.)
 *
 * To activate a real provider:
 *   1. Set VITE_AI_PROVIDER=openai (or claude/gemini/ollama) in .env
 *   2. Set the corresponding API key (see .env.example)
 *   3. Redeploy / restart dev server
 */

import { parsePrompt }                          from './promptParser'
import { mockGenerateWebsite, GENERATION_STEPS } from './mockGenerator'
import { getProvider, isMockMode }              from './providers/index'
import { WEBSITE_SYSTEM_PROMPT }                from './prompts/system'
import { buildEnrichedUserPrompt }              from './prompts/memory'
import { recoverWebsiteJSON }                   from './jsonRecovery'
import { runAIGeneration }                      from './streamingGenerator'
import { completeWithRetry }                    from './retrySystem'
import { recordGeneration, getMemory }          from './aiMemory'

export { GENERATION_STEPS }

/**
 * generateWebsiteFromPrompt(prompt, onStep) → WebsiteSchema
 */
export async function generateWebsiteFromPrompt(prompt, onStep = () => {}) {
  if (!prompt?.trim()) throw new Error('פרומפט ריק')

  const parsed = parsePrompt(prompt)

  if (isMockMode()) {
    const website = await mockGenerateWebsite(parsed, onStep)
    recordGeneration(parsed, website)
    return website
  }

  // Real AI provider path
  const provider = getProvider()
  const memory   = getMemory()
  const userMsg  = buildEnrichedUserPrompt(prompt, parsed, memory)

  try {
    const messages = [
      { role: 'system', content: WEBSITE_SYSTEM_PROMPT },
      { role: 'user',   content: userMsg },
    ]

    let rawJson = ''
    try {
      rawJson = await runAIGeneration(provider, messages, { maxTokens: 4096 }, onStep, null)
    } catch (streamErr) {
      // Stream failed — try non-stream fallback
      console.warn('[generateWebsite] Stream failed, trying complete():', streamErr.message)
      onStep({ key: 'retry', label: '🔄 מנסה שוב...', index: 1, total: 5 })
      const { content } = await completeWithRetry(provider, messages, {
        jsonMode:  true,
        maxTokens: 4096,
        timeout:   45000,
      })
      rawJson = content
      onStep({ key: 'done', label: '🚀 האתר מוכן!', index: 4, total: 5, done: true })
    }

    const website = recoverWebsiteJSON(rawJson, parsed)
    if (!website) {
      console.warn('[generateWebsite] JSON recovery failed, falling back to mock')
      return await mockGenerateWebsite(parsed, onStep)
    }

    recordGeneration(parsed, website)
    return website

  } catch (err) {
    console.error('[generateWebsite] AI provider error:', err.message)
    // Graceful fallback to mock so user always gets a website
    return await mockGenerateWebsite(parsed, onStep)
  }
}

export function isAiMockMode() { return isMockMode() }

// Re-export the system prompt for display/debug purposes
export { WEBSITE_SYSTEM_PROMPT }
