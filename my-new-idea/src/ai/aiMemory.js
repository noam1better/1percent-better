// Session-scoped AI memory: business context, preferences, conversation history

const LS_KEY = 'bb_ai_memory'
const MAX_SESSIONS = 5
const MAX_CHAT_HISTORY = 20

let _memory = loadMemory()

function loadMemory() {
  try {
    return JSON.parse(sessionStorage.getItem(LS_KEY)) || createEmpty()
  } catch {
    return createEmpty()
  }
}

function createEmpty() {
  return {
    sessions:    [],
    preferences: {},
    chatHistory: [],
    currentWebsite: null,
  }
}

function save() {
  try { sessionStorage.setItem(LS_KEY, JSON.stringify(_memory)) } catch {}
}

// Record a completed generation
export function recordGeneration(parsed, website) {
  _memory.sessions = [
    {
      prompt:   parsed.originalPrompt,
      bizType:  parsed.bizType,
      city:     parsed.city,
      palette:  parsed.palette,
      name:     website?.name || parsed.name,
      ts:       Date.now(),
    },
    ..._memory.sessions,
  ].slice(0, MAX_SESSIONS)
  _memory.currentWebsite = website
  save()
}

// Update current website context (call after every edit)
export function setCurrentWebsite(website) {
  _memory.currentWebsite = website
  save()
}

// Record inferred preference
export function recordPreference(key, value) {
  _memory.preferences[key] = value
  save()
}

// Add a chat message to history
export function addChatMessage(role, content) {
  _memory.chatHistory = [
    ..._memory.chatHistory,
    { role, content, ts: Date.now() },
  ].slice(-MAX_CHAT_HISTORY)
  save()
}

// Get recent chat history formatted for LLM (last N turns)
export function getChatContext(n = 6) {
  return _memory.chatHistory.slice(-n).map(m => ({ role: m.role, content: m.content }))
}

export function getMemory()         { return _memory }
export function getCurrentWebsite() { return _memory.currentWebsite }
export function clearMemory()       { _memory = createEmpty(); save() }
