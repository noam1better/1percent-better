/**
 * businessMemory.js
 * Persistent (localStorage) memory for the AI agent.
 * Remembers: business profile, tone, command history, past generations.
 */

const LS_KEY = 'bb_business_memory_v2'
const MAX_HISTORY = 10

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || empty() } catch { return empty() }
}

function empty() {
  return {
    profile: {
      name: '', city: '', phone: '', bizType: '', description: '',
      tone: 'professional', customerType: '',
    },
    tone: 'professional',
    appliedCommands: [],
    generationHistory: [],
    chatHistory: [],
    lastUpdated: null,
  }
}

function save(m) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ ...m, lastUpdated: Date.now() })) } catch {}
}

let _mem = load()

// ── Business profile ──────────────────────────────────────────────
export function setBusinessProfile({ name, city, phone, bizType, description }) {
  _mem.profile = { ..._mem.profile, name, city, phone, bizType, description }
  save(_mem)
}

export function getBusinessProfile() { return _mem.profile }

// ── Tone / preferences ────────────────────────────────────────────
export function setTone(tone) {
  _mem.tone = tone
  _mem.profile.tone = tone
  save(_mem)
}
export function getTone() { return _mem.tone || 'professional' }

// ── Command history ───────────────────────────────────────────────
export function recordCommand(cmd, label) {
  _mem.appliedCommands = [
    { cmd, label, ts: Date.now() },
    ..._mem.appliedCommands,
  ].slice(0, MAX_HISTORY)
  save(_mem)
}

export function getCommandHistory() { return _mem.appliedCommands }

// ── Generation history ────────────────────────────────────────────
export function recordGrowthGeneration(pkg) {
  if (!pkg) return
  _mem.generationHistory = [
    { name: pkg.name, city: pkg.city, bizType: pkg.bizType, ts: Date.now() },
    ..._mem.generationHistory,
  ].slice(0, MAX_HISTORY)
  save(_mem)
}

export function getGenerationHistory() { return _mem.generationHistory }

// ── Chat history ──────────────────────────────────────────────────
export function addAgentMessage(role, content) {
  _mem.chatHistory = [
    ..._mem.chatHistory,
    { role, content, ts: Date.now() },
  ].slice(-40)
  save(_mem)
}

export function getAgentChatContext(n = 8) {
  return _mem.chatHistory.slice(-n).map(m => ({ role: m.role, content: m.content }))
}

export function clearAgentChat() {
  _mem.chatHistory = []
  save(_mem)
}

// ── Full reset ────────────────────────────────────────────────────
export function clearBusinessMemory() {
  _mem = empty()
  save(_mem)
}

export function getMemorySnapshot() { return _mem }
