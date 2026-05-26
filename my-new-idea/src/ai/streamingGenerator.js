// Streaming generation orchestrator for real AI providers

import { GENERATION_STEPS } from './mockGenerator'

const REAL_STEPS = [
  { key: 'connect',  label: '🔌 מתחבר ל-AI...',              ms: 400  },
  { key: 'parse',    label: '🔍 AI מנתח את הפרומפט...',      ms: 0    },
  { key: 'generate', label: '✍️ מייצר תוכן האתר...',          ms: 0    },
  { key: 'seo',      label: '🔍 מגמר SEO...',                 ms: 0    },
  { key: 'done',     label: '🚀 האתר מוכן!',                  ms: 0    },
]

export { GENERATION_STEPS }

// Run real AI generation with step callbacks and optional streaming
export async function runAIGeneration(provider, messages, options, onStep, onChunk) {
  const isStream = typeof provider.stream === 'function' && options.stream !== false

  // Step 0: connect
  onStep({ ...REAL_STEPS[0], index: 0, total: REAL_STEPS.length })
  await delay(REAL_STEPS[0].ms || 400)

  // Step 1: parsing / thinking
  onStep({ ...REAL_STEPS[1], index: 1, total: REAL_STEPS.length })

  let fullContent = ''

  if (isStream) {
    // Step 2: start streaming
    onStep({ ...REAL_STEPS[2], index: 2, total: REAL_STEPS.length })
    for await (const chunk of provider.stream(messages, { ...options, jsonMode: true })) {
      fullContent += chunk
      onChunk?.(fullContent)
    }
  } else {
    const { content } = await provider.complete(messages, { ...options, jsonMode: true })
    fullContent = content
    onStep({ ...REAL_STEPS[2], index: 2, total: REAL_STEPS.length })
  }

  onStep({ ...REAL_STEPS[3], index: 3, total: REAL_STEPS.length })
  await delay(200)

  onStep({ ...REAL_STEPS[4], index: 4, total: REAL_STEPS.length, done: true })

  return fullContent
}

function delay(ms) {
  return new Promise(r => setTimeout(r, Math.max(ms, 0)))
}
